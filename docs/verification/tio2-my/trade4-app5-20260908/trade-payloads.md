# Trade Resource payload implementation receipt — 2026-09-08

## Control

- Site / locale / section: `tio2-my` / `en` / `resources`.
- Authorized pages: `RES-TRADE-EU`, `RES-TRADE-UK`, `RES-TRADE-IN`, `RES-TRADE-BR` only.
- Worktree / branch: `D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8` / `codex/trade4-app5-gate8`.
- Plan baseline: commit `2c97fe1`; delivery is an uncommitted Task 1 worktree contribution for the parent integration owner.
- Environment: local source extraction and unit validation. No WordPress write, seed, live route, receiver, submission, deployment, DNS, indexing, or production operation was performed by this task.
- Interface: `editorial-v0.1` from `docs/superpowers/plans/2026-09-08-trade4-app5-gate8.md`.
- Brazil authority: corrected `RES-TRADE-BR-G6-HANDOFF-02` V0.2 only, SHA-256 `9d0b24b5f49a7f275f6385e2db34ade3f12ffab58aa52012b59ce284b1dac592`. Historical V0.1 is not consumed.

## Output map

| Page | Route | Config | CSS | Approved B `bodySha256` | `renderedBodySha256` |
|---|---|---|---|---|---|
| `RES-TRADE-EU` | `app/(en)/resources/eu-titanium-dioxide-anti-dumping-duty/page.tsx` | `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-eu.json` | `components/sites/tio2-my/editorial/res-trade-eu.css` | `9e119c657d6eed9346ef132e0c2039a5c99327fb9087a273df689b8a2d8a8cb1` | `f1cb77f46e24d8392aa87b85aedb0f296d03cdca52037b60f079b503530cb3b5` |
| `RES-TRADE-UK` | `app/(en)/resources/uk-titanium-dioxide-anti-dumping-investigation/page.tsx` | `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-uk.json` | `components/sites/tio2-my/editorial/res-trade-uk.css` | `e2df4ca206fc64e984f57d6171b3037d665f279c786405a4081ebb2e63c7ac97` | `efdc0549e80bc5d084eeafae9e63db8bbd9acfeffaf4d4e60e5b75512c73aada` |
| `RES-TRADE-IN` | `app/(en)/resources/india-titanium-dioxide-anti-dumping-duty/page.tsx` | `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-in.json` | `components/sites/tio2-my/editorial/res-trade-in.css` | `1234d6f2b0615aa5da488ef51dde282251e175315d9f34e140080e7e3a65252a` | `545e54c1a924028d6de0a99e956e5dd785ccdff7ab469e522752060ea6ae39a2` |
| `RES-TRADE-BR` | `app/(en)/resources/brazil-titanium-dioxide-anti-dumping-duty/page.tsx` | `wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-br.json` | `components/sites/tio2-my/editorial/res-trade-br.css` | `bb83adeb1a2a21ee7b7c4d854d569d5b73ba6a9fc75421a387fe9eeded5b6c5f` | `5241e34f139b6e3def6197aff48d51c545ee25f1e5e59a680c076274aae339af` |

Shared registry, renderer, WordPress contract/query, metadata, cache, webhook, and seed files are owned by the parent task. Each explicit route imports only its own page CSS and calls `renderMalaysiaEditorialRoute(pageId)` / `generateMalaysiaEditorialMetadata(pageId)`.

## Source binding and extraction

| Page | Current Manifest | Gate 6 package SHA-256 | B / C | Visual SHA-256 | Main evidence |
|---|---|---|---|---|---|
| EU | V0.7 | `bb1b44d42fa32232965e62e3255cde05518f2570224b827a1cf68c7b4fd021ad` | B V0.2 / C V0.2 | `c525751ddb4002493a4d5303fb1f5930ed69e0ff489f224e26765a7cced29bbf` | 6 modules, 11 links, table rows `4` |
| UK | V0.7 | `b20932999d838eebb3c42d3e07cf22af712776a5e6f36de43a1da378e3ff2c59` | B V0.3 / C V0.3 | `9ca15ee7ef19e0949b6bb383bfda20fb9ad2fce50e816ee508786f4958a457ee` | 7 modules, 11 links, table rows `4/3/4` |
| India | V0.7 | `5fa99b705b7e8a21ec2d68eb68e2f9235f295d1723bf31387a3f882b8186e0e9` | B V0.2 / C V0.1 | `617d8371fa0e73dc14e571ce9b3c75c8d84390c638e19039487db4f432e5d833` | 8 modules, 11 links, table rows `6/6/3` |
| Brazil | V0.9 | `9d0b24b5f49a7f275f6385e2db34ade3f12ffab58aa52012b59ce284b1dac592` | B V0.2 / C V0.2 | `bc7c17dee83596aa480bda6c6764d37931ccf830e0c7a2fe0c24e4c272f2ddeb` | 8 modules, 13 links, table rows `6/4/3` |

