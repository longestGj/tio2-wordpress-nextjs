# TiO2 Malaysia Trade 4 + Application 5 Gate 9 return repair receipt

Date: 2026-09-08. Status: **F01, F03 and F04 implementation repaired; F02 remains blocked by an unapproved cross-page owner package. This receipt does not claim all four findings closed, Gate 9 pass, deployment or publication.**

## Candidate identity

- Branch: `codex/country-editorial-integration`.
- Reviewed baseline chain: implementation `4fa585bc125c7b8fa926ab66059f4fc6887877f4`; Gate 9 evidence handoff `58af74dbe44b4ccaafe517d592ecae5d5ff37ef2`; latest baseline acknowledgement `84db14ee35fe118415bff8327f202ee712e7599c`.
- Repair implementation: `4a7e170b0bba90ce8428b8f23788c15e3e64dde4`.
- Site scope: `tio2-my` only.
- Reviewable local production runtime: `http://127.0.0.1:3230`; Build ID `Zqczu1KDcx63nns7yjF5_`; build directory `.next-gate9-repair-4a7e170`.
- The runtime uses a documented read-only GraphQL response overlay on `127.0.0.1:8191` over the isolated WordPress clone on `127.0.0.1:8186`. The overlay exists because this repair was prohibited from writing CMS data. It projects only the approved APP-COAT provisional flag, approved UK source URL and Brazil-required RFQ source allowlist. Brazil market records and every other query are forwarded to the real isolated CMS.

## Findings

### F01 — repaired in code and approved config; CMS alignment still pending

All five Application contracts now remain provisional, including APP-COAT. Provisional route candidates still validate their configured candidate path, but metadata no longer emits `canonical` or `og:url`, and the renderer emits no URL-bearing JSON-LD. Exact title, description and `noindex,nofollow` remain.

The production preview returned 200 for all five routes and confirmed five of five have no canonical, no Open Graph URL and no JSON-LD. This preview uses the read-only overlay for APP-COAT because the isolated CMS record still contains the superseded `provisional=false` payload and is rejected by the updated exact-contract validator. No CMS record was changed.

### F02 — not repaired; explicit cross-page approval blocker

The nine approved labels and `/applications/` links remain visible. The production preview confirms `/applications/` still returns 404. APP-000 has no approved Gate 6 handoff or Gate 8 development package; therefore this repair did not invent Hub body copy, hide the links, change their target, or add a cross-scope fallback. The Application Hub route owner must first supply an approved implementation package.

### F03 — repaired against the real isolated CMS

The approved `MARKET-BR-EN` and `MARKET-BR-PT` packages were selectively integrated from the prior approved implementation lineage (`4ce8ecd`) without importing Poland, COO or chloride scope. Both routes now return 200 through the production build:

- `/markets/brazil/` → `data-page-id=MARKET-BR-EN`, `lang=en`.
- `/pt-br/markets/brazil/` → `data-page-id=MARKET-BR-PT`, `lang=pt-BR`.

The route chain includes the two route components, exact DTO/query contracts, GraphQL/PHP registrations, cache and revalidation tags, proxy trailing-slash handling and document-language boundary. The isolated CMS on 8186 supplies both real Brazil records; the overlay forwards these queries unchanged.

Brazil CTA context requires the shared updates retained in this candidate:

- RFQ approved source IDs add `MARKET-BR-EN` and `MARKET-BR-PT`, matching the approved query parameters on both Brazil pages.
- Request Documents prefill accepts those same source IDs.
- Webhook path and contract-meta mappings invalidate both exact market routes.
- Revalidation maps both page IDs and locales to their exact route/content tags.

Removing any of those shared changes would leave a visible approved CTA or cache invalidation path incomplete. The stale local RFQ CMS record does not yet contain these two IDs; it is the reason a direct-CMS static build fails at `/request-a-quote`. The successful build used the documented read-only overlay and did not update CMS.

### F04 — repaired from the approved maintenance decision

Only the dead target was changed, following D23 decision `RES-TRADE-UK-SOURCE-MAINT-20260908-01` and current Manifest V0.10:

- Old: `https://www.gov.uk/guidance/trade-remedies`
- New: `https://www.gov.uk/guidance/check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties`

The visible label `HMRC trade remedies guidance`, description, order and all other page content remain. The payload builder applies the same approved maintenance delta so regeneration is repeatable. Chromium revisited all six UK official sources: all six returned HTTP 200, and the maintained target resolved as an HMRC/GOV.UK page. The isolated CMS still stores the old URL and is rejected by the exact validator; the preview projects the approved config without a CMS write.

## Verification

- `npm run typecheck`: pass, 0 errors.
- `npm run lint`: pass, 0 errors; two pre-existing unused-function warnings remain under `docs/prototypes/site-a-resources/build-visual-prototype.mjs`.
- `npm run codegen`: pass.
- Focused repair suite: 16 files / 104 tests passed.
- Repository suite: 296 files / 2,595 tests passed and 19 files / 48 tests skipped with the two long WP-CLI files excluded from the concurrent run; those two files were rerun separately and passed 5/5 and 12/12. Combined result: 298 files / 2,612 tests passed, 19 files / 48 tests skipped.
- Production build against the unchanged CMS: failed at `/request-a-quote` because the stored RFQ contract lacks the two approved Brazil source IDs. This is retained as evidence of the CMS alignment dependency.
- Production build through the read-only approved-contract overlay: pass; 54/54 static pages generated; Build ID `Zqczu1KDcx63nns7yjF5_`.
- Chromium local runtime: five Application routes 200 with provisional URL constraints; two Brazil routes 200; UK route 200; `/applications/` 404 preserved as F02.
- Browser source recheck: six of six UK official-source URLs returned HTTP 200.
- Brazil desktop screenshots were inspected; no visible clipping, missing content or broken shared chrome was found.

Evidence files: `runtime-results.json`, `cms-readonly-probe.json`, `runtime-identity.json`, `focused-tests.log`, `typecheck.log`, `eslint.log`, both build logs, and `runtime/` screenshots.

## Remaining acceptance work

1. APP-000 owner approval and development package are required before F02 can be repaired.
2. An authorized CMS operator must align three stored contracts in an isolated/review environment before direct-CMS Gate 9 rerun: APP-COAT provisional state, RES-TRADE-UK maintained URL, and CONV-RFQ Brazil source allowlist. This repair did not write them.
3. Gate 9 should rerun the actual-CMS build and browser matrix after that alignment. The response-overlay preview is review evidence for code behavior, not proof that stored CMS bytes are current.
4. Other browsers, real devices, real forms/email delivery, deployment, publication, DNS and indexing remain untested and unauthorized.

## Rollback

Stop only the verified local preview PID and overlay PID recorded in `runtime-identity.json`. Revert implementation commit `4a7e170b0bba90ce8428b8f23788c15e3e64dde4` on an authorized integration branch. No production or CMS rollback is required because this repair performed no deployment, publication or CMS write.

