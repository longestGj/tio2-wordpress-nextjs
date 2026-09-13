"""Admission for new frontend candidates; no compatibility identity substitution."""
from pathlib import Path
import hashlib
import os
import tempfile
from cms_evidence import canonical, valid_hash
from candidate_contract import validate_payload
from frontend_backup import require, read_record
from release_contract import validate_manifest, inspect_archive, extract_release, sha256_file, _open_regular_read, coverage_counts
from release_actions import _verify_candidate_tree

FILES={'frontend/release.tar.gz','frontend/release-manifest.json','frontend/release-proof.json'}


def bind_installed_plugin(record, resources, evidence, *, runner=None):
    """Bind the root-approved installation to the live read-only Docker mount.

    A release's archived PHP is not the WordPress runtime. Never infer this
    directory from the old frontend source tree or from an uploaded manifest.
    """
    from copy import deepcopy
    from deployment_core import tree
    from release_baseline import protected_path
    from release_actions import SubprocessCommandRunner
    import json
    import re
    require(isinstance(resources, dict) and isinstance(evidence, dict), 'installed plugin binding required')
    name = resources.get('wordpressContainer')
    require(isinstance(name, str) and re.fullmatch(r'(?:[a-z][a-z0-9_-]{0,100}|[a-f0-9]{64})', name), 'installation container invalid')
    plugin = protected_path(Path(resources['pluginSource']), directory=True)
    wordpress = [c for c in record['runtime']['containers'] if c['role'] == 'wordpress']
    require(len(wordpress) == 1, 'registered WordPress identity missing')
    result = (runner or SubprocessCommandRunner().run)(('docker', 'inspect', name))
    require(result.returncode == 0, 'installed WordPress inspection failed')
    values = json.loads(result.stdout)
    require(isinstance(values, list) and len(values) == 1, 'installed WordPress inspection ambiguous')
    wp = values[0]
    mounts = [m for m in wp['Mounts'] if m['Destination'] == '/var/www/html/wp-content/plugins/tio2-site-model']
    require(wp['Id'] == wordpress[0]['id'] and wp['Image'] == resources['importerImage']
            and wp['State']['Running'] is True and wp['HostConfig']['Privileged'] is False
            and len(mounts) == 1 and mounts[0]['Type'] == 'bind' and mounts[0]['RW'] is False
            and Path(mounts[0]['Source']) == plugin, 'installed WordPress plugin mount mismatch')
    files = tree(plugin)
    require(bool(files) and files == evidence.get('pluginFiles'), 'installed plugin verification bytes changed')
    bound = deepcopy(record)
    bound['runtime']['deployment']['pluginSourceRoot'] = str(plugin)
    return bound

def validate_source(subject,candidate,baseline,*,payload_root=None):
    require(candidate.subject==subject.subject_id=='tio2-my' and candidate.release_type=='frontend-only','frontend source subject mismatch')
    payload_root=payload_root or subject.incoming/'frontend-payload'
    validate_payload(candidate,payload_root)
    require({name for name,_ in candidate.files}==FILES,'frontend source artifact set mismatch')
    root=payload_root/'frontend'
    manifest=validate_manifest(root/'release-manifest.json',root/'release.tar.gz')
    inspect_archive(root/'release.tar.gz',manifest)
    proof=read_record(root/'release-proof.json')
    expected={'schemaVersion':'d16-frontend-prerelease-v1','subject':subject.subject_id,
        'sourceCommit':candidate.source_commit,'buildId':candidate.build_id,
        'archiveSha256':manifest['archiveSha256'],'sourceManifestSha256':sha256_file(root/'release-manifest.json'),
        'cmsContractSha256':candidate.cms_contract_sha256,'configurationSha256':candidate.configuration_sha256,
        'contentSha256':baseline['cmsRuntime']['contentSha256'],'previousProductionReceipt':candidate.previous_production_receipt,
        'state':'PASSED','source':{'branch':'main','clean':True},
        'counts':coverage_counts(manifest['releaseSurfaceSha256']),
        'forms':{'rfq':'RECEIVED','sample':'RECEIVED','documents':'RECEIVED'},'evidenceSha256':proof.get('evidenceSha256')}
    require(proof==expected and proof['source']['clean'] is True and valid_hash(proof['evidenceSha256'])
        and manifest['commit']==candidate.source_commit
        and sha256_file(root/'release-proof.json')==candidate.prerelease_receipt_sha256,'frontend prerelease identity mismatch')
    validate_payload(candidate,payload_root)
    return {'commit':candidate.source_commit,'archiveSha256':manifest['archiveSha256'],'preparedManifest':manifest,
            'prereleaseProof':proof,'candidate':{'commit':candidate.source_commit,'archiveSha256':manifest['archiveSha256'],
            'manifestSha256':expected['sourceManifestSha256'],'proofSha256':candidate.prerelease_receipt_sha256}}

