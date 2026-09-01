# ABOUT-001 Gate 9 PCR02 Field-Atomicity Resubmission

Review ID: `ABOUT-001-G9-PCR-02`

Status: `READY_FOR_GATE9_READ_ONLY_REVIEW / GATE9_NOT_ASSERTED`. This record does not authorize deployment, publication, DNS, indexing or Gate 10.

The media P0 and visual-density P1 closed by the prior review were retained without redesign. This revision addresses only field-level public authorization and Restricted neutral output.

## Evidence record and validation

- The WordPress singleton still requires `site_scope=tio2-my`, `/about`, published status, exact immutable Gate 7 page contract and one evidence payload from the same record.
- The evidence payload now contains only the eleven owner-controlled primary facts. Derived Hero, module, metadata and Schema strings are not owner-maintained authorization duplicates.
- Every primary fact accepts `user_approved_public`, `restricted` or `not_public`. No primary fact is forced into an always-public status; safe neutral identity, shared Chrome and allowed CTA constants sit outside the fact inventory.
- `sufficient` is valid only when every fact is public. `partial` and `restricted` are valid when at least one fact is withheld. No fixed restricted-key combination is imposed.
- Missing, duplicate, extra, modified-value, invalid-authorization, invalid-state or cross-scope records fail closed. A valid withheld fact never creates a page 404 and never triggers another-scope fallback.

## Output dependency projection

| Public output | Required public facts / policy |
|---|---|
| Detailed eyebrow, H1 and SEO/OG identity | Organization name + location + main product; otherwise approved `About TiO2 Malaysia` neutral identity |
| Hero P1–P6 | Per-paragraph organization/location/product/export/documents/compliance/supplier dependencies |
| Hero port/route/powder/bag composition | Organization + product + location + export + areas; absent when any dependency is withheld or record state is Restricted |
| Who We Are rows | Each value fact plus Organization for organization-level location/scale/export rows |
| Why Malaysia cards | Location, export/documents/compliance or areas by card; entire module absent in Restricted |
| What We Do / How We Work | Organization plus product/documents/export by item; entire modules absent in Restricted |
| Markets module and map/flags | Organization + areas + documents + export; absent in Restricted |
| Applications module | Organization + product; absent in Restricted |
| Documentation module | Organization + documents; absent in Restricted |
| Company Facts | Company→Organization, Base→Organization+location, Focus→product, Markets→Organization+areas; Restricted retains only public Company and product Focus |
| Metadata description | Detailed identity + organization/location/product/documents/export; Next Metadata uses internal `null` to clear inherited parent description, producing zero public description tags |
| Organization graph | Present only when Organization name is public; description fragments, Place/address and area nodes/relations are independently conditional |
| Shared Header/Footer/RFQ, breadcrumb and CTA pair | Explicit safe constants; never hidden or substituted by evidence state |

`evidenceState=restricted` applies the conservative neutral view: approved neutral H1/eyebrow/title, no factual Hero copy, no Hero/Market/industrial location visual, no capability modules, no origin/location/scale/export rows, and only public Operating Company/product scope plus shared navigation and CTAs.

## Four required authorization scenarios

The test suite renders the same DTO into initial HTML, Next Metadata and JSON-LD for each case:

1. `export.port=restricted`: Port Klang, export row, dependent Hero paragraphs, route/port visual, Markets and export-bound metadata/Schema disappear; unrelated public scale remains.
2. `areas.served + location.full=restricted`: address, Taiping/Perak, market names, Market module, Place/area nodes and all location/market visuals disappear; neutral H1 replaces the detailed claim.
3. `documents.support=not_public`: TDS/SDS/COA/COO claims, documentation module/cards and dependent metadata/Schema disappear; unrelated Applications remain.
4. Arbitrary Restricted combination (`organization.name=not_public`, export/compliance/areas mixed between `restricted` and `not_public`): only neutral identity, public product scope, shared Chrome/RFQ and Final CTA remain; graph is exactly AboutPage + Brand + BreadcrumbList.

No case outputs `N/A`, dash placeholders, empty fact rows, buyer-visible evidence state, cross-scope fallback or orphan location media.

## Runtime evidence

Sufficient visual evidence is unchanged and was revalidated:

| Viewport | SHA-256 |
|---|---|
| 390 | `6AE4FBB1A1C9F071713A753B084DF4A23876D14BBBDB7D6DD4396F9190766D5F` |
| 430 | `3AB876B2EE674BA31B32A11D36425A2CC7C36A7D1647A329BD6CECEDBEAFC45E` |
| 768 | `1801AAD21B7359A26E62471A526AEA64F35C3514E48609A542C4666F441D35F3` |
| 1440 | `13D541448225AFCD6A99124BEB8970DC0B229527111640C232F0FB097328C5C1` |

Restricted evidence used a local-only CMS state with location, export, documents, compliance and areas withheld while Organization/product remained public. The CMS was restored to the approved Sufficient record immediately after capture.

| Viewport | Height | Runtime result | SHA-256 |
|---|---:|---|---|
| 390 | 1831px | Neutral H1; modules = breadcrumb, Hero, Who, Company Facts, Final CTA; no restricted strings/visuals; no overflow; Axe 0 | `B16F92B5CD21B63428E54FDA507670744768E291115CAA7484DA858FD995F5E3` |
| 1440 | 1621px | Same neutral projection; shared 84px Chrome; graph = AboutPage, Organization, Brand, BreadcrumbList; no overflow; Axe 0 | `5392ABCCC87E4DD5FBDE72A2309F8C776AB6DDD7055996F398683A95C2C388A2` |

## Verification results

- Focused ABOUT/cache/shared-template Vitest: 12 files, 68 tests PASS.
- Sufficient ABOUT Playwright: 390/430/768/1440 plus sitemap, 5/5 PASS.
- Restricted browser proof: 390 and 1440, exact neutral module/Schema assertions, overflow PASS, Axe 0.
- WordPress PHP syntax, singleton seed, sufficient/partial/restricted and four arbitrary authorization combinations: PASS.
- Changed-source ESLint: PASS, zero findings.
- TypeScript typecheck: PASS.
- Cold `SITE_ID=tio2-my`, local GraphQL build in `.next-about-g9-pcr02-final`: PASS; `/about` statically generated with 1-hour revalidation.

## Unchanged release boundary

`/applications`, `/documents`, `/request-documents`, `/request-a-quote` and `/contact` remain local 404 release blockers. Approved links and the fixed shared RFQ remain visible without fallback. `/about/` remains outside the controlled sitemap. No deployment, production write, DNS or indexing operation was performed.
