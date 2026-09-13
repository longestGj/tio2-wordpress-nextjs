"""Fixed administrator entry for the independently approved MY route repair.

Run only from a hash-checked root-owned bundle at /root/d16-route-repair.
Does not install sudo access or alter the existing release state/receipts.
"""
from contextlib import ExitStack
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

from content_install import Installation
from release_baseline import protected_path, validate_baseline
from release_contract import ReleaseError
from release_state import ReleaseLock, atomic_write_json
from route_repair import RouteRepairBackend, require, sha

ROOT=Path('/root/d16-route-repair')
STATE=Path('/opt/tio2-production/state/state.json')


def run(*args,data=None):
    value=subprocess.run(args,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=180)
    if value.returncode:raise ReleaseError('route repair host operation failed')
    return value.stdout


def inspect(name):return json.loads(run('/usr/bin/docker','inspect',name))[0]


FRONTEND_PROBE=r'''
const fs=require('node:fs'),crypto=require('node:crypto');
let stage='config';
(async()=>{
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 if(process.env.SITE_ID!=='tio2-my')throw Error('config');
 if(input.refresh){
  // docker exec receives container configuration, not the entrypoint shell's exports.
  const secret=process.env.NEXTJS_REVALIDATION_SECRET_TIO2_MY||process.env.REVALIDATION_SECRET;
  if(!secret)throw Error('config');
  stage='signed-refresh';
  const event={eventId:crypto.randomUUID(),siteIds:['tio2-my'],contentId:1,
   paths:[],entityIds:[],modified:new Date().toISOString()};
  const raw=JSON.stringify(event);
  const response=await fetch('http://127.0.0.1:3000/api/revalidate',{method:'POST',
   headers:{'Content-Type':'application/json','x-tio2-signature':crypto.createHmac('sha256',secret).update(raw).digest('hex')},
   body:raw,signal:AbortSignal.timeout(20000)});
  const value=await response.json();
  if(!response.ok||value.ok!==true||value.eventId!==event.eventId||
    !value.revalidatedTags.includes('site:tio2-my')||value.revalidatedPaths.length!==0)throw Error('refresh');
 }
 for(const path of input.paths){
  stage='page:'+path;
  const response=await fetch('http://127.0.0.1:3000'+path,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  // Next may canonicalize the registered slash form within this exact container.
  let actual=response;
  if([307,308].includes(response.status)){
   const location=response.headers.get('location');
   if(location!==path+'/'&&location!==path.replace(/\/$/,''))throw Error('redirect');
   actual=await fetch('http://127.0.0.1:3000'+location,{redirect:'manual',signal:AbortSignal.timeout(20000)});
  }
  const body=await actual.text();
  if(actual.status!==200||!body.toLowerCase().includes('<html'))throw Error('page');
 }
 console.log(JSON.stringify({ok:true,checked:input.paths.length,invalidationAcknowledged:input.refresh}));
})().catch(()=>{console.error('bound frontend check failed at '+stage);process.exit(1)});
'''


def provision_runtime():
    """Create a private client file inside DB; never print or package its secret."""
    baseline=validate_baseline()
    roles={r['role']:r for r in baseline['runtime']['containers']}
    db=inspect('wordpress-db-1');wp=inspect('wordpress-wordpress-1')
    require(db['Id']==roles['db']['id'] and wp['Id']==roles['wordpress']['id'],'legacy database identities')
    env=dict(item.split('=',1) for item in db['Config']['Env'] if '=' in item)
    password=env.get('MARIADB_ROOT_PASSWORD',env.get('MYSQL_ROOT_PASSWORD'))
    require(isinstance(password,str) and password and '\x00' not in password,'database credential unavailable')
    password=password.replace('\\','\\\\').replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
    defaults=('[client]\nuser=root\npassword="'+password+'"\n').encode()
    path='/run/d16-route-repair.cnf'
    existing=run('/usr/bin/docker','exec',db['Id'],'sh','-c',
        'test ! -L '+path+'; if test -e '+path+'; then test -f '+path+' && cat '+path+'; fi')
    if existing:require(existing==defaults,'existing credential differs')
    else:run('/usr/bin/docker','exec','-i',db['Id'],'sh','-c','umask 077; set -C; cat > '+path,data=defaults)
    require(run('/usr/bin/docker','exec',db['Id'],'stat','-c','%u:%a',path).strip()==b'0:600','credential ownership')
    wp_env=dict(item.split('=',1) for item in wp['Config']['Env'] if '=' in item)
    runtime={'schemaVersion':'d16-content-runtime-v1','siteId':'tio2-my','database':wp_env['WORDPRESS_DB_NAME'],
        'dbContainer':'wordpress-db-1','wordpressContainer':'wordpress-wordpress-1','importerContainer':'unused',
        'dbDefaultsFile':path,'hooks':{k:['/usr/local/libexec/d16-unused',k] for k in ('identity','enter','assert','leave','refresh','verify')}}
    return {'runtime':runtime,'prefix':wp_env.get('WORDPRESS_TABLE_PREFIX','wp_'),
            'frontend':roles['web']}


