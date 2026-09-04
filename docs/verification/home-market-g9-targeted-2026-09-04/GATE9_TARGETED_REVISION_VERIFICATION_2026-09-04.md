# HOME-001 / MARKET-000 Gate 9 Targeted Revision Verification

Date: 2026-09-04  
Branch: `codex/home-001-tio2-my`  
Parent revision: `49289d40fdb0b91d28f534776464403883d912ff`  
Runtime: Next.js 16.3.2 production build, `SITE_ID=tio2-my`, local WordPress GraphQL at `127.0.0.1:8080`  
Release state: local verification only; no deployment, publication, DNS or indexing action

## Implemented scope

- HOME-001 uses the approved accessible deep teal `#007F77` on light surfaces and the separately tested light teal `#14B8A6` on dark page surfaces. Five-view Axe checks report zero serious or critical violations.
- The Home H1 preserves the exact approved sentence, renders the approved teal emphasis, measures 61.92px at 1440, 42px at 390 and 40px at 320, and remains the only H1.
- The 1440 Home module heights are within 8px of the approved content-driven baseline: Hero 740, Start Here 176, Markets 732, Products 858, Applications 719, Company 380, Documents 518, Resources 715 and page RFQ 350 CSS px.
- Mobile Products now shows all four group names, the approved 6/5/2/1 counts and the approved `Expand grades` labels before expansion. Each button disclosure exposes `aria-expanded` and `aria-controls` and is independently keyboard accessible. The expanded state contains exactly 14 visible, unique grade IDs. Server-rendered markup defaults all four disclosures to closed; CSS keeps all 14 grades visible at Tablet/Desktop while a JavaScript-disabled 390px browser check confirms the approved collapsed Mobile state before hydration.
- Tablet Start Here is unchanged pending the recorded governance decision.
- MARKET-000 retains the approved trailing-slash identity. `/markets/` is now the direct 200 representation and `/markets` returns 308 with `Location: /markets/`.
- The same route test confirms the unique canonical, the ten approved trailing-slash internal actions, the CollectionPage trailing-slash URL, and the staging sitemap exclusion.
- With Next.js automatic slash redirects disabled, `proxy.ts` reproduces the prior repository-wide no-trailing-slash behavior for pages and APIs, then applies one TiO2 Malaysia exception: `/markets` redirects to `/markets/`, which is the direct 200 representation. `/api/revalidate` remains a direct handler while `/api/revalidate/` redirects to it, preserving the existing no-redirect WordPress webhook contract.

## Executable evidence

| Check | Result |
|---|---|
| Focused Home/Market/Chrome/config/form/proxy Vitest, excluding the pre-existing Site A revalidation case | PASS — 36 files, 356 tests |
| Production Playwright: Home five viewports plus no-JS mobile SSR, Market route plus three viewports, shared Chrome Home/Markets/Products | PASS — 19/19 |
| TypeScript | PASS — `tsc --noEmit` |
| Targeted ESLint | PASS — 0 errors; CSS is intentionally outside the ESLint matcher |
| `SITE_ID=tio2-my` production build | PASS — 35 routes generated |
| Home Axe at 320/390/768/1024/1440 | PASS — zero serious/critical at each width |
| Horizontal overflow at all tested Home and Market widths | PASS — `scrollWidth === clientWidth` |
| Broader Home suite including Site A revalidation | 35 files and 348 tests passed; one unrelated existing Site A revalidation test failed with expected 200 / received 400, matching the accepted Gate 9 record |

## Route and dependency observations

| Route | Fresh production response | Disposition |
|---|---:|---|
| `/markets/` | 200 | Fixed; canonical representation |
| `/markets` | 308 → `/markets/` | Fixed; non-canonical variant |
| Ten Market child routes | 404 each | External page-owner/release blockers retained; no placeholder pages created |
| `/applications/` | 404 | APP-000 owner/release blocker retained |
| `/request-a-quote/` | 200, unavailable form state in this environment | Receiver/environment blocker retained; no secret committed |
| `/request-documents/` | 500 | Missing Malaysia WordPress record; owner coordination required |
| Four held Trade probe paths | 500 in the production build | Shared route-layer P1 retained; no Trade content, link, Schema, sitemap or thaw was introduced |

`/request-documents/` still fails through the explicit GraphQL missing-record error. Changing that contract in this Home/Market revision would conflict with the existing CONV-DOC fail-closed decision, so it remains assigned to the CONV-DOC owner/project control. The held Trade paths are absent from MARKET-000 output and remain unauthorized.

## Fresh visual evidence

| File | Dimensions | SHA-256 |
|---|---:|---|
| `home-001-1440.png` | 1440×5767 | `613E7C3CB2B53CF28F90DDC5B49E37F4F784484E71D5EE408EF28FEDDE5EC9E6` |
| `home-001-1024.png` | 1024×6580 | `7BD97F51DB52C085404E34DDE8911954664076BA732CC26B81176287B642DA9E` |
| `home-001-768.png` | 768×7423 | `12F2473AC42B28A39367AEAA7B47C374900C694AD131CCE59934DED9D63EE353` |
| `home-001-390.png` | 390×8629 | `DF2A1F676A740533A83C16696A2212EC50B0A1280394217D0487E051AC626014` |
| `home-001-320.png` | 320×9326 | `8796C6AF639DD12DCBD4FBCED7BBFBAE936BEE44C0898EF8AA2F76EACB1B222A` |
| `home-001-mobile-menu-390.png` | 390×844 | `03F71E95CDFC92E253543281F5F116673B48B3A214593700A07448710359640D` |
| `home-001-products-expanded-390.png` | 374×1664 section crop | `4E34823855BBC539F59BF37ED9123031AEB79F6C1CC303FB5EF24CD898BBFC78` |
| `market-000-1440.png` | 1440×5266 | `91C6DB7CF48167B641CB0CD84593E243772337DE3B2D82162113B49699A38E94` |
| `market-000-768.png` | 768×6989 | `2F66AFC5A230C668212479722F4A471C64F27B32A2F6A8BD83028A4D575CF00B` |
| `market-000-390.png` | 390×8040 | `840E9B7F0028B3271FB8206DEA2210BDACE702A8F6FC00091D3AC1D400055AF0` |
| `market-000-320.png` | 320×9005 | `1F234630C580814D55FF47D9AD264E14EF5FF39A89CFCB34931F01662D3F91B0` |

Original-detail review confirmed visible Header/Footer logos, populated Desktop Products, four collapsed Mobile group rows, the complete expanded 14-grade state, intact shared Chrome, no overlap and no horizontal crop. All files in this table were freshly recaptured from the final production build after the responsive disclosure and route-normalization revisions.

## Preserved contracts

- Exact Home and Market copy, module order, URLs, product facts, SEO/GEO relationships and JSON-LD node/relationship boundaries remain unchanged.
- Home page RFQ remains present at 1440/1024/768 and absent at 390/320; shared Header/Mobile Menu/Footer RFQ remains present.
- No cross-`site_scope` fallback, child page, Trade content, PT-BR output, production receiver secret or production operation was added.
