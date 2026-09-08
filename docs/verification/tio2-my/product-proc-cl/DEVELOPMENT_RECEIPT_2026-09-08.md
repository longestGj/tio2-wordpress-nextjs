# PRODUCT-PROC-CL Gate 8 Development Receipt

Date: 2026-09-08 (Asia/Shanghai)
Site / page / locale: `tio2-my` / `PRODUCT-PROC-CL` / `en`
Route: `/products/chloride-process-titanium-dioxide/`
Dispatch: `G8-BR-CL-COO-FOUR-20260908-01`
Handoff: `CL-G6-HANDOFF-03`, SHA-256 `f8962402e3d243bd9bdcf452a843ad1b0977a562d53ac474549be974b494061a`
Branch / base revision: `codex/poland-development` / `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` with an intentional dirty working tree containing the serial Poland, BR-EN, BR-PT and PRODUCT-PROC-CL delivery set
Result: `D16_TECHNICALLY_COMPLETE / READY_FOR_GATE9_WITH_DECLARED_LIMITS`

## Scope and authority

This receipt covers local Gate 8 implementation and D16 self-verification of the approved D23 package. It does not approve content, complete independent Gate 9, authorize deployment, publish to a remote WordPress instance, add the page to the sitemap, enable indexing, exercise a real form receiver, change DNS or start the fourth page retroactively.

The implementation preserves B V0.2 buyer copy and the five-module order from the handoff. It consumes the eight approved Grade relations as explicit five-attribute tuples: registered Page ID, model/name, position, clean URL and exact summary. No Page ID is derived from a model or URL.

## Implemented path

1. `tio2-my-product-process-chloride.json` is the editable approved-value seed. The TypeScript and PHP validators require the exact page/scope/locale/path/version identity and all eight Grade tuples.
2. WordPress owns one `tio2_product_hub` record for this process page. `malaysiaChlorideProcessRecordJson` returns only one valid published `tio2-my` owner and otherwise fails closed.
3. The GraphQL adapter carries exact site, route and `PRODUCT-PROC-CL` contract cache tags. The webhook and `/api/revalidate` path invalidate this singleton without broad cross-site tags.
4. The exact static Next.js route precedes the existing dynamic Grade route. Foreign site or WordPress scope is rejected before content loading.
5. The renderer consumes the shared Malaysia Header, Footer and consent owners. It renders exactly five page modules, one H1 and eight neutral Grade rows, with no page-owned image, form, table, FAQ, selector or dynamic result state.
6. Page-owned RFQ and Documents actions append only `source_page_id=PRODUCT-PROC-CL`. Grade and other navigation links stay clean. The receivers arrive with Grade, Application, quantity, destination and document choices empty.
7. The Hero fragment remains an ordinary native link. JavaScript adds visible H2 focus and preserves the next Tab stop at M-350; a JavaScript-disabled browser still follows and scrolls the native fragment.
8. Metadata stays `noindex, nofollow`, self-canonical and EN without hreflang. Open Graph emits only the required title, description, URL and website type. X emits title and description without card/image. The route uses explicit OG meta elements because Next.js 16.3.2 otherwise auto-creates `twitter:card=summary` when its `openGraph` metadata object is present.
9. JSON-LD contains only `WebPage`, a three-item `BreadcrumbList` and an unordered eight-entry `ItemList`; it emits no Product, Offer, FAQ, review, rank or hidden Grade Page ID relation.

## CMS and build evidence

- Local WordPress Plan: create one `tio2-my` record, public path `/products/chloride-process-titanium-dioxide`, release disabled.
- Local WordPress Apply: post `18529`, status `publish`, payload SHA-256 `97481bff24230a43c9d64070e522c7d39abb2086461eab185419662d5048eb4e`.
- GraphQL read-back: `product-proc-cl-18529`, scope `tio2-my`, Page ID `PRODUCT-PROC-CL`, eight Page IDs in approved order from `GRADE-M350` through `GRADE-M886`.
- RFQ dependency reapplied: post `17326`, Page ID `CONV-RFQ`, site `tio2-my`.
- Dedicated build directory: `.next-chloride-process-g8`; Build ID `jpg2_xT-vBFWkLirvpR9N`; 43/43 static pages generated.
- Local runtime: `http://127.0.0.1:3023`, production build, WordPress `http://127.0.0.1:8080`.
- Actual signed revalidation: HTTP 200; returned only the exact process content tag and route tag; the page returned HTTP 200 after invalidation.
- Sitemap self-check: the unreleased page and source query are absent.

