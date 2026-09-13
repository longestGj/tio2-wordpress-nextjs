# tio2-my repeated CMS installation repair — local execution

User instruction: modify the local installer, finish local release-flow tests, then release to production. Business/frontend input stays at main `eebfb0299ab8d3a4de7241211be9b6b20b9ad090`; the development database is excluded. Repair branch is `codex/fix-cms-repeat-upgrade`. No production write has been performed during this repair.

## Implemented behavior

The administrator CLI accepts a registered completed installation via `--upgrade-from`. It validates the prior completion, sealed importer, actual plugin bytes, current frontend and current production receipt. Exact existing maintenance rules are reusable; foreign or modified rules remain rejected. The old importer is journalled, stopped and retained by immutable ID before replacement. Failure restores the original importer ID, plugin and PHP files. Recovery reconstructs upgrade mode from its saved plan even when the flag is omitted. New-importer verification checks the durable creation ID; legacy completed installations without that newer journal are accepted only against their completed receipt.

Known installation errors now report action/stage and the non-secret ReleaseError reason. Unexpected errors retain the generic response.

The full-content check exposed an existing metadata-contract gap: several current pages use approved frontend publication metadata rather than legacy CMS field names. Optional root-enrolled `publishedSeo` binds those expectations to the unchanged original content SEO hash. A later SEO change cannot pass against that old binding. The map generator reads exact Git inputs and requires all 57 published records. Legal pages use their dynamic CMS metadata and verify body fragments, links' visible text, table cells and action text. Restricted About evidence is rejected for separate review. The content package remains unchanged.

## Recorded local evidence so far

- Related repeated-installation/resource/backend tests: 58 passed after immutable-ID fix. Expanded regression: 204 run, 201 passed and 3 POSIX-only skips. Those three were subsequently run in a root-owned Linux container: all passed.
- Related installer/hooks/map/finalization regression after metadata additions: 77 passed. Independent final hooks/map review: 22 passed, no remaining code blocker reported. These test sets overlap and must not be added together as a unique count.
- Real WordPress/MariaDB resource rehearsal at exact `97b067e3db24348d2f6e8012700e893061469705`: PASS; successive upgrade, exact importer restoration, replacement-create failure recovery, private read-only execution tree, other scope preserved, HTTP restored. Ignored receipt: `D:/16Wordpress_nextjs/.production/runs/20260914-main-eebfb029-preflight/cms-repeat-resources-97b067e3.json`.
- Full isolated backend orchestration: first failure/rollback, first success, upgrade failure/rollback and upgrade success all passed; maintenance reopened, DB writes restored and both seeded scopes preserved. Receipt `cms-repeat-backend-rehearsal.json` uses CMS artifact revision `3d5c7e12c0d5879c7cac409b2c1d9964c4030430` and records tested development program hashes. Its frontend is a generated HTTP fixture, not real Next business acceptance. Final exact-program-byte repetition remains pending.
- Fixed frontend controller/Docker/age/Nginx rehearsal: 11 cases passed, including both new candidate generations and previous-generation rollback. Evidence: `.tmp/frontend-release/d16-front-4d4b190ede6b4d2c864393af0c3ce38b/evidence.json`. The generated frontend and synthetic mail/completion documents test mechanics only. Cleanup verified; real production mail was not sent.
- Full main package is 57 records, content SHA-256 `bacd347767172d22c38ef92665ca484c43a8c5f6c758c436974b30a80284caa3`. Real Next/installed-hooks rehearsal is still in progress. Earlier attempts exposed local dependency placement, missing isolated editorial credentials and route-probe configuration issues; they are failures, not acceptance evidence.

## Remaining gates

Complete real main-content HTTP/SEO/sitemap/refresh/recovery and inspect the screenshot; freeze the final tool revision and repeat affected full-backend verification against exact Git program bytes. Confirm the installed finalization/page-registration path supports the full package. Only then prepare the production administrator update and same-environment CMS upgrade; production final acceptance still needs its own actual receipts. No claim of `PRODUCTION_VERIFIED` is made here.
