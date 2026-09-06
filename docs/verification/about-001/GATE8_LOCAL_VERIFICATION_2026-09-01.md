# ABOUT-001 Gate 8 Local Verification (Superseded)

Superseded by `GATE9_CONDITIONAL_RETURN_RESUBMISSION_2026-09-01.md`. This historical record is not the evidence for Review ID `ABOUT-001-G9-PCR-01`.

Status: `READY_FOR_GATE9_READ_ONLY_SUBMISSION`. This local record does not authorize deployment, publication, indexing, Gate 9 PASS or Gate 10.

The page consumes the single shared `MalaysiaGlobalHeader` / Mobile Menu / `MalaysiaGlobalFooter` implementation and passes only `currentPageId=ABOUT-001` and `sourcePageId=ABOUT-001`. Page CSS is scoped beneath `<main>` and does not style shared Chrome descendants.

## Architecture and isolation

- WordPress uses one private `tio2_about_page` singleton whose public projection is a non-null `String!` GraphQL field. The record must have `site_scope=tio2-my`, internal slug `tio2-my-about`, public path `/about`, published status and the byte-exact approved immutable contract.
- The DTO rejects missing, modified, invalid-status and cross-scope records. The query has only `site:tio2-my`, `route:tio2-my:/about` and `content:tio2-my--about` cache tags. No Site A, Site B or TIOVAR fallback exists.
- The page consumes the shared Malaysia Global Chrome and sends only `currentPageId=ABOUT-001` and `sourcePageId=ABOUT-001`.
- Page styles are rooted beneath the About `<main>`; Footer headings and columns retain the shared 12px desktop/tablet and 14px 390px contract.
- Indexing and sitemap authorization remain false. Staging output is `noindex, nofollow`; `/about/` is absent from the controlled sitemap.

## Media implementation register

All twelve approved Asset keys are implemented with the authorized `HTML_CSS_SVG_REBUILD` method under `components/sites/tio2-my/about/malaysia-about-page.tsx` and its CSS module. No Site A/other-scope media, remote request, flattened full-page PNG or rasterized UI text is used.

| Asset key | Output | Geometry | Accessible treatment | OG / Schema |
|---|---|---|---|---|
| `about.hero.composite` | CSS powder and rutile bag composition | responsive 500px desktop visual / 300px mobile | decorative | omitted |
| `about.hero.route_map` | inline SVG | `viewBox="0 0 540 240"` | `aria-hidden` | omitted |
| `about.markets.map` | inline SVG | `viewBox="0 0 760 300"` | `aria-hidden` | omitted |
| `about.markets.flag.eu` | scoped CSS flag | 56×34 | decorative | omitted |
| `about.markets.flag.uk` | scoped CSS flag | 56×34 | decorative | omitted |
| `about.markets.flag.india` | scoped CSS flag | 56×34 | decorative | omitted |
| `about.markets.flag.brazil` | scoped CSS flag | 56×34 | decorative | omitted |
| `about.applications.coatings` | CSS illustration | 185px desktop / 230px mobile | `White coating being applied with a brush.` | omitted |
| `about.applications.plastics` | CSS illustration | 185px desktop / 230px mobile | `White plastic pipes.` | omitted |
| `about.applications.printing_inks` | CSS illustration | 185px desktop / 230px mobile | `Open containers of coloured printing ink.` | omitted |
| `about.applications.paper` | CSS illustration | 185px desktop / 230px mobile | `A stack of white paper.` | omitted |
| `about.final_cta.background` | scoped CSS gradient geometry | responsive section background | decorative | omitted |

## Runtime and visual evidence

| Viewport | Result | Screenshot SHA-256 |
|---|---|---|
| 390×844 | PASS: all 11 modules, shared 64px header, 4px mobile marker, left-aligned menu, no visible CURRENT, no horizontal overflow, no Axe violations | `C3DC871C21D1FFED6FA9C56528A5521021193DBEE19646ECC2810432D3C239A3` |
| 768×1000 | PASS: approved tablet order, shared 64px header/menu, all modules, no overflow/collision | `1F6118631ACED756152A229BB1C9C145240C432057F68117EC85A4113146699B` |
| 1024×1000 | PASS: full tablet/desktop transition, 84px header, desktop current underline 3px, no overflow/collision | `6A31D3727F099C684011F9818CF539AE1A686DE7CDACC2F254042E3606266D3B` |
| 1440×1000 | PASS: approved dense white-page visual hierarchy, 84px header, 3px current underline, Footer columns do not overlap | `6D9064591FA542E2D96B2D2155FE6836E66342F79ED5AA43C33B612120C3CC54` |

All four images were regenerated after the V0.3 visual comparison and manually inspected. The prior dark-section draft screenshots are superseded and not evidence.

## SEO / GEO / Schema

- One HTTPS canonical: `https://tio2malaysia.com/about/`; no query, hash, cross-scope canonical or hreflang.
- Exact approved Title, Meta description and OG title/description; OG image omitted.
- One JSON-LD graph with `AboutPage`, `Organization`, `Brand`, `Place`, four `AdministrativeArea` nodes and `BreadcrumbList`.
- Relationships retained: AboutPage `mainEntity` Organization; AboutPage `about` Organization + Brand; Organization `brand`, `location` and four `areaServed` references; AboutPage `isPartOf` the stable WebSite ID.
- Organization uses `name`, never `legalName`; no Organization address (the `PostalAddress` belongs to Place); no Product, Offer, Review, AggregateRating, FAQPage, QAPage or `manufacturer` field.

## Local route dependencies / release blockers

Local readiness check on 2026-09-01:

- Ready: `/products/` and `/markets/` return 200.
- Not ready (404): `/applications/`, `/documents/`, `/request-documents/`, `/request-a-quote/`, `/contact/`.
- Required actions remain visible at their approved URLs. They are not replaced with Contact or another scope. Market child actions and Application child actions use the approved Hub fallbacks, with no guessed child URLs.
- These 404 dependencies remain release blockers and continue to prevent publication. They do not invalidate the completed local ABOUT-001 implementation.

## Verification commands

- Related Vitest suite, including ABOUT unit/integration, revalidation and shared Home/Markets/Products Chrome templates — 12 files, 76 tests PASS.
- `npx playwright test tests/e2e/about-page.spec.ts tests/e2e/tio2-my-global-navigation.spec.ts tests/e2e/product-hub.spec.ts` — 16 tests PASS: About 390/768/1024/1440 + sitemap, Home/Markets shared Chrome, Products shared Chrome/Hub and keyboard interaction.
- WordPress `apply-tio2-my-about-page.php` — local singleton seed PASS.
- WordPress `tests/about-page.php` — approved record, missing-record GraphQL error and restoration PASS.
- `npm run typecheck` — PASS.
- source-only full ESLint (generated `.next*` and `.tmp` excluded) — 0 errors, 2 unrelated pre-existing warnings in `docs/prototypes/site-a-resources/build-visual-prototype.mjs`. Raw `npm run lint` is polluted by pre-existing ignored `.tmp/.next-stale-*` generated bundles.
- `SITE_ID=tio2-my`, local GraphQL, cold `npm run build` in `.next-about-final` — production build PASS with `/about` statically generated and revalidated hourly. A prior warm `.next-tio2-my` build correctly failed closed on its stale pre-revision contract instead of serving mismatched CMS content.
