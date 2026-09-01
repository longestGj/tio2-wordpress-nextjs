# CONV-RFQ Gate 8 local verification — 2026-09-01

## Disposition

`LOCAL_IMPLEMENTATION_COMPLETE_WITH_RELEASE_BLOCKERS / NOT_DEPLOYED`

This record covers local development evidence for `CONV-RFQ` at `/request-a-quote/` with `site_scope=tio2-my`. It is not a Gate 9 decision, Gate 10 authorization, deployment, publication, DNS change or indexing authorization.

Authority used: `CONV-RFQ_GATE7_MANIFEST_V1.1.md` (SHA-256 `6C3D8A31EBE609C9E2ECDBADCA76E47FE0819AE223DFB289AA4AB6DF207A6173`) and `CONV-RFQ_GATE7_PROJECT_CONTROL_REVIEW_SUBMISSION_V1.1.md` (SHA-256 `6EBB73E77513CD42C64AA34BACF52E9A9F0BEBEEAEA84D2FBE95225EE5D02D5C`), with the exact V1.0 field/state contracts carried forward by V1.1. The later administrative candidate was not used.

## Implementation summary

- Added one non-public WordPress RFQ singleton and one non-null GraphQL root field. Missing, multiple, wrong-scope, wrong-route or modified records fail closed; there is no cross-scope lookup or fallback.
- Added the Next.js `/request-a-quote/` route, scoped DTO/query/cache tags, exact approved content/options/errors/prefill rules, environment-aware metadata and WebPage + BreadcrumbList JSON-LD.
- Reused the sole shared `MalaysiaGlobalHeader`, Mobile Menu and `MalaysiaGlobalFooter`; the RFQ page passes only `CONV-RFQ` source/current context and does not copy or override shared Chrome styles.
- Added the exact three form groups and 12-field inventory (11 controls plus fixed `MT`), visible/editable allowlisted prefill, validation summary/focus links, value retention, duplicate prevention, retry, unavailable and receipt-confirmed states.
- Added a browser-direct Web3Forms adapter. The permitted payload is limited to approved visible values plus `site_scope=tio2-my`, `page_id=CONV-RFQ`, `workflow_type=rfq`, `locale=en`, fixed `quantity_unit=MT`, approved source attribution and an implementation request token. HTTP status alone never confirms success; confirmation requires HTTP 200, JSON and `success === true`.
- Added consent-gated local analytics events consuming the shared `window.__TIO2_SHARED_CONSENT__` signal. Events contain only fixed event/page/scope identity; form values and field errors are excluded. Remarketing, Turnstile and reCAPTCHA remain absent.
- Kept `/request-sample/` and `/request-documents/` as exact visible links without creating those pages or falling back to Contact.
- Darkened only page-owned teal/muted text tokens enough to pass WCAG AA on the approved pale background. Shared Header/Footer colors and layout were not changed.

## Local test evidence

The local WordPress container mounted this worktree's plugin. All external submission calls in E2E were intercepted; no real RFQ was sent.

| Check | Result |
|---|---|
| RFQ WordPress seed | PASS — `pageId=CONV-RFQ`, `siteScope=tio2-my`, `publicPath=/request-a-quote` |
| RFQ WordPress contract test | PASS — missing record is GraphQL error; `crossScopeFallback=false` |
| PHP syntax | PASS |
| Targeted Vitest + shared Chrome/template regression | PASS — 13 files, 66 tests |
| Changed-scope ESLint | PASS — 0 errors, 0 warnings |
| TypeScript | PASS — `tsc --noEmit` |
| Fresh Next production build | PASS — Next 16.3.2, 14/14 static pages generated; `/request-a-quote` emitted as dynamic scoped route |
| RFQ + shared-navigation Playwright | PASS — 19 tests |

The unfiltered repository-wide `npm run lint` also scanned pre-existing generated `.tmp/.next-*` bundles and reported generated-code errors. The source-scoped ESLint command covering every changed TS/TSX file passed; the final source lint rerun excludes generated output only.

## Browser and responsive evidence

Production-mode local screenshots were generated without the Next development indicator:

| Viewport | File | SHA-256 | Result |
|---|---|---|---|
| Desktop 1440 | `conv-rfq-desktop-1440.png` | `DBDF2A71BABEAAB8630A8C3FCDC18743BD8E23A80875C037484D9FA443BE5945` | PASS |
| Tablet 768 | `conv-rfq-tablet-768.png` | `846FF461F0F3925ECD6B0766B8A4839B03D9B45C85E9CF3FE7AA89672A2E9C37` | PASS |
| Mobile 390 | `conv-rfq-mobile-390.png` | `6842602B917472A9DDE81FFE4CC0A8288459D0795166C251A67561159B79C00F` | PASS |

