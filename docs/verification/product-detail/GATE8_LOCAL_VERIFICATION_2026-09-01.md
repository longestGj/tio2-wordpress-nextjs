# PRODUCT-DETAIL Gate 8 local verification — 2026-09-01

## Scope and authority

- Review authority: `PRODUCT-DETAIL-G7-PCR-02 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Implemented public candidate: `GRADE-M350` at `/products/m-350/` for `site_scope=tio2-my`.
- The other 13 approved Grade identities remain identity-only. No route, shell, placeholder, copied M-350 content, TDS, process page, RFQ page, deployment, indexing, DNS, or production write was created.
- This document is local Gate 8 evidence. It is not a Gate 9 decision, release approval, or publication record.

## Architecture decisions

- `app/products/[familySlug]/page.tsx` branches on the current site before any Site A query. Malaysia accepts only the exact `m-350` slug and calls the scoped Malaysia query; every other Malaysia slug fails closed with `notFound()`.
- One Product Detail component/template consumes the approved public projection. The 14-identity registry is separate from the single M-350 candidate payload so identity registration cannot accidentally create public pages.
- WordPress stores one exact, hash-compared M-350 contract on one `tio2_grade` record with the exact `site_scope=tio2-my`, internal slug, and public path. Missing, duplicate, invalid, cross-scope, or non-M-350 reads return a GraphQL error; there is no cross-scope query or fallback.
- The GraphQL response contains only the public projection. Route readiness, module status, and evidence ledger remain server-side governance data and are not exposed.
- Conditional body actions/modules are projected only when their exact scoped target is ready. The current minimum projection is Hero, Positioning, Applications, Evaluation, and Technical Data. Unready Hero actions, Documents, Markets, Related Grades, and Sample are omitted rather than redirected.
- The page directly consumes the single shared `MalaysiaGlobalHeader` / Mobile Menu / `MalaysiaGlobalFooter` and shared chrome configuration with only `currentPageId="PRODUCT-000"` and `sourcePageId="GRADE-M350"`. Product Detail CSS is scoped under `<main>` and does not override shared Logo, navigation, current marker, RFQ, menu, or Footer styles.
- Shared chrome retains visible `CURRENT=0`, Desktop 3px underline, Mobile 4px left marker, `aria-current="page"`, and the permanent `/request-a-quote/` Global RFQ.

## Local WordPress/API evidence

The local WordPress record was seeded idempotently as post `17242` with `recordState=approved_for_preview`. A fresh GraphQL read returned:

```text
siteScope         : tio2-my
publicPath        : /products/m-350
pageId            : GRADE-M350
state             : approved_for_preview
modules           : hero,positioning,applications,evaluation,technical
heroActions       : 0
hasRouteRegistry  : False
hasEvidenceLedger : False
```

An explicit `m-510` query returned null data plus `The requested Malaysia Product Detail is not authorized.`

## Test and build results

| Check | Result |
| --- | --- |
| `npm run codegen` | PASS |
| 13 focused Vitest files | PASS — 40 tests |
| Product Detail Playwright | PASS — 8 tests |
| Product Hub + Home/Markets shared-navigation Playwright | PASS — 14 tests |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS — 0 errors; 2 unrelated pre-existing warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs` |
| PHP 8.3 syntax checks: Product Detail, Product Hub, plugin bootstrap, seed | PASS |
| Malaysia production-mode local build with isolated dist directory | PASS |
| `git diff --check` | PASS |

The build generated `/products/m-350` as the only Malaysia Product Detail static parameter. Runtime tests confirmed all 13 other Grade paths return 404 without M-350 copy.

## Responsive, visual, and accessibility evidence

All screenshots were captured fresh from the local production-mode Next.js server after waiting for Header and Footer Logo decode plus two animation frames. Tests assert both logos are visible, have non-zero contract-sized bounding boxes, and contain non-white pixels.

| Viewport/evidence | SHA-256 |
| --- | --- |
| `m350-1440.png` | `CB3C680CEA9FE13E21AFDFC531855FBA1705C7CD29A06BA73B5AC694D4C52B39` |
| `m350-1024.png` | `1439135097065C04E7608734E8DD92CE39F809D01E4CB169993EA003C566E1F0` |
| `m350-768.png` | `C57DCEEC53AB4ACDEBEFE1AB77BE467CDAB0DAFE512372F475483CCF09A6B4CB` |
| `m350-430.png` | `D3F804BA54A92040ECB5BF60CCAFC31F31B4371283BE3AD5320E17C6798B70C4` |
| `m350-390.png` | `C55200F660E0F5C6E96371977A7BA2E58A9527B77B4497BF69B0F8D47A90FE14` |
| `m350-narrow-320.png` | `89928FFBE739BFC4EE28F60AF71E0AEC399B5F7A607AA844DB44D8C9119A05D1` |
| `m350-200-percent-zoom-equivalent.png` | `93A6EE9FD84C0A3B12FAEF8C655C2EF2B8222E3D814C93C53E4133C33A3B9EF9` |

Manual review confirmed the complete Technical Data source chip at 1440, responsive table/card conversion at 390/320, visible Header/Footer Logos, module order, and no clipped or overlapping content. Automated checks cover no horizontal overflow, 44px mobile targets, one H1, semantic table headers, initial server-rendered technical rows, keyboard Mobile Menu/Escape/focus return, reduced motion, and zero Axe violations at each primary viewport.

## SEO/GEO/Schema evidence

- Exact approved title, description, H1, and self-canonical `https://tio2malaysia.com/products/m-350/`.
- One canonical; no hreflang; no query/hash/cross-scope canonical.
- `noindex, nofollow` because Product Detail indexing is not authorized and public indexing is not enabled.
- One JSON-LD graph with exactly `Product` and `BreadcrumbList`.
- Product contains the 15 visible Technical Data rows as `additionalProperty` values.
- No `Offer`, `manufacturer`, `countryOfOrigin`, comparison/related-grade claims, or unapproved grades/applications.
- Sitemap tests confirm M-350 remains excluded while `indexingAuthorized=false`.

## Current release blockers

- `CONV-RFQ` receiver is not ready. The permanent shared Global RFQ remains visible at `/request-a-quote/` per Global Chrome contract, but release remains blocked; there is no Contact fallback.
- `CONV-SAMPLE` and `CONV-DOC` are not ready, so contextual Sample/Documents actions and modules are omitted.
- Coatings application, four market routes, Chloride Process, and related Grade targets are not ready, so their conditional links/modules are omitted.
- The remaining 13 Grade identities do not have approved public content/TDS/route authorization and intentionally remain 404.
- Indexing authorization remains false. Deployment, publication, DNS, production data writes, and index opening were not performed.
