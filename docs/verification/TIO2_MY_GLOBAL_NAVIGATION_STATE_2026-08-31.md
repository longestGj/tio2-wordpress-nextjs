# TiO2 Malaysia shared navigation state — local verification — 2026-08-31

## Scope

- Shared component: `MalaysiaGlobalHeader` in the existing TiO2 Malaysia Global Chrome.
- Implemented consumers verified: HOME-001 `/`, MARKET-000 `/markets/` and PRODUCT-000 `/products/`.
- Approved change: remove the visible `CURRENT` word while retaining current-page state.
- No navigation order, Header height, Logo, Request a Quote, Footer, page body, route, SEO, Schema, form or site scope was changed.
- This is local development evidence only. No deployment, publication, DNS, indexing or Gate 10 operation occurred.

## Shared ownership and architecture contract

- `site_scope=tio2-my` has one Global Chrome implementation: `components/sites/tio2-my/malaysia-global-chrome.tsx` and `components/sites/tio2-my/malaysia-global-chrome.module.css` own the Global Header, Desktop navigation, Mobile Menu, Logo bindings, permanent Request a Quote surfaces and Footer.
- `wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json` is the one navigation/Logo/RFQ/Footer configuration. Home, Markets and Products DTOs all import this exact site-local file; no page-local configuration or cross-scope fallback exists. Global Chrome V0.5 also owns the approved Footer headings `Explore`, `Information` and `Procurement`.
- HOME-001, MARKET-000 and PRODUCT-000 each render `MalaysiaGlobalHeader` and `MalaysiaGlobalFooter` directly once. Their only page-specific Chrome inputs are `currentPageId` and `sourcePageId`; the removed `MalaysiaHeader` compatibility wrapper is no longer a second implementation surface.
- Page typography and interaction CSS is rooted at the page `<main>` (`homepageMain`, `marketMain` or `productMain`). Page styles are contract-tested to reject shared Header, Logo, navigation, marker, RFQ, Mobile Menu or Footer selectors and may not use broad `.site *`, heading, paragraph, link or `:is()` rules that cross the main boundary.
- Any subsequently authorized Malaysia page must consume these same component, style and configuration sources. It must not introduce a page-specific Header, Mobile Menu, Footer or duplicated Chrome configuration.
- A shared Chrome change requires Home/Markets and each enabled future consumer to pass Desktop, Tablet and 390px regression appropriate to the affected surface: production Logo decode/bounds/pixels, 84/64px Header, visible `CURRENT` count zero, Desktop 3px underline, Mobile 4px marker, RFQ persistence and scope, Footer geometry/content, no horizontal overflow, hidden-navigation accessibility, keyboard focus and Escape return.

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
| Focused unit/component/infrastructure | `npx vitest run tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/unit/homepage/malaysia-template.test.tsx tests/unit/markets/malaysia-market-template.test.tsx` | PASS: 3 files / 14 tests, including single-component/config consumption and page-CSS boundary enforcement |
| Changed-file lint | `npx eslint components/sites/tio2-my/homepage/malaysia-homepage.tsx components/sites/tio2-my/homepage/malaysia-homepage.module.css components/sites/tio2-my/markets/malaysia-market-hub.module.css tests/e2e/tio2-my-global-navigation.spec.ts tests/infrastructure/tio2-my-global-chrome-contract.test.ts` | PASS: 0 errors; CSS files produce the expected no-matching-configuration warnings |
| TypeScript | `npm run typecheck` | PASS |
| Shared Home/Markets + MARKET-000 runtime | `npx playwright test tests/e2e/tio2-my-global-navigation.spec.ts tests/e2e/market-hub.spec.ts --reporter=line` | PASS: 9/9; Home and Markets at 390/768/1440 plus the full Markets contract at all three widths, including Logo pixel proof, Axe, overflow, Footer, metadata and Schema |

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

## PRODUCT-000 activation addendum

- The earlier statement that PRODUCT-000 was not implemented is superseded by its later Gate 7 closure and Gate 8 authorization. `/products/` now consumes the same shared component, stylesheet and Global Chrome V0.5 configuration with `currentPageId=PRODUCT-000` and `sourcePageId=PRODUCT-000`.
- The combined local runtime command `npx playwright test tests/e2e/market-hub.spec.ts tests/e2e/product-hub.spec.ts tests/e2e/tio2-my-global-navigation.spec.ts --config=playwright.config.ts` passed 14/14: Home/Markets shared navigation at 390/768/1440, Markets at 390/768/1440 and Products at 390/768/1024/1440 plus Selector/FAQ interaction.
- Existing Grade, Process, Application, Document and RFQ external-route blockers remain open. This addendum is local Gate 8 evidence, not Gate 9 PASS, Gate 10 authorization or publication.
