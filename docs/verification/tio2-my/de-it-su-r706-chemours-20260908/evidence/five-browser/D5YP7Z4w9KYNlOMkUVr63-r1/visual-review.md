# Five-page browser review — current local candidate

- Site: `tio2-my`; frontend `http://127.0.0.1:3236`; read-only CMS query endpoint `http://127.0.0.1:8187/graphql`.
- Build: `D5YP7Z4w9KYNlOMkUVr63`; build directory `.next-five-fixed`; date: 2026-09-08.
- Reviewer: D16 delegated technical reviewer `/root/sulfate_intake`.
- Result: **6/6 E2E tests passed in 34.9 s; all 57 generated PNGs actually opened; no additional visual defect observed within the stated coverage.** This is D16 technical self-check, not independent Gate 9 approval or authorization to publish.

## Actual visual evidence

Inspected 15 full-page screenshots (five pages at 1440, 768 and 390 CSS px), 15 Cookie dialog screenshots, 15 main keyboard-focus screenshots, ten mobile-menu screenshots and two anchor-target screenshots. `visual-review.json` lists every inspected filename and independently reverified SHA-256. Per-page runtime JSON retains the original raw-capture `PENDING` flag; this separately signed-by-role review record supplies the actual inspection result without rewriting runtime observations.

Full-page images were viewed as scaled overviews, sufficient to inspect layout, hierarchy, wrapping, section order and gross clipping; this is not a pixel comparison or every-character visual reading. Viewport images were inspected directly for legible text, visible focus, menu current state and dialog fit. Exact body copy and link inventory were separately checked against generated contracts in SSR.

- Germany keeps the dark hero, three application cards and destination-specific brief; Italy keeps the pale hero/action panel, distinct sector cards and Certificate of Origin boundary. All sections remain present across widths.
- Sulfate keeps the process explanation, five ordered Grade rows (M-996, M-2196, M-108, M-52, M-2377), evaluation routes and RFQ boundary. Mobile rows stack without hiding Grade links.
- R706 keeps six sections, the source context and TS-6706 announcement scope, followed by buyer-selected Grade actions. Chemours keeps six sections, the evaluation brief and independence statement. Neither acquires direct Grade mapping/prefill from the probe query.
- All desktop footer logos are now loaded and visible. Headers measure exactly 84 px at 1440 and 64 px at 768/390, with no horizontal document overflow.
- Menus show Markets for DE/IT, Products for SU and Resources for alternatives; keyboard focus is visible. Open/close, focus containment and Escape return passed. Main focus and both anchor-target focus states are visible without clipping.
- All 15 Cookie screenshots show a legible navy title, white dialog, sentence-case buttons and visible Close focus. Computed title contrast is approximately 13.96:1. Open-dialog and closed-dialog/page Axe scans contain no serious or critical violations. Dialog focus containment and Escape return passed.

The preceding build `olH5kVkkyEhmfGAHQ_2SJ` is retained as superseded evidence. Its white-on-white Cookie title was a real visual defect despite the older 6/6 automated result. This build supplies fresh verification of the parent's correction. The initial footer-logo omission was a lazy-loading capture issue corrected by scrolling the footer into view and waiting for complete images before full-page capture.

## Runtime and dependency results

All five real CMS records matched their exact generated contract and sole `tio2-my` scope. All five pages returned HTTP 200 with the current build marker; title, description, H1, module count, body text, links, query-copy boundary, noindex/nofollow and schema assertions passed. DE/IT body action context is destination-specific; SU body action context contains only its source page ID. The five routes are absent from sitemap.

SU CollectionPage / BreadcrumbList / five-position ItemList passed. R706 D01 / AC10 remains unresolved because approved canonical mapping is absent: its URL-bound graph is withheld and `schemaType: none` is preserved. Chemours schema remains conditional and withheld. These are acceptance dependencies, not resolved by browser success.

The only internal body destination returning non-200 was SU `/applications/` (404). All five SU Grade paths returned 200, and all other tested internal body destinations returned 200. HTTP 200 is an observed runtime response, not release approval. Shared navigation/footer destination acceptance is outside this body-link inventory.

All five pages recorded zero JavaScript exceptions, zero failed browser requests and zero intercepted external/write requests. Each page recorded two CSS preload warnings; exact warning text remains in runtime JSON. No real form submission occurred. Read-only GraphQL POST queries were performed outside page routing; all browser writes and external requests were prohibited by the harness.

## Limits and reproducibility

Chromium desktop engine only; DPR 1 at 1440×900, 768×900 and 390×844. Native browser zoom, real-device Safari/Chrome, screen readers, complete keyboard traversal, live external-source reachability and actual form delivery were not tested. Frozen-input parity is supported by the separate intake/builder checks; this record does not claim automated pixel identity with frozen references.

Run `tests/e2e/editorial-five.spec.ts` with `.tmp/five-playwright.config.ts`, `FIVE_RUNTIME_READY=1`, `FIVE_NEXT_DIST_DIR=.next-five-fixed`, `FIVE_WORDPRESS_ENV_FILE=.tmp/.env.five` and a fresh build-bound `FIVE_EVIDENCE_DIR`. No credential is stored in this evidence. Final scoped ESLint completed with exit 0 after the passing run; no production code or CMS record was edited by the browser reviewer.
