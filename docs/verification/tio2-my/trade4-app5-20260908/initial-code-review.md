# Independent editorial code review

Date: 2026-09-08. Worktree: `D:\16Wordpress_nextjs\.worktrees\trade4-app5-gate8`. Baseline: `fca45f9`; reviewed current uncommitted nine-page changes. Read-only technical review; no Gate 9 closure or publication judgment. Freshness findings in `.tmp/editorial-freshness-review.md` were excluded; the concurrent review/update/Hub corrections are owned separately.

## Findings

### [P1] Apply current target eligibility before emitting Application Grade relations

Location: `components/sites/tio2-my/editorial/malaysia-editorial-page.tsx:12` (direct `bodyHtml` render), with missing relation validation at `lib/wordpress/editorial-v01-queries.ts:14-22`.

The five Application bodies unconditionally contain all frozen Grade anchors and rows. The query validates only the Application record and never resolves current Grade/Product/cross-Application target eligibility. Consequently, changing a linked Grade to draft, removing its Malaysia scope, or removing the destination record leaves its original clickable Grade card/row on these pages, even after an Application refresh. The body equality check also prevents an operator from removing the relation directly from CMS without changing the approved source contract. This is a missing implementation of an already approved conditional rule, not a new content decision.

Exact authority: `D:/23MySec/pages/applications/masterbatch/04_planning/APP-MB_GATE2_CONTENT_CONTRACT_V0.3.md:83` says an unavailable Grade route is omitted atomically, without an empty card or replacement claim. `D:/23MySec/pages/applications/paper/04_planning/APP-PAPER_GATE2_CONTENT_CONTRACT_V0.2.md:78` says missing targets remove only the affected link/card and create no hidden Schema relation. The local Application report also lists this required behavior under dependency D02/D03.

Fix: validate the exact same-site target identity, current publish/availability state and approved relationship at delivery, then project the approved semantic body with only ineligible relation units removed. Preserve surviving order/copy; do not replace unavailable targets or fail the entire Application. Add corresponding target-change invalidation/dependency handling or uncached eligibility lookup, and test a warm Application response followed by draft/missing/foreign-scope target states. Optional MB ItemList remains deliberately omitted and is not a finding.

### [P2] Connect editorial typography to the actual loaded Inter family

Locations: `components/sites/tio2-my/editorial/app-mb.css:12`; `components/sites/tio2-my/editorial/res-trade-eu.css:2`. Same issue affects all nine generated styles (some use the `font` shorthand).

The generated body CSS selects literal `Inter,Arial,sans-serif`, but its prototype `@font-face` declarations are removed. The real layout loads Next's Inter through `malaysiaSharedFont.variable` (`lib/sites/malaysia-shared-font.ts:3`, `app/(en)/layout.tsx:20`), which defines the generated family in `--font-my-shared`; it does not register a literal `Inter` family. Shared Chrome correctly consumes that variable. In a clean browser without a separately installed Inter font, editorial bodies render Arial while the Chrome renders Inter. This changes line breaks, table geometry and the approved typography across all nine pages.

Fix: adapt the extracted scoped main font declarations, including shorthand declarations, to consume `var(--font-my-shared),Inter,Arial,sans-serif`. Update the two reproducible builders so regeneration retains the integration fix. Confirm actual rendered fonts through browser/CDP, not only a computed string or `document.fonts.ready`.

### [P2] Restore the page-level zero margin when scoping prototype body styles

Locations: `scripts/editorial/build-application-payloads.mjs:169-170`; `scripts/editorial/build-trade-payloads.mjs:99`; integration point `components/sites/tio2-my/editorial/malaysia-editorial-page.tsx:9`.

Both generators remap prototype `body` declarations to the scoped `main`, including `margin:0`. The actual document body receives no margin reset from the editorial renderer or Malaysia layout. Shared Chrome styles do not reset it either. Therefore a direct load of an editorial page retains the browser's default 8px body margin, moving Header/main/Footer inward and leaving an outer white gutter compared with the approved full-width composition. The existing Malaysia country and UK renderers explicitly include their own body-scoped zero-margin reset; these new routes lack that equivalent integration.

Fix: add a narrowly editorial-scoped body margin reset tied to the page wrapper, or reuse an applicable shared Malaysia shell reset without affecting other sites. Keep the page-generated CSS confined to its main. Verify a fresh navigation has body margin zero and the page wrapper starts at x=0 with viewport width at 1440/768/390.

## Evidence and scope limits

- Read AGENTS, site registry/development workflow, the implementation plan/intake and both payload reports; traced route, renderer, metadata, WordPress validation/auth/seed, query, proxy, cache revalidation, webhook and shared Chrome consumers.
- Read the exact current Masterbatch/Paper conditional C contracts and inspected Grade destination route consumers.
- Fresh `npm test -- --run tests/unit/editorial/application-payloads.test.ts tests/unit/editorial/trade-payloads.test.ts`: **23/23 passed**, 2026-09-08 08:54 local process time. These establish source payload fidelity and generated selector boundaries; they do not establish live eligibility or effective fonts/body geometry.
- No additional source-copy, schema-type, canonical/noindex/provisional-route or cross-site fallback defect found in this review. Public noindex and omitted optional MB ItemList are intentional.
- The task-owned Next port 3216 was not yet listening during review; parent owns runtime/browser/build evidence. Findings above are supported by code/contract paths; the prescribed browser and target-state reproductions still need execution after fixes. No CMS mutation, real receiver submission, remote write or publication performed.
