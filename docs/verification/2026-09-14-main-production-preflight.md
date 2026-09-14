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

## Authorized administrator planning follow-up

The user subsequently approved administrator read-only inventory and upgrade planning. This approval is recorded and does not need to be requested again. No installation or shared-CMS write was approved.

The production and adoption connection files both provide the deploy account. This task has no attached app terminal. The previous task history confirms that administrator commands were executed by the user in a root terminal; no usable administrator connection configuration was located. Private-key contents were not read, and no alternative administrator username/key combination was guessed or tried. Current planning status is `ADMINISTRATOR_CHANNEL_REQUIRED`; no live administrator plan hash has been generated.

Local comparison against the historical server plan at `.production/candidates/analytics-upgrade-7c849af2/server-plan.json` found **only `tool-commit.txt` differs** from the main administrator bundle; all program-file hashes match, with no additions or removals. The historical target is `programs/upgrade-7c849af234602cf299cb75e772a0104f77b849cd`. This is a historical comparison, not proof of the current installed target. If live hashes confirm it, avoid a redundant administrator program upgrade and focus the plan on the CMS plugin difference. In particular, do not install a new program generation solely to change its commit label.

Exact main Git copies of the existing planning/observation entrypoints were prepared locally under the ignored RunRoot's `administrator-plan-inputs/`: `phase1_program_upgrade.py` SHA-256 `4fa352f0c213384b8694064b0b2f256d759d3dd6694ad36f71df5ace2f9e912c`, and `frontend_package_baseline.py` SHA-256 `d31dd2fe5d6f7466e3bc0f2b3c8a1175f97dbcd1f4f7bc1068dffc9da0cd453e`. `administrator-planning-review.json` records the comparison. These files have not been transferred or executed on production. Next required input is an existing administrator connection configuration path or access to the previously used administrator terminal; no password/private-key material should be posted in the conversation.

The user then provided root-terminal output confirming the active program target and commit `7c849af234602cf299cb75e772a0104f77b849cd`, followed by its full regular-file hash inventory. Attachment SHA-256 `936af500aed8aba388587708a5327e1d83c5ad6bb046c4e8bc82965164401978`: 59 observed files, zero missing/extra, exact match to the 7c849af2 bundle; compared with main, only `tool-commit.txt` differs. Therefore the observed administrator program files do not require upgrade for this main candidate. Evidence is user-provided SSH output, not a direct agent SSH observation. `administrator-program-observation.json` and `administrator-program-hashes.json` retain the parsed comparison in the ignored RunRoot.

The same output identifies WordPress `wordpress-wordpress-1`, database `wordpress-db-1`, frontend `tio2-web-production` and importer `d16-my-content-importer`. Docker's formatted mount strings were truncated, so the plugin source path and current plugin inventory remain unverified. Continue the already-authorized read-only planning through the user's root terminal; installation remains unperformed and unauthorized.

Subsequent full mount/hash output resolved the plugin uncertainty: 113 observed files, canonical CMS hash exactly matching controller status, 112 unchanged files, one changed and two added legal-read files in main. The existing importer also establishes that the installed initial CMS installation workflow is not applicable to this upgrade. The bounded planning result and development handoff are recorded in [legal CMS upgrade gap](2026-09-14-legal-cms-upgrade-gap.md). Current blocker is `CMS_UPGRADE_CAPABILITY_REQUIRED`, not administrator connectivity. No executable server installation plan or production write has been produced.

## User-requested release attempt, without administrator upgrade

The user challenged the inferred installation blocker and requested an actual ordinary release attempt first. No new CMS/admin upgrade was authorized. Main was freshly checked at eebfb029 with a clean main checkout.

Executed `scripts/production.ps1 -Operation Prepare` using the existing connection and this preflight RunRoot. The child process exited 1: `The property 'compatibilityTransaction' cannot be found on this object. Verify that the property exists.` Full output is in the ignored `prepare-attempt.log`; structured findings are in `actual-prepare-attempt.json`.

