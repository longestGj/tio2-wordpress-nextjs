# MARKET-000 Gate 8 local verification — 2026-08-31

> Revision response: `MARKET-000-G9-ROQA-01 = CONDITIONAL_RETURN / NOT_APPROVED`.
> The original Footer PASS statement and original viewport captures are superseded by the targeted re-verification below. This document does not assert Gate 9 approval.

## Boundary

- Page: `MARKET-000` Markets Hub, `/markets/`
- Scope: `site_scope=tio2-my`
- Branch/worktree: `codex/home-001-tio2-my` in `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`
- Runtime: local Next.js production build using a read-only mock GraphQL response made from the approved repository JSON contracts.
- Review response: P0-01, P1-01 and P1-02 revised locally; pending the same Review ID's read-only re-review.
- This is local Gate 8 development evidence. It is not deployment, publication, Gate 9 PASS, indexing authorization, or Gate 10 authorization.

## Final automated results

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| ESLint | `npm run lint` | PASS, 0 errors; 2 pre-existing unrelated prototype warnings |
| Contract/unit/integration regression | `npx vitest run tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/infrastructure/tio2-my-market-hub-contract.test.ts tests/unit/markets tests/integration/markets tests/integration/api/revalidate.test.ts tests/unit/homepage/malaysia-dto.test.ts tests/unit/homepage/malaysia-template.test.tsx tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts` | PASS, 14 files / 93 tests |
| PHP syntax | WordPress PHP 8.3 Docker image, `php -l` on the Market content type, shared content types, plugin bootstrap and seed | PASS, 4 files |
| CMS resolver failure harness | PHP 8.3 execution of `tests/infrastructure/php/market-hub-resolver-errors.php` | PASS: missing, multiple and invalid records each throw `GraphQL\Error\UserError` |
| Next production build | `SITE_ID=tio2-my`, isolated GraphQL source, `NEXT_DIST_DIR=.next-tio2-my`, `VERCEL_ENV=preview`, `npm run build` | PASS; `/markets` prerendered with 1h revalidation |
| Browser/E2E/Axe | `npx playwright test tests/e2e/market-hub.spec.ts --reporter=line` | PASS, 3/3 at 390, 768 and 1440; no serious/critical Axe violations |

## Runtime contract results

- Exactly one H1: `Choose Your Destination Market`.
- Module order: Breadcrumb → Hero → Destination Market → How to Choose → Next Procurement Check → Current Information → Buyer Questions → Global Footer.
- Ten ordered EN Market actions are normal `<a href>` anchors with the approved Page IDs and planned URLs.
- Six Buyer Question answers are present in the initial server-rendered DOM.
- No page-body RFQ, PT-BR, specific Trade routes/content, Product row relationship, `FAQPage`, `QAPage`, `Product`, or `Offer` output.
- Global Header, Mobile Header, Mobile Menu and Footer retain RFQ to `/request-a-quote/` with `data-site-scope=tio2-my` and `data-source-page=MARKET-000`.
- Mobile Menu opens with focus on the first link, contains forward/backward Tab focus, closes on Escape, and returns focus to Menu.
- All visible links/buttons measure at least 44×44 CSS px; reduced-motion styles are active; no horizontal overflow at the tested widths.

## `MARKET-000-G9-ROQA-01` targeted revision

- P0-01: the Market typography, body, link and focus rules are now rooted at the `<main class="marketMain">` boundary. Shared Header/Footer remain inside the site wrapper but outside that boundary, so Market `h2`, paragraph and anchor rules cannot override the approved Global Chrome contract.
- P1-01: E2E now asserts the exact Footer headings `Explore | Information | Conversion`, computed size at all three viewports, pairwise non-intersection of their runtime bounding boxes, and visibility of Footer Logo, RFQ and copyright. Fresh screenshots and hashes replace the original Footer evidence.
- P1-02: the CMS failure policy is explicitly **server error / release blocker**, not 404. The GraphQL field remains `String!`; its PHP resolver now returns `string` or throws `GraphQL\Error\UserError` for missing, multiple, invalid-scope/contract or missing-payload records. The TS query returns `Promise<MalaysiaMarketHubDto>` and the unreachable `if (!marketHub) notFound()` branch was removed. Query and route tests prove the error propagates once with no fallback; only a non-Malaysia active site uses `notFound()` before querying.

