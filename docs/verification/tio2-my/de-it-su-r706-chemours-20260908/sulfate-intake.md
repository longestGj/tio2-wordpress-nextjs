# PRODUCT-PROC-SU approved intake audit

Date: 2026-09-08. Scope: read-only source/implementation audit; no production code, CMS, D23, release or approval-state mutation. Worktree: `D:/16Wordpress_nextjs/.worktrees/de-it-su-r706-chemours-gate8`; branch `codex/de-it-su-r706-chemours-gate8`; baseline `84db14e`. This file is intake evidence, not implementation acceptance.

## Authority and identity

- Site `tio2-my`, EN, page `PRODUCT-PROC-SU`, route `/products/sulfate-process-titanium-dioxide/`, canonical `https://tio2malaysia.com/products/sulfate-process-titanium-dioxide/`.
- Dispatch `G8-DE-IT-SU-R706-CHEMOURS-20260908-01`: `D:/23MySec/docs/architecture/GATE8_DE_IT_SU_R706_CHEMOURS_AUTHORIZATION_AND_DISPATCH_V1.0.md` authorizes development/self-check/evidence; excludes merge, deployment, production write, Gate 10, DNS and indexing.
- Unique package `D:/23MySec/pages/products/sulfate-process/06_handoff/PRODUCT-PROC-SU_GATE6_HANDOFF_PACKAGE_V0.1.md`, `PRODUCT-PROC-SU-G6-HANDOFF-01`, 32,938 bytes, SHA-256 `343a220cb92d058a6c8914c4e30af405d619076b14ec96eb06a2e59ef0b7f192`. Entire package read, including all 16 acceptance IDs and eight dependencies.
- Current Manifest `D:/23MySec/pages/products/sulfate-process/PRODUCT-PROC-SU_CURRENT_GATE_BASELINE_MANIFEST_V0.11.md`, SHA-256 `4f88ba9dca86467646ff60918f0edc0d6f1ee028b37dadcac40a7f55588ede2c`; read chain V0.11 → Gate 6 delegated closure → V0.9 → V0.8 / Gate 4 approval → V0.6. V0.11 and `SU-G6-DELEGATED-CLOSE-01` approve the immutable package despite its retained draft footer. Dispatch supersedes the older “Gate 8 not authorized / HANDED_OFF=NO” historical state without altering those sources.
- B V0.2 is sole public copy authority. C V0.1 retains a stale B V0.1 pointer and permits process-topic editable context; Gate 6 explicitly binds B V0.2 and the stricter source-only conversion context. Use the Gate 6 exact mapping, not historical alternate copy/context.

## Public content and data contract

Five body modules only, after Breadcrumb and before shared Footer:

1. Hero: H1 `Sulfate Process Titanium Dioxide`; primary `Explore Sulfate Grades` → `#sulfate-grades`; secondary `Request a Quote` → `/request-a-quote/`.
2. `What the Sulfate Process Tells You`: exact B paragraphs; FTC general-process source; visibly emphasized `Source last reviewed:` followed by `6 September 2026.`. FTC label is `U.S. Federal Trade Commission public decision record`; URL `https://www.ftc.gov/system/files/documents/cases/docket_9377_tronox_et_al_initial_decision_redacted_public_version_0.pdf`. Following period is outside anchor hit/focus boundary.
3. `Explore Sulfate Grades`: anchor `sulfate-grades`, introduction, five equal entries, closing qualification. Order is mandatory: **M-996 → M-2196 → M-108 → M-52 → M-2377**.
4. `Continue Your Evaluation`: `Review by Application` / `/applications/`; `Request Product Documents` / `/request-documents/`; `Compare Production Routes` / `/resources/chloride-vs-sulfate-titanium-dioxide/`. Exact action labels and all paragraphs come from B/package, not generic templates.
5. `Request a Quote`: exact B text, action then after-submit human review paragraph. No response-time, availability or delivery promises.

| Position / page ID | Label and exact href | Exact application summary |
|---|---|---|
| 1 / GRADE-M996 | View M-996 → `/products/m-996/` | Documented for evaluation in industrial coatings, powder coatings, and exterior or interior architectural coatings. |
| 2 / GRADE-M2196 | View M-2196 → `/products/m-2196/` | Documented for evaluation in solvent-based furniture and industrial paints. |
| 3 / GRADE-M108 | View M-108 → `/products/m-108/` | Documented for masterbatch and compounds, polyolefin and PVC film, and plastics requiring high thermal stability. |
| 4 / GRADE-M52 | View M-52 → `/products/m-52/` | Documented for printing inks, can coatings and high-gloss interior architectural coatings. |
| 5 / GRADE-M2377 | View M-2377 → `/products/m-2377/` | Documented for evaluation across coatings, plastics, masterbatch, printing inks and paper. |

