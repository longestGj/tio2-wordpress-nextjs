# WordPress field contract

Read this reference when designing or changing Product fields.

## Field specification

Every proposed Product field appears in a review table with:

| Contract item | Required detail |
|---|---|
| Identity | stable field key and machine name |
| Editor UI | label, help text, group, and ordering |
| Data | type, cardinality, required state, and default |
| Validation | accepted format, limits, and failure behavior |
| GraphQL | exposed name, type, and nullability |
| DTO | normalized property and fallback policy |
| Rendering | consuming component and empty-state behavior |
| Evidence | whether the value is a technical claim requiring a source |

## Repository ownership

- Register fields and GraphQL exposure in the repository-owned WordPress plugin; do not leave production schema only in database/UI configuration.
- Use stable field keys. Renaming a label must not rename stored data accidentally.
- Keep generated GraphQL types deterministic and committed.
- Validate exactly one owning site and deterministic public routing before publication.
- Fail closed on duplicate routes or ambiguous preview lookup.

## Content safety

The agent designs storage and rendering but does not manufacture field values. Technical specifications, performance claims, compliance, certifications, and document metadata remain empty until supported by approved evidence.

HTML-capable fields require an explicit sanitization policy. URLs and files require allowed protocols/types and missing-file behavior. Repeaters require bounded cardinality and deterministic ordering.

## Change policy

Adding an optional field requires a safe empty state. Adding a required field requires a migration/backfill plan. Removing or changing a field requires a compatibility audit across WordPress data, GraphQL, DTOs, templates, preview, webhooks, SEO, seeds, and tests.
