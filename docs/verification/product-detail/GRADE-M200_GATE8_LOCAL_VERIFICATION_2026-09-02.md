# GRADE-M200 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M200-G7-PCR-02 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Rebind: `GRADE-M200-G8-REBIND-01 = CONTROLLER_AUTHORIZED / HANDED_OFF / RESUMED`.
- Route: `/products/m-200/`; scope: `site_scope=tio2-my`; state: local production-equivalent preview candidate only.
- Runtime record state is exactly `approved_for_preview`; release controls remain `PREVIEW_ONLY`, `noindex,nofollow` and sitemap authorization false.
- This is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS or indexing evidence.
- M-996 and all later unauthorized serial Grades remain locked, identity-only and unimplemented.

## Corrected V0.2 contract binding

- Gate 7 V0.2 Manifest SHA-256: `BDD8B3388F1CAF06DB1A794C351F17308DABE95B1B737A3C43ABF7D51307ED78`.
- D23 approved V0.2 raw contract SHA-256: `A19BDC03170470EECCC46497AFBBE4FFEF6288DB59C9C5F6163017C3DF6D8320`.
- D16 repository contract raw SHA-256: `38D88A0E26D083BA7C5CBC70E086CF400646C74D04F42C6F65F9FE87F3E073DD`.
- Canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `815F920541B53A6038C1B214F41F35B55F654C74BBDECEC66BF5A54585690369`.
- The raw hashes reflect different source formatting. Parsed repository and D23 V0.2 contracts are semantically identical and produce the same approved canonical hash; the registry retains the D23 raw hash as provenance.
- The only V0.1 → V0.2 semantic change is `identity.recordState: candidate_for_preview → approved_for_preview`; public copy, facts, routes, SEO/GEO/Schema and release controls are unchanged.
- Node and PHP registry loaders validate the approved source/canonical binding. Missing, candidate, unknown, malformed or mismatched runtime state fails closed.
- The shared PHP validator remains unchanged and accepts only `approved_for_preview`; no candidate-state compatibility was added.

The shared registry preview-enables only M-350, M-510, M-896, M-895, M-200, M-108, M-210, M-340, M-886 and M-52. The other four identities are rejected before any CMS request.

## Architecture and content result

- M-200 reuses the existing dynamic route, registry, scoped GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` template/CSS and unique Malaysia Global Chrome.
- No M-200-only route, component, Header, Mobile Menu, Footer, CSS fork or site-scope fallback was created.
- Exact approved H1, hero copy/visual, five facts, positioning, chloride-process wording and visible `M-200 / V1 2026` identity are preserved.
- Three application cards render in exact order: uPVC Profiles, Plates and Exterior Furniture; PVC Calendered Films, Including Advertising Film; and Durable Plastic Masterbatch. Their exact categories remain `Plastics, Plastics, Masterbatch`.
- Two evaluation groups/eight items and all twelve source-faithful `property/value` technical rows render. The approved table has exactly two columns (`Property`, `Typical value`) and zero `testMethod` field or cell output.
- `CR-200`, `2024 V3`, legacy TIOVAR/contact/domain output, storage/packaging/container-loading/shipment-availability claims, Coatings, Printing Inks, Paper, Specialty Materials, origin, comparison, compliance and commerce claims have zero public copy, metadata, Schema, prefill or route output.
- Origin Support, Related Grades, Not Recommended, FAQ and embedded RFQ are absent without wrappers or reserved gaps.
- The approved Hero inventory is exactly Quote + Sample. Runtime conditional actions and downstream modules are currently omitted because their scoped routes/receivers are not `LIVE_APPROVED`.
- Ready-state RFQ/Sample/Document prefills remain exactly `site_scope=tio2-my`, `grade=M-200`, `source_page=GRADE-M200`; Documents additionally uses `requested_type=TDS`.

## SEO, GEO and Schema

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-200/`; no query, hash or hreflang.
- Robots remain `noindex,nofollow`; M-200 is absent from the authorized sitemap.
- One JSON-LD graph contains exactly Product + BreadcrumbList and twelve meaningful `additionalProperty` entries.
- Schema contains no internal filename/metadata token, legacy contact, unsupported application, Offer, manufacturer, countryOfOrigin, isSimilarTo, rating, review, price, stock, compliance, packaging or logistics inference.
- No Product image is emitted because no approved M-200 product media was supplied.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS for the unchanged shared validator and M-200 seed.
- Local seed: PASS; post ID `17344`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-200: `GRADE-M200`, `/products/m-200/`, three exact applications in `Plastics, Plastics, Masterbatch` order, two/eight evaluation items and twelve technical rows.
- GraphQL public projection has exactly `Property, Typical value`, zero Test Method fields, four approved visible `V1 2026` occurrences, zero forbidden-output matches and process `Chloride process`.
- GraphQL M-996: rejected with `The requested Malaysia Product Detail is not authorized.`
- Missing or invalid scoped records remain errors/release blockers; no other scope is queried.

