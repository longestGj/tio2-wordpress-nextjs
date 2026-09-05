# DOC-TDS Gate 9 Return Correction Verification

## Control

| Field | Value |
|---|---|
| Review ID | `DOC-TDS-G9-PCR-01` |
| Route | `/documents/tds-sds-coa/` |
| Site scope | `tio2-my` |
| Starting commit | `8968fc0657d3e6e355c98e6bcf0e98a1601ec814` |
| Verification date | 2026-09-05 |
| Development disposition | Correction implementation ready for project-control read-only re-review |
| Gate 9 | Not asserted; project-control re-review is still required |
| Gate 10 / release | Not authorized; no deployment, production write, DNS, publication, or indexing action was performed |

This report records local correction and verification evidence only. It does not declare Gate 9 approval.

## Finding closure evidence

### `DOC-TDS-G9-P0-01` — public RSC governance/evidence leak

- Added `lib/documents/document-tds-render-model.ts`, an explicit buyer-safe render projection. The full `MalaysiaDocumentTdsDto` remains on the server for metadata and JSON-LD; only display copy, permitted routes, option values, and readiness booleans cross the Client Component boundary.
- `app/documents/tds-sds-coa/page.tsx` now passes the projected render model instead of the internal DTO.
- `tests/integration/documents/document-tds-route.test.tsx` recursively inspects the serialized Client Component props and rejects the internal keys/values named by the return.
- Production-runtime Playwright requests the complete returned HTML/RSC source and rejects: `schema_version`, `package_id`, `PROVISIONAL_URL`, `FACT_EVIDENCE_REQUIRED`, `canonical_activation`, `request_contract`, `source_normalization`, `render_when`, `evidence_controls`, `direct_downloads`, `grade_document_availability_matrix`, `buyer_visible_internal_terms`, `guaranteed delivery`, and `routeReadiness`.
- Result: production E2E source scan passed; real-runtime ineligible source scan also returned zero forbidden hits.

### `DOC-TDS-G9-P1-01` — Back/Forward request-state incoherence

- The client stores the allowlisted document types and Grade in the current `history.state` while preserving Next.js state.
- State is re-read and validated at initial hydration, `pageshow`, and `popstate`; checkboxes, Grade, summary, and all three CTA URLs are derived from the same canonical React state.
- The production E2E selects SDS + COA + M-2196, follows the receiver route, goes Back, and verifies the controls, summary, and three URLs remain coherent. It then goes Forward and verifies the receiver’s visible/editable prefill and selected hidden source contract.
- Neutral, TDS + M-2196, and SDS + COA/no-Grade synchronization cases are covered.
- Result: the synchronization, Back/Forward, and receiver-prefill tests passed in the 16-test production run.

### `DOC-TDS-G9-P1-02` — Gate 5 visual composition

- Restored the approved two-column Desktop hero and three-document decision key, Deep Navy direct-answer and final-CTA compositions, Inter typography, approved cards/checklist/process treatments, and locked palette/radii.
- Page CSS remains scoped to the DOC-TDS main/module classes and does not override shared Malaysia Global Chrome.
- Route-based omission remains active; unavailable related/request actions are not invented or replaced.
- Approved Gate 5 rasters are checked into `tests/fixtures/documents/doc-tds/gate5/`. The E2E reads them via `import.meta.url`; no runtime test path depends on `D:/23MySec`.
- Every comparison first verifies the approved fixture SHA-256 and dimensions, then checks normalized visual similarity, aspect ratio tolerance, and locked-token coverage. The production run compared 1440, 768, 390, and the four required interaction states successfully.
- Fresh full-page production screenshots at all nine widths contain no Next dev indicator/overlay. Manual inspection was performed on 1440 and 390.

### `DOC-TDS-G9-P2-01` — missing interaction-state evidence

The production E2E regenerated and baseline-compared all required states:

- `doc-tds-gate9-mobile-menu-open-390-2x.png`
- `doc-tds-gate9-tds-m2196-selected-1440.png`
- `doc-tds-gate9-sds-coa-no-grade-1440.png`
- `doc-tds-gate9-faq-open-1440.png`

The same run covered keyboard FAQ operation, focus/menu behavior, Axe at 1440/768/390, nine-width overflow, 200% reflow, forced colors, and reduced-motion execution.

## Portable approved fixtures

| Fixture | SHA-256 |
|---|---|
| `DOC-TDS_G5_DESKTOP_1440_FULL_VISUAL_V0.1.png` | `aaa0a9f232f44dd617dd3718f64fc6651b75f5529628a698502d5779bcce5bc8` |
| `DOC-TDS_G5_TABLET_768_FULL_VISUAL_V0.1.png` | `268106b789c31c9b21221803dc2e4522b12380d624528700599a1dcc64cb11d3` |
| `DOC-TDS_G5_MOBILE_390_LOGICAL_2X_FULL_VISUAL_V0.1.png` | `7077cbfc56e703fecd162cfa82799d6f2a893e422575ec11ff0366c599aac43f` |
| `DOC-TDS_G5_MOBILE_MENU_390_LOGICAL_2X_V0.1.png` | `cdb9c87ad129cfbca6337fb5af36183e77e02b1dd19ff400116005e3e4aa9abe` |
| `DOC-TDS_G5_TDS_M2196_SELECTED_STATE_1440_V0.1.png` | `0278c837a7c5738ea9e5c2daeb91cf79ec0ccb5e780944cdfab3d7feed4bc189` |
| `DOC-TDS_G5_SDS_COA_NO_GRADE_STATE_1440_V0.1.png` | `e1e70dc2f807a9f70d6539e3357e3c14c32e576dab4410a348780e09e54a5ec1` |
| `DOC-TDS_G5_FAQ_OPEN_STATE_1440_V0.1.png` | `64e8758ed9e593ba17503a86943a2b1d2bfc1d13ae14160b1bf2545adf8cc867` |
| Gate 7 source payload JSON | `85629fd74fcce082fdce7374ddc7a9e6570dc93db46b1e0871bc194b20e387ea` |

