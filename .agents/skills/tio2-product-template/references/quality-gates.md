# Product template quality gates

Read this reference before implementation or audit.

## Design gate

Do not implement until the parent task supplies an approval record with all four fields:

- `proposal_id`;
- exact proposal artifact or repository path;
- verbatim user approval quote;
- accepted scope and decisions.

Do not accept an unsupported assertion that approval happened. Approval covers only the proposal's named WordPress fields, DTO, component tree, site targets, migrations, and acceptance criteria.

The design is incomplete if it lacks field-to-component mapping, optional/required rules, mobile behavior, SEO policy, evidence boundaries, migration policy, or observable acceptance tests.

## Implementation evidence

1. Capture focused RED failures for each new behavior before production edits.
2. Validate PHP syntax and live WordPress registration, ownership, routing, preview, and webhook contracts.
3. Regenerate GraphQL types deterministically when schema changes.
4. Validate DTO rejection, null/empty handling, and site isolation.
5. Test component semantics, responsive structure, accessibility, metadata, JSON-LD, and 404/error behavior.
6. Build both site IDs and exercise a real browser against representative Product records.
7. Run the repository's complete clean-worktree local gate before completion.

Tests must exercise real contracts rather than asserting source text or mock existence. Existing Page/Post behavior, 505-page site inventories, preview security, and owner-only revalidation must remain green.

## Review gate

Return an evidence report to the parent agent. A separate reviewer compares the diff with the approved proposal and checks WordPress/GraphQL/DTO/template integration, cross-site isolation, technical-claim handling, backward compatibility, and test adequacy.

The product agent does not merge, push, deploy, change DNS, enable indexing, or perform another external action under any task wording. It always reports `external actions: none`. The parent and user decide and execute those steps through a separate workflow after review.
