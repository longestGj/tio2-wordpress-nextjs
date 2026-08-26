import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const updaterScript = fileURLToPath(
  new URL('../../../scripts/apply-local-site-a-editorial-fixture.ps1', import.meta.url),
)
const runLiveWordPress = process.env.WORDPRESS_EDITORIAL_FIXTURE_RUNTIME === '1'

function execute(command: string, arguments_: string[], timeout = 240_000) {
  return spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout,
  })
}

function powershell(arguments_: string[]) {
  return execute('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    updaterScript,
    ...arguments_,
  ])
}

function wp(arguments_: string[]) {
  return execute('docker', [
    'compose',
    '--env-file',
    'wordpress/.env',
    '-f',
    'wordpress/docker-compose.yml',
    'run',
    '--rm',
    '--no-TTY',
    '--user',
    '33:33',
    'wpcli',
    'wp',
    ...arguments_,
  ])
}

function wpWithEnvironment(environment: string, arguments_: string[]) {
  return execute('docker', [
    'compose',
    '--env-file',
    'wordpress/.env',
    '-f',
    'wordpress/docker-compose.yml',
    'run',
    '--rm',
    '--no-TTY',
    '--user',
    '33:33',
    '-e',
    environment,
    'wpcli',
    'wp',
    ...arguments_,
  ])
}

interface EditorialSnapshot {
  siteAIdentity: {
    id: number
    type: string
    status: string
    slug: string
    title: string
    path: '/'
    scopes: string[]
    marker: string
  }
  siteAContentHash: string
  siteARecordHash: string
  siteBHash: string
  rootIdentityHash: string
  schemaVersion: string
  counts: Record<string, number>
}

