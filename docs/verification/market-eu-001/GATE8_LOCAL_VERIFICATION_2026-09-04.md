# MARKET-EU-001 Gate 8 Local Verification — 2026-09-04

## Boundary

- Page: `MARKET-EU-001` / `/markets/european-union/`
- Scope: `site_scope=tio2-my`, locale `en`
- Branch: `codex/home-001-tio2-my`
- Worktree: `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`
- Baseline commit: `c2a62677e6781ad21e9a05ee9e90f419ec61a167`
- Gate 8 implementation only. No deployment, production CMS write, DNS, publication, indexing, Gate 9 or Gate 10 action is authorized or performed.

All six supplied authority files matched their delegated SHA-256 values before implementation:

| Authority | SHA-256 |
|---|---|
| Current Gate 7 baseline manifest V0.17 | `C3F74F3C5F1FC13E82712AB4C64B83EA5883C4CA5F95E1814AF3E7D34E7D21FA` |
| Gate 7 handoff package V0.1 | `6AFE59822018B425F39476D6260FC91C5349B7305AA79A43D8921F578A0AEBE1` |
| Gate 7 acceptance and blockers V0.1 | `725D6FD53FA518ACF28DB72E4F8F470C5C7A93214A53C008833B0E662FDD7A0B` |
| Gate 7 manifest V0.1 | `AE9FBB7AC00853BDF7BAA5BAA0FFFDF82BA9D9B4A1323F665A033880BE656D2B` |
| Gate 8 implementation plan | `E35FBA0154BE9A81EB8E35D13B652FFA5543DCF586C54B6ECCF93AFB5E0D7121` |
| Gate 7 review submission V0.1 | `79AC416E3E645C02F7C4726E6E9380727F0F82756D946F247C950146192D6745` |

The worktree was a clean linked worktree, not a submodule, and was not on `main` or `master`.

## Task 1 — repository path and command map

Existing owners reused by this page:

- Route pattern: `app/markets/page.tsx`; the approved leaf route is owned by `app/markets/european-union/page.tsx`.
- Malaysia Markets CMS pattern: `wordpress/plugins/tio2-site-model/includes/market-hub-v01.php`, immutable contract under `wordpress/plugins/tio2-site-model/config/`, and local-only seed under `wordpress/seed/`.
- GraphQL/query/DTO pattern: `lib/wordpress/market-hub-v01-{types,dto,queries}.ts` plus `.graphql` and `lib/wordpress/generated.ts`.
- Shared Global Chrome and Logo: `components/sites/tio2-my/malaysia-global-chrome.tsx`, `malaysia-global-chrome.module.css`, and `wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json`.
- Shared legal/CMP: `components/sites/tio2-my/consent/malaysia-cookie-settings.tsx` and `wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json`.
- SEO/Schema patterns: `lib/seo/market-hub-metadata.ts` and `lib/seo/market-hub-jsonld.ts`.
- Conversion-prefill owners: `lib/rfq/malaysia-rfq-prefill.ts`, `lib/request-documents/malaysia-request-documents-prefill.ts`, and `lib/request-sample/malaysia-request-sample-prefill.ts`.
- Revalidation/cache owners: `lib/wordpress/cache-tags.ts`, `app/api/revalidate/route.ts`, and `wordpress/plugins/tio2-site-model/includes/webhooks.php`.
- Existing Market tests: `tests/unit/markets/`, `tests/integration/markets/`, `tests/infrastructure/tio2-my-market-hub-contract.test.ts`, and `tests/e2e/market-hub.spec.ts`.

Scope-local cache keys for the new page are required to be exactly:

- `site:tio2-my`
- `route:tio2-my:/markets/european-union`
- `content:tio2-my--market--MARKET-EU-001--en`

Repository-native verification commands:

```powershell
npx vitest run tests/unit/markets tests/integration/markets tests/infrastructure/tio2-my-market-hub-contract.test.ts tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/unit/legal/consent-manager.test.tsx
npx vitest run <new MARKET-EU-001 unit/integration/infrastructure paths>
npx eslint <changed TypeScript/TSX test and source paths>
npm run typecheck
npm run codegen
$env:SITE_ID='tio2-my'; $env:NEXT_DIST_DIR='<fresh scoped dir>'; npm run build
npx playwright test tests/e2e/european-union-market.spec.ts --config=playwright.config.ts
```

