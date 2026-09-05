# DOC-REACH Gate 8 local verification — 2026-09-05

## Scope and status

- Page: `DOC-REACH`
- Route: `/documents/reach/`
- Site scope: `tio2-my`
- Branch: `codex/home-001-tio2-my`
- Baseline before this change: `d1b15e253b1202d2e4639646845c7ca8155104a8`
- Result: Gate 8 implementation and local verification complete; returned for independent Gate 9 read-only acceptance.
- This record does **not** claim deployment, production publication, Gate 9 PASS or Gate 10 authorization.

The checked-in source payload is byte-identical to the approved Gate 7 payload. SHA-256:
`F9D2A1F14BE61EEEB585454FFC139D9AC5051B1515950F39748E8F0E1CF0B339`.

## REACH-G8 work-package evidence

| Work package | Implementation and evidence |
| --- | --- |
| WP01 — contract lock | Approved payload is checked in verbatim; DTO validates exact serialized payload, page identity, route, publish state, one `tio2-my` scope, modified time and the exact readiness-key set. Contract/unit tests reject modified copy and prohibited raw governance output. |
| WP02 — WordPress model | Private singleton on the existing document content type, exact-scope validation, non-null GraphQL resolver, local seed script, generated GraphQL type and scoped cache/revalidation wiring. Missing, multiple, invalid or cross-scope records fail closed. No production write was performed. |
| WP03 — route and render model | Server route `/documents/reach/` loads only the Malaysia resolver. The public render model exposes only approved render fields and filters route-governed items; it does not expose `render_when`, package internals or readiness governance. Eleven modules render in the approved order. |
| WP04 — copy and source boundary | Exact H1, approved general answer, jurisdiction distinctions, four-source ledger and dates are sourced from the locked payload. Tests deny the excluded stronger company/Grade/importer/Only Representative/supply-arrangement proposition and query-only text in rendered HTML. |
| WP05 — CONV-DOC handoff | All three actions use the exact approved href. The receiver displays `REACH Documentation` while retaining `other` only as the internal transport value. `additional_requirements` is visible and editable; Grade remains required by the receiver before submit. Public `source_page` query values cannot establish DOC-REACH attribution; only exact same-origin referrer/trusted context can. |
| WP06 — route readiness | `CONV-DOC`, `DOC-000` and `MARKET-EU-001` are evaluated independently against unique `tio2-my` records, expected Page ID/path/Canonical, publish state and `LIVE_APPROVED`; CONV-DOC also requires receiver readiness and a form key. Request actions/panel/Schema relation, Hub actions and EU Market relation are omitted atomically when their own target is not ready. No Contact, email, telephone or cross-scope fallback exists. |
| WP07 — shared Chrome | Page consumes the single Malaysia Global Header/Mobile Menu/Footer and locked configuration. It passes only `currentPageId="DOC-000"` and `sourcePageId="DOC-REACH"`. Desktop/Mobile Documents current state, visible `CURRENT=0`, logo decoding/render dimensions, 4px mobile marker, Escape focus return, global RFQ and Footer are covered by E2E. Page CSS is CSS-module scoped and does not target shared Chrome selectors. |
| WP08 — responsive/visual | Production-equivalent E2E passed at 1440, 1280, 1024, 768, 640, 430, 390, 375 and 320 CSS px. No horizontal overflow; primary actions are at least 44px. Fresh full-page evidence exists for 1440, 768 and 390. |
| WP09 — accessibility | Axe reports zero violations at 1440, 768 and 390. Semantic headings, breadcrumb, native `<details>/<summary>` FAQ behavior, initial server-rendered answers, menu keyboard/Escape return, reduced-motion run, 44px actions and 200% reflow are covered. |
| WP10 — SEO/GEO/Schema/social | Exact Title/description, one clean HTTPS self-Canonical, non-production `noindex, nofollow`, query-invariant metadata and no page-local image. JSON-LD contains only `WebPage` and `BreadcrumbList`; readiness-filtered `relatedLink` values are same-site HTTPS URLs. Prohibited Schema types are absent. No sitemap entry was added. |
| WP11 — regression/evidence | Focused Vitest, TypeScript, ESLint, PHP syntax, optimized Malaysia build and production-equivalent Playwright all pass. Screenshot and approved-input hashes are recorded below. |

## Verification commands and results

### Focused unit, integration and infrastructure tests

```text
npm test -- --run tests/unit/documents tests/integration/documents tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts tests/unit/request-documents tests/integration/api/revalidate.test.ts tests/unit/wordpress/cache-tags.test.ts
```

Result: **26 test files passed; 238 tests passed**.

### Static checks

```text
npm run typecheck
npm run lint
```

Result: both exited 0; ESLint reported no errors or warnings.

### PHP syntax

The installed `php:8.3-cli` image was used read-only against the worktree:

