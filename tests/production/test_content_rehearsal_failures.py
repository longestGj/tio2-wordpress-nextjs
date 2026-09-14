"""Host failure lifecycle tests; Docker is the external fault-injection boundary."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

import pytest

SCRIPT=Path(__file__).resolve().parents[1]/'production-runtime/content_approval_rehearsal.py'


@pytest.fixture
def rehearsal():
    spec=importlib.util.spec_from_file_location('rehearsal_failure_test',SCRIPT)
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    return module


def harness(tmp_path,monkeypatch,module,foreign=False,error_kind='timeout'):
    run='home-application-11111111-1111-4111-8111-111111111111'
    project='d16-test-home-application-11111111-test'; prefix=project+'-bulk-1'
    directory=tmp_path/run; directory.mkdir(); (directory/'owner').write_text(run)
    evidence=tmp_path/'evidence'; evidence.mkdir()
    bridge={'runId':run,'project':project,'network':project+'_default','evidence':str(evidence),
        'rootPassword':'synthetic-db-password','secret':'synthetic-signature-secret'}
    module.write(directory/'bulk-bridge.json',bridge)
    resources={}; removed=[]
    def resource(name,kind):
        labels={'d16.test.run':'foreign-run' if foreign and name.endswith('-sealed') else run}
        return {'Name':name,'Id':'id-'+name,'Config':{'Labels':labels},'Labels':labels,'State':{'Running':True},'Mounts':[]}
    def docker(*args,**kwargs):
        output=b''; code=0
        if args[0]=='create':
            name=args[args.index('--name')+1]; resources[name]=resource(name,'container'); output=resources[name]['Id'].encode()
        elif args[0]=='start':
            if error_kind=='success':
                resources[prefix+'-controller']['State']['Running']=False
                return subprocess.CompletedProcess(args,0,b'',b'')
            for suffix in ('sealed','code','importer'): resources[prefix+'-'+suffix]=resource(prefix+'-'+suffix,'volume' if suffix!='importer' else 'container')
            leaked='synthetic-db-password synthetic-signature-secret'
            if error_kind=='timeout': raise subprocess.TimeoutExpired(['docker','run','-e','WORDPRESS_DB_PASSWORD='+leaked],1,output=leaked.encode(),stderr=leaked.encode())
            raise RuntimeError(leaked)
        elif args[0]=='inspect' or args[:2]==('volume','inspect'):
            item=resources.get(args[-1]); output=json.dumps([item] if item else []).encode(); code=0 if item else 1
            if not item: return subprocess.CompletedProcess(args,1,b'',b'Error: No such object')
        elif args[0] in ('kill','stop'):
            resources[args[-1]]['State']['Running']=False
        elif args[0]=='cp':
            if error_kind=='capture-failure': return subprocess.CompletedProcess(args,1,b'',b'capture unavailable')
            destination=Path(args[-1]); destination.mkdir(parents=True,exist_ok=True)
            (destination/'failure.json').write_text(json.dumps({'message':'synthetic-db-password synthetic-signature-secret'}))
            (destination/'content-window.json').write_text(json.dumps({'phase':'fenced','owner':'bulk-1'}))
            (destination/'result.json').write_text(json.dumps({'passed':True}))
        elif args[0]=='rm' or args[:2]==('volume','rm'):
            name=args[-1]; assert name in resources; removed.append(name); del resources[name]
        else: raise AssertionError('Unexpected Docker operation '+str(args))
        return subprocess.CompletedProcess(args,code,output,b'')
    monkeypatch.setattr(module,'docker',docker)
    monkeypatch.setattr(module,'owner',lambda value: {})
    return directory/'bulk-bridge.json',evidence/'bulk-1',resources,removed,prefix


def test_timeout_cleans_each_owned_resource_after_stopping_controller(rehearsal,tmp_path,monkeypatch):
    path,evidence,resources,removed,prefix=harness(tmp_path,monkeypatch,rehearsal)
    with pytest.raises(Exception): rehearsal.bridge_run(path,1)
    assert not resources, 'Host left importer or sealed/code volumes behind after client timeout'
    assert set(removed)=={prefix+'-'+suffix for suffix in ('controller','importer','sealed','code')}
    assert (evidence/'host-cleanup.json').exists()
    assert json.loads((evidence/'content-window.json').read_text())['phase']=='fenced'


def test_cleanup_refuses_foreign_volume_and_retains_recovery_controller(rehearsal,tmp_path,monkeypatch):
    path,evidence,resources,removed,prefix=harness(tmp_path,monkeypatch,rehearsal,foreign=True)
    with pytest.raises(Exception): rehearsal.bridge_run(path,1)
    assert prefix+'-sealed' in resources and prefix+'-sealed' not in removed
    assert prefix+'-controller' in resources, 'Failed cleanup must retain stopped controller recovery data'
    assert resources[prefix+'-controller']['State']['Running'] is False
    assert prefix+'-importer' not in resources and prefix+'-code' not in resources
    receipt=json.loads((evidence/'host-cleanup.json').read_text())
    assert receipt['recoveryRequired'] is True


@pytest.mark.parametrize('error_kind',['timeout','ordinary'])
def test_persisted_errors_and_copied_evidence_never_include_credentials(rehearsal,tmp_path,monkeypatch,error_kind):
    path,evidence,resources,removed,prefix=harness(tmp_path,monkeypatch,rehearsal,error_kind=error_kind)
    with pytest.raises(Exception): rehearsal.bridge_run(path,1)
    assert (evidence/'failure.json').exists(), 'Failure evidence must survive interrupted controller'
    combined='\n'.join(item.read_text() for item in evidence.rglob('*') if item.is_file())
    assert 'synthetic-db-password' not in combined
    assert 'synthetic-signature-secret' not in combined
    assert 'TimeoutExpired' in combined if error_kind=='timeout' else 'RuntimeError' in combined


def test_success_with_controller_already_cleaned_resources_keeps_result(rehearsal,tmp_path,monkeypatch):
    path,evidence,resources,removed,prefix=harness(tmp_path,monkeypatch,rehearsal,error_kind='success')
    rehearsal.bridge_run(path,1)
    assert not resources
    assert json.loads((evidence/'result.json').read_text())=={'passed':True}
    assert json.loads((evidence/'host-cleanup.json').read_text())['recoveryRequired'] is False


def test_failed_evidence_copy_still_cleans_siblings_but_retains_controller(rehearsal,tmp_path,monkeypatch):
    path,evidence,resources,removed,prefix=harness(tmp_path,monkeypatch,rehearsal,error_kind='capture-failure')
    with pytest.raises(Exception): rehearsal.bridge_run(path,1)
    assert set(resources)=={prefix+'-controller'}
    assert resources[prefix+'-controller']['State']['Running'] is False
    assert json.loads((evidence/'host-cleanup.json').read_text())['recoveryRequired'] is True


@pytest.mark.parametrize('error_type',[RuntimeError,subprocess.TimeoutExpired])
def test_controller_failure_writer_sanitizes_json_escaped_secrets(rehearsal,tmp_path,error_type):
    secret='synthetic-quoted-"-secret'; password='synthetic-password'
    message=json.dumps({'argv':[password,secret]})
    error=error_type(message,1) if error_type is subprocess.TimeoutExpired else error_type(message)
    target=tmp_path/'failure.json'
    rehearsal.failure_evidence(target,error,{'rootPassword':password,'secret':secret})
    content=target.read_text()
    assert password not in content and 'synthetic-quoted' not in content
    assert json.loads(content)['type']==error_type.__name__


@pytest.mark.skipif(os.environ.get('D16_TEST_REHEARSAL_DOCKER_FAILURES')!='1',reason='Explicit owned Docker cleanup probe only')
def test_real_stopped_controller_and_importer_anonymous_volumes_are_removed(rehearsal,tmp_path):
    run='home-application-'+str(uuid.uuid4()); prefix='d16-test-cleanup-'+uuid.uuid4().hex+'-bulk-1'
    name=prefix+'-controller'; directory=tmp_path/'temporary'; directory.mkdir(); evidence=tmp_path/'evidence'; evidence.mkdir()
    bridge={'runId':run,'rootPassword':'synthetic-password','secret':'synthetic-signature'}
    created=[]; anonymous=[]
    try:
        controller_id=rehearsal.docker('run','-d','--name',name,'--label','d16.test.run='+run,'--network','none',
            '--entrypoint','python3','d16-content-resources-runtime:v1','-c',
            "import pathlib,time; p=pathlib.Path('/opt/d16-test'); (p/'state').mkdir(parents=True); (p/'evidence').mkdir(); (p/'state/content-window.json').write_text('{\"phase\":\"fenced\"}'); time.sleep(120)").stdout.decode().strip()
        created.append(('container',name))
        for suffix in ('code','sealed'):
            rehearsal.docker('volume','create','--label','d16.test.run='+run,prefix+'-'+suffix); created.append(('volume',prefix+'-'+suffix))
        rehearsal.docker('run','-d','--name',prefix+'-importer','--label','d16.test.run='+run,'--network','none',
            '--entrypoint','sleep','wordpress:php8.3-apache','120'); created.append(('container',prefix+'-importer'))
        specimen=json.loads(rehearsal.docker('inspect',prefix+'-importer').stdout)[0]
        anonymous=[mount['Name'] for mount in specimen['Mounts'] if mount['Type']=='volume']
        assert anonymous, 'Probe must cover actual image-created anonymous volume'
        for attempt in range(30):
            if rehearsal.docker('exec',name,'test','-f','/opt/d16-test/state/content-window.json',check=False).returncode==0: break
            time.sleep(.1)
        rehearsal.host_cleanup(bridge,name,controller_id,directory,evidence)
        assert json.loads((evidence/'host-cleanup.json').read_text())['recoveryRequired'] is False
        assert json.loads((evidence/'content-window.json').read_text())['phase']=='fenced'
        for kind,target in created:
            assert rehearsal.docker(*(['inspect',target] if kind=='container' else ['volume','inspect',target]),check=False).returncode!=0
        for target in anonymous: assert rehearsal.docker('volume','inspect',target,check=False).returncode!=0
    finally:
        # Only this probe's recorded names and verified labels; never broad prune.
        for kind,target in reversed(created):
            found=rehearsal.docker(*(['inspect',target] if kind=='container' else ['volume','inspect',target]),check=False)
            if not found.returncode:
                specimen=json.loads(found.stdout)[0]
                assert specimen.get('Config',specimen)['Labels']['d16.test.run']==run
                rehearsal.docker(*(['rm','-f','-v',target] if kind=='container' else ['volume','rm',target]))
