# RES-000 Gate 8 Local Verification — 2026-09-01

## Status boundary

- Development target: `RES-000` at `/resources/`, `site_scope=tio2-my`.
- Authority: `RES-000-G7-PCR-01 = PROJECT_CONTROL_REVIEW_PASS / CLOSED` and package `RES-000-G7-HANDOFF-01`.
- Result: local Gate 8 implementation and verification complete for the current H0 state.
- This record is not deployment, publication, indexing, Gate 9 PASS or Gate 10 authorization.

## `RES-000-G8-PCR-01` conditional-return correction

- Local correction status: complete and submitted for the same Review ID; project-control re-review remains required.
- P0-01: the invented `PUBLIC_ELIGIBLE` production token was removed. PHP calls the controlled Malaysia Resource Page Registry using the exact Page ID, current registry mapping status and canonical path, and independently requires `publicEligibilityStatus=ELIGIBLE`. Required guide fields now include `resourceType`, `lastReviewedAt`, `ctaLabel`, `sourceOwner` and `recordReviewDate`.
- P0-01 Trade extension: all ten Gate 7 fields are mandatory. `officialSourceUrl` must be a valid HTTPS URL; `sourceDate`, `reviewDate` and `nextReviewDue` must be real ISO dates; missing, invalid, stale or revoked input removes the whole Trade item.
- P0-02: only entries with a unique valid `featuredRank` enter Featured. Remaining eligible entries enter Latest in `displayOrder` then stable Page ID order. PHP and TypeScript match the original H0–H5 vectors byte-for-field at the public projection boundary.
- P0-03: a referenced child’s post status, scope, Page ID, public path, canonical, release or governed Resource/freshness metadata change adds exact `/resources` dependency invalidation. The Next receiver invalidates only the affected Resource child route tag, `route:tio2-my:/resources` and `content:tio2-my--resources`; it does not issue cross-scope or broad site/list/sitemap tags for this dependency event.
- P1-01: public cards serialize the approved `PROCUREMENT_GUIDE`, `TECHNICAL_GUIDE` or `TRADE_UPDATE` label, approved `ctaLabel` and `lastReviewedAt`. Trade renders the approved public status and a normal crawlable official-source HTTPS link. `contextLabel` is used only when supplied and is never inferred.
- Current local production-shaped CMS output remains H0, so the approved H0 body, shared Chrome and screenshot pixels are unchanged.

## Current public state

- `H0_NO_QUALIFIED_RESOURCE`.
- Public Resource inventory: 0.
- Featured root, heading, cards, links and spacing: absent.
- Latest root, heading, items, links and spacing: absent.
- JSON-LD ItemList: absent.
- RES-ORIGIN and all other Resource candidates: absent from production config, CMS relation storage, public projection, DOM, links, sitemap and Schema.
- Hero CTA resolves to `#research-paths` in H0.

## Architecture and isolation

- `/resources/` branches to the Malaysia implementation before the existing Site A Resource lookup; the Site A route remains unchanged.
- WordPress stores one non-public `tio2_resource_hub` singleton with exact `site_scope=tio2-my`, `/resources`, internal slug and byte-equal approved contract validation.
- `malaysiaResourceHubRecordJson: String!` fails closed for missing, multiple, wrong-scope or contract-drifted records.
- Internal relation metadata is projected inside WordPress. Only visible public card fields reach Next.js; governance fields and rejected candidates do not.
- Eligibility requires the controlled Page Registry Page ID/status/path judgment, exact `publicEligibilityStatus=ELIGIBLE`, every approved general predicate and the shared strict route rule: exact Page ID, exact Malaysia scope/path/canonical, unique published record and `LIVE_APPROVED`. Trade then requires every Gate 7 §4 field and `CURRENT_APPROVED` freshness.
- The public H-state is derived; no editable H-state field exists. The original H0–H5 vectors cover PHP/TypeScript allocation and H5 atomic removal. Production relation storage remains the empty array.
- The Resource query retains its scoped cache namespace. Direct Hub changes and referenced-child H5 transitions invalidate the exact Malaysia `/resources` route/content tags; Resource dependency events do not clear another scope or the entire site.
- Global Header, Mobile Menu and Footer use the one shared `MalaysiaGlobalHeader` / `MalaysiaGlobalFooter` implementation and the one shared Global Chrome configuration. RES passes only `currentPageId="RES-000"` and `sourcePageId="RES-000"`.

## SEO / GEO / Schema

- Title: `Titanium Dioxide Procurement Resources | TiO2 Malaysia`.
- Meta description matches the approved Gate 7 Buyer Clean string.
- Exactly one self-canonical: `https://tio2malaysia.com/resources/`.
- Hreflang: absent.
- Robots: `noindex, nofollow` because release/indexing authorization remains false.
- H0 JSON-LD graph types: `CollectionPage`, `BreadcrumbList` only.
- `ItemList` is conditional and uses the exact visible Featured + Latest order; current H0 has none.
- `FAQPage`, `QAPage`, `Article`, `Product`, `Offer` and hidden candidate relations are absent.
- All five Buyer Questions answers are in the initial server-rendered DOM.

