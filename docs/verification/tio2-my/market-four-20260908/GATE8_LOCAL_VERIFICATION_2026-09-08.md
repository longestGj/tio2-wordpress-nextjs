# TiO2 Malaysia Four Country Markets — Gate 8 Local Verification

Date: 2026-09-08

Dispatch: `G8-MARKET-FOUR-20260908-01`

Branch: `codex/market-four-gate8`

Base commit: `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb`

Worktree: `C:\Users\longe\.codex\worktrees\bfe8\16Wordpress_nextjs`

This is a local Gate 8 implementation and self-verification receipt. It is not a Gate 9 approval, Gate 10 authorization, deployment, publication, DNS change, indexing action, or proof of external receiver delivery.

## Authorized scope and accepted inputs

Only these four English `site_scope=tio2-my` pages were implemented:

| Page ID | Route | Gate 6 package SHA-256 |
|---|---|---|
| `MARKET-EU-ES` | `/markets/spain/` | `5957e5a18ee0df9ed00c4f4a1cb33ee32e1dcbb0af759fa36818aca28d9e70ed` |
| `MARKET-IN-001` | `/markets/india/` | `d28dfd92b16643717a811197f44dac4b008268dac89a5c3db5e9e635d3125cca` |
| `MARKET-EU-NL` | `/markets/netherlands/` | `e34fdadaf693f25812a013625000dfa2efc17623c68bbc54b867b2a8be9ce113` |
| `MARKET-EU-BE` | `/markets/belgium/` | `d63382757c6fc12eb2f1a423371050e32ddd1605f4f59700245633b569e2d55c` |

No country child page, application page, trade resource, process page, form receiver, or alternative Global Chrome implementation was added.

## Implementation baseline and architecture

- Reused the accepted TiO2 Malaysia shared Header, Mobile Menu, Footer, logo, consent, font, RFQ, Documents, proxy, cache-tag and revalidation mechanisms.
- Added one shared `MalaysiaCountryMarketPage` body template. Page routes provide only the approved country contract and page context; page-body CSS is scoped by `data-page-id` and does not target shared Chrome selectors.
- Added one fail-closed WordPress content model and GraphQL field for the four country Market records. The DTO verifies publish status, exact `tio2-my` scope, Page ID, canonical path, schema version and payload parity. Missing, multiple, invalid or cross-scope records fail instead of falling back.
- Added exact per-page metadata and only the approved `WebPage` and `BreadcrumbList` JSON-LD nodes. All four pages emit `noindex, nofollow` and remain omitted from the sitemap.
- Added source-aware RFQ and Documents links. RFQ receives only editable destination country plus `source_page_id`; Documents receives only source/market identity. No external form was submitted during verification.
- Extended the existing scoped revalidation, webhook, cache tag and proxy allowlists for these exact four routes.

## Local CMS readback

The repository seed was run in Plan and Apply modes against the temporary local WordPress instance. Resolver readback returned the following published `tio2-my` records:

| Page ID | Local post ID | Payload SHA-256 |
|---|---:|---|
| `MARKET-EU-ES` | 18517 | `7f0b372b41afcfee784a406d91a16b3681f3ddc2c08dddbd791cdffe1148280d` |
| `MARKET-IN-001` | 18519 | `d66e6d7f99f520b102a1001296b38e9b04923c0424671ec80dd45a7cbae6be69` |
| `MARKET-EU-NL` | 18521 | `1e26f2795de6880c07f72c73285832de72014920311fd65d9b278d375e01fb8d` |
| `MARKET-EU-BE` | 18523 | `be02916d90924e5f3e08c8d0ed5b22c2fde30ca36aab1dcd62fb01bd7d6df29d` |

The existing local RFQ record was also updated through its repository seed so the approved four `source_page_id` values are accepted. The shared Web3Forms access key was loaded into the local process from the user-configured environment without copying it into this worktree or recording its value.

## Automated verification

