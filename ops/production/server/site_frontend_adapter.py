"""Frontend-only adapter. All resources come from the verified subject context."""
from __future__ import annotations

import hashlib
from copy import deepcopy
from dataclasses import dataclass
from pathlib import Path

from cms_evidence import canonical
from deployment_core import Deployment
from frontend_backup import backup_frontend,binding,plain,read_record,read_request,require,CMS_EXCLUDED
from release_adapter import SafeFrontendRollback
from release_contract import ReleaseError,sha256_file
from release_state import IDENTITY_FIELDS


@dataclass(frozen=True)
class CompatibilityCandidate:
    release_id: str
    subject: str
    release_type: str
    source_commit: str
    build_id: str
    previous_production_receipt: str
    configuration_sha256: str
    cms_contract_sha256: str
    manifest_sha256: str


def compatibility_candidate(subject,state):
    """Explicit Task 4 read-only bridge; it never creates a new manifest."""
    from phase1_migration import COMPATIBILITY_COMMIT,COMPATIBILITY_RELEASE_ID,COMPATIBILITY_RUN_ROOT
    from release_actions import _verify_candidate_tree
    from release_contract import validate_manifest,inspect_archive,validate_prerelease_proof
    from candidate_contract import ValidatedPayload
    details=state['details']; transaction=read_record(subject.state_root/'compatibility-transaction.json')
    require(set(transaction)=={'schemaVersion','subject','releaseType','releaseId','sourceCommit','runRoot','candidate','artifacts','proofObjectSha256'}
            and transaction['schemaVersion']=='d16-production-transaction-v1'
            and transaction['subject']==subject.subject_id=='tio2-my' and transaction['releaseType']=='frontend-only'
            and transaction['sourceCommit']==details['sourceCommit']==COMPATIBILITY_COMMIT
            and transaction['releaseId']==details['releaseId']==COMPATIBILITY_RELEASE_ID
            and transaction['runRoot']==details['runRoot']==COMPATIBILITY_RUN_ROOT
            and transaction['candidate']==plain(details['candidate'])
            and hashlib.sha256(canonical(transaction)).hexdigest()==details['transactionSha256'],'compatibility transaction mismatch')
    require(set(transaction['artifacts'])=={'release.tar.gz','release-manifest.json','release-proof.json','cms-identity.json'},'compatibility artifact set mismatch')
    for name,digest in transaction['artifacts'].items():
        require(sha256_file(subject.incoming/name)==digest,'compatibility artifact bytes changed')
    manifest=validate_manifest(subject.incoming/'release-manifest.json',subject.incoming/'release.tar.gz')
    inspect_archive(subject.incoming/'release.tar.gz',manifest)
    proof=validate_prerelease_proof(subject.incoming/'release-proof.json',subject.incoming/'release-manifest.json',manifest)
    expected_candidate={key:proof[key] for key in ('commit','archiveSha256','manifestSha256')}
    expected_candidate.update(proofSha256=transaction['artifacts']['release-proof.json'],contractVersion=proof['contractVersion'])
    require(transaction['candidate']==expected_candidate and manifest['commit']==COMPATIBILITY_COMMIT
            and transaction['artifacts']['release.tar.gz']==manifest['archiveSha256']
            and transaction['artifacts']['release-manifest.json']==proof['manifestSha256'],
            'compatibility candidate artifact identity mismatch')
    from cms_evidence import CmsEvidence,valid_hash
    cms=details['cmsEvidence']
    require(set(cms)==set(CmsEvidence.__dataclass_fields__)
            and all(valid_hash(value) for name,value in cms.items() if name.endswith('_sha256'))
            and type(cms['published_records']) is int and cms['published_records']>0
            and cms['candidate_sha256']==hashlib.sha256(canonical({key:expected_candidate[key] for key in ('commit','archiveSha256','manifestSha256')})).hexdigest()
            and cms['adoption_content_sha256']==cms['live_content_sha256'],
            'compatibility CMS evidence identity mismatch')
    require(cms['verified'] is True and cms['site_scope']==subject.subject_id
            and cms['prerelease_identity_sha256']==transaction['artifacts']['cms-identity.json']==proof['prerelease']['cmsIdentitySha256']
            and cms['proof_sha256']==transaction['proofObjectSha256']==hashlib.sha256(canonical(proof)).hexdigest()
            and details['candidateManifestSha256']==transaction['artifacts']['release-manifest.json']
            and plain(details['preparedManifest'])==manifest and plain(details['prereleaseProof'])==proof,'compatibility CMS or manifest mismatch')
    _verify_candidate_tree(subject.production/'releases'/COMPATIBILITY_COMMIT,manifest)
    for name,digest in transaction['artifacts'].items():
        require(sha256_file(subject.incoming/name)==digest,'compatibility artifact changed during validation')
    candidate=CompatibilityCandidate(COMPATIBILITY_RELEASE_ID,subject.subject_id,'frontend-only',COMPATIBILITY_COMMIT,
        proof['prerelease']['buildId'],details['previousProductionReceipt'],details['configurationFingerprint'],
        hashlib.sha256(canonical(plain(cms))).hexdigest(),details['candidateManifestSha256'])
    return candidate,ValidatedPayload(subject.subject_id,'frontend-only',tuple((item['path'],item['sha256']) for item in manifest['files']))


