# Germany and Italy exact-source intake

Date: 2026-09-08. Scope: `tio2-my`, `MARKET-EU-DE` and `MARKET-EU-IT`, local Gate 8 candidate only. Baseline: `84db14e`, branch `codex/de-it-su-r706-chemours-gate8`. This is a bounded source and implementation-interface audit; it is not implementation completion or Gate 9 acceptance.

## Authority and exact inputs

Read in full: both exact Gate 6 packages, both B and C files, current V0.11 Manifests and the inherited DE V0.9 / IT V0.10 and V0.9 chains. Historical draft/not-authorized statements in immutable packages are superseded for lifecycle only by the V0.11 closures and `D:/23MySec/docs/architecture/GATE8_DE_IT_SU_R706_CHEMOURS_AUTHORIZATION_AND_DISPATCH_V1.0.md`. Payload authority is unchanged. Root AGENTS, site registry and delivery workflow were read.

Exact source paths, current computed SHA-256, bytes and extraction/receiver contracts are in [de-it-intake.json](de-it-intake.json). Every B, C, complete visual, DE CSS, effective freeze and effective evidence-index hash checked matches its bound Manifest/package identity. Italy's effective freeze and index are V0.2 under `gate4-v0.2`; its unchanged HTML and 56 inherited images remain under `gate4-v0.1`.

Read both complete visual page bodies and relevant CSS. Opened the actual DE and IT 1440 complete-page PNGs using the image viewer: the observed compositions support the different layouts described below. This does not claim independent image-pixel checks, mobile image readback or actual implementation verification. No external source freshness was rechecked; source checked dates remain the approved September 7 text.

## Exact rendering requirements

Each page has one H1, seven ordered modules, complete buyer prose, a five-item destination checklist, three RFQ occurrences, and a four-step breadcrumb Home → Markets → European Union → country. Physical routes remain `/markets/germany/` and `/markets/italy/`; language is `en`. Both B files have 19 links, including breadcrumb links. Preserve all links unless an exact C-owned atomic conditional omission is recorded. Never flatten, trim, clamp, paraphrase or truncate approved copy to fit the existing template.

Germany: DE-01 hero; DE-02 industry intro and equal Coatings, Plastics, Masterbatch cards; DE-03 evaluation; DE-04 three Documents/Sample paragraphs; DE-05 destination prose and separate checklist; DE-06 EU-owner prose; DE-07 closing RFQ followed by after-submit limitation and three linked references. The Hamburg paragraph remains infrastructure context only. No Germany COO statement is permitted. Preserve bold source dates, inline `Not sure / Need help` styling, full qualifications and the final checked-date line.

Italy: IT-01 hero; IT-02 three cards (Wood and Industrial Coatings / Compound and Masterbatch / Packaging Printing), containing four application actions; IT-03 evaluation with unknown-Grade side panel; IT-04 COO statement and limitation in the same opening paragraph, followed by all three Documents/Sample paragraphs; IT-05 exact receiver field guidance, checklist and unknown-details paragraph; IT-06 EU-owner prose plus limitation panel; IT-07 closing RFQ, after-submit limitation exactly once, and two linked/qualified references. Preserve inline field names, `Not sure / Need help`, source titles, publication-date-not-shown wording and checked date.

The source-bound `main` HTML plus page-only scoped CSS is suitable for the parent's existing editorial CMS contract extension. Preserve structural semantic elements and order, storing the complete approved content in WordPress/API, not rendering from a local D23 path or competing frontend fallback. Exclude prototype Header/Footer/dialog/scripts and replace those with current shared owners. Prototype navigation simulation scripts are not production behavior. Include only explicit body CTA context adapters. Scope any `body`, `:root`, `html`, `*`, `main`, heading, `strong`, `code` and link CSS to the page wrapper; do not let prototype style affect shared Chrome or other consumers.

Germany has a deep-navy hero with breadcrumb inside, desktop shell 1200px, white/soft-gray module alternation, three equal cards at 1440 but one column at ≤1100, destination columns only at desktop, and a dark conversion panel. Its standalone `visual-direction.css` overrides the inline style and must be applied afterwards. Body is 17px/1.7, mobile 16px/1.7; H1 58/46/37 and H2 38/34/29 at desktop/≤1100/≤560. The external visual layer uses section IDs `de-03`, `de-04`, `de-06`.

Italy has a light hero with decorative CSS rings, teal rule, desktop copy/action columns, content shell 1160px, 3/2/1 context-card columns at 1440/768/390 (last card spans at tablet), side panels on evaluation and EU-owner sections, a two-column desktop destination list, and a dark conversion panel with CSS rings. H1 is 56/46/36, H2 38/34/29; module prose 17px/1.7 and mobile 16px/1.66. These CSS shapes are approved decoration; no business/social image or empty frame is approved.