This was not a valid server-side test of the main candidate. The RunRoot contained no `candidate-manifest.json`; the client fetched status and then entered its legacy compatibility-binding branch, where it failed on the missing property. No candidate upload or remote prepare, backup, stage or activation occurred. This is an operator sequencing/input issue, not evidence that the server rejected main or that CMS installation is necessary. Do not interpret the failure as a CMS incompatibility test.

Inventory of the authoritative local prerelease evidence found only two `production-gate.json` files, for commits eb92f147 and e2883161. Neither matches current main eebfb029. The current main's ordinary prerelease result exists, but same-candidate production gate/live submission/inbox evidence does not. Old gate evidence cannot be relabeled as this main. Resume by obtaining the actual current-main production gate and fresh independent baseline, then building its immutable candidate and retrying Prepare with that candidate. Real submissions remain outside the original authorization unless the user explicitly expands it. No client code or evidence was changed to bypass these prerequisites.

## Authorized live prerelease forms

The user explicitly authorized RFQ, Sample and Documents once each plus inbox verification. Fresh prerelease Status was HEALTHY for main eebfb029, run `20260913T141505Z-eebfb0299ab8`, Build `ySIrLAM-ARnG6ByKql7JS`. The existing ignored live-forms flag was already true and was not changed.

Executed `pwsh -NoProfile -File scripts/prerelease.ps1 -Action TestLiveForms -RepositoryRoot D:/16Wordpress_nextjs` once. Actual Playwright testExit=0. Original evidence directory: `D:/16Wordpress_nextjs/docs/verification/prerelease/runs/20260913T223840Z-3bcd6e7d-6e19-4b9b-bf4a-6c7508e31f00`.

| Workflow | Request token | Provider response UTC | Result |
|---|---|---|---|
| RFQ | b5f614a8-2900-489c-8f32-768209eb011c | 2026-09-13T22:38:47.373Z | HTTP 200 / accepted / quote Thank You |
| Sample | 09165f49-d69f-4307-ac61-f03024f9e7d9 | 2026-09-13T22:38:49.918Z | HTTP 200 / accepted / sample Thank You |
| Documents | 9f6ff816-e43c-4428-8f1b-18c10bd580e8 | 2026-09-13T22:38:52.456Z | HTTP 200 / accepted / documents Thank You |

Original aggregate incorrectly returned FAILED with empty attempts/counts. Raw provider and browser fragments prove three accepted submissions, one allowed POST per workflow and zero blocked writes. No additional submission was made. Investigation reproduced PowerShell 7.6.5 JSON counts as Int64 and timestamps as DateTime, whereas the existing aggregate requires Int32 and an ISO string. Windows PowerShell 5.1 (the runtime used by the documented npm command) parses counts as Int32.

Preserved all original evidence including the FAILED aggregate. Copied original fragments/screenshots byte-for-byte into sibling `20260913T223840Z-3bcd6e7d-6e19-4b9b-bf4a-6c7508e31f00-reconciled-ps51`, verified every copied hash, then invoked the unchanged `Complete-PrereleaseEvidence` only, with the original command UUID, manifest and actual testExit=0 under Windows PowerShell 5.1. It returned PASSED, evidenceValid=true, three completed checks, externalPostCount=3, allowedPostCount=3, blockedWriteCount=0. `aggregation-recovery.json` binds copies to original evidence and explicitly records testRerun=false. This is evidence re-aggregation, not a new test run or an overwritten failure.

Personally inspected RFQ desktop 1440, Sample mobile 390 and Documents tablet 768 Thank You screenshots: corresponding success headings, actions and footer visible without clipping in these views. These are scoped visual checks, not a complete production business E2E.

Actual inbox remains unconfirmed. The user said they will check; request tokens and submission time (2026-09-14 06:38 Asia/Shanghai) were supplied. No mailbox account was assumed, no received timestamp invented, no inbox-confirmation or production-gate was generated. Do not rerun the live test. Next: obtain the user's exact workflow/token receipt confirmation and receipt times, run the fixed inbox confirmation/sealer, then continue candidate preparation with a fresh independent production baseline.