`scripts/editorial/build-trade-payloads.mjs` verifies every package, approved B, and visual hash before output. `source.bodySha256` is the SHA-256 of the original approved B file bytes, matching the Application payload provenance convention. The builder serializes only the approved visual document's `main.innerHTML`, records the prototype main class, and stores that serialized output hash separately as `source.renderedBodySha256`. It converts only page-body CSS into wrapper-scoped rules and excludes Header, Footer, Cookie dialog, scripts, local-navigation simulation, font declarations, filesystem URLs, body media, forms, and inline styles. Run `node scripts/editorial/build-trade-payloads.mjs --check` to prove checked-in outputs reproduce from the exact local D23 sources.

All four prototype `<main>` elements have neither `class` nor `id`, so every `mainClass` is the exact empty string. The shared renderer's `id="main-content"` adds an integration anchor and does not overwrite a prototype main ID. Existing module classes, EU `data-module` attributes, UK/India/Brazil table IDs, `headers`, `scope`, roles, data labels, links, and anchors are retained byte-for-byte after DOM serialization.

The normalized visible block sequence, heading sequence, link label/destination sequence, module count, table row count, and table associations are compared against B and the visual source in `tests/unit/editorial/trade-payloads.test.ts`. UK, India, and Brazil have no visible-text discrepancy after normalizing Markdown heading, link, bold, and inline-code syntax. EU has two approved presentation differences that the visual source already contains and this extraction preserves:

- B's editor-only `### Breadcrumb` heading is not rendered; its buyer-visible `Home / Resources / EU Titanium Dioxide Trade Update` text is retained.
- B's `Primary action:` / `Secondary action:` formatting prefixes are represented by primary/secondary CTA styling; the approved link labels and destinations are retained. The prefixes are the only normalized text tokens omitted by the visual main.

No other B text is dropped, reordered, or rewritten.

## SEO, breadcrumb, and freshness values

Each config uses the exact C title, meta description, H1, query-free absolute canonical, and `Home → Resources → {market} Titanium Dioxide Trade Update` breadcrumb. All four pages are `provisional=false`; this payload task does not authorize robots, sitemap, indexing, or publication.

| Page | `lastReviewed` | `nextReviewDue` | Initial state | Page-specific earlier trigger |
|---|---|---|---|---|
| EU | `2026-09-07` | `2026-10-07` | `unverified`, `evidenceDate=null` | Within two business days of a notice, regulation/amendment, result, judgment, or relevant TARIC change. |
| UK | `2026-09-07` | `2026-10-07` | `unverified`, `evidenceDate=null` | Within two business days of an AD0086 status/scope/code/timetable change, provisional/final action, registration stop notice, or material GB/NI tariff-route change. |
| India | `2026-09-07` | `2026-10-07` | `unverified`, `evidenceDate=null` | Within two business days of a Ministry of Finance/CBIC Customs (ADD) notification, DGTR corrigendum, court order, or relevant ICEGATE/CBIC tariff change. |
| Brazil | `2026-09-07` | `2026-10-07` | `unverified`, `evidenceDate=null` | Within two business days of a GECEX resolution, SECEX circular, final public-interest decision, suspension/revision, court order, expiry change, or relevant tariff/classification change. |

The 30-day active/unresolved maximum gives 7 October 2026 only when no earlier trigger occurs. Publication-window checks remain separate. `trade-freshness.md` records a bounded 8 September check with `NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK` and material source-access limits. It does not advance the approved visible date or this payload's deliberately unverified state. The parent delivery layer owns the separate CMS freshness review envelope and fail-closed suppression across body and machine projections.

## Stable acceptance-condition map

The states below are payload-task evidence only. They are not a Gate 9 PASS.

