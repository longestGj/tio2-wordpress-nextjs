# ABOUT-001 Gate 9 Conditional-Return Resubmission

Review ID: `ABOUT-001-G9-PCR-01`

Status: `READY_FOR_GATE9_READ_ONLY_REVIEW`. This does not assert Gate 9 PASS and does not authorize deployment, publication, DNS, indexing or Gate 10.

## P0 evidence source and fail-closed projection

- WordPress stores the immutable page/component contract and public evidence payload separately on the same private `tio2_about_page` singleton. Both are returned by the same non-null GraphQL projection.
- Evidence is versioned as `ABOUT-001-G7-PCR-02:FACTS-V0.1`. Cache tags include scope, route, page and this exact content version.
- WordPress and the Next.js DTO independently validate the exact fact inventory/value source, authorization vocabulary, safe-public facts, dependency bindings, derived state and output atomicity. Missing, duplicate, modified, cross-scope, invalid-state or non-atomic records fail closed; no other scope is queried.
- Initial HTML, metadata and JSON-LD all consume the same DTO projection from that one record/version.

| Evidence state | Public projection |
|---|---|
| `sufficient` | Six Hero paragraphs, seven Who We Are facts, exact metadata description, Organization base + scale description, Place/address and four areas. |
| `partial` | Annual Supply, Markets Served and Customer Base rows collapse; the scale sentence is absent from Organization schema. Other approved public output remains. |
| `restricted` | Partial-state removals plus Location, Hero paragraph 1, metadata description, Organization description, Place/address and Organization→Place relation collapse atomically. Safe H1, operating company, product, shared Chrome and CTA remain. |

No state produces `N/A`, dash placeholders, empty rows, null JSON-LD properties, or buyer-visible evidence-state labels.

## P0 media implementation record

The source visual is `about.visual.desktop.v03` / the approved PCR02 V0.3 responsive set. Every output uses the authorized `HTML_CSS_SVG_REBUILD` method in the About component and CSS module; no remote/cross-scope asset is requested, no full-page PNG is shipped, and no UI text is rasterized.

| Asset key / element | Implementation and geometry | Placement | Accessibility | OG / Schema |
|---|---|---|---|---|
| `about.hero.composite` | CSS port/container scene, powder bowl and TiO2 rutile bag; Hero visual 430px desktop, 370px tablet, 250px mobile minimum | Right Hero field | decorative, `aria-hidden` parent | omitted |
| `about.hero.route_map` | Inline SVG `viewBox="0 0 540 240"`; abstract land, Malaysia origin, four routes and visible European Union / United Kingdom / India / Brazil / Malaysia labels | Hero composition | decorative, `focusable=false` | omitted |
| `about.markets.map` | Inline SVG `viewBox="0 0 760 300"` | Markets intro | decorative | omitted |
| four Market flags | Scoped CSS, 56×34 desktop | EU / UK / India / Brazil cards | decorative | omitted |
| four Application visuals | CSS illustrations, 168px desktop / 184px mobile | approved cards | approved ALT via `role=img` | omitted |
| `about.final_cta.background` | Gradient plus right-side silo/building/pipe structure | Final CTA, section-clipped | decorative, `aria-hidden` | omitted |

The four new captures were manually inspected at original detail. The Hero visibly contains route labels, port/container structure, powder form and TiO2 bag at every breakpoint; the final CTA visibly contains the right-side industrial structure.

## P1 responsive density and runtime evidence

All eleven approved modules remain in order. Density was reduced with compact card/section geometry and inline-link treatment; no approved module, fact or action was hidden to mimic a shorter reference image. Inline copy links use the WCAG inline-target exception, while controls and primary actions retain target-size rules.

| Viewport | Full height | Hero / Who / Why / What / Markets / Apps / Process / Docs / Facts / CTA (px) | Screenshot SHA-256 |
|---|---:|---|---|
| 1440×1000 | 3886 | 685 / 389 / 309 / 310 / 338 / 378 / 263 / 216 / 226 / 172 | `13D541448225AFCD6A99124BEB8970DC0B229527111640C232F0FB097328C5C1` |
| 768×1000 | 4957 | 929 / 480 / 364 / 363 / 489 / 350 / 341 / 296 / 247 / 251 | `1801AAD21B7359A26E62471A526AEA64F35C3514E48609A542C4666F441D35F3` |
| 430×844 | 6321 | 975 / 537 / 499 / 481 / 724 / 559 / 443 / 646 / 388 / 289 | `3AB876B2EE674BA31B32A11D36425A2CC7C36A7D1647A329BD6CECEDBEAFC45E` |
| 390×844 | 6617 | 1043 / 555 / 515 / 513 / 741 / 559 / 493 / 690 / 440 / 289 | `6AE4FBB1A1C9F071713A753B084DF4A23876D14BBBDB7D6DD4396F9190766D5F` |

Each capture passes: 200 response; exact H1/module order; rendered production Header logo; visible CURRENT=0; Desktop 3px underline or Mobile 4px marker; shared RFQ; exact Hero route labels; non-zero port/industrial geometry; unique canonical; no hreflang; noindex/nofollow; one approved graph; shared Footer contract; no overflow; no remote request; Axe zero violations.

## SEO / GEO / Schema

- Canonical: `https://tio2malaysia.com/about/`; no query, hash, alternate host, cross-scope canonical or hreflang.
- Sufficient state uses exact approved Title/description/OG copy; OG image omitted. Restricted state omits description fields instead of fallback/null output.
- Sufficient graph: `AboutPage`, `Organization`, `Brand`, `Place`, four `AdministrativeArea` and `BreadcrumbList` nodes.
- Approved relationships remain when public. Restricted location removes Place and Organization `location` together; restricted descriptions are absent from AboutPage and Organization.
- No `legalName`, Product, Offer, Review, AggregateRating, FAQPage, QAPage or `manufacturer` output.

## Shared Chrome and route blockers

- ABOUT passes only `currentPageId=ABOUT-001` and `sourcePageId=ABOUT-001` to the unique shared Chrome. Page rules remain under About `<main>`.
- Shared Home/Markets regression: 390/768/1440, 6/6 PASS. Product Hub regression: 390/768/1024/1440 plus keyboard interaction, 5/5 PASS.
- Ready locally: `/products`, `/markets` (200).
- Release blockers remain: `/applications`, `/documents`, `/request-documents`, `/request-a-quote`, `/contact` (404). Approved actions remain visible without Contact/other-scope substitution.
- `/about/` remains outside the controlled sitemap. These blockers still prevent publication.

## Verification results

- Focused ABOUT/cache/shared-template Vitest: 11 files, 59 tests PASS (ABOUT subset: 7 files, 16 tests).
- ABOUT Playwright: 390/430/768/1440 plus sitemap, 5/5 PASS.
- Shared Home/Markets Playwright: 6/6 PASS.
- Product Hub shared-Chrome regression: 5/5 PASS.
- WordPress PHP syntax, singleton seed, three evidence states, missing-record and non-atomic runtime tests: PASS.
- Changed-source ESLint: PASS. `npm run typecheck`: PASS.
- Cold `SITE_ID=tio2-my`, local GraphQL build in `.next-about-g9-r3`: PASS; `/about` statically generated with 1-hour revalidation.