WordPress must represent/read back exact page identity, locale, slug/path/canonical, title/meta/H1, five modules, source URL/date and five ordered Grade relations. Relation records carry stable identity/order, not derived application flags or ranking. No Rubber, Specialty Materials, CR-901/Chloride membership, default/preferred/recommended Grade, replacement/equivalence, process-derived performance or M-996/M-2196 hidden differentiator. Approved prose contains negative qualifiers such as “without ranking”; forbidden-semantic tests must distinguish these from actual ranking data.

All approved actions remain visible. Gate 6 provides no hide/disable substitute when a target is unavailable. Record target failure as dependency/release blocker, never invent a substitute destination or remove the approved action. Missing/wrong-scope/incomplete/stale page records must produce an explicit diagnosable failure; no global/cross-site/other-route/static fallback. An incomplete/reordered five-Grade relation set is a page-contract error.

RFQ carries only internal `source_page_id=PRODUCT-PROC-SU`; no Grade, Application, quantity, destination or visible process context prefill. Documents carries source only, with no Grade/type prefill. Exact outgoing path remains the approved path; query or trusted context mechanics need source-only validation. Plain data attributes do not transfer context on their own. Receiver evidence is separate: RFQ explicit accepted/queued acknowledgment, preserved input and safe retry; Documents one required structured Grade plus multiple types, free-text supplemental Grades and honest human-review-only receipt with real binding/readback.

## SEO / Schema

- Title: `Sulfate Process Titanium Dioxide Grades | TiO2 Malaysia`.
- Description: `Explore five Malaysia-origin sulfate process titanium dioxide Grades by application, then review product details, request documents or request a quote.`
- One canonical and same meaning in OG/Twitter. No separate sulphate route.
- Exactly one CollectionPage, one BreadcrumbList (Home → Products → current canonical), one ItemList with `numberOfItems=5`, positions 1–5 and canonical Grade URLs in visible order.
- No Product, Offer, AggregateOffer, FAQPage, QAPage, HowTo, comparison outcome, availability, price or inferred Grade property. Product hub's FAQ builder and resource comparison Article graph cannot be reused unchanged.
- Development does not grant indexing; preserve site release/noindex controls and avoid adding sitemap authorization.

## Frozen visual and interaction input

Exact freeze `SU-G4-COMPLETE-V01-F01`, workset `SU-G4-COMPLETE-V01`; HTML plus `visual-direction.css` both apply. Read HTML/CSS, input index and source-freeze. Opened and visually inspected actual `approval_core/1440-full.png`, `768-full.png`, `390-full.png`; these were displayed scaled as complete-page overviews, not original-scale detailed QA. Their layout is horizontal equal Grade rows on desktop, Grade label/description-and-action columns at tablet, single-column entries/actions at mobile. Freeze has no illustration or extra body media.

- Required viewports 1440×900, 768×900, 390×844, DPR1. Reference full heights 3544 / 4420 / 5407. Formal set 36 images: three full, 18 continuous readable segments, 15 states. State/native-scale image review remains implementation QA work.
- Main width max1120px; desktop sections 48px 56px; tablet at max1100px 44px 32px; narrow at max600px 36px 20px. Body 17px/1.7, mobile16px. H1 48/42/36px; H2 32/28px; H3 23px, 600 weight. Hero intro20px/1.65, mobile18px.
- Main text #334155, headings #062B5B, pale hero/final #F5F8FB, borders #D9E2EC, functional teal #008078, decorative teal #00A99D only. Action radius6px, min-height50px; applicable targets ≥44×44.
- Grade rows desktop columns130px/1fr/158px and24px gap; tablet110px/1fr; mobile stack. Evaluation desktop230px/1fr, tablet180px/1fr, mobile stack. Preserve equal emphasis, not cards/ranking cues from another page.
- Anchor is focusable H2 with tabindex -1 and scroll-margin; test pointer, keyboard, direct fragment including no JS. Page must not lose focus or obstruct content.
- Production Inter must come through shared existing font pipeline, not a copy of freeze TTF. Freeze logos are evidence copies: use shared production logo paths. Primary180×60 desktop,120×40 narrow; Footer180×60 all widths.
- Products is active shared navigation (`currentPageId=PRODUCT-000`) while source attribution remains PRODUCT-PROC-SU. Header84/64px. Legal order Privacy EN, Privacy BM, Cookie Policy, Cookie Settings; no Terms. Shared Consent owner current `no_optional_analytics`; no page-private storage/prototype consent code.
- `window.localNavigation` is simulation, must not ship. Shared Menu: state/ARIA, initial focus, both-direction containment, background isolation, Escape/selection close, breakpoint cleanup, trigger return. Cookie analogous dialog/focus/state/persistence. 200% native zoom, non-Chromium and touch/proxy remain actual evidence obligations.