Both approved pages use Inter, sourced in each prototype through `dependencies/Inter-Variable.ttf` with weight range 100–900. Bind production font through the existing site-owned mechanism; do not retain prototype local URLs or silently inherit Arial. Targets must be ≥44×44 CSS px, reference links wrap, focus remains visible/unclipped, and reduced motion applies. Full-page heights are evidence results, not fixed CSS targets. DE additionally requires actual 200% reflow evidence; Italy explicitly does not inherit native 200% zoom/device/other-engine/AT verification.

## Actions, Grade neutrality and readiness

There are no named Grade links, cards, recommendations or country-to-Grade relationships on either page. Products is a neutral `/products/` exit. Unknown Grade guidance remains `Not sure / Need help` on the RFQ receiver; Documents still requires one buyer-selected Grade and selected document types. Do not fill missing route readiness with an invented Grade or suitability statement.

DE applications: APP-COAT `/applications/titanium-dioxide-for-coatings/`, APP-PLAS `/applications/titanium-dioxide-for-plastics/`, APP-MB `/applications/titanium-dioxide-for-masterbatch/`. IT adds APP-INK `/applications/titanium-dioxide-for-printing-inks/`. An eligible target needs the correct scoped owner/content, not just HTTP 200. C permits atomic omission of an ineligible CTA without empty card, dangling punctuation, disabled link, status label or substitute owner; required complete-site paths remain open acceptance/release dependencies.

For both countries the EU Trade sentence must be omitted atomically when the approved scoped route/content or official-source freshness is ineligible. Its current handed-off/development-in-progress state is not completion or freshness evidence. Keep EU Overview and the country's second limitation paragraph intact; omit only the complete Trade sentence, including its leading `Use the` and trailing qualification. Visible and machine output must agree.

Recommended serialization, within existing owner contracts:

| Page-body target | Germany | Italy |
|---|---|---|
| RFQ, all 3 occurrences | `?source_page_id=MARKET-EU-DE&destination_country=Germany` | `?source_page_id=MARKET-EU-IT&destination_country=Italy` |
| Request Documents | `?source_page_id=MARKET-EU-DE` | `?source_page_id=MARKET-EU-IT` |
| Sample | `?source_page_id=MARKET-EU-DE` minimal source-only context | `?source_page_id=MARKET-EU-IT` source-only required |

Do not infer Grade/Application/quantity/port/city/packaging/timing/document need. RFQ country remains visible/editable, separate from company Country/Region, and buyer changes must survive reentry. Italy's optional Destination Port / City and Additional Requirements guidance does not authorize invented values. Documents company country/Grade/types remain neutral; adjacent COO text cannot auto-select an origin document. Italy Sample destination, Grade and Application stay neutral until buyer entry. Shared Header/Footer RFQ remains the shared contract, without country prefill. Positive receiver acknowledgment, provider acceptance, mailbox arrival and business approval are separate states.

## SEO and shared owners

Required page JSON-LD types for each: `WebPage` and `BreadcrumbList` only, with `en`, exact country URL and visible four-level breadcrumb. Shared WebSite/Organization references are permitted only when their real scoped owner defines the IDs. Do not reuse editorial Article type, generic article dates or a guessed publisher. No page-local Organization, LocalBusiness, Product/ProductGroup, Offer, FAQ/QAPage, Grade fit, stock, route or trade-result schema. No social image, invented date, German/Italian alternate or query canonical. Exact titles and descriptions are stored in the JSON audit; query context does not enter head/schema/sitemap. Local preview remains noindex; production indexing is outside authorization.

Shared Header: 84px desktop / 64px compact; compact Logo | RFQ | Menu; Markets current, zero buyer-visible CURRENT, one exposed active navigation surface. Shared Footer: approved reverse SVG, Privacy EN, Privacy BM, Cookie Policy, functional Cookie Settings, ©2026 and no Terms. Menu/dialog require real keyboard, focus-cycle, Escape, focus-return and inactive-nav isolation evidence. Consent remains no optional analytics unless current owner authority changes it. No DE/IT-specific shared-component fork.

## Existing implementation interfaces and gaps

