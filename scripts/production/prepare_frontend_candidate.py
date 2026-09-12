"""Package a new frontend envelope from frozen archive and existing proof bytes."""
from __future__ import annotations
import argparse
from datetime import datetime,timezone
import hashlib
import os
from pathlib import Path
import shutil
import sys
import tempfile
from types import SimpleNamespace

sys.path.insert(0,str(Path(__file__).resolve().parent))
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production/server'))
from prepare_content_candidate import _safe_path,_write,_publish_noreplace,_sync_directory
from candidate_contract import CandidateEnvelope,_tree_digest
from cms_evidence import canonical
from frontend_candidate import validate_source
from frontend_backup import read_record
from release_contract import ReleaseError,_open_regular_read,sha256_file

def prepare(source,output,release_id):
    source=_safe_path(source);output=_safe_path(output,missing_leaf=True)
    if output.exists():raise ReleaseError('frontend output already exists')
    with tempfile.TemporaryDirectory(prefix='.frontend-candidate-',dir=output.parent) as temporary:
        staging=Path(temporary);payload=staging/'payload/frontend';payload.mkdir(parents=True)
        for name,limit in [('release.tar.gz',2*1024**3),('release-manifest.json',16*1024**2),('release-proof.json',1024**2)]:
            path=_safe_path(source/name)
            with _open_regular_read(path) as stream,(payload/name).open('xb') as target:
                metadata=os.fstat(stream.fileno())
                if metadata.st_nlink!=1 or metadata.st_size>limit:raise ReleaseError('frontend source file exceeds boundary')
                copied=0
                while block:=stream.read(1024**2):
                    copied+=len(block)
                    if copied>limit:raise ReleaseError('frontend source file exceeds boundary')
                    target.write(block)
                target.flush();os.fsync(target.fileno())
        proof=read_record(payload/'release-proof.json')
        files=tuple(sorted(('frontend/'+path.name,sha256_file(path)) for path in payload.iterdir()))
        envelope={'schemaVersion':'d16-release-candidate-v1','releaseId':release_id,'releaseType':'frontend-only',
            **{key:proof[key] for key in ('subject','sourceCommit','buildId','previousProductionReceipt','cmsContractSha256','configurationSha256')},
            'createdAt':datetime.now(timezone.utc).isoformat(),'prereleaseReceiptSha256':sha256_file(payload/'release-proof.json'),
            'payloadSha256':_tree_digest(files),'files':[{'path':name,'sha256':sha} for name,sha in files]}
        _write(staging/'candidate-manifest.json',canonical(envelope))
        candidate=CandidateEnvelope.from_path(staging/'candidate-manifest.json')
        validate_source(SimpleNamespace(subject_id=candidate.subject,incoming=staging),candidate,{'cmsRuntime':{'contentSha256':proof['contentSha256']}},payload_root=staging/'payload')
        _sync_directory(payload);_sync_directory(staging/'payload');_sync_directory(staging)
        _publish_noreplace(staging,output);_sync_directory(output.parent)
    return {'subject':candidate.subject,'releaseId':candidate.release_id,'candidateManifestSha256':sha256_file(output/'candidate-manifest.json')}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--release-id',required=True)
    args=parser.parse_args()
    try:
        import json
        print(json.dumps(prepare(args.source,args.output,args.release_id)))
    except (ReleaseError,OSError,ValueError,KeyError) as error:
        parser.exit(2,'frontend packaging failed: '+str(error)+'\n')
