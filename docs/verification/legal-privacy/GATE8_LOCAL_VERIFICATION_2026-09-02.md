# Legal / Privacy / Consent Gate 8 Local Verification — 2026-09-02

Status: `IMPLEMENTED_LOCALLY / READY_FOR_GATE_9_READ_ONLY_REVIEW / NOT_PUBLISHED`

Gate 9 targeted review: `LEGAL-PRIVACY-G9-PCR-01` — P0/P1 corrections implemented locally; this record does not assert the review decision.

## Scope and architecture

- Exact routes: `/privacy-policy/` (`LEGAL-PRIV-EN`), `/ms/privacy-policy/` (`LEGAL-PRIV-MS`) and `/cookie-policy/` (`LEGAL-COOKIE-EN`), all restricted to `site_scope=tio2-my`.
- The three pages consume the one shared `MalaysiaGlobalHeader`, Mobile Menu and `MalaysiaGlobalFooter`; the page passes only its Page ID as current/source context. Footer legal navigation and the one shared Cookie Settings host are configured in `tio2-my-global-chrome.json`.
- Shared-Chrome contract coverage now includes Home, Markets, Products/Product Detail, Resources, Documents, About, RFQ and all Legal pages. Page CSS cannot address shared Header, navigation, Logo, RFQ, menu or Footer selectors. The pre-existing RFQ reduced-motion selector was tightened from `.site *` to `.main *` so it cannot cascade into shared Chrome.
- WordPress uses one private `tio2_legal_page` type with exactly three published `tio2-my` records. Its non-null GraphQL resolver rejects missing, duplicate, invalid-contract, invalid-route and foreign-scope records. There is no cross-scope fallback.
- Legal updates invalidate only `content:tio2-my--legal-pages` and the exact affected route tag. They do not invalidate another scope or infer another Legal route.
- A request-path-controlled, Proxy-sanitised language header now selects the Root Layout document language. The initial HTML is `lang="ms-MY"` only for `/ms/privacy-policy/` and remains `lang="en"` for the English Legal routes and all other TiO2 Malaysia routes. The shared English Header, Mobile Menu and Footer are explicitly marked `lang="en"` inside the BM document.

## Buyer-visible and consent contract

- EN Privacy and BM Privacy each render all 10 approved sections; Cookie Policy renders all 7 approved sections and the one-row browser-storage inventory. Buyer-visible copy is byte-compared against the checked-in approved contract projection.
- Footer utilities are exactly `Privacy Policy`, `Dasar Privasi (BM)`, `Cookie Policy`, `Cookie Settings`; copyright is exactly `© 2026 TiO2 Malaysia.` Mobile Menu remains the existing eight destinations and has no Legal block.
- There is no first-visit banner. Cookie Settings opens a minimal modal containing only the approved title/body, `Close` and `Read Cookie Policy`; the dialog has a stable description ID wired through `aria-describedby`, focus enters the dialog, Tab/Shift+Tab are contained, Escape closes it and focus returns to the trigger.
- The current release state is `no_optional_analytics`. No GA4, GTM, Google Ads or Vercel Analytics request/script is emitted and no `tio2_my_consent_v1` storage record is created. Consent helpers default all four Google states to `denied`; the future model can grant only `analytics_storage`, never advertising states.
- RFQ now links to the implemented `/privacy-policy/` route. No `/terms-of-use/`, `/legal/privacy-policy/` or Contact fallback was created.

## SEO / GEO / Schema

- Each route emits one HTTPS self-canonical on `tio2malaysia.com`, the exact approved title and description, and preview `noindex, nofollow`.
- EN/BM Privacy emit reciprocal `en`, `ms-MY` and `x-default`; Cookie Policy emits no hreflang.
- JSON-LD contains only `WebPage` and `BreadcrumbList`, with approved locale, canonical and visible breadcrumb relationships. No FAQPage, QAPage, Product, Offer, Article, LegalService or TermsOfService node is emitted.
- Sitemap authorization remains false. No Legal route was added to the controlled sitemap.

## Automated verification

