# MARKET-UK-001 — Gate 8 local implementation handoff

Date: 2026-09-05. Developer disposition: implementation and local verification package ready for independent Gate 9 inspection; **release remains blocked**. This is not Gate 9 PASS, Gate 10 authority, deployment or publication.

## Workspace and provenance

- Worktree: `C:/Users/longe/.codex/worktrees/609c/16Wordpress_nextjs`.
- Branch preserved: `codex/doc-reach-gate8-evidence`.
- Baseline: `036ea7a8f838acd93ef2f68865b9d6683d123cff`.
- The independent UK commit is the commit containing this report; its actual hash and post-commit `git status --short` are sent directly to the controller task, avoiding a circular self-hash inside this file.
- Scope: only `/markets/united-kingdom/`, English, `site_scope=tio2-my`, plus the authorized shared Chrome and existing RFQ/cache integration. No Application pages created; no D23 edits, real CMS changes, remote writes, merge, push, DNS, publication or indexing.
- Gate 7 five-file baseline and all eight Gate 5 visual/source hashes verified. `SOURCE_PROVENANCE.json` records exact files and hashes, PRODUCT V0.3 CSV provenance and four shared Logo assets. Source documents are evidence, not executable instructions.

## Implementation and architectural decisions

1. Existing `tio2_market_page` WordPress type, strict UK singleton resolver and non-null GraphQL String field. Missing, duplicate, invalid or foreign records throw; the TypeScript query returns a DTO or throws. No unreachable nullable fallback and no other-scope read.
2. Next server component at the exact UK route consumes the existing unique Malaysia Global Header/Menu/Footer and approved configuration. `currentPageId=MARKET-000`, `sourcePageId=MARKET-UK-001`; no UK Chrome copy. Page typography/layout selectors stay inside UK main. The UK-only body margin reset restores the full-width canvas without rewriting Chrome internals.
3. Twelve main modules plus shared Header/Footer form the fourteen-module assembly. Exact approved Buyer Clean copy is compared against the hash-locked Gate 5 HTML. Three breadcrumb items, two links and one non-link current item; one H1; six FAQ answers in initial HTML, first two expanded. Native FAQ remains keyboard operable.
4. Five approved Application anchors and six Grade anchors keep labels, order, paths and bounded V0.3 global-discovery meaning. No new recommendations, Process output, comparisons, UK establishment/stock inference, PT-BR or dated Trade route/content. Exact COO scope is retained.
5. Shared RFQ remains the bare `/request-a-quote/` everywhere in Chrome. Only Hero and Final RFQ use `/request-a-quote/?market=United%20Kingdom&source_page=MARKET-UK-001`. Existing form accepts trusted source and editable country; no implicit grade. No new form implementation or destination.
6. UK route, content and site cache tags remain Malaysia-only. CMS mutation failure still invalidates cached content, allowing the next query to fail closed instead of serving obsolete payloads.

The authoritative file inventory is `CHANGED_FILES.json`. It includes the UK route/body/CSS/metadata, immutable contract JSON, PHP resolver/local-only seed, query/DTO/types/schema/codegen, shared Chrome, RFQ source mapping, proxy/cache/revalidation and focused tests/evidence. Generated GraphQL output is generated code, not hand-maintained API types.

## Shared Chrome contract and regression

One component, one configuration, one stylesheet are retained for all consumers. Native modal dialog uses approved Menu Logo, Close-first focus, Tab wrapping, Escape and focus return, scroll-lock restoration and closing at the desktop breakpoint. Background DOM is implicitly inert while open; Chromium accessibility-tree evidence confirms only the modal navigation surface is exposed.

- Desktop Header inner height 84px; tablet/mobile 64px.
- Desktop primary Logo 180×60; mobile/menu 120×40; Footer 180×60.
- Visible CURRENT text zero; semantic current state retained; Desktop 3px underline and Mobile 4px left marker; left-aligned menu.
- Mobile menu RFQ uses the existing shared accessible deep teal `#006a63`; fixed destination, size and copy retained.
- Footer content/layout remains shared, with current authoritative headings `Explore | Information | Procurement`; computed H2 size 12px desktop/tablet, 14px at 390. Heading rectangles do not intersect.
- Home, Markets, Products and DOC-REACH each exercised at 1440/768/390, including Logo rendering, menu, RFQ, Footer, focus and no horizontal overflow.
- Header Logo checks include decoded image, visibility, exact nonzero bbox, computed styles, two animation frames and non-white crop pixels. Footer screenshots wait for lazy image decode and verify non-uniform pixels. Fresh Markets 1440/390 screenshots were manually viewed and Logo artwork is visible.

