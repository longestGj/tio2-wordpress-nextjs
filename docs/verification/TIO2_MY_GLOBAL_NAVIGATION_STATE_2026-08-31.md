# TiO2 Malaysia shared navigation state — local verification — 2026-08-31

## Scope

- Shared component: `MalaysiaGlobalHeader` in the existing TiO2 Malaysia Global Chrome.
- Implemented consumers verified: HOME-001 `/` and MARKET-000 `/markets/`.
- Approved change: remove the visible `CURRENT` word while retaining current-page state.
- No navigation order, Header height, Logo, Request a Quote, Footer, page body, route, SEO, Schema, form or site scope was changed.
- This is local development evidence only. No deployment, publication, DNS, indexing or Gate 10 operation occurred.

## DOM and visual contract

- Desktop current link: exact page label only; `aria-current="page"`; computed `font-weight: 800`; teal `::after` underline at 3px using `rgb(0, 106, 99)`.
- Mobile current link: exact page label only; `aria-current="page"`; computed `font-weight: 800`; teal left `::before` marker at 8px/4px using `rgb(20, 184, 166)` per Global Chrome V0.4.
- Header contains no visible uppercase `CURRENT` text on Home or Markets.
- Desktop and Mobile navigation DOMs each contain exactly one current link. Navigation hidden for the active viewport does not enter the accessibility tree; the closed Mobile Menu enters it only after opening.
- Every Home/Markets 390/1440 Header Logo assertion requires `toBeVisible()`, waits for `img.complete === true`, verifies positive natural dimensions, calls `decode()`, waits two animation frames, and checks the rendered bounding box against the shared Chrome contract. All four resolve the site-local production SVG at `/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg` with natural dimensions 300×100.
- The Logo element screenshot is decoded and pixel-scanned in the E2E helper. Desktop produces 3,158 non-white pixels in a 180×60 box; Mobile produces 1,317 non-white pixels in a 110×36.65625 box. Home and Markets results are identical and exceed the 100-pixel failure threshold.
- Home and Markets also return identical Logo computed styles at each viewport: `opacity: 1`, `visibility: visible`, `display: block`, `filter: none`, `mix-blend-mode: normal`, `clip: auto`, `clip-path: none`, and `transform: none`.
- Header remains 84px at 1440 and 64px at 390; Logo and Header RFQ remain visible. MARKET-000 Footer Logo also remains covered by the full runtime regression.
- Mobile Menu links are explicitly locked in the shared Chrome to `align-items: flex-start` and `text-align: left`. Home and Markets both report those exact computed values; page-level link rules can no longer shift the menu alignment.
- Mobile Menu still focuses its first link on open, closes on Escape and returns focus to Menu.
- Home and Markets have no document-level horizontal overflow at 390 or 1440.

## Automated results

| Check | Command | Result |
|---|---|---|
| Focused unit/component/infrastructure | `npx vitest run tests/unit/homepage/malaysia-template.test.tsx tests/unit/markets/malaysia-market-template.test.tsx tests/infrastructure/tio2-my-global-chrome-contract.test.ts` | PASS: 3 files / 11 tests |
| Changed-file lint | `npx eslint tests/e2e/support/tio2-my-logo.ts tests/e2e/market-hub.spec.ts tests/e2e/tio2-my-global-navigation.spec.ts tests/infrastructure/tio2-my-global-chrome-contract.test.ts` | PASS: 0 errors |
| TypeScript | `npm run typecheck` | PASS |
| Shared Home/Markets runtime | `npx playwright test tests/e2e/tio2-my-global-navigation.spec.ts --reporter=line` | PASS: 4/4 at 390 and 1440 |
| MARKET-000 full runtime regression | `npx playwright test tests/e2e/market-hub.spec.ts --reporter=line` | PASS: 3/3 at 390, 768 and 1440, including Axe, overflow, Footer, metadata and Schema |

## Visual evidence