### RES-TRADE-EU

| AC | Payload-task evidence / remaining dependency |
|---|---|
| `RES-TRADE-EU-G9-AC01` | Config exactly matches visual main and normalized B: six modules, all text, 11 links, seven assessment items, tax categories, sources, dates, and four table rows. Runtime/CMS readback remains parent/Gate 9 work. |
| `RES-TRADE-EU-G9-AC02` | Qualified B text is preserved. Cross-surface runtime parity and content-owner freshness decision remain open. |
| `RES-TRADE-EU-G9-AC03` | Visual CSS is extracted and scoped; implementation screenshots, zoom, reduced motion, contrast, and geometry remain untested. |
| `RES-TRADE-EU-G9-AC04` | No Chrome fork is included. Shared Menu/current/focus evidence remains with the Chrome owner. |
| `RES-TRADE-EU-G9-AC05` | Both EU procurement links and Products link retain exact plain paths. Live destination behavior remains untested. |
| `RES-TRADE-EU-G9-AC06` | All approved official labels/URLs are exact. Live target/document checks remain Gate 9 work. |
| `RES-TRADE-EU-G9-AC07` | RFQ is a plain `/request-a-quote/` link with no prefill or form. Receiver behavior remains open. |
| `RES-TRADE-EU-G9-AC08` | No Legal/Consent code is copied. Shared owner integration remains parent/Gate 9 work. |
| `RES-TRADE-EU-G9-AC09` | Exact title/meta/H1/canonical/breadcrumb inputs are present. Actual SSR head/JSON-LD/social/robots remain parent/Gate 9 work. |
| `RES-TRADE-EU-G9-AC10` | Dates and unverified state are explicit. State-transition suppression remains parent integration work. |
| `RES-TRADE-EU-G9-AC11` | Payload identity is strictly `tio2-my`. Seven-surface runtime/cache isolation remains parent/Gate 9 work. |
| `RES-TRADE-EU-G9-AC12` | Source-bound config, reproducible builder, CSS, route, tests, and this receipt provide the payload mapping. Integrated CMS/runtime receipt remains parent work. |
| `RES-TRADE-EU-G9-AC13` | Exact page path/canonical are present; robots/sitemap/search projection remain unauthorized and untested. |
| `RES-TRADE-EU-G9-AC14` | Exact IDs and open states are retained here; independent Gate 9 review and user Gate 10 authority remain external. |

### RES-TRADE-UK

| AC | Payload-task evidence / remaining dependency |
|---|---|
| `UK-G6-AC01` | Exact seven-module normalized B/visual match, 11 link instances, and `4/3/4` table rows. CMS/SSR/human runtime read remains open. |
| `UK-G6-AC02` | All dated investigation/registration qualifiers are preserved; owner-approved current refresh and cross-surface parity remain open. |
| `UK-G6-AC03` | Scoped visual CSS and mobile table record labels are retained; browser screenshots/geometry remain untested. |
| `UK-G6-AC04` | Page contains no Chrome fork; actual Menu/current/focus lifecycle remains shared-owner work. |
| `UK-G6-AC05` | Primary, TRA, Product, RFQ, and six official source links retain exact labels/targets; live navigation remains untested. |
| `UK-G6-AC06` | RFQ is a plain link with no article-owned context/prefill/form; receiver tests remain open. |
| `UK-G6-AC07` | Exact title/meta/H1/canonical/en inputs are present; actual head/index state remains parent work. |
| `UK-G6-AC08` | Exact breadcrumb and dated body input are present; runtime JSON-LD/GEO/freshness transition remains open. |
| `UK-G6-AC09` | Source-bound semantic body/config exists; scoped WordPress/API round trip remains parent work. |
| `UK-G6-AC10` | Config scope is exact; seven-surface and cache isolation require integrated tests. |
| `UK-G6-AC11` | No Legal/Consent implementation is copied; shared runtime evidence remains open. |
| `UK-G6-AC12` | Table semantics, meaningful links, and scoped focus CSS are retained; keyboard/AT/zoom evidence remains open. |
| `UK-G6-AC13` | This receipt records payload mapping, deltas, tests, rollback, and untested items; parent supplies final integrated identity. |

### RES-TRADE-IN

