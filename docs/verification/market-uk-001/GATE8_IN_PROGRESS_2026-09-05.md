# MARKET-UK-001 Gate 8 — HISTORICAL interim record, SUPERSEDED

> Historical snapshot only. The startup denial, unrun Playwright, old counts and pending-evidence statements below describe an earlier stage, NOT the current result. Superseded by `GATE8_FINAL_REPORT_2026-09-05.md`, `verification-results.json`, the fresh 21-test `playwright-results.json`, `runtime-matrix.json` and `EVIDENCE_SHA256_MANIFEST.json`. Preserved for audit; do not reuse its old status as final evidence.

## Workspace and authority

- Worktree: `C:/Users/longe/.codex/worktrees/609c/16Wordpress_nextjs`
- Branch: `codex/doc-reach-gate8-evidence`
- HEAD/baseline: `036ea7a8f838acd93ef2f68865b9d6683d123cff`
- UK and shared-Chrome edits remain uncommitted. Worktree is NOT clean.
- Only the UK Market body is added. No Application pages, production writes, deployment, publishing, indexing, DNS or Gate 9/10 approval.

## Shared implementation

`024f171` and `73cbcf7` are already ancestors. They do not implement the newly confirmed modal-menu baseline, so no cherry-pick or duplicate implementation was used.

The sole `MalaysiaGlobalHeader` now uses a native dialog, approved Menu Logo, Close-first focus, Tab wrapping, Escape/cancel return, scroll-lock restoration and desktop-breakpoint closing. Mobile horizontal Logo CSS is 120 × 40. Navigation/configuration, current markers, fixed RFQ and Footer source are retained. No UK-specific Header/Footer or alternate asset was introduced. Props remain the shared minimal `chrome`, `currentPageId`, `sourcePageId` contract.

These changes have unit coverage but browser/top-layer/visual behavior is NOT yet verified. All consumers must share the same component, configuration and CSS; page CSS must not override Chrome internals. Home, Markets, Products, UK and DOC-REACH regression cases are authored in the UK browser suite.

## Fresh checks in this continuation

| Check | Result |
| --- | --- |
| Shared modal red test, before implementation | Failed because dialog was absent, as expected |
| `npm test -- --run tests/unit/markets tests/integration/markets tests/integration/api/revalidate.test.ts tests/unit/rfq tests/unit/homepage/malaysia-template.test.tsx tests/unit/homepage/malaysia-styles.test.ts` | 31 files / 185 tests PASS |
| `npm run typecheck` | exit 0, including the new browser test source |
| Scoped `npm run build` with SITE_ID=tio2-my, NEXT_DIST_DIR=.next-market-uk-001 and loopback CMS 4024 | exit 0; UK route generated as dynamic server-rendered route |
| PHP isolated resolver executable test | PASS: 7 negative cases, valid payload, 20 conservative route states, String! contract |
| `git diff --check` | exit 0; Git emitted only LF/CRLF normalization notices |
| ESLint over changed/new TS, TSX and MJS files (excluding generated GraphQL output) | exit 0, 0 errors / 0 warnings after removing an unused test import |
| Playwright / viewport / screenshot / axe | NOT RUN: application server startup rejected by execution policy |

Build-generated UK tsconfig include entries were removed after the check, preserving the original tracked configuration. Build is a local compilation, not deployment.
Typecheck was rerun after restoring tsconfig and removing the unused test import: exit 0. `git diff -- tsconfig.json` is empty.

## Environment blocker

Starting the already built local Next server on 127.0.0.1:3015 was rejected with `blocked by policy`. No alternate shell, process launcher or test-runner route was used to bypass that denial. Read-only port inspection confirmed 3015 was not listening. Therefore `http://localhost:3015/markets/united-kingdom/` is only the intended preview URL, NOT a verified running preview.

The controlled CMS fixture was successfully started on loopback 4024/4025 (process 55352 at inspection). It is test data, not a seeded production or real WordPress instance. The main server must be permitted/started before browser evidence can be collected. The authored browser command is `npx playwright test --config playwright.market-uk.config.ts`; do not treat an unexecuted command as evidence.

## Pending evidence and release blockers

- Fresh 1440/768/390 screenshots, logo pixel checks, modal accessibility, 200% reflow, keyboard, axe, RFQ interaction, route ledger and actual rendered metadata/JSON-LD remain pending. No screenshot hashes exist for this run.
- Shared Chrome desktop/mobile marker, dimensions, Footer collision and cross-page browser regression remain pending.
- Application Hub and five Application targets are not implemented in Malaysia; retain approved anchors and release blockers, never create substitutes or cross-scope fallback.
- Actual Malaysia WordPress record/route readiness, real form delivery and release-day official-source freshness are not established by fixture/unit tests.
- UK-G1-04/05 and UK-G6-B01/B02/B03 cannot be closed by this partial report. UK-R01–07 boundaries remain applicable.
- No final commit, clean-tree claim, Gate 8 completion, Gate 9 PASS or Gate 10 authorization is asserted.

## Modified areas

- UK route, body component/CSS, SEO/JSON-LD.
- UK immutable CMS contract, DTO/types/query, schema/codegen and guarded local-only seed; shared PHP registration/webhook.
- Scoped cache/revalidation, approved UK route normalization, RFQ source/market prefill.
- Sole shared Chrome TSX/CSS; jsdom modal support and menu tests.
- UK unit/integration/PHP tests, controlled CMS fixture, Playwright configuration and browser tests.
- Implementation plan and this provisional evidence record.
