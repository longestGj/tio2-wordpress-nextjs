"""MY administrator installation effects using fixed registered resources.

CMS/resources installation and frontend release are distinct. Active content
enrollment is written only by finalize_content after the new frontend supports
the signed batch API. A pending config never advertises content capability.
"""
import base64
from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import time

from content_docker import ContentDockerRuntime, validate_config as runtime_config
from content_hooks import ContentHooks, validate_config as hooks_config
from content_install_database import InstallationDatabase
from content_install_resources import InstallationResources
from content_install_identity import observe_database_binding, observe_frontend_identity, assert_frontend_identity
from content_release import canonical, validate_package
from release_baseline import protected_path
from release_contract import ReleaseError
from release_state import atomic_write_json


def sha(value): return hashlib.sha256(value).hexdigest()


def render_maintenance(raw, marker, upstream):
    if any(not re.fullmatch(r'/[A-Za-z0-9_./-]+', x) or '..' in x.split('/') for x in (marker,upstream)):
        raise ReleaseError('maintenance path is not a registered literal')
    text = raw.decode('utf-8')
    if 'd16-install-maintenance' in text: raise ReleaseError('maintenance gate already installed')
    pattern = r'(?m)^(\s*)include '+re.escape(upstream)+r';[ \t]*$'
    matches = list(re.finditer(pattern,text))
    if not 1 <= len(matches) <= 2: raise ReleaseError('unsupported enrolled Nginx upstream layout')
    return re.sub(pattern, lambda m: m[1]+'# d16-install-maintenance\n'+m[1]+'if (-f '+marker+') { return 503; }\n'+m[1]+'include '+upstream+';',text).encode()


def write_file(path, data, mode=0o600):
    path = Path(path)
    if path.is_symlink(): raise ReleaseError('installation destination is a symlink')
    temporary = path.with_name('.'+path.name+'.install-new')
    with temporary.open('xb') as output:
        os.chmod(temporary,mode); output.write(data); output.flush(); os.fsync(output.fileno())
    os.replace(temporary,path)


