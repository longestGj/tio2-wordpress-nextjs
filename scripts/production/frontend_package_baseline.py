"""Read-only administrator observation for offline frontend packaging.

Run an independently hash-verified copy with the protected installed program.
No command-line program, subject, file or shell override; stdout contains only
non-secret identities. This does not install tools or alter release state.
"""
from datetime import datetime, timezone
import hashlib
import json
import re
import sys

# The administrator may omit -B; installed imports must remain read-only.
sys.dont_write_bytecode = True


def baseline_record(observed, release_id, observed_at):
    from release_contract import ReleaseError
    if observed.get('subject')!='tio2-my' or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}',release_id):
        raise ReleaseError('frontend baseline subject/release mismatch')
    record={'schemaVersion':'d16-frontend-package-baseline-v1','subject':'tio2-my',
        'releaseId':release_id,'observedAt':observed_at,
        'sourceCommit':observed['activeFrontend']['commit'],
        **{k:observed[k] for k in ('previousProductionReceipt','configurationSha256','cmsContractSha256')},
        'contentSha256':observed['cmsRuntime']['contentSha256']}
    if not isinstance(record['sourceCommit'],str) or not re.fullmatch(r'[a-f0-9]{40}',record['sourceCommit']):
        raise ReleaseError('active frontend has no verified Git identity')
    if any(not isinstance(record[k],str) or not re.fullmatch(r'[a-f0-9]{64}',record[k]) for k in
        ('previousProductionReceipt','configurationSha256','cmsContractSha256','contentSha256')):
        raise ReleaseError('observed frontend baseline hashes invalid')
    return record


def observe(release_id):
    from pathlib import Path
    from types import SimpleNamespace
    import os
    if os.name!='posix' or os.geteuid()!=0:
        raise RuntimeError('verified administrator observation requires root on the production host')
    # Import exclusively from the existing protected program, not an upload.
    program=Path('/opt/tio2-production/program').resolve(strict=True)
    import stat
    for entry in (program,*program.parents):
        metadata=entry.stat()
        if metadata.st_uid!=0 or metadata.st_mode & (stat.S_IWGRP|stat.S_IWOTH):
            raise RuntimeError('protected production program is not root-owned')
    sys.path.insert(0,str(program))
    from subject_registry import load_registry
    from release_state import read_state
    from frontend_candidate import load_baselines
    from release_contract import ReleaseError
    subject=load_registry(Path('/etc/d16-release')).resolve('tio2-my')
    state=read_state(subject.state_root)
    if state['state'] not in ('IDLE','COMPLETED','ROLLED_BACK') or state.get('details',{}).get('releaseId')==release_id:
        raise ReleaseError('a new terminal-state frontend baseline is required')
    if (subject.state_root/'frontend-history'/release_id).exists() or (subject.state_root/'frontend-candidates'/release_id).exists():
        raise ReleaseError('release ID has already been used')
    baseline,_=load_baselines(subject,state,SimpleNamespace(release_id=release_id))
    if read_state(subject.state_root)!=state:
        raise ReleaseError('release state changed during baseline observation')
    return baseline_record(baseline,release_id,datetime.now(timezone.utc).isoformat())


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--release-id',required=True)
    args=parser.parse_args()
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}',args.release_id):
        parser.exit(2,'invalid release identity\n')
    try:
        raw=json.dumps(observe(args.release_id),sort_keys=True,separators=(',',':')).encode()
        # Hash covers the exact stdout bytes including its trailing newline.
        sys.stdout.buffer.write(raw+b'\n')
        print('baselineSha256='+hashlib.sha256(raw+b'\n').hexdigest(),file=sys.stderr)
    except Exception:
        parser.exit(2,'frontend baseline observation failed; no deployment was performed\n')