### Inbox confirmation and gate sealed

The user subsequently confirmed all three emails received and correct, and specified all three displayed 06:38 Asia/Shanghai. Recorded the minute as `2026-09-13T22:38:00Z`; `inbox-time-precision.json` explicitly states that seconds are a minute representation, not observed exact arrival seconds, and raw mail headers were not inspected. No additional submission occurred.

Ran the unchanged Confirm-PrereleaseInbox script with those explicitly confirmed inputs under Windows PowerShell 5.1, then Seal-ProductionGate with the current main ordinary receipt and reconciled live evidence. Gate PASSED for eebfb029 / original run / Build. Forms RFQ, Sample, Documents all RECEIVED. Gate path: the reconciled evidence directory's `production-gate.json`; sealedAt `2026-09-13T22:41:58.9703887+00:00`. Evidence hashes: ordinary `f29b79dc08a7a3b66d7865f2c9858ba09a899be5bce0537fe809e5cad0c74577`, live `56c9112cc0b648589e64372e62005e958ebf286d0846a93554df022bcee31585`, inbox `883e05533b82871f1124520e6c5a07aefe3cfcd96e0eb9fe9d252816ff94c5aa`. Gate inventory counts are the sealer's declared release inventory, not a claim that this turn executed 177 new browser cases.

Prepared fresh baseline observation using the exact existing project observer (SHA-256 `d31dd2fe5d6f7466e3bc0f2b3c8a1175f97dbcd1f4f7bc1068dffc9da0cd453e`). SCP uploaded only that non-secret source file to `/home/deploy/tio2-incoming/main-baseline-eebfb029-3bcd6e7d.py` through the existing deploy key and pinned host key. No remote shell or observer execution occurred in that transfer. User-operated root execution of a protected, hash-verified copy is pending. This observation is within the previously authorized administrator read-only scope; it does not install an administrator generation or CMS payload. New baseline release ID: `tio2-my-main-eebfb029-20260914`.

## Fresh production baseline and actual formal package rejection

The user ran the hash-verified project observer from a root-owned copy and returned JSON plus independent stdout hash. Reconstructed exact JSON bytes including newline matched `e1bec0ccad2ca02cd691da414cb563bff77afc824f60d1a016d507be0e4cb60f`. Saved as ignored `main-baseline-20260914.json`. ObservedAt `2026-09-13T22:42:48.066743+00:00`, active frontend commit `27f0a0da59df1e54cd01eab7d77eb7024b338d42`, CMS `62426e7a28fe083e053f344b70c51a10dd0aeff79bb67da88e1f5b484bed9889`, configuration `3608b8627e8585ca3472e4fadce8216540d7b48bf62885e12ec78bf9d6e543a8`, content `768e729904f8da60f69fc7e9d5d25b5adc6aae34bfccc85c9c4e8ee5075549c0`, previousProductionReceipt `22bf25e67e150b625d43b199c7bb583f12614343bbba5284da7b1f211bffa451`.

Actually executed formal `scripts/production.ps1 -Operation Package` from clean main eebfb029, using the sealed current-main gate, original ordinary test result, exact prerelease RunRoot, independently pinned fresh baseline, and existing committed frontend development receipt. Applied `core.autocrlf=false` only to this child process's Git commands, preserving blob validation and all persistent Git settings. No CMS identity, release type or evidence was overridden.

Actual rejection:

```text
frontend packaging failed: candidate CMS differs from installed CMS
Frontend package preparation failed; no candidate was published.
PACKAGE_EXIT=1
```

The first orchestration wrapper did not propagate the child failure exit code; its text correctly showed rejection. Added explicit exit propagation only to that ignored wrapper and repeated the same offline packaging check. The formal CLI returned 1; no output directory `.production/runs/tio2-my-main-eebfb029-20260914` was created. Final `package-attempt.log` SHA-256 `aabd26154479abdeb209e7868e2abf594e1eeae2135de0490f58975dd03b59e1`. Neither call uploaded a package or invoked remote deployment actions.

