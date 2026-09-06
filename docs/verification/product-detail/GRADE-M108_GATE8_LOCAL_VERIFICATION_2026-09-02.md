# GRADE-M108 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M108-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Handoff: `GRADE-M108-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-108/`; scope: `site_scope=tio2-my`; state: local production-equivalent preview candidate only.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow` and sitemap authorization false.
- This is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS or indexing evidence.
- M-210 and all later serial Grades remain locked, identity-only and unimplemented.

## Approved contract binding

- Gate 7 Manifest SHA-256: `75E243A704BB47E0B068A153CA7607256BBEB142427340358BA05F38A4E3C28A`.
- D23 approved raw contract SHA-256: `998C57D70AC303C0F47AC3E14B0C9214F4D53BC91130044274773B7CD3260BFF`.
- D16 repository contract raw SHA-256: `E2DBFCDA3D8D302552D8ABB5A32EA075D7E847B79FC2C31E4FA0353D0807BE22`.
- Canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `0579A4F1E452AB6609FAB529D86C07B1DD717039F8B8AAD9DAB37412AC0BF84B`.
- The raw hashes reflect their different source formatting. Parsed repository and D23 contracts are semantically identical and produce the same approved canonical hash; the registry retains the D23 raw hash as provenance.
- Node and PHP registry loaders validate the approved source/canonical binding. Missing, malformed or mismatched hashes fail closed.

The shared registry preview-enables only M-350, M-510, M-896, M-895, M-108, M-340, M-886 and M-52. The other six identities are rejected before any CMS request.

## Architecture and content result

- M-108 reuses the existing dynamic route, registry, scoped GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` template/CSS and unique Malaysia Global Chrome.
- No M-108-only route, component, Header, Mobile Menu, Footer, CSS fork or site-scope fallback was created.
- Exact approved H1, hero copy/visual, five facts, positioning and sulfate-process wording are preserved.
- Three application cards render in exact order: Masterbatch and Compounds, Polyolefin and PVC Film, and Plastics Requiring High Thermal Stability. Coatings, Printing Inks, Paper and Specialty Materials have zero visible copy, category, metadata, Schema, prefill or route output.
- Two evaluation groups/eight items and all ten source-faithful `property/value/testMethod` technical rows render.
- Moisture when packed remains `0.4% max`; the within-48-hours note is preserved. Filename-only `2023V3` and `V3 2023` have zero public output.
- Origin Support, Related Grades, Not Recommended, FAQ and embedded RFQ are absent without wrappers or reserved gaps.
- The approved Hero inventory is exactly Quote + Sample. Runtime conditional actions and downstream modules are currently omitted because their scoped routes/receivers are not `LIVE_APPROVED`.
- Ready-state RFQ/Sample/Document prefills remain exactly `site_scope=tio2-my`, `grade=M-108`, `source_page=GRADE-M108`; Documents additionally uses `requested_type=TDS`.

## SEO, GEO and Schema

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-108/`; no query, hash or hreflang.
- Robots remain `noindex,nofollow`; M-108 is absent from the authorized sitemap.
- One JSON-LD graph contains exactly Product + BreadcrumbList and ten meaningful `additionalProperty` entries.
- Schema contains no filename-only version, Coatings, Printing Inks, Paper, Specialty Materials, Offer, manufacturer, countryOfOrigin, isSimilarTo, rating, review, price, stock, compliance, packaging or logistics inference.
- No Product image is emitted because no approved M-108 product media was supplied.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS for the M-108 seed.
- Local seed: PASS; post ID `17340`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-108: `GRADE-M108`, `/products/m-108/`, three exact applications in `Masterbatch, Plastics, Plastics` order, two/eight evaluation items and ten technical rows.
- GraphQL public projection filename-version and unsupported-application matches: zero; process: `Sulfate process`.
- GraphQL M-210: rejected with `The requested Malaysia Product Detail is not authorized.`
- Missing or invalid scoped records remain errors/release blockers; no other scope is queried.

## Automated verification

| Check | Result |
|---|---|
| Focused Product Detail Vitest | PASS — 17 files, 92 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510, M-896, M-895, M-108, M-340, M-886 and M-52 Product Detail SSG entries |
| Product Detail Playwright | PASS — 57/57 |
| M-108 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at every tested M-108 viewport |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — all visible links/buttons at least 44 × 44px |
| Keyboard/current state | PASS — Escape returns focus; visible CURRENT=0; Desktop 3px and Mobile 4px markers remain intact |
| Shared Chrome and Logos | PASS — shared Header/Footer, rendered SVG Logos, fixed RFQ and footer labels at every viewport |
| Other Grade routes | PASS — all other six return 404 without an indexable Product shell |

## M-108 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m108-1440.png` | `7B272976FAEB1B0C97FDFEF6A0B550CD1CCD84BF3B75BA5F683C51BBA08D9D0E` |
| 1024 | `m108-1024.png` | `53DDF2456E6116F3A2CB009FD7CFDF87D8EA4F8591B04085C9B1D048536EB92C` |
| 768 | `m108-768.png` | `4B70CF2353B085BB8691D85DA0F6248CD8D18866D8B1FF792EA6D035D13F8F58` |
| 430 | `m108-430.png` | `5BB7AB471F3C6D97171AD7B6780F959448962DC68564C1DEDD28E6CAA20E6984` |
| 390 | `m108-390.png` | `6B38E23BE4D56720C403C6D443234E24BEEA0E03A6B40C3B522A1083CE6ACA9F` |
| 320 | `m108-narrow-320.png` | `B91CD4641D3189F2EF80F640D5C001346D81535F3F3F6F7C3A876CBD5976051F` |
| 200% equivalent | `m108-200-percent-zoom-equivalent.png` | `653CA540036E121D6809BFCA218AC4F4ACF2182719522976E061ACFDACED6A2A` |

Manual inspection of 1440, 1024, 768 and 390 confirmed visible Header/Footer Logos, stable module order, readable technical data, no filename-only version, empty optional-module gap, collision, clipping or horizontal overflow. Re-running the full suite left all 49 committed M-350, M-510, M-896, M-895, M-340, M-886 and M-52 screenshot files byte-identical. Their renderer, contracts and visible HTML were not changed; their exact JSON-LD counts and values passed the shared regression suite.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Sulfate Process, Plastics, Masterbatch and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- M-210 remains locked pending its own independent Gate 8 authority.
- No Gate 10, deployment, production write, DNS, publication, sitemap opening or indexing operation was performed.