## Automated verification

| Check | Result |
|---|---|
| Focused Product Detail Vitest | PASS — 19 files, 108 tests |
| Broader Product test regression | PASS — 38 files, 620 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| PHP syntax and local seed | PASS |
| `git diff --check` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510, M-896, M-895, M-200, M-108, M-210, M-340, M-886 and M-52 Product Detail SSG entries |
| Product Detail Playwright | PASS — 71/71 |
| M-200 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at every tested M-200 viewport |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — all visible links/buttons at least 44 × 44px |
| Keyboard/current state | PASS — Escape returns focus; visible CURRENT=0; Desktop 3px and Mobile 4px markers remain intact |
| Shared Chrome and Logos | PASS — shared Header/Footer, rendered SVG Logos, fixed RFQ and footer labels at every viewport |
| Other Grade routes | PASS — all other four return 404 without an indexable Product shell |

## M-200 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m200-1440.png` | `00F09345035416F7CC013E54618BB4A8F6950165907333CEEAC5E8F3656594F8` |
| 1024 | `m200-1024.png` | `7B16EFEA7E8BA2FA2E3CAB1D4EF628ACD272F38C2697B880F6F93119AEE649FB` |
| 768 | `m200-768.png` | `95B9A1AA7F4A9350058B71F0971018CC2ECBFF2C58EC9F2FD8CA606F6925A690` |
| 430 | `m200-430.png` | `DC821030E27A968D1AE579DC745C3DB778ECBDA4A403D56EB794712C3E4B0C6A` |
| 390 | `m200-390.png` | `6210C51B20328D14A1E36CFC726BC70F3F42BB26CE422D8F40526915C47062E1` |
| 320 | `m200-narrow-320.png` | `44EFED7C42615CFBA6A077FA8DD32B617AF5CA4836574575CC78BD489023F383` |
| 200% equivalent | `m200-200-percent-zoom-equivalent.png` | `F25D35108F2CE2758AAB25C34EF9C7E962DF9B932FDE70540380248A61C51DEC` |

Manual inspection of 1440, 1024, 768 and 390 confirmed visible Header/Footer Logos, stable module order, readable two-column technical data, visible `M-200 / V1 2026`, no unsupported module gap, collision, clipping or horizontal overflow. Re-running the full suite left all 63 committed prior-Grade screenshot files byte-identical. Their renderer, contracts and visible HTML were not changed; their exact JSON-LD counts and values passed the shared regression suite.

The first V0.2 build attempt reused a pre-correction temporary dist directory and correctly failed closed on its stale candidate-state response. A fresh isolated V0.2 dist directory rebuilt successfully without runtime-code or validator changes. Neither temporary build directory is committed.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Chloride Process, Plastics, Masterbatch and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- M-996 and the other four identity-only Grades remain locked pending their own independent Gate 8 authority.
- No Gate 10, deployment, production write, DNS, publication, sitemap opening or indexing operation was performed.