- Targeted Gate 9 Vitest (`document-language`, Legal unit/integration/WordPress, shared-Chrome and site-branding contracts) — 10 files / 33 tests PASS, including path-controlled document language, valid-looking cross-path spoof replacement, English shared regions and Cookie-dialog description wiring.
- WordPress `legal-pages.php` runtime — PASS: 3/3 records, exact route set, exact `tio2-my` webhook state and contract-meta relevance.
- WordPress `rfq-page.php` runtime — PASS: exact Malaysia record, GraphQL-error missing behavior and no cross-scope fallback.
- `npm run codegen` — PASS.
- `npm run typecheck` — PASS.
- Changed-file ESLint — PASS with zero warnings/errors. Full-repository `npm run lint` remains polluted by pre-existing generated `.tmp/.next-stale-*` trees that are not part of this change.
- `SITE_ID=tio2-my` preview build against local WordPress GraphQL — PASS. All TiO2 Malaysia App Router page routes are server-rendered on demand because the Root Layout now consumes a trusted per-request document-language header; this preserves the required language in the initial HTML response.
- Legal/Privacy Playwright — 13/13 PASS: raw initial-response and DOM-level `<html lang>` assertions, English Header/Footer language regions, 390/768/1440 matrix, Axe zero violations, Logo pixel evidence, 84/64px Header, Footer non-overlap/font sizes, metadata, JSON-LD, no Analytics, described Cookie Settings keyboard flow, `1440px at 200% zoom-equivalent reflow` using 720 CSS px / 1440 physical px and DPR 2, and 404 checks for both forbidden Legal routes. DPR 2 is not reported as browser zoom.
- Fresh shared Global Chrome navigation regression — 9/9 PASS across Home, Markets and Products at 390/768/1440. The earlier broader shared-Chrome and RFQ results remain baseline evidence; neither surface's behavior was changed by this correction.

## Visual evidence

All standard screenshots are full-page captures with reduced motion. The Cookie Settings evidence is captured from the 390px Cookie Policy route after explicit user activation.

| Evidence | SHA-256 |
|---|---|
| `legal-priv-en-390.png` | `7EF4CEA370BC8CBE8D00975209F8372F141192752FF83189101AB05F33EEE6A8` |
| `legal-priv-en-768.png` | `319AF23898991DDE134B63CC7309C93445BEBD1A93EAA28E81CE355F20F04586` |
| `legal-priv-en-1440.png` | `9BF23744E412E864ABF43D27F8441C550927E4C51A17A2DB2E243BF49CD6EBD4` |
| `legal-priv-ms-390.png` | `925FEA2309C09737BF91EAD3EB3E8AD5B34BB4FE4EAC8AC21CEF97C03BA69F14` |
| `legal-priv-ms-768.png` | `B5A8D0CB651B228BECC28DF226EE3A882B4D733C6E016719C50734380EAF2D83` |
| `legal-priv-ms-1440.png` | `E8203F0156197D8B5D9959E8AD2C31EDE38FAFB41BAA78DB30632AFDC41DBCE2` |
| `legal-cookie-en-390.png` | `A807849F11B83EEE59494BF179CE7F3A82F4306AB4F9570ED5892B86E8FE253B` |
| `legal-cookie-en-768.png` | `80FCD9BA33D0A63F872E7AF4D6F4EF17F4052EE8FE17C376C2BC682CF06D0344` |
| `legal-cookie-en-1440.png` | `B763CA0ABFD96E88507F86BAF9BABC5D95D4149E9C16A2B986718147932D015C` |
| `consent-settings-390.png` | `B703C8771DC9037CFCA52AC68D5788D065B95E12C424E08096252E60050849AD` |
| `cookie-policy-1440-at-200-percent-zoom-equivalent.png` | `6D9EB00644FD73AA1B77144A67316493E534178F6A3E6CDEFB780820B30B52C2` |

## Release blockers

- BM human-equivalence / legal-language approval remains a release blocker.
- Production Web3Forms owner, receiver and receipt verification remain release blockers.
- Production hosting/provider and final Cookie/storage inventory verification remain release blockers.
- Production canonical/robots/sitemap behavior requires separate Gate 10/release authorization.
- Existing downstream route blockers, including request/sample/document flows where separately recorded, are not closed by this Legal implementation.

No deployment, publication, DNS, indexing or production write was performed. This record is not a Gate 9 or Gate 10 decision.