class SiteFrontendAdapter:
    version='d16-site-frontend-v1'
    # Migration preserves this older declared identity; never rewrite its state.
    compatible_versions=frozenset({'tio2-web-bluegreen-v1','site-frontend-v1'})

    def __init__(self, *, engine_factory=Deployment, validator=None, backup_tools=None, publisher=None):
        self.engine_factory=engine_factory; self.validator=validator or validate_live_context
        self.backup_tools=backup_tools; self.publisher=publisher

    def _validate(self,context):
        require(context.subject.kind=='site' and context.candidate.subject==context.subject.subject_id
                and context.candidate.release_type=='frontend-only','frontend subject mismatch')
        expected=binding(context); state=read_record(context.subject.state_root/'state.json')
        require(state==plain(context.state),'frontend state identity changed')
        require(expected['sourceCommit']==context.candidate.source_commit and expected['releaseId']==context.candidate.release_id,
                'frontend candidate identity changed')
        require(expected['adapterVersion'] in {self.version,*self.compatible_versions},'frontend adapter version requires explicit compatibility')
        read_request(context)
        request=read_record(context.subject.incoming/'frontend-action.json')
        require(request=={'schemaVersion':'d16-frontend-action-v1','binding':expected,
                          'backupId':context.state['details'].get('frontendBackup',{}).get('backupId')},
                'frontend action request mismatch')
        if isinstance(context.candidate,CompatibilityCandidate):
            candidate,_=compatibility_candidate(context.subject,context.state)
            require(candidate==context.candidate,'compatibility candidate changed')
        elif (context.subject.incoming/'candidate-manifest.json').exists():
            from candidate_contract import CandidateEnvelope,validate_payload
            path=context.subject.incoming/'candidate-manifest.json'
            require(sha256_file(path)==expected['candidateManifestSha256'] and CandidateEnvelope.from_path(path)==context.candidate,'frontend manifest changed')
            validate_payload(context.candidate,context.subject.incoming/'payload')
        observed=self.validator(context)
        require(plain(observed)==plain(context.subject_baseline['cmsRuntime']),'CMS runtime changed')
        return expected

    def validate_context(self,context):
        return self._validate(context)

    def _backup(self,context):
        expected=binding(context); backup=plain(context.state['details'].get('frontendBackup'))
        require(isinstance(backup,dict) and backup.get('binding')==expected and backup.get('cmsExcluded')==CMS_EXCLUDED,'frontend backup identity mismatch')
        read_request(context)
        path=context.subject.production/'backups/frontend'/(backup['backupId']+'.json')
        require(read_record(path)==backup and sha256_file(path.with_name(backup['backupId']+'.tar.age'))==backup['ciphertextSha256'],'saved frontend backup changed')
        return backup

    def _restore(self,context,backup):
        evidence=read_record(context.subject.incoming/'frontend-restore.json')
        require(evidence.get('schemaVersion')=='d16-frontend-restore-v1'
                and all(evidence.get(key) is True for key in ('verified','fullArchiveRead','isolated','cleanupVerified'))
                and evidence.get('binding')==backup['binding']
                and all(evidence.get(key)==backup[key] for key in ('backupId','ciphertextSha256','manifestSha256'))
                and evidence.get('buildId')==backup['active']['buildId'] and evidence.get('imageId')==backup['active']['imageId']
                and evidence.get('health',{}).get('status')==200 and evidence.get('health',{}).get('bytes',0)>0,
                'verified frontend restore is required')

    def prepare(self,context):
        expected=self._validate(context)
        return {'ok':True,'binding':expected,'state':'PREPARED'}

    def backup(self,context):
        self._validate(context)
        options={'tools':self.backup_tools}
        if self.publisher is not None: options['publisher']=self.publisher
        result=backup_frontend(context,**options)
        self._validate(context)
        return {'ok':True,'state':'BACKED_UP','binding':binding(context),'backup':result}

    def _run(self,action,context,allowed):
        require(context.state['state'] in allowed,'frontend action state mismatch')
        self._validate(context); backup=self._backup(context); self._restore(context,backup)
        engine=self.engine_factory(context.subject)
        try: result=getattr(engine,action)(context,backup)
        except SafeFrontendRollback:
            # The CMS check must still succeed after the frontend recovery.
            self._validate(context)
            raise
        self._validate(context)
        return result

    def stage(self,context): return self._run('stage',context,{'BACKED_UP','STAGED','INTERNAL_VERIFIED'})
    def activate(self,context): return self._run('activate',context,{'INTERNAL_VERIFIED','ACTIVATED'})
    def verify(self,context): return self._run('verify_frontend',context,{'ACTIVATED','PUBLIC_VERIFIED'})
    def rollback(self,context): return self._run('rollback_frontend',context,{'ACTIVATED','PUBLIC_VERIFIED','FAILED','ROLLED_BACK'})