| AC | Payload-task evidence / remaining dependency |
|---|---|
| `RES-TRADE-IN-G9-AC01` | Exact eight-module normalized B/visual match with all visible text and no governance labels. CMS/SSR runtime read remains open. |
| `RES-TRADE-IN-G9-AC02` | Quash/recommendation/discovery-bound text is preserved; refreshed owner record and machine parity remain open. |
| `RES-TRADE-IN-G9-AC03` | Codes, exclusions, six paths, entities, both USD 681 rows, invoice predicates, and `6/6/3` rows are retained with table associations. Runtime human review remains open. |
| `RES-TRADE-IN-G9-AC04` | Approved scoped responsive CSS is present; browser visual/a11y evidence remains untested. |
| `RES-TRADE-IN-G9-AC05` | Every approved body action has its exact plain target; live destination checks remain open. |
| `RES-TRADE-IN-G9-AC06` | RFQ is navigation only with no prefill/form; receiver acknowledgement/error evidence remains open. |
| `RES-TRADE-IN-G9-AC07` | Exact SEO/breadcrumb/freshness inputs are present; SSR/JSON-LD/social/query behavior remains parent work. |
| `RES-TRADE-IN-G9-AC08` | No Chrome/Logo fork is shipped; shared runtime focus/current/asset evidence remains open. |
| `RES-TRADE-IN-G9-AC09` | No Legal/Consent fork is shipped; shared runtime storage/network evidence remains open. |
| `RES-TRADE-IN-G9-AC10` | Config is strictly scoped; seven-surface/cache runtime tests remain open. |
| `RES-TRADE-IN-G9-AC11` | Date, next due, and unverified state are explicit; owner decision and suppression transition remain open. |
| `RES-TRADE-IN-G9-AC12` | Source-bound config/builder/CSS/route/tests/receipt exist; parent supplies integrated WordPress→delivery→Next identity. |

### RES-TRADE-BR

| AC | Payload-task evidence / remaining dependency |
|---|---|
| `BRTRADE-G9-01` | Exact V0.2-authorized eight-module normalized B/visual match, nine shipment bullets, 13 links, and `6/4/3` rows. CMS/SSR runtime read remains open. |
| `BRTRADE-G9-02` | All scope, Ex-001, producer, rate, Resolution 850/Siegwerk, public-interest, tax, and Malaysia-origin qualifiers are retained. Current owner decision/machine parity remain open. |
| `BRTRADE-G9-03` | Scoped responsive CSS and labelled mobile table records are retained; required browser/device evidence remains untested. |
| `BRTRADE-G9-04` | Table IDs/headers/data labels remain exact and no shared dialog/nav is copied; actual keyboard/AT/shared UI remains open. |
| `BRTRADE-G9-05` | All 13 action instances retain exact plain targets with no tracking/context mutation; live click/back/network evidence remains open. |
| `BRTRADE-G9-06` | Required PT-BR link is visible and targets exactly `/pt-br/markets/brazil/`; target-route live/scope/acceptance remains a release blocker and is not masked. |
| `BRTRADE-G9-07` | RFQ is navigation only with no article-owned prefill/form; receiver runtime remains open. |
| `BRTRADE-G9-08` | Exact SEO/breadcrumb inputs are present; actual preview/index/head/JSON-LD/social behavior remains parent work. |
| `BRTRADE-G9-09` | Date/next due/unverified state are explicit; stale transition/cache purge/suppression remains parent work. |
| `BRTRADE-G9-10` | Config is strictly `tio2-my`; seven-surface/cache/network isolation remains open. |
| `BRTRADE-G9-11` | No shared Chrome/Logo/Legal/Consent code or analytics is copied; owner-version/runtime evidence remains open. |
| `BRTRADE-G9-12` | Six source records and visible date match B/visual exactly; live official availability and machine-date parity remain open. |
| `BRTRADE-G9-13` | This receipt preserves all AC/dependency IDs, source mapping, tests, rollback, and untested scope; parent supplies final integrated ref/environment. |

## Dependency map

