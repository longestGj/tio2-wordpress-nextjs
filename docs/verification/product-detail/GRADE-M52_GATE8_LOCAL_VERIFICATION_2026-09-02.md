# GRADE-M52 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M52-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Handoff: `GRADE-M52-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-52/`; scope: `site_scope=tio2-my`; state: local production-equivalent preview candidate only.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow` and sitemap authorization false.
- This is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS or indexing evidence.
- M-108 and all later serial Grades remain locked, identity-only and unimplemented.

## Approved contract binding

- Gate 7 Manifest SHA-256: `FA156616FA803CA9F62A77562EA50B8D645FF084496439B03452EC6216668DAA`.
- D23 approved raw contract SHA-256: `977A72AF33377F7A3CAB12C4F72314E93CFD79F2BE0CCFCFD62A3A2D009DE1A7`.
- Canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `625C28008CAB44E95062A145897BC7E7B1E1565664AA86161CF9CB79E18EC1C4`.
- Parsed repository and D23 contracts are semantically identical and produce the same canonical hash.
- Node and PHP registry loaders validate the approved source/canonical binding. Missing, malformed or mismatched hashes fail closed.

The shared registry preview-enables only M-350, M-510, M-896, M-895, M-340, M-886 and M-52. The other seven identities are rejected before any CMS request.

## Architecture and content result

- M-52 reuses the existing dynamic route, registry, scoped GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` template/CSS and unique Malaysia Global Chrome.
- No M-52-only route, component, Header, Mobile Menu, Footer, CSS fork or site-scope fallback was created.
- Exact approved H1, hero copy/visual, five facts, positioning and sulfate-process wording are preserved.
- Three application cards render in exact order: Printing Inks, Can Coatings, and High-Gloss Interior Architectural Coatings. Plastics, Masterbatch, Paper and Specialty have zero visible copy, category, metadata, Schema, prefill or route output.
- Two evaluation groups/eight items and all eleven source-faithful `property/value/testMethod` technical rows render.
- Moisture when packed remains `0.3% max`; the `V3 2023` source label and within-48-hours note are preserved.
- Origin Support, Related Grades and Not Recommended are absent without wrappers or reserved gaps.
- The approved Hero inventory is exactly Quote + Sample. Runtime conditional actions and downstream modules are currently omitted because their scoped routes/receivers are not `LIVE_APPROVED`.
- Ready-state RFQ/Sample/Document prefills remain exactly `site_scope=tio2-my`, `grade=M-52`, `source_page=GRADE-M52`; Documents additionally uses `requested_type=TDS`.

## SEO, GEO and Schema

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-52/`; no query, hash or hreflang.
- Robots remain `noindex,nofollow`; M-52 is absent from the authorized sitemap.
- One JSON-LD graph contains exactly Product + BreadcrumbList and eleven meaningful `additionalProperty` entries.
- Schema contains no Plastics, Masterbatch, Paper, Specialty, Offer, manufacturer, countryOfOrigin, isSimilarTo, rating, review, price, stock, compliance, packaging or logistics inference.
- No Product image is emitted because no approved M-52 product media was supplied.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS for the M-52 seed.
- Local seed: PASS; post ID `17338`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-52: `GRADE-M52`, `/products/m-52/`, three applications in exact `Printing Inks, Coatings, Coatings` order, two/eight evaluation items and eleven technical rows.
- GraphQL public projection unsupported-application matches: zero; process: `Sulfate process`.
- GraphQL M-108: rejected with `The requested Malaysia Product Detail is not authorized.`
- Missing or invalid scoped records remain errors/release blockers; no other scope is queried.

## Automated verification

| Check | Result |
|---|---|
| Focused Product Detail Vitest | PASS — 16 files, 84 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510, M-896, M-895, M-340, M-886 and M-52 Product Detail SSG entries |
| Product Detail Playwright | PASS — 50/50 |
| M-52 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at every tested M-52 viewport |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — all visible links/buttons at least 44 × 44px |
| Keyboard/current state | PASS — Escape returns focus; visible CURRENT=0; Desktop 3px and Mobile 4px markers remain intact |
| Shared Chrome and Logos | PASS — shared Header/Footer, rendered SVG Logos, fixed RFQ and footer labels at every viewport |
| Other Grade routes | PASS — all other seven return 404 without an indexable Product shell |

## M-52 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m52-1440.png` | `4304EE1A9EE7415530DF11A5DDAC5755003DF2BF576ACF80D517ABA35D6C09B4` |
| 1024 | `m52-1024.png` | `5A7BD49A25C547C0F71C2CECB9BD4561ABFAC0F9172B66FE213982D210ABE799` |
| 768 | `m52-768.png` | `5195084287FBDC56E3B06E55F095770686B45EF41191C11C4ED51ADA54FD9E27` |
| 430 | `m52-430.png` | `8EA00B429DB70509F76085DE29B1C664AA04C480B8650B9E2CF429797A50210E` |
| 390 | `m52-390.png` | `0F158205BE9C2229F9CD5458FFD44D89B67C9699D960A43AE77B81EC41DC04F8` |
| 320 | `m52-narrow-320.png` | `41DC44F178576D8AF0BAE704F41B086ED87C2FF66DEAC5CCF6CDA261FD424DC0` |
| 200% equivalent | `m52-200-percent-zoom-equivalent.png` | `9E2C4AD31E0C6826ECADB4A426CAF65AF839028C782F9A2B398CCC875D81F3A6` |

Manual inspection of 1440, 1024, 768 and 390 confirmed visible Header/Footer Logos, stable module order, readable technical data, no empty optional-module gap, collision, clipping or horizontal overflow. Re-running the full suite left all 42 committed M-350, M-510, M-896, M-895, M-340 and M-886 screenshot files byte-identical. Their renderer, contracts and visible HTML were not changed; their exact JSON-LD counts and values passed the shared regression suite.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Sulfate Process, Printing Inks, Coatings and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- M-108 remains locked pending its own independent Gate 8 authority.
- No Gate 10, deployment, production write, DNS, publication, sitemap opening or indexing operation was performed.
