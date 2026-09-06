# GRADE-M510 Gate 8 Local Verification — 2026-09-02

## Status and boundary

- Page: `GRADE-M510`
- Route: `/products/m-510/`
- Scope: `site_scope=tio2-my`
- State: local production-equivalent preview candidate only
- Indexing: `noindex,nofollow`; sitemap authorization remains false
- This record is not Gate 9 approval, Gate 10 authorization, deployment or publication evidence.

## Architecture result

- `/products/m-350/` and `/products/m-510/` use the same dynamic Next.js route, DTO, metadata/JSON-LD builders, `MalaysiaProductDetail` component, CSS module and shared `MalaysiaGlobalHeader` / Mobile Menu / `MalaysiaGlobalFooter`.
- The page supplies only its Grade identity to shared Global Chrome; no M-510 Header/Footer fork exists.
- WordPress uses one allowlisted resolver with exact Grade identity, payload, route, scope and contract validation.
- M-350 remains a 15-row, three-column page. M-510 is a 12-row, two-column page with no blank Standard column.
- M-510 omits Related Grades at projection time and renders no heading, wrapper, navigation item or reserved spacing for it.
- Only M-350 and M-510 are preview-enabled. The other 12 registered Grade identities remain unauthorized and return 404 before CMS access.

## Local WordPress evidence

The local WordPress container was confirmed to mount this worktree's `tio2-site-model` plugin.

- PHP syntax: PASS, no syntax errors in `product-detail-v01.php`.
- M-510 seed: PASS; local post ID `17328`, `PREVIEW_ONLY`, `approved_for_preview`, `site_scope=tio2-my`.
- GraphQL `m-350`: `GRADE-M350`, `/products/m-350`, 15 rows, `Property | Standard | Typical Value`.
- GraphQL `m-510`: `GRADE-M510`, `/products/m-510`, 12 rows, `Property | Typical value`.
- GraphQL `m-896`: rejected as not authorized; no alternate Grade or scope query occurred.
- The repository M-510 JSON is semantically identical to the approved content contract source. Approved source SHA-256: `09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C`.

## Automated verification

| Check | Result |
|---|---|
| Focused Vitest: infrastructure, DTO, template, metadata, JSON-LD, sitemap, route and query | PASS — 9 files, 30 tests |
| TypeScript | PASS — `tsc --noEmit` |
| Changed-file ESLint | PASS — 0 errors, 0 warnings after fixture cleanup |
| TiO2 Malaysia fresh-dist production build | PASS — `/products/m-350` and `/products/m-510` SSG entries present |
| Playwright Product Detail runtime suite | PASS — 15/15 |
| Axe | PASS — 0 violations at every tested M-350 and M-510 viewport |
| Horizontal overflow | PASS — 1440, 1024, 768, 430, 390, 320 and 200% equivalent |
| Mobile action targets | PASS — visible links/buttons at least 44 × 44px at 430, 390 and 320 |
| Other Grade routes | PASS — all 12 return 404 with no M-350 shell/content fallback |

The final successful build used a fresh isolated dist directory. An earlier reuse of the existing `.next-tio2-my` cache surfaced stale About-page fetch data; direct GraphQL comparison showed the current About contract was exact, and the fresh-dist build completed all 15 static pages. No About code was changed.

## Runtime page checks

- Exactly one H1: `M-510 Titanium Dioxide for Coating Evaluation`.
- Exact self-canonical: `https://tio2malaysia.com/products/m-510/`; one canonical, HTTPS, correct host/path, no query/hash, no hreflang.
- Robots: `noindex, nofollow`.
- JSON-LD: one graph with `Product` and `BreadcrumbList`; Product has exactly 12 visible `additionalProperty` rows.
- Prohibited Schema output absent: Offers, price, availability, reviews, ratings, origin, manufacturer, certification, compliance and comparison/equivalence fields.
- Initial server-rendered HTML contains all approved M-510 modules and 12 technical rows.
- Unready contextual routes are absent from HTML and projection; no Contact, placeholder, `#`, JavaScript-only or cross-scope fallback.
- Shared Chrome: production SVG Logo visible, Products current state uses desktop 3px underline/mobile 4px marker, visible `CURRENT=0`, fixed RFQ remains `/request-a-quote/`, Footer remains `Explore | Information | Procurement`.

## Visual evidence

| Viewport | File | SHA-256 |
|---:|---|---|
| 1440 | `m510-1440.png` | `93B77D1B0BDFDC35F52E8FEC842627B40A62ED504464A0172D17FA486807E809` |
| 1024 | `m510-1024.png` | `A751A68C6801BA3EE932DE52A191611730BC86CB53D7B51E71DD223A47E95A21` |
| 768 | `m510-768.png` | `3CB6E0C041DDF21B6BB804870AB3F75F03CAEDECB991207D4E41AC3870BA0F0C` |
| 430 | `m510-430.png` | `849C17A2E70DCDFC84597A899EF0DFB556AA6F53795039CF2A3CC85B8FF3C0EA` |
| 390 | `m510-390.png` | `B9B02615F1C7D45132CF6B4EEA793BFCC727CB9AEC4B7139BC0B515333A417FE` |
| 320 | `m510-narrow-320.png` | `9924E37AC19803CEAE3D013F1F79F9D0D4E18663B6716AAFC340E29D9F6BD695` |
| 200% equivalent | `m510-200-percent-zoom-equivalent.png` | `8F5310AF58BF97FEA9784F63B6D83FEC51111786166E908357DD055C16E4B9D7` |

Manual inspection of 1440, 1024, 768 and 390 evidence confirmed visible Header/Footer Logos, stable module order, no Related Grades gap, correct two-column/stacked technical table, and no collision or horizontal clipping.

## Remaining release blockers

- Gate 9 read-only review has not occurred.
- Indexing and sitemap authorization remain false.
- Contextual Hero RFQ, Sample, Documents/TDS, Process, Application and Market destinations remain omitted until their scoped resolver state is `LIVE_APPROVED`.
- No deployment, DNS, production write, public indexing or Gate 10 operation was performed.
