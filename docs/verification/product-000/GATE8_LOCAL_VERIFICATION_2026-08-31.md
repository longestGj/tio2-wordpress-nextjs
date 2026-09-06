# PRODUCT-000 Gate 8 local verification — 2026-08-31

## Control and status boundary

- Page: `PRODUCT-000` / `/products/`.
- Site: `site_scope=tio2-my` only.
- Authority: `PRODUCT-000-G7-PCR-04`, Gate 7 closed and handed off for user-authorized Gate 8 implementation.
- Result: local Gate 8 implementation and verification complete for the Hub surface. This is not deployment, publication, Gate 9 PASS, Gate 10 authorization, DNS work or indexing authorization.
- Out of scope and not created: fourteen Grade pages, two Process pages, Application/Documents targets, RFQ page/form and every other external page.

## Implementation architecture

- `app/products/page.tsx` keeps the established Site A path unchanged and branches by current site before either CMS lookup. `tio2-my` reads only the non-null Malaysia Product Hub GraphQL field; foreign scopes never query or fall back to the Malaysia record.
- WordPress stores one private `tio2_product_hub` record with exact `site_scope=tio2-my`, `/products`, immutable approved JSON and dynamic route readiness. Missing, duplicate, changed, wrong-scope or malformed records fail as server errors; they do not become a 404 or another site's content.
- Target readiness now requires one unique record with exact `site_scope=tio2-my`, expected Page ID, public path, canonical, WordPress `publish`, and page-level `LIVE_APPROVED`. Conversion targets additionally require the corresponding receiver `READY`, matching target Page ID and a non-empty form key. WordPress `publish` alone is never live approval. Local readback currently returns no target as `LIVE_APPROVED`.
- The Hub body is a Server Component. Only `ProductSelector` and `ProductFaq` are Client Components. Selector state never changes the URL; all fourteen directory rows and all five FAQ answers exist in the initial server HTML.
- `MalaysiaGlobalHeader`, Mobile Menu and `MalaysiaGlobalFooter` are consumed directly from the one shared Global Chrome V0.5 component/style/config source. PRODUCT-000 passes only `currentPageId=PRODUCT-000` and `sourcePageId=PRODUCT-000`; no Product-specific Header/Footer exists. Page CSS is rooted under `productMain` and does not style shared Chrome.

## Content, route-state and interaction evidence

- Exact H1, Hero, 6/5/2/1 portfolio summary, 8/8/7/4/2/1 Selector sets, 8/5/1 process classifications, four directory groups, fourteen exact summaries, five Evaluation steps and five Buyer Questions are contract-tested.
- Runtime local readiness produced Process route-card state 0 while retaining the Process heading/intro and `CR-901 · Vapor-phase oxidation` row without an action. Support state 0 omits the whole conditional Support module. All fourteen Grade actions are omitted without empty link slots; M-350 is an accessible local `PREVIEW_ONLY` Gate 8 candidate, not a `LIVE_APPROVED` Hub target.
- Fixed and contextual RFQ links remain visible and point to `/request-a-quote/`; contextual links include `source_page_id=PRODUCT-000`. The unresolved RFQ route is a release blocker and is not replaced with Contact, disabled UI or a placeholder form.
- Selector default/Coatings plus all six other states returned counts 8/8/7/4/2/1/0, retained focus and announced results in a polite live region. Not Sure showed the exact no-result text.
- FAQ rendered five exact answers in initial HTTP HTML, then enhanced to one-open/four-collapsed disclosure buttons with `aria-expanded`, `aria-controls`, keyboard toggle and focus retention.
- 390px runtime verified every visible Hub/Chrome link and button at at least 44×44 logical pixels, zero document overflow, reduced-motion operation and zero Axe violations.

## SEO, GEO and Schema

- Title: `Titanium Dioxide Pigment Grades | TiO2 Malaysia`.
- Meta description matches the approved route-safe string exactly.
- Exactly one canonical: `https://tio2malaysia.com/products/`; HTTPS, exact host/path, no query/hash, no hreflang.
- Pre-release robots: `noindex, nofollow`. `/products/` remains absent from the controlled sitemap.
- One JSON-LD graph with ordered `CollectionPage`, `BreadcrumbList`, 14-item `ItemList` and `FAQPage`. The fourteen visible summaries and Product descriptions are character-for-character identical.
- No Offer, AggregateOffer, AggregateRating, manufacturer, origin, comparison, relationship expansion or cross-scope identifiers are emitted.

