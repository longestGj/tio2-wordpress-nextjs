# Brazil Portuguese Market Page Gate 8 Implementation Plan

**Goal:** Implement approved `MARKET-BR-PT` from `BR-PT-G6-HANDOFF-02` V0.2 after the completed Brazil English page, with a true `pt-BR` document, isolated CMS data, exact receiver context, and no premature indexing or hreflang.

**Architecture:** Add a dedicated `(pt-br)` root layout for `/pt-br/markets/brazil/` so the response document has `lang="pt-BR"`, while the approved shared TiO2 Malaysia chrome stays English. Add a strict Brazil PT WordPress JSON contract, GraphQL field, DTO, route, metadata/JSON-LD builder, and presentation component. Reuse the completed Brazil EN CSS file only as a source of shared layout primitives; keep PT content, identity, cache, metadata, and actions independent.

**Authority:** `D:/23MySec/pages/markets/brazil/06_handoff/MARKET-BR-PT_GATE6_HANDOFF_PACKAGE_V0.2.md` (SHA-256 `f1be33c0cef8df85b6e8c8d32a62a7c95c2e210d81169061ba7b1fec2ba41b15`).

## Constraints

- Work on `codex/poland-development` and preserve the completed Poland and Brazil EN work.
- Bind every page/data/cache/action surface to `tio2-my`, `MARKET-BR-PT`, `pt-BR`, and `/pt-br/markets/brazil`.
- Preserve the V0.2 buyer copy and Gate 4 V1.1 hierarchy, including the one English-destination notice and English control names marked with `lang="en"`.
- Hero/final RFQ links carry only `source_page_id=MARKET-BR-PT` and editable `destination_country=Brazil`; inline RFQ carries source only. Request Documents carries source only.
- Keep `noindex,nofollow`, omit sitemap publication work, omit all hreflang and `x-default` until reciprocal live-route authorization exists.
- Gate 9, Gate 10, deployment, publication, indexing, and real receiver sends remain outside this implementation.
- Do not begin `PRODUCT-PROC-CL` until this page is technically complete and its receipt is fixed.

## Task 1: Lock the PT content and runtime contract

- [x] Add the approved copy fixture and strict JSON payload.
- [x] Write failing DTO/render tests for identity, module order, exact copy, language spans, action contexts, and prohibited surfaces.
- [x] Implement typed data structures and Zod validation without checked-in fallback.
- [x] Run the focused tests until the contract and renderer boundary are green.

## Task 2: Connect scoped CMS infrastructure

- [x] Write failing query and PHP contract tests.
- [x] Add the WordPress contract validator, local seed, GraphQL field/query, generated types, cache tag, webhook path, and revalidation allowlist.
- [x] Verify wrong scope, path, status, language, and receiver contexts are rejected.

## Task 3: Render the route and machine meaning

- [x] Write failing route, layout, metadata, JSON-LD, trailing-slash, and receiver-link tests.
- [x] Add the `(pt-br)` root layout, page route, metadata builder, component, and approved responsive visual layer.
- [x] Verify the page uses one H1, five ordered modules, `WebPage` plus `BreadcrumbList`, `pt-BR`/`pt_BR`, no alternates, and no unapproved schema or content.

## Task 4: Verify and record the implementation

- [x] Seed the local CMS under a process-local local-environment guard and build a dedicated `tio2-my` artifact.
- [x] Run focused unit, integration, PHP, type, build, and Playwright checks.
- [x] Inspect complete 1440/768/390 screenshots and fix only observed defects.
- [x] Create the D16 development receipt mapping `BR-PT-G9-01...12`, exact versions/evidence, limitations, rollback, and remaining Gate 9/10 boundaries.
- [x] Mark BR-PT technically complete before starting the third page.