def install_source(subject,details,*,ownership_setter=None):
    destination=subject.production/'releases'/details['commit']
    if not destination.exists():
        extract_release(subject.incoming/'frontend-payload/frontend/release.tar.gz',details['preparedManifest'],subject,**({} if ownership_setter is None else {'ownership_setter':ownership_setter}))
    _verify_candidate_tree(destination,details['preparedManifest'])
    return destination


def _protected_record(path):
    from release_baseline import protected_path
    if os.name=='posix': protected_path(path)
    return read_record(path)

def enrolled_plugin_files(configuration,plugin):
    path=configuration/'cms-platform-enrollment.json'
    if not path.exists() and not path.is_symlink():return None
    record=_protected_record(path)
    require(set(record)=={'schemaVersion','subject','pluginSourceRoot','pluginFiles','cmsContractSha256','verificationSha256'}
        and record['schemaVersion']=='d16-cms-platform-enrollment-v1' and record['subject']=='tio2-my'
        and record['pluginSourceRoot']==str(plugin) and valid_hash(record['verificationSha256']), 'CMS platform enrollment mismatch')
    files=record['pluginFiles']
    require(isinstance(files,dict) and files and all(valid_hash(value) for value in files.values())
        and hashlib.sha256(canonical(files)).hexdigest()==record['cmsContractSha256'],'CMS platform contract mismatch')
    from deployment_core import tree
    require(tree(plugin)==files,'enrolled CMS plugin bytes changed')
    return files

def enrollment(subject):
    from deployment_core import Deployment
    require((subject.configuration/'frontend-enrollment.json').exists(),'capability-not-installed')
    record=_protected_record(subject.configuration/'frontend-enrollment.json')
    require(set(record)=={'schemaVersion','subject','previousProductionReceipt','record','ingress','cmsEvidence','cmsRuntime','oldFrontendVerification'}
        and record['schemaVersion']=='d16-frontend-enrollment-v1' and record['subject']==subject.subject_id=='tio2-my','frontend enrollment mismatch')
    cms=record['cmsEvidence'];verification=record['oldFrontendVerification']
    require(cms.get('verified') is True and cms.get('site_scope')==subject.subject_id
        and type(cms.get('published_records')) is int and cms['published_records']>0
        and valid_hash(cms.get('live_content_sha256')),'frontend CMS enrollment mismatch')
    require(set(verification)=={'active','cmsContractSha256','evidenceSha256'}
        and verification['active']==Deployment.frontend_identity(record['record'])
        and verification['cmsContractSha256']==record['cmsRuntime']['wordpressSha256']
        and valid_hash(verification['evidenceSha256']),'old frontend compatibility proof mismatch')
    return record

