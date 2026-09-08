# MARKET-BR-PT Gate 8 Development Receipt

Date: 2026-09-08 (Asia/Shanghai)

## Identity and authority

| Field | Recorded value |
|---|---|
| Dispatch | `G8-BR-CL-COO-FOUR-20260908-01` |
| Approved package | `BR-PT-G6-HANDOFF-02` V0.2 |
| Package SHA-256 | `f1be33c0cef8df85b6e8c8d32a62a7c95c2e210d81169061ba7b1fec2ba41b15` (verified before implementation) |
| Site / page / route | `tio2-my` / `MARKET-BR-PT` / `/pt-br/markets/brazil/` |
| Repository / branch | `D:/16Wordpress_nextjs` / `codex/poland-development` |
| Pre-work and current HEAD | `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` |
| Worktree state | Dirty before and after this task because the user directed all four pages to the existing Poland branch. This receipt identifies the BR-PT addition; no second worktree or branch is used. |
| Local CMS record | post `18527`, `publish`, exact `site_scope=tio2-my`, `public_path=/pt-br/markets/brazil`; local development data only |
| CMS payload SHA-256 | `002c12f46b1f3df5422971bac8ef19f06123651723d2a15d7731c2fdf99bc07b` |
| Receiver dependency | local RFQ post `17326` was reapplied after adding the approved `MARKET-BR-PT` source identity |
| Build | `.next-brazil-pt-g8`; Build ID `N1Wv6364yct1aQqzfLyHu` |
| Runtime checked | `http://127.0.0.1:3022/pt-br/markets/brazil/` |

The package's historical `NOT_SENT` and `NOT_AUTHORIZED` text is superseded only for this local Gate 8 work by the current Manifest and dispatch. Gate 9, Gate 10, deployment, production writes, publication, sitemap inclusion, indexing, reciprocal alternates and real form submission remain outside this receipt.

## Implemented data and route path

1. `wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json` holds the approved initial editable payload. The checked-in buyer-copy fixture retains the exact V0.2 source for change review.
2. `wordpress/plugins/tio2-site-model/includes/market-page-brazil-pt-v02.php` validates exact page/site/language/path identity, five-module order, language spans, actions, receiver contexts and scope before storage and GraphQL output.
3. `malaysiaBrazilPtMarketRecordJson` exposes exactly one validated published record; absent, ambiguous, wrong-scope, wrong-path and invalid records fail closed.
4. `lib/wordpress/market-page-brazil-pt-v02-queries.ts` attaches site, route and `MARKET-BR-PT--pt-BR` cache tags and does not use checked-in fallback content.
5. `app/(pt-br)/pt-br/layout.tsx` is a separate Next.js root layout with `<html lang="pt-BR">`; shared header, footer and consent surfaces retain `lang="en"`.
6. `app/(pt-br)/pt-br/markets/brazil/page.tsx` rejects other sites before querying, then renders approved metadata, JSON-LD and page content through the shared Malaysia chrome.

The local seed supports read-only `Plan` and local-only `Apply`, detects slug/path collisions, snapshots an existing record and restores or deletes only that record on failure. WordPress reports `production` by default and its configuration file is read-only, so both seed operations used a process-local `WP_ENVIRONMENT_TYPE=local` constant. No shared WordPress configuration was rewritten.

## Page-owned behavior

- Hero and final RFQ links carry `source_page_id=MARKET-BR-PT` and editable `destination_country=Brazil`.
- The inline `formulário de cotação` link carries source attribution without destination prefill.
- Request Documents carries source attribution only. Grade, document types and company country stay empty on arrival.
- Product, Application, Document Hub and Trade Resource links go to their current English owners without Brazil recommendation or form context.
- The exact English-destination notice is visible once. Seven English receiver-control phrases use `lang="en"` inside the Portuguese main content.
- The page has one H1, five modules and three application cards. It has no page form, FAQ, table, buyer image, local Brazil entity, Grade recommendation or determined trade outcome.
- Metadata uses the approved PT title/description/self-canonical and `pt_BR` Open Graph locale. Robots remain `noindex, nofollow`.
- JSON-LD contains only `WebPage` and `BreadcrumbList`, with `inLanguage=pt-BR` and references to the shared `WebSite` and `Organization` IDs.
- No `hreflang`, reciprocal alternate or `x-default` is emitted because the required live reciprocal authorization does not exist.

## Verification performed