Clean baseline result before page changes: `10` files, `27` tests passed.

The repository has an existing fail-closed `tio2-my` boundary and reusable shared Chrome/CMP. No new URL, page count, primary keyword, product fact or site architecture is required, so Task 1 has no implementation blocker.

## TDD log

1. WordPress identity/isolation RED: missing config, PHP model and seed. GREEN: the dedicated `tio2_market_page` singleton, immutable Buyer Clean validation, separately validated mutable release/evidence controls, non-null fail-closed GraphQL field and local idempotent seed passed. Stale or absent trade/import evidence now degrades to evergreen content plus noindex instead of rejecting the whole page.
2. Contract projection RED: missing metadata, copy, relations and source evidence. GREEN: exact Gate 2 V0.2 + Final Content Polish Delta, 13-module order, six Grades in 3+3 grouping, five Applications, six destinations, eight buyer questions and all supporting relations passed.
3. DTO/query RED: missing query owner, then the explicit `not implemented` failure. GREEN: GraphQL response parsing, exact contract validation, foreign-scope rejection, missing-record error and the three exact scope-local cache tags passed.
4. Component/route RED: missing template and route modules. GREEN: one H1, exact module order, all FAQ answers in initial server HTML, safe omission of planned anchors, exact conversions, shared Chrome and one JSON-LD script passed.
5. Conversion RED: MARKET-EU-001 RFQ aliases and Request Documents source attribution were discarded. GREEN: `market=European Union`, `source_page=MARKET-EU-001`, and the approved Documents source/market identifiers are retained without exposing governance text.
6. SEO/Schema RED: missing owners. GREEN: exact Title/Meta/Open Graph, absolute self-Canonical, no hreflang, release-gated noindex, WebPage + BreadcrumbList only and no conditional ItemList passed.
7. Dynamic/revalidation RED: missing projection, content tag and webhook owner. GREEN: trade source/state atomicity, Origin Hold plus related-route/conversion/runtime/evidence release guards, exact locale-bearing three-tag revalidation and `tio2_market_page` webhook ownership passed.
8. Browser RED round 1: slash route direction and 1–2 undersized breadcrumb targets failed. Root cause was the explicit Malaysia canonical-path allowlist plus unpadded breadcrumb links. GREEN after registering the exact route and enforcing 44px targets.
9. Browser RED round 2: Axe found the origin source line at 2.21:1 contrast. GREEN after assigning the approved dark-section supporting text a WCAG-AA-readable color.
10. Independent review RED: the Gate 5 assembly contained a Hero path card whose copy was absent from Gate 2 V0.2 + the final delta; the Origin section omitted its approved About action; release derivation ignored readiness flags; cache identity omitted locale; evidence updates were byte-locked; and sitemap had no gated future inclusion path. GREEN: unauthorized Hero copy removed, both approved Origin actions rendered, all release/evidence gates enforced, locale included, mutable evidence safely omitted when stale/missing, three official trade references retained inside the atomic conditional block, and sitemap inclusion is explicitly gated by release/index/sitemap authorization.
11. Review follow-up RED: optimistic release flags could disagree with actual planned relations, trade freshness could be stale while dated content remained visible, invalid calendar dates were normalized by JavaScript, and future available routes had no anchor/ItemList projection. GREEN: every actual relation must be `available`, freshness must match the strictly round-tripped checked date, stale/malformed evidence atomically suppresses the dated block, future Application/destination anchors are state-gated, and the six-country ItemList appears only when the complete release contract passes. Final independent review found no remaining Critical, Important or Minor findings and marked the branch ready for Gate 9 read-only QA only.

## Final verification

