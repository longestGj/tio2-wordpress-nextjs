"""Explicit capability enrollment after an actual signed content verification.

Caller holds the host release lock. This transaction never imports content or
restores a database. Recovery only closes its own no-content-write window.
"""
from copy import deepcopy
import hashlib
import json
from pathlib import Path

from content_release import canonical, validate_package
from release_contract import ReleaseError
from release_state import atomic_write_json


def digest(value): return hashlib.sha256(canonical(value)).hexdigest()


class Finalization:
    def __init__(self,path,backend): self.path=Path(path);self.backend=backend

    def _read(self):
        if self.path.is_symlink(): raise ReleaseError('unsafe finalization journal')
        if not self.path.exists(): return None
        state=json.loads(self.path.read_bytes())
        if state.get('schemaVersion')!='d16-content-finalization-v1' or state.get('owner')!=digest(state.get('binding')):
            raise ReleaseError('invalid finalization journal binding')
        return state

    def _save(self,state,phase):
        state['phase']=phase;atomic_write_json(self.path,state)

    def finalize(self):
        binding=self.backend.observe();previous=self._read()
        if previous:
            if previous['phase'] not in {'completed','recovered'}: raise ReleaseError('finalization requires explicit recovery')
            if previous['binding']==binding and previous['phase']=='completed': return previous
            archive=self.path.with_name(self.path.name+'.'+previous['owner'])
            if archive.exists() and json.loads(archive.read_bytes())!=previous: raise ReleaseError('finalization history collision')
            if not archive.exists(): atomic_write_json(archive,previous)
        state={'schemaVersion':'d16-content-finalization-v1','owner':digest(binding),'binding':binding}
        self._save(state,'entering')
        self.backend.enter(state['owner'],binding)
        self._save(state,'verifying')
        state['evidence']=self.backend.verify(state['owner'],binding)
        if state['evidence'].get('verified') is not True: raise ReleaseError('finalization verification incomplete')
        self._save(state,'opening')
        self.backend.leave(state['owner'],binding)
        self._save(state,'publishing')
        self.backend.publish(state['owner'],binding,state['evidence'])
        self._save(state,'completed')
        return state

    def recover(self):
        state=self._read()
        if not state: raise ReleaseError('no finalization to recover')
        if state['phase'] in {'completed','recovered'}: return state
        if self.backend.observe()!=state['binding']: raise ReleaseError('finalization recovery identity changed')
        self._save(state,'recovering')
        self.backend.recover(state['owner'],state['binding'])
        self._save(state,'recovered')
        return state


