# DOC-TDS Gate 8 Local Verification — 2026-09-05

## Scope and state

- Worktree: `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`
- Branch: `codex/home-001-tio2-my`
- Starting HEAD: `f3409f1d4b2455e99fcbc1881e73fc90df049100`
- Page: `DOC-TDS`, `/documents/tds-sds-coa/`, `site_scope=tio2-my`
- Authorization boundary: local Gate 8 implementation and verification only. No Gate 9/10 decision, deploy, production write, DNS, publication or indexing action was performed.

## Approved source parity

- Gate 7 package: `DOC-TDS-G7-HANDOFF-01`
- Approved source SHA-256: `85629FD74FCCE082FDCE7374DDC7A9E6570DC93DB46B1E0871BC194B20E387EA`
- Checked-in payload SHA-256: `85629FD74FCCE082FDCE7374DDC7A9E6570DC93DB46B1E0871BC194B20E387EA`
- The WordPress seed stores the checked-in payload byte-for-byte; the resolver and TypeScript DTO reject missing, duplicate, foreign-scope, non-publish, wrong-route, malformed or non-identical records.

## Implementation checks

- Exact ten-module order: PASS.
- Exact Buyer Clean payload and 14 Grade options: PASS.
- Shared `MalaysiaGlobalHeader`/Mobile Menu/Footer only; Documents current mapping and `sourcePageId=DOC-TDS`: PASS.
- Visible `CURRENT=0`, Desktop current underline and Mobile 4px marker: PASS.
- Three page primary actions share one deterministic URL and state: PASS.
- TDS/SDS/COA normalized to `technical_product`, `safety`, `quality_coa` in approved order: PASS.
- Repeated/array Grade input discarded; zero/one allowlisted Grade accepted: PASS.
- Public `source_page_id=DOC-TDS` rejected; exact same-origin Referer may establish the separate trusted source: PASS.
- CONV-DOC remains editable and receives repeated `document_types[]`, then `product_grade`: PASS.
- Unready routes remove complete page action/card surfaces with no Contact/RFQ/email/phone/cross-scope fallback: PASS.
- Global Chrome RFQ remains present independently, per shared contract: PASS.

## SEO, GEO and Schema

- Exact title and meta description: PASS.
- One self-canonical: `https://tio2malaysia.com/documents/tds-sds-coa/`: PASS.
- No hreflang and `noindex, nofollow` before Gate 10: PASS.
- One JSON-LD script with exactly `WebPage` and `BreadcrumbList`: PASS.
- No FAQPage/QAPage/Product/Offer/DigitalDocument/HowTo/action/download/availability claims: PASS.
- Page was not added to the sitemap: PASS.

## Automated verification

- Focused Vitest: 14 files / 139 tests PASS.
- Revalidation/GraphQL/WordPress infrastructure subset: 3 files / 59 tests PASS.
- Changed-file ESLint: PASS, 0 errors and 0 warnings.
- `npm run typecheck`: PASS.
- `npm run build` with `SITE_ID=tio2-my`, `NEXT_PUBLIC_SITE_ID=tio2-my`, `VERCEL_ENV=preview`, isolated `NEXT_DIST_DIR`: PASS; route `/documents/tds-sds-coa` included.
- PHP lint for resolver and seed: PASS.
- Local WP-CLI seed: PASS, post ID `17372`, scope `tio2-my`, path `/documents/tds-sds-coa`.
- Live local GraphQL query: PASS.
- Playwright: 12/12 PASS.

## Browser and accessibility evidence

- Viewports PASS with no horizontal overflow: 1440, 1280, 1024, 768, 640, 430, 390, 375 and 320 px.
- Fresh full-page screenshots captured at all nine widths.
- Axe PASS at 1440, 768 and 390.
- Keyboard Mobile Menu Escape/focus return and current marker: PASS.
- FAQ answers present in initial server HTML; Enter expands answer and updates `aria-expanded`: PASS.
- 200% device-scale reflow, reduced motion and forced colors: PASS.
- Header production SVG decodes, has non-zero natural dimensions and contract bounding box at all widths: PASS.
- React hydration/key-warning regression assertion: PASS.

### Screenshot SHA-256

- `doc-tds-1440.png`: `0A6AFA52042CD622515081F17A3E780FF9C58822D8199A4BF7AB80FE5306E727`
- `doc-tds-1280.png`: `BBF261E52A7BBEF37E73B7C49CAE06D3DF2ED4FF5FE94C623F806FC40A448B3E`
- `doc-tds-1024.png`: `DD841C30C13426B2E2F2BA652DD5C3F583EF2BB3CC8CE90808F0736095CA0CDB`
- `doc-tds-768.png`: `F9DA676482E98B3209A2C5F036A7227DDDAE4C8436D5FC4F5BC097BEA4CDAE7C`
- `doc-tds-640.png`: `3980CA40955DA0335DD86B39B7B690F6A199F20976200C554660EF33B31EE597`
- `doc-tds-430.png`: `E30B97BCD50F2EF57E8A9868DA85E711D1A8C7226851003A559470FF9BBE244C`
- `doc-tds-390.png`: `C6B7BFCE56E3F7EE79103B06DCDDD2DD6BE9930BEED4009C289FBC7E7C8568C5`
- `doc-tds-375.png`: `3D5621C221DEE189F160F1CD10BDD92EC15B085449FAF19119259170260A098B`
- `doc-tds-320.png`: `E859905D445C1E0995ED7C5F313CC78CB3F549DD405BE4559C60AFD35BC13A1B`

## Runtime blockers preserved

The real local WordPress readiness projection is:

```json
{"CONV-DOC":false,"DOC-000":false,"DOC-REACH":false,"DOC-COO":false}
```

Therefore all page-level request/document-hub/REACH/COO actions are currently omitted by the real runtime. The nine-width interaction evidence used a local read-only GraphQL proxy that changed only the DOC-TDS readiness projection to exercise the approved eligible state; all other CMS queries were forwarded to local WordPress. This is test evidence, not release authorization.

Release blockers remain:

- `CONV-DOC` requires exact scoped `LIVE_APPROVED` route metadata plus receiver readiness/form key.
- `DOC-000` requires exact scoped `LIVE_APPROVED` route metadata.
- `DOC-REACH` and `DOC-COO` remain unavailable/unimplemented targets.
- Gate 9 read-only acceptance and Gate 10 release authorization are still required.
