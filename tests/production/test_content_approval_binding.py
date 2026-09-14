"""SYNTHETIC approval only. Actual release.php and disposable WordPress/MariaDB."""
import copy
import hashlib
import json
from pathlib import Path
import secrets
import subprocess
import sys
import time

import pytest

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ops/production/server'))
import content_release
from scripts.production.build_tio2_my_ga4_legal_package import build_package


def sha(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def candidate_with_test_receipt():
    value=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json').read_text(encoding='utf-8'))
    value['company']['summaries'].append({'title':'Synthetic approved addition','description':'Synthetic test only.'})
    value['packageId']='SYNTHETIC-TEST-PASS-NOT-APPROVAL'
    return value


def docker(*args,data=None,check=True):
    result=subprocess.run(['docker',*args],input=data,capture_output=True,timeout=120)
    if check: assert result.returncode==0,result.stderr.decode()
    return result


class IsolatedImporter:
    def sql(self,query):
        return docker('exec',self.db,'mariadb','-uroot','-psynthetic','--batch','--raw','--skip-column-names','wordpress','-e',query).stdout.decode().strip()

    def snapshot(self):
        return self.sql("SELECT p.ID,p.post_status,p.post_name,p.post_modified,m.meta_key,HEX(m.meta_value) FROM wp_posts p JOIN wp_postmeta m ON p.ID=m.post_id ORDER BY p.ID,m.meta_id")

    def package(self,content=None,records=None):
        records=records or [{'pageId':'HOME-001','content':content or candidate_with_test_receipt()}]
        return dict(schemaVersion='d16-content-package-v1',siteId='tio2-my',records=records,files=[],contentSha256=sha(records))

    def proof(self,package,**changes):
        records=[]
        for record in package['records']:
            if record['pageId'] not in ('HOME-001','APP-000'): continue
            before=json.loads(self.sql("SELECT meta_value FROM wp_postmeta JOIN wp_posts ON ID=post_id WHERE post_title='"+record['pageId']+"' AND meta_key LIKE '%contract_json'"))
            records.append(dict(pageId=record['pageId'],locale='en',beforeSha256=sha(before),afterSha256=sha(record['content'])))
        return dict(schemaVersion='d16-content-approval-v1',approvalId='synthetic',sourceRef='SYNTHETIC-TEST-ONLY',sourceSha256=sha('synthetic'),
                    siteId='tio2-my',environmentId='isolated-content-import',validFrom=int(time.time())-60,validUntil=int(time.time())+600,
                    operation='update-published',records=records,**changes)

    def register(self,proof):
        # Protected Linux volume, only root registration helper can write; importer mounts read-only.
        docker('run','--rm','-i','--network','none','-v',self.approvals+':/approvals','--entrypoint','php','wordpress:php8.3-apache','-r',
               "file_put_contents('/approvals/synthetic.json',stream_get_contents(STDIN));chmod('/approvals/synthetic.json',0644);",data=json.dumps(proof).encode())

    def run_isolated_import(self,package,approval_id=None,action='import',extra_env=(),raw=None):
        before=self.snapshot()
        env=['-e','D16_CONTENT_ACTION='+action,'-e','D16_CONTENT_DB=wordpress','-e','D16_CONTENT_DB_HOSTNAME='+self.sql('SELECT @@hostname')]
        if approval_id is not None: env+=['-e','D16_CONTENT_APPROVAL_ID='+approval_id]
        for value in extra_env: env+=['-e',value]
        result=docker('exec','-i',*env,self.wp,'php','/opt/d16-content/release.php',data=raw or json.dumps(package).encode(),check=False)
        return result,before,self.snapshot()

    def race(self,package,mutation,stage='before'):
        holder=subprocess.Popen(['docker','exec',self.db,'mariadb','-uroot','-psynthetic','-e',"SELECT GET_LOCK('synthetic-gate',0); SELECT SLEEP(40)"],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        proc=None
        try:
            for _ in range(50):
                owner=self.sql("SELECT IS_USED_LOCK('synthetic-gate')")
                if owner!='NULL': break
                time.sleep(.05)
            assert owner!='NULL'
            args=['docker','exec','-i','-e','D16_CONTENT_ACTION=import','-e','D16_CONTENT_DB=wordpress','-e','D16_CONTENT_DB_HOSTNAME='+self.sql('SELECT @@hostname'),
                  '-e','D16_CONTENT_APPROVAL_ID=synthetic','-e','SYNTHETIC_IMPORT_BARRIER='+stage,self.wp,'php','/opt/d16-content/release.php']
            proc=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            proc.stdin.write(json.dumps(package).encode()); proc.stdin.close(); proc.stdin=None
            for _ in range(100):
                if self.sql("SELECT IS_USED_LOCK('synthetic-ready')")!='NULL': break
                assert proc.poll() is None,proc.stderr.read().decode()
                time.sleep(.05)
            else: raise AssertionError('importer never reached actual transaction barrier')
            mutation()
            after_mutation=self.snapshot()
            self.sql('KILL '+owner)
            stdout,stderr=proc.communicate(timeout=40)
            return proc.returncode,stdout,stderr,after_mutation,self.snapshot()
        finally:
            if holder.poll() is None:
                current=self.sql("SELECT IS_USED_LOCK('synthetic-gate')")
                if current!='NULL': self.sql('KILL '+current)
            holder.communicate(timeout=10)
            if proc and proc.poll() is None:
                proc.kill(); proc.communicate()


@pytest.fixture(scope='module')
def runtime():
    r=IsolatedImporter(); token='d16-test-approved-import-'+secrets.token_hex(5)
    r.db=token+'-db'; r.wp=token+'-wp'; r.approvals=token+'-approvals'; network=token+'-network'; created=[]
    plugin=str(ROOT/'wordpress/plugins/tio2-site-model'); fixture=str(ROOT/'tests/infrastructure/php/content-approved-import.php')
    try:
        docker('network','create',network); created.append(('network',network))
        docker('volume','create',r.approvals); created.append(('volume',r.approvals))
        docker('run','-d','--name',r.db,'--network',network,'-e','MARIADB_DATABASE=wordpress','-e','MARIADB_USER=wp','-e','MARIADB_PASSWORD=synthetic-app','-e','MARIADB_ROOT_PASSWORD=synthetic','mariadb:11.4'); created.append(('container',r.db))
        for _ in range(60):
            if docker('exec',r.db,'mariadb','-uroot','-psynthetic','-e','SELECT 1',check=False).returncode==0: break
            time.sleep(.5)
        docker('run','-d','--name',r.wp,'--network',network,'-e','WORDPRESS_DB_HOST='+r.db,'-e','WORDPRESS_DB_NAME=wordpress','-e','WORDPRESS_DB_USER=root','-e','WORDPRESS_DB_PASSWORD=synthetic',
               '-v',plugin+':/opt/d16-plugin:ro','-v',plugin+':/var/www/html/wp-content/plugins/tio2-site-model:ro','-v',str(ROOT/'wordpress/release')+':/opt/d16-content:ro','-v',fixture+':/var/www/html/wp-content/mu-plugins/synthetic.php:ro',
               '-v',fixture+':/opt/fixture.php:ro','-v',r.approvals+':/approvals:ro','wordpress:php8.3-apache'); created.append(('container',r.wp))
        for _ in range(60):
            if docker('exec',r.wp,'test','-f','/var/www/html/wp-config.php',check=False).returncode==0: break
            time.sleep(.5)
        docker('exec',r.wp,'php','/opt/fixture.php')
        # Match real seed enrollment: WordPress sanitizes a newly inserted slug,
        # so the production seed establishes its canonical fixed identity afterward.
        r.sql("UPDATE wp_posts SET post_name='tio2-my--homepage' WHERE post_title='HOME-001'")
        r.sql('SET GLOBAL event_scheduler=OFF; SET GLOBAL read_only=ON')
        yield r
    finally:
        for kind,name in reversed(created):
            assert name.startswith(token+'-')
            docker(*(['rm','-f','-v',name] if kind=='container' else [kind,'rm',name]))


def test_real_canonical_seed_identity_exports_without_approval(runtime):
    assert runtime.sql("SELECT post_name FROM wp_posts WHERE post_title='HOME-001'")=='tio2-my--homepage'
    assert runtime.sql("SELECT post_name FROM wp_posts WHERE post_title='APP-000'")=='tio2-my-applications'
    result,before,after=runtime.run_isolated_import(runtime.package(),action='export')
    assert result.returncode==0,result.stderr.decode()
    assert before==after
    assert json.loads(result.stdout)['package']['records'][0]['pageId']=='HOME-001'


def test_test_receipt_is_not_content_approval(runtime):
    result,before,after=runtime.run_isolated_import(runtime.package(candidate_with_test_receipt()))
    assert result.returncode!=0
    assert before==after


def test_approved_addition_imports_full_content_and_can_be_exported_again(runtime):
    package=runtime.package(); runtime.register(runtime.proof(package))
    result,_,after=runtime.run_isolated_import(package,'synthetic')
    assert result.returncode==0,result.stderr.decode()
    assert json.loads(result.stdout)['contentSha256']==package['contentSha256']
    result,_,_=runtime.run_isolated_import(package,action='export')
    assert result.returncode==0,result.stderr.decode()
    assert json.loads(result.stdout)['package']['records']==package['records']


def test_ga4_legal_package_replaces_stale_cms_copy_and_exports_exact_content(runtime):
    source=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json').read_text(encoding='utf-8'))
    package=build_package(source)
    result,before,after=runtime.run_isolated_import(package)
    assert result.returncode==0,result.stderr.decode()
    assert before!=after
    assert json.loads(result.stdout)['contentSha256']==package['contentSha256']
    exported,_,_=runtime.run_isolated_import(package,action='export')
    assert exported.returncode==0,exported.stderr.decode()
    assert json.loads(exported.stdout)['package']['records']==package['records']


def test_php_python_shared_digest_vectors():
    from content_release import approval_digest
    vectors=json.loads((ROOT/'tests/fixtures/content-write-approval-cases.json').read_text(encoding='utf-8'))['digestCases']
    php=docker('run','--rm','--network','none','-v',str(ROOT)+':/workspace:ro','-v',str(ROOT/'wordpress/plugins/tio2-site-model')+':/opt/d16-plugin:ro',
               '--entrypoint','php','wordpress:php8.3-apache','/workspace/tests/infrastructure/php/content-approved-import.php','digests')
    expected=[]
    for case in vectors:
        if case.get('reject'):
            with pytest.raises(Exception): approval_digest(case['json'])
            expected.append('reject')
        else:
            digest=hashlib.sha256(case['canonical'].encode()).hexdigest()
            assert approval_digest(case['json'])==digest
            expected.append(digest)
    assert json.loads(php.stdout)==expected


@pytest.mark.parametrize('case',['expired','environment','after','before','wrong-page','unsafe','missing','receipt','database','fence','unprivileged','duplicate'])
def test_rejections_preserve_actual_database(runtime,case):
    candidate=candidate_with_test_receipt(); candidate['hero']['heading']='Synthetic next candidate'
    package=runtime.package(candidate); proof=runtime.proof(package); env=[]; selected='synthetic'; raw=None
    if case=='expired': proof['validUntil']=int(time.time())-1
    if case=='environment': proof['environmentId']='wrong-environment'
    if case=='after': proof['records'][0]['afterSha256']='0'*64
    if case=='before': proof['records'][0]['beforeSha256']='0'*64
    if case=='wrong-page': proof['records'][0]['pageId']='APP-000'
    if case=='unsafe':
        candidate['hero']['heading']='<script>unsafe</script>'; package=runtime.package(candidate); proof=runtime.proof(package)
    if case=='missing': selected='not-registered'
    if case=='receipt': package['approved']=True
    if case=='database': env=['D16_CONTENT_DB_HOSTNAME=foreign']
    if case=='fence': runtime.sql('SET GLOBAL read_only=OFF')
    if case=='unprivileged': env=['WORDPRESS_DB_USER=wp','WORDPRESS_DB_PASSWORD=synthetic-app']
    if case=='duplicate': raw=json.dumps(package).replace('"packageId":','"packageId":"duplicate","packageId":',1).encode()
    runtime.register(proof)
    try:
        result,before,after=runtime.run_isolated_import(package,selected,extra_env=env,raw=raw)
        assert result.returncode!=0,(case,result.stdout.decode())
        assert before==after
    finally: runtime.sql('SET GLOBAL read_only=ON')


def test_validate_requires_approval_export_does_not(runtime):
    package=runtime.package(); runtime.register(runtime.proof(package))
    assert runtime.run_isolated_import(package,action='validate')[0].returncode!=0
    assert runtime.run_isolated_import(package,'synthetic',action='validate')[0].returncode==0
    assert runtime.run_isolated_import(package,action='export')[0].returncode==0


def test_application_shrink_and_legacy_mixed_batch(runtime):
    app=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json').read_text(encoding='utf-8'))
    app['evaluation']['items'].pop()
    market=json.loads((ROOT/'wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json').read_text(encoding='utf-8'))
    market['hero']['h1']='Synthetic legacy text update'
    package=runtime.package(records=[{'pageId':'APP-000','content':app},{'pageId':'MARKET-000','content':market}]); runtime.register(runtime.proof(package))
    result,_,_=runtime.run_isolated_import(package,'synthetic')
    assert result.returncode==0,result.stderr.decode()
    # A second technically valid migrated edit cannot loosen another family's frozen shape.
    app['evaluation']['items'].pop(); market['extra']='not allowed'
    package=runtime.package(records=[{'pageId':'APP-000','content':app},{'pageId':'MARKET-000','content':market}]); runtime.register(runtime.proof(package))
    result,before,after=runtime.run_isolated_import(package,'synthetic')
    assert result.returncode!=0
    assert before==after
    del market['extra']; market['hero']['h1']='Synthetic legacy without approval'
    result,_,_=runtime.run_isolated_import(runtime.package(records=[{'pageId':'MARKET-000','content':market}]))
    assert result.returncode==0,result.stderr.decode()


@pytest.mark.parametrize('case',['before','scope','route','revoke','fence'])
def test_final_locked_identity_and_approval_are_fresh(runtime,case):
    candidate=candidate_with_test_receipt(); candidate['hero']['heading']='Synthetic concurrent candidate'
    package=runtime.package(candidate); runtime.register(runtime.proof(package))
    id=runtime.sql("SELECT ID FROM wp_posts WHERE post_title='HOME-001'")
    original=runtime.sql("SELECT HEX(meta_value) FROM wp_postmeta WHERE post_id="+id+" AND meta_key='_tio2_my_homepage_contract_json'")
    def mutate():
        if case=='before':
            changed=json.loads(bytes.fromhex(original)); changed['hero']['heading']='Synthetic concurrent baseline'
            runtime.sql("UPDATE wp_postmeta SET meta_value=UNHEX('"+json.dumps(changed).encode().hex()+"') WHERE post_id="+id+" AND meta_key='_tio2_my_homepage_contract_json'")
        if case=='scope': runtime.sql("INSERT INTO wp_term_relationships(object_id,term_taxonomy_id) SELECT "+id+",tt.term_taxonomy_id FROM wp_term_taxonomy tt JOIN wp_terms t ON t.term_id=tt.term_id WHERE t.slug='tio2-b'")
        if case=='route': runtime.sql("UPDATE wp_posts SET post_name='foreign-home' WHERE ID="+id)
        if case=='revoke': runtime.register({})
        if case=='fence': runtime.sql('SET GLOBAL read_only=OFF')
    try:
        code,_,error,concurrent,after=runtime.race(package,mutate)
        assert code!=0,error.decode()
        assert after==concurrent
    finally:
        runtime.sql("UPDATE wp_postmeta SET meta_value=UNHEX('"+original+"') WHERE post_id="+id+" AND meta_key='_tio2_my_homepage_contract_json'; UPDATE wp_posts SET post_name='tio2-my--homepage' WHERE ID="+id)
        runtime.sql("DELETE tr FROM wp_term_relationships tr JOIN wp_term_taxonomy tt ON tr.term_taxonomy_id=tt.term_taxonomy_id JOIN wp_terms t ON t.term_id=tt.term_id WHERE tr.object_id="+id+" AND t.slug='tio2-b'; SET GLOBAL read_only=ON")


def test_actual_fence_and_full_relationship_range_lock(runtime):
    candidate=candidate_with_test_receipt(); candidate['hero']['heading']='Synthetic locked candidate'
    package=runtime.package(candidate); runtime.register(runtime.proof(package))
    id=runtime.sql("SELECT ID FROM wp_posts WHERE post_title='HOME-001'")
    def attempt():
        normal=docker('exec',runtime.db,'mariadb','-uwp','-psynthetic-app','wordpress','-e',"UPDATE wp_posts SET post_title='bad' WHERE ID="+id,check=False)
        assert normal.returncode!=0 and b'read-only' in normal.stderr.lower()
        competing=docker('exec',runtime.db,'mariadb','-uroot','-psynthetic','wordpress','-e',"SET innodb_lock_wait_timeout=1; INSERT INTO wp_term_relationships(object_id,term_taxonomy_id) SELECT "+id+",tt.term_taxonomy_id FROM wp_term_taxonomy tt JOIN wp_terms t ON t.term_id=tt.term_id WHERE t.slug='tio2-b'",check=False)
        assert competing.returncode!=0 and b'Lock wait timeout' in competing.stderr
    code,_,error,_,_=runtime.race(package,attempt,'locked')
    assert code==0,error.decode()


def test_readback_corruption_rolls_back(runtime):
    candidate=candidate_with_test_receipt(); candidate['hero']['heading']='Synthetic readback candidate'
    package=runtime.package(candidate); runtime.register(runtime.proof(package))
    result,before,after=runtime.run_isolated_import(package,'synthetic',extra_env=['SYNTHETIC_CORRUPT_READBACK=1'])
    assert result.returncode!=0
    assert before==after