class InstalledFinalization:
    def __init__(self,subject,package_path):
        from subject_registry import load_registry
        from release_baseline import protected_path
        self.subject=subject;self.registry=load_registry(Path('/etc/d16-release'))
        if subject.subject_id!='tio2-my' or self.registry.resolve('tio2-my')!=subject: raise ReleaseError('finalization subject mismatch')
        self.package=validate_package(json.loads(protected_path(Path(package_path),private=True).read_bytes()),subject.subject_id)
        self.configuration=subject.configuration

    def _record(self,name):
        from release_baseline import protected_path
        return json.loads(protected_path(self.configuration/name,private=True).read_bytes())

    def observe(self):
        from release_baseline import protected_path, _validate_record
        from deployment_core import Deployment, DockerWebAdapter
        from frontend_candidate import validate_previous_frontend
        from content_hooks import ContentHooks
        from content_docker import validate_config
        from site_content_adapter import terminal_record, SiteContentAdapter
        state=json.loads(protected_path(self.subject.state_root/'state.json',private=True).read_bytes())
        if state.get('state')!='COMPLETED': raise ReleaseError('finalization requires a completed release')
        details=state.get('details',{});kind=details.get('releaseType')
        if kind=='frontend-only':
            if not details.get('frontendEnrollmentSha256'): raise ReleaseError('legacy frontend cannot enable content runtime')
            validate_previous_frontend(self.subject,state,self._record('baseline.json'))
            if self._record('frontend-enrollment.json')['cmsEvidence']['pageContentSha256']!=self.package['contentSha256']:
                raise ReleaseError('finalization package differs from installed content approval')
        elif kind=='content-only':
            terminal=terminal_record(self.registry.cms.state_root/'content-window.json',self.subject.subject_id,details.get('releaseId'))
            if (not terminal or terminal['phase']!='completed' or validate_package(terminal['package'],self.subject.subject_id)!=self.package
                    or terminal.get('verification',{}).get('verified') is not True
                    or details.get('completionEvidence')!=SiteContentAdapter._evidence(terminal)):
                raise ReleaseError('content re-enrollment lacks matching completed verification')
        else: raise ReleaseError('unrecognized completed release for finalization')
        shared=self.registry.cms.state_root/'content-window.json'
        if shared.exists():
            window=json.loads(protected_path(shared,private=True).read_bytes())
            if window.get('phase') not in {'completed','rolled-back'}: raise ReleaseError('another CMS content window remains open')
        record=self._record('baseline.json')
        _validate_record(record,self.subject,None,None)
        active=Deployment.frontend_identity(record)
        health=DockerWebAdapter(self.subject).health(record)
        if any(health.get(key)!=active[key] for key in ('buildId','imageId','containerId')): raise ReleaseError('current frontend health identity differs')
        hooks=self._record('content-hooks.json')
        observed=json.loads(ContentHooks(hooks).run(['docker','inspect',active['containerId']]))[0]
        hooks['frontendContainer']=observed['Name'].removeprefix('/')
        hooks['internalOrigin']='http://127.0.0.1:'+str(record['runtime']['deployment']['activePort'])
        hooks['expectedIdentity']=ContentHooks(hooks).observe_identity()
        identity=hooks['expectedIdentity']
        if identity['buildId']!=active['buildId'] or identity['frontendImageId']!=active['imageId']:
            raise ReleaseError('hook frontend differs from active verified baseline')
        if identity['cmsContractSha256']!=self._record('cms-platform-enrollment.json')['cmsContractSha256']:
            raise ReleaseError('CMS plugin contract changed')
        runtime=validate_config(self._record('pending-content-runtime.json'))
        if runtime['siteId']!=self.subject.subject_id or runtime['wordpressContainer']!=hooks['wordpressContainer']:
            raise ReleaseError('pending content runtime scope mismatch')
        return {'subject':self.subject.subject_id,'packageSha256':digest(self.package),'contentSha256':self.package['contentSha256'],
                'controllerStateSha256':digest(state),'recordSha256':digest(record),'hooks':hooks,'runtime':runtime}

    def _runtime(self,owner,binding):
        from content_docker import ContentDockerRuntime
        directory=self.subject.state_root/'content-finalization-windows'/owner
        directory.mkdir(parents=True,mode=0o700,exist_ok=True)
        return ContentDockerRuntime(binding['runtime'],directory)

    def enter(self,owner,binding):
        from release_baseline import protected_path
        active=self.configuration/'content-runtime.json'
        if active.exists():
            protected_path(active,private=True)
            if json.loads(active.read_bytes())!=binding['runtime']: raise ReleaseError('existing content capability differs')
            active.unlink()  # capability stays disabled until successful verification
        atomic_write_json(self.configuration/'content-hooks.json',binding['hooks'])
        runtime=self._runtime(owner,binding)
        preflight=runtime.preflight(self.package)
        if preflight['contentSha256']!=binding['contentSha256']: raise ReleaseError('actual CMS content differs from approved package')
        runtime.enter_window(owner)

    def verify(self,owner,binding):
        from frontend_candidate import assemble_installation_enrollment
        runtime=self._runtime(owner,binding);runtime.assert_window(owner)
        if runtime.preflight(self.package)['contentSha256']!=binding['contentSha256']: raise ReleaseError('CMS content changed during finalization')
        runtime.refresh(self.package)
        evidence=runtime.verify_public(self.package,False)
        pages={'ok':True,'content':True,'status':True,'seo':True,'sitemap':True,'contentSha256':binding['contentSha256']}
        records=assemble_installation_enrollment(self.subject,self._record('baseline.json'),pages,binding['controllerStateSha256'])
        return {'verified':evidence['verified'],'pages':pages,'frontendEnrollment':records['frontend']}

    def leave(self,owner,binding): self._runtime(owner,binding).leave_window(owner)

    def recover(self,owner,binding):
        """Finish reopening only; no import, backup replay, or database restore."""
        from content_hooks import ContentHooks
        runtime=self._runtime(owner,binding);hooks=ContentHooks(binding['hooks'])
        if not runtime.state_path.exists():
            if hooks.marker.exists(): raise ReleaseError('unexpected maintenance ownership before finalization entry')
            return
        state=runtime._state()
        if state.get('owner')!=owner or state.get('siteId')!=self.subject.subject_id: raise ReleaseError('finalization runtime owner changed')
        identity=hooks.identity()
        if state.get('identity') is not None and state['identity']!=identity: raise ReleaseError('finalization runtime identity changed')
        if hooks.marker.exists():
            marker_state=hooks._state(owner)
            if marker_state.get('identity')!=identity: raise ReleaseError('finalization maintenance identity changed')
        container=json.loads(runtime.docker('inspect',binding['runtime']['dbContainer']))[0]
        if container['Id']!=state.get('dbContainerId'): raise ReleaseError('finalization database container changed')
        # Missing fence is allowed only as the continuation of this no-write
        # finalization. Validate marker when present, and never restore content.
        exists=runtime.docker('exec',binding['runtime']['dbContainer'],'sh','-c','if test -f '+runtime.FENCE_CONFIG+'; then echo present; fi').strip()
        if exists:
            marker=runtime.docker('exec',binding['runtime']['dbContainer'],'cat',runtime.FENCE_CONFIG)
            if hashlib.sha256(marker).hexdigest()!=state.get('fenceConfigSha256'): raise ReleaseError('finalization database fence owner changed')
            runtime.docker('exec',binding['runtime']['dbContainer'],'rm',runtime.FENCE_CONFIG)
        runtime.sql('SET GLOBAL read_only=OFF;')
        if state['events']=='ON': runtime.sql('SET GLOBAL event_scheduler=ON;')
        if hooks.marker.exists(): hooks.marker.unlink()
        if hooks.request(binding['hooks']['publicOrigin'],'/')[0]!=200: raise ReleaseError('finalization reopening not verified')
        state['closed']=True;atomic_write_json(runtime.state_path,state)
        # An interrupted publish must not leave the capability advertised.
        active=self.configuration/'content-runtime.json'
        if active.exists():
            if json.loads(active.read_bytes())!=binding['runtime']: raise ReleaseError('content capability changed during recovery')
            active.unlink()

    def publish(self,owner,binding,evidence):
        if self.observe()!=binding: raise ReleaseError('finalization enrollment drift after reopening')
        archive=self.subject.state_root/'content-finalization-windows'/owner/'previous-frontend-enrollment.json'
        previous=self._record('frontend-enrollment.json')
        if not archive.exists(): atomic_write_json(archive,previous)
        atomic_write_json(self.configuration/'frontend-enrollment.json',evidence['frontendEnrollment'])
        atomic_write_json(self.configuration/'content-baseline.json',{'schemaVersion':'d16-content-baseline-v1',
            'subject':self.subject.subject_id,'previousProductionReceipt':binding['controllerStateSha256']})
        atomic_write_json(self.configuration/'content-runtime.json',binding['runtime'])


def finalize_content(subject,package_path):
    return Finalization(subject.state_root/'content-finalization.json',InstalledFinalization(subject,package_path)).finalize()


def recover_finalization(subject,package_path):
    return Finalization(subject.state_root/'content-finalization.json',InstalledFinalization(subject,package_path)).recover()