def load_baselines(subject,state,candidate):
    from analytics_config_update import assert_update_closed
    assert_update_closed(subject,state)
    from adoption_probe import LocalSnapshotSource,read_cms_scope
    from release_actions import SubprocessCommandRunner
    from release_baseline import _validate_record,validate_registered_ingress
    from subject_registry import load_registry
    from deployment_core import Deployment,DockerWebAdapter
    from site_frontend_adapter import _current_tls,_digest,_validate_certificate_renewal
    enrolled=enrollment(subject)
    registry=load_registry(Path('/etc/d16-release'));require(registry.resolve(subject.subject_id)==subject,'frontend registry changed')
    from cms_enrollment_repair import assert_repair_closed
    assert_repair_closed(registry.host.state_root.parent/'cms-enrollment-repair-532a03ae')
    reader=LocalSnapshotSource();reader._configure_tls_allowlist(registry)
    ingress=validate_registered_ingress(registry,reader._run(['/usr/sbin/nginx','-T']),reader,subject_id=subject.subject_id)
    record=_protected_record(subject.configuration/'baseline.json')
    live=_validate_record(_current_tls(record,ingress['certificates']),subject,None,None)
    cms=enrolled['cmsEvidence']; wordpress=next(c['id'] for c in live['runtime']['containers'] if c['role']=='wordpress')
    scope=read_cms_scope(SubprocessCommandRunner(),wordpress)
    require(scope['siteScope']==subject.subject_id and scope['publishedRecords']==cms['published_records']
        and scope['contentSha256']==cms['live_content_sha256'],'enrolled CMS content changed')
    plugin=Path(record['runtime']['deployment']['pluginSourceRoot']);files=enrolled_plugin_files(subject.configuration,plugin)
    require(files is not None,'verified CMS platform enrollment required')
    wp_record=next(c for c in record['runtime']['containers'] if c['role']=='wordpress')
    bind_installed_plugin(record,{'pluginSource':str(plugin),'wordpressContainer':wp_record['id'],
        'importerImage':wp_record['imageId']},{'pluginFiles':files})
    runtime={'containers':[c for c in live['runtime']['containers'] if c['role']!='web'],'volumes':live['runtime']['volumes'],
        'contentSha256':scope['contentSha256'],'configurationSha256':_digest(record['configuration']['environment']),
        'wordpressSha256':_digest(files)}
    require(runtime==enrolled['cmsRuntime'],'enrolled CMS runtime drift')
    current=Deployment.frontend_identity(record)
    require(DockerWebAdapter(subject).health(record,proxy=True)['buildId']==current['buildId'],'live Build changed')
    details=state.get('details',{});same=details.get('releaseId')==candidate.release_id
    previous=details.get('previousProductionReceipt') if same else (_digest(state) if state['state']!='IDLE' else enrolled['previousProductionReceipt'])
    prepared=details.get('preparedIngress',enrolled['ingress']) if same else ingress
    if not same:
        if 'frontendEnrollmentSha256' not in details:require(record==enrolled['record'],'post-install frontend drift')
        else:validate_previous_frontend(subject,state,record)
        validate_next_ingress(subject,details.get('preparedIngress',enrolled['ingress']),ingress,record)
        require(state['state'] in {'COMPLETED','ROLLED_BACK','IDLE'},'previous frontend transaction is not terminal')
    _validate_certificate_renewal([c for c in prepared['certificates'] if c['owner']==subject.owner],ingress['certificates'])
    return {'subject':subject.subject_id,'previousProductionReceipt':previous,'configurationSha256':live['configurationFingerprint'],
        'cmsContractSha256':_digest(files),'record':record,'activeFrontend':current,'cmsRuntime':runtime,
        'enrollment':enrolled,'enrollmentSha256':_digest(enrolled)}, {'subject':'host','baselineSha256':_digest({'subject':'host','ingress':ingress}),
        'ingress':ingress,'preparedIngress':prepared}