## Responsive and accessibility evidence

| Viewport | Result | Evidence | SHA-256 |
|---|---|---|---|
| 1440×1000 | PASS; desktop diagram, shared 84px Header, Resources underline, no overflow | `resource-000-1440.png` (225356 bytes) | `ED0F9B2B85120EDF46A4995D10FE7FFCCF782580F8E4397C75360E4F4DCB9E6D` |
| 768×1000 | PASS; tablet stack, shared menu, no overflow | `resource-000-768.png` (204084 bytes) | `7E252F1FD9498C08354629174D1F156B522E7011B661ABBC5425F55423BC2908` |
| 430×844 | PASS; mobile stack, 44px targets, no overflow | `resource-000-430.png` (189865 bytes) | `DE645755D8E5D941F3F90B172652673FD2FB51A89F18EB7494F48ED7BA7A7AA3` |
| 390×844 | PASS; shared 64px Header, 4px current marker, left-aligned menu, no overflow | `resource-000-390.png` (184809 bytes) | `BE84DBB83BDD9A8F0B187BB77234150D7B076F15785A1741AB8E5428D1500601` |
| 1440 at 200% page scale | PASS; `visualViewport.scale=2`, no horizontal overflow, FAQ focus usable | automated assertion | n/a |

The four screenshots were freshly captured from the implemented route. The Next development indicator was excluded from evidence capture; no page content or shared Chrome surface was hidden.

Accessibility checks passed for one H1, ordered headings, semantic breadcrumb, button accordion names, `aria-expanded`, `aria-controls`, initial answers, visible focus, 44px targets, reduced motion, mobile focus containment, Escape return and Axe serious/critical violations = 0.

## Commands and results

- Targeted RES contract/unit/integration/sitemap suite: 9 files, 25 tests PASS.
- Cache/revalidation/DTO/query regression subset: 5 files, 86 tests PASS.
- Production-server Playwright regression: 16 tests PASS:
  - RES-000: 390, 430, 768, 1440 and 200% scale;
  - shared Home/Markets Chrome: 390, 768 and 1440;
  - PRODUCT-000: 390, 768, 1024, 1440 and keyboard interactions.
- Changed-file ESLint: PASS, 0 errors.
- `npm run typecheck`: PASS.
- PHP syntax: Resource Hub include, seed and shared webhook PASS.
- `npm run build` with `SITE_ID=tio2-my`: PASS; `/resources` prerendered with one-hour revalidation.
- `git diff --check`: PASS.
- Local WordPress seed: PASS, post ID 17291, exact Malaysia scope/path and H0 projection.

### Conditional-return verification additions

- TDD red evidence: the first Gate 7 fixture run failed 20 of 31 assertions against the old eligibility, allocation and serialization behavior.
- Corrected Resource unit/integration/API/infrastructure suite with both gated runtimes enabled: 15 files, 128 tests PASS.
- PHP/TypeScript H0–H5 parity runtime: 1/1 PASS in isolated PHP 8.3; exact public card fields, allocation, order and state match.
- Live WordPress H5 runtime: 1/1 PASS. A cached fixture H4 (`Featured=RES-ORIGIN`, `Latest=RES-PROC + RES-TRADE-EU`) became H3 after Trade release revocation; its card, link, order, source/date/status fields and projection relation disappeared together. The queued payload contained only `siteIds=[tio2-my]`, the changed child path and `/resources`.
- Revalidation receiver H5 assertion: exact child route tag + `route:tio2-my:/resources` + `content:tio2-my--resources`; no `site`, `content-list`, `sitemap` or cross-scope tag.
- Current live local GraphQL projection: `H0_NO_QUALIFIED_RESOURCE`, Featured 0, Latest 0, scope `tio2-my`, path `/resources`.
- Corrected changed-file ESLint, TypeScript typecheck and PHP 8.3 syntax checks: PASS.
- Corrected `SITE_ID=tio2-my` production build: PASS; `/resources` remains prerendered with one-hour revalidation.
- Current H0 Playwright regression: 5/5 PASS at 390, 430, 768, 1440 and 200% scale. The four screenshot SHA-256 values above remained identical.

One build intentionally failed closed when an old local generated fetch cache still contained the earlier GraphQL shape. The exact worktree-local generated cache was moved to ignored `.tmp` storage, a clean build then passed, and the runtime now has a dedicated Resource Hub revalidation tag. No runtime fallback was added and no external or production cache was changed.

## Carried release blockers

- `RES-R002–RES-R007` remain OPEN exactly as Gate 7 defines them.
- `RES-R008–RES-R009` remain CONTROLLED_IN_DRAFT.
- No Resource child route is approved or implemented; all candidate and Trade items remain excluded.
- `/request-a-quote/` remains a shared Global Chrome target and must stay a release blocker until its approved receiver/form is live; there is no Contact fallback.
- Sitemap authorization and indexing remain false.
- Gate 9 read-only QA and separate release authority remain required.
