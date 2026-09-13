# tio2-my main production preflight

- Status: `CLASSIFICATION_FAILED` / `ADMINISTRATOR_PLAN_REQUIRED`; production deployment is not complete.
- Observed: 2026-09-14 Asia/Shanghai (2026-09-13 22:24 UTC).
- Authorization: deploy current main to tio2-my Production, including applicable ordinary backup/deployment/verification and same-transaction rollback. No administrator installation, other-site changes, DNS/indexing, CMS reset or real external form submissions authorized.
- Frozen main: `eebfb0299ab8d3a4de7241211be9b6b20b9ad090`. Main checkout `D:/16Wordpress_nextjs` remained clean. This task uses the existing isolated checkout `C:/Users/longe/.codex/worktrees/2437/16Wordpress_nextjs`; main was not moved. Current develop `a526d6ca178f2fe31ecdca24484ae0c3259242fc` was not included.
- Prior integration/prerelease receipt: Git `bb1a1060:docs/verification/2026-09-13-legal-read-main-prerelease.md`. Its checks are historical, not rerun or represented as fresh production evidence. Prior run `20260913T141505Z-eebfb0299ab8`, Build `ySIrLAM-ARnG6ByKql7JS`, CMS identity `9b2c2b65c69d67c9ad751f2d6700a05f30862f2620d26ac1002acadcff69d5d1`.

## Fixed production observation

Executed from this checkout:

```powershell
pwsh -NoProfile -File scripts/production.ps1 -Operation Status -ConfigPath D:/16Wordpress_nextjs/.production/production-connection.json -RunRoot D:/16Wordpress_nextjs/.production/runs/20260914-main-eebfb029-preflight
```

Exit 0; subject `tio2-my`, ok true, state `ROLLED_BACK`, recoveryRequired false, sharedCmsWindowActive false. Frontend-only capability true; cms-platform, combined, content-only and host-infrastructure false. No remote write action was invoked.

Status retained the prior transaction `tio2-my-frontend-permissions-7c849af2`, server RunRoot `frontend/tio2-my-frontend-permissions-7c849af2`, source `e288316139b1de89389dcd3bbf3c02ff63b33f7b`. Its safeRecovery record reports active commit `27f0a0da59df1e54cd01eab7d77eb7024b338d42`, Build `wQLBw5iwDoUK0QoWOnb10`, image `sha256:2117a3621e2acb5286510c1c9b074f5ab8ef2a6d1750025328144737a8556107`, proxy true and CMS unchanged. These are the status response's persisted rollback facts, not a newly run independent browser or live baseline observation. This task did not perform that rollback.

Raw status saved in the ignored RunRoot above; SHA-256 `cb3bb3ad47243e785046f4c75ad41c8167288dfd3b5de40cf111e7856ca0843e`. The local preflight directory is only observation/artifact storage; it is not a replacement for the prior server transaction RunRoot.

## Classification and package evidence

Server state records CMS contract `62426e7a28fe083e053f344b70c51a10dd0aeff79bb67da88e1f5b484bed9889`. Exact main Git plugin inventory (115 files) hashes to `6708f6e3421a62e6306cb1a5ba63db206a0a32b404cfec14815838785bd56195`. The fingerprints differ; a privileged live installation inventory is still needed to establish current installed bytes independently.

Against prior candidate e2883161, the plugin adds `config/tio2-my-legal-read-contract.json` (46 lines) and `includes/legal-pages-read-contract.php` (269 lines), and changes `includes/legal-pages-v01.php` to use the new read validator/public projection (5 additions, 2 deletions). Main also includes frontend and administrator tooling changes documented in the prior integration receipt. It cannot be admitted as an unchanged-CMS frontend-only package on the available evidence. No frontend candidate manifest or deployable website package was produced; no unsupported write was attempted to force a rejection.

Prepared locally from exact main Git blobs, under the ignored RunRoot:

| Review artifact | SHA-256 | Files |
|---|---|---|
| admin-eebfb029.tar.gz | 177e7cd3247d454090d40cc1ee1844fb940883c6fb52212be21d3f6ec75602c9 | 59 |
| cms-eebfb029.tar.gz | 73a9a9a0c373499460bb928a65ab979df82bd542a082da31f9e2967b910ce2ed | 117 |

Built with `ops/production/build_admin_bundle.py` and `ops/production/build_content_install_bundle.py` build functions. Each sidecar lists every member/hash. Both archives and every listed member were independently read back and hashed successfully. Both record installationPerformed=false. These are review inputs, not installation approval or completed installation plans.

The first read-only call to `package_frontend.source_files` failed `Git archive size changed`. Root cause reproduced: inherited `core.autocrlf=true` changed 2,514 archived file sizes in a whole-tree diagnostic. A single `git -c core.autocrlf=false archive` had zero size differences. Repeating the actual source validator with process-scoped Git configuration verified all 708 relevant source files, including blob identities and approved contract hashes; CMS fingerprint matched the bundle inventory. No persistent Git setting or source code changed. `source-verification.json` preserves that result. This resolved the local source observation problem, not the missing production CMS capability.

## Required next step and boundaries

Request narrowly scoped administrator read-only inventory and planning: verify installed program/CMS hashes, current frontend/configuration/DB identity, and registered old-program/plugin rollback targets; use the two review artifact hashes above to determine the minimum required upgrade and produce a hash-bound plan with file/resource differences. Keep the previous transaction and its evidence intact. Do not install, mutate registrations, pause shared writes, or alter CMS under this planning permission.

Exact server migration plan hash and old-program rollback target are not available through the ordinary status response. Therefore installation approval cannot yet be concrete; this receipt requests planning only. Any subsequent installation request must include that actual plan and rollback targets. Existing content installation includes shared database maintenance/backup and importer/hooks setup; do not silently widen a legal PHP update into that installation or content-capability activation.

The formal frontend packaging/acceptance contracts also require same-candidate live form and inbox evidence; the inherited main receipt explicitly has no submissions. Real RFQ, Sample and Documents submissions and mailbox confirmation remain separately unauthorized and unperformed. They cannot be replaced by old candidate mail evidence.

No new production prepare, backup, stage, activate, verify, rollback, database export/restore, website business E2E, or inbox check was performed. No need for new rollback was created. Public/CMS runtime versions have not been independently re-observed outside fixed status. Final state is not `PRODUCTION_VERIFIED`.