The Gate 7 byte-parity infrastructure test also uses the repo-relative JSON fixture and separately locks its approved hash.

## Fresh verification

| Check | Command / runtime | Result |
|---|---|---|
| Focused unit/integration/infrastructure | `npm test -- <14 DOC-TDS and request-documents files> -- --reporter=dot` | `14 files / 158 tests PASS` |
| Changed-file ESLint | `npx eslint` over all changed TS/TSX/test files | PASS, exit 0, no findings |
| TypeScript | `npm run typecheck` | PASS, exit 0 |
| Malaysia production-equivalent preview build | `SITE_ID=tio2-my`, `NEXT_PUBLIC_SITE_ID=tio2-my`, eligible fixture GraphQL, `VERCEL_ENV=preview`, `NEXT_DIST_DIR=.next-tio2-my`, then `npm run build` | PASS; Next.js 16.3.2 compiled, typechecked, generated 36/36 static pages, and included `/documents/tds-sds-coa` |
| Production runtime E2E | Fresh `next start` on port 3005 from the isolated preview build; `DOC_TDS_BASE_URL=http://127.0.0.1:3005 npx playwright test tests/e2e/document-tds.spec.ts --config=playwright.config.ts` | `16/16 PASS` |
| Eligible runtime | CMS fixture on 4012 + production build/runtime | Page HTTP 200; request actions and eligible related route present according to the approved fixture; all E2E assertions passed |
| Real-runtime ineligible | `.env.local` + local WordPress GraphQL on 8080, Next dev on 3006 | HTTP 200; page request CTA count 0; related-card count 0; receiver href count 0; cross-scope marker count 0; shared `/request-a-quote/` href count 3 |
| Public source negative scan | Production E2E plus direct ineligible HTML scan | zero forbidden internal/governance/evidence terms |
| SEO/GEO/Schema and site-scope | Focused contract, SEO, query, route, revalidation, and WordPress boundary suites | PASS within the 158-test run; existing query-free Canonical, preview robots, WebPage + BreadcrumbList, and cross-scope-negative contracts retained |
| Responsive/a11y | Production E2E | 1440/1280/1024/768/640/430/390/375/320 no horizontal overflow; Axe 1440/768/390; keyboard, menu, FAQ, zoom, forced colors, and reduced motion PASS |

An earlier build attempt after the prior fixture process had exited failed with `ECONNREFUSED 127.0.0.1:4012`; it is not counted as verification. The fixture was explicitly restarted, and both subsequent fresh Malaysia builds passed. No application-code change was made in response to that environmental failure.

## Production-equivalent evidence hashes

| Evidence | SHA-256 |
|---|---|
| `doc-tds-1440.png` | `5020b7e64b550d71fbe93debecfe5f8cd48f27cb048da02aeaac5a9432c15e0b` |
| `doc-tds-1280.png` | `d0c6419cb6b9598f12f95a83d215d53bd3fa443ddf3b46f8d440e451d18ceda6` |
| `doc-tds-1024.png` | `c598a220a976a339aa236708de6a02a2a756db0faa40fceaee2b0b06dca2e065` |
| `doc-tds-768.png` | `36c1b904a24bbe598f4f6f0614faaff754fb722389ce2ed5dfcd3704303b7b10` |
| `doc-tds-640.png` | `1cb8934e4b2da1b69a92fb8a8baba96c9d764f20df7495729c781162b69afb6d` |
| `doc-tds-430.png` | `050eb39df90f2a83bd353e0cda606e2ea6b5cea88e3fdb54fe1b064ee9455860` |
| `doc-tds-390.png` | `3c8017f3c7db5810aa01dd8e5938a741b79f2c8e5dbd760dd34664af17fb71c4` |
| `doc-tds-375.png` | `73e1b5ab87df4391ef830b2537036fd020baf55e8c465f9d7d4f610f3d254460` |
| `doc-tds-320.png` | `a83b2bca2178724e7c00bcea19adc34dd9bd0520231fca2a3deeb08ea1eef729` |
| `doc-tds-gate9-mobile-menu-open-390-2x.png` | `e37904c43b1711f9afe33d8971c18e62ddbeabe7031ed84914e8052852ccf922` |
| `doc-tds-gate9-tds-m2196-selected-1440.png` | `c57291eeb1302b37edf587a563cfd6ad49234dd5f4d88618824ee6a0feca75bc` |
| `doc-tds-gate9-sds-coa-no-grade-1440.png` | `b892b33b34466058a74d192059fbda164a6681f98f3422df3d467b78f87f12eb` |
| `doc-tds-gate9-faq-open-1440.png` | `6a91efa7e3d80faa5c86a61dd2bac39fe4d8a917121c0a0dbac53afb05ad82c2` |

## Remaining release controls

- Gate 9 remains pending project-control read-only re-review.
- Real WordPress currently marks the page-level request and related-route dependencies ineligible, so those actions remain omitted rather than falling back or crossing scopes.
- Gate 10, deployment, production write, DNS, publication, and indexing remain unauthorized.
