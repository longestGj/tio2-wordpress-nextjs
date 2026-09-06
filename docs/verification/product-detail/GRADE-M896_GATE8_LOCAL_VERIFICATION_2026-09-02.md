# GRADE-M896 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `PRODUCT-DETAIL-12-GRADE-AUTO-SERIAL-01`
- Controller closure: `GRADE-M896-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`
- Route: `/products/m-896/`
- Scope: `site_scope=tio2-my`
- State: local production-equivalent preview candidate only
- Release controls: `PREVIEW_ONLY`, `noindex,nofollow`, sitemap authorization false
- This record is not Gate 9 approval, Gate 10 authorization, deployment, publication, DNS or indexing evidence.
- M-895 and all later serial work remained locked and was not started or prepared.

## Approved contract binding

- D23 approved raw SHA-256: `BA735FA0570E81F8055C76B7AC7B434498446BBD5540A1F2A32F0A9E6F3EC03A`
- Canonical SHA-256 using `sha256-json-recursive-key-sort-v1`: `4049273762F620444A14CEC3ED223C7AC44A0AB73166D058B0B625F73D7F0730`
- Repository and D23 contracts produce the same canonical hash.
- Node and PHP registry loaders independently validated the same approved source/canonical binding.
- Missing, malformed or mismatched approved hashes fail closed. Stored WordPress payloads must match the approved canonical hash.

The single Product Detail approval registry now enables only `m-350`, `m-510` and `m-896`. The other 11 identities remain `IDENTITY_ONLY` and are rejected before any CMS request.

## Architecture and compatibility result

- M-896 uses the existing dynamic route, registry loader, GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` component, CSS module and shared Malaysia Global Chrome.
- No standalone M-896 route, Header, Footer, stylesheet or alternate site-scope implementation was created.
- The shared technical row DTO now supports two mutually exclusive shapes:
  - legacy: `property + optional standard + typical`;
  - value-based: `property + value + optional testMethod`.
- The renderer uses M-896 `row.value` for the visible Value column and `row.testMethod` only for the Test method column.
- Product `additionalProperty.value` uses M-896 `row.value`; test methods never become Schema values.
- Missing/empty `value`, shifted test-method data, wrong Page ID, Grade, locale, path, slug, hash or scope fails closed.
- M-350 and M-510 screenshot hashes, visible HTML shapes and JSON-LD value mappings remain unchanged.

## M-896 content and runtime checks

- Exactly one H1: `M-896 Titanium Dioxide for Industrial Coating Evaluation`.
- Hero visual has exactly `label`, `technicalFile`, `currentData` and `note`.
- The approved Hero action inventory is exactly Quote + Sample; Documents/TDS is not a Hero action.
- Runtime contextual actions are currently omitted because scoped downstream receivers/routes are not `LIVE_APPROVED`.
- Six application cards render; all six use `category=Coatings`.
- Two evaluation groups render.
- Eleven technical rows render with `Property | Value | Test method`.
- Origin Support, Related Grades and Not Recommended produce no wrapper, navigation item, Schema or reserved gap.
- Exact RFQ/Sample/Document prefill values are covered in ready-state unit tests.
- Canonical: `https://tio2malaysia.com/products/m-896/`; one HTTPS self-canonical, no query/hash and no hreflang.
- JSON-LD: one graph containing Product + BreadcrumbList; exactly 11 `additionalProperty` entries.
- Product Schema has no image because no approved M-896 media exists.
- Offer, price, availability, rating, review, manufacturer, origin, compliance, certification and comparison Schema are absent.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS.
- M-896 seed: PASS; local post ID `17330`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-350: `GRADE-M350`, 15 rows, legacy three-column shape.
- GraphQL M-510: `GRADE-M510`, 12 rows, legacy two-column shape.
- GraphQL M-896: `GRADE-M896`, 11 rows, `Property | Value | Test method`.
- GraphQL M-996: rejected as not authorized.
- M-896 public projection currently contains only Hero, Positioning, Applications, Evaluation and Technical; every unavailable contextual module fails closed.

## Automated verification

| Check | Result |
|---|---|
| Focused Vitest | PASS — 11 files, 45 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510 and M-896 Product Detail SSG entries |
| Product Detail Playwright | PASS — 22/22 |
| M-350 regression | PASS — 7 screenshot hashes unchanged |
| M-510 regression | PASS — 7 screenshot hashes unchanged |
| M-896 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at all tested M-896 viewports |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — visible links/buttons at least 44 × 44px |
| Keyboard/focus | PASS — Mobile Menu Escape returns focus; current state remains semantic |
| Other Grade routes | PASS — all other 11 return 404 without an indexable Product shell |

## M-896 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m896-1440.png` | `0AF4358A475F155494A0D09DD8CBC685EDF85C75A2324D3C1ED55408CBCCA06C` |
| 1024 | `m896-1024.png` | `F64377C5A105D37231F8C7533538DD4909139F376F47DAE00A8CD007B540B50A` |
| 768 | `m896-768.png` | `7709222C0BB7DD845509FEF0B5265F2264F8F2A37A3FCF3FFABA91AFEACE073C` |
| 430 | `m896-430.png` | `3E5B626153F524BABCB8DDA4BF5522470D6DE851B19F4ED0339F96801A0AEBA0` |
| 390 | `m896-390.png` | `7A4B9DDC624D10A82340ED087AFAEAC7A551BE162BED8E009D6456516A1C1C22` |
| 320 | `m896-narrow-320.png` | `04F98DB4EEC1658896CF396B67DCC52A9FE4332D4E277B6223CA8BDD771AE8A9` |
| 200% equivalent | `m896-200-percent-zoom-equivalent.png` | `071A6D4259DD094D514A5EA10A4E5A1AE6E765F8FB3D4A7CA65B94D9F1344081` |

Manual inspection confirmed stable module order, readable three-column/stacked technical data, visible Header/Footer Logos, correct shared current-state markers, no collision, clipping, horizontal overflow or empty optional-module gaps.

## Unchanged M-350/M-510 visual baselines

- M-350: `1440=CB3C680C…`, `1024=14391350…`, `768=C57DCEEC…`, `430=D3F804BA…`, `390=C55200F6…`, `320=89928FFB…`, `200%=93A6EE9F…`.
- M-510: `1440=93B77D1B…`, `1024=A751A68C…`, `768=3CB6E0C0…`, `430=849C17A2…`, `390=B9B02615…`, `320=9924E37A…`, `200%=8F5310AF…`.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- Sample, Documents/TDS, Process, Application and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- No deployment, production write, DNS, publication, sitemap opening, indexing or Gate 10 operation was performed.
