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
- Header remains 84px at 1440 and 64px at 390; Logo and Header RFQ remain visible.
- Mobile Menu still focuses its first link on open, closes on Escape and returns focus to Menu.
- Home and Markets have no document-level horizontal overflow at 390 or 1440.

## Automated results

| Check | Command | Result |
|---|---|---|
| Focused unit/component/infrastructure | `npx vitest run tests/unit/homepage/malaysia-template.test.tsx tests/unit/markets/malaysia-market-template.test.tsx tests/infrastructure/tio2-my-global-chrome-contract.test.ts` | PASS: 3 files / 11 tests |
| Changed-file lint | `npx eslint components/sites/tio2-my/malaysia-global-chrome.tsx tests/unit/homepage/malaysia-template.test.tsx tests/unit/markets/malaysia-market-template.test.tsx tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/e2e/market-hub.spec.ts tests/e2e/tio2-my-global-navigation.spec.ts` | PASS: 0 errors |
| TypeScript | `npm run typecheck` | PASS |
| Shared Home/Markets runtime | `npx playwright test tests/e2e/tio2-my-global-navigation.spec.ts --reporter=line` | PASS: 4/4 at 390 and 1440 |
| MARKET-000 full runtime regression | `npx playwright test tests/e2e/market-hub.spec.ts --reporter=line` | PASS: 3/3 at 390, 768 and 1440, including Axe, overflow, Footer, metadata and Schema |

## Visual evidence

| Page/state | Capture | SHA-256 |
|---|---|---|
| Home desktop 1440 | `tio2-my-global-navigation-home-desktop-1440.png` | `7562C99E4177934AFB2887A416A727A951E7839CAFE5E3FF48D65943C4F19781` |
| Home Mobile Menu 390 | `tio2-my-global-navigation-home-mobile-menu-390.png` | `307E3F8538140505177133EC67173B4352D1E30C4F61240367492D5C6D9AD577` |
| Markets desktop 1440 | `tio2-my-global-navigation-markets-desktop-1440.png` | `33EDBE235EDEA289AAE5A4F2F131E42F528FE1D07C35B7A96D1FCBF187AC6552` |
| Markets Mobile Menu 390 | `tio2-my-global-navigation-markets-mobile-menu-390.png` | `B3F1112569402C97EF86ACA3438CFBC6E49A099737FF80F83A5D267083224847` |

## Unresolved / not authorized

- PRODUCT-000 is not implemented for `site_scope=tio2-my` on this branch. The existing `/products/` route remains restricted to `tio2-a` and was not changed.
- This shared Header is ready to express `PRODUCT-000` current state when that page separately passes Gate 7 and receives Gate 8 development authorization; this work is not evidence that the Product page body exists.
- Existing MARKET-000 child-route and RFQ-route release blockers remain open and unchanged.
