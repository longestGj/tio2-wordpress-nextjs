# GRADE-M210 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M210-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Handoff: `GRADE-M210-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-210/`; scope: `site_scope=tio2-my`; state: local production-equivalent preview candidate only.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow` and sitemap authorization false.
- This is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS or indexing evidence.
- M-200 and all later unauthorized serial Grades remain locked, identity-only and unimplemented.

## Approved contract binding

- Gate 7 Manifest SHA-256: `A5B10E27BC0C56AB40E327876B2A8940BB80B3B16E660ECEBFA0123C8DF68AB7`.
- D23 approved raw contract SHA-256: `F977D5DD3C49119966CD3C4EC5E846448BBFBD5BE1F4846B82B8CD1CBA6463B2`.
- D16 repository contract raw SHA-256: `1B65F74881D5364CCDF9D6B2074479D741D5AED81950E14BDC4EFEF941668AF1`.
- Canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `F2CEDE18EFA0ADE179C4D5BAC72BEB25A2E8A826A825C0344757D04ABC4B8B94`.
- The raw hashes reflect their different source formatting. Parsed repository and D23 contracts are semantically identical and produce the same approved canonical hash; the registry retains the D23 raw hash as provenance.
- Node and PHP registry loaders validate the approved source/canonical binding. Missing, malformed or mismatched hashes fail closed.

The shared registry preview-enables only M-350, M-510, M-896, M-895, M-108, M-210, M-340, M-886 and M-52. The other five identities are rejected before any CMS request.

## Architecture and content result

- M-210 reuses the existing dynamic route, registry, scoped GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` template/CSS and unique Malaysia Global Chrome.
- No M-210-only route, component, Header, Mobile Menu, Footer, CSS fork or site-scope fallback was created.
- Exact approved H1, hero copy/visual, five facts, positioning and chloride-process wording are preserved.
- Three application cards render in exact order: Polyolefin Masterbatch; Engineering Plastics: PE, PP and ABS; and PS and Its Copolymers. Their exact categories remain `Masterbatch, Plastics, Plastics`.
- Two evaluation groups/eight items and all twelve source-faithful `property/value` technical rows render. The approved table has exactly two columns (`Property`, `Typical value`) and zero `testMethod` field or cell output.
- Printed `V3 2023` is preserved in approved visible product data. Filename-only FDA/food-contact, Rubber, Coatings, Printing Inks, Paper, Specialty Materials, origin, packaging/logistics and commerce claims have zero visible copy, metadata, Schema, prefill or route output.
- Origin Support, Related Grades, Not Recommended, FAQ and embedded RFQ are absent without wrappers or reserved gaps.
- The approved Hero inventory is exactly Quote + Sample. Runtime conditional actions and downstream modules are currently omitted because their scoped routes/receivers are not `LIVE_APPROVED`.
- Ready-state RFQ/Sample/Document prefills remain exactly `site_scope=tio2-my`, `grade=M-210`, `source_page=GRADE-M210`; Documents additionally uses `requested_type=TDS`.

## SEO, GEO and Schema

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-210/`; no query, hash or hreflang.
- Robots remain `noindex,nofollow`; M-210 is absent from the authorized sitemap.
- One JSON-LD graph contains exactly Product + BreadcrumbList and twelve meaningful `additionalProperty` entries.
- Schema contains no filename-only unsupported claim, FDA/food-contact, Rubber, Coatings, Printing Inks, Paper, Specialty Materials, Offer, manufacturer, countryOfOrigin, isSimilarTo, rating, review, price, stock, compliance, packaging or logistics inference.
- No Product image is emitted because no approved M-210 product media was supplied.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS for the M-210 seed.
- Local seed: PASS; post ID `17342`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-210: `GRADE-M210`, `/products/m-210/`, three exact applications in `Masterbatch, Plastics, Plastics` order, two/eight evaluation items and twelve technical rows.
- GraphQL public projection has exactly `Property, Typical value`, zero Test Method fields, four approved printed `V3 2023` occurrences, zero forbidden-output matches and process `Chloride process`.
- GraphQL M-200: rejected with `The requested Malaysia Product Detail is not authorized.`
- Missing or invalid scoped records remain errors/release blockers; no other scope is queried.

## Automated verification

| Check | Result |
|---|---|
| Focused Product Detail Vitest | PASS — 18 files, 100 tests |
| Broader Product test regression | PASS — 37 files, 612 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510, M-896, M-895, M-108, M-210, M-340, M-886 and M-52 Product Detail SSG entries |
| Product Detail Playwright | PASS — 64/64 |
| M-210 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at every tested M-210 viewport |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — all visible links/buttons at least 44 × 44px |
| Keyboard/current state | PASS — Escape returns focus; visible CURRENT=0; Desktop 3px and Mobile 4px markers remain intact |
| Shared Chrome and Logos | PASS — shared Header/Footer, rendered SVG Logos, fixed RFQ and footer labels at every viewport |
| Other Grade routes | PASS — all other five return 404 without an indexable Product shell |

## M-210 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m210-1440.png` | `3378FCD3C303DBCF83870999112E8738DF53C8113036C01ECB5389394788D8B7` |
| 1024 | `m210-1024.png` | `32E8BBF3DBDEE485006DC96CB0AF9A1A594EF51DF8EF61A6F479F85AD22961FF` |
| 768 | `m210-768.png` | `99AB79ABA1215131D504314A1127DB5A7D8A0B499672F5480729D2624DFC5A5A` |
| 430 | `m210-430.png` | `F8E525691E998D5ED413EFAF9E767FCC88EC7C37CC80DA3F8D9A3D45F7AE3D8F` |
| 390 | `m210-390.png` | `AF9761904087E37B437CA59B228766462DF780B39090C83628EE3E5325694F41` |
| 320 | `m210-narrow-320.png` | `5AC7E9894394C5C5147E4E67905FA5F9F752DA659E74C7449E422A3611538766` |
| 200% equivalent | `m210-200-percent-zoom-equivalent.png` | `AEC2F5C4B36A17723E6A2F804E0FFCE4068E0A73349C6300F5E8D7BBBA1F34C9` |

Manual inspection of 1440, 1024, 768 and 390 confirmed visible Header/Footer Logos, stable module order, readable two-column technical data, approved printed version, no unsupported module gap, collision, clipping or horizontal overflow. Re-running the full suite left all 56 committed prior-Grade screenshot files byte-identical. Their renderer, contracts and visible HTML were not changed; their exact JSON-LD counts and values passed the shared regression suite.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Chloride Process, Plastics, Masterbatch and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- M-200 and the other five identity-only Grades remain locked pending their own independent Gate 8 authority.
- No Gate 10, deployment, production write, DNS, publication, sitemap opening or indexing operation was performed.
