from copy import deepcopy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SERVER = ROOT / 'ops/production/server'
sys.path.insert(0, str(SERVER))


class SnapshotTests(unittest.TestCase):
    def test_snapshot_reader_and_strict_contract(self):
        self.assertTrue((SERVER / 'cms_content_snapshot.py').exists(), 'snapshot reader missing')
        from cms_content_snapshot import read_content_snapshot, validate_snapshot, probe_source
        from release_actions import CommandResult
        from release_contract import ReleaseError
        value = dict(schemaVersion='d16-cms-content-snapshot-v1', siteScope='tio2-my',
                     publishedRecords=2, contentSha256='a' * 64)
        class Runner:
            def run(self, arguments):
                self.arguments = arguments
                return CommandResult(0, json.dumps(value))
        runner = Runner()
        self.assertEqual(read_content_snapshot(runner, 'b' * 64), value)
        self.assertEqual(runner.arguments[:5], ('/usr/bin/docker', 'exec', 'b' * 64, 'php', '-r'))
        self.assertEqual(runner.arguments[5], probe_source())
        self.assertFalse(probe_source().startswith('<?php'))
        for patch in ({'publishedRecords': True}, {'publishedRecords': 0}, {'siteScope': 'tio2-a'},
                      {'contentSha256': 'oops'}, {'extra': 1}, {'schemaVersion': 'old'}):
            with self.subTest(patch=patch), self.assertRaises(ReleaseError):
                validate_snapshot(value | patch)
        with self.assertRaises(ReleaseError):
            read_content_snapshot(runner, 'wordpress-wordpress-1')
        class BadRunner:
            def run(self, arguments):
                return CommandResult(0, json.dumps(value)[:-1] + ',"publishedRecords":3}')
        with self.assertRaises(ReleaseError):
            read_content_snapshot(BadRunner(), 'b' * 64)

    def run_php(self, fixture):
        self.assertTrue((SERVER / 'cms_content_snapshot.php').exists(), 'PHP snapshot missing')
        # Stub only wpdb I/O; execute the unmodified PHP production probe.
        stub = '''<?php
        define('ARRAY_A', 'ARRAY_A');
        class FixtureDB {
          public $posts='wp_posts', $postmeta='wp_postmeta', $terms='wp_terms';
          public $term_taxonomy='wp_term_taxonomy', $term_relationships='wp_term_relationships';
          public $last_error='';
          function prepare($sql,...$args){return str_replace('%s', "'".$args[0]."'", $sql);}
          function query($sql){
            $f=json_decode(file_get_contents('/fixture/data.json'),true);
            if(!empty($f['transaction_error']) && $sql !== 'ROLLBACK') return false;
            if(!in_array($sql,['SET TRANSACTION ISOLATION LEVEL REPEATABLE READ',
              'START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY','ROLLBACK'])) throw new Exception('write');
            return 0;
          }
          function get_results($sql,$format){
            if(!str_starts_with($sql,'SELECT ') || !str_contains($sql,"'tio2-my'") ||
               !str_contains($sql,"p.post_status='publish'") || !str_contains($sql,"st.taxonomy='site_scope'")) throw new Exception('unscoped');
            $f=json_decode(file_get_contents('/fixture/data.json'),true);
            if(!empty($f['error'])) {$this->last_error='db failed';return null;}
            $key=str_contains($sql,'pm.meta_key')?'meta':(str_contains($sql,'AS taxonomy')?'terms':'posts');
            return $f[$key];
          }
        }
        $wpdb=new FixtureDB();
        '''
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / 'wp-load.php').write_text(stub, encoding='utf-8')
            (folder / 'data.json').write_text(json.dumps(fixture), encoding='utf-8')
            result = subprocess.run(['docker', 'run', '--rm', '--network', 'none',
                                     '-v', f'{folder}:/fixture:ro',
                                     '-v', f'{folder / "wp-load.php"}:/var/www/html/wp-load.php:ro',
                                     '-v', f'{SERVER / "cms_content_snapshot.php"}:/probe.php:ro',
                                     'php:8.3-cli', 'php', '/probe.php'],
                                    capture_output=True, text=True, timeout=30)
        return result

    def test_php_hash_covers_content_and_ignores_database_ids_and_order(self):
        if not shutil.which('docker'):
            self.skipTest('local PHP fixture requires Docker and existing php:8.3-cli image')
        available = subprocess.run(['docker', 'image', 'inspect', 'php:8.3-cli'], capture_output=True, timeout=15)
        if available.returncode:
            self.skipTest('local PHP fixture requires existing php:8.3-cli image; never pull automatically')
        fixture = {
            'posts': [dict(ID='4', post_type='page', post_name='home', post_title='Hello',
                           post_content='Body', post_excerpt='Summary', post_status='publish',
                           menu_order='0', post_password='', post_parent='0', parent_type=None, parent_slug=None),
                      dict(ID='9', post_type='page', post_name='child', post_title='Child',
                           post_content='Text', post_excerpt='', post_status='publish',
                           menu_order='2', post_password='', post_parent='4', parent_type='page', parent_slug='home')],
            'meta': [dict(post_id='4', meta_key='acf_value', meta_value='Approved'),
                     dict(post_id='4', meta_key='_edit_lock', meta_value='123')],
            'terms': [dict(object_id='4', taxonomy='site_scope', slug='tio2-my', name='Malaysia',
                           description='Region', parent_slug=None, term_order='0')],
        }
        result = self.run_php(fixture)
        self.assertEqual(result.returncode, 0, result.stderr)
        baseline = json.loads(result.stdout)
        self.assertEqual(baseline['publishedRecords'], 2)
        self.assertEqual(set(baseline), {'schemaVersion', 'siteScope', 'publishedRecords', 'contentSha256'})
        changed = deepcopy(fixture)
        changed['posts'][0]['ID'] = '40'
        changed['posts'][1]['ID'] = '90'
        changed['posts'][1]['post_parent'] = '40'
        changed['posts'].reverse()
        for row in changed['meta']: row['post_id'] = '40'
        changed['meta'][1]['meta_value'] = '999'
        changed['meta'].reverse()
        changed['terms'][0]['object_id'] = '40'
        self.assertEqual(json.loads(self.run_php(changed).stdout), baseline)
        for group, index, field in [('posts', 0, 'post_content'), ('posts', 0, 'post_excerpt'),
                                     ('posts', 0, 'post_title'), ('posts', 0, 'post_name'),
                                     ('posts', 0, 'post_type'), ('posts', 0, 'post_status'),
                                     ('posts', 0, 'post_password'), ('posts', 0, 'menu_order'),
                                     ('posts', 1, 'parent_slug'), ('meta', 0, 'meta_value'),
                                     ('meta', 0, 'meta_key'), ('terms', 0, 'slug'),
                                     ('terms', 0, 'taxonomy'), ('terms', 0, 'term_order'),
                                     ('terms', 0, 'description'), ('terms', 0, 'name')]:
            changed = deepcopy(fixture)
            changed[group][index][field] += 'changed'
            with self.subTest(field=field):
                self.assertNotEqual(json.loads(self.run_php(changed).stdout)['contentSha256'], baseline['contentSha256'])
        for bad in ({'posts': [], 'meta': [], 'terms': []}, fixture | {'error': True},
                    fixture | {'transaction_error': True}):
            result = self.run_php(bad)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, '')


if __name__ == '__main__':
    unittest.main()