def validate_live_context(context):
    # Controller constructs these baselines through the trusted live loader.
    # Re-running that loader here checks runtime identity on either side of every
    # action, including the unchanged CMS fingerprint and current source bytes.
    baseline,host=load_live_baselines(context.subject)
    validate_frontend_baselines(context,baseline,host)
    return baseline['cmsRuntime']


def _digest(value): return hashlib.sha256(canonical(plain(value))).hexdigest()


def _configuration_fingerprint(record):
    config=record['configuration']
    entries={role:config[role] for role in ('environment','compose','nginx')}
    for role in ('nginxIncludes','tlsFiles'):
        entries.update({role+str(index):entry for index,entry in enumerate(config[role])})
    return _digest(entries)


def _current_tls(record,certificates):
    """Only Task 2 validated certificate leaves may rotate; paths stay owned."""
    result=deepcopy(plain(record))
    for entry in result['configuration']['tlsFiles']:
        path=Path(entry['path'])
        for certificate in certificates:
            for role in ('Fullchain','PrivateKey'):
                logical=Path(certificate[role[0].lower()+role[1:]+'Path'])
                resolved=Path(certificate['resolved'+role+'Path'])
                prefix='fullchain' if role=='Fullchain' else 'privkey'
                import re
                if path==logical or path.parent==resolved.parent and re.fullmatch(prefix+r'[1-9][0-9]*\.pem',path.name):
                    entry.update(path=str(resolved),sha256=certificate[role[0].lower()+role[1:]+'Sha256'])
    return result


