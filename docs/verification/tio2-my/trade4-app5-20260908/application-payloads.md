# Gate 8 application payload report

Date: 2026-09-08\
Site/environment: `tio2-my`, local isolated worktree `D:\16Wordpress_nextjs\.worktrees\trade4-app5-gate8`\
Branch/base: `codex/trade4-app5-gate8` at `fca45f9c8fd940cea7efff1494526d258862191c` before these uncommitted changes\
Pages: APP-COAT, APP-PLAS, APP-MB, APP-INK, APP-PAPER\
Source audit: `.tmp/application-intake.md`

## Delivered payload surface

Five exact WordPress seed/config payloads were generated from hash-bound approved sources:

- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-coat.json`
- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-plas.json`
- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-mb.json`
- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-ink.json`
- `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-paper.json`

Each payload contains the exact `editorial-v0.1` identity, source hashes, SEO fields, breadcrumb records, frozen visual `<main>` body, main class and `freshness:null`. APP-COAT is `provisional:false`; the other four are `provisional:true`. No content is copied across sites or application pages.

Five page-specific stylesheets preserve approved responsive presentation while prefixing every selector with the page wrapper plus `main`:

- `components/sites/tio2-my/editorial/app-coat.css`
- `components/sites/tio2-my/editorial/app-plas.css`
- `components/sites/tio2-my/editorial/app-mb.css`
- `components/sites/tio2-my/editorial/app-ink.css`
- `components/sites/tio2-my/editorial/app-paper.css`

Prototype Header, Footer, Cookie layer, file URLs, logo/font dependencies, interaction simulation, comments and shared-chrome rules are absent. Shared UI remains owned by the common renderer. The bodies contain no script/style/header/footer. There is no approved body image or form.

Five explicit Next App Router pages import their page stylesheet and call the parent-owned route adapter with the exact page ID:

- `app/(en)/applications/titanium-dioxide-for-coatings/page.tsx`
- `app/(en)/applications/titanium-dioxide-for-plastics/page.tsx`
- `app/(en)/applications/titanium-dioxide-for-masterbatch/page.tsx`
- `app/(en)/applications/titanium-dioxide-for-printing-inks/page.tsx`
- `app/(en)/applications/titanium-dioxide-for-paper/page.tsx`

The reproducible builder is `scripts/editorial/build-application-payloads.mjs`. Before writing it verifies every Gate 6 package, approved B body and frozen visual SHA-256; a mismatch aborts generation. The test `tests/unit/editorial/application-payloads.test.ts` was written and observed failing before payload generation. It now verifies exact identities/hashes/metadata, whole frozen-main parity, normalized complete B text, heading/link/table equality, module counts, CSS scoping and prohibited prototype residue.

## Approved route and body inventory

| Page | Route | Modules / tables | Grades | Sources | Main class |
|---|---|---:|---|---:|---|
| APP-COAT | `/applications/titanium-dioxide-for-coatings/` | 10 / 2 | M-350 C, M-510 C, M-896 C, M-996 S, M-2196 S, M-895 C, M-52 S, M-2377 S | 6 | `editorial-application-main` |
| APP-PLAS | `/applications/titanium-dioxide-for-plastics/` | 12 / 3 | M-350 C, M-510 C, M-200 C, M-108 S, M-210 C, M-340 C, M-886 C, M-2377 S | 13 | `page-shell` |
| APP-MB | `/applications/titanium-dioxide-for-masterbatch/` | 11 / 4 | M-510 C, M-200 C, M-108 S, M-210 C, M-340 C, M-886 C, M-2377 S | 4 | `editorial-application-main` |
| APP-INK | `/applications/titanium-dioxide-for-printing-inks/` | 11 / 2 | M-350, M-510, M-52, M-2377; neutral, no process claims | 6 | `editorial-application-main` |
| APP-PAPER | `/applications/titanium-dioxide-for-paper/` | 11 / 3 | M-350, M-2377; neutral, no process claims | 7 | `editorial-application-main` |

Conversion links remain the plain approved `/request-documents/`, `/request-sample/` and `/request-a-quote/` paths. No prefill or receiver result is invented. Required inner anchor IDs are preserved; no content links to a discarded prototype main ID.

Baseline Schema for every page is `WebPage` plus `BreadcrumbList`. APP-MB C and Gate 6 allow an `ItemList` only when the exact seven visible Grade links and order have live eligibility evidence. This local candidate deliberately stays on the approved two-node baseline. Per controller ruling, every local Gate 8 candidate is noindex and excluded from sitemap until Gate 10, including non-provisional APP-COAT.

## Acceptance-condition coverage and remaining evidence

The payload unit test provides direct source-level evidence for complete approved copy, module order, headings, tables, links, Grade order, source links, fragment targets, metadata values and page CSS isolation. Runtime behaviors remain Gate 9 work and cannot be claimed from payload tests.