## SEO/GEO/Schema

- Title: `Markets for Titanium Dioxide Procurement | TiO2 Malaysia`.
- One canonical only: `https://tio2malaysia.com/markets/`; HTTPS, Malaysia host, `/markets/`, no query/hash, no cross-scope host.
- Route-safe meta description is used while first-level routes remain unavailable.
- Preview/release-control result is `noindex, nofollow`; no hreflang.
- `/markets/` remains absent from the controlled sitemap until release authorization.
- One JSON-LD block with exactly `CollectionPage`, `BreadcrumbList`, and ordered 10-item `ItemList`.

## Scope-isolation evidence

- Route fails with `notFound()` before querying when the active site is not `tio2-my`.
- WordPress resolver accepts exactly one published `tio2_market_hub` record with `site_scope=tio2-my`, exact internal public path and exact approved serialized contract; missing/multiple/foreign/mutated records throw an explicit GraphQL error and never fall back.
- Query cache tags are exactly `site:tio2-my`, `route:tio2-my:/markets`, and `content:tio2-my--markets`.
- Revalidation for `/markets/` emits only `tio2-my` route/content/site/sitemap tags.
- Shared Chrome contract contains no TIOVAR, Site A, Site B, PNG, foreign media, foreign form, or foreign route fallback.
- Approved four production SVG assets are byte/hash checked in the site-local namespace.

## Viewport evidence

The requested outer viewports were 1440×1000, 768×1024 and 390×844. Full-page captures exclude the browser scrollbar, producing content widths 1425, 753 and 375 respectively.

| Requested viewport | Capture | Render result | SHA-256 |
|---|---|---|---|
| Desktop 1440 | `market-000-g9-roqa-01-desktop-1440.png` (1425×5225) | LOCAL CHECK PASS: Footer H2 all 12px; Explore `514.67–580.42`, Information `817.28–914.25`, Conversion `1119.89–1212.58`; no bbox overlap; Logo/RFQ/copyright visible; no overflow | `96803630475240bfe7ec668ac025c67e3214caa1e06a10c6f9a20de509478280` |
| Tablet 768 | `market-000-g9-roqa-01-tablet-768.png` (753×6994) | LOCAL CHECK PASS: Footer H2 all 12px; Explore and Information occupy separate first-row columns, Conversion a later row; no bbox overlap; Logo/RFQ/copyright visible; no overflow | `901205a348a854de5ca5dc22709ae041494d9108a5d81373cf24ef0b7b8f6dd0` |
| Mobile 390 | `market-000-g9-roqa-01-mobile-390.png` (375×8100) | LOCAL CHECK PASS: Footer H2 all 14px; two-column Explore/Information plus later Conversion; no bbox overlap; Logo/RFQ/copyright visible; no overflow | `14977e0a5a8a7acc140ad11fc1c5db65ee6be492c7fb57ea5f98e420fcfbc0ef` |

## Carry-forwards / release blockers

- `MARKET-G6-B01`: OPEN for release. The hub template, ten anchors, canonical and ItemList are implemented, but all ten authorized target Market child routes intentionally remain 404 because child-page development was out of scope. No substitute URL or fallback was created.
- `MARKET-G6-B02`: OPEN for release. All Global Chrome RFQ anchors are correct and scope-bound, but `/request-a-quote/` currently returns 404; the route/form, validation, privacy and success/error handling remain a separate required implementation.
- `MARKET-G6-B03`: CONDITIONAL RETURN REMEDIATED LOCALLY / PENDING `MARKET-000-G9-ROQA-01` READ-ONLY RE-REVIEW / NOT APPROVED. Runtime DOM, metadata, Schema, keyboard, focus, responsive, Footer geometry and Axe checks pass locally; only the authorized Gate 9 owner may close it.

No deployment, production write, DNS change, indexing action, sitemap release, child-page creation, or publication occurred.
