"""Subject-owned frontend snapshots and genuine isolated restore verification.

No command in this module stops CMS, reads a volume, or exports a database.
Process seams are Python-only; the fixed installed entrypoint supplies defaults.
"""
from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import tarfile
import tempfile
import time
import threading
from uuid import UUID, uuid4
from typing import TypedDict

from backup_core import Tools, PublishBounds, publish_ciphertext
from cms_evidence import canonical, strict_json
from release_contract import ReleaseError, _open_regular_read, sha256_file
from release_state import IDENTITY_FIELDS, atomic_write_json

CMS_EXCLUDED = {'database': True, 'wordpress': True, 'cms': True}
BINDING_FIELDS = (*IDENTITY_FIELDS, 'runRoot', 'transactionSha256', 'cmsEvidenceSha256', 'requestId')
FRONTEND_ROOTS = {'app','components','lib','sites','public','styles','messages','scripts','types'}
FRONTEND_FILES = {'package.json','package-lock.json','next.config.ts','next.config.js','next.config.mjs','tsconfig.json','next-env.d.ts','postcss.config.mjs','tailwind.config.ts','server.js'}
MAX_ARCHIVE = 16 * 1024**3
MAX_IMAGE = 12 * 1024**3
MAX_FILE = 256 * 1024**2
MAX_MEMBERS = 10000
SPACE_RESERVE = 4 * 1024**3


def _space(path, additional=0):
    require(shutil.disk_usage(path).free >= SPACE_RESERVE+additional,'frontend backup free-space reserve would be consumed')


class _BoundedSink:
    """No fileno: a subprocess must never bypass the byte/space checks."""
    def __init__(self,stream,path,limit): self.stream=stream;self.path=path;self.limit=limit;self.count=0
    def tell(self):return self.count
    def write(self,data):
        require(self.count+len(data)<=self.limit,'frontend write exceeds byte limit')
        _space(self.path,len(data))
        written=self.stream.write(data);self.count+=written
        return written
    def flush(self):self.stream.flush()


def _capture(tools,tool,args,path,limit,*,timeout=1800):
    """Drain real processes through a capped pipe; abort before writing excess."""
    with path.open('xb') as output:
        os.chmod(path,0o600);sink=_BoundedSink(output,path.parent,limit)
        if not isinstance(tools,Tools):
            # Python-only process substitutes use exactly the same capped sink.
            tools.run(tool,args,stdout=sink,timeout=timeout)
        else:
            process=None;timer=None
            try:
                process=subprocess.Popen((*tools.commands[tool],*args),stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,stdin=subprocess.DEVNULL,shell=False)
                timer=threading.Timer(timeout,process.kill);timer.start()
                while block:=process.stdout.read(1024**2):sink.write(block)
                require(process.wait()==0,tool+' capture failed')
            except OSError as error:raise ReleaseError(tool+' capture unavailable') from error
            finally:
                if timer:timer.cancel()
                if process:
                    if process.poll() is None:process.kill()
                    process.wait()
                    process.stdout.close()
        output.flush();os.fsync(output.fileno())


def _file_size(path,limit=MAX_FILE):
    with _open_regular_read(path) as source:size=os.fstat(source.fileno()).st_size
    require(size<=limit,'frontend file exceeds byte limit')
    return size


def _file_hash(path,limit):
    digest=hashlib.sha256();total=0
    with _open_regular_read(path) as source:
        while block:=source.read(1024**2):
            total+=len(block);require(total<=limit,'frontend file exceeds byte limit');digest.update(block)
    return digest.hexdigest()


