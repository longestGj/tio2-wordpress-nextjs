# GRADE-CR901 Gate 8 local verification — 2026-09-02

Status: **IMPLEMENTED FOR LOCAL PREVIEW / NOT RELEASED**
Scope: `/products/cr-901/`, `site_scope=tio2-my` only. RES-000 remained paused. No deployment, publication, DNS, indexing, production write, merge, or Gate 9 decision was performed.

## Authority and source integrity

- Gate 6/7 closure: `GRADE-CR901_FAST_TRACK_GATE6_GATE7_PROJECT_CONTROL_CLOSURE_V0.1.md`, SHA-256 `CC40CBBD87EC738A7D7435997338983A55C569765010BB1E6D1DB6933FE484EF`.
- Gate 7 manifest: `GRADE-CR901_GATE7_MANIFEST_V0.1.md`, SHA-256 `F2FEAA3B234BAF835E474F00EF09D2333C918ACC37C5FEC08996B7C1CE866884`.
- Approved content contract copied byte-for-byte to the repository: SHA-256 `4BDB27E2F4BC9CBC0F1A21C9B2FCAF54553431E1DE614355F8263C7489050522`, 11,352 bytes, exactly one LF at EOF. Canonical JSON SHA-256 is `090BF10F57ADC7B3734ABC4AEA3CDFDD28C2103636150C5DB350E75745624EFE`.

## Architecture and isolation

- CR-901 was added to the existing Product Detail v0.1 approved-contract registry and dynamic `/products/[familySlug]` route. No CR-901 route file, component, CSS, Header, Mobile Menu, Footer, or schema fork was created.
- The existing Malaysia Global Chrome is reused with only `currentPageId/sourcePageId` context. Visible `CURRENT` remains zero; Desktop current underline is 3 px and Mobile current marker is 4 px with left alignment and `aria-current="page"`.
- The local WordPress seed creates one `tio2_grade` record with internal slug `tio2-my-cr-901`, `site_scope=tio2-my`, Page ID `GRADE-CR901`, public path `/products/cr-901`, release state `PREVIEW_ONLY`, and the exact approved contract. Missing/invalid/multiple/wrong-scope records fail closed; unknown slugs return 404. There is no cross-scope fallback.
- All fourteen approved Product Detail identities now have preview contracts. The previous thirteen contract files and rendered evidence were not modified.

## Contract parity

| Check | Result |
| --- | --- |
| Identity and release controls | PASS — `approved_for_preview`; `noindex,nofollow`; sitemap authorization false |
| Hero/process | PASS — CR-901; high-purity rutile; vapor-phase oxidation; no Chloride/Sulfate process route |
| Applications | PASS — four unlinked source-specific cards in order: Electronic Ceramics, Optical Glass, Battery Materials, Special Metallurgy |
| Evaluation | PASS — two groups and eight initial-server-DOM items |
| Technical data | PASS — `Specification` / `Typical Value`; nine rows; zero method fields |
| Metadata | PASS — one HTTPS self-canonical `https://tio2malaysia.com/products/cr-901/`; no hreflang; preview robots |
| JSON-LD | PASS — one graph containing Product and BreadcrumbList; exactly nine PropertyValue nodes; no Offer/manufacturer/countryOfOrigin/isSimilarTo/testMethod |
| Suppressions | PASS — no CR-200/M-200, generic application mapping, cosmetics/medicine/non-toxic/safety/UV/anti-aging/batch-to-batch/storage/packaging/loading/origin/compliance/logistics/commerce public output |
| Conditional modules | PASS — no contextual application/process link, documents, markets, related grades, or sample module; Global RFQ remains available through shared Chrome |
| Accessibility/layout | PASS — one H1, semantic breadcrumb/table/headings, keyboard menu Escape/focus return, reduced motion, 44 px mobile targets, no horizontal overflow, Axe zero violations |

## Verification evidence

| Verification | Result |
| --- | --- |
| Focused contract/registry/query/route tests | PASS — 5 files, 61 tests |
| Selected Product Detail Vitest regression (`tests/unit/products`, `tests/integration/products`, and three scope/contract infrastructure files) | PASS — 42 files, 652 tests |
| Changed-file ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| PHP seed lint in WP-CLI container | PASS |
| Local WP seed and GraphQL read | PASS — Page ID/scope/state plus 4 applications, 8 evaluation items, 9 rows, 2 columns, indexing false, sitemap false |
| TiO2 Malaysia preview production build | PASS — 14 approved Product Detail SSG paths |
| Focused CR-901 Playwright | PASS — 8/8 |
| Full Product Detail Playwright regression | PASS — 99/99 using same-origin `127.0.0.1` listener and browser URL |

The first broad browser attempt used a `localhost` development listener while the tests opened `127.0.0.1`. Next.js 16 correctly blocked cross-origin development chunks, leaving four M-350 mobile tests unhydrated. No runtime code was changed for that harness issue. The listener was restarted explicitly on `127.0.0.1`; the four tests passed 4/4 and the subsequent fresh full run passed 99/99.

## Visual evidence

All seven images were freshly captured after the same-origin run and manually inspected. Desktop, tablet, mobile, narrow mobile, and 200%-zoom-equivalent views show the Header Logo, current Products state, Global RFQ, full approved module order, method-free technical table, Footer Logo/RFQ, and no horizontal overflow.

| File | SHA-256 |
| --- | --- |
| `cr901-1440.png` | `1626CC20ED519007B3F0C1831F40FAE8E01E695BE0437760D09D1C98D5E89CDB` |
| `cr901-1024.png` | `CCE5E4DCA1F10B63625772A214F7B7158D1E4EAFBD0F7F6DE3A5033153B56AAD` |
| `cr901-768.png` | `6AE0D4ABA1F948AF449FB22C67E94354FD89C54F8F3BE672D8FE151999610276` |
| `cr901-430.png` | `02F6D2CC0C18A9E184BA856CDF41D7D68218AD5AED14B44F70995A17C10E579D` |
| `cr901-390.png` | `17625513B85326A069A3B4D30D15605CB26A6DC74871551D8AA71997A3BB2B2F` |
| `cr901-narrow-320.png` | `5FEB9EE0BBEEC41E2D04510DF96549B0B88E3FA0AD378DFB5AC04B61CAFBBC96` |
| `cr901-200-percent-zoom-equivalent.png` | `7ED128636B419193D30C91898C5BF6A6161D287CE14B41763E37EBAFF4397078` |

## Stop point and blockers

- CR-901 remains preview-only, `noindex,nofollow`, and excluded from the sitemap until a separate release authorization.
- Conditional application/process/document/market/sample destinations remain absent and fail closed; no URL was invented.
- Gate 9 read-only acceptance remains pending with Controller 02. This record is not a Gate 9 PASS or Gate 10 authorization.
- RES-000 was not modified and remains paused until CR-901 receives the required Gate 9 conclusion and the controller explicitly resumes it.
