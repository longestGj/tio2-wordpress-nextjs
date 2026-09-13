# Task 1 report — independent legal runtime contract and DTO

Date: 2026-09-13 (Asia/Shanghai)
Branch: `codex/cms-read-approval-decoupling`
Starting HEAD: `f2a30031da09979fb88725ce082b98bdff32df83`
Develop merge-base: `7c849af234602cf299cb75e772a0104f77b849cd`

## Result

- Added a version-1 technical read contract for the three `tio2-my` legal routes. Its root uses `routes`, not `pages`, so broad approved-content fixture discovery does not classify technical registry entries as page payloads. This is a schema/content distinction only; approval and write-comparator semantics did not change.
- Added explicit `MalaysiaLegalPageContent` types and `validateMalaysiaLegalReadPage(value, publicPath)`. The legal DTO keeps its public signature and now validates/projects actual published CMS content without importing or comparing bundled approved prose.
- Required page identity, site scope, publish status, record uniqueness, routes, locale, canonical, breadcrumb destinations, content fields, real dates, text limits, and Markdown safety remain fail-closed. Optional `releaseState`, `sourceFile`, `sourceSha256`, and unknown CMS properties are not projected.
- Markdown now permits changed H1/H2 text and section count while requiring one nonempty H1, one visible supported update line, at least one nonempty H2, unique nonempty generated section IDs, safe registered links, and recognized action labels. It rejects raw HTML, controls, images, and unsupported link/action destinations.
- Bundled approval content remains test input and seed-history evidence only. Shared `matchesInstalledContent`, PHP `tio2_my_content_matches`, content-release paths, queries, caching, routing, indexing, and global analytics authorization were not changed.

## Shared interfaces

- Technical config: `tio2-my-legal-read-contract.json` has `version`, `siteScope`, `origin`, `pageType`, `headerCurrentKey`, `maximumTextCodePoints`, `routes[]`, and `markdown`. Each route contains `pageId`, `routeKey`, `path`, `locale`, and ordered `breadcrumbHrefs`; Markdown declares exact link destinations and `{label, action}` bindings.
- Cross-language cases: `read-contract-cases.json` has `{version, cases[]}`. Each case has `name`, `mutations`, `expected`, and `expectedOutputText` when accepted. Mutations use `target: source|contract|collection`, `operation: set|delete|repeat|copy`, array `path`, and the applicable record/value/count or source/destination indexes.
- Remaining compatibility coupling: action labels still select component behavior. Removing label/action coupling requires a separate structured-action migration.

## TDD evidence

- Initial RED: `npx vitest run tests/unit/legal/legal-pages-read-contract.test.ts` — 1 failed/1; expected `records[0].contract` failure at `matchesInstalledContent`, with no import/environment error.
- Minimal GREEN: same command — 1 passed/1 after the independent projection boundary.
- Safety RED: same command — 19 failed/27, all expected missing identity/content/Markdown validations; existing scope/status/cardinality cases already rejected.
- Safety GREEN: same command — 27 passed/27. Self-review added a plain-text newline-control case: RED 1 failed/28, then GREEN 28 passed/28.
- Final legal regression: `npx vitest run tests/unit/legal tests/integration/legal` — 6 files, 57 tests passed.
- Shared TypeScript write/fixture regression: `npx vitest run tests/unit/wordpress-content-release-all-pages.test.ts tests/infrastructure/tio2-my-legal-pages-wordpress.test.ts` — 2 files, 114 tests passed.
- Shared PHP comparator regression (read-only/network-none Docker mount): `content-release-validation.php` — `PASS 57 page policies, 1692 text paths; editorial and Sample actual validators`.
- Type validation: `npm run typecheck` — Next route types generated and `tsc --noEmit` passed.

## Boundaries and follow-up

- This is Task 1 only. Task 2 must consume the same config and vectors in the PHP read validator/resolver while retaining existing write validators unchanged.
- Build-time CMS queries remain intact. No CMS/DB writes, remote calls, deployments, production operations, or `main`/`develop` merges were performed.

## Review fix round 1

Review base: `067c0145828620abf7ce7ac6b46d78a34cee0964`.

- Link grammar: validation previously skipped link labels/destinations containing a newline while the component tokenizer accepted them. Shared cases and rendered tests now cover both bypass forms. Validation rejects leftover multiline link openers, and the component tokenizer uses the same single-line label/destination grammar.
- Action/content preservation: the supported template layout is now explicit. An action line is allowed only as the final nonempty hero line, with at most one identical duplicate as the final nonempty document line. Section actions without hero actions, differing final actions, and prose after an action are rejected. This retains current label-to-action compatibility while preventing ignored actions or silently discarded prose; arbitrary action placement was never a renderable capability.
- Focused ownership expanded only to `components/sites/tio2-my/legal/malaysia-legal-page.tsx` and its existing legal component test because validator/renderer grammar must agree at the actual rendering boundary. No general Markdown renderer rewrite was made.

Fix-round TDD and verification:

- Initial focused RED: `npx vitest run tests/unit/legal/legal-pages-read-contract.test.ts tests/unit/legal/legal-pages-contract.test.tsx` exposed the two multiline-link renders and action truncation/difference acceptance. After replacing one unrelated exact action-count assertion with content-presence assertions, the valid RED was 7 failed / 38 passed across 45 tests.
- Focused GREEN: the same command — 2 files, 45 tests passed.
- Full legal regression: `npx vitest run tests/unit/legal tests/integration/legal` — 6 files, 66 tests passed.
- Shared TypeScript write/fixture regression — 2 files, 114 tests passed.
- Shared PHP comparator regression in read-only, network-none Docker — `PASS 57 page policies, 1692 text paths; editorial and Sample actual validators`.
- First `npm run typecheck` found only unsupported regex flag `s` (`TS1501`); the flag was unnecessary for the newline-spanning character class. After removal, `npm run typecheck` passed, and focused tests remained 45/45.