def main(argv=None):
    args=sys.argv[1:] if argv is None else argv
    require(len(args) in (1,2) and args[0] in {'plan','apply','status','rollback','finish-opening'},'action')
    action=args[0]
    require(len(args)==(1 if action in {'plan','status'} else 2),'action arguments')
    require(os.name=='posix' and os.geteuid()==0,'administrator required')
    protected_path(ROOT,directory=True)
    require(Path(__file__).resolve().parent==ROOT/'admin','fixed program location')
    manifest=json.loads(protected_path(ROOT/'bundle-files.json').read_bytes())
    for relative,expected in manifest.items():
        require(not relative.startswith('/') and '..' not in Path(relative).parts,'bundle path')
        require(hashlib.sha256(protected_path(ROOT/relative).read_bytes()).hexdigest()==expected,'bundle bytes')
    payload=json.loads(protected_path(ROOT/'payload.json').read_bytes())
    routes=json.loads(protected_path(ROOT/'routes.json').read_bytes())
    work=ROOT/'state';work.mkdir(mode=0o700,exist_ok=True);protected_path(work,directory=True)
    with ExitStack() as stack:
        for path in ('/opt/tio2-production/state/release.lock','/opt/d16-release/state/release.lock'):
            stack.enter_context(ReleaseLock(Path(path)))
        config_path=work/'runtime.json'
        if not config_path.exists():
            require(action=='plan','plan required before other actions')
            atomic_write_json(config_path,provision_runtime());os.chmod(config_path,0o600)
        config=json.loads(protected_path(config_path,private=True).read_bytes())
        web=config['frontend']
        def bound_web():
            actual=inspect(web['id'])
            require(actual['Id']==web['id'] and actual['Image']==web['imageId'],'frontend changed')
            return actual
        def frontend_check(refreshing=False):
            require(bound_web()['State']['Running'],'frontend stopped')
            paths=sorted({r['path'].rstrip('/') or '/' for r in routes['routes'] if r['pageId']!='CONV-THANK'})
            result=json.loads(run('/usr/bin/docker','exec','-i',web['id'],'node','-e',FRONTEND_PROBE,
                data=json.dumps({'refresh':refreshing,'paths':paths}).encode()))
            require(result=={'ok':True,'checked':41,'invalidationAcknowledged':refreshing},'bound frontend response')
            return True
        def refresh():
            return frontend_check(True)
        class BoundBackend(RouteRepairBackend):
            def observe(self):
                value=super().observe();value['legacyStateSha256']=hashlib.sha256(protected_path(STATE).read_bytes()).hexdigest()
                value['frontend']=web;return value
            def assert_bound(self,baseline):
                bound_web()
                require(hashlib.sha256(protected_path(STATE).read_bytes()).hexdigest()==baseline['legacyStateSha256'],'legacy transaction changed')
            def enter(self,owner,baseline):self.assert_bound(baseline);super().enter(owner,baseline)
            def restore(self,owner,baseline,backup):self.assert_bound(baseline);super().restore(owner,baseline,backup)
            def leave(self,owner,baseline):self.assert_bound(baseline);super().leave(owner,baseline)
        backend=BoundBackend(config['runtime'],work,payload,routes,config['prefix'],frontend_check,refresh)
        engine=Installation(work/'state.json',backend,sha({'bundle':manifest,'runtime':config}))
        if action=='status':value=engine.status()
        elif action=='plan':
            value=engine.plan();path=work/'plan.json'
            if path.exists():require(json.loads(protected_path(path).read_bytes())==value,'saved plan differs')
            else:atomic_write_json(path,value)
        else:
            require(len(args)==2,'approved plan hash required')
            if action=='apply':
                plan=json.loads(protected_path(work/'plan.json').read_bytes())
                require(plan['planSha256']==args[1],'approved plan hash');value=engine.apply(plan)
            elif action=='rollback':value=engine.rollback(args[1])
            else:value=engine.finish_opening(args[1])
        output={'operation':'tio2-my-route-repair','phase':value.get('phase','planned'),
                'planSha256':value.get('planSha256',value.get('plan',{}).get('planSha256')),
                'changedMeta':95,'databaseWritesPerformed':action=='apply' and value.get('phase')=='completed'}
        atomic_write_json(work/'last-result.json',output)
        print(json.dumps(output))
    return 0


if __name__=='__main__':
    try:sys.exit(main())
    except (OSError,ValueError,KeyError,TypeError,ReleaseError):
        print(json.dumps({'ok':False,'error':'route repair stopped; inspect status before retrying'}));sys.exit(1)
