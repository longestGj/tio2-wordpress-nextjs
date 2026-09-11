# RootPageHero seven-page Gate 9 return receipt V1.0

Date: 2026-09-11  
Gate 8 task: `ROOT-HERO-G8-IMPLEMENTATION-01`  
Gate 9 review: `ROOT-HERO-G9-INDEPENDENT-ACCEPTANCE-01`  
Return round: `ROOT-HERO-G9-RETURN-01`  
Status: `GATE8_REPAIR_COMPLETE / AWAITING_GATE9_RECHECK`

## Candidate identity

| Field | Value |
|---|---|
| Site scope | `tio2-my` |
| Branch | `codex/root-hero-seven-gate8` |
| Baseline | `27f0a0da59df1e54cd01eab7d77eb7024b338d42` |
| Previous implementation | `25f7e89d4d41c0e821581757717acf05156335ce` |
| Repair implementation | `5e4cf270a46e059345bfe2e07fde1a1402335efb` |
| Build directory / ID | `.next-root-hero-gate8` / `5HyOyxr4edPSEh1KtWPhH` |
| Runtime | `http://127.0.0.1:32000/` |

## Finding closure supplied for recheck

- `ROOT-HERO-G9-F01`: Applications Hero always renders the approved clean `/request-a-quote/` action, independent of `rfqReady`; the lower final RFQ section keeps its existing readiness rule.
- `ROOT-HERO-G9-F02`: About Hero contains only `hero.paragraph.1`; paragraphs 2–6 immediately follow under `Who We Are`, before the unchanged seven facts.
- `ROOT-HERO-G9-F03`: the effective 375px content width used by the 390px browser configuration now produces Product 4, Documents 3, Resources 4 and About 4 H1 lines. Product, Resources and About use normal/zero mobile tracking. All seven retain 36px/700, no transform/stretch/cropping and no horizontal overflow.
- `ROOT-HERO-G9-F04`: Resources Hero targets the unique, existing `#research-paths` element.
- `ROOT-HERO-G9-F05`: Home, Product and About RFQ links use clean public URLs and the existing referer-derived HttpOnly opaque-cookie attribution path. Their public HTML contains neither the affected Page IDs nor `source_page_id`/`data-source-page`.

## Directed verification

- Production build: PASS; 67 routes generated.
- Targeted Vitest: 11 files, 59 tests PASS.
- Targeted Playwright: 21/21 PASS for seven pages at 1440/768/390.
- RFQ private attribution: Home, Applications, Products and About each return `204`; every cookie is HttpOnly and contains no source Page ID.
- Visual evidence: all 21 Hero screenshots are included; the five changed 390px captures were inspected.
- External writes: none. No real form submission or WordPress mutation was executed.

This receipt does not announce Gate 9 PASS and does not authorize Gate 10, merge, push, deployment, publication, DNS or indexing.

EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/build-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/unit-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/e2e-result.txt  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/private-rfq-attribution-result.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/public-id-audit.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/runtime-identity.json  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/home-001-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/home-001-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/home-001-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/app-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/app-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/app-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/product-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/product-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/product-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/market-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/market-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/market-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/doc-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/doc-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/doc-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/res-000-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/res-000-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/res-000-390.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/about-001-1440.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/about-001-768.png  
EVIDENCE: docs/verification/root-page-hero-seven/gate8-return-01/screenshots/about-001-390.png