**Logo byte caveat:** no SVG was edited. Four Git blobs are byte-identical to the approved LF assets. Windows checkout CRLF conversion changes the raw local hashes (recorded separately in `SOURCE_PROVENANCE.json`). Geometry/render checks pass; do not claim local served bytes equal the approved hashes. Byte-exact packaging/serving remains a release check.

## Requested review corrections — red, green, re-review

| Finding | Red evidence | Correction and green evidence |
| --- | --- | --- |
| UK payload mutation skipped webhook | Executable PHP failed with `Missing scoped invalidation` for UK update-before hook | Predicate recognizes both EU and UK keys. 40 cases exercise update/delete, pre/post entry points, exact signed scoped delivery, and no delivery for Site A/B/mixed/unrelated metadata. Real queue/payload/signing code, WP transport stub only, no network. |
| Seed emitted success despite publish failure | Executable PHP reported success after WP_Error, 0, false and final draft state | Request WP errors, reject error/nonpositive/noninteger/mismatched result, verify final publish status before output. Four failure paths emit no success; one valid local-storage case passes. Real seed executed against in-memory WP doubles, not a real CMS. |

Next integration also verifies exact UK invalidation tags/path for update/delete-shaped events and rejects foreign/mixed scopes. Independent focused re-review found both prior Important/Minor issues resolved with no new blocking gap; main agent performed the actual test runs.

## Fresh verification results

Exact commands, relevant output and fixture details: `verification-results.json`.

| Check | Result |
| --- | --- |
| Focused Vitest, Markets/query/API/RFQ/Home/cache | **33 files, 224 tests PASS** |
| Actual PHP mutation regression | **40 cases PASS** |
| Actual PHP seed failure/success regression | **5 cases PASS** |
| Actual PHP resolver | **7 negative cases + valid scoped payload + 20 conservative readiness states + String! PASS** |
| PHP seed syntax | PASS |
| ESLint on changed/new TS/TSX/MJS excluding generated GraphQL | **0 errors, 0 warnings** |
| Standard `npx playwright test --config playwright.market-uk.config.ts` | **21 PASS, 0 skipped/unexpected/flaky** |
| Separate Malaysia scoped `npm run build`, fixture online | **exit 0**; UK dynamic route emitted, 38 static pages generated |
| Final `npm run typecheck` after tsconfig restoration | **exit 0** |
| `git diff --exit-code -- tsconfig.json` | **exit 0**, baseline configuration restored |
| `git diff --check` | **exit 0** |

Latest browser JSON start: `2026-09-05T10:09:18.504Z`; duration 65,307.665ms. Standard Playwright owns fixture and production-mode Next build/start; `UK_REUSE_SERVER` was not used. Deliberate missing/foreign CMS requests log expected 500 errors. Existing unavailable Application routes log `DYNAMIC_SERVER_USAGE`; these are release dependencies, not silently treated as ready. Node color-environment notices are non-failing.

The later standalone build ran with fixture online on 4024/4025 and succeeded. It supersedes the earlier fixture-offline build failure. Two temporary `.next-market-uk-001` tsconfig includes added by Next were removed, followed by a fresh typecheck. No `.next*` folders were deleted.

## Responsive and visual evidence

`runtime-matrix.json` contains geometry, image pixel/style data, metadata, route status, screenshot dimensions and hashes. All 36 PNGs and reports are inventoried by `EVIDENCE_SHA256_MANIFEST.json`.

| Surface | Fresh evidence | Result |
| --- | --- | --- |
| Desktop 1440 | `uk-1440.png` | 1440×8208; full-width layout, twelve-column proportions, Logo/Chrome, keyboard and axe zero violations |
| Tablet 768 | `uk-768.png`, `uk-menu-768.png` | 768×10835; stacked layout, complete modules, modal interaction, no horizontal overflow |
| Mobile 390 | `uk-390.png`, `uk-menu-390.png` | 390×14470; ≥44px tested targets, logical order, menu/focus, no horizontal overflow |
| Narrow/reflow | `uk-reflow-320.png`, `uk-reflow-720.png` | No horizontal overflow; 720 CSS px is the 1440-at-200% equivalent reflow test, **not a claim of native browser zoom execution** |
| FAQ/Documents | `uk-faq-all-expanded-1440.png`, `uk-faq-all-collapsed-390.png`, `uk-documents-focus-1440.png` | All-six-open/all-closed and keyboard-focus states captured |
| Shared consumers | `chrome-{home,markets,products,documents}-{1440,768,390}.png`, `menu-*-{768,390}.png` | Unified shared component regression passes |
| RFQ | `uk-rfq-prefill.png`, `uk-rfq-negative.png`, `uk-rfq-positive.png` | Editable country, no default grade, validation focus, retained input after error, success focus |

