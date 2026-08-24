# Publication and migration contract

Read this reference before Design, Implement, or Audit work involving public routes, publishing, retirement, restore, seed, Sitemap, robots, or local verification.

## Publication contract

The versioned public-route inventory is the sole anonymous-public authority. Every inventory entry binds an exact site-owned path to a registered template profile and expected record/schema state. Shared anonymous-route guards check that inventory before formal WordPress content queries and return a real 404 for absent routes.

Sitemap and robots policy derive from that same inventory. Retired, draft, foreign, duplicate, or otherwise unapproved paths do not enter anonymous pages, metadata, JSON-LD, canonical URLs, or Sitemap output.

## Retirement and restore

Retirement is reversible and never deletes a retained record. Before mutation, export and validate a versioned preflight snapshot with identity, type, prior status, site scope, path, slug, modified time, and safe restoration data. Unknown, duplicate, missing, or ambiguously owned records fail closed before mutation.

Restore changes only the approved route/status selection. It must not overwrite legitimate later editorial changes to copy, images, or other content values. Batch local cache invalidation must be bounded, idempotent, and site-owned.

## Freeze contract

A frozen template profile records its template key, expected schema/DTO version, query/adapter, renderer, metadata builder, state, approving proposal ID, and freeze manifest. Content values may remain editable only inside the frozen schema. Changes to frozen visible structure, style, schema, responsive behavior, metadata mapping, or selected runtime require explicit compatibility/unfreeze approval.

## External actions

All implementation and verification remain local. `external actions: none` prohibits remote CMS writes, deployment, DNS, indexing, production migration, and production cache operations.