## Automated results

| Check | Command | Result |
|---|---|---|
| GraphQL code generation | `npm run codegen` | PASS; generated Product Hub operation is deterministic |
| Focused unit/integration/infrastructure | `npx vitest run` with 13 PRODUCT-000, shared Chrome, Market and route-gating files | PASS: 13 files / 45 tests |
| Shared real-browser regression | `npx playwright test tests/e2e/market-hub.spec.ts tests/e2e/product-hub.spec.ts tests/e2e/tio2-my-global-navigation.spec.ts --config=playwright.config.ts` | PASS: 14/14; Home/Markets shared navigation plus Markets and Products runtime |
| Final PRODUCT-000 production-server browser run | `npx playwright test tests/e2e/product-hub.spec.ts --config=playwright.config.ts` | PASS: 5/5; 390/768/1024/1440 plus Selector/FAQ keyboard flow, zero conditionally ready targets |
| WordPress readiness adversarial runtime | `TIO2_MY_READINESS_RUNTIME=1 npx vitest run tests/integration/wordpress/tio2-my-product-readiness-runtime.test.ts` | PASS: wrong Page ID, preview/not-ready, duplicate, cross-scope and receiver failures all fail closed; exact live states pass |
| Changed-scope lint | `npx eslint` over route, shared Chrome, Product components, SEO/query modules and Product tests | PASS: 0 errors |
| TypeScript | `npm run typecheck` | PASS |
| PHP syntax | WordPress PHP 8.3 Docker image, `php -l` on Product/Market resolvers and seeds | PASS: 4 files |
| Malaysia production build | `SITE_ID=tio2-my`, local WordPress GraphQL, isolated `NEXT_DIST_DIR`, `npm run build` | PASS; `/products` statically generated with 1-hour revalidation |
| Diff hygiene | `git diff --check` | PASS; only line-ending notices, no whitespace errors |

## Fresh production-server visual evidence

| Viewport | File | SHA-256 | Result |
|---|---|---|---|
| 1440px Desktop | `product-000-1440.png` | `0310C1B04AAE8A70E2FAAE94E86AB3D16D092D2FDF988B73516831325765DE71` | PASS: 7/5 Hero, left/right Selector, 2×2 directory, five-card row, Support 0, shared 84px Header/Footer, no overlap |
| 1024px Tablet | `product-000-1024.png` | `8BC42D840C96580D7324ED623C476167158A3C5598B2B907877DC296E776F485` | PASS: readable desktop navigation, two-column body patterns, Support 0, no overlap/overflow |
| 768px Tablet | `product-000-768.png` | `14B25875D8D80A6DF55EF0BD5FF91E431E1CB68097675CD2B155A6F6759A148D` | PASS: 64px Mobile Header, stacked Selector, two-column directory/Evaluation reflow, Support 0, no overlap/overflow |
| 390px Mobile | `product-000-390.png` | `EB653570AE77F3F8B7C7030D14E3C7A3DD0522B43D1C5FCF48FDB0CBB4592232` | PASS: single column, independent 44px Selector controls, Support 0, Mobile current marker, complete copy, no horizontal overflow |

All four Header Logo checks require visibility, decoded natural dimensions, contract bounding boxes, two rendered animation frames and a non-white pixel scan. Manual original-detail inspection confirmed a visibly painted Logo and no body/Footer collision in every capture.

## Blockers and Gate 9 handoff state

- `PRODUCT-G6-B01`: no B01 identifier exists in the controlling Gate 7 V0.3 package; none is invented or closed here.
- `PRODUCT-G6-B02`: Hub-side fixed/contextual link and prefill integration is complete; external `CONV-RFQ` route/form/privacy/validation/error/success workflow is unresolved and remains a Gate 9/release blocker.
- `PRODUCT-G6-B03`: Hub-side readiness resolver and 2/1/0 Process, 3/2/1/0 Support and Grade-action fail-closed rendering are complete. No target currently has exact `LIVE_APPROVED`; all fourteen Grade targets, both Process targets, APP-000, DOC-000 and MARKET-000 remain unresolved. This remains a Gate 9/release blocker.
- Indexing and sitemap authorization remain false. No release, deployment, production write, DNS, indexing or external target implementation was performed.