function snapshot(): EditorialSnapshot {
  const php = String.raw`
global $wpdb;
$homepage_ids=array_map('intval',$wpdb->get_col("SELECT ID FROM {$wpdb->posts} WHERE post_type='tio2_homepage' AND post_name='tio2-a--homepage' ORDER BY ID ASC"));
if(count($homepage_ids)!==1){WP_CLI::error('Expected one Site A homepage snapshot target.');}
$site_a_id=$homepage_ids[0];
$site_a_scopes=wp_get_object_terms($site_a_id,'site_scope',['fields'=>'slugs']);
if(is_wp_error($site_a_scopes)){WP_CLI::error($site_a_scopes->get_error_message());}
$identity=['id'=>$site_a_id,'type'=>(string)get_post_type($site_a_id),'status'=>(string)get_post_status($site_a_id),'slug'=>(string)get_post_field('post_name',$site_a_id),'title'=>(string)get_post_field('post_title',$site_a_id),'path'=>'/','scopes'=>array_values($site_a_scopes),'marker'=>(string)get_post_meta($site_a_id,'_tio2_seed_homepage_site_id',true)];
$field_names=['homepage_schema_version','hero_eyebrow','hero_heading','hero_summary','closing_heading','closing_body','closing_label','seo_title','seo_description','primary_topic','secondary_topics','header_rfq_label','direct_answer_question','direct_answer_lead','direct_answer_body','decision_questions','application_briefs','supply_routes','evidence_items','evaluation_steps','geo_faqs','glossary_items','editorial_reviewed_at','editorial_reviewed_by','editorial_review_scope'];
$site_a_content=[];
foreach($field_names as $field_name){$site_a_content[$field_name]=get_field($field_name,$site_a_id,false);}
$site_a_meta=get_post_meta($site_a_id);
ksort($site_a_meta,SORT_STRING);
$site_a_record=['identity'=>$identity,'content'=>(string)get_post_field('post_content',$site_a_id),'meta'=>$site_a_meta];
$site_b_ids=tio2_find_homepage_ids('tio2-b');
if(count($site_b_ids)!==1){WP_CLI::error('Expected one Site B homepage snapshot target.');}
$site_b_id=(int)$site_b_ids[0];
$site_b_meta=get_post_meta($site_b_id);
ksort($site_b_meta,SORT_STRING);
$site_b_scopes=wp_get_object_terms($site_b_id,'site_scope',['fields'=>'slugs']);
if(is_wp_error($site_b_scopes)){WP_CLI::error($site_b_scopes->get_error_message());}
$site_b=['id'=>$site_b_id,'type'=>(string)get_post_type($site_b_id),'status'=>(string)get_post_status($site_b_id),'slug'=>(string)get_post_field('post_name',$site_b_id),'title'=>(string)get_post_field('post_title',$site_b_id),'content'=>(string)get_post_field('post_content',$site_b_id),'scopes'=>array_values($site_b_scopes),'meta'=>$site_b_meta];
$root_ids=array_map('intval',$wpdb->get_col("SELECT DISTINCT p.ID FROM {$wpdb->posts} p LEFT JOIN {$wpdb->postmeta} pm ON pm.post_id=p.ID AND pm.meta_key='public_path' WHERE p.post_type='tio2_homepage' OR (p.post_type IN ('page','post') AND pm.meta_value='/') ORDER BY p.ID ASC"));
$roots=[];
foreach($root_ids as $root_id){$scopes=wp_get_object_terms($root_id,'site_scope',['fields'=>'slugs']);if(is_wp_error($scopes)){WP_CLI::error($scopes->get_error_message());}$roots[]=['id'=>$root_id,'type'=>(string)get_post_type($root_id),'status'=>(string)get_post_status($root_id),'slug'=>(string)get_post_field('post_name',$root_id),'path'=>'tio2_homepage'===get_post_type($root_id)?'/':(string)get_post_meta($root_id,'public_path',true),'scopes'=>array_values($scopes),'marker'=>(string)get_post_meta($root_id,'_tio2_seed_homepage_site_id',true)];}
$counts=[];
foreach(['decision_questions','application_briefs','supply_routes','evidence_items','evaluation_steps','geo_faqs','glossary_items'] as $field_name){$value=get_field($field_name,$site_a_id,false);$counts[$field_name]=is_array($value)?count($value):0;}
echo 'TIO2_EDITORIAL_TEST_SNAPSHOT '.wp_json_encode(['siteAIdentity'=>$identity,'siteAContentHash'=>'sha256:'.hash('sha256',(string)wp_json_encode($site_a_content)),'siteARecordHash'=>'sha256:'.hash('sha256',(string)wp_json_encode($site_a_record)),'siteBHash'=>'sha256:'.hash('sha256',(string)wp_json_encode($site_b)),'rootIdentityHash'=>'sha256:'.hash('sha256',(string)wp_json_encode($roots)),'schemaVersion'=>(string)get_field('homepage_schema_version',$site_a_id,false),'counts'=>$counts]);
`
  const result = wp(['eval', php])
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  const match = result.stdout.match(/TIO2_EDITORIAL_TEST_SNAPSHOT (\{.*\})/)
  expect(match, result.stdout).not.toBeNull()
  return JSON.parse(match![1]) as EditorialSnapshot
}

describe.runIf(runLiveWordPress)('Site A local editorial fixture updater', () => {
  it('rejects the current ineligible state without writes', () => {
    const before = snapshot()
    expect(before.siteAIdentity).toMatchObject({
      id: 4333,
      status: 'draft',
      slug: 'tio2-a--homepage',
      path: '/',
      scopes: ['tio2-a'],
    })
    expect(before.schemaVersion).toBe('homepage-v0.1')

    const plan = powershell(['-PlanOnly'])
    expect(plan.status).not.toBe(0)
    expect(`${plan.stdout}\n${plan.stderr}`).toContain(
      'Preflight rejected the Site A Homepage identity, status, scope, or root path',
    )
    expect(snapshot()).toEqual(before)
  }, 300_000)

  it('rejects a forged environment marker and arbitrary manifest arguments', () => {
    const before = snapshot()
    const direct = wpWithEnvironment('TIO2_LOCAL_EDITORIAL_FIXTURE=1', [
      'eval-file',
      '/workspace/wordpress/seed/apply-site-a-editorial-fixture.php',
      '/workspace/wordpress/seed/representative-content.json',
      'plan',
    ])

    expect(direct.status).not.toBe(0)
    expect(`${direct.stdout}\n${direct.stderr}`).toContain(
      'capability',
    )
    expect(snapshot()).toEqual(before)
  }, 300_000)
})
