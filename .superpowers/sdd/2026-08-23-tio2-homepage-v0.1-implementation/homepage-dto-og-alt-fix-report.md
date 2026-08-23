# Homepage DTO OG-alt targeted fix report

## Record

- Mode: `tio2_home_template` / Implement
- Proposal ID: `homepage-v0.1`
- Approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: complete approved specification and implementation plan, Direction C, local only, owned/partner production boundary
- Targeted scope: GraphQL homepage OG media alt mapping in the DTO adapter only
- External actions: none

## Decision and implementation

- Kept the existing GraphQL operation, schema, generated types, metadata renderer, frontend, WordPress, Product, and global files unchanged.
- Replaced the nonexistent `homepageFields.ogImageAlt` input with the actual generated GraphQL shape `homepageFields.ogImage.node.altText`.
- Reused the existing bounded plain-text image validation and added required-alt behavior only when an OG image exists. A missing optional OG image still maps to `null`; an existing image with missing, empty, overlong, or HTML alt text fails closed at `seo.ogImage.alt`.
- Hero, product, and application image-alt behavior is unchanged.

Unresolved decisions: none.

## Strict TDD evidence

### RED

Command:

`npx vitest run tests/unit/homepage/dto.test.ts`

Result: 3 failed, 26 passed.

- A real GraphQL-shaped fixture with `ogImage.node.altText = ' Site-owned titanium dioxide facility '` produced DTO `alt: ''` instead of the trimmed media-item alt.
- `altText: null` did not fail closed.
- HTML `altText` did not fail closed.

### GREEN

- Focused DTO suite: `npx vitest run tests/unit/homepage/dto.test.ts` — 1 file, 29 tests passed.
- Related homepage suites: `npx vitest run tests/unit/homepage tests/integration/homepage` — 12 files, 86 tests passed.
- `npm run typecheck` — passed.
- `npm run lint` — passed.

## Operation/type verification

- Read-only inspection confirmed `lib/wordpress/homepage-queries.graphql` already selects `altText` in `HomepageMediaItemFields`, and `ogImage.node` spreads that fragment.
- Read-only inspection confirmed generated `HomepageMediaItemFieldsFragment.altText` and `HomepageFieldsFragment.homepageFields.ogImage.node.altText` are both `string | null`.
- No operation, schema, or generated file change was needed.

## Files and interfaces affected

- `lib/wordpress/homepage-dto.ts`
- `tests/unit/homepage/dto.test.ts`

The public `HomepageDto` interface is unchanged; only `seo.ogImage.alt` now receives its already-queried media-item value and enforces the required existing-image boundary.

## Migration impact and self-review

- No data migration is required.
- Existing records without an OG image continue using the safe site fallback.
- Existing records with an OG image must provide valid plain-text media-library alt text or the DTO read fails closed.
- Confirmed no GraphQL operation/schema, metadata/frontend, WordPress, Product, global-shell, sitemap, generated, or remote change.

Concerns: none.

External actions: none
