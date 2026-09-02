# GRADE-M996 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Authority: `GRADE-M996-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED`; `GRADE-M996-G8-HANDOFF-01 = CONTROLLER_AUTHORIZED / HANDED_OFF`.
- Route: `/products/m-996/`; scope: `site_scope=tio2-my`; runtime state: `approved_for_preview`.
- Release controls remain `PREVIEW_ONLY`, `noindex,nofollow`, and `sitemapAuthorized=false`.
- This is local Gate 8 implementation evidence only. It is not Gate 9 approval, Gate 10 authorization, deployment, publication, production write, DNS, sitemap opening, or indexing evidence.
- M-2196, M-2377, and CR-901 remain identity-only and return 404 before CMS access.

## Contract binding and architecture

- Gate 7 Manifest SHA-256: `216707AB33728D1F826C8B13E1DCF764050C3218C067FFD35EF2658B497A4436`.
- D23 approved raw contract SHA-256: `4EAF22AA4F3F551F27CB83B41D644CAA59312B6EF20F02BCBD9AA6522F3EC66A`.
- D16 repository contract raw SHA-256: `4EAF22AA4F3F551F27CB83B41D644CAA59312B6EF20F02BCBD9AA6522F3EC66A`.
- Approved canonical SHA-256 (`sha256-json-recursive-key-sort-v1`): `695022B33674A055838DC15E2F82C1B7E20605BE32B8984E29DED4382888643B`.
- The repository preserves the approved raw bytes and also produces the approved canonical hash.
- M-996 reuses the existing dynamic Product Detail route, approved-contract registry, scoped WordPress record and GraphQL resolver, DTO, metadata/JSON-LD builders, shared template/CSS, and Malaysia Global Chrome. No M-996 route, component, CSS, Header, Mobile Menu, or Footer fork was created.
- The approved contract introduces optional `technical.footnote`. The shared DTO now exact-matches this key only when it exists in the approved contract, and the shared renderer emits it only when present. All ten earlier contracts lack the key and therefore retain byte-for-byte-equivalent DTO shape and no new DOM output.

## Public content and fail-closed behavior

- Public relationships are only Coatings and Sulfate.
- Three application cards render in approved order: Industrial Coatings; Powder Coatings; External and Internal Architectural Coatings.
- Evaluation renders exactly two groups and eight items.
- Technical data renders exactly three columns (`Parameter`, `Value`, `Test method`), eleven rows, and eleven `testMethod` cells. Source `-` values remain visible as `-`.
- The independent footnote `*Moisture is measured within 48 hours of production.` and the approved typical-properties note are both visible.
- Origin Support, Related/Comparison, Not Recommended, FAQ, and embedded RFQ modules are absent without wrappers or reserved gaps.
- Runtime conditional actions and downstream modules are omitted because their scoped receivers/routes are not `LIVE_APPROVED`. Ready-state tests preserve exact M-996 RFQ, Sample, and TDS prefills.
- Public copy, metadata, Schema, routes, and prefills contain no M-996/M-2196 comparison, source brand/model/vendor/contact, gloss, non-Coatings applications, food-contact, safety/storage/packaging, origin, compliance, logistics, or commerce output.

## SEO, GEO, Schema, and isolation

- One H1 and one HTTPS self-canonical: `https://tio2malaysia.com/products/m-996/`; no query, hash, cross-scope canonical, or hreflang.
- Robots are `noindex,nofollow`; sitemap authorization remains false.
- One JSON-LD graph contains exactly Product + BreadcrumbList and eleven `additionalProperty` entries.
- Every PropertyValue uses the visible technical row `value`; `testMethod` is never converted into a Schema claim.
- The local GraphQL call accepts only slug `m-996`, returns the single `tio2-my` scoped record, and uses scope-local route/content cache tags. Missing, duplicate, malformed, hash-mismatched, foreign-scope, or unauthorized records fail closed without cross-scope fallback.

## Automated verification

| Check | Result |
|---|---|
| Registry RED test before implementation | PASS evidence — failed only because `m-996` was absent |
| Focused registry/DTO/query/route/infrastructure | PASS — 5 files, 52 tests |
| Product Detail regression | PASS — 40 files, 634 tests |
| Changed-file ESLint | PASS |
| Repository-wide `npm run lint` | ENVIRONMENTAL FAIL — scans pre-existing ignored `.tmp/.next-stale-*` generated bundles; 942 generated-code errors, outside this change |
| TypeScript `tsc --noEmit` | PASS |
| PHP syntax and local M-996 seed | PASS; local post ID `17346` |
| Local GraphQL projection | PASS; exact `tio2-my/m-996`, 3/2/8/3/11 contract counts |
| Fresh TiO2 Malaysia production build | PASS; eleven approved Product Detail SSG routes |
| Product Detail Playwright | PASS — 78/78 |
| M-996 responsive/zoom | PASS — 1440, 1024, 768, 430, 390, 320, and 200% equivalent |
| Axe / overflow / touch targets | PASS — zero Axe violations, no horizontal overflow, mobile visible targets at least 44 × 44px |
| Shared Chrome | PASS — SVG Header/Footer Logos, 84/64px behavior, visible CURRENT=0, Desktop 3px marker, Mobile 4px marker, Escape focus return, fixed RFQ |
| Later Grade routes | PASS — M-2196, M-2377, and CR-901 return 404 |
| Prior Grade evidence | PASS — full E2E regenerated prior paths with no Git-visible content changes |

## Visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m996-1440.png` | `96228C38321F50979EE8D87C74C47A313BEF4ACF7A716B897556A990455EE9BD` |
| 1024 | `m996-1024.png` | `8F32BF6AE6B6A5EE921505383BEF210D963BFF6DBD3AA796A737E78CB09D8653` |
| 768 | `m996-768.png` | `7E4C35D9E7202E00C6BD8E765787ECD960B8C2C62D3C08765DF406C05B13C93C` |
| 430 | `m996-430.png` | `E647B0ECFB3F05D39BE55DEB70D62DE2A8A30198D87ADBA2925A06E8C5B89A80` |
| 390 | `m996-390.png` | `0860AB4E2F2A7F7FD840F9C7B93524FFF59E6BA19B4E695EC489349E11A7744F` |
| 320 | `m996-narrow-320.png` | `F5FF2A9D4C96BD6686F49532057213320323544CC8CF7014ACD756745D933691` |
| 200% equivalent | `m996-200-percent-zoom-equivalent.png` | `21FD7A256EE0F9F31DBFF05565F4FF12808157594937C254DB0FB286BE832FDC` |

Manual inspection of all seven images confirmed visible Header/Footer Logos, stable module order, readable responsive table/card transformation, visible 48-hour footnote, no unsupported-module gap, collision, clipping, or horizontal overflow.

## Remaining release blockers

- Controller 02 Gate 9 read-only QA is required.
- Indexing and sitemap authorization remain false.
- RFQ, Sample, Documents/TDS, Sulfate Process, Coatings, and Market destinations remain omitted until their own `tio2-my` routes/receivers are `LIVE_APPROVED`.
- M-2196, M-2377, and CR-901 remain locked pending independent authorization.
- No deployment, publication, production write, DNS, Gate 10, sitemap opening, or indexing action was performed.
