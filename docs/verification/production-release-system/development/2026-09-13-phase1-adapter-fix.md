# Phase-one legacy frontend adapter repair

Subject: tio2-my. Base: 7860642e. Production tool exhibiting the defect: 53da53fb. Development scope only; no production execution is implied by this receipt.

The completed migration preserves registry adapter and transaction adapterVersion `tio2-my-v1`. The system factory omitted that registration, and the frontend adapter omitted that historical version. Fixed Status therefore exposed no frontend write capability and Backup was rejected before stage/activation.

The factory now registers the historical alias only for tio2-my; the frontend adapter accepts its stored version only for that subject. Neither state nor registration is rewritten. Regression tests first reproduced disabled capability and explicit version rejection, then exercised backup, stage, activate and verify with the retained version. Unknown versions remain rejected.

## Administrator program-only upgrade

`scripts/production/phase1_program_upgrade.py` is a separately hashed administrator runner placed beside `admin/`, `admin-bundle.tar.gz` and its `.sha256.json` manifest in a root-protected directory. It reuses the migration's protected-path checks, archive/source validation, atomic writes and both release locks. It requires a completed phase-one receipt and the existing tio2-my PREPARED state.

Run `python3 -B phase1_program_upgrade.py plan`, inspect the exact plan and its hash, then `python3 -B phase1_program_upgrade.py apply <planHash>`. Only the program generation link changes. Registry, state, compatibility transaction, original migration records, wrapper, sudoers and legacy state are hash-bound and checked unchanged. The previous program is retained. A read-only status from the new program must expose frontend capability with PREPARED and no recovery requirement.

An interrupted apply resumes with the same runner, bundle and plan hash. `recover <planHash>` restores only the old program link if the protected files still match; it never restores a database or modifies the pending frontend transaction. Recovery retains the approved journal so the same apply can resume. Once the upgrade receipt exists, recovery is refused. This bounded runner handles this PREPARED compatibility repair, not arbitrary future program upgrades.

Tests cover unchanged protected files, identity drift rejection, interruption during generation write, interruption after link switch, explicit recovery followed by retry, and interruption between receipt persistence and journal cleanup. Linux additionally tests actual root-owned symlink switch/recovery; Windows simulation is not evidence of production execution.

Release side must freeze and verify the merged code, prepare a fresh immutable administrator bundle plus runner hash, inspect the server plan, apply the program upgrade, then resume the original RunRoot. Re-running initial migration or the legacy bootstrap installer is not the upgrade procedure.

## Validation

2026-09-13: targeted Windows combination passed 74 tests before adding interruption regressions; the updated six upgrade scenarios separately passed. Final Linux isolated combination passed 77 tests, zero failures or skips, including actual root-owned symlink recovery. Docker ran with no network and a read-only source mount. Independent review found three interruption gaps; all were corrected, tested and re-reviewed with no remaining blocking findings. No production changes occurred during these tests.