def prepare(context):
    from frontend_backup import plain,BINDING_FIELDS
    from release_state import IDENTITY_FIELDS,atomic_write_json
    from uuid import UUID
    from site_frontend_adapter import SiteFrontendAdapter
    subject=context.subject;candidate=context.candidate;state=plain(context.state);baseline=plain(context.subject_baseline)
    require(state['state'] in {'IDLE','COMPLETED','ROLLED_BACK'},'previous frontend transaction is not terminal')
    require(state.get('details',{}).get('releaseId')!=candidate.release_id,'frontend candidate replay')
    history=subject.state_root/'frontend-history'/candidate.release_id
    require(not history.exists(),'frontend candidate replay')
    source=validate_source(subject,candidate,baseline)
    manifest_hash=sha256_file(subject.incoming/'candidate-manifest.json')
    freeze_source(subject,candidate,manifest_hash)
    transaction={'schemaVersion':'d16-frontend-candidate-transaction-v1','subject':subject.subject_id,
        'releaseId':candidate.release_id,'candidateManifestSha256':manifest_hash,'previousStateSha256':hashlib.sha256(canonical(state)).hexdigest(),
        'enrollmentSha256':baseline['enrollmentSha256'],'baselineSha256':hashlib.sha256(canonical(baseline['record'])).hexdigest()}
    transaction_hash=hashlib.sha256(canonical(transaction)).hexdigest()
    details={**source,'releaseId':candidate.release_id,'subject':subject.subject_id,'releaseType':'frontend-only','sourceCommit':candidate.source_commit,
        'candidateManifestSha256':manifest_hash,'previousProductionReceipt':candidate.previous_production_receipt,'adapterVersion':SiteFrontendAdapter.version,
        'runRoot':'frontend/'+candidate.release_id,'transactionSha256':transaction_hash,'requestId':str(UUID(transaction_hash[:32])),
        'cmsEvidenceSha256':hashlib.sha256(canonical(baseline['enrollment']['cmsEvidence'])).hexdigest(),
        'cmsEvidence':baseline['enrollment']['cmsEvidence'],'cmsContractSha256':candidate.cms_contract_sha256,
        'active':{'enrollmentSha256':transaction['baselineSha256']},'configurationFingerprint':candidate.configuration_sha256,
        'hostBaselineSha256':context.global_baseline['baselineSha256'],'preparedIngress':plain(context.global_baseline['ingress']),
        'frontendEnrollmentSha256':baseline['enrollmentSha256']}
    if state['state']!='IDLE':
        previous_path=subject.state_root/'frontend-deployment.json'
        if not previous_path.exists():previous_path=subject.state_root/'frontend-history'/state['details']['releaseId']/'frontend-deployment.json'
        if previous_path.exists():
            previous=read_record(previous_path)
            phase=previous.get('phase')
            require(phase in {'activated','rolled-back'},'previous frontend slot is not terminal')
            if previous.get('target' if phase=='activated' else 'old') != baseline['record']:
                if 'frontendEnrollmentSha256' in state.get('details', {}):
                    details['configurationUpdateTransition'] = validate_previous_frontend(subject,state,baseline['record'])
                else:
                    from cms_frontend_transition import validate_transition
                    details['cmsInstallationTransition'] = validate_transition(subject,state,previous,baseline['record'])
            inactive=previous.get('old' if phase=='activated' else 'target')
            if inactive is not None:details['previousBaseline']=inactive
    install_source(subject,source)
    # All old evidence remains immutable even when a new generation is prepared.
    if state['state']!='IDLE':
        old_id=state['details']['releaseId']; old_root=subject.state_root/'frontend-history'/old_id
        old_root.mkdir(parents=True,exist_ok=True)
        for name,value in [('state.json',state)]+[(name,read_record(subject.state_root/name)) for name in ('frontend-deployment.json','frontend-candidate-transaction.json','frontend-backup-request.json') if (subject.state_root/name).exists()]:
            path=old_root/name
            if path.exists():require(read_record(path)==value,'frontend history collision')
            else:atomic_write_json(path,value)
        for name in ('frontend-deployment.json','frontend-backup-request.json'):
            path=subject.state_root/name
            if path.exists():path.unlink()
    atomic_write_json(subject.state_root/'frontend-candidate-transaction.json',transaction)
    return {'ok':True,'state':'PREPARED','binding':{key:details[key] for key in BINDING_FIELDS},'preparedDetails':details}

