# RES-ORIGIN Gate 8 Implementation Receipt

## Control

- Verification date: 2026-09-05 (Asia/Shanghai)
- Repository: `D:\16Wordpress_nextjs`
- Managed worktree: `C:\Users\longe\.codex\worktrees\bd8e\16Wordpress_nextjs`
- Branch: `codex/res-origin-gate8`
- Base ref: `d1b15e253b1202d2e4639646845c7ca8155104a8`
- Implementation/evidence tip before this receipt: `c5cc8e7`
- Site/page/locale: `tio2-my` / `RES-ORIGIN` / `en`
- Public path: `/resources/non-china-titanium-dioxide/`
- Local production preview: `http://127.0.0.1:3003/resources/non-china-titanium-dioxide/`
- Gate 8 status: implemented and locally verified; Gate 9 release, deployment, publication, DNS, sitemap submission and indexing were not performed.

The sealed Gate 7 hashes and architecture bindings are recorded in `GATE8_PATH_MAP_2026-09-05.md`.

## Delivered boundary

- One exact-scope Malaysia route and one existing `tio2_document` CMS record; no parallel content type or site plugin.
- Approved 13-module content contract, shared Malaysia global chrome, responsive page components and accessible FAQ/menu behavior.
- Fail-closed CMS, DTO and relation projection. Six relations are publicly eligible: Home, Resources, Products, RFQ, Documents and European Union market context.
- The RFQ handoff contains only `source_page=RES-ORIGIN&interest=alternative-origin-sourcing`; it does not infer grade, process, destination or application values.
- Exact metadata, canonical, `noindex, nofollow`, Breadcrumb/WebPage JSON-LD, and no Article until complete real visible article metadata exists.
- Exact revision-aware cache tag and route-only invalidation for RES-ORIGIN; no cross-site, site-wide or sitemap purge.

## Live CMS and API evidence

The checked-in local seed was applied only to the local Docker WordPress instance. The live GraphQL resolver returned:

- record ID `resource-origin-17374`, WordPress post ID `17374`, status `publish`, scope node `tio2-my`;
- identity `RES-ORIGIN` / `tio2-my` / `en` / `/resources/non-china-titanium-dioxide/`;
- 13 ordered modules, 6 due-diligence checks and 9 buyer questions;
- exactly 6 eligible relation records in display order;
- `schemaMode=BREADCRUMB_ONLY` and `articleMetadata=null`;
- no `releaseControls` or internal revision object in the public page payload.

The live WordPress webhook projection returned only:

```text
siteIds: [tio2-my]
paths: [/resources/non-china-titanium-dioxide]
entityIds: [17374]
contractMetaRelevant: true
relationsMetaRelevant: true
```

The corresponding Next.js revalidation test proves the exact tags are:

```text
content:tio2-my--RES-ORIGIN--en--RES-ORIGIN_CONTENT_ARCHITECTURE_V0.2--RES-ORIGIN-REL-V0.1--RES-ORIGIN-META-V0.1
route:tio2-my:/resources/non-china-titanium-dioxide
```

No `content-list`, `site`, `sitemap`, `tio2-a` or `tio2-b` tag is emitted for that exact event.

## Production-render evidence

The optimized Malaysia build completed all 37 static generations after refreshing the checked-in Malaysia Homepage fixture in local Docker WordPress. That local fixture refresh resolved the repository's known stale Homepage `/sitemap.xml` source-integrity gate; it was not a remote or production write.

The running optimized preview returned HTTP 200 with:

- title: `Non-China Titanium Dioxide Supply Guide | TiO2 Malaysia`;
- canonical: `https://tio2malaysia.com/resources/non-china-titanium-dioxide/`;
- robots: `noindex, nofollow`;
- exactly one H1;
- JSON-LD graph types `WebPage` and `BreadcrumbList` only;
- no hreflang, Product, Offer, Review, FAQPage or Article Schema;
- root-only sitemap with one URL and no RES-ORIGIN entry;
- global preview robots file set to `Disallow: /`.

## Browser acceptance and screenshots

The optimized preview passed 10/10 Playwright checks at 1440, 1024, 768, 430, 390 and 375 CSS-pixel widths. Evidence covers no horizontal overflow or clipped modules, minimum 16px body copy, minimum 44px visible targets, all nine FAQ answers in initial HTML, keyboard expansion and focus visibility, mobile-menu focus trapping/Escape/focus restoration, reduced motion, and 640px reflow used as the 200% zoom equivalent.

| Evidence | SHA-256 |
|---|---|
| `RES-ORIGIN_GATE8_DESKTOP-1440.png` | `FE760F5A179B1219531909B8EB70F8FA1FD51CB7D08F7B23A1F9F51457A511AE` |
| `RES-ORIGIN_GATE8_TABLET-768.png` | `3D898D73E6A03972A82DD252DBCD6C4D353DD70CF111008DDD143A6A887E5C9A` |
| `RES-ORIGIN_GATE8_MOBILE-390.png` | `86FF8B3DE3B8180F8D231036F1463410CF31734873545457EB4A7B3282FC788C` |
| `RES-ORIGIN_GATE8_MOBILE_MENU_390.png` | `30CFE0B47EDE325922115587397E454B664A41209B8FD18FF7AFCE62ED18EAE1` |
| `RES-ORIGIN_GATE8_FAQ_FOCUS_1440.png` | `77410A13A6F2C63CCB07B664C52873B8FB31AD3FB462F8FC095C1DB86C7BF88E` |

Visual hierarchy, palette, spacing rhythm, card treatment and responsive transformations match the approved Gate 5 baseline. The rendered page is about 14.5% taller at 1440px and 4.1% taller at 390px than the sealed reference; this is an intentional density variance caused by preserving the full approved copy and the Gate 8 minimum 16px body-copy constraint. No content or interaction is clipped.

## Verification record

| Check | Result |
|---|---|
| Gate 8 focused Vitest set | PASS — 14 files, 134 tests |
| Exact revalidation + CMS webhook regression set | PASS — 2 files, 60 tests |
| WordPress webhook routing runtime smoke test | PASS |
| PHP syntax, `webhooks.php` | PASS in the WordPress PHP 8.3 container |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS with 0 errors; 2 pre-existing unused-function warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs` |
| Malaysia optimized production build | PASS — Next.js 16.3.2, 37/37 static generations |
| Gate 8 Playwright acceptance | PASS — 10/10 |
| Repository-wide `npm test` | PARTIAL — 2,252 passed, 46 skipped, 17 failed outside RES-ORIGIN |

The repository-wide failures were retained as evidence rather than changed out of scope. They are in existing Site A local-environment/capability wrappers (12), Site A Application/Resource relation fixtures (3), one legacy Homepage revalidation expectation for `/products`, and one unrelated DOC-TDS frozen fixture hash. None of the 17 failures is in a RES-ORIGIN test; the focused Gate 8 suite and optimized Site A-independent Malaysia build are green.

## Release boundary

- No deployment, remote WordPress write, production publication, DNS change, indexing enablement, sitemap submission or formal migration was executed.
- RES-ORIGIN remains excluded from the public route inventory and sitemap and remains explicitly non-indexable.
- The Homepage still contains no new Product, Application or RES-ORIGIN page links.
- Gate 9 remains a separate user-authorized release decision.