- Baseline before implementation: `10 files / 27 tests PASS`.
- Final related Vitest command: `21 files / 178 tests PASS`.
- Repository-wide diagnostic `npm test`: `217 files / 2139 tests PASS`, `18 files / 47 tests SKIP`, `11 files / 28 tests FAIL`. The failures are outside MARKET-EU-001: 23 Site A/bootstrap tests require the intentionally absent worktree `wordpress/.env` or migrated local credentials; 4 existing Site A route-registry/revalidation tests fail on unrelated public-route state; and 1 Products asset-copy test timed out. The final scoped Gate 8 rerun above is green; no unrelated Site A state was changed to force a full-suite pass.
- `npm run typecheck`: PASS.
- changed-file ESLint: PASS, zero output.
- `npm run codegen`: PASS; `GetMalaysiaEuMarketPage` generated from the checked schema and operation.
- PHP syntax: `market-page-v01.php` and shared `webhooks.php` both report no syntax errors inside the local WP-CLI container.
- Local idempotent seed: PASS, post `17370`, `siteScope=tio2-my`, internal slug `tio2-my-market-eu-001`, public path `/markets/european-union`.
- Live local GraphQL sample: `pageId=MARKET-EU-001`, `scope=tio2-my`, `moduleCount=13`, `gradeCount=6`, `releaseEnabled=false`, `indexingAuthorized=false`.
- Scoped preview build: PASS with Next.js 16.3.2; route table contains `ƒ /markets/european-union`.
- MARKET-EU-001 Playwright: `5/5 PASS` for canonical/Schema, 1440, 768, 390 and a 360px CSS reflow equivalent to a 720px viewport at 200% browser zoom. Checks include no overflow, 44px targets, keyboard traversal of Hero actions plus representative Grade/Documents/Origin/conversion controls, visible 3px focus outline, computed reduced-motion duration, Axe serious/critical = 0, Header/Footer Logo loading/paint, current nav state, Mobile Menu forward/reverse focus containment and Escape return, and FAQ keyboard disclosure.
- MARKET-000 regression: `4/4 PASS` at 390/768/1440 plus canonical.
- shared Home/Markets/Products Chrome and HOME-001 regression: `15/15 PASS` at relevant 390/768/1440 plus HOME 320/1024.

Rendered machine output:

- Canonical: `https://tio2malaysia.com/markets/european-union/` (one tag, HTTPS, exact host/path, no query/hash).
- Robots: `noindex, nofollow` because Origin Hold/release/index authorization remain false.
- Hreflang: none.
- Sitemap: MARKET-EU-001 absent while authorization is false.
- JSON-LD graph: exactly `WebPage`, `BreadcrumbList`; no `ItemList` because the six country routes are not release-valid, and no FAQPage/QAPage/Product/ProductGroup/Offer/LocalBusiness or held origin relation.
- Visible dynamic state: evergreen customs guidance remains. The dated trade block and Trade Update CTA are atomically omitted because the linked Trade Update route is still planned.

Screenshots:

| State | File | SHA-256 |
|---|---|---|
| Desktop 1440 | `market-eu-001-1440.png` | `EEAF11CCA5B7971827EAC63FBBD159991DAB71D1A6253D8DB6C2A2E2FB3AB0B2` |
| Tablet 768 | `market-eu-001-768.png` | `1838046150D80128D6E324AD093C71D981095E1573A39D0021D29E61F72E273F` |
| Mobile 390 | `market-eu-001-390.png` | `3354ECD02AFB3625895FEC52DE5D738992D4595403F6FC57AE29E6B82485B942` |
| Mobile Menu 390 | `market-eu-001-mobile-menu-390.png` | `F1A878FD1EED771228B8593202E436160AC77520BAE9B3F2BF2C34FD1B2F6A9E` |

No deployment, production CMS write, DNS change, publication, indexing action, Gate 9 decision or Gate 10 action was performed. Rollback is `git revert <MARKET-EU-001 implementation commit>` after the commit is recorded.

## Carry-forwards

- `EU-G6-R01 OPEN`: release and indexing remain disabled while Malaysia-origin evidence is on hold.
- `EU-G6-R02 OPEN / CURRENT_AS_OF_2026-09-04`: source/title/date/checked-date/scope/status are projected and tested. Because Trade Update is planned, the dated block/action are currently omitted atomically; freshness must still be rechecked at Gate 9 and Gate 10.
- `EU-G6-R03 NOT PROVEN FOR RELEASE`: five Application children, six country pages and Trade Update remain unimplemented dependencies. Their approved labels/cards remain visible where required, but they emit no broken anchors and no fallback URLs. This blocks release and conditional ItemList.
- `EU-G6-R04 NOT PROVEN FOR RELEASE`: local RFQ alias and Documents/Sample relations are validated. Production receiver/access-key/privacy/end-to-end delivery readiness is not established by this local implementation and remains release-gated.
- `EU-G6-R05 READY FOR GATE 9 READ-ONLY QA`: local metadata, constrained Schema, shared CMP/Chrome, keyboard, responsive, Axe and overflow evidence passed. This is not a Gate 9 PASS or Gate 10 authorization.