class InstallationBackend:
    def __init__(self, config, artifact, directory, registry):
        keys={'schemaVersion','siteId','runtime','hooks','resources','nginxFile','upstreamFile',
              'verificationPackageFile','previousProductionReceipt'}
        if not isinstance(config,dict) or set(config)!=keys or config['schemaVersion']!='d16-my-installation-v1' or config['siteId']!='tio2-my':
            raise ReleaseError('invalid MY installation configuration')
        self.config=deepcopy(config); self.artifact=artifact; self.directory=Path(directory)
        self.subject=registry.resolve('tio2-my'); self.registry=registry
        self.configuration=self.subject.configuration
        runtime_config(config['runtime']); hooks_config(config['hooks'])
        if (config['runtime']['siteId']!=config['siteId'] or config['hooks']['siteId']!=config['siteId']
                or config['runtime']['wordpressContainer']!=config['resources']['wordpressContainer']
                or config['hooks']['wordpressContainer']!=config['resources']['wordpressContainer']
                or config['runtime']['importerContainer']!=config['resources']['importerContainer']
                or config['runtime']['database']!=config['resources']['database']):
            raise ReleaseError('installation runtime resource binding mismatch')
        self.nginx=Path(config['nginxFile']); self.marker=Path(config['hooks']['maintenanceFile'])
        if self.nginx not in {p.resolved_path for p in self.subject.nginx_files}:
            raise ReleaseError('maintenance target not owned by MY')
        if config['upstreamFile']!=str(self.configuration/'web-upstream.conf'):
            raise ReleaseError('installation upstream mismatch')
        self.resources=InstallationResources(config['resources'],artifact,self.directory)
        self.database=InstallationDatabase(config['runtime'],self.directory)
        self.wrapper=Path('/usr/local/libexec/d16-content-window')
        expected={action:[str(self.wrapper),action] for action in ('identity','enter','assert','leave','refresh','verify')}
        if config['runtime']['hooks']!=expected: raise ReleaseError('installation hook command mismatch')

    def _package(self):
        path=protected_path(Path(self.config['verificationPackageFile']),private=True)
        return validate_package(json.loads(path.read_bytes()),'tio2-my')

    def _files(self):
        return [self.nginx,self.wrapper,*(self.configuration/name for name in (
            'baseline.json','content-hooks.json','content-runtime.json','pending-content-runtime.json',
            'content-baseline.json','cms-platform-enrollment.json','frontend-enrollment.json'))]

    def _run(self,*args):
        result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
        if result.returncode: raise ReleaseError('installation fixed host command failed')
        return result.stdout

    def _reload(self):
        self._run('/usr/sbin/nginx','-t')
        self._run('/usr/bin/systemctl','reload','nginx')

    def _scope(self):
        from adoption_probe import read_cms_scope
        from release_actions import SubprocessCommandRunner
        wp=json.loads(self.database.docker('inspect',self.config['runtime']['wordpressContainer']))[0]
        scope=read_cms_scope(SubprocessCommandRunner(),wp['Id'])
        return {key:scope[key] for key in ('siteScope','publishedRecords','contentSha256')}

    def observe(self):
        from adoption_probe import read_cms_scope
        from release_actions import SubprocessCommandRunner
        for path in (self.configuration,self.nginx.parent,self.marker.parent,self.wrapper.parent):
            protected_path(path,directory=True)
        package=self._package()
        if package['siteId']!='tio2-my': raise ReleaseError('verification package site mismatch')
        state_path=self.subject.state_root/'state.json'
        protected_path(state_path)
        state=json.loads(state_path.read_bytes())
        if state.get('state') not in {'IDLE','COMPLETED','ROLLED_BACK'}:
            raise ReleaseError('prior frontend transaction must finish before CMS upgrade')
        if self.marker.exists() or self.marker.is_symlink(): raise ReleaseError('foreign maintenance owner')
        active=self.configuration/'content-runtime.json'
        if active.exists(): raise ReleaseError('content runtime already installed; use explicit upgrade plan')
        render_maintenance(self.nginx.read_bytes(),str(self.marker),self.config['upstreamFile'])
        files={}
        for path in self._files():
            if path.exists(): protected_path(path); files[str(path)]=sha(path.read_bytes())
            elif path.is_symlink(): raise ReleaseError('installation path is a broken symlink')
            else: files[str(path)]=None
        scope=self._scope()
        return {'siteId':'tio2-my','configSha256':sha(canonical(self.config)),
                'resources':self.resources.snapshot(),'database':self.database.observe(),'files':files,
                'databaseBinding':observe_database_binding(self.config['resources'],self.database),
                'frontend':observe_frontend_identity(self.config['hooks']),
                'frontendStateSha256':sha(state_path.read_bytes()),'scope':scope,
                'verificationPackageSha256':sha(canonical(package))}

    def _snapshot_files(self, expected):
        originals={}
        for path in self._files():
            if path.is_symlink(): raise ReleaseError('installation configuration became a symlink')
            data=path.read_bytes() if path.exists() else None
            if str(path) not in expected or (sha(data) if data is not None else None)!=expected[str(path)]:
                raise ReleaseError('installation configuration changed after plan')
            originals[str(path)]=None if data is None else {'data':base64.b64encode(data).decode(),'mode':path.stat().st_mode&0o777}
        return originals

    def enter(self,owner,baseline):
        self.directory.mkdir(parents=True,mode=0o700,exist_ok=True)
        originals=self._snapshot_files(baseline['files'])
        atomic_write_json(self.directory/'original-files.json',originals)
        with self.marker.open('xb') as output:
            os.chmod(self.marker,0o600); output.write(canonical({'owner':owner,'siteId':'tio2-my'})); output.flush(); os.fsync(output.fileno())
        write_file(self.nginx,render_maintenance(self.nginx.read_bytes(),str(self.marker),self.config['upstreamFile']),0o644)
        self._reload()
        hooks=ContentHooks(self.config['hooks'])
        for attempt in range(30):
            if hooks.request(self.config['hooks']['publicOrigin'],'/')[0]==503: break
            time.sleep(.2)
        else: raise ReleaseError('public maintenance did not activate')
        self.database.enter(owner,baseline['database'])
        if observe_database_binding(self.config['resources'],self.database)!=baseline['databaseBinding']:
            raise ReleaseError('installation database binding changed')

    def backup(self,owner,baseline):
        database=self.database.backup(owner)
        restoration=self.database.verify_backup_restore(owner,database)
        resources=self.resources.backup(self.directory/'resources-backup')
        return {'database':database,'databaseRestore':restoration,'resources':resources,
                'originalFilesSha256':sha((self.directory/'original-files.json').read_bytes())}

    def install(self,owner,baseline,backup):
        self.database.assert_window(owner)
        assert_frontend_identity(self.config['hooks'],baseline['frontend'])
        if self.resources.snapshot()!=baseline['resources']:
            raise ReleaseError('WordPress source changed after backup')
        self.resources.install(owner)
        target=self.config['hooks']['cmsContractFile']
        if target!='/opt/d16-content/plugin-manifest.json': raise ReleaseError('unexpected CMS manifest destination')
        actual_config=deepcopy(self.config['hooks'])
        actual_config['expectedIdentity']=ContentHooks(actual_config).observe_identity()
        atomic_write_json(self.directory/'installed-hooks.json',actual_config)
        # Identity changes during administrator installation are bound here, not
        # accepted by normal content hooks during a content transaction.
        atomic_write_json(self.marker,{'owner':owner,'siteId':'tio2-my','identity':actual_config['expectedIdentity']})

    def verify(self,owner,baseline):
        from adoption_probe import read_cms_scope
        from release_actions import SubprocessCommandRunner
        self.database.assert_window(owner)
        assert_frontend_identity(self.config['hooks'],baseline['frontend'])
        resources=self.resources.verify()
        scope=self._scope()
        if scope!=baseline['scope']: raise ReleaseError('CMS upgrade altered existing content')
        if sha(self.database._dump())!=json.loads((self.directory/'database-backup.json').read_bytes())['sha256']:
            raise ReleaseError('CMS upgrade altered shared database')
        hooks=ContentHooks(json.loads((self.directory/'installed-hooks.json').read_bytes()))
        hooks.execute('assert',{'owner':owner,'siteId':'tio2-my'})
        pages=hooks.execute('verify',{'owner':owner,'siteId':'tio2-my','package':self._package()})
        return {'verified':True,'resources':resources,'pages':pages,'scope':scope,'contentCapabilityEnabled':False}

    def enroll(self,owner,evidence):
        from frontend_candidate import assemble_installation_enrollment
        from bootstrap_install import _mkdir
        import pwd
        self.database.assert_window(owner)
        old=json.loads(base64.b64decode(json.loads((self.directory/'original-files.json').read_bytes())[str(self.configuration/'baseline.json')]['data']))
        records=assemble_installation_enrollment(self.subject,old,evidence['pages'],self.config['previousProductionReceipt'])
        for name,key in [('baseline.json','baseline'),('cms-platform-enrollment.json','cmsPlatform'),('frontend-enrollment.json','frontend')]:
            atomic_write_json(self.configuration/name,records[key])
        atomic_write_json(self.configuration/'content-hooks.json',json.loads((self.directory/'installed-hooks.json').read_bytes()))
        atomic_write_json(self.configuration/'pending-content-runtime.json',self.config['runtime'])
        program=Path(__file__).resolve().parent/'content_hooks.py'
        if not re.fullmatch(r'/[A-Za-z0-9_./-]+',str(program)):
            raise ReleaseError('untrusted installed hook program path')
        script=('#!/bin/sh\nexec /usr/bin/env -i PATH=/usr/sbin:/usr/bin:/sbin:/bin /usr/bin/python3 -B '+shlex.quote(str(program))+' --config '+shlex.quote(str(self.configuration/'content-hooks.json'))+' "$@"\n').encode()
        write_file(self.wrapper,script,0o755)
        deploy=pwd.getpwnam('deploy')
        for path in (self.subject.incoming/'frontend-payload',self.subject.incoming/'frontend-payload/frontend'):
            _mkdir(path,deploy.pw_uid,deploy.pw_gid,0o700,simulation=False)

    def restore(self,owner,baseline,backup):
        original_path=self.directory/'original-files.json'
        if not original_path.exists():
            if backup or self.marker.exists() or self.database.state_path.exists():
                raise ReleaseError('installation original files missing after effects')
            return  # enter rejected drift before recording or changing anything
        if backup:
            if sha((self.directory/'original-files.json').read_bytes())!=backup['originalFilesSha256']:
                raise ReleaseError('installation configuration backup changed')
            self.database.restore(owner,backup['database'])
            self.resources.restore(owner,backup['resources'])
        originals=json.loads((self.directory/'original-files.json').read_bytes())
        for name,value in originals.items():
            path=Path(name)
            if path==self.nginx: continue  # keep maintenance until last step
            if value is None: path.unlink(missing_ok=True)
            else: write_file(path,base64.b64decode(value['data']),value['mode'])
        atomic_write_json(self.directory/'restoring.json',{'owner':owner})

    def leave(self,owner,baseline):
        if self.marker.is_symlink(): raise ReleaseError('maintenance ownership changed')
        if self.marker.exists():
            marker=json.loads(self.marker.read_bytes())
            if marker.get('owner')!=owner or marker.get('siteId')!='tio2-my':
                raise ReleaseError('maintenance ownership changed')
        if not (self.directory/'original-files.json').exists():
            if self.marker.exists() or self.database.state_path.exists():
                raise ReleaseError('installation opening lacks original evidence')
            return
        if self.database.state_path.exists(): self.database.leave(owner)
        if (self.directory/'restoring.json').exists():
            original=json.loads((self.directory/'original-files.json').read_bytes())[str(self.nginx)]
            write_file(self.nginx,base64.b64decode(original['data']),original['mode']); self._reload()
        self.marker.unlink(missing_ok=True)
        hooks=ContentHooks(self.config['hooks'])
        for attempt in range(30):
            if hooks.request(self.config['hooks']['publicOrigin'],'/')[0]==200: return
            time.sleep(.2)
        raise ReleaseError('installation public reopening could not be verified')