```text
php -l wordpress/plugins/tio2-site-model/includes/document-reach-v01.php
php -l wordpress/plugins/tio2-site-model/includes/document-tds-v01.php
php -l wordpress/plugins/tio2-site-model/includes/webhooks.php
php -l wordpress/plugins/tio2-site-model/tio2-site-model.php
php -l wordpress/seed/apply-tio2-my-document-reach.php
```

Result: **no syntax errors in all five files**.

### Optimized Malaysia build

```text
SITE_ID=tio2-my
WORDPRESS_GRAPHQL_URL=http://127.0.0.1:4013/graphql
NEXT_DIST_DIR=.next-doc-reach-g8
npm run build
```

Result: exit 0 with Next.js 16.3.2; compiled, typechecked and generated 37/37 pages. `/documents/reach` is listed as a dynamic server-rendered route. The GraphQL endpoint was a controlled local fixture containing the approved payload and explicit route-readiness states.

### Production-equivalent Chromium E2E

```text
npx playwright test --config=playwright.document-reach.config.ts
```

Result: **12/12 passed in 18.3s**. The test starts `next start` from `.next-doc-reach-g8`; it does not use `next dev`.

Coverage includes nine widths, exact module order and H1, payload/design hashes, raw-output denylist, shared Chrome/current state/logo, menu Escape return, 44px actions, no horizontal overflow, Canonical/robots, two-node Schema, Footer, Axe, exact request transport, four HTTPS official sources, initial FAQ DOM and keyboard behavior, and 200% reflow.

## Visual evidence

| Viewport | Evidence | SHA-256 |
| --- | --- | --- |
| 1440 | `doc-reach-1440.png` | `422DEED4ECCE005E87AB7176400861858216E626EAE7A00FCB1B10D07ED90A11` |
| 768 | `doc-reach-768.png` | `72A2511BEF184D1F069A86EF9E6F6E71DCE2A2398A32EC03DD197936D9710EF5` |
| 390 | `doc-reach-390.png` | `F209C40D38BBBE70FF446959EC67FFC5677723EB7204FB81BC2515FE1C444F21` |

All three were recaptured from the final production-equivalent build on 2026-09-05. Manual review confirmed visible Header/Footer logos and controls, complete module order, distinct EU/EEA/GB/NI sections, readable source rows and request panels, and no observed collision, clipping or horizontal overflow.

Approved Gate 5 comparison assets were hash-checked by E2E:

- Desktop 1440: `64C913C196593B8B3062717CB19C451B1A9909B34885DF1F08625CC607A7800E`
- Tablet 768: `B639EE293D58ED5EC20EF8CFF190D30D145349B93D1D93C1CFDC5923C9BFB421`
- Mobile 390: `AB9FC630610356C61D4A76B042322B1A060A72B1D209C1E833805F9A65196086`

## Official-source freshness check

Checked on 2026-09-05 against the four approved official URLs:

- European Commission REACH framework page remained available and consistent with the approved framework boundary.
- Your Europe REACH FAQ remained available and retained its visible `Last checked 01/10/2025` date.
- HSE UK REACH page remained available and retained `Updated 2025-09-02`.
- HSE Northern Ireland page remained available and retained `Updated 2025-09-03`.

The page correctly shows `Source updated` only for the two HSE sources and `Site reviewed: 2026-09-05` for all four sources. Source availability and dates must be checked again immediately before publication.

## Site-scope and fail-closed result

- CMS query, DTO, cache tag, revalidation path, webhook, seed and route are restricted to `tio2-my`.
- The exact approved CMS record is required; no TIOVAR, Site A/B or other-scope content, SEO, media, menu, route or form fallback is present.
- Route readiness is evaluated from scoped WordPress records rather than guessed from URL existence.
- Missing/invalid DOC-REACH content is a resolver error/release blocker. Missing dependent routes suppress only their approved action/relation; no replacement destination is emitted.
- Raw contract governance fields and excluded claim text are absent from public HTML.

## Open release controls / blockers

These are not implementation regressions and must remain open until the appropriate later-stage evidence exists:

1. Independent Gate 9 read-only acceptance has not yet been performed and is not pre-approved by this report.
2. No production CMS seed/write was performed. Gate 9/10 must verify the real `DOC-REACH`, `CONV-DOC`, `DOC-000` and `MARKET-EU-001` records, route Canonicals, release states and site scopes.
3. CONV-DOC production key placement, approved recipient/privacy flow, real submission/readback and mailbox receipt remain release controls. This local E2E intentionally did not submit to an external provider.
4. Official-source freshness requires another check immediately before publication.
5. Deployment, production Canonical/robots/indexing activation, DNS, public release and Gate 10 remain unauthorized.

## Change boundary

The implementation adds DOC-REACH content/model/query/route/render/SEO/Schema, scoped WordPress seed/resolver/webhook/cache integration, receiver-prefill semantic support, focused tests, production-equivalent E2E configuration and local evidence. It does not create or alter production records, deploy, publish, modify DNS, open indexing or add a sitemap entry.
