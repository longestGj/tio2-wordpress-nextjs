"""Build a frontend candidate from exact main, original evidence and a pinned baseline.

Offline publisher boundary: the baseline hash must be obtained independently from
the authorized administrator's read-only observation. It is NOT a signature. The
installed controller re-observes all baseline identities at Prepare; packaging
neither connects to production nor grants authority to deploy.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[2]/'ops/production/server'))
from cms_evidence import canonical
from release_contract import ReleaseError, FROZEN_CONTRACTS, MAX_EXPANDED_BYTES, MAX_MEMBERS
from prepare_content_candidate import _read, _safe_path, _write, _publish_noreplace, _sync_directory
from prepare_frontend_candidate import prepare
from frontend_package_baseline import baseline_record

RUNTIME_ROOTS = {'app','components','lib','public','sites'}
RUNTIME_FILES = {'.env.example','.gitattributes','next.config.ts','package.json',
    'package-lock.json','proxy.ts','tsconfig.json','vercel.json'}
CONTRACTS = FROZEN_CONTRACTS['tio2-production-contracts-v3'][0]
PLUGIN = 'wordpress/plugins/tio2-site-model/'
HASH = re.compile(r'^[a-f0-9]{64}$')
COMMIT = re.compile(r'^[a-f0-9]{40}$')
IDENTIFIER = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$')
BASELINE_KEYS = {'schemaVersion','subject','releaseId','sourceCommit','observedAt',
    'previousProductionReceipt','cmsContractSha256','contentSha256','configurationSha256'}


def require(condition, message):
    if not condition:
        raise ReleaseError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def git(repository, *arguments):
    result = subprocess.run(['git','-C',str(repository),*arguments], capture_output=True)
    require(result.returncode == 0, 'frozen Git source is unavailable')
    return result.stdout


def runtime(name):
    return name in RUNTIME_FILES or name.split('/')[0] in RUNTIME_ROOTS


def source_files(repository, commit):
    """Archive only tracked runtime/contracts; compare every blob to ls-tree IDs."""
    expected = {}
    entries = git(repository,'ls-tree','-rlz',commit).split(b'\0')
    for entry in filter(None, entries):
        metadata, raw_name = entry.split(b'\t',1)
        name = raw_name.decode('utf-8')
        if not (runtime(name) or name in CONTRACTS or name.startswith(PLUGIN)):
            continue
        mode, kind, oid, size = metadata.split()
        require(mode in (b'100644',b'100755') and kind == b'blob', 'frontend source contains a link or submodule')
        require(not any(part in ('','.','..') for part in name.split('/')) and '\\' not in name,
            'unsafe frontend source path')
        leaf = name.rsplit('/',1)[-1].lower()
        require((not leaf.startswith('.env') or name == '.env.example') and
            not leaf.endswith(('.key','.pem','.log')), 'frontend source contains secret/log files')
        expected[name] = (oid.decode(), int(size))
    require(0 < len(expected) <= MAX_MEMBERS and sum(size for _,size in expected.values()) <= MAX_EXPANDED_BYTES,
        'frontend source size exceeds boundary')
    # Directory pathspecs keep the invocation bounded even for many assets.
    paths = sorted({n.split('/')[0] for n in expected if runtime(n)} | set(CONTRACTS) | {PLUGIN.rstrip('/')})
    raw = git(repository,'archive','--format=tar',commit,'--',*paths)
    files = {}
    with tarfile.open(fileobj=io.BytesIO(raw)) as archive:
        for member in archive:
            if member.isdir():
                continue
            # Non-runtime ops files are deliberately not shipped or executed.
            if member.name not in expected:
                continue
            require(member.isreg() and member.name not in files, 'unsafe Git archive member')
            oid,size = expected[member.name]
            require(member.size == size, 'Git archive size changed')
            data = archive.extractfile(member).read()
            require(hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest() == oid,
                'Git archive bytes differ from frozen blob')
            files[member.name] = data
    require(set(files) == set(expected), 'Git archive omitted frozen source files')
    require(all(digest(files.get(n,b'')) == h for n,h in CONTRACTS.items()), 'unapproved production contracts')
    return files


def validate_baseline(raw, value, expected_sha, release_id):
    require(isinstance(expected_sha,str) and HASH.fullmatch(expected_sha) and digest(raw)==expected_sha,
        'independently pinned production baseline hash mismatch')
    require(isinstance(value,dict) and set(value)==BASELINE_KEYS and
        value['schemaVersion']=='d16-frontend-package-baseline-v1' and value['subject']=='tio2-my' and
        value['releaseId']==release_id and isinstance(value['sourceCommit'],str) and COMMIT.fullmatch(value['sourceCommit']),
        'production baseline identity mismatch')
    require(all(isinstance(value[k],str) and HASH.fullmatch(value[k]) for k in
        ('previousProductionReceipt','cmsContractSha256','contentSha256','configurationSha256')),
        'production baseline hashes invalid')
    require(isinstance(value['observedAt'],str) and
        datetime.fromisoformat(value['observedAt'].replace('Z','+00:00')).tzinfo is not None,
        'production baseline observation time invalid')


def development_evidence(repository, commit, base, receipt_paths):
    """Classify only shipped frontend changes, not already-installed admin tools.

