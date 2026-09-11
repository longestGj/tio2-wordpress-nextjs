# RootPageHero seven-page Gate 9 Return-02 receipt V1.0

Date: 2026-09-11  
Gate 8 task: `ROOT-HERO-G8-IMPLEMENTATION-01`  
Gate 9 review: `ROOT-HERO-G9-INDEPENDENT-ACCEPTANCE-01`  
Return round: `ROOT-HERO-G9-RETURN-02`  
Status: `GATE8_F03_REPAIR_COMPLETE / AWAITING_GATE9_RECHECK`

## Candidate identity

| Field | Value |
|---|---|
| Site scope | `tio2-my` |
| Branch | `codex/root-hero-seven-gate8` |
| Baseline | `27f0a0da59df1e54cd01eab7d77eb7024b338d42` |
| Return-01 implementation | `5e4cf270a46e059345bfe2e07fde1a1402335efb` |
| Return-02 implementation | `c91f5a9e2da7af46b18b0325b5d58d22c379ad19` |
| Build directory / ID | `.next-root-hero-gate8` / `O9v9ni00s3gk6I2C3PTqy` |
| Runtime | `http://127.0.0.1:32000/` |

## F03 repair supplied for recheck

- Removed the `mobileHeadingFit` prop, DOM attribute and the Documents/About page-private `width: calc(100% - 20px)` plus `12px` padding exception.
- Restored the approved shared canvas and Shell geometry: the `tio2-my` English body has zero margin, the shared Hero uses `border-box`, mobile width remains `calc(100% - 40px)`, and framed Heroes use 24px left/right padding.
- Bound the existing `malaysiaSharedFont` entry to the repository's frozen Inter variable font used by the Gate4 candidates. Mobile compact tracking matches the approved `-.045em`; Product, Resources and About remain `normal`/zero.
- Shared Hero actions now use `border-box`, preventing the full-width Resources action from crossing or being clipped by the Shell edge.
- At a 390px browser surface with a 375px classic-scrollbar layout width, Product/Documents/Resources/About render 4/3/4/4 lines. Each is 36px/700 with no transform, 100% font stretch and no horizontal overflow. Framed Heroes are `left=20`, `right=355`, `width=335`, with 24px left/right padding; the Resources action is safely contained at `left=45`, `right=330`.

## Preserved closed findings and passing ranges

- F01, F02, F04 and F05 assertions remain in the same targeted Playwright and Vitest suites and pass.
- Seven-page 1440px and 768px ranges remain green; all seven 390px cases also pass.
- Private RFQ attribution for Home, Applications, Products and About returns 204 with a redacted opaque cookie carrying HttpOnly, SameSite=Strict and root-path attributes.

## Directed verification

- Production build: PASS; 67 routes generated.
- Targeted Vitest: 11 files, 64 tests PASS.
- Targeted Playwright: 21/21 PASS for seven pages at 1440/768/390.
- Runtime geometry record: PASS for Product 4, Documents 3, Resources 4 and About 4 lines, shared Shell geometry and action containment.
- Visual evidence: all 21 Hero screenshots are included; Documents, Resources and About 390px captures were inspected after the final action-containment repair.
- External writes: none. No real form submission or WordPress mutation was executed.

This receipt does not announce Gate 9 PASS and does not authorize Gate 10, merge, push, deployment, publication, DNS or indexing.

EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/build-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/unit-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/e2e-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/mobile-runtime-geometry.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/private-rfq-attribution-result.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/runtime-identity.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/home-001-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/home-001-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/home-001-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/app-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/app-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/app-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/product-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/product-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/product-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/market-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/market-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/market-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/doc-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/doc-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/doc-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/res-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/res-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/res-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/about-001-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/about-001-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-02/screenshots/about-001-390.png