This now demonstrates an actual **package admission rule** rejecting current main against the installed CMS fingerprint. It does not demonstrate a production runtime failure or prove that an old resolver could never run with the new frontend. CMS identity equality is enforced before development-receipt coverage checks; no claim is made that later packaging checks passed. Production deployment remains incomplete, with state `PACKAGE_FAILED_CMS_CONTRACT_MISMATCH`. Further progress requires a separately agreed way to satisfy or change that contract; no installer, ad hoc plugin copying, registration rewrite or gate bypass was performed.

## User-selected main prerelease content source

The user explicitly selected the main prerelease database, excluded the development database, and requested publishing website content without a production content-difference audit. Source is unchanged main eebfb0299ab8d3a4de7241211be9b6b20b9ad090, prerelease run 20260913T141505Z-eebfb0299ab8, Build ySIrLAM-ARnG6ByKql7JS. The local WordPress container project and frozen-source mount were verified before export. No development database was accessed.

Exported all 57 registered published tio2-my records using the frozen source's PHP registry and existing validators, with WP cron disabled. Export artifacts are ignored under `D:/16Wordpress_nextjs/.production/runs/20260914-main-eebfb029-preflight/main-content-source/`: `package.json` and `source-receipt.json`. Content package schema is d16-content-package-v1, files is empty, contentSha256 is bacd347767172d22c38ef92665ca484c43a8c5f6c758c436974b30a80284caa3; package file SHA-256 is 70946d96bacb7e24a1e526f42f8caf916c9f9b4d5689f23e6133791a94622c75. The standard Python validate_package accepted the schema and digest. This is an exported content input, not a tested/sealed production candidate or full SQL database dump. No isolated content-import test receipt has been generated for it.

Fresh fixed Status during this turn returned ok=true, state ROLLED_BACK, recoveryRequired=false, sharedCmsWindowActive=false; releaseCapabilities content-only=false, combined=false, frontend-only=true. This is live server evidence of unavailable content publication capability, not an inference from repository documentation. No production content write, CMS installation, capability enablement or frontend activation occurred. Status: CONTENT_EXPORTED_PUBLICATION_CAPABILITY_UNAVAILABLE. The existing administrator read-only authorization does not authorize installation/enablement; the user previously requested trying normal publication without an upgrade. Installation planning must resolve the already-present importer before any apply is proposed; do not assume the initial installer can be rerun.

## Existing installation confirmed; finalization prerequisite

User-provided root inventory confirms pending-content-runtime.json and content-hooks.json exist, content-runtime.json is absent; installation artifact 532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895 has phase completed, while 60caf1a047bbddff2d35f2de179dc38e228585699b03b3c66662a0d7b6898b44 is rolled-back. This supersedes any interpretation that the server has never installed content resources. No initial installer rerun is warranted solely by capability=false.

A fresh fixed Status still reports frontend state ROLLED_BACK, recoveryRequired=false and content-only=false. Reviewed InstalledFinalization.observe: its first release-state gate requires COMPLETED; frontend-only completion must also have frontendEnrollmentSha256 and pass identity/content verification. Thus the existing finalizer cannot yet enable this installation. No finalize-content action was attempted and no activation journal was created. Completing a compatible frontend release remains a prerequisite; the previously observed main-versus-installed CMS package rejection is unresolved. Existing installation completion does not resolve that separate frontend package admission failure.

## Explicit CMS plugin update authorization

The user subsequently instructed proceeding with the proposed production CMS plugin update to frozen main eebfb029, followed by frontend release and content publication. This supersedes the earlier no-installation authorization boundary for this specific update; no additional approval for the same scoped action is required. Main CMS artifact SHA-256 was rechecked locally as 73a9a9a0c373499460bb928a65ab979df82bd542a082da31f9e2967b910ce2ed. No CMS mutation has occurred yet. Administrator execution still depends on the user's existing root SSH terminal. The configured importer identity and original installation-config path must be observed before choosing an executable plan; no guessed paths, importer deletion or manual enrollment edits are authorized by that choice.