## Existing architecture and safe reuse recommendation

No existing Sulfate/process aggregation renderer or CMS record was found in baseline source. `app/(en)/products/[familySlug]/page.tsx` supports only approved Malaysia Grade slugs with `dynamicParams=false`; Sulfate must not be slipped into the Grade registry. A dedicated exact static route is the smallest safe integration, site-gated to tio2-my; Site A/B behavior must remain unchanged.

Useful patterns, relative to worktree:

- `wordpress/plugins/tio2-site-model/includes/product-hub-v01.php`, `wordpress/seed/apply-tio2-my-product-hub.php`, `lib/wordpress/product-hub-v01-{queries,dto,types}.ts`: scoped singleton CMS, immutable approved contract validation, explicit missing/duplicate errors, readback, deterministic JSON DTO. Adapt to a new scoped process record/field and exact package identity rather than overwriting hub or Grade records. A dedicated JSON model is allowed; package prescribes semantics, not CPT/plugin/API.
- `lib/wordpress/cache-tags.ts`, `app/(en)/api/revalidate/route.ts`, `wordpress/plugins/tio2-site-model/includes/webhooks.php`: add scoped content/route tags and matching invalidation branch, retaining others. Verify cold/warm/stale/invalidation; include target scope in route/SEO/media/conversion evidence.
- `components/sites/tio2-my/malaysia-global-chrome.tsx` and config `tio2-my-global-chrome.json`: use owners. Do not duplicate frozen header/footer/consent. Shared owner delta resolution is the parent task's shared implementation concern.
- Reuse approved source-only conversion resolver behavior after a targeted shared fix; use source query/trusted context, not prototype navigation interception.
- Create page-specific typed DTO/template/CSS and minimal CollectionPage/BreadcrumbList/ItemList builder. Use shared Inter ownership (existing `next/font/google` usage in country/editorial consumers is a pipeline pattern), not a page-private font asset. Neutral Grade rows require neither selector nor generic recommendation engine.
- Do **not** reuse Product Hub's `.filter(routeReadiness)` or conditional Grade links. Do **not** reuse Resource Proc's conditional pair-eligibility display: its package allows different conditional behavior, whereas SU locks visible links.

Observed shared deltas at baseline, requiring explicit resolution/evidence:

| Surface | Current source | Sulfate approved requirement / implication |
|---|---|---|
| Header/Footer appearance | `malaysia-global-chrome.module.css`: Arial, #006a63,1280px container,900px mobile break,13px links,Footer150×50 at≤430px | Inter/#008078; frozen chrome1200px/1100px and14px; Footer180×60. Do not claim an unchanged shared owner matches this freeze. Prefer scoped shared-owner opt-in styling if needed to avoid unintended older-page redesign; parent must choose owner-level solution and consumer regression scope. |
| Mobile menu | Shared full-screen white dialog, close-button first focus, two columns at tablet; link selection does not explicitly setOpen(false) | Freeze navy dropdown one column; package requires selection close and breakpoint cleanup. Interaction can use native dialog architecture if approved geometry/behavior are preserved; no page-private fork. |
| RFQ source | `tio2-my-rfq-page.json` approvedSourcePageIds does not include PRODUCT-PROC-SU | Add exact accepted internal source at appropriate shared owner layer; neutral fields, no additional selection. |
| Documents source | `lib/request-documents/malaysia-request-documents-prefill.ts` lists SU but normalize source demands applicationIndustry `Sulfate` | Source-only SU currently becomes null; minimal adaptation must accept neutral source-only SU without injecting visible context. Preserve validation for other source families. |
| Form attribution | Shared/header/body anchors commonly only `data-source-page` | Attributes alone do not establish transfer. Test rendered navigation and resulting form internal context; keep standard open-new-tab semantics. |
| Scope/readiness reuse | Product Hub target resolver checks LIVE_APPROVED metadata and generic CPT set; schema/parser exact hub JSON | Do not mark dependencies live to make a check pass, and do not reuse hub-specific assumptions as new-page evidence. |

