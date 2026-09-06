# GRADE-M886 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M886-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`.
- Handoff: `GRADE-M886-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-886/`; scope: `site_scope=tio2-my`; state: local production-equivalent preview candidate only.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow` and sitemap authorization false.
- This is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS or indexing evidence.
- M-52 and all later serial Grades remain locked, identity-only and unimplemented.

## Approved contract binding

- Gate 7 Manifest SHA-256: `82BB50CAA5A86E83F3ED0B7E196D3598634F3579DB28C1C1CC5D61CBAF914253`.
- D23 approved raw contract SHA-256: `D4A68225CC29B06D9B9700DB5CFA9C8D74C154C49E643A450A24B759981267B0`.
- Canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `9CDDABD077B99163262B77644D9C939CED343B50C3F014869F5A798254DB40B8`.
- Parsed repository and D23 contracts are semantically identical and produce the same canonical hash.
- Node and PHP registry loaders validate the approved source/canonical binding. Missing, malformed or mismatched hashes fail closed.

The shared registry preview-enables only M-350, M-510, M-896, M-895, M-340 and M-886. The other eight identities are rejected before any CMS request.

## Architecture and content result

- M-886 reuses the existing dynamic route, registry, scoped GraphQL resolver, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` template/CSS and unique Malaysia Global Chrome.
- No M-886-only route, component, Header, Mobile Menu, Footer, CSS fork or site-scope fallback was created.
- Exact approved H1, hero copy/visual, five facts, positioning and chloride-process wording are preserved.
- Three application cards render in exact order: Polyolefin Masterbatches, High-Temperature Extrusion and Cast-Film Processing, and Engineering Plastics. Footwear and Coatings have zero visible copy, category, metadata, Schema, prefill, route or evaluation output.
- Two evaluation groups/eight items and all ten source-faithful `property/value/testMethod` technical rows render.
- Moisture when packed remains `0.4% max`; the source-qualified within-48-hours note is preserved. Historical `11/2024` content has zero output.
- Origin Support, Related Grades and Not Recommended are absent without wrappers or reserved gaps.
- The approved Hero inventory is exactly Quote + Sample. Runtime conditional actions and downstream modules are currently omitted because their scoped routes/receivers are not `LIVE_APPROVED`.
- Ready-state RFQ/Sample/Document prefills remain exactly `site_scope=tio2-my`, `grade=M-886`, `source_page=GRADE-M886`; Documents additionally uses `requested_type=TDS`.

## SEO, GEO and Schema

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-886/`; no query, hash or hreflang.
- Robots remain `noindex,nofollow`; M-886 is absent from the authorized sitemap.
- One JSON-LD graph contains exactly Product + BreadcrumbList and ten meaningful `additionalProperty` entries.
- Schema contains no Footwear, Coatings, `11/2024`, Offer, manufacturer, countryOfOrigin, isSimilarTo, rating, review, price, stock, compliance, packaging or logistics inference.
- No Product image is emitted because no approved M-886 product media was supplied.

## Local WordPress and GraphQL evidence

- PHP syntax: PASS for the M-886 seed.
- Local seed: PASS; post ID `17336`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL M-886: `GRADE-M886`, `/products/m-886`, three applications in exact approved category order and ten technical rows.
- GraphQL public projection Footwear and Coatings matches: zero.
- GraphQL M-52: rejected with `The requested Malaysia Product Detail is not authorized.`
- Missing or invalid scoped records remain errors/release blockers; no other scope is queried.

## Automated verification

| Check | Result |
|---|---|
| Focused Product Detail Vitest | PASS — 15 files, 76 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Fresh TiO2 Malaysia production build | PASS — only M-350, M-510, M-896, M-895, M-340 and M-886 Product Detail SSG entries |
| Product Detail Playwright | PASS — 43/43 |
| M-886 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Axe | PASS — zero violations at every tested M-886 viewport |
| Horizontal overflow | PASS at every tested viewport |
| Mobile touch targets | PASS — all visible links/buttons at least 44 × 44px |
| Keyboard/current state | PASS — Escape returns focus; visible CURRENT=0; Desktop 3px and Mobile 4px markers remain intact |
| Shared Chrome and Logos | PASS — shared Header/Footer, rendered SVG Logos, fixed RFQ and footer labels at every viewport |
| Other Grade routes | PASS — all other eight return 404 without an indexable Product shell |

## M-886 visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m886-1440.png` | `63340987FB7EADDA47BE66265ADF6CE7509FCE1C80FB98868ACF13E6BF709C55` |
| 1024 | `m886-1024.png` | `ACBC80476FE50669DF28F936886D86BD6B666BA43AF9C9055A13B04368F810DC` |
| 768 | `m886-768.png` | `9F29BA03739B8A2AA8C75E155A95FD48E45005C7ECAAE4BF87E4FA1E994D61A0` |
| 430 | `m886-430.png` | `425AD20C8528503E099CE25C19DA9D96154FAE159F0FD3DC7587F759D9E8B263` |
| 390 | `m886-390.png` | `04E82F2931836C0143B8DF906C41FE268DDBB6214AC21A15CEF30EFD15096C4B` |
| 320 | `m886-narrow-320.png` | `B3400B502DB9C0515B2E512D3610E663AA4E6F298A3153CF8F9651FA14C4F355` |
| 200% equivalent | `m886-200-percent-zoom-equivalent.png` | `D3163C227C0C7C1AA0B1734ED3CC7AED09996CA1877E54F009CB87EF75723768` |

Manual inspection of 1440, 1024, 768 and 390 confirmed visible Header/Footer Logos, stable module order, readable technical data, no empty optional-module gap, collision, clipping or horizontal overflow. Re-running the full suite left all 35 committed M-350, M-510, M-896, M-895 and M-340 screenshot files byte-identical. Their renderer, contracts and visible HTML were not changed; their exact JSON-LD counts and values passed the shared regression suite.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Process, Plastics, Masterbatch and Market destinations remain omitted until their scoped route/receiver records are `LIVE_APPROVED`.
- M-52 remains locked pending its own independent Gate 8 authority.
- No Gate 10, deployment, production write, DNS, publication, sitemap opening or indexing operation was performed.
