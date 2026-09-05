# DOC-REACH Gate 8 implementation and Gate 9 read-only QA evidence

## Control

| Field | Value |
| --- | --- |
| Page / route | `DOC-REACH` / `/documents/reach/` |
| Site scope | `tio2-my` only |
| Accepted foundation | `d1b15e253b1202d2e4639646845c7ca8155104a8` |
| Implementation branch | `codex/doc-reach-gate8-evidence` |
| Verification date | 2026-09-05 |
| Gate 8 disposition | Implementation and local evidence complete; ready for independent Gate 9 read-only QA |
| Gate 9 | Not asserted or pre-approved by this record |
| Gate 10 / release | Not authorized; no deployment, production CMS write, DNS, publication, or indexing action was performed |

The repository fixture and WordPress configuration are byte-identical to the approved Gate 7 payload. Both have SHA-256 `F9D2A1F14BE61EEEB585454FFC139D9AC5051B1515950F39748E8F0E1CF0B339`. A narrow `.gitattributes` rule preserves the approved LF bytes on Windows; the accepted DOC-TDS payload is protected in the same way and remains `85629FD74FCCE082FDCE7374DDC7A9E6570DC93DB46B1E0871BC194B20E387EA`.

## Implemented evidence controls

| Control | Evidence |
| --- | --- |
| Contract and scope lock | DTO and WordPress resolver require the exact serialized payload, `publish`, `/documents/reach`, one `tio2-my` scope, valid modified time, exact route-readiness keys, and exact four-source readiness keys. Missing, malformed, multiple, or cross-scope content fails closed. |
| Per-source readiness | Each approved official-source URL has an independent private boolean. A stale row is removed atomically while the other three remain; no replacement or guessed source is emitted. |
| Receiver readiness | `CONV-DOC=false` removes all three request actions, the request-selection panel, its availability note, and the request-document Schema relationship. Document Hub actions remain independently eligible; no Contact, email, telephone, or cross-scope fallback is introduced. |
| Buyer-safe projection | The Client Component receives only approved display fields and readiness-filtered destinations. Public HTML/RSC scans reject governance, evidence-control, readiness, query-only, and excluded stronger-claim terms. |
| CONV-DOC transport | All actions preserve the approved `other` transport plus visible/editable `REACH documentation`. Same-origin DOC-REACH clicks retain hidden trusted attribution after normalizing the browser's slashless referrer. Direct public `source_page=DOC-REACH` tampering remains non-authoritative. Duplicate and unsupported types are discarded; HTML-like text is inert; required/500-character validation retains buyer edits. |
| FAQ semantics | Five buttons expose explicit `aria-expanded` and `aria-controls`; answers are programmatically associated, initially collapsed, server present, keyboard operable, and focus remains on the activated control. |
| Shared Malaysia Chrome | The page continues to consume the single Site A Malaysia Header/Mobile Menu/Footer. The Mobile Menu now matches the approved white in-flow state, shows `Close` while expanded, traps focus, closes with Escape, and returns focus. No page CSS targets shared-Chrome selectors. |
| SEO / Schema | Exact Title, description, clean HTTPS self-Canonical, preview `noindex, nofollow`, and query-invariant metadata remain locked. JSON-LD contains only `WebPage` and `BreadcrumbList`; `WebPage.breadcrumb` references the emitted breadcrumb node. Readiness removes only the affected related URL. |

## Fresh verification