def assemble_installation_enrollment(subject,old_record,verification_evidence,previous_receipt, *, resources=None, resource_evidence=None):
    """Observe the installed topology; caller persists returned records under lock.

    Call only after the installed page verifier succeeds against the old frontend
    while the administrator still owns the shared CMS maintenance window.
    """
    from copy import deepcopy
    from deployment_core import Deployment,DockerWebAdapter,tree
    from adoption_probe import read_cms_scope,LocalSnapshotSource
    from release_actions import SubprocessCommandRunner
    from release_baseline import validate_registered_ingress,protected_path
    from subject_registry import load_registry
    from site_frontend_adapter import _digest
    require(isinstance(verification_evidence,dict) and set(verification_evidence)=={'ok','content','status','seo','sitemap','contentSha256'}
        and all(verification_evidence.get(key) is True for key in ('ok','content','status','seo','sitemap'))
        and valid_hash(verification_evidence.get('contentSha256')),'old frontend verification is required')
    require(subject.subject_id=='tio2-my' and isinstance(previous_receipt,str) and previous_receipt,'installation subject/receipt mismatch')
    registry=load_registry(Path('/etc/d16-release'));require(registry.resolve(subject.subject_id)==subject,'installation registry changed')
    record=bind_installed_plugin(old_record,resources,resource_evidence)
    # These are existing root-enrolled paths, never paths supplied by the upload.
    config=record['configuration']
    for role in ('environment','compose','nginx','nginxIncludes'):
        entries=config[role] if isinstance(config[role],list) else [config[role]]
        for entry in entries:
            path=protected_path(Path(entry['path']));entry['sha256']=sha256_file(path)
    plugin=protected_path(Path(record['runtime']['deployment']['pluginSourceRoot']),directory=True)
    files=tree(plugin);require(bool(files),'installed plugin is empty')
    plugin_hash=_digest(files)
    wp=next(c['id'] for c in record['runtime']['containers'] if c['role']=='wordpress')
    scope=read_cms_scope(SubprocessCommandRunner(),wp)
    require(scope['siteScope']==subject.subject_id and valid_hash(scope['contentSha256'])
        and type(scope['publishedRecords']) is int and scope['publishedRecords']>0,'installed content verification mismatch')
    reader=LocalSnapshotSource();reader._configure_tls_allowlist(registry)
    ingress=validate_registered_ingress(registry,reader._run(['/usr/sbin/nginx','-T']),reader,subject_id=subject.subject_id)
    active=Deployment.frontend_identity(record)
    # Internal health remains available while public maintenance serves 503.
    require(DockerWebAdapter(subject).health(record)['buildId']==active['buildId'],'old frontend Build changed during installation')
    cms={'verified':True,'site_scope':subject.subject_id,'published_records':scope['publishedRecords'],
        'live_content_sha256':scope['contentSha256'],'pageContentSha256':verification_evidence['contentSha256'],'cmsContractSha256':plugin_hash}
    runtime={'containers':[c for c in record['runtime']['containers'] if c['role']!='web'],'volumes':record['runtime']['volumes'],
        'contentSha256':scope['contentSha256'],'configurationSha256':_digest(config['environment']),'wordpressSha256':plugin_hash}
    verification_hash=_digest(verification_evidence)
    platform={'schemaVersion':'d16-cms-platform-enrollment-v1','subject':subject.subject_id,'pluginSourceRoot':str(plugin),
        'pluginFiles':files,'cmsContractSha256':plugin_hash,'verificationSha256':verification_hash}
    frontend={'schemaVersion':'d16-frontend-enrollment-v1','subject':subject.subject_id,'previousProductionReceipt':previous_receipt,
        'record':record,'ingress':ingress,'cmsEvidence':cms,'cmsRuntime':runtime,
        'oldFrontendVerification':{'active':active,'cmsContractSha256':plugin_hash,'evidenceSha256':verification_hash}}
    return {'baseline':record,'cmsPlatform':platform,'frontend':frontend}

