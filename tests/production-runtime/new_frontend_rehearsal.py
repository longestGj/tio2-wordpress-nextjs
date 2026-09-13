"""Actual two new envelopes on the owned Docker frontend runtime fixture.

The HTTP frontend and prerelease/completion documents are local contract fixtures;
this tests deployment mechanics, never production business acceptance.
"""
from copy import deepcopy
import hashlib
import io
import json
from pathlib import Path
import tarfile
import subprocess
import sys
from contextlib import redirect_stdout
from unittest.mock import patch

def exercise(env):
    from cms_evidence import canonical
    from candidate_contract import CandidateEnvelope,_tree_digest
    from frontend_candidate import assemble_installation_enrollment
    from frontend_backup import BINDING_FIELDS,restore_frontend_backup
    from release_state import atomic_write_json,read_state
    from site_frontend_adapter import SiteFrontendAdapter
    from release_controller import ReleaseController
    subject=env['subject'];registry=env['registry'];incoming=subject.incoming;state_root=subject.state_root
    digest=lambda value:hashlib.sha256(canonical(value)).hexdigest()
    sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
    result=env['result'];low=env['low'];old=env['old']
    with patch('subject_registry.load_registry',return_value=registry),patch('release_controller.load_registry',return_value=registry):
        from deployment_core import tree
        resources={'wordpressContainer':env['wordpress'],'pluginSource':str(env['plugin']),
                   'importerImage':env['images']['wordpress']['Id']}
        observed=assemble_installation_enrollment(subject,old,dict(ok=True,content=True,status=True,seo=True,sitemap=True,contentSha256='7'*64),
                    digest(read_state(state_root)),resources=resources,resource_evidence={'pluginFiles':tree(env['plugin'])})
        for name,key in [('cms-platform-enrollment.json','cmsPlatform'),('frontend-enrollment.json','frontend'),('baseline.json','baseline')]:
            atomic_write_json(subject.configuration/name,observed[key])
        def dispatch(name):
            from d16_release import main
            import traceback
            output=io.StringIO()
            execute=ReleaseController.execute
            run=subprocess.run
            def diagnostic_run(*args,**kwargs):
                command=args[0] if args else kwargs.get('args',())
                build=tuple(command[:2])==('/usr/bin/docker','build')
                if build:kwargs['stderr']=subprocess.PIPE
                completed=run(*args,**kwargs)
                if build and completed.returncode:
                    print('LOCAL FIXTURE BUILD FAILURE\n'+completed.stderr.decode(errors='replace')[-8192:],file=sys.stderr)
                return completed
            def traced(controller,*args):
                try:return execute(controller,*args)
                except Exception:
                    traceback.print_exc()
                    raise
            with patch.object(ReleaseController,'execute',traced),patch('subprocess.run',diagnostic_run),redirect_stdout(output):code=main(['tio2-my',name])
            value=json.loads(output.getvalue())
            assert code==0,value
            return value
        original_compatibility=(state_root/'compatibility-transaction.json').read_bytes()
        first=None
        for index,commit in enumerate(('c'*40,'d'*40)):
            prior=read_state(state_root);record=env['read_record'](subject.configuration/'baseline.json')
            from site_frontend_adapter import _configuration_fingerprint
            build='new-build-'+str(index+1);root=incoming/'frontend-payload/frontend';root.mkdir(parents=True,exist_ok=True)
            files={**env['files'],'public/new-candidate.txt':commit.encode()}
            with tarfile.open(root/'release.tar.gz','w:gz') as archive:
                for name,data in sorted(files.items()):
                    member=tarfile.TarInfo(name);member.size=len(data);member.mode=0o644;archive.addfile(member,io.BytesIO(data))
            manifest={**env['manifest'],'commit':commit,'archiveSha256':sha(root/'release.tar.gz'),'files':[{'path':name,'sha256':hashlib.sha256(data).hexdigest()} for name,data in sorted(files.items())]}
            atomic_write_json(root/'release-manifest.json',manifest)
            proof={'schemaVersion':'d16-frontend-prerelease-v1','subject':'tio2-my','sourceCommit':commit,'buildId':build,
                'archiveSha256':manifest['archiveSha256'],'sourceManifestSha256':sha(root/'release-manifest.json'),
                'cmsContractSha256':observed['cmsPlatform']['cmsContractSha256'],'contentSha256':observed['frontend']['cmsRuntime']['contentSha256'],
                'configurationSha256':_configuration_fingerprint(record),'previousProductionReceipt':digest(prior),
                'state':'PASSED','source':{'branch':'main','clean':True},'counts':{'businessPages':57,'registeredObjects':59,'widths':3,'browserCases':177},
                'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'evidenceSha256':'e'*64}
            atomic_write_json(root/'release-proof.json',proof)
            payload=tuple(sorted(('frontend/'+path.name,sha(path)) for path in root.iterdir()))
            envelope={'schemaVersion':'d16-release-candidate-v1','releaseId':'new-frontend-'+str(index+1),'subject':'tio2-my','releaseType':'frontend-only','sourceCommit':commit,'buildId':build,
                'createdAt':'2026-09-12T00:00:00Z','previousProductionReceipt':digest(prior),'cmsContractSha256':proof['cmsContractSha256'],'configurationSha256':proof['configurationSha256'],
                'prereleaseReceiptSha256':sha(root/'release-proof.json'),'payloadSha256':_tree_digest(payload),'files':[{'path':name,'sha256':value} for name,value in payload]}
            atomic_write_json(incoming/'candidate-manifest.json',envelope)
            dispatch('prepare')
            def action(name):
                details=read_state(state_root)['details'];binding={key:details[key] for key in BINDING_FIELDS}
                atomic_write_json(incoming/'backup-request.json',{'schemaVersion':'d16-frontend-backup-request-v1',**binding})
                atomic_write_json(incoming/'frontend-action.json',{'schemaVersion':'d16-frontend-action-v1','binding':binding,'backupId':details.get('frontendBackup',{}).get('backupId')})
                return dispatch(name)
            backup=action('backup')['state']['details']['frontendBackup']
            restored=restore_frontend_backup(subject.outgoing/(backup['backupId']+'.tar.age'),env['root']/'identity.age')
            atomic_write_json(incoming/'frontend-restore.json',restored)
            action('stage');action('activate');action('verify')
            current=env['read_record'](subject.configuration/'baseline.json')
            assert low.health(current,proxy=True)['buildId']==build
            if index==0:
                first=build
                details=read_state(state_root)['details'];binding={key:details[key] for key in BINDING_FIELDS};binding['backupId']=backup['backupId']
                e2e={'schemaVersion':'d16-production-business-e2e-v1',**binding,'environment':'production','suite':'business-e2e','state':'PASSED','runId':'LOCAL-GENERATED-FIXTURE'}
                inbox={'schemaVersion':'d16-production-inbox-v1',**binding,'source':'server-inbox','forms':{}}
                for form in ('rfq','sample','documents'):
                    mail=f'Message-ID: <{form}@example.test>\r\nReceived: by fixture; Sat, 12 Sep 2026 00:00:00 +0000\r\n\r\nLOCAL CONTRACT FIXTURE\r\n'.encode()
                    (incoming/(form+'-received.eml')).write_bytes(mail)
                    inbox['forms'][form]={'state':'RECEIVED','messageId':f'<{form}@example.test>','emlSha256':hashlib.sha256(mail).hexdigest()}
                atomic_write_json(incoming/'business-e2e-receipt.json',e2e);atomic_write_json(incoming/'inbox-confirmation-receipt.json',inbox)
                names=('business-e2e-receipt.json','inbox-confirmation-receipt.json','rfq-received.eml','sample-received.eml','documents-received.eml')
                atomic_write_json(incoming/'completion-receipt.json',{'schemaVersion':'d16-release-completion-v1',**binding,'businessE2E':'PASSED','forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'evidenceSha256':{name:sha(incoming/name) for name in names}})
                assert action('verify')['state']['state']=='COMPLETED'
            else:
                action('rollback')
                current=env['read_record'](subject.configuration/'baseline.json')
                assert low.health(current,proxy=True)['buildId']==first
            assert (state_root/'compatibility-transaction.json').read_bytes()==original_compatibility
            result['cases'].append({'case':'new-envelope-'+str(index+1),'commit':commit,'buildId':build,'passed':True,'actualDocker':True,'cms':env['cms_identity']()})
        result['newCandidateWorkflow']={'firstBuild':first,'secondBuild':build,'rollbackBuild':low.health(current,proxy=True)['buildId'],'entrypoint':'d16_release.main and ReleaseController.system with local fixture registry; real Deployment and DockerWebAdapter','proofs':'generated local contract fixtures, not production approval'}