| Page | Stable dependency IDs | Current disposition |
|---|---|---|
| EU | `RES-TRADE-EU-G6-D01` | Bounded 8 September check found no material change; payload stays unverified. Content-owner/publication-window decision and suppression remain open. |
| EU | `RES-TRADE-EU-G6-D02` | Exact EU Market/Product/official links retained; live receiver routes are untested. |
| EU | `RES-TRADE-EU-G6-D03` | Plain RFQ link retained; receiver/receipt blocker remains open. |
| EU | `RES-TRADE-EU-G6-D04`, `D05` | Shared Chrome/Brand/Legal/Consent are consumed by parent; no page fork. Runtime owner evidence remains open. |
| EU | `RES-TRADE-EU-G6-D06` | Payload mapping delivered; CMS/delivery/SEO/Schema/index integration remains parent work. |
| EU | `RES-TRADE-EU-G6-D07`, `D08` | Browser/device/a11y, integrated receipt, independent QA, and release authority remain open. |
| UK | `UK-G6-D01` | Bounded freshness check only; owner/publication refresh and suppression remain open. |
| UK | `UK-G6-D02` | Exact Market/Product/RFQ/official links retained; live routes and receiver remain open. |
| UK | `UK-G6-D03` | Shared Legal/Consent/Chrome only; runtime owner evidence remains open. |
| UK | `UK-G6-D04` | Payload implementation delivered; integrated CMS/runtime/browser work remains parent/Gate 9 responsibility. |
| UK | `UK-G6-D05` | Exact route/canonical delivered; indexing remains unauthorized. |
| India | `RES-TRADE-IN-G6-D01` | Bounded check has significant portal access limits; payload remains unverified and owner refresh/suppression remains open. |
| India | `RES-TRADE-IN-G6-D02` | Payload/body/head inputs delivered; CMS/API/SSR safe-failure integration remains parent work. |
| India | `RES-TRADE-IN-G6-D03` | Exact India Market/Product/RFQ links retained; target readiness and receipt remain open. |
| India | `RES-TRADE-IN-G6-D04`, `D05` | Shared Chrome/Logo/Legal/Consent only; no fork; runtime owner evidence remains open. |
| India | `RES-TRADE-IN-G6-D06`, `D07` | Scope integration, final receipt, browser/device/a11y, index and release evidence remain open. |
| Brazil | `BRTRADE-DEP-01` | Bounded check found no material change but direct Resolution access had limits; owner/publication refresh and suppression remain open. |
| Brazil | `BRTRADE-DEP-02` | EN/PT/Product links retained. PT-BR target must be live, same-scope and accepted before affected-path and complete-site release. |
| Brazil | `BRTRADE-DEP-03` | Plain RFQ link retained; receiver/receipt remains open. |
| Brazil | `BRTRADE-DEP-04` | Shared Chrome/Logo/Legal/Consent only; no fork; runtime owner evidence remains open. |
| Brazil | `BRTRADE-DEP-05` | Payload delivered; CMS/API/SSR/metadata/Schema/freshness/scope integration remains parent work. |
| Brazil | `BRTRADE-DEP-06` | Production environment, independent Gate 9 and Gate 10 release authority remain open. |

## Verification and rollback

TDD evidence:

1. `npm test -- tests/unit/editorial/trade-payloads.test.ts` before extraction: 8 tests failed for the expected missing four configs and four styles.
2. The same command after extraction: 8 tests passed. It verifies source/package hashes, identity, metadata, freshness, exact visual-main serialization, complete normalized B visible text, headings, link order/targets, module counts, table rows/associations, forbidden markup, and CSS isolation.
3. Provenance-alignment follow-up: the revised test failed for all four old configs because `bodySha256` still held the rendered HTML hash and `renderedBodySha256` was absent; regeneration then made all 8 tests pass with separate approved-B and rendered-body hashes.

Fresh post-implementation verification at 2026-09-08 local time:

- `node scripts/editorial/build-trade-payloads.mjs --check` → exit 0; 4 payloads reproduce.
- `npm test -- tests/unit/editorial/trade-payloads.test.ts` → exit 0; 1 file and 8 tests passed.
- Scoped ESLint over the four routes and payload test → exit 0 with no output.
- `npm run typecheck` → exit 0; Next route types generated and `tsc --noEmit` passed.

No `verify:root-only` command is authorized or used.

Rollback is file-scoped: remove the four explicit routes, four `tio2-my-editorial-res-trade-*.json` configs, four `res-trade-*.css` styles, `scripts/editorial/build-trade-payloads.mjs`, `tests/unit/editorial/trade-payloads.test.ts`, and this receipt before integration. No database, remote, deployment, or external-message rollback is needed because this task made no such write.