Manual original-detail inspection confirmed visible production SVG logos, complete form/module order, readable fields, single-column 768/390 flow, Desktop two-column field rows, intact sibling links, unchanged Footer, no collisions and no blank bands. Automated checks also passed at 320, 375, 430, 1024 and 1280px with no horizontal overflow and at least 44px for form controls/actions.

Shared Chrome regression passed for Home, Markets and Products at 390/768/1440: 64/84px inner Header, production SVG dimensions/nonblank pixels, visible `CURRENT=0`, exact Desktop 3px marker, Mobile 4px marker/left alignment, one current item per applicable navigation surface, fixed RFQ, Escape/focus return and no overflow. CONV-RFQ correctly has no nav current item because RFQ is the terminal CTA rather than a primary-nav item.

## SEO, GEO and Schema

- One self-canonical: `https://tio2malaysia.com/request-a-quote/`; query/prefill does not create canonical variants.
- Exact Title/Meta/H1 unit assertions pass.
- Local/preview output is `noindex, nofollow`; the route remains absent from the controlled sitemap. Indexing remains unauthorized.
- No hreflang.
- One JSON-LD script with exactly `WebPage` and `BreadcrumbList`; no Product, Offer, ContactPage, FAQPage or QAPage; no buyer/form values.

## Form, privacy and data-flow evidence

- First-load neutral state, all exact required-field errors, Unicode limits, email/URL checks, `aria-invalid`/`aria-describedby`, focusable summary and linked errors are covered.
- Invalid/stale query values are discarded. Broad market/region values never fill destination country. Approved values remain visible/editable. Source attribution is limited to the currently approved `PRODUCT-000`; regex-shaped but unregistered page IDs are discarded. The M-2377 + Specialty Materials inference is explicitly blocked.
- A mocked HTTP 200 JSON `{success:false}` produced `submission_unconfirmed`, retained values and offered exact retry. Only mocked HTTP 200 JSON `{success:true}` produced the receipt-confirmed state.
- The local evidence receiver key is non-production and all submission network calls were intercepted. No verified production endpoint/key, accountable human-review delivery or retention evidence exists yet.
- No approved Privacy Policy route was supplied. Production-mode evidence intentionally ran without `TIO2_MY_PRIVACY_POLICY_HREF`; the exact visible `Privacy Policy` label remains but is not emitted as a fabricated link. A clean, same-site, non-Contact path is accepted only when an external owner supplies it. This blocks Gate 9/release.
- No shared consent platform was present in this repository. Analytics remains silent unless the exact same-scope shared consent signal grants analytics.

## Carry-forward blockers

| ID | Local development status | Release status |
|---|---|---|
| RFQ-G7-B01 | Scoped route/config implemented and locally verified | Gate 9 still required |
| RFQ-G7-B02 | Receiver adapter implemented; no production key or accountable human-review/delivery evidence | OPEN / BLOCKS RELEASE |
| RFQ-G7-B03 | Actual Web3Forms plan, DPA, subprocessors, integrations, security, retention and transfer facts not supplied | OPEN / BLOCKS RELEASE |
| RFQ-G7-B04 | Explicit positive acknowledgement behavior implemented and mocked | Production-equivalent receipt/delivery evidence still required |
| RFQ-G7-B05/B06 | No approved Privacy route/body/controller/contact/retention/processors/transfers/rights disclosure | OPEN / BLOCKS RELEASE |
| RFQ-G7-B07 | No shared CMP, Cookie Settings or storage inventory implementation in scope | OPEN / BLOCKS RELEASE |
| RFQ-G7-B08 | Local events are consent-gated and value-free; no production GA4/GTM/consent network evidence | OPEN / BLOCKS RELEASE |
| RFQ-G7-B09 | No remarketing, Turnstile or reCAPTCHA in config/DOM/network | CONTROLLED / LOCAL PASS |
| RFQ-G7-B10 | Exact `/request-sample/` link rendered; destination remains unavailable | OPEN / BLOCKS RELEASE |
| RFQ-G7-B11 | Exact `/request-documents/` link rendered; destination remains unavailable | OPEN / BLOCKS RELEASE |
| RFQ-G7-B12 | Canonical/robots/sitemap behavior implemented; indexing remains disabled | Gate 10/indexing authorization absent |
| RFQ-G7-B13 | Shared Header/Menu/Footer/Logo consumed without a fork | Shared legal/CMP readiness remains external |

## Stop point

No deployment, publication, DNS change, production write, real form submission or indexing operation was performed. This implementation must not be described as published, Gate 9 PASS or release-ready while the blockers above remain open.