## Verification results

| Check | Result |
|---|---|
| Contract/query/PHP/revalidation/render/SEO/Schema focused set | 8 files, 28 tests passed |
| Affected Product, RFQ, Documents, revalidation, proxy and shared-chrome regression | 74 files, 903 tests passed |
| TypeScript | `next typegen && tsc --noEmit` passed |
| ESLint | Passed with two pre-existing unused-function warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs`; zero errors |
| Dedicated `tio2-my` production build | Passed; route generated as an exact static route |
| Chromium production runtime | 8/8 passed, including SSR/head/Schema, JS and no-JS fragment, 1440/768/390, shared menu/consent and source-only receivers |
| Visual review | 1440, 768 and 390 full-page captures were opened and compared with `CL-G5-V01-SOURCE-01`; an incorrect font variable and two CTA treatments were found, repaired and re-captured |

Runtime captures:

- `runtime/chloride-process-1440.png`
- `runtime/chloride-process-768.png`
- `runtime/chloride-process-390.png`

## Gate 9 evidence map

| Gate 9 ID | D16 result and evidence |
|---|---|
| `CL-G9-01` | Ready: exact route HTTP 200 from local CMS record `18529`; page/scope/path trace recorded. |
| `CL-G9-02` | Ready: normalized contract and SSR tests prove B V0.2 text, one H1 and `CL-01...05` order. |
| `CL-G9-03` | Ready: CMS/API read-back retains all five attributes for exactly eight explicit Page IDs; mutation fixtures reject missing, extra/duplicate, unknown and mismatched tuples. |
| `CL-G9-04` | Ready in Chromium: pointer/keyboard action focuses the visible H2, next Tab reaches M-350, direct fragment works and JavaScript-disabled native navigation was exercised. |
| `CL-G9-05` | Ready locally: RFQ/Documents receive only the page source; all prohibited visible prefill fields remain empty and Grade links are clean. |
| `CL-G9-06` | Ready: the null-image branch is complete; body/head contain no page/social image placeholder. |
| `CL-G9-07` | Ready: scope, status, path, payload and every relation failure class fail closed in DTO/query/route tests. |
| `CL-G9-08` | Ready: valid permutation sorts only by explicit position; invalid positions fail; signed runtime invalidation returned exact site/page/contract tags and recovered to HTTP 200. |
| `CL-G9-09` | Ready: SSR and component checks prove absence of page-owned form/filter/selector/loading/result/FAQ/media states. |
| `CL-G9-10` | Ready: rendered title, description, canonical, EN document language, no hreflang and noindex/nofollow are exact; query and fragment do not alter identity. |
| `CL-G9-11` | Ready: rendered OG/X fields are exact; `og:image`, `twitter:card` and `twitter:image` are absent. |
| `CL-G9-12` | Ready: exact three-node graph and eight ListItems were joined in tests to the validated DTO relations. |
| `CL-G9-13` | Ready: prohibited structured-data types and commercial/ranking claims are absent. |
| `CL-G9-14` | D16 visual evidence ready: all three full-page captures inspected with no clipping; independent Gate 9 comparison still required. |
| `CL-G9-15` | Ready locally: shared Header/Footer/Menu/Logo/legal/Consent consumed once; Products current state and RFQ routes verified. |
| `CL-G9-16` | **OPEN at Gate 9:** Firefox/WebKit or another applicable non-Chromium engine, native browser UI 200% zoom, physical touch device and named screen-reader/AT evidence were not produced in Gate 8. |
| `CL-G9-17` | Ready within local scope: destinations and editable receiver state work; validation/failure/unavailable behavior is covered by receiver regressions. No real external form delivery was attempted. |
| `CL-G9-18` | Ready for independent check: wrong/missing site and WordPress scope are rejected before query; DTO, cache and form contexts remain bound to `tio2-my`. |

## Rollback and handoff boundary

The local CMS seed snapshots an existing record and restores it on failure; a newly created failed record is deleted. Code rollback is limited to the PRODUCT-PROC-CL route, component, contract/query/registry, SEO/Schema, cache/webhook additions, receiver allowlist entry, tests and this receipt. Shared Malaysia behavior must not be reverted to satisfy the two old assertions corrected during regression; the current approved Chrome uses weight 700, teal `#008078` and four rendered RFQ entries including the mobile-dialog top bar.

This page is now technically complete for the serial dispatch. Work on `DOC-COO` may begin after this receipt; independent Gate 9 remains a separate D23/user-side acceptance activity.