| Check | Result |
|---|---|
| Contract RED | Initial Vitest failed because BR-PT config/DTO/component did not exist |
| CMS boundary RED | Query and Docker PHP tests failed because the GraphQL/query and PHP contract did not exist |
| Route boundary RED | Layout, route and metadata tests failed before the dedicated PT root layout and route existed |
| Receiver RED | RFQ and Documents both normalized `MARKET-BR-PT` to `null`; exact source allowlists were then extended and passed |
| Approved-copy binding | Every initial visible string and destination in the CMS JSON is checked against `tests/fixtures/markets/brazil-pt/approved-copy.md` |
| Focused Vitest | 8 BR-PT/route files, 30 tests passed; subsequent revalidation and PHP registration checks also passed |
| Shared regression | 24 directly affected BR-EN, BR-PT, cache, revalidation, RFQ and Request Documents files; 227 tests passed |
| PHP runtime | Docker PHP 8.3 accepted the approved payload and rejected foreign scope/language/destination, Documents context leakage, module reversal and markup |
| TypeScript / lint | `npm run typecheck` and `npm run lint` passed |
| GraphQL generation | `npm run codegen` passed using the updated checked-in schema and PT query document |
| Production build | `SITE_ID=tio2-my`, `.next-brazil-pt-g8`, 42/42 static pages generated; `/pt-br/markets/brazil` present |
| Browser checks | Playwright Chromium 6/6 passed against Build `N1Wv6364yct1aQqzfLyHu` |
| Visual review | Full 1440, 768 and 390 captures were opened and inspected; heading hierarchy, card stacking, long Portuguese actions, footer, whitespace and module order had no observed clipping or overlap |

Evidence:

- `docs/verification/tio2-my/market-br-pt/runtime/brazil-pt-1440.png` — SHA-256 `0284d09946b422cca427c4be88937bf2113911d63ec571f7d522edeec66a8562`
- `docs/verification/tio2-my/market-br-pt/runtime/brazil-pt-768.png` — SHA-256 `2e56bf377b7db22694faa56c0470140b328594201e3b997a1beb4d3a33c2661e`
- `docs/verification/tio2-my/market-br-pt/runtime/brazil-pt-390.png` — SHA-256 `18fbd1c3c1ffcee7f9cac79035813ed1f901ec52a23974afda7bb23859daf3bd`
- `tests/e2e/brazil-pt-market.spec.ts` records actual SSR language/head/JSON-LD, redirect query preservation, responsive geometry, shared menu/Cookie operation and receiver arrival state.

## Gate 9 acceptance mapping

| ID | Gate 8 result |
|---|---|
| `BR-PT-G9-01` | PASS locally: approved V0.2 copy, one notice, five modules and Portuguese labels are present from CMS through SSR |
| `BR-PT-G9-02` | PARTIAL: 1440/768/390 Chromium layout and keyboard checks pass; native 200% zoom, real touch device and non-Chromium remain unverified |
| `BR-PT-G9-03` | PASS locally for the provisional route, canonical redirect and direct approved destinations; this does not claim a live or published route |
| `BR-PT-G9-04` | PASS for fresh page-owned Hero/final/inline RFQ source and destination behavior; no real submission was made |
| `BR-PT-G9-05` | PASS: Request Documents arrives with source only and visible required choices remain empty |
| `BR-PT-G9-06` | OPEN external dependency: provider acceptance, mailbox/business receipt, failure paths and privacy/analytics evidence were not established |
| `BR-PT-G9-07` | PASS locally for title, description, document language, self-canonical, `pt_BR`, noindex and allowed JSON-LD graph; sitemap publication was not authorized |
| `BR-PT-G9-08` | PASS for the current hold state: neither page emits a false reciprocal alternate and BR-PT emits no `x-default`; future reciprocal-live behavior remains untested |
| `BR-PT-G9-09` | PARTIAL: shared chrome, Production SVG owner, mobile menu and Cookie dialog pass in Chromium; screen-reader and native 200% evidence remain unverified |
| `BR-PT-G9-10` | PASS in contract/query/route/cache/source isolation tests; a full multi-site HAR, storage and analytics matrix was not run |
| `BR-PT-G9-11` | PASS for visible/SSR/JSON-LD boundaries: Malaysia origin, exact COO sentence, neutral Applications and dated Trade handoff remain bounded; publication-time Trade freshness remains with `RES-TRADE-BR` |
| `BR-PT-G9-12` | PASS for reproducible local package/branch/HEAD/CMS/build/test/evidence identity; the intentionally dirty shared branch is disclosed |

## Changed implementation surface and rollback

BR-PT-specific files are the `(pt-br)` layout and route, component/CSS, metadata builder, WordPress config/include/seed, DTO/types/query document/query adapter, tests, fixture, plan and this receipt. Shared modifications add the exact PT identity to the RFQ and Request Documents source allowlists, cache tags, revalidation, webhook route/meta owner, GraphQL schema/generated output, plugin include, proxy trailing-slash set, Vitest alias and TypeScript path/generated-types includes. The webhook meta-owner correction also includes the already implemented `MARKET-BR-EN` constant, which its existing page contract requires.

Rollback is removal of BR-PT-specific files plus reversal of those exact shared identity additions. The local CMS rollback target is post `18527`; RFQ post `17326` would be restored from its prior local contract if rolling back this receiver identity. No production data was written.

## Development state

`MARKET-BR-PT`: **D16_TECHNICALLY_COMPLETE / READY_FOR_GATE9_WITH_DECLARED_LIMITS**.

Gate 9 must independently reproduce applicable evidence. Gate 10, deployment, production writes, publication, sitemap/indexing, reciprocal hreflang, real receiver sends, assistive-technology and non-Chromium checks retain their declared authorization and owner boundaries.