def validate_previous_frontend(subject,state,record):
    from frontend_backup import BINDING_FIELDS
    details=state['details']
    path=subject.state_root/'frontend-deployment.json'
    if not path.exists():
        archive=subject.state_root/'frontend-history'/details['releaseId']
        require(read_record(archive/'state.json')==state,'previous terminal state archive changed')
        path=archive/'frontend-deployment.json'
    journal=read_record(path)
    require(journal.get('schemaVersion')=='d16-frontend-deployment-v1'
        and journal.get('binding')=={key:details.get(key) for key in BINDING_FIELDS}
        and journal.get('backup')==details.get('frontendBackup'),'previous frontend journal mismatch')
    phase='activated' if state['state']=='COMPLETED' else 'rolled-back'
    require(state['state'] in {'COMPLETED','ROLLED_BACK'} and journal.get('phase')==phase,
            'previous active frontend changed')
    old = journal.get('target' if phase=='activated' else 'old')
    if record != old:
        from analytics_config_update import validate_update
        return validate_update(subject,state,old,record)

def validate_next_ingress(subject,prepared,fresh,record):
    from copy import deepcopy
    from site_frontend_adapter import _validate_certificate_renewal,_ingress_with_details
    from deployment_core import _upstream
    expected=deepcopy(prepared)
    _validate_certificate_renewal(expected['certificates'],fresh['certificates'])
    expected['certificates']=deepcopy(fresh['certificates'])
    for entry in expected['nginxInventory']['files']:
        if Path(entry['logicalPath'])==subject.configuration/'web-upstream.conf':
            entry['sha256']=hashlib.sha256(_upstream(record)).hexdigest()
            for reference in entry['references']:
                if reference['kind']=='proxy_pass':reference['value']='127.0.0.1:'+str(record['runtime']['deployment']['activePort'])
    require(_ingress_with_details(expected)==fresh,'next frontend ingress changed outside prior transaction')

def freeze_source(subject,candidate,manifest_hash):
    """Retain original evidence bytes before incoming may hold the next release."""
    import shutil
    from candidate_contract import CandidateEnvelope
    from release_state import _fsync_directory
    root=subject.state_root/'frontend-candidates';root.mkdir(mode=0o700,exist_ok=True)
    require(not root.is_symlink(),'frontend evidence root is unsafe')
    target=root/candidate.release_id
    expected={'candidate-manifest.json':manifest_hash,**{'payload/'+name:value for name,value in candidate.files}}
    def verify(directory):
        require(not directory.is_symlink(),'frontend evidence directory is unsafe')
        require(CandidateEnvelope.from_path(directory/'candidate-manifest.json')==candidate,'saved frontend envelope changed')
        validate_payload(candidate,directory/'payload')
        require(all(sha256_file(directory/name)==value for name,value in expected.items()),'saved frontend artifact changed')
    if target.exists():
        verify(target);return
    with tempfile.TemporaryDirectory(prefix='.snapshot-',dir=root) as temporary:
        staging=Path(temporary)
        for name,value in expected.items():
            destination=staging/name;destination.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
            source_path=subject.incoming/('frontend-payload/'+name.removeprefix('payload/') if name.startswith('payload/') else name)
            with _open_regular_read(source_path) as source,destination.open('xb') as output:
                size=os.fstat(source.fileno()).st_size
                require(size<=2*1024**3 and shutil.disk_usage(root).free>=size+4*1024**3,'frontend evidence disk reserve unavailable')
                copied=0
                while block:=source.read(1024**2):
                    copied+=len(block);require(copied<=size,'frontend evidence source changed')
                    output.write(block)
                output.flush();os.fsync(output.fileno())
            require(sha256_file(destination)==value,'frontend evidence source changed')
        verify(staging)
        os.rename(staging,target)
        _fsync_directory(root)
