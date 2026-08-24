# Site Template quality gates

Read this reference before Implement work or Audit.

## Approval and TDD gate

Implement requires all four fields: proposal ID, exact proposal artifact/path, verbatim user approval quote, and accepted scope/decisions. Design and Audit are read-only; Audit requires proposal ID plus exact proposal artifact/path. For each behavior change, capture focused RED evidence before production edits, confirm it fails for missing behavior, implement the minimum approved behavior, and record GREEN evidence.

## Contract gates

- Verify every template profile is versioned, site-owned, and selects only its registered shell and runtime.
- Verify the public-route inventory is versioned, exact-path, site-owned, and is the only anonymous-public authority.
- Verify the shared anonymous-route guard rejects out-of-inventory routes before formal content queries and emits a real 404 without business metadata or JSON-LD.
- Verify Sitemap and robots policy derive from the inventory and omit retired, foreign, draft, duplicate, or unapproved paths.
- Verify freeze manifests prevent active-template changes from silently changing frozen output.
- Verify cross-template guards preserve Homepage-owned query/DTO/components/SEO and Product-owned CPT behavior.

## Migration and local gate

- Verify retirement snapshot validation, zero deletes, idempotence, safe restore, and ownership isolation.
- Verify seed and public-URL audit use the approved inventory, and the complete local gate consumes that audit.
- Run the focused tests and the repository's complete local suite before completion.
- Obtain an independent read-only Audit against the approved proposal after Implement.

## External actions

Every handoff reports `external actions: none`. The specialist never pushes, deploys, changes DNS, enables indexing, writes remotely, or performs production operations.