def _ingress_with_details(ingress):
    result=deepcopy(plain(ingress))
    result['configurationSha256']=_digest({key:result[key] for key in ('nginxInventory','certificates')})
    return result


def _certificate_policy(certificates):
    """Stable Task 2 ownership, live paths and the exact PREPARED SAN set."""
    return sorted((item['owner'],item['certName'],item['fullchainPath'],item['privateKeyPath'],
                   tuple(sorted(set(item['san'])))) for item in certificates)


def _validate_certificate_renewal(prepared,fresh):
    require(_certificate_policy(prepared)==_certificate_policy(fresh),'registered TLS certificate policy changed')
    dynamic={'resolvedFullchainPath','resolvedPrivateKeyPath','fullchainSha256','privateKeySha256','notAfter'}
    def fixed(values):
        return sorted(({key:(sorted(set(value)) if key=='san' else value) for key,value in item.items() if key not in dynamic}
                       for item in values),key=lambda item:(item['owner'],item['certName']))
    require(fixed(prepared)==fixed(fresh),'registered TLS certificate identity changed')


def validate_frontend_baselines(context,baseline=None,host=None):
    """Compare observations, never substitute PREPARED expectations for them."""
    baseline=plain(baseline if baseline is not None else context.subject_baseline)
    host=plain(host if host is not None else context.global_baseline)
    details=plain(context.state['details']); subject=context.subject
    require(baseline.get('subject')==subject.subject_id and host.get('subject')=='host','frontend baseline subject changed')
    require(baseline.get('previousProductionReceipt')==details['previousProductionReceipt']
            and baseline.get('cmsContractSha256')==_digest(details['cmsEvidence']), 'frontend receipt or CMS evidence changed')
    record=baseline['record']; old=record; allowed=record
    path=subject.state_root/'frontend-deployment.json'
    backup=details.get('frontendBackup')
    if path.exists():
        journal=read_record(path)
        require(journal.get('schemaVersion')=='d16-frontend-deployment-v1' and journal.get('binding')==binding(context)
                and backup is not None and journal.get('backup')==backup,'frontend journal binding changed')
        old=journal['old'];phase=journal['phase']
        require(phase in {'building','starting','internal-check','internal-verified','activated','rolled-back'},'frontend journal requires recovery')
        allowed=journal['target'] if phase=='activated' else old
        if journal.get('target') is not None and phase in {'internal-verified','activated'}:
            target=journal['target'];target_identity=Deployment.frontend_identity(target)
            require(target_identity['commit']==details['sourceCommit']
                    and target_identity['sourceRoot']==str(subject.production/'releases'/details['sourceCommit'])
                    and target_identity['buildId']==context.candidate.build_id
                    and target_identity['imageId']==journal['image']['id'],'frontend journal target changed')
            require(target['active']=={'kind':'managed','commit':details['sourceCommit'],
                    'sourceRoot':str(subject.production/'releases'/details['sourceCommit']),
                    'files':plain(details['preparedManifest']['files'])},'frontend journal candidate files changed')
            if 'activePort' in old['runtime']['deployment']:
                require('127.0.0.1:'+str(target['runtime']['deployment']['activePort']) in subject.ports
                        and target['runtime']['deployment']['activePort']!=old['runtime']['deployment']['activePort'],'frontend journal slot changed')
            # An action journal can authorize frontend fields only. It cannot
            # lend its identity to a CMS/configuration/host modification.
            unchanged=deepcopy(target);unchanged['active']=deepcopy(old['active'])
            for name in ('containers','images','healthChecks','deployment'):
                if name in old['runtime']:unchanged['runtime'][name]=deepcopy(old['runtime'][name])
            unchanged['configuration']['nginxIncludes']=deepcopy(old['configuration']['nginxIncludes'])
            require(unchanged==old,'frontend journal changed non-frontend fields')
            require([item for item in target['runtime']['containers'] if item['role']!='web']==[item for item in old['runtime']['containers'] if item['role']!='web'],'frontend journal changed CMS containers')
            deployment=deepcopy(target['runtime']['deployment'])
            for name in ('buildId','activePort'):
                if name in old['runtime']['deployment']:deployment[name]=old['runtime']['deployment'][name]
            require(deployment==old['runtime']['deployment'],'frontend journal changed runtime configuration')
            for role in ('images','healthChecks'):
                before=old['runtime'].get(role,[]);after=target['runtime'].get(role,[])
                expected=([item for item in before if item['id']!=journal['image']['id']]+[journal['image']]) if role=='images' else deepcopy(before)
                if role=='healthChecks':
                    for item in expected:
                        if item['role']=='web':item['url']='http://127.0.0.1:'+str(target['runtime']['deployment']['activePort'])+'/'
                require(after==expected,'frontend journal changed runtime inventory')
            includes=deepcopy(old['configuration']['nginxIncludes'])
            from deployment_core import _upstream
            for item in includes:
                if Path(item['path'])==subject.configuration/'web-upstream.conf': item['sha256']=hashlib.sha256(_upstream(target)).hexdigest()
            require(target['configuration']['nginxIncludes']==includes,'frontend journal changed Nginx configuration')
    require(_digest(old)==details['active']['enrollmentSha256']
            and _configuration_fingerprint(old)==details['configurationFingerprint'],'frontend PREPARED baseline changed')
    if backup is not None: require(Deployment.frontend_identity(old)==backup.get('active'),'frontend backup active baseline changed')
    require(record==allowed and baseline['activeFrontend']==Deployment.frontend_identity(allowed),'fresh frontend version or Build ID changed')
    original=host['preparedIngress'];fresh=host['ingress']
    require(_digest({'subject':'host','ingress':original})==details['hostBaselineSha256']
            and host['baselineSha256']==_digest({'subject':'host','ingress':fresh}),'host baseline identity changed')
    expected=deepcopy(original)
    expected['certificates']=[item for item in expected['certificates'] if item['owner']==subject.owner]
    _validate_certificate_renewal(expected['certificates'],fresh['certificates'])
    # Fresh certificates have already passed Task 2 owner, SAN, validity and
    # key-pair checks. Their renewed leaf hashes are intentionally not frozen.
    expected['certificates']=deepcopy(fresh['certificates'])
    if allowed!=old:
        from deployment_core import _upstream
        for entry in expected['nginxInventory']['files']:
            if Path(entry['logicalPath'])==subject.configuration/'web-upstream.conf':
                require(entry['owner']==subject.owner,'upstream owner changed')
                entry['sha256']=hashlib.sha256(_upstream(allowed)).hexdigest()
                for ref in entry['references']:
                    if ref['kind']=='proxy_pass':ref['value']='127.0.0.1:'+str(allowed['runtime']['deployment']['activePort'])
    require(fresh==_ingress_with_details(expected),'fresh host or Nginx configuration changed')
    require(baseline['configurationSha256']==_configuration_fingerprint(_current_tls(allowed,fresh['certificates'])),'fresh frontend configuration changed')
    require(baseline['cmsRuntime']==plain(context.subject_baseline['cmsRuntime']),'CMS runtime changed')


