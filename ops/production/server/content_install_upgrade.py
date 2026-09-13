"""Previous-installation verification and journalled importer retention.

Only the administrator backend supplies a registered completed installation path.
No candidate payload can select a prior container or recovery directory.
"""
import hashlib
import json
import os
from pathlib import Path
import re

from release_contract import ReleaseError, assert_root_owned
from release_state import atomic_write_json


def _canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()


def _read(path):
    path=Path(path)
    for item in (path,*path.parents):
        if item.is_symlink(): raise ReleaseError('previous installation contains a symlink')
        if os.name=='posix':
            info=item.stat()
            if not (item.is_dir() and info.st_uid==0 and info.st_mode & 0o1000):
                assert_root_owned(info)
    if not path.is_file() or path.stat().st_size>16*1024*1024:
        raise ReleaseError('previous installation evidence unavailable')
    return json.loads(path.read_bytes())


class ImporterUpgrade:
    def __init__(self,resources,previous):
        self.resources=resources;self.previous=Path(previous)
        if self.previous==resources.directory or not re.fullmatch('[a-f0-9]{64}',self.previous.name):
            raise ReleaseError('upgrade requires a different completed installation')
        self.journal=resources.directory/'previous-importer.json'

    def receipt(self):
        state=_read(self.previous/'state.json');plan=state.get('plan',{})
        if (state.get('schemaVersion')!='d16-content-install-state-v1' or state.get('phase')!='completed'
                or set(plan)!={'schemaVersion','siteId','artifactSha256','baseline','planSha256'}
                or plan['schemaVersion']!='d16-content-install-plan-v1' or plan['siteId']!='tio2-my'
                or plan['artifactSha256']!=self.previous.name
                or plan['planSha256']!=hashlib.sha256(_canonical({k:v for k,v in plan.items() if k!='planSha256'})).hexdigest()
                or state.get('evidence',{}).get('verified') is not True):
            raise ReleaseError('upgrade source is not a verified completed installation')
        return state

    def previous_resources(self):
        from content_install_resources import InstallationResources, _tree, hashes, PREFIX
        state=self.receipt();files=_tree(self.resources.plugin)
        if hashes(files)!=state['evidence']['resources']['pluginFiles']:
            raise ReleaseError('current plugin differs from completed installation')
        previous=InstallationResources(self.resources.config,{'contents':{PREFIX+k:v for k,v in files.items()}},
                                       self.previous,runner=self.resources.docker)
        return previous

    def observe(self):
        state=self.receipt();previous=self.previous_resources();verified=previous.verify()
        if verified!=state['evidence']['resources']:
            raise ReleaseError('previous importer differs from completed installation')
        container=previous._inspect(previous.importer)
        self.check_security(container)
        material={k:container[k] for k in ('Id','Image','Config','HostConfig','Mounts')}
        return {'installationSha256':self.previous.name,'receiptSha256':hashlib.sha256(_canonical(state)).hexdigest(),
                'containerId':container['Id'],'running':container['State']['Running'],
                'runtimeSha256':hashlib.sha256(_canonical(material)).hexdigest()}

    def check_security(self,container):
        r=self.resources;wp=r._inspect(r.wp)
        host=container['HostConfig'];config=container['Config']
        if (host.get('NetworkMode')!='container:'+wp['Id'] or host.get('CapDrop')!=['ALL']
                or host.get('SecurityOpt')!=['no-new-privileges']
                or config.get('Entrypoint')!=['sleep'] or config.get('Cmd')!=['infinity']):
            raise ReleaseError('previous importer execution security differs')

    def retain(self,owner,expected):
        r=self.resources
        if self.observe()!=expected: raise ReleaseError('previous importer changed after plan')
        retained='d16-held-'+owner
        if r.docker('ps','-a','--filter','name=^/'+retained+'$','--format','{{.Names}}').strip():
            raise ReleaseError('retained importer name is occupied')
        value={'owner':owner,'containerId':expected['containerId'],'originalName':r.importer,
               'retainedName':retained,'running':expected['running'],'observation':expected}
        if self.journal.exists(): raise ReleaseError('importer retention already started')
        atomic_write_json(self.journal,value)  # before stop/rename, including lost command responses
        r.docker('stop','--time','30',value['containerId'])
        r.docker('rename',value['containerId'],retained)

    def recover(self,owner,backup):
        """Restore only this transaction's plugin/PHP and exact prior container."""
        from content_install_resources import _tree,hashes
        r=self.resources
        if not self.journal.exists():
            # No importer replacement was attempted. Initial resource recovery
            # must not remove the still-current old owner.
            return
        value=_read(self.journal)
        if value.get('owner')!=owner or value.get('observation')!=backup['snapshot']['previousImporter']:
            raise ReleaseError('retained importer recovery ownership mismatch')
        old=r._inspect(value['containerId'])
        self.check_security(old)
        material={k:old[k] for k in ('Id','Image','Config','HostConfig','Mounts')}
        if hashlib.sha256(_canonical(material)).hexdigest()!=value['observation']['runtimeSha256']:
            raise ReleaseError('retained importer runtime changed')
        if old.get('Name') not in {'/'+value['originalName'],'/'+value['retainedName']}:
            raise ReleaseError('retained importer name changed')
        files=r._backup_files(backup)
        wp=r._inspect(r.wp)
        if (wp['Id']!=backup['snapshot']['wordpressId'] or wp['Image']!=backup['snapshot']['wordpressImage']
                or wp['Mounts']!=backup['snapshot']['mounts']):
            raise ReleaseError('refusing to restore a different WordPress instance')
        if r._importer_exists():
            current=r._inspect(r.importer)
            if current['Id']!=value['containerId']:
                # Verify the planned sealed mounts and all immutable execution
                # settings before removing even an owner-labelled replacement.
                r.verify_importer(current,require_running=False)
                created=r.directory/'resources-created.json'
                if created.exists() and _read(created)!={'owner':owner,'containerId':current['Id']}:
                    raise ReleaseError('replacement importer ID changed')
                r.docker('rm','--force',current['Id'])
        r.wp=wp['Id']
        r._replace(files['plugin'],files['php'],backup['snapshot']['phpPresent'])
        if old['Name']=='/'+value['retainedName']:
            r.docker('rename',old['Id'],value['originalName'])
        if value['running']:r.docker('start',old['Id'])
        else:r.docker('stop','--time','30',old['Id'])
        snapshot,_,_,_=r._capture()
        if (snapshot['pluginFiles']!=backup['snapshot']['pluginFiles']
                or snapshot['phpPresent']!=backup['snapshot']['phpPresent']
                or snapshot['phpFiles']!=backup['snapshot']['phpFiles']
                or self.observe()!=value['observation']):
            raise ReleaseError('previous installation restoration verification failed')