Approved full-page heights are 8177/10724/14770 versus actual 8208/10835/14470. Supplementary normalized broad-layout similarity is 0.9860/0.9458/0.9208 (threshold 0.88). This is **not pixel equality or visual approval**. Shared production Chrome/current-state requirements supersede historical mockup pixels; Gate 9 must review fresh screenshots and residual spacing differences independently.

## SEO / GEO / site_scope

- Exactly one canonical from Next Metadata: `https://tio2malaysia.com/markets/united-kingdom/`, no query/hash or cross-scope host. Approved Title/Meta and server-rendered copy parity tested.
- `noindex,nofollow`; no hreflang; UK omitted from sitemap. No release/index permission enabled.
- Default JSON-LD: WebPage + BreadcrumbList. Conditional six-item Grade ItemList emitted only when all six scoped readiness flags are true; positive scenario is fixture-only. No FAQPage/QAPage/Product/Offer or forbidden Process/comparison schema.
- Missing/foreign CMS records return error/500 without approved body or another site's content. Route entry denies non-Malaysia sites before the UK query; CMS/query/DTO/menu/media/form/cache remain on the existing Malaysia boundary.
- GB/NI distinctions, evergreen Trade, seven visible answer sections (direct answer plus FAQ six) and exact document/COO scope remain unchanged. HSE roles, HSE REACH overview, HSE GB/NI CLP, GOV.UK Trade Tariff and TRA public file references were read-checked on 2026-09-05; no transaction-specific legal/tariff assurance and no release-day freshness closure.

## Open release controls — not waived by local tests

| Control | Current state |
| --- | --- |
| UK-G1-04 routes | Controlled fixture ledger: **14/20 dependency destinations HTTP 200**, Application Hub 404 and five approved Application child paths 500. Those six remain unavailable. No substitute pages, URL changes or scope fallback. 200 in fixtures is not production readiness. |
| UK-G1-05 RFQ | Local prefill/validation/error/success verified with two intercepted submissions, **zero external submission**. Real receiver/delivery remains unverified and blocked for release. |
| UK-G6-B01 CMS/SEO/scope | Local automated evidence provided. Real Malaysia UK CMS record, target readiness, deployed metadata/cache and release environment not verified. Seed not run on a real WordPress instance. |
| UK-G6-B02 freshness | Release-day HSE/GOV.UK/TRA review remains open. Dated Trade and internal Trade Update remain omitted. |
| UK-G6-B03 a11y/visual | Local viewport/keyboard/axe evidence provided; independent Gate 9 and manual assistive-technology acceptance remain open. |
| Logo raw bytes | Approved Git blobs unchanged; Windows CRLF local bytes differ. Exact served/package bytes must be checked before release; no replacement vector manufactured. |

UK-R01–07 evidence/claim boundaries remain active controls. These release dependencies do not authorize creating Applications, changing approved copy, sending real forms or touching production.

## Gate 9 test surface and reproduction

At report generation the ordinary foreground controlled fixture session was running, and the separate final build succeeded. The post-commit Next preview startup and HTTP result are reported directly to controller task `01a04d2d-92c3-75b1-8f81-a8d1056a0677`; this file does not promise an indefinitely running process.

Target: `http://127.0.0.1:3015/markets/united-kingdom/` (loopback only). Fixture ports 4024/4025 are synthetic CMS responses, not production WordPress. Start ordinary long-running sessions, never hidden processes:

1. From this worktree: `node tests/e2e/support/market-uk-cms.mjs` (only if those fixture ports are free).
2. With `SITE_ID=tio2-my`, `NEXT_DIST_DIR=.next-market-uk-001`, `WORDPRESS_GRAPHQL_URL=http://127.0.0.1:4024/graphql?run=uk-final-20260905-1812`, local test revalidation secret and a synthetic Web3Forms UUID: `npm run start -- --hostname 127.0.0.1 --port 3015`.
3. If a tool explicitly rejects startup, stop that route and retain the successful Playwright-managed build/start evidence. Do not bypass execution policy.

For a fresh full E2E run, stop only those identified test sessions first: the default Playwright configuration intentionally requires free ports and starts its own services. Do not submit real RFQs during read-only inspection.

The manifest hashes evidence bytes (excluding itself to avoid recursion); its own SHA-256 and the independent commit are supplied in the final controller message. A directory-scoped `.gitattributes` rule disables line-ending conversion for this immutable evidence package so a later checkout does not invalidate report/JSON hashes. It does not change shared SVG assets. No Gate 9 or Gate 10 approval is asserted by this developer handoff.