CMS files are never included; their entire candidate tree must separately equal
the observed installed plugin contract. No user-supplied release type is accepted.
"""
    changes = {p for p in git(repository,'diff','--name-only','--no-renames',base,commit).decode().splitlines() if runtime(p)}
    require(changes, 'production baseline..candidate has no frontend changes')
    covered = set()
    snapshots = {}
    keys = {'schemaVersion','receiptId','state','mergeCommit','paths','subjects',
        'affectedConsumers','contentScopes','cmsContractChanged','hostPaths'}
    ids = set()
    for path in receipt_paths:
        path = _safe_path(path)
        relative = path.relative_to(repository).as_posix()
        require(relative.startswith('docs/verification/development-receipts/') and relative.endswith('.json'),
            'development receipt path is not approved')
        raw, receipt = _read(path, 1024*1024)
        require(raw == git(repository,'show',commit+':'+relative), 'development receipt differs from frozen Git')
        require(isinstance(receipt,dict) and set(receipt)==keys and
            receipt['schemaVersion']=='d16-development-receipt-v1' and receipt['state']=='MERGED_TO_DEVELOP' and
            receipt['subjects']==['tio2-my'] and receipt['affectedConsumers']==['tio2-my'] and
            receipt['contentScopes']==[] and receipt['hostPaths']==[] and receipt['cmsContractChanged'] is False,
            'development receipt does not authorize a single frontend consumer')
        require(isinstance(receipt['mergeCommit'],str) and COMMIT.fullmatch(receipt['mergeCommit']), 'invalid development commit')
        git(repository,'merge-base','--is-ancestor',receipt['mergeCommit'],commit)
        require(isinstance(receipt['receiptId'],str) and IDENTIFIER.fullmatch(receipt['receiptId']) and receipt['receiptId'] not in ids,
            'duplicate or invalid development receipt')
        ids.add(receipt['receiptId'])
        paths = receipt['paths']
        require(isinstance(paths,list) and all(isinstance(p,str) and runtime(p) for p in paths) and
            len(paths)==len(set(paths)) and set(paths)<=changes, 'development receipt paths exceed frontend changes')
        covered.update(paths)
        snapshots[relative] = raw
    require(covered == changes, 'development receipts do not cover production baseline..candidate')
    return snapshots


def build(repository, gate_path, test_path, run_root, baseline_path, baseline_sha, receipt_paths, release_id):
    repository = _safe_path(repository)
    require(IDENTIFIER.fullmatch(release_id), 'invalid release ID')
    commit = git(repository,'rev-parse','HEAD').decode().strip()
    require(git(repository,'branch','--show-current').strip()==b'main' and
        not git(repository,'status','--porcelain=v1','--untracked-files=all').strip(), 'packaging requires clean main')
    gate_path = _safe_path(gate_path)
    evidence_root = repository/'docs/verification/prerelease/runs'
    require(gate_path.is_relative_to(evidence_root) and _safe_path(test_path).is_relative_to(evidence_root),
        'evidence must be below docs/verification/prerelease/runs')
    run_root = _safe_path(run_root)
    require(run_root.is_relative_to(repository/'.prerelease/runs'), 'prerelease run is outside registered root')
    inputs = {'gate.json':gate_path, 'test.json':Path(test_path),
        'live.json':gate_path.parent/'result.json', 'inbox.json':gate_path.parent/'inbox-confirmation.json',
        'run.json':run_root/'run-manifest.json','cms.json':run_root/'cms-identity.json',
        'baseline.json':Path(baseline_path)}
    snapshots = {name:_read(path,16*1024*1024) for name,path in inputs.items()}
    baseline = snapshots['baseline.json'][1]
    validate_baseline(snapshots['baseline.json'][0],baseline,baseline_sha,release_id)
    run = snapshots['run.json'][1]
    gate = snapshots['gate.json'][1]
    require(run.get('state')=='HEALTHY' and run.get('branch')=='main' and run.get('siteId')=='tio2-my' and
        run.get('commit')==commit and gate.get('commit')==commit and
        all(run.get(k)==gate.get(k) for k in ('runId','buildId','cmsIdentitySha256')) and
        digest(snapshots['cms.json'][0])==gate.get('cmsIdentitySha256'), 'prerelease runtime identity mismatch')
    files = source_files(repository,commit)
    plugin = {n.removeprefix(PLUGIN):digest(data) for n,data in files.items() if n.startswith(PLUGIN)}
    require(plugin and digest(canonical(plugin))==baseline['cmsContractSha256'], 'candidate CMS differs from installed CMS')
    receipts = development_evidence(repository,commit,baseline['sourceCommit'],receipt_paths)
    production = repository/'.production'
    production.mkdir(exist_ok=True)
    _safe_path(production)
    runs = production/'runs'
    runs.mkdir(exist_ok=True)
    _safe_path(runs)
    output = _safe_path(runs/release_id,missing_leaf=True)
    require(not output.exists(), 'production output already exists')
    with tempfile.TemporaryDirectory(prefix='.package-frontend-',dir=runs) as temporary:
        staging=Path(temporary)
        evidence=staging/'evidence'; evidence.mkdir()
        for name,(raw,_) in snapshots.items():
            _write(evidence/name,raw)
        # Re-run the actual sealer on snapshotted inputs, not hand-written PASS.
        shell=shutil.which('pwsh')
        require(shell is not None, 'PowerShell 7 required')
        result=subprocess.run([shell,'-NoProfile','-NonInteractive','-File',
            str(Path(__file__).parents[1]/'prerelease/Seal-ProductionGate.ps1'),
            '-TestReceiptPath',str(evidence/'test.json'),'-LiveFormsReceiptPath',str(evidence/'live.json'),
            '-InboxReceiptPath',str(evidence/'inbox.json'),'-OutputPath',str(evidence/'resealed.json')],
            capture_output=True,timeout=90)
        require(result.returncode==0, 'original prerelease evidence failed revalidation')
        _, resealed=_read(evidence/'resealed.json',1024*1024)
        require({k:v for k,v in gate.items() if k!='sealedAt'}=={k:v for k,v in resealed.items() if k!='sealedAt'},
            'sealed prerelease gate differs from original evidence')
        require(isinstance(gate.get('sealedAt'),str) and
            datetime.fromisoformat(gate['sealedAt'].replace('Z','+00:00')).tzinfo is not None, 'invalid gate timestamp')
        for i,(name,raw) in enumerate(sorted(receipts.items())):
            _write(evidence/f'development-{i}.json',raw)
        source=staging/'source';source.mkdir()
        payload={n:data for n,data in files.items() if runtime(n) or n in CONTRACTS}
        archive_path=source/'release.tar.gz'
        with archive_path.open('xb') as target, gzip.GzipFile(filename='',fileobj=target,mode='wb',mtime=0) as compressed:
            with tarfile.open(fileobj=compressed,mode='w|',format=tarfile.PAX_FORMAT) as archive:
                for name,data in sorted(payload.items()):
                    member=tarfile.TarInfo(name);member.size=len(data);member.mode=0o644
                    archive.addfile(member,io.BytesIO(data))
        manifest={'schemaVersion':'tio2-production-release-v1','siteId':'tio2-my','commit':commit,
            'archiveSha256':digest(archive_path.read_bytes()),
            'files':[{'path':n,'sha256':digest(data)} for n,data in sorted(payload.items())],
            'migrationManifestSha256':CONTRACTS['ops/production/migration-manifest.json'],
            'releaseSurfaceSha256':gate['releaseSurfaceSha256']}
        _write(source/'release-manifest.json',canonical(manifest))
        # Bind provenance separately; preserve and hash every original input.
        provenance={'schemaVersion':'d16-frontend-package-evidence-v1','sourceCommit':commit,
            'releaseId':release_id,'baselineSha256':baseline_sha,
            'inputs':{n:digest(raw) for n,(raw,_) in snapshots.items()},
            'development':{n:digest(raw) for n,raw in receipts.items()}}
        _write(evidence/'binding.json',canonical(provenance))
        proof={'schemaVersion':'d16-frontend-prerelease-v1','subject':'tio2-my','sourceCommit':commit,
            'buildId':gate['buildId'],'archiveSha256':manifest['archiveSha256'],
            'sourceManifestSha256':digest(canonical(manifest)),
            **{k:baseline[k] for k in ('previousProductionReceipt','cmsContractSha256','contentSha256','configurationSha256')},
            'state':gate['state'],'source':{'branch':'main','clean':True},'counts':gate['counts'],'forms':gate['forms'],
            'evidenceSha256':digest(canonical(provenance))}
        _write(source/'release-proof.json',canonical(proof))
        prepared=staging/'candidate'
        result=prepare(source,prepared,release_id)
        shutil.copytree(evidence,prepared/'package-evidence')
        require(git(repository,'rev-parse','HEAD').decode().strip()==commit and
            git(repository,'branch','--show-current').strip()==b'main' and
            not git(repository,'status','--porcelain=v1','--untracked-files=all').strip(), 'Git changed during packaging')
        require(all(_read(path,16*1024*1024)[0]==snapshots[n][0] for n,path in inputs.items()), 'evidence changed during packaging')
        _safe_path(output,missing_leaf=True)
        _publish_noreplace(prepared,output);_sync_directory(runs)
    return dict(result,runRoot=str(output),state='PACKAGED')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('repository','gate','test','run','baseline'):
        parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('--baseline-sha256',required=True)
    parser.add_argument('--development-receipt',action='append',type=Path,required=True)
    parser.add_argument('--release-id',required=True)
    args=parser.parse_args()
    try:
        print(json.dumps(build(args.repository,args.gate,args.test,args.run,args.baseline,
            args.baseline_sha256,args.development_receipt,args.release_id)))
    except (ReleaseError,OSError,ValueError,KeyError,TypeError,subprocess.TimeoutExpired) as error:
        parser.exit(2,'frontend packaging failed: '+str(error)+'\n')