| Page/state | Fresh P0-02 R3 full capture | SHA-256 | Logo pixel result |
|---|---|---|---|
| Home desktop 1440 | `tio2-my-global-navigation-p0-02-r3-home-desktop-1440.png` | `C92A0523E92063DC81129B95629C35CB53B38FAE86CC6F1AF8E8FE7616513781` | 3,158 non-white / 10,800 opaque |
| Home Mobile Menu 390 | `tio2-my-global-navigation-p0-02-r3-home-mobile-390.png` | `86B6085AAC6B5EB1CF414548447F75C8DB768E6F0C1353B5C1A155C0846564AC` | 1,317 non-white / 4,180 opaque |
| Markets desktop 1440 | `tio2-my-global-navigation-p0-02-r3-markets-desktop-1440.png` | `33EDBE235EDEA289AAE5A4F2F131E42F528FE1D07C35B7A96D1FCBF187AC6552` | 3,158 non-white / 10,800 opaque |
| Markets Mobile Menu 390 | `tio2-my-global-navigation-p0-02-r3-markets-mobile-390.png` | `E22926BA90DB089B570AC0492F237853B1C11825C28C463EDC3DF5467E0038DA` | 1,317 non-white / 4,180 opaque |

### Header and Logo crop evidence

| Page/state | Header crop SHA-256 | Logo element crop SHA-256 |
|---|---|---|
| Home desktop 1440 | `A741DC62128B2C039DFBBF307A24DA76FD0829B9C059615F272980BE02D3B86D` | `8976CC8B30F491D9219CA346A57C33E8805AC68E0BE29A66BA82D5557132EFB1` |
| Markets desktop 1440 | `20B4600EE0CFF99A7090A2EB85C0082DD8E7414E8417EA6739EB13B38CC5BB3C` | `8976CC8B30F491D9219CA346A57C33E8805AC68E0BE29A66BA82D5557132EFB1` |
| Home Mobile 390 | `58E03E6B5FA03B27177EB54BCFBB3E2CDA843B87575BBFB7029B2784487B7348` | `0A3ABBDF10CB182BB109F216C35CB9CA20BA7308FA77D6D997F6F5299055D8F8` |
| Markets Mobile 390 | `977D10C25C627354C4644F5E11EFBEDD99D555884C004FB5A67DC2B1346A9791` | `0A3ABBDF10CB182BB109F216C35CB9CA20BA7308FA77D6D997F6F5299055D8F8` |

The crop files are named `tio2-my-header-p0-02-r3-<state>.png` and `tio2-my-logo-p0-02-r3-<state>.png`. Matching Logo-crop hashes prove that Home and Markets paint the same pixels at the same viewport. Original-detail manual inspection of the two Markets full captures, Header crops and Logo element crops confirms that the Logo is visibly painted in all layers; the rejected uncommitted R2 evidence was removed rather than submitted.

## P0-02 / P1-02 verification checklist

- P0-02 Header Logo: PASS locally for Home/Markets at 390/1440; visible, decoded, contract-sized and pixel-painted.
- P1-02 Mobile Menu: PASS locally for Home/Markets at 390; computed `align-items: flex-start` and `text-align: left`.
- Preserved contracts: PASS locally for 4px Mobile marker, 3px Desktop underline, visible `CURRENT` count 0, one current link per Desktop/Mobile DOM surface, viewport-hidden navigation excluded from the accessibility tree, Header RFQ/Logo sizing, Footer and page-body regression.
- Status boundary: local development evidence only; this document does not assert project-control final PASS.

## Unresolved / not authorized

- PRODUCT-000 is not implemented for `site_scope=tio2-my` on this branch. The existing `/products/` route remains restricted to `tio2-a` and was not changed.
- This shared Header is ready to express `PRODUCT-000` current state when that page separately passes Gate 7 and receives Gate 8 development authorization; this work is not evidence that the Product page body exists.
- Existing MARKET-000 child-route and RFQ-route release blockers remain open and unchanged.