def _cipher_limit(size):return size+65536+(size//65536+1)*32


class FrontendBackupReceipt(TypedDict):
    schemaVersion: str
    backupId: str
    binding: dict[str, str]
    active: dict[str, str]
    manifestSha256: str
    ciphertextSha256: str
    cmsExcluded: dict[str, bool]


class FrontendRestoreEvidence(TypedDict):
    schemaVersion: str
    verified: bool
    fullArchiveRead: bool
    backupId: str
    binding: dict[str, str]
    ciphertextSha256: str
    manifestSha256: str
    buildId: str
    imageId: str
    slot: str
    network: str
    isolated: bool
    health: dict[str, object]
    cmsExcluded: dict[str, bool]
    cleanupVerified: bool


def require(condition, message):
    if not condition: raise ReleaseError(message)


def read_record(path):
    with _open_regular_read(path) as stream:
        data = stream.read(8 * 1024**2 + 1)
    require(len(data) <= 8 * 1024**2, 'frontend record exceeds limit')
    return strict_json(data)


def plain(value):
    if hasattr(value, 'items'): return {str(key):plain(item) for key,item in value.items()}
    if isinstance(value,(tuple,list)): return [plain(item) for item in value]
    if isinstance(value,Path): return str(value)
    return value


def binding(context):
    details = {**context.state.get('details',{}),**context.subject_baseline.get('binding',{})}
    result = {key:details.get(key) for key in BINDING_FIELDS}
    require(result['subject'] == context.subject.subject_id and result['releaseType'] == 'frontend-only', 'frontend binding subject mismatch')
    require(all(isinstance(value,str) and value for value in result.values()), 'frontend binding is incomplete')
    return result


def read_request(context):
    details=context.state['details']; request=read_record(context.subject.incoming/'backup-request.json')
    expected=binding(context)
    try: require(str(UUID(request['requestId'])) == request['requestId'], 'frontend request ID mismatch')
    except (KeyError,ValueError,TypeError) as error: raise ReleaseError('frontend request ID mismatch') from error
    if request.get('schemaVersion') == 'tio2-backup-request-v1':
        require(set(request) == {'schemaVersion','requestId','preparedProofSha256','baselineSha256'}
                and request['preparedProofSha256'] == details.get('candidate',{}).get('proofSha256')
                and request['baselineSha256'] == details.get('active',{}).get('enrollmentSha256')
                and request['requestId'] == expected['requestId'], 'compatibility backup request mismatch')
    else:
        require(request == {'schemaVersion':'d16-frontend-backup-request-v1',**expected}, 'frontend backup request mismatch')
    return request


def _source_files(root):
    require(root.is_dir() and not root.is_symlink(), 'frontend source root is unsafe')
    result={}
    # Do not traverse excluded CMS/database trees to discover frontend members.
    paths=[]
    for name in sorted(FRONTEND_ROOTS|FRONTEND_FILES):
        entry=root/name
        if not os.path.lexists(entry):continue
        paths.append(entry)
        if entry.is_dir() and not entry.is_symlink():
            for parent,directories,files in os.walk(entry,followlinks=False):
                paths.extend(Path(parent)/name for name in directories+files)
                require(len(paths)<=MAX_MEMBERS,'frontend member count exceeds limit')
    for path in paths:
        relative=path.relative_to(root).as_posix()
        allowed=relative.split('/')[0] in FRONTEND_ROOTS or relative in FRONTEND_FILES
        if not allowed: continue
        require(not path.is_symlink(), 'frontend source link is forbidden')
        if path.is_file():
            require(path.stat().st_nlink == 1, 'frontend source hardlink is forbidden')
            _file_size(path,MAX_FILE)
            result['frontend/'+relative]=path
        else: require(path.is_dir(), 'frontend source type is unsafe')
    require(bool(result), 'frontend source is empty')
    require(len(result)<=MAX_MEMBERS,'frontend member count exceeds limit')
    return result


def _allowed(name):
    if not isinstance(name,str) or '\\' in name or name.startswith('/') or ':' in name: return False
    path=PurePosixPath(name)
    if path.as_posix()!=name or '..' in path.parts: return False
    if name.startswith('frontend/'):
        relative=name.removeprefix('frontend/')
        return relative.split('/')[0] in FRONTEND_ROOTS or relative in FRONTEND_FILES
    return (name in {'manifest.json','runtime/image.tar','records/subject.json','records/baseline.json','records/state.json','records/references.json'}
            or re.fullmatch(r'nginx/[0-9]+\.conf',name) is not None
            or re.fullmatch(r'tls/[a-z0-9][a-z0-9.-]*-(?:fullchain|privkey)\.pem',name) is not None)


def inspect_archive(path, destination=None):
    """Read every tar payload and trailing block before any Docker operation."""
    require(path.stat().st_size <= MAX_ARCHIVE, 'frontend archive exceeds limit')
    actual={}; manifest=None; total=0
    try:
        with tarfile.open(path,'r:') as archive:
            for member in archive:
                require(len(actual)<MAX_MEMBERS,'frontend member count exceeds limit')
                require(member.isfile() and _allowed(member.name) and member.name not in actual, 'unsafe frontend archive member')
                require(0<=member.size<=(MAX_IMAGE if member.name=='runtime/image.tar' else MAX_FILE),'frontend member exceeds byte limit')
                total+=member.size
                require(total <= MAX_ARCHIVE, 'frontend archive exceeds limit')
                digest=hashlib.sha256(); data=bytearray() if member.name=='manifest.json' else None
                output=None
                if destination is not None:
                    target=destination/member.name; target.parent.mkdir(parents=True,exist_ok=True)
                    output=target.open('xb'); os.chmod(target,0o600)
                    sink=_BoundedSink(output,destination,member.size)
                try:
                    with archive.extractfile(member) as source:
                        while block:=source.read(1024**2):
                            digest.update(block)
                            if output: sink.write(block)
                            if data is not None:
                                data.extend(block); require(len(data)<=8*1024**2,'frontend manifest exceeds limit')
                    actual[member.name]=digest.hexdigest()
                    if data is not None: manifest=strict_json(bytes(data))
                finally:
                    if output: output.close()
        # Tar permits only zero padding beyond its terminating blocks.
        with path.open('rb') as stream:
            stream.seek(archive.offset)
            while block:=stream.read(1024**2): require(not any(block),'frontend archive has trailing payload')
    except (OSError,EOFError,tarfile.TarError) as error: raise ReleaseError('frontend archive is invalid') from error
    require(isinstance(manifest,dict) and set(manifest)=={'schemaVersion','backupId','binding','active','files','cmsExcluded'}
            and manifest['schemaVersion']=='d16-frontend-backup-v1' and manifest['cmsExcluded']==CMS_EXCLUDED,
            'frontend manifest mismatch')
    require(set(actual)-{'manifest.json'} == set(manifest['files']) and all(actual[name]==digest for name,digest in manifest['files'].items()), 'frontend archive hashes mismatch')
    require({'runtime/image.tar','records/subject.json','records/baseline.json','records/state.json','records/references.json'} <= set(actual), 'frontend backup is incomplete')
    return manifest,actual['manifest.json']


def backup_frontend(context, *, tools=None, publisher=publish_ciphertext) -> FrontendBackupReceipt:
    tools=tools or Tools(); subject=context.subject; expected=binding(context); request=read_request(context)
    require(context.state['state'] in {'PREPARED','BACKED_UP'}, 'frontend backup state mismatch')
    active=plain(context.state['details'].get('activeFrontend') or context.subject_baseline.get('activeFrontend'))
    require(isinstance(active,dict) and all(active.get(k) for k in ('commit','sourceRoot','imageId','buildId','containerId')), 'frontend active identity is incomplete')
    root=subject.production/'backups/frontend'; root.mkdir(mode=0o700,parents=True,exist_ok=True)
    journal_path=subject.state_root/'frontend-backup-request.json'
    if journal_path.exists():
        journal=read_record(journal_path)
        require(journal['binding']==expected and journal['request']==request and journal['active']==active,'frontend backup replay identity changed')
        backup_id=journal['backupId']
    else:
        backup_id=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+context.candidate.source_commit+'-'+uuid4().hex
        journal={'binding':expected,'request':request,'backupId':backup_id,'active':active}
        atomic_write_json(journal_path,journal)
    require(re.fullmatch(r'[0-9]{8}T[0-9]{6}Z-[a-f0-9]{40}-[a-f0-9]{32}',backup_id) is not None,'frontend backup ID mismatch')
    receipt_path=root/(backup_id+'.json'); ciphertext=root/(backup_id+'.tar.age')
    if receipt_path.exists():
        receipt=read_record(receipt_path)
        require(receipt['binding']==expected and receipt['active']==active and receipt['ciphertextSha256']==sha256_file(ciphertext),'frontend backup receipt changed')
        exported=subject.outgoing/(backup_id+'.tar.age')
        if os.path.lexists(exported):
            require(sha256_file(exported)==receipt['ciphertextSha256'],'exported frontend backup changed')
        else:
            _space(subject.outgoing,ciphertext.stat().st_size)
            publisher(ciphertext,subject.outgoing,backup_id+'.tar.age',bounds=PublishBounds.capture(ciphertext,
                maximum_bytes=_cipher_limit(MAX_ARCHIVE),reserve_bytes=SPACE_RESERVE,expected_sha256=receipt['ciphertextSha256']))
        return receipt
    with tempfile.TemporaryDirectory(prefix='.frontend-',dir=root) as temporary:
        staging=Path(temporary); files=_source_files(Path(active['sourceRoot']))
        for index,policy in enumerate(subject.nginx_files):
            require(policy.logical_path.resolve(strict=True)==policy.resolved_path.resolve(strict=True),'site Nginx resolution changed')
            files[f'nginx/{index}.conf']=policy.resolved_path
        # TLS identities are resolved afresh; renewal never reuses an old inode/hash.
        if subject.certificates:
            from tls_identity import resolve_certificate
            from release_actions import SubprocessCommandRunner
            for policy in subject.certificates:
                snapshot=resolve_certificate(policy,SubprocessCommandRunner())
                files['tls/'+policy.cert_name+'-fullchain.pem']=snapshot.resolved_fullchain_path
                files['tls/'+policy.cert_name+'-privkey.pem']=snapshot.resolved_private_key_path
        records={'subject':plain(asdict(subject)), 'baseline':{'subject':subject.subject_id,'activeFrontend':active},
                 'state':{'state':context.state['state'],'binding':expected},
                 'references':{'hostBaselineSha256':context.state['details'].get('hostBaselineSha256'), 'cmsEvidenceSha256':expected['cmsEvidenceSha256'],'cmsExcluded':CMS_EXCLUDED}}
        record_bytes={name:canonical(value) for name,value in records.items()}
        sizes={name:_file_size(path,MAX_FILE) for name,path in files.items()}
        require(len(files)+len(records)+2<=MAX_MEMBERS,'frontend member count exceeds limit')
        require(all(len(value)<=MAX_FILE for value in record_bytes.values()),'frontend record exceeds byte limit')
        observed=json.loads(tools.run('docker',('image','inspect',active['imageId'])))
        require(len(observed)==1 and observed[0]['Id']==active['imageId'] and type(observed[0].get('Size')) is int and 0<observed[0]['Size']<=MAX_IMAGE,'frontend image size is unavailable or exceeds limit')
        image_limit=min(MAX_IMAGE,observed[0]['Size']+max(65536,observed[0]['Size']//10))
        # Include image export, all source/config/record bytes, padded tar/PAX
        # headers, a maximum-size manifest, and both plaintext/ciphertext peaks.
        manifest_limit=min(8*1024**2,1024+sum(len(name.encode())+100 for name in files)+4096)
        archive_limit=image_limit+sum(sizes.values())+sum(map(len,record_bytes.values()))+manifest_limit+(len(files)+len(records)+2)*4096+10240
        require(archive_limit<=MAX_ARCHIVE,'estimated frontend archive exceeds limit')
        cipher_limit=_cipher_limit(archive_limit)
        _space(root,image_limit+sum(map(len,record_bytes.values()))+archive_limit+cipher_limit)
        _space(subject.outgoing,2*cipher_limit)
        image=staging/'image.tar';_capture(tools,'docker',('image','save',active['imageId']),image,image_limit)
        files['runtime/image.tar']=image
        for name,value in record_bytes.items():
            path=staging/(name+'.json')
            with path.open('xb') as output:_BoundedSink(output,staging,MAX_FILE).write(value)
            files['records/'+name+'.json']=path
        manifest={'schemaVersion':'d16-frontend-backup-v1','backupId':backup_id,'binding':expected,'active':active,
                  'files':{name:_file_hash(path,image_limit if name=='runtime/image.tar' else MAX_FILE) for name,path in files.items()},'cmsExcluded':CMS_EXCLUDED}
        manifest_bytes=canonical(manifest); archive=staging/'frontend.tar'
        require(len(manifest_bytes)<=manifest_limit,'frontend manifest exceeds estimate')
        with archive.open('xb') as archive_output,tarfile.open(fileobj=_BoundedSink(archive_output,staging,archive_limit),mode='w') as tar:
            for name,path in sorted(files.items()):
                with _open_regular_read(path) as source:
                    metadata=tarfile.TarInfo(name); metadata.size=os.fstat(source.fileno()).st_size; metadata.mode=0o600
                    require(metadata.size<=(image_limit if name=='runtime/image.tar' else MAX_FILE),'frontend file grew beyond limit')
                    tar.addfile(metadata,source)
            metadata=tarfile.TarInfo('manifest.json'); metadata.size=len(manifest_bytes); metadata.mode=0o600
            tar.addfile(metadata,io.BytesIO(manifest_bytes))
        _,manifest_hash=inspect_archive(archive)
        encrypted=staging/'ciphertext.age'
        _capture(tools,'age',('--encrypt','--recipients-file',str(subject.configuration/'backup.age.pub'),str(archive)),encrypted,cipher_limit)
        os.chmod(encrypted,0o600); os.replace(encrypted,ciphertext)
        receipt={'schemaVersion':'d16-frontend-backup-receipt-v1','backupId':backup_id,'binding':expected,'active':active,
                 'manifestSha256':manifest_hash,'ciphertextSha256':sha256_file(ciphertext),'cmsExcluded':CMS_EXCLUDED}
        atomic_write_json(receipt_path,receipt)
    _space(subject.outgoing,ciphertext.stat().st_size)
    publisher(ciphertext,subject.outgoing,backup_id+'.tar.age',bounds=PublishBounds.capture(ciphertext,
        maximum_bytes=_cipher_limit(MAX_ARCHIVE),reserve_bytes=SPACE_RESERVE,expected_sha256=receipt['ciphertextSha256']))
    return receipt


def restore_frontend_backup(ciphertext: Path, identity: Path, *, tools=None) -> FrontendRestoreEvidence:
    tools=tools or Tools(); network=None; container=None
    with tempfile.TemporaryDirectory(prefix='d16-frontend-restore-') as temporary:
        root=Path(temporary); archive=root/'frontend.tar'
        cipher_size=_file_size(ciphertext,_cipher_limit(MAX_ARCHIVE))
        # age is not compressed: the authenticated plaintext cannot be larger
        # than its ciphertext. Keep space for archive plus extracted members.
        plain_limit=min(MAX_ARCHIVE,cipher_size)
        _space(root,2*plain_limit)
        _capture(tools,'age',('--decrypt','--identity',str(identity),str(ciphertext)),archive,plain_limit)
        manifest,manifest_hash=inspect_archive(archive)
        restored=root/'restored'; restored.mkdir(mode=0o700); inspect_archive(archive,restored)
        active=manifest['active']; image=active['imageId']
        require(re.fullmatch(r'sha256:[a-f0-9]{64}',image) is not None,'restored image ID mismatch')
        run_id='d16-restore-'+uuid4().hex
        try:
            with (restored/'runtime/image.tar').open('rb') as source: tools.run('docker',('image','load'),stdin=source)
            observed=json.loads(tools.run('docker',('image','inspect',image)))
            require(observed[0]['Id']==image,'restored image mismatch')
            network=tools.run('docker',('network','create','--internal','--label','d16.restore='+run_id,run_id)).decode().strip()
            container=tools.run('docker',('create','--name',run_id,'--label','d16.restore='+run_id,'--network',network,
                                         '--env','SITE_ID='+manifest['binding']['subject'],'--env','NODE_ENV=production',image)).decode().strip()
            tools.run('docker',('start',container))
            script="const fs=require('fs'),http=require('http');http.get('http://127.0.0.1:3000/',r=>{let n=0;r.on('data',b=>n+=b.length);r.on('end',()=>console.log(JSON.stringify({buildId:fs.readFileSync('/app/.next/BUILD_ID','utf8').trim(),status:r.statusCode,bytes:n})));}).on('error',()=>process.exit(1));"
            deadline=time.monotonic()+60
            while True:
                try:
                    health=json.loads(tools.run('docker',('exec',container,'node','-e',script),timeout=15)); break
                except ReleaseError:
                    if time.monotonic()>=deadline: raise
                    time.sleep(.2)
            require(health.get('buildId')==active['buildId'] and health.get('status')==200 and health.get('bytes',0)>0,'restored frontend health or Build ID mismatch')
            evidence={'schemaVersion':'d16-frontend-restore-v1','verified':True,'fullArchiveRead':True,'backupId':manifest['backupId'],
                      'binding':manifest['binding'],'ciphertextSha256':sha256_file(ciphertext),'manifestSha256':manifest_hash,
                      'buildId':health['buildId'],'imageId':image,'slot':container,'network':network,'isolated':True,'health':health,'cmsExcluded':CMS_EXCLUDED}
        finally:
            # Only IDs returned by this attempt can be removed; no volume deletion.
            if container: tools.run('docker',('rm','--force',container))
            if network: tools.run('docker',('network','rm',network))
        return {**evidence,'cleanupVerified':True}


if __name__=='__main__':
    import sys
    if len(sys.argv)!=4 or sys.argv[1]!='restore': raise SystemExit('restore CIPHERTEXT IDENTITY required')
    print(json.dumps(restore_frontend_backup(Path(sys.argv[2]),Path(sys.argv[3])),sort_keys=True))