- `lib/markets/malaysia-country-market-contracts.ts` currently registers ES/IN/NL/BE only. Its plain runs/list strings cannot retain inline strong/code and linked source lists. Existing renderer always groups actions after prose, places breadcrumb outside hero, and cannot represent the exact approved DE/IT compositions without additions. Parent's scoped editorial-body path avoids changing those four consumers.
- Current country WordPress JSON meta, resolver and DTO enforce identity/publish/scope/exact payload, supporting CMS-managed content semantics, but are not DE/IT registrations. No runtime/CMS state was tested in this audit.
- `wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json` approved source IDs omit DE and IT. `lib/request-documents/malaysia-request-documents-prefill.ts` source IDs also omit both, although its distinct market-ID list includes them. Add exact source IDs through owner-controlled integration and test source-only behavior; adding market IDs alone cannot fix attribution.
- Sample already allowlists DE/IT source IDs. `resolveMalaysiaSamplePrefill` can currently accept `market_id`→destination and arbitrary destination/document context for market sources; Italy's exact invalid/empty context AC warrants source-only hardening or equivalent receiver-owner-safe enforcement rather than relying on a clean href alone. Preserve other approved consumers.
- RFQ currently permits generic URL grade/application fields independent of source; test that DE/IT links supply only authorized fields and malformed/expired source context cannot create a hidden required value or business fact.
- Country SEO currently emits correct WebPage/BreadcrumbList shape, but its WebSite/Organization IDs need actual shared-owner verification. Editorial reuse must not inherit Article metadata.

## Stable acceptance and open dependencies

Use original IDs unchanged, not a new parallel numbering system. Germany `DE-G9-AC01`–`AC14`: identity; exact B content; semantic facts; responsive/reflow; keyboard; owner links; RFQ; DOC/Sample; conditional Trade; SEO; indexing protection; shared Chrome/consent; seven-surface isolation; immutable receipt. Dependencies `DE-G6-D01`–`D08`: CMS/runtime; RFQ; DOC; Sample; Products/applications; EU/Trade; facts/shared owners; device/accessibility.

Italy `MARKET-EU-IT-G9-AC01`–`AC12`: B/19 links; visual; routes; RFQ context; DOC neutrality; Sample source-only and recovery; true receipt; SEO; Chrome/consent; seven-surface isolation; facts/readiness; immutable receipt. Dependencies `MARKET-EU-IT-G6-D01`–`D07`: CMS/runtime; routes; RFQ; DOC; Sample; shared Chrome; freshness/device/release.

Seven surfaces remain query, route, cache, menu, SEO, form and media, including wrong/missing scope, same-slug collision, cold/warm/invalidation and reverse cross-site evidence. This source audit closes none of the live operational dependencies. Parent must bind the eventual per-AC evidence to code/content revision, real build/port/environment, receiver mode, exact CMS readback and worktree state, and separate untested device/AT/real receipt and release conditions.

## Scoped implementation returned to parent

The follow-up implementation assignment produced `scripts/editorial/build-de-it-payloads.mjs`, two `tio2-my-editorial-market-eu-de/it.json` configs, two scoped `market-eu-de/it.css` stylesheets, and explicit Germany/Italy route files. Shared types, registry, CMS resolver, metadata, receiver configuration, seed and Chrome remain owned by the parent task. No commit or CMS write was performed by this subtask.

The builder checks the exact package, B, C, visual and DE override CSS hashes before extraction. It compares the entire normalized main text against B and again after context transformation, verifies seven modules and nineteen body links, and rejects scripts/forms/images/iframes in main. The resulting source provenance includes original main and adapted body hashes plus generated CSS hash. CSS uses PostCSS selector parsing, isolates every page rule under the exact editorial-page attribute, maps body styles to main, excludes prototype shared Chrome/font declarations, and consumes the shared Inter CSS variable. Germany's approved separate visual stylesheet is appended after its base source rules.

Runtime conditional removal is explicitly delegated to the parent. The EU Trade sentence is wrapped in `data-conditional-target="/resources/eu-titanium-dioxide-anti-dumping-duty/"`; removing that span removes the entire sentence while preserving EU Overview and limitations. Each approved application CTA paragraph has its exact application path marker, enabling action-only omission while preserving the substantive card and its qualified buyer prompt. These are allowed C omissions; no omission is applied to the generated baseline and no target is declared ready by the builder. Products and conversion paths remain required buyer paths, with their actual receiver/readiness evidence open.

Validation on 2026-09-08: the targeted test was first observed failing because the DE contract was absent, then passed after generation (1 test / 2 pages); it verifies link counts, exact source/destination arguments, source-only DOC/Sample arguments, whole Trade sentence removal, final limitation singularity and linked source-list structure. `node scripts/editorial/build-de-it-payloads.mjs --check` passed, confirming deterministic current-source output. `git diff --check` passed. Local Next.js page/CSS guides were read before code. Runtime page appearance and shared integrations still require the parent's actual build/CMS/browser verification.