| Check | Command / runtime | Result |
| --- | --- | --- |
| Focused unit, integration, and infrastructure | `npm test -- --run tests/unit/documents tests/integration/documents tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts tests/unit/request-documents tests/integration/api/revalidate.test.ts tests/unit/wordpress/cache-tags.test.ts` | `26 files / 243 tests PASS` |
| TypeScript | `npm run typecheck` | PASS, exit 0 |
| ESLint | `npm run lint` | PASS, exit 0; zero errors and two pre-existing warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs` |
| PHP syntax | Read-only `php:8.3-cli` container over five touched/dependent plugin and seed files | PASS; no syntax errors |
| Production build | `SITE_ID=tio2-my`, controlled GraphQL fixture, `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=doc-reach-e2e-key`, `NEXT_DIST_DIR=.next-doc-reach-g8`, then `npm run build` | PASS; Next.js 16.3.2 compiled, typechecked, generated 37/37 pages, and listed `/documents/reach` as dynamic |
| Production-runtime browser QA | `npx playwright test --config=playwright.document-reach.config.ts` using `next start` plus the controlled CMS fixture | `16/16 PASS` in 29.7s |

The serial browser run covered 1440, 1280, 1024, 768, 640, 430, 390, 375, and 320 CSS pixels. Every width had `scrollWidth === viewportWidth`; primary actions were at least 48px high (64px at 320). Axe reported zero violations at 1440, 768, and 390. It also covered keyboard/focus behavior, Back/Forward state, signed cache invalidation, wrong and missing scope, a stale official-source row, 200% reflow, reduced motion, forced colors, focus visibility, hostile input, and intercepted non-production submission payloads.

The wrong-scope and missing-scope cases intentionally produced `CrossSiteContentError` server logs while their HTTP responses failed closed; those expected logs are evidence, not test failures.

## Runtime and dependency evidence

- `doc-reach-runtime-matrix.json` records all nine widths, action sizes, Axe results, six approved-baseline comparisons, and state-transition outcomes.
- `doc-reach-dependency-ledger.json` records the three route dependencies, all four official-source dependencies, and observed eligible/ineligible states.
- `doc-reach-public-output-scans.json` records zero hits for every forbidden public-output term.
- The controlled fixture is loopback-only and validates exact readiness-key sets. It also supplies the approved CONV-DOC contract so no local or production CMS drift can weaken the handoff test.

Observed visual comparison scores exceeded their locked thresholds:

| Approved Gate 5 state | Similarity | Threshold |
| --- | ---: | ---: |
| Desktop 1440 full page | 0.946806 | 0.88 |
| Tablet 768 full page | 0.924891 | 0.88 |
| Mobile 390 full page | 0.900737 | 0.88 |
| FAQ open/focus | 0.937902 | 0.82 |
| Mobile Menu open | 0.909129 | 0.82 |
| Receiver unavailable | 0.953904 | 0.88 |

## Production-equivalent evidence hashes

| Evidence | SHA-256 |
| --- | --- |
| `doc-reach-1440.png` | `EF36E69EBCC984BD017F9D28FB261CC3B2E34D12C49117D634517838F52094D7` |
| `doc-reach-1280.png` | `F6338AA6B7DBC2586680070AE63011196C9365C68705FB48B12760B3F6DD7D9D` |
| `doc-reach-1024.png` | `C29FD3E7832898F3CCF4B485EE4096A238E2FB55DC4EBBB343D98542C380124F` |
| `doc-reach-768.png` | `BF9112EE003EB8C31D00117D32B8106DFAD54A8AA354CC2D7A8F82844333F821` |
| `doc-reach-640.png` | `2AA7F5E905F6CED560A97A84FEED2851E303D14712BD3E20A54085F4486CCFB0` |
| `doc-reach-430.png` | `D4D1D36023C95E3E4BC0FFDA9E3F4687D6A7BE7F9E2DD129C72986C67545DD4B` |
| `doc-reach-390.png` | `43CE8CF7DBC0801B09E00E4AA211068F10FE1FB1D65CAA170C95279DF2685021` |
| `doc-reach-375.png` | `2945A97E76F37A54716BDC65160948433019D5E07014C7CA3949F72EF392A461` |
| `doc-reach-320.png` | `F994DC2E5E35F1F869EA28C6B3626FAF42290742F27431502F4015957E2CC5B4` |
| `doc-reach-faq-open-focus-1440.png` | `48A0BF6A1E6A29BEA1B91A3E169FA05FFB57FCD018A821AE5E6CEB72A1BDC8D0` |
| `doc-reach-mobile-menu-open-390-2x.png` | `52E2AF5472402C753E6E846C4BFD396BF9378DEDCF20B8C99789291E8CB2947E` |
| `doc-reach-receiver-unavailable-1440.png` | `7505369C90960C6B155CC2719861E70C107D2E47FFBA02AD787F0792232DAB74` |
| `doc-reach-runtime-matrix.json` | `FB46AB94E16134D291CF1F0545E56E65A43A238D71DF60C870AE3A0D23DDCBB5` |
| `doc-reach-dependency-ledger.json` | `DB926496877B3CC8451D6013AEE08C3AEA64390EA074DA2F33C261D47B4B09ED` |
| `doc-reach-public-output-scans.json` | `465528AC80FACFFFB244720D6783226BCC97F575388EEB8B1A9DE7E25E8DD78F` |
| `doc-reach-official-source-freshness.json` | `4987F0646BED8F4F710E3E45F530910D200A89BE358E0D642534852F6F06B65A` |

## Official-source freshness check

All four approved URLs were opened successfully on 2026-09-05. The [European Commission REACH page](https://environment.ec.europa.eu/topics/chemicals/reach-regulation_en) still describes the EU framework and industry responsibilities. The [Your Europe FAQ](https://europa.eu/youreurope/business/product-rules-compliance/chemicals-and-hazardous-substances/registering-chemicals-reach/faq/index_en.htm) still covers manufacturer, importer, and Only Representative roles and reports `Last checked: 01/10/2025`. [HSE's UK REACH page](https://www.hse.gov.uk/reach/about.htm) still distinguishes the independent Great Britain framework and reports `Updated 2025-09-02`. [HSE's Northern Ireland page](https://www.hse.gov.uk/REACH/northern-ireland.htm) still states that Northern Ireland retains EU REACH status and obligations and reports `Updated 2025-09-03`.

The approved payload intentionally renders `Source updated` only for the two HSE sources and `Site reviewed: 2026-09-05` for all four. `doc-reach-official-source-freshness.json` records the check. It must be repeated immediately before publication.

## Remaining release controls

1. Independent Gate 9 read-only QA remains required; this report does not declare it passed.
2. No production CMS seed/write was performed. Gate 9/10 must verify the real `DOC-REACH`, `CONV-DOC`, `DOC-000`, and `MARKET-EU-001` records, Canonicals, release states, source-readiness values, and `tio2-my` scopes.
3. CONV-DOC production key placement, approved recipient/privacy flow, real submission/readback, and mailbox receipt remain release controls. Local E2E intercepted the external request and sent nothing.
4. Official-source freshness must be repeated immediately before publication.
5. Gate 10, deployment, production Canonical/robots/indexing activation, DNS, public release, and sitemap activation remain unauthorized.