| Check | Result |
|---|---|
| Targeted Vitest: contracts, template, WordPress model, queries, routes, prefill, proxy, shared Chrome, revalidation | `10` files, `190/190` tests passed |
| Playwright four-page runtime suite | `17/17` tests passed |
| Changed-source ESLint | `33` files, passed with no errors or warnings |
| TypeScript | `next typegen && tsc --noEmit`, passed |
| GraphQL code generation | passed |
| PHP syntax | content model and seed, passed in local PHP container |
| Production build | Next.js `16.3.2`, `43/43` static pages generated, passed |
| Diff hygiene | `git diff --check`, passed |

The Playwright suite verifies initial server-rendered buyer copy and module order, exact action URLs, canonical normalization, `noindex, nofollow`, sitemap omission, the two allowed JSON-LD nodes, shared Chrome current state, menu keyboard behavior, 44px controls, decoded and painted logos, no serious/critical Axe findings, no horizontal overflow, visual variants, and editable scoped RFQ/Documents destinations without an external submission.

## Viewport evidence

Fresh full-page screenshots are in `screenshots/`; their machine-readable results are in `runtime-matrix.json`. Height delta is measured against the approved logical design height and remains below 5% at every required viewport.

| Page | 1440 | 768 | 390 |
|---|---:|---:|---:|
| Spain | 2741 / 2673 (`2.54%`) | 3001 / 2951 (`1.69%`) | 4069 / 3954 (`2.91%`) |
| India | 4559 / 4617 (`1.26%`) | 5280 / 5253 (`0.51%`) | 6843 / 6793 (`0.74%`) |
| Netherlands | 3576 / 3590 (`0.39%`) | 4184 / 4048 (`3.36%`) | 5544 / 5320 (`4.21%`) |
| Belgium | 3730 / 3654 (`2.08%`) | 4200 / 4170 (`0.72%`) | 5565 / 5369 (`3.65%`) |

All 12 viewports reported `scrollWidth === viewport width`, zero serious/critical Axe findings, visible shared Header/Footer logos, the 84px/64px Header contract, visible `CURRENT=0`, one appropriate `aria-current`, desktop 3px underline, mobile 4px marker, and permanent shared RFQ access. Four additional 390px menu-open screenshots record the shared menu state.

## Current open dependencies and release blockers

- These approved destinations currently return local 404 and therefore remain route/release dependencies: `/applications/titanium-dioxide-for-coatings/`, `/applications/titanium-dioxide-for-plastics/`, `/applications/titanium-dioxide-for-masterbatch/`, `/resources/eu-titanium-dioxide-anti-dumping-duty/`, and `/resources/india-titanium-dioxide-anti-dumping-duty/`. Their exact approved links remain crawlable; no fallback or unauthorized child page was created.
- RFQ and Request Documents local pages are reachable and their context is correct, but local UI/provider behavior does not prove production-equivalent positive receipt, mailbox delivery, operational ownership, privacy controls, or failure/retry evidence. Existing receiver/release blockers remain open.
- Netherlands VVVF source reachability/freshness remains owned by its content/source owner and requires current Gate 9/10 evidence.
- Native devices, non-Chromium engines, assistive technology, native 200% zoom, forced colors, production host/configuration, final legal review, release permission and indexing permission were not authorized or proven here.
- Spain `ES-G4-OBS01` remains a shared Chrome owner observation; this page does not fork the shared component to close it.

## Change groups

- Four route entries under `app/(en)/markets/`.
- Shared country Market template and responsive page-body stylesheet under `components/sites/tio2-my/markets/`.
- Country contracts, route loader, metadata, GraphQL query/types/DTO and generated bindings under `lib/`.
- Four exact CMS payloads, WordPress model/schema registration, webhook integration and local seed under `wordpress/`.
- Scoped proxy, cache/revalidation, RFQ/Documents source mapping and their tests.
- Contract, integration, infrastructure and E2E tests plus this local evidence set.

## Rollback

Rollback is the single Gate 8 implementation commit produced from the base commit above, plus deletion of the four local WordPress records if local CMS cleanup is required. No production or remote state was changed.
