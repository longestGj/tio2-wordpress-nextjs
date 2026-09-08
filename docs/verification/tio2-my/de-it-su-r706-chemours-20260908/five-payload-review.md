# Five-page candidate: Germany/Italy payload review

Date: 2026-09-08. Reviewer: `/root/alternatives_intake`, different execution instance from Germany/Italy builder author. Baseline `84db14ee35fe118415bff8327f202ee712e7599c`; review targets the current uncommitted two-country builder/config/CSS/explicit routes in `codex/de-it-su-r706-chemours-gate8`. The filename follows the parent's five-page evidence directory; **this review covers DE/IT payload generation only**, not Sulfate, the reviewer's own alternatives implementation, shared-core integration, CMS, visual acceptance or Gate 9.

Conclusion: **NO_ACTIONABLE_FINDINGS_IN_BOUNDED_PAYLOAD_SCOPE**. No other agent's payload was edited. Source rules were read in `de-it-intake.md`, both exact C V0.2 files, relevant package/Manifest intake identities and the generated/current source. This is a spec/code review, not independent runtime or visual PASS.

## Checks performed

- Ran `node scripts/editorial/build-de-it-payloads.mjs --check`, exit 0. The builder recalculated package/B/C/frozen HTML identities and Germany's separate visual CSS hash, checked seven sections/nineteen links and normalized full B/main equality, then confirmed deterministic current config/CSS output.
- Ran `node --test scripts/editorial/build-de-it-payloads.test.mjs`, 1 test covering both pages passed. Inspected generated links independently: each country has exactly three RFQ URLs with only internal source plus visible/editable destination country; DOC/Sample URL context is source-only, Products neutral.
- Independently inspected every `data-conditional-target` node. DE has three application CTA-only paragraphs; IT has four. Each marker holds one exact link and no substantive application prose. The Trade span owns the complete leading phrase, anchor and trailing qualification while preserving the EU Overview and adjacent limitations. Actual readiness-based removal remains shared-core work, not established by those markers.
- Read both route files: exact Page ID and page-local stylesheet are passed to the shared scoped editorial route/metadata implementation; no page-local Chrome, receiver or alternative source fallback is introduced.
- Read page CSS and checked with PostCSS: all 150 Germany and 129 Italy selectors are under the exact page wrapper; no URL-based assets remain. Germany's bound visual-direction.css is appended after inline rules. Italy's decorative rings, grid branches, source references and dark closing section remain source-derived. The builder does not assign fixed page heights.
- Checked exact C metadata values, four-step breadcrumb identity, `WebPage` selection, EN, neutral Grade behavior, Germany's no-COO boundary and Italy's approved COO plus adjacent limitation through the body equality/contract inputs. No datePublished/dateModified, Product/Offer/local-business/Grade-country claims are added by payload generation.

## Integration conditions retained

The shared owner must still establish query/route/cache/menu/SEO/form/media isolation, noindex/sitemap behavior, correct target records/freshness and atomic omission, receiver validation/recovery/acknowledgment, owner source allowlists and clean shared Header/Footer RFQ. These are explicitly outside the bounded payload author's write scope and are not treated as missing payload implementation.

Visual/font check item for parent: the frozen pages use an Inter 100–900 variable face, including DE link weight 650 and IT 680. The shared page wrapper inspected during this review requested next/font weights 400/500/600/700. Check the actual font descriptors/loaded face and frozen visual fidelity; computed CSS weight alone does not show whether the requested intermediate weight is available. This is recorded as an integration observation, not a demonstrated visual failure or a reason to rewrite approved page CSS.

No current DE/IT source-freshness verification, actual CMS readback, browser destination, three-end screenshot/interaction, native zoom, device/AT, receiver receipt or production/index readiness is claimed here. The parent retains those required checks and independent Gate 9 handback.

## Reviewed file identities

The following hashes bind this review to current file bytes. Later changes invalidate only their affected scope.

| File | SHA-256 |
|---|---|
| `scripts/editorial/build-de-it-payloads.mjs` | `d9e76154a688cd64e4b2ee9c258f4924a1c9da97c71345b9fa3ec07cdf8b8f29` |
| `scripts/editorial/build-de-it-payloads.test.mjs` | `4d4e9c12cdebcafd584c99c9e62ae6e6302af62d760bd3e1027ff23ead5243a9` |
| `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-market-eu-de.json` | `037d7b19f9963fb358d576a960fa256c99700cbf0eb3a0867bce3e6af88f9bc5` |
| `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-market-eu-it.json` | `981cb7527d0192753314c938550ed99d9d5aec8ce9806f69e37d0e8800a25e77` |
| `components/sites/tio2-my/editorial/market-eu-de.css` | `367f9394da8a4952bb9a8869ec394ab265ed0cffc515ca76f9b849ec48a6ac09` |
| `components/sites/tio2-my/editorial/market-eu-it.css` | `995b1ff16f815801c27267692311f81940a87c3faa8fffb52a70cae7bb244745` |
| `app/(en)/markets/germany/page.tsx` | `f5129bd6e405b7d0e206413dba89136d09a05d2229bb9c90bd105c28c8ba7643` |
| `app/(en)/markets/italy/page.tsx` | `08ab9455875ffc963c438f19ea35da6e60acfcc68c1af796e589671951ac9f67` |
| `docs/verification/tio2-my/de-it-su-r706-chemours-20260908/de-it-intake.md` | `9983d5e0807429d14fcc6575a6354e5614ee361f3e673deb347ff84876ad2a2a` |
