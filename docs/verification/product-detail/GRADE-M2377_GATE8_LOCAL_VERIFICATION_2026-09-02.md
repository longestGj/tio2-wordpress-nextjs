# GRADE-M2377 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M2377-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`; `GRADE-M2377-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-2377/`; scope: `site_scope=tio2-my`; runtime state: `approved_for_preview`.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow`, and `sitemapAuthorized=false`.
- This is local Gate 8 implementation evidence only. It is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS, sitemap opening, or indexing evidence.
- CR-901 remains identity-only and returns 404 before CMS access.

## Contract binding and architecture

- Gate 7 Manifest SHA-256: `322A1CB72ACFA0A699EC6896476F4B33216A0FD109870BF38D411AA815549434`.
- D23 approved raw contract SHA-256: `F735A9FF9486E8693B5E59E9BF25BBAD39F4B46D1B47DDAC630225D540AFB7FA`.
- D16 repository runtime contract raw SHA-256: `F735A9FF9486E8693B5E59E9BF25BBAD39F4B46D1B47DDAC630225D540AFB7FA`.
- Approved canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `90076D996D4147B79AA55B6AE354905ED75C418764174D8FBE13AB54FE1B2606`.
- The repository runtime contract is byte-identical to the approved D23 contract: 12,891 bytes, one LF at EOF.
- M-2377 reuses the existing dynamic Product Detail route, approved-contract registry, scoped WordPress record and GraphQL resolver, DTO, metadata/JSON-LD builders, shared template/CSS, and Malaysia Global Chrome. No M-2377 route, component, CSS, Header, Mobile Menu, or Footer fork was created.
- The shared Chrome infrastructure test now asserts both Product Detail Header/Footer receive the dynamic `pageId`; its obsolete M-350 literal assertion was corrected without changing the shared component.
- The shared validator was not relaxed. The M-2377 contract must match its approved registry identity and every approved module value exactly.

## Public content and fail-closed behavior

- Public relationships are exactly Coatings, Plastics, Masterbatch, Printing Inks, Paper, and Sulfate process.
- Five application cards render in approved order: Coatings; Plastics; Masterbatch; Printing Inks; Paper.
- Evaluation renders exactly two groups and eight items.
- Technical data renders exactly three columns (`Parameter`, `Value`, `Test method`), fourteen rows, and fourteen `testMethod` cells. The first thirteen methods remain visible as `-`; the final Classification method is exactly `ISO 591-1:2000(E); ASTM D476-00`.
- The approved test-report typical-data footnote is visible immediately after the technical table.
- Origin Support, Related/Comparison, Not Recommended, FAQ, and embedded RFQ modules are absent without wrappers or reserved gaps.
- Runtime conditional actions and downstream modules are omitted because their scoped receivers/routes are not `LIVE_APPROVED`. Ready-state tests preserve the exact M-2377 RFQ, Sample, and TDS prefills without rendering unavailable links.
- Public copy, metadata, Schema, routes, and prefills contain no Rubber, Specialty Materials, DOGUIDE/SR-2377/vendor/contact or source-packaging output, secondary-PDF-only methods or operations, origin, compliance, logistics, or commerce output. The approved phrase `additive package` is retained as a formulation term; it is not a packaging, loading, logistics, or commerce claim.
- Sulfate is retained as an approved public product/process relationship, while its provenance remains the approved user technical decision/Matrix and is not represented as a TDS-derived claim.

## SEO, GEO, Schema, and isolation

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-2377/`; no query, hash, cross-scope canonical, or hreflang.
- Robots are `noindex,nofollow`; sitemap authorization remains false.
- One JSON-LD graph contains exactly Product + BreadcrumbList and fourteen `additionalProperty` entries.
- Every PropertyValue uses the visible technical row `value`; `testMethod` is never converted into a Schema claim.
- The local GraphQL call accepts only slug `m-2377`, returns the single `tio2-my` scoped record, and uses scope-local route/content cache tags. Missing, duplicate, malformed, hash-mismatched, foreign-scope, or unauthorized records fail closed without cross-scope fallback.

## Automated verification

| Check | Result |
|---|---|
| Registry RED test before implementation | PASS evidence — failed only because `m-2377` was absent |
| Focused registry/DTO/query/route/infrastructure | PASS — 5 files, 58 tests |
| Product Detail regression | PASS — 42 files, 650 tests |
| Changed-file ESLint | PASS |
| Repository-wide `npm run lint` | Not rerun for this bounded Grade change; changed-file ESLint is clean. The repository-wide command is known to scan pre-existing ignored `.tmp/.next-stale-*` generated bundles outside this change. |
| TypeScript `tsc --noEmit` | PASS |
| PHP syntax and local M-2377 seed | PASS; local post ID `17350` |
| Local GraphQL projection | PASS; exact `tio2-my/m-2377`, approved preview state, 5 applications, 2 evaluation groups/8 items, 14 technical rows, 13 dash methods, exact final method, and test-report footnote |
| Fresh TiO2 Malaysia preview production build | PASS; thirteen approved Product Detail SSG routes |
| Focused M-2377 Playwright | PASS — 8/8 |
| Product Detail Playwright regression | PASS — 92/92 |
| M-2377 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320, and 200% equivalent |
| Axe / overflow / touch targets | PASS — zero Axe violations, no horizontal overflow, mobile visible targets at least 44 × 44px |
| Shared Chrome | PASS — SVG Header/Footer Logos, 84/64px behavior, visible CURRENT=0, Desktop 3px marker, Mobile 4px marker, Escape focus return, fixed RFQ |
| Later Grade route | PASS — CR-901 returns 404 |
| Prior Grade evidence | PASS — full E2E regenerated prior paths with no Git-visible content changes |

## Visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m2377-1440.png` | `86C0DD99A9CC5AD82EA1151CC1A1773DDED5282E5EA22B8F9783EE294D930697` |
| 1024 | `m2377-1024.png` | `D28F5FFAD283C8FC2E0860745DB6D2A23D5DC40EF569800A63D2C0FB5556233B` |
| 768 | `m2377-768.png` | `0815FE9383F6A53A0FA99BA420F8889136E183BA3E3E673521A8EB03ED654D18` |
| 430 | `m2377-430.png` | `23A5B754D518E46CE566679A9836F7B09F85503740EF53C20314E4CB5514CD22` |
| 390 | `m2377-390.png` | `ABCAA7A6F19D21C720157C2F1582641FE209AA38F55B11C954A9B927A32BD8D9` |
| 320 | `m2377-narrow-320.png` | `B6B6F826E21490D3755DB026EC8F0DA32C797FC6AAB04B0667AA011E82CC94CD` |
| 200% equivalent | `m2377-200-percent-zoom-equivalent.png` | `75BBE5AC9B025F080AB391B53AD58B59E6C078919D983B1482E589174681CFDC` |

Manual inspection of all seven images confirmed visible Header/Footer Logos, stable approved module order, readable responsive table/card transformation, visible test-report footnote, and no unsupported-module gap, collision, clipping, or horizontal overflow.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Sulfate Process, and five Application destinations remain omitted until their own `tio2-my` routes/receivers are `LIVE_APPROVED`.
- CR-901 remains locked pending independent authorization.
- No deployment, publication, production write, DNS, Gate 10, sitemap opening, or indexing action was performed.
