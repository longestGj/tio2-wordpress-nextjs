# GRADE-M2196 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M2196-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`; `GRADE-M2196-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-2196/`; scope: `site_scope=tio2-my`; runtime state: `approved_for_preview`.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow`, and `sitemapAuthorized=false`.
- This is local Gate 8 implementation evidence only. It is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS, sitemap opening, or indexing evidence.
- M-2377 and CR-901 remain identity-only and return 404 before CMS access.

## Contract binding and architecture

- Gate 7 Manifest SHA-256: `528775BA979D5E8B8346AB51070358BB5FACD8A8598D1B8A8C2030EDBB538B43`.
- D23 approved raw contract SHA-256: `6ADB2A350F3E7F2A3F5138969E4A16A5F7E81993A25729A4906838FB2116CA3C`.
- D16 repository runtime contract raw SHA-256: `107B7E6A7E42C83D7AEC98CC816A6BE2E843A250FB0DF824B2A2A05308C7C0B7`.
- Approved canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `82A63C9F7C164F4C48744F0F87513ED573E5067D3720962AC6DBC57AC679DE1C`.
- The raw hashes differ only because the repository runtime copy trims the source file's final extra LF. Parsed D16 and D23 contracts are semantically identical and produce the same approved canonical hash; the registry retains the D23 raw hash as provenance.
- M-2196 reuses the existing dynamic Product Detail route, approved-contract registry, scoped WordPress record and GraphQL resolver, DTO with optional exact-match technical footnote support, metadata/JSON-LD builders, shared template/CSS, and Malaysia Global Chrome. No M-2196 route, component, CSS, Header, Mobile Menu, or Footer fork was created.
- The shared validator was not relaxed. The M-2196 contract must match its approved registry identity and every approved module value exactly.

## Public content and fail-closed behavior

- Public relationships are only Coatings and Sulfate.
- Two application cards render in approved order: Solvent-Based Furniture Paint; Solvent-Based Industrial Paint.
- Evaluation renders exactly two groups and eight items.
- Technical data renders exactly three columns (`Parameter`, `Value`, `Test method`), seventeen rows, and seventeen `testMethod` cells. All five source `-` methods remain visible as `-`.
- `Volatiles at 105°C, at packaging` appears exactly once as an approved technical parameter. It does not create packaging-offer, quantity, loading, logistics, or commercial output.
- The approved CoA typical-data footnote is visible immediately after the technical table.
- Origin Support, Related/Comparison, Not Recommended, FAQ, and embedded RFQ modules are absent without wrappers or reserved gaps.
- Runtime conditional actions and downstream modules are omitted because their scoped receivers/routes are not `LIVE_APPROVED`. Ready-state tests preserve the exact M-2196 RFQ, Sample, and TDS prefills without rendering unavailable links.
- Public copy, metadata, Schema, routes, and prefills contain no M-996 comparison, TIOXHUA/R-2196/CHTi/vendor output, secondary-only Powder/Architectural directions, durability/opacity claims, alternate values, CAS/Color Index, non-Coatings applications, food-contact, safety/storage, packaging offers/loading, origin, compliance, logistics, or commerce output.

## SEO, GEO, Schema, and isolation

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-2196/`; no query, hash, cross-scope canonical, or hreflang.
- Robots are `noindex,nofollow`; sitemap authorization remains false.
- One JSON-LD graph contains exactly Product + BreadcrumbList and seventeen `additionalProperty` entries.
- Every PropertyValue uses the visible technical row `value`; `testMethod` is never converted into a Schema claim.
- The local GraphQL call accepts only slug `m-2196`, returns the single `tio2-my` scoped record, and uses scope-local route/content cache tags. Missing, duplicate, malformed, hash-mismatched, foreign-scope, or unauthorized records fail closed without cross-scope fallback.

## Automated verification

| Check | Result |
|---|---|
| Registry RED test before implementation | PASS evidence — failed only because `m-2196` was absent |
| Focused registry/DTO/query/route/infrastructure | PASS — 5 files, 55 tests |
| Product Detail regression | PASS — 41 files, 642 tests |
| Changed-file ESLint | PASS |
| Repository-wide `npm run lint` | ENVIRONMENTAL FAIL — scans pre-existing ignored `.tmp/.next-stale-*` generated bundles; 942 generated-code errors and 21,087 warnings, outside this change |
| TypeScript `tsc --noEmit` | PASS |
| PHP syntax and local M-2196 seed | PASS; local post ID `17348` |
| Local GraphQL projection | PASS; exact `tio2-my/m-2196`, approved preview state, 2 applications, 17 technical rows, and CoA footnote |
| Fresh TiO2 Malaysia preview production build | PASS; twelve approved Product Detail SSG routes |
| Focused M-2196 Playwright | PASS — 8/8 |
| Product Detail Playwright regression | PASS — 85/85 |
| M-2196 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320, and 200% equivalent |
| Axe / overflow / touch targets | PASS — zero Axe violations, no horizontal overflow, mobile visible targets at least 44 × 44px |
| Shared Chrome | PASS — SVG Header/Footer Logos, 84/64px behavior, visible CURRENT=0, Desktop 3px marker, Mobile 4px marker, Escape focus return, fixed RFQ |
| Later Grade routes | PASS — M-2377 and CR-901 return 404 |
| Prior Grade evidence | PASS — full E2E regenerated prior paths with no Git-visible content changes |

## Visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m2196-1440.png` | `F14A83794304962FE3B35D30B8E0448F8824E2CACB535D56A4F640185F9F3DE7` |
| 1024 | `m2196-1024.png` | `C63D1FA5F6D509E90885EB5D887A83A8864C48CC8476BE5CC7A3F88AB3773EE3` |
| 768 | `m2196-768.png` | `04F5564F0C6BA820E905151A3DF86C7F38F1C0101A8CDE982D08536B4464ABF1` |
| 430 | `m2196-430.png` | `6ADFF9938661A5E8E24486571AE447BF6F3FAAF108B12B9CDC5898BA0BC12CFA` |
| 390 | `m2196-390.png` | `8416B316AF4B59941B8F758A7E4441EAEACA1C2E0B1246377454F9BEEE10FDD2` |
| 320 | `m2196-narrow-320.png` | `86EEDF2C91AA0AAFE5BC61C30D4E541C9C3310F4FF0C2BE3555876287759C0C8` |
| 200% equivalent | `m2196-200-percent-zoom-equivalent.png` | `2D4B7907B14BD4C283AD5571B1718F0BD8AF1861B0CDD1D4931F89E9F5AC7073` |

Manual inspection of all seven images confirmed visible Header/Footer Logos, stable approved module order, readable responsive table/card transformation, visible CoA footnote, and no unsupported-module gap, collision, clipping, or horizontal overflow.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Sulfate Process, Coatings, and Market destinations remain omitted until their own `tio2-my` routes/receivers are `LIVE_APPROVED`.
- M-2377 and CR-901 remain locked pending independent authorization.
- No deployment, publication, production write, DNS, Gate 10, sitemap opening, or indexing action was performed.
