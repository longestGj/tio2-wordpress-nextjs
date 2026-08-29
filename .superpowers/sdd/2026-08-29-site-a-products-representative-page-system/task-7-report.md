# Task 7 Report — Coatings Family collection and neutral filters

## Status

Implemented the approved v0.5 Coatings Family representative collection for Site A. The page uses the existing Products shell and shared primitives; no WordPress PHP, route inventory, Homepage, Site B, deployment, DNS, indexing, or migration work was performed.

## RED → GREEN

- RED: `npm test -- tests/unit/components/product-family.test.tsx` failed because `product-family` did not exist.
- Contract RED: the Family schema, DTO, and WordPress query tests failed because Family presentation data and queried comparison-introduction mapping were absent.
- GREEN: the Family component suite passes all 11 tests, including exact section and grade order, filters, distinctions, href gates, hero image behavior, client boundary, and mobile table containment.
- Related Hub, schema, DTO, WordPress query/preview, collection contract, and fixture-runtime regression selection passes.

## DTO extension

- Added a strict `ProductFamilyPresentation` DTO and input schema for v0.5 visible labels, Hero actions, filter copy, comparison headings/note, application context, resource card context, enquiry fields, FAQ label, disclaimer label, and footer description.
- Added the frozen v0.5 presentation data to the approved representative fixture.
- The WordPress adapter maps the already queried `comparisonIntroduction` into `presentation.comparison.intro`.
- Presentation values without WordPress subfields use the frozen v0.5 adapter fallback.
- Hero action hrefs continue to be derived in DTO normalization; product, application, and resource hrefs remain resolver-gated.

## Neutrality, table invariance, and mobile containment

- The only Client Component is `FamilyProductFilter`.
- All nine candidate nodes are rendered in canonical source order and filtering changes only their `hidden` state.
- Search, chip, combined, reset, result count, neutral empty state, and `aria-pressed` behavior are covered.
- The complete nine-row comparison table is rendered by the server Family component and never filtered, reordered, scored, or recommended.
- All nine distinctions are asserted against their matching Product IDs.
- The comparison region is labelled, keyboard-focusable, and owns the only Family horizontal `overflow-x: auto`; the shared page shell clips document overflow.
- TDS remains request-only; no download or PDF destination was introduced.

## Verification

- Task and related regression tests: 94 passed, 1 existing environment-dependent skip.
- TypeScript: passed.
- Directed ESLint: passed.
- React checklist: passed; derived filter state stays in render with no effect/memo/async client component or inline component.
- `git diff --check`: passed (line-ending notices only).

## Commit and concerns

- Commit: `feat(products): build approved Coatings collection` (this task commit).
- Concerns: none. The intentionally negative v0.5 sentence that grade numbers do not represent a performance ranking remains visible; no positive ranking, best-grade, equivalence, or recommendation claim is emitted.