def load_live_baselines(subject, *, registry=None):
    from release_baseline import _read_record,_validate_record,validate_registered_ingress
    from release_contract import ReleasePaths
    from release_actions import SubprocessCommandRunner
    from adoption_probe import read_cms_scope,LocalSnapshotSource
    from subject_registry import load_registry
    from adoption_contract import validate_plan
    require(subject.subject_id=='tio2-my' and subject.kind=='site','capability-not-installed')
    paths=ReleasePaths(incoming=subject.incoming,outgoing=subject.outgoing,production=subject.production,configuration=subject.configuration)
    registry=registry or load_registry(Path('/etc/d16-release'))
    require(registry.resolve(subject.subject_id)==subject,'frontend registry changed')
    state=read_record(subject.state_root/'state.json'); details=state.get('details',{})
    migration=_read_record(subject.state_root.parent.parent/'migration/phase1/receipt.json',None)
    require(migration.get('schemaVersion')=='d16-phase1-migration-receipt-v1' and migration.get('subject')==subject.subject_id
            and migration.get('state')=='PREPARED','migration baseline receipt mismatch')
    prepared=migration['runtimeAfter']['ingress']
    require(_digest({'subject':'host','ingress':prepared})==details.get('hostBaselineSha256'),'host PREPARED baseline changed')
    prepared_certificates=[item for item in prepared['certificates'] if item['owner']==subject.owner]
    policy=[{'owner':item.owner,'certName':item.cert_name,'fullchainPath':item.fullchain_path.as_posix(),
             'privateKeyPath':item.private_key_path.as_posix(),'san':item.dns_names} for item in subject.certificates]
    require(_certificate_policy(prepared_certificates)==_certificate_policy(policy),'registered TLS certificate policy changed')
    reader=LocalSnapshotSource();reader._configure_tls_allowlist(registry)
    ingress=validate_registered_ingress(registry,reader._run(['/usr/sbin/nginx','-T']),reader,subject_id=subject.subject_id)
    _validate_certificate_renewal(prepared_certificates,ingress['certificates'])
    record=_read_record(subject.configuration/'baseline.json',None)
    live=_validate_record(_current_tls(record,ingress['certificates']),paths,None,None)
    cms=details.get('cmsEvidence')
    require(isinstance(cms,dict) and cms.get('verified') is True and cms.get('site_scope')==subject.subject_id,'migrated CMS evidence is required')
    wordpress=next(item['id'] for item in live['runtime']['containers'] if item['role']=='wordpress')
    scope=read_cms_scope(SubprocessCommandRunner(),wordpress)
    require(scope['siteScope']==subject.subject_id and scope['publishedRecords']==cms['published_records']
            and scope['contentSha256']==cms['live_content_sha256'],'live CMS content changed')
    require(record==_read_record(subject.configuration/'baseline.json',None),'live baseline changed during validation')
    plan=validate_plan(_read_record(subject.configuration/'adoption-plan.json',None))
    adoption=_read_record(subject.production/'state/adoption.json',None)
    require(adoption.get('schemaVersion')=='tio2-production-adoption-journal-v1' and adoption.get('state')=='PUBLIC_READY'
            and adoption.get('planHash')==plan['planHash'],'previous production receipt changed')
    cms_runtime={'containers':[item for item in live['runtime']['containers'] if item['role']!='web'],
                 'volumes':live['runtime']['volumes'],'contentSha256':scope['contentSha256'],
                 'configurationSha256':hashlib.sha256(canonical(record['configuration']['environment'])).hexdigest(),
                 'wordpressSha256':hashlib.sha256(canonical({name:digest for name,digest in __import__('deployment_core').tree(Path(record['runtime']['deployment']['pluginSourceRoot'])).items()})).hexdigest()}
    observed_active=Deployment.frontend_identity(record)
    from deployment_core import DockerWebAdapter
    observed_active['buildId']=DockerWebAdapter(subject).docker('exec',observed_active['containerId'],'cat','/app/.next/BUILD_ID').decode().strip()
    baseline={'subject':subject.subject_id,'previousProductionReceipt':plan['planHash'],
              'configurationSha256':live['configurationFingerprint'],'cmsContractSha256':hashlib.sha256(canonical(cms)).hexdigest(),
              'record':record,'activeFrontend':observed_active,'cmsRuntime':cms_runtime}
    return baseline,{'subject':'host','baselineSha256':_digest({'subject':'host','ingress':ingress}),
                     'ingress':ingress,'preparedIngress':migration['runtimeAfter']['ingress']}
