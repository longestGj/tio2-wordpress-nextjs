"""Frontend-only adapter. All resources come from the verified subject context."""
from __future__ import annotations

import hashlib
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
    return load_live_baselines(context.subject)[0]['cmsRuntime']


def load_live_baselines(subject):
    from release_baseline import validate_baseline
    from release_contract import ReleasePaths
    from release_actions import SubprocessCommandRunner
    from adoption_probe import read_cms_scope
    require(subject.subject_id=='tio2-my' and subject.kind=='site','capability-not-installed')
    paths=ReleasePaths(incoming=subject.incoming,outgoing=subject.outgoing,production=subject.production,configuration=subject.configuration)
    live=validate_baseline(paths)
    state=read_record(subject.state_root/'state.json'); details=state.get('details',{})
    cms=details.get('cmsEvidence')
    require(isinstance(cms,dict) and cms.get('verified') is True and cms.get('site_scope')==subject.subject_id,'migrated CMS evidence is required')
    wordpress=next(item['id'] for item in live['runtime']['containers'] if item['role']=='wordpress')
    scope=read_cms_scope(SubprocessCommandRunner(),wordpress)
    require(scope['publishedRecords']==cms['published_records'] and scope['contentSha256']==cms['live_content_sha256'],'live CMS content changed')
    record=read_record(subject.configuration/'baseline.json')
    cms_runtime={'containers':[item for item in live['runtime']['containers'] if item['role']!='web'],
                 'volumes':live['runtime']['volumes'],'contentSha256':scope['contentSha256'],
                 'configurationSha256':hashlib.sha256(canonical(record['configuration']['environment'])).hexdigest(),
                 'wordpressSha256':hashlib.sha256(canonical({name:digest for name,digest in __import__('deployment_core').tree(Path(record['runtime']['deployment']['pluginSourceRoot'])).items()})).hexdigest()}
    baseline={'subject':subject.subject_id,'previousProductionReceipt':details['previousProductionReceipt'],
              'configurationSha256':details['configurationFingerprint'],'cmsContractSha256':hashlib.sha256(canonical(cms)).hexdigest(),
              'record':record,'activeFrontend':Deployment.frontend_identity(record),'cmsRuntime':cms_runtime}
    return baseline,{'subject':'host','baselineSha256':details['hostBaselineSha256']}
