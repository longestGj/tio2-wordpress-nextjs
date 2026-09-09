# Candidate E2E test correction

Date: 2026-09-09. Test-only commit: 6857888eacdbf8e99f1ea1ce1dcd7e1eadc671f4. Production source: 525ee53c157dbd24cd17dff97463738a390b6676. Worktree: D:/16Wordpress_nextjs/.worktrees/prerelease-web3forms-guards. Site: tio2-my.

Held runtime identities supplied and retained by controller: valid 127.0.0.1:3186 / Build 8fDGe425umf-_pofkBw5o; malformed 127.0.0.1:3187 / Build IWCqHluSknZ4ZqaH70Y6w. Both builds remain on production source 525ee53. The sole tracked correction changes tests/e2e/web3forms-guards.spec.ts, six lines added and six removed. No production code, routes, copy, provider behavior or environment changed.

Systematic debugging traced initial actual-app failures to test assumptions. Root RED evidence: .local-evidence/web3forms-guards/valid-e2e.log (5 failed / 1 passed) and malformed-e2e.log (1 failed / 2 passed). The RFQ page intentionally lacks the data-site-scope attribute used by the other pages; its existing workflow heading supplies the page identity. Actual RFQ, Sample and Thank You paths omit the trailing slash, while Documents retains it. The failed tests assumed a universal DOM attribute and literal trailing-slash equivalence.

A controlled probe, `node .local-evidence/web3forms-guards/diagnose.mjs`, reproduced the page identities and normalized paths, and observed all three workflows entering their real Thank You panels after exactly one locally fulfilled POST and zero other writes. It logged safe counts/stages/public paths only; see diagnose-safe.log. The corrective spec now checks each existing workflow heading and compares trailing-slash-normalized pathnames. All original transport, privacy, unavailable, provider rejection and Thank You assertions remain.

## Covering checks

Run from the task worktree:

- Set TIO2_MY_BASE_URL=http://127.0.0.1:3187 and WEB3FORMS_TEST_CONFIGURATION=malformed; `npx playwright test --config .local-evidence/web3forms-guards/playwright.config.ts --grep "rfq unavailable"` — 1 passed, after the isolated page-identity fix. Evidence correction-rfq-identity-green.log.
- Set TIO2_MY_BASE_URL=http://127.0.0.1:3186 and WEB3FORMS_TEST_CONFIGURATION=valid; `npx playwright test --config .local-evidence/web3forms-guards/playwright.config.ts` — 6 passed. Evidence correction-valid-green.log. RFQ/Sample/Documents acceptance and rejection are all covered.
- Set TIO2_MY_BASE_URL=http://127.0.0.1:3187 and WEB3FORMS_TEST_CONFIGURATION=malformed; `npx playwright test --config .local-evidence/web3forms-guards/playwright.config.ts` — 3 passed. Evidence correction-malformed-green.log. RFQ/Sample hide unusable forms; Documents keeps existing retry state; zero provider requests for malformed configuration.
- `npx eslint tests/e2e/web3forms-guards.spec.ts` — exit 0, no output.
- `npx tsc --noEmit` — exit 0, no output.
- `git diff --check` — exit 0. Commit completed; tracked worktree clean.

All named logs are in .local-evidence/web3forms-guards/. Each test fulfills provider POSTs locally, blocks every other non-GET and foreign-origin GET, blocks provider DNS, disables trace/video/screenshots and closes filled pages before failure artifact collection. Six successful test scenarios each count exactly one simulated provider POST; three unavailable scenarios count zero. No real provider request or actual receipt is claimed.

## Visual verification

Separate authorized public-state captures used only the held candidate runtimes and intercepted synthetic submissions. Each capture required no form elements and no private text, and captured only unavailable pages or Thank You pages. Four captures have been independently viewed and accepted by controller: visual/rfq-unavailable-1440.png, visual/sample-unavailable-1440.png, visual/rfq-accepted-1440.png, visual/sample-accepted-1440.png.

Documents visual resolution: controller reopened documents-accepted-1440-ready.png by itself and confirmed complete hero heading, footer links and copyright. Both 1440 files are byte-identical SHA-256 9014050969a98f987fb6e044586ac45a7148dfaf5a7d209676c6a2c42aeb9011. The earlier incomplete appearance was an ambiguity in the batched five-image tool display, not a file or runtime defect. The provisional incomplete-capture interpretation is withdrawn. All five public-state images are now independently accepted by controller; documents-accepted-1440-ready.png is the designated Documents evidence. No production changes or image editing were used.

While that display ambiguity was investigated, an additional public browser capture documents-accepted-1366-stable.png was generated with network-idle, lazy-asset, font and scroll stabilization and viewed alone. It is supplemental only; the five designated accepted images remain the evidence set. Earlier files are preserved. No further recaptures are needed.

Scoped re-review belongs to controller. No rebuild, merge or runtime lifecycle operation was performed by implementer for this correction.
