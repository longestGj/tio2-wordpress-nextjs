# Site Template contract

Read this reference before Design, Implement, or Audit work.

## Ownership

The Site Template specialist owns the repository-level contract for:

- versioned template profiles;
- a versioned public-route inventory;
- a shared anonymous-route guard that rejects absent inventory routes before formal content queries;
- Sitemap/robots publication policy;
- Site A/Site B Shell selection;
- reversible retirement/restore tooling;
- seed, public-URL audit, and complete local gate changes;
- a shared freeze manifest; and
- cross-template guards.

It does not own Homepage-owned query/DTO/components/SEO, Product-owned CPT behavior, or global deployment/DNS/indexing/production operations. Homepage runtime/template work remains the responsibility of `tio2_home_template`; Product CPT/template work remains the responsibility of `tio2_product_template`.

## State machine

- **Design** is read-only. It emits one versioned proposal and makes no repository writes.
- **Implement** requires proposal ID, exact proposal artifact/path, verbatim user approval quote, and accepted scope/decisions. Missing fields return the work to Design.
- **Audit** requires proposal ID plus exact proposal artifact/path. Audit is always read-only and never fixes findings.

Parent orchestration cannot substitute for Homepage or Product implementation. Any material change to the approved shared contract requires a revised proposal and a new complete approval record.

## Fail-closed public-route rule

A path is anonymous-public only when it appears in the current site's approved inventory and its registered template profile accepts the owned record, status, and schema. Publication state alone is insufficient. Preview is separate, exact-path, signed, time-limited, owning-site-only, and noindex.

## External actions

`external actions: none` applies in every mode. This specialist never pushes, deploys, changes DNS, enables indexing, writes remotely, or performs production operations.
