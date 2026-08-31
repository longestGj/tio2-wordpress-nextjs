# MARKET-000 Gate 8 local verification — 2026-08-31

## Boundary

- Page: `MARKET-000` Markets Hub, `/markets/`
- Scope: `site_scope=tio2-my`
- Branch/worktree: `codex/home-001-tio2-my` in `D:\16Wordpress_nextjs\.worktrees\home-001-tio2-my`
- Runtime: local Next.js production build using a read-only mock GraphQL response made from the approved repository JSON contracts.
- This is local Gate 8 development evidence. It is not deployment, publication, Gate 9 PASS, indexing authorization, or Gate 10 authorization.

## Final automated results

| Check | Command | Result |
|---|---|---|
| TypeScript | `npm run typecheck` | PASS |
| ESLint | `npm run lint` | PASS, 0 errors; 2 pre-existing unrelated prototype warnings |
| Contract/unit/integration regression | `npx vitest run tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/infrastructure/tio2-my-market-hub-contract.test.ts tests/unit/markets tests/integration/markets tests/integration/api/revalidate.test.ts tests/unit/homepage/malaysia-dto.test.ts tests/unit/homepage/malaysia-template.test.tsx tests/unit/homepage/metadata.test.ts tests/unit/homepage/jsonld.test.ts` | PASS, 14 files / 90 tests |
| PHP syntax | WordPress PHP 8.3 Docker image, `php -l` on the Market content type, shared content types, plugin bootstrap and seed | PASS, 4 files |
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

## SEO/GEO/Schema

- Title: `Markets for Titanium Dioxide Procurement | TiO2 Malaysia`.
- One canonical only: `https://tio2malaysia.com/markets/`; HTTPS, Malaysia host, `/markets/`, no query/hash, no cross-scope host.
- Route-safe meta description is used while first-level routes remain unavailable.
- Preview/release-control result is `noindex, nofollow`; no hreflang.
- `/markets/` remains absent from the controlled sitemap until release authorization.
- One JSON-LD block with exactly `CollectionPage`, `BreadcrumbList`, and ordered 10-item `ItemList`.

## Scope-isolation evidence

- Route fails with `notFound()` before querying when the active site is not `tio2-my`.
- WordPress resolver accepts exactly one published `tio2_market_hub` record with `site_scope=tio2-my`, exact internal public path and exact approved serialized contract; missing/multiple/foreign/mutated records fail closed.
- Query cache tags are exactly `site:tio2-my`, `route:tio2-my:/markets`, and `content:tio2-my--markets`.
- Revalidation for `/markets/` emits only `tio2-my` route/content/site/sitemap tags.
- Shared Chrome contract contains no TIOVAR, Site A, Site B, PNG, foreign media, foreign form, or foreign route fallback.
- Approved four production SVG assets are byte/hash checked in the site-local namespace.

## Viewport evidence

The requested outer viewports were 1440×1000, 768×1024 and 390×844. Full-page captures exclude the browser scrollbar, producing content widths 1425, 753 and 375 respectively.

| Requested viewport | Capture | Render result | SHA-256 |
|---|---|---|---|
| Desktop 1440 | `market-000-desktop-1440.png` (1425×5268) | PASS: desktop header, 2-column destination, 3-column decision/procurement, Q&A table, footer; no overflow | `663aaf09df3e13e6cb063ffe6c45aa8637c833aee5e5be66e9a863bb56ce3603` |
| Tablet 768 | `market-000-tablet-768.png` (753×7052) | PASS: mobile header plus fixed RFQ, stacked major cards, complete module order/footer; no overflow | `b0d9df265853db545199c7681fd97e06f3749da16775571852209ef67ddd9f94` |
| Mobile 390 | `market-000-mobile-390.png` (375×8148) | PASS: single-column cards, all ten destinations, six answers, RFQ/header/footer; no overflow | `0a2dc952222402e22842dd8559929ccab3331400a96a98855edd39af4a8db8d9` |
| Mobile Menu 390 | `market-000-mobile-menu-390.png` (375×812) | PASS: readable reverse menu, Markets current state and fixed RFQ | `933606250138a7e83d2ac8857643cfd21b9d7f5306901b9cbc41ccfb35be5679` |

## Carry-forwards / release blockers

- `MARKET-G6-B01`: OPEN for release. The hub template, ten anchors, canonical and ItemList are implemented, but all ten authorized target Market child routes intentionally remain 404 because child-page development was out of scope. No substitute URL or fallback was created.
- `MARKET-G6-B02`: OPEN for release. All Global Chrome RFQ anchors are correct and scope-bound, but `/request-a-quote/` currently returns 404; the route/form, validation, privacy and success/error handling remain a separate required implementation.
- `MARKET-G6-B03`: LOCAL IMPLEMENTATION EVIDENCE COMPLETE / PENDING GATE 9 READ-ONLY CLOSURE. Runtime DOM, metadata, Schema, keyboard, focus, responsive and Axe checks pass locally; only the authorized Gate 9 owner may close it.

No deployment, production write, DNS change, indexing action, sitemap release, child-page creation, or publication occurred.