At intake, source files exist for all five Grade pages, Product Hub, Applications hub, RFQ, Documents and RES-PROC, but runtime/CMS/receiver/release readiness was not tested by this audit. Package's historical dependency states are not overwritten from source existence.

## Source hash readback

Fresh SHA-256 checks matched all 19 direct package table files and all five Grade contracts plus relation matrix/audit. The table below is generated from the package's exact direct references. D23 paths are source locations only, never production runtime dependencies.

| Source | SHA-256 | Result |
|---|---|---|
| `D:/23MySec/pages/products/sulfate-process/PRODUCT-PROC-SU_CURRENT_GATE_BASELINE_MANIFEST_V0.9.md` | 29537f65739b286c7d3f6b6c00b44d4a3a38d34d2c551b1e4d1e90f67d2b5317 | MATCH |
| `D:/23MySec/docs/page-briefs/PRODUCT-PROC-SU_SULFATE_PROCESS_TITANIUM_DIOXIDE_BRIEF_V0.2.md` | d177753d738d61ee7323674b876055f2daed29b61255bb840bc19748fb52beed | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/PRODUCT-PROC-SU_GATE2_CONTENT_SKELETON_V0.1.md` | cc1e55c4fdca163b1510a741f28ba94d1506b30fcaf598d03f99d81049a0be0f | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/PRODUCT-PROC-SU_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md` | 8534c95765d8cb7869a686f20963f862f9f155555b49d6ada17fa5e310304fda | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/PRODUCT-PROC-SU_GATE2_CONTENT_CONTRACT_V0.1.md` | ec03883e25ce30629f20b84738dbab812e5323c28479bb595db49a0a53a39634 | MATCH |
| `D:/23MySec/docs/architecture/GATE2_EIGHT_PAGE_USER_APPROVAL_AND_CLOSURE_V1.0.md` | 4af59554d6413e5fd603a074f0cbe5a88273b81a85b69203b3048da32bb1cd86 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/05_review/PRODUCT-PROC-SU_GATE4_USER_APPROVAL_AND_CLOSURE_V1.0.md` | 369644048b56d56bb377a9432ac8e1f9412c6355a2b26fb7f0b57cd74a1e7bd7 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/PRODUCT-PROC-SU_GATE4_COMPLETE_VISUAL_V0.1.html` | e17a3fafb143b2a9c7d9b72661093bdb237d453c162b6a7f38feb209cbea485c | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/visual-direction.css` | c9c3cd702764928f528f6be9824857b958df363171c5a1fff77fae204a2cfd99 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/dependencies/Inter-OFL.txt` | 5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/dependencies/Inter-Variable.ttf` | 29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/dependencies/tio2-malaysia-primary-horizontal-v0.1.svg` | eeed3a758e7ae1b847238d1c88e86eee7a8e67b863969af4d286747e9a72487c | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/dependencies/tio2-malaysia-reverse-monochrome-v0.1.svg` | 7cfaeafa02ac8469a006c9489db2f92b15b2621e4151b04efe1b30fc734c1b5e | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/approval_core/source-freeze.json` | e4615952f2989d09c66e61dc45b926c36226fd92fbde5ca3ad698cb090bd8576 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/evidence_index.json` | 25eb3cc6cdbb858e34bbfc0d8af8098ca7c4c25bf3846064ecd460a0e86f53e3 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/approval_core/export-inventory.json` | 20659caa23525fb53398431fda5bed2bd775a83854a1e79a9dc396a160a10cf0 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/04_planning/gate4-v0.1/approval_core/asset-inventory.json` | 45de9d0e66c2f7687bbd54e1fca7b881d825c0723b2a48953818faf8935f3697 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/05_review/PRODUCT-PROC-SU_GATE4_INDEPENDENT_FINAL_REVIEW_V0.1/PRODUCT-PROC-SU_GATE4_INDEPENDENT_FINAL_REVIEW_V0.1.md` | d30b8a087accb5bebdab7c3c3034035b10dcb32331ee266a695006ad9305b2a4 | MATCH |
| `D:/23MySec/pages/products/sulfate-process/05_review/PRODUCT-PROC-SU_GATE4_PROJECT_CONTROL_REVIEW_V0.1.md` | 7aea20b69b56f94fcb25c07f63963d48e9523f6f92b748c781a8b33bf277535c | MATCH |
| `D:/23MySec/pages/products/detail-template/06_handoff/GRADE-M996_PRODUCT_DETAIL_CONTENT_CONTRACT_V0.1.json` | 4eaf22aa4f3f551f27cb83b41d644caa59312b6ef20f02bcbd9aa6522f3ec66a | MATCH |
| `D:/23MySec/pages/products/detail-template/06_handoff/GRADE-M2196_PRODUCT_DETAIL_CONTENT_CONTRACT_V0.1.json` | 6adb2a350f3e7f2a3f5138969e4a16a5f7e81993a25729a4906838fb2116ca3c | MATCH |
| `D:/23MySec/pages/products/detail-template/06_handoff/GRADE-M108_PRODUCT_DETAIL_CONTENT_CONTRACT_V0.1.json` | 998c57d70ac303c0f47ac3e14b0c9214f4d53bc91130044274773b7cd3260bff | MATCH |
| `D:/23MySec/pages/products/detail-template/06_handoff/GRADE-M52_PRODUCT_DETAIL_CONTENT_CONTRACT_V0.1.json` | 977a72af33377f7a3cab12c4f72314e93cfd79f2be0ccfcfd62a3a2d009de1a7 | MATCH |
| `D:/23MySec/pages/products/detail-template/06_handoff/GRADE-M2377_PRODUCT_DETAIL_CONTENT_CONTRACT_V0.1.json` | f735a9ff9486e8693b5e59e9bf25bbad39f4b46d1b47ddac630225d540afb7fa | MATCH |
| `D:/23MySec/pages/products/01_research/PRODUCT_GRADE_APPLICATION_PROCESS_MATRIX_V0.3.csv` | 8465e231545d3efc6333ec593441eef65e95173a4708097cec0d7a97a014e406 | MATCH |
| `D:/23MySec/pages/products/01_research/PRODUCT_GRADE_APPLICATION_PROCESS_UNIFIED_AUDIT_V0.3.md` | 338f2d4f2083e2e56b00637a4771982d08bfa15c1283022d6a28d506f0dededb | MATCH |

## All 16 permanent acceptance conditions (verbatim contract)


Each ID is permanent for this package. A correction may append subchecks but must not renumber or reuse an ID for a different subject. Evidence must identify target URL/environment, build or commit identity, WordPress data identity/readback where applicable, timestamp, viewport/browser, steps, expected result, observed result and artifact path.

| ID | Acceptance object and procedure | Deterministic pass condition | Minimum evidence |
|---|---|---|---|
| `SU-G9-01` | Scope/query/cache isolation | Route resolves the `tio2-my` record; WordPress query/readback, route resolver, cache key, menu/SEO/form/media context show the same scope; a missing/wrong-scope fixture never falls back across scope. | Data fixture/readback, request/query trace and positive/negative route capture. |
| `SU-G9-02` | Route and document head | Registered route returns the intended page without redirect drift; status/canonical/title/meta/H1 match Section 6 exactly; query variants consolidate to the canonical according to current architecture. | Response headers plus rendered head/DOM extract. |
| `SU-G9-03` | Complete approved visible copy | Normalized visible text, punctuation, headings, five body modules and action labels/targets equal Section 2; Footer is outside the five-module count. | DOM text/heading/link inventory and full screenshots at all three widths. |
| `SU-G9-04` | Grade relation set and neutral order | Exactly five Grade entries in order M-996, M-2196, M-108, M-52, M-2377; exact descriptions/routes; same component/status treatment; no CR-901/Chloride entry. | WordPress relation readback, DOM inventory and three-width screenshots. |
| `SU-G9-05` | No hidden applicability or ranking | DOM, data response, hydration payload, client state, attributes, CSS labels and JSON-LD contain no Rubber, Specialty Materials, preferred/default/recommended/rank/equivalence/replacement semantics; M-996 and M-2196 have no hidden differentiator. | Searchable DOM/payload/schema capture plus relation readback. |
| `SU-G9-06` | Responsive visual result | At 1440×900, 768×900 and 390×844 DPR1: five-module order and grade order persist; no horizontal page overflow, clipped text/focus, overlap, hidden action, empty placeholder or detached Footer; visual hierarchy and reference proportions materially match the approved freeze. | Full-page screenshots, continuous readable segments or equivalent high-resolution review, computed overflow/geometry report. |
| `SU-G9-07` | Shared Header/Footer/Logo/legal | Shared owners are consumed; Products is current; at most one accessible current item exists in the active nav; no visible CURRENT; fixed RFQ works; approved primary/reverse Logo assets/proportions render; legal links/order match owner; no Terms. | Component/data identity, DOM/accessibility snapshot and desktop/mobile screenshots. |
| `SU-G9-08` | Keyboard, focus, pointer and zoom | All visible actions work by keyboard/pointer; focus is visible; applicable targets are at least 44×44; Menu and Cookie satisfy open/loop/isolation/Escape/selection/breakpoint/focus-return behavior; page remains usable at native 200% zoom and keyboard-only. | Interaction log/video or state screenshots, accessibility snapshot and geometry report. |
| `SU-G9-09` | Navigation and target integrity | Same-page anchor passes click/keyboard/direct fragment; five Grade routes, `/products/`, `/applications/`, Documents, RES-PROC, RFQ, privacy/Cookie and FTC targets resolve to the intended correct-scope destinations with no hidden Grade/Application prefill. | Link inventory, target response/canonical matrix and anchor state capture. |
| `SU-G9-10` | RFQ context and receiver behavior | Both page RFQ actions transfer internal source attribution only; form defaults remain neutral; required fields/quantity MT validate; explicit receiver acknowledgement alone produces success; failure retains values and safe retry does not duplicate. | Navigation/context capture plus production-equivalent success, validation, transport/server and retry receipts. |
| `SU-G9-11` | Documents context and receiver behavior | Action transfers source context only; no Grade/type prefill; one structured Grade with multiple types works; supplemental Grade text stays unstructured; success language means human review only; current provider/account/key/recipient binding is proven. | Context capture, form-state/validation tests and production-equivalent receiver/readback receipt. |
| `SU-G9-12` | Shared Consent state | Page consumes current Shared Consent owner; current site state is represented accurately; dialog label/focus/close/return/persistence works; optional analytics do not run without an approved active consent mode; no TITAN or page-private state appears. | Runtime storage/network/state log, accessibility snapshot and dialog state screenshots. |
| `SU-G9-13` | SEO/GEO/Schema visible parity | JSON-LD parses and contains one CollectionPage, one correct BreadcrumbList and one five-item ItemList in visible order; URLs equal canonicals/visible links; excluded types/properties are absent; Malaysia-origin meaning does not expand. | Raw rendered JSON-LD, validator output and automated visible-vs-schema comparison. |
| `SU-G9-14` | Media/font/cache delivery | Inter and approved production SVG Logos load through the existing asset pipeline without broken requests, cumulative layout failure or page-private ownership; cache invalidation serves the selected scoped record and current shared assets. | Network waterfall/statuses, computed-font/Logo identity and cache cold/warm/invalidation receipts. |
| `SU-G9-15` | Error/empty/stale-data safety | Missing page, partial relations, wrong scope and stale cache fixtures never render a plausible but wrong five-Grade success page or cross-scope fallback; behavior is explicit and diagnosable under the current architecture. | Negative fixture matrix with response, DOM and logs. |
| `SU-G9-16` | Cross-browser, source freshness and regression | Current stable Chrome plus at least one non-Chromium engine show equivalent content/actions; real-device/touch or an approved device proxy covers narrow behavior; FTC URL/predicate and visible review date are freshly checked; impacted shared/product routes show no regression. | Browser/device matrix, source check record and focused shared-route regression report. |


## All eight dependency owners and release effects (verbatim contract)


| ID | Owner / close stage | Open item | Release effect |
|---|---|---|---|
| `SU-DEP-01` | APP-000 / Gate 8–10 | `/applications/` integrated production route | Blocker if action target is unavailable or wrong-scope. |
| `SU-DEP-02` | RES-PROC / current comparative Gate 9 | Select and correct the comparison implementation | Blocker if target is unavailable, wrong or unapproved in release. |
| `SU-DEP-03` | CONV-RFQ / Gate 8–9 | Production-equivalent receiver acknowledgement and failure/retry evidence | Blocks RFQ completion and release. |
| `SU-DEP-04` | CONV-DOC / Gate 9–10 | Production WordPress/provider/account/key/recipient binding and readback | Blocks honest Documents completion and release. |
| `SU-DEP-05` | Shared Consent / Gate 9–10 | Current owner state, persistence, network behavior and release blockers | Blocks release if not proven. |
| `SU-DEP-06` | Product/Grade routes / Gate 9–10 | Five Grade routes and Products hub in selected integrated release | Blocks navigation integrity. |
| `SU-DEP-07` | Page Gate 9 / release | Non-Chromium, real-device/touch or proxy, screen reader/forced-colors/native zoom coverage | Blocks Gate 9 if required evidence is missing or a failure is open. |
| `SU-DEP-08` | Page Gate 9 / release | FTC source reachability and predicate freshness | Requires current check or controlled exception; no silent claim expansion. |


## Intake verification limits and next owner

Only document reads, source/hash comparison and frozen-image overview inspection were performed. No current route/build/CMS/receiver test has passed on the strength of this intake. No D23 file changed. Parent task owns shared contract decisions and implementation assignment; independent Gate 9 retains all acceptance decisions. The local source check is suitable to begin implementation within the existing Gate 8 authorization.


## Implementation addendum — assigned page export, 2026-09-08

Parent subsequently assigned independent Sulfate builder/config/scoped CSS/exact route implementation within the existing dispatch. The original intake findings above remain historical observations at baseline. Shared types/registry/CMS/metadata/receiver/Chrome integration belongs to the parent task.

New implementation files:

- `scripts/editorial/build-sulfate-payload.mjs`: validates exact SHA-256 bindings for package, B V0.2, C V0.1, frozen visual, visual-direction.css and source-freeze before generation. `TIO2_MY_PLANNING_ROOT` is an optional build-time source location; no production dependency on D23 is introduced. `--check` verifies reproducible generated payload/CSS.
- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-product-proc-su.json`: `editorial-v0.1`, section `products`, exact `PRODUCT-PROC-SU` route/site/copy, `seo.schemaType=CollectionPage`, `seo.schemaItems` five exact ordered names/hrefs for parent's ItemList emitter, `freshness=null` (the approved visible source-review date is not a newly invented recurring review schedule).
- `components/sites/tio2-my/editorial/product-proc-su.css`: scoped to `[data-editorial-page="PRODUCT-PROC-SU"] main`; frozen body CSS followed by visual-direction CSS; Inter references the existing editorial shared font variable. No shared-owner or page-private font/logo rule.
- `app/(en)/products/sulfate-process-titanium-dioxide/page.tsx`: exact static route delegates to site-scoped editorial CMS loader and metadata renderer. Existing Grade dynamic route stays unchanged.
- `tests/unit/editorial/sulfate-payload.test.ts`: verifies exported Grade order/routes, five modules, no prototype/shared ownership in body, source-only conversion context, FTC punctuation separation, retained dependency actions and syntactically scoped CSS including functional selector commas.

Transform register: serialized frozen main retains identical textContent; only three RFQ/Documents hrefs receive `?source_page_id=PRODUCT-PROC-SU`, and five top-level sections receive machine-only data-module markers. No text or Grade relation change. `renderedBodySha256=c9ab0da2cbd66f3631a6fc74564218bf06d84538796b52cc0a230afd623a4eb0`; generated CSS SHA-256 `3568a8a52e1104e63e5b5623e6747e7d17b2d621041f742571cb23d66c630710`. These identify generated artifacts; sanitized/runtime DOM and production CSS need their own integrated evidence.

Validation: targeted Vitest first failed on missing generated payload (3/3), then passed after implementation (3/3). Builder generation and `node scripts/editorial/build-sulfate-payload.mjs --check` passed. Targeted ESLint on builder, route and test passed. `git diff --check` found no whitespace errors (Git emitted line-ending notices for parallel shared changes). Local Next page/CSS docs were read before route implementation. No CMS write or commit was performed. Current browser screenshots, build, receiver, scope-failure and all Gate 9 acceptance results remain parent/integration work; this export alone does not satisfy Gate 9.