| Page | Payload-backed AC coverage | Still needs shared/runtime/Gate 9 evidence |
|---|---|---|
| APP-COAT | AC01 complete 10 modules; AC02 eight Grade rows/order; AC05 exact Grade/Product paths; AC06 exact three action paths/copy; AC08 approved metadata/Schema input; AC09 six sources; AC10 scoped payload/style; AC12 route input; AC13 bound source/dependency identity | AC03 responsive visual/200%/reduced motion; AC04 shared navigation and focus; AC05 live route eligibility; AC06 receivers; AC07 legal/consent; AC08 rendered head/JSON-LD; AC10 all seven runtime surfaces; AC11 complete development receipt; AC12 robots/sitemap/keyword runtime and Gate 10 authority |
| APP-PLAS | AC01 complete 12 modules/13 sources; AC02 identity and provisional path; AC05 exact anchors/cross-page/Product/Grade paths; AC06 source URLs; AC07 conversion paths/copy; AC09 metadata input; AC10 eight ordered Grade records and context; AC11 scoped payload/style; AC13 provisional route state | AC03/04 production responsive/navigation/a11y; AC05 live eligibility; AC07 receivers; AC08 legal/consent; AC09 rendered SSR/head/Schema; AC11 seven runtime surfaces; AC12 receipt; AC13 final route/index/cannibalization; AC14 independent Gate 9/10 |
| APP-MB | AC01 identity/provisional path; AC02 complete 11 modules/four sources; AC03 semantic body tables; AC04 seven ordered Grades and process labels; AC05 anchors and approved links; AC06 conversion paths/copy; AC09 scoped managed payload; AC11 metadata input; AC12 two-node baseline Schema input; AC14 scoped payload/style | AC03/07 responsive table/visual inspection; AC04 live eligibility and any future ItemList parity; AC05 live cross-page eligibility; AC06 receivers; AC08 a11y; AC09 CMS mutation/fail-closed; AC10 SSR/cache; AC11 rendered head/route decision; AC12 JSON-LD validation; AC13 shared UI; AC14 all seven runtime surfaces |
| APP-INK | AC01 complete 11 modules/six sources/tables; AC02 four neutral Grades; AC05 exact Grade/Product paths; AC06 conversion paths/copy; AC08 metadata input; AC09 six source URLs; AC10 scoped payload/style; AC12 provisional route input; AC13 bound source/dependency identity | AC03/04 responsive/shared navigation/a11y; AC05 live route eligibility; AC06 receivers; AC07 legal/consent; AC08 rendered head/Schema; AC10 seven runtime surfaces; AC11 receipt; AC12 final route/index/keyword; AC13 Gate 9/10 authority |
| APP-PAPER | AC01 identity/provisional path; AC02 complete 11 modules/seven sources; AC03 optical/evidence table content; AC04 approved limits retained; AC05 two neutral Grades; AC06 exact anchors/routes; AC07 conversion paths/copy; AC10 scoped managed payload; AC12 metadata input; AC13 two-node Schema input; AC15 scoped payload/style | AC03/08/09 production responsive/table/a11y; AC05/06 live route eligibility; AC07 receivers; AC10 CMS edit/fail-closed; AC11 SSR/cache; AC12 rendered head/route decision; AC13 JSON-LD validation; AC14 shared UI; AC15 seven runtime surfaces |

## Dependency disposition

| Dependency family | Payload result | Remaining owner/evidence |
|---|---|---|
| D01 route decisions and route relations | Exact approved candidate paths and provisional flags are present. APP-COAT alone has a final route. | Architecture/route owners must close four provisional decisions and synchronize public URL surfaces at Gate 10. |
| D02/D03 Grade, Product and cross-Application eligibility | Exact visible relations and approved order are present. APP-PLAS ↔ APP-MB links are preserved. | Product/Application owners must establish live scoped eligibility; ineligible relations must disappear atomically. |
| Conversion/receiver dependencies | Exact plain conversion paths and bounded copy are present. | Conversion owners must prove context, allowlists, receiver selection, failure recovery and actual receipt; no payload test claims delivery. |
| Shared Chrome/Logo/legal/consent | Page CSS cannot style these surfaces and prototype copies are removed. | Shared owners must provide current Header/Footer/menu/fixed RFQ/logos/legal/Cookie behavior and Gate 9 interactions. |
| WordPress/API/SSR/cache/SEO | Config matches the agreed `editorial-v0.1` payload contract and explicit routes call the shared adapter. | Parent-owned model/import/query/DTO/renderer/metadata/revalidation must pass integration and scope-isolation tests. |
| Source freshness | All bound source URLs and approved source notes are retained unchanged. | Content/source owner rechecks time-sensitive sources immediately before release, especially APP-MB manufacturer/ISO pages and APP-PAPER ISO 186 revision status. |
| Responsive/accessibility/browser | Frozen page CSS and semantic HTML are preserved. | Gate 9 must inspect actual 1440/768/390 output, 200% zoom, keyboard/focus, reduced motion, physical devices, other browsers and assistive technology. |
| Seven-surface isolation | Payload identities and style wrappers are `tio2-my`; no cross-site content is introduced. | Shared query, route, cache, menu, SEO, form and media layers require correct/wrong/missing-scope runtime tests. |

## Verification

- `node scripts/editorial/build-application-payloads.mjs` regenerated all five payloads and scoped styles after verifying the fifteen bound source hashes.
- `npm test -- tests/unit/editorial/application-payloads.test.ts` passed 15/15.
- A second generation pass preserved byte-identical SHA-256 values for all ten generated JSON/CSS outputs (`REPRODUCIBLE_OUTPUTS_OK`).
- `npm run typecheck` passed: Next route types generated and `tsc --noEmit` exited 0.
- Targeted ESLint over the five routes, payload test and generator exited 0 with no findings.

No D23 source, production system, receiver, deployment, sitemap or indexing state was changed. No commit was created.
