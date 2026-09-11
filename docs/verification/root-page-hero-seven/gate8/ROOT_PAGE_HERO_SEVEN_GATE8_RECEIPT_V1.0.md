# Root Page Hero Seven-Page Gate 8 Receipt V1.0

## Identity

| Field | Value |
|---|---|
| Handoff ID | `ROOT-HERO-G6-HANDOFF-01` |
| Gate 8 task ID | `ROOT-HERO-G8-IMPLEMENTATION-01` |
| Site scope | `tio2-my` |
| Baseline | `27f0a0da59df1e54cd01eab7d77eb7024b338d42` |
| Implementation commit | `25f7e89d4d41c0e821581757717acf05156335ce` |
| Branch | `codex/root-hero-seven-gate8` |
| Build directory / ID | `.next-root-hero-gate8` / `fhXPekoseOA_c5UmA1zpT` |
| Runtime | `http://127.0.0.1:32000/`; local production mode; held for Gate 9 |

## Implemented result

One production `RootPageHero` now supplies the shared structure, responsive typography, actions, media slot, breadcrumb option, and four approved variants for Home, Applications, Products, Markets, Documents, Resources, and About. Page DTOs continue to supply approved visible copy and routes. The Applications public-markup restriction remains intact through optional legacy module hooks, Resources removes its media wrapper at widths up to 900px, and the Markets Hero action continues to resolve to `#destination-market` while all ten existing market anchors remain unchanged.

The user's 2026-09-11 instruction updates the compact Products interpretation: its 36px/700 H1 may wrap naturally to four lines at 390px. The implementation therefore uses the shared normal `-.035em` letter spacing without stretch or transform. This user-level instruction supersedes the earlier three-line limit for this one viewport/page combination.

## Verification

- Targeted Vitest: 9 files, 41 tests passed.
- Production build: 67 application routes generated; build completed successfully.
- Targeted Playwright: seven pages at 1440/768/390, 21 tests passed. Checks cover shared component identity, variant mapping, 56/44/36 H1 sizing, normal letter spacing, page-specific line limits, focusable 44px actions, no horizontal overflow, Resources media behavior, and serious/critical Axe findings within the Hero.
- Visual review: all seven desktop captures were inspected; Products 390px was separately inspected after the user-directed four-line change.
- Test boundary: HTTP GET and local focus operations only. No real form submission, WordPress mutation, merge, deployment, publication, DNS, sitemap, or indexing action occurred.

## Acceptance mapping

All shared conditions `RH7-AC-CORE-01` through `RH7-AC-CORE-13`, page bindings `RH7-AC-HOME-01`, `RH7-AC-APP-01`, `RH7-AC-PRODUCT-01`, `RH7-AC-MARKET-01`, `RH7-AC-DOC-01`, `RH7-AC-RES-01`, `RH7-AC-ABOUT-01`, and dependencies `RH7-DEP-01` through `RH7-DEP-04` are returned for independent Gate 9 review, with the Products compact wrapping clarification above. This receipt does not announce Gate 9 or Gate 10 approval.

## Evidence references

+EVIDENCE: docs/verification/root-page-hero-seven/gate8/build-result.txt
EVIDENCE: docs/verification/root-page-hero-seven/gate8/unit-result.txt
EVIDENCE: docs/verification/root-page-hero-seven/gate8/e2e-result.txt
EVIDENCE: docs/verification/root-page-hero-seven/gate8/runtime-identity.json
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/home-001-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/home-001-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/home-001-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/app-000-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/app-000-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/app-000-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/product-000-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/product-000-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/product-000-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/market-000-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/market-000-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/market-000-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/doc-000-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/doc-000-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/doc-000-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/res-000-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/res-000-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/res-000-390.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/about-001-1440.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/about-001-768.png
EVIDENCE: docs/verification/root-page-hero-seven/gate8/screenshots/about-001-390.png
