# Final WordPress / Homepage DTO Contract Fix Report

## Mode

Implement.

## Proposal ID and approval record

- Proposal ID: `homepage-v0.1`
- Exact approved artifact: `docs/superpowers/specs/2026-08-23-tio2-homepage-v0.1-design.md`
- Verbatim approval: `同意第6端，并确认为完整提案`
- Accepted scope: the three Important final-audit fixes limited to WordPress homepage identity/field enforcement, WordPress homepage/preview executable tests, and the Homepage GraphQL-to-DTO boundary.
- Explicit exclusions preserved: no RFQ React/E2E changes, verify-script changes, Product/global/SEO metadata/Task 9 changes, deployment, remote writes, or production operations.

## Decisions made

### A. Homepage identity reconciliation

- Separated site identity reconciliation from the complete publish/preview field contract.
- Every normal `site_scope` set/removal hook now reconciles `tio2_homepage` records in draft, trash, and publish-like states.
- A valid identity has exactly one supported scope, the deterministic `${siteId}--homepage` slug, and one owner per site across reserved statuses.
- Invalid/missing/multiple/unsupported scopes release the reserved slug and scope identity without deleting content.
- Duplicate resolution is deterministic by ascending post ID. Later/stale records lose the scope and reserved slug, preserve title/content, retain draft/trash state when already non-public, and record `tio2_homepage_duplicate`. Publish-like duplicates are returned to draft.
- A previously released duplicate cannot be published without first acquiring a valid unique identity.
- The historical stale-duplicate executable fixture now uses a direct `term_relationships` database insert, explicitly representing lower-level data pollution. Normal `wp_set_object_terms()` / `wp_remove_object_terms()` tests require immediate reconciliation instead of permitting duplicate identity.
- The signed root preview executable test now proves a direct duplicate draft mutation leaves one Site A preview owner and preserves the incomplete later draft.

### B. Optional OG image alt

- The DTO accepts a present supported OG media item when GraphQL `altText` is `""` or `null`, normalizing both to `alt: ""`.
- Existing URL, MIME, positive dimensions, 160-character alt bound, and plain-text/HTML rejection remain unchanged.
- This matches the approved optional WordPress `og_image` contract and its current attachment-alt behavior. No metadata/frontend code changed.

### C. Conservative local-only RFQ copy semantics

- WordPress final validation and the TypeScript DTO now enforce the same closed, field-specific homepage-v0.1 editorial allowlist. The lexical claim parser, reset words, negation state, and coordinated-list helpers were removed instead of expanding synonym dictionaries.
- Values are trimmed by the existing plain-text contract, then compared as complete strings after collapsing whitespace and lowercasing. Punctuation and sentence boundaries remain exact.
- The allowlists contain only the current approved Site A/Site B seed copy, the WordPress executable fixture copy, the DTO mock copy, and the three explicitly approved generic body statements. A sentence approved for one field is not accepted in another field.
- `rfq_success_heading` accepts only the four current neutral headings: `Local review complete`, `Local check complete`, `Site B local check complete`, and `Local validation complete`.
- Prefixes, suffixes, second sentences, double negation, and free synonyms are rejected. This includes `Inquiry accepted`, delivered/queued/recorded headings, and otherwise-approved statements followed by `Inquiry accepted and logged.`
- WordPress still owns and edits these four values, but homepage-v0.1 intentionally restricts behavior copy to this reviewed editorial set.
- All four fields remain required, bounded, trimmed plain text; HTML remains unsupported.
- Exact Site A, Site B, WordPress fixture, DTO mock, generic, and case/whitespace-normalized variants are covered as accepted input in mirrored WordPress/DTO tests.

## Files and interfaces affected

- `wordpress/plugins/tio2-site-model/includes/fields.php`
  - Adds internal identity-only reconciliation/release helpers.
  - Routes homepage term mutations through identity reconciliation before publish-like full enforcement.
  - Adds the WordPress RFQ behavior validator at the existing final contract boundary.
- `wordpress/tests/homepage.php`
  - Adds direct draft/trash set/remove and duplicate-identity behavior coverage.
  - Converts the stale duplicate fixture to explicit raw-database pollution.
  - Adds approved Site A/B and misleading/incomplete RFQ copy cases.
- `wordpress/tests/preview.php`
  - Adds the direct duplicate-draft root preview owner regression.
- `lib/wordpress/homepage-dto.ts`
  - Makes OG media alt optional and normalized.
  - Adds the DTO-side RFQ behavior validator.
- `tests/unit/homepage/dto.test.ts`
  - Adds real GraphQL-shaped empty/null OG alt coverage, HTML rejection, approved Site A/B RFQ copy, and misleading/incomplete behavior cases.
- `final-wp-dto-contract-fix-report.md`
  - This handoff and evidence record.

No generated GraphQL types, queries, React components, metadata helpers, Product-owned files, global shell files, verify scripts, or deployment files changed.

## TDD and verification evidence

### Observed RED / GREEN

- OG alt RED: `npm test -- tests/unit/homepage/dto.test.ts`
  - RED: 2 expected failures, both `HomepageContractError` at `seo.ogImage.alt` for GraphQL `altText: ""` and `altText: null`; 28 existing tests passed.
  - GREEN after the one-call-site DTO change: 30/30 passed.
- RFQ semantics RED: `npm test -- tests/unit/homepage/dto.test.ts`
  - RED: 8 expected semantic failures did not throw before implementation; the HTML case and 32 other/approved cases passed.
  - GREEN after the DTO semantic validator: 41/41 passed.
- RFQ clause-boundary audit follow-up: `npm test -- tests/unit/homepage/dto.test.ts`
  - Initial reproduced RED: the auditor's comma examples and `because` transition produced 3 expected failures that did not throw; 42/45 passed.
  - Expanded RED before implementation: 5 expected failures out of 48 for comma leakage, a positive continuation after a denied claim, and cause/time transitions; approved Site A/B copy, `not sent or stored`, and the coordinated comma list still passed. The result-transition counterpart is also covered in the final mirrored fixtures.
  - GREEN after implementing the equivalent PHP/TypeScript clause-boundary rules: the executable DTO side passed 48/48; the mirrored WordPress executable cases remain part of the Docker gate below.
- RFQ narrow-grammar audit follow-up: `npm test -- tests/unit/homepage/dto.test.ts`
  - RED before implementation: the three exact auditor bypasses did not throw; 3/51 failed while the prior 48 tests, including approved Site A/B and valid coordinated denials, passed.
  - GREEN after replacing both reset-word state machines with the mirrored bounded grammar and adding a direct dash-chain regression: 52/52 passed on the executable DTO side. The exact WordPress counterparts remain in the Docker gate below.
- RFQ closed-editorial-contract audit follow-up: `npm test -- tests/unit/homepage/dto.test.ts`
  - RED before implementation: 8/63 failed because the lexical grammar accepted double negation, an approved sentence with an accepted/logged suffix, four unreviewed success headings, an added prefix, and copy approved only for another field; the other 55 tests passed.
  - GREEN after replacing both lexical validators with mirrored whole-string field allowlists: 63/63 passed. The exact WordPress counterparts and normalized approved variants remain in the Docker gate below.
- WordPress A/C executable tests were written before their production implementation, but this worker could not execute the WordPress RED/GREEN because its C-worktree session has no Docker CLI/daemon or PHP runtime. These are not represented as passing evidence and remain required in the parent Docker-capable final gate.

### Fresh passing local evidence

- Final combined gate: `npm test -- tests/unit/homepage tests/integration/homepage tests/integration/wordpress/preview.test.ts tests/integration/api/preview.test.ts tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/homepage-agent-contract.test.ts`: 17 files, 160/160 tests passed.
- `npm test -- tests/unit/homepage tests/integration/homepage`: 13 files, 134/134 tests passed.
- `npm test -- tests/unit/homepage/dto.test.ts tests/integration/homepage/queries.test.ts tests/integration/homepage/preview.test.ts tests/integration/wordpress/preview.test.ts tests/integration/api/preview.test.ts`: 5 files, 92/92 tests passed.
- `npm test -- tests/infrastructure/homepage-seed-contract.test.ts tests/infrastructure/homepage-agent-contract.test.ts`: 2 files, 5/5 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit -p .tmp/tsconfig.final-wp-dto-contract.json`: passed for the WordPress adapter and DTO test source; the temporary config was removed immediately afterward.
- `npm run typecheck`: passed after temporarily moving the two ignored stale `.next-tio2-a` / `.next-tio2-b` generated directories into a verified workspace-local holding path. Both directories were restored in `finally`, and the holding directory was removed.
- `git diff --no-index --check` against the read-only `e3b9f89` source reported no whitespace errors in the five changed code/test files (only line-ending conversion warnings from the Windows mirror).

### Required Docker-capable final gate

Run all of the following from the final implementation worktree before claiming complete WordPress evidence:

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/homepage.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/preview.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/smoke.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli wp eval-file /workspace/wordpress/tests/authoring.php
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml run --rm --no-TTY --user 33:33 wpcli sh -lc "php -l /workspace/wordpress/plugins/tio2-site-model/includes/fields.php && php -l /workspace/wordpress/tests/homepage.php && php -l /workspace/wordpress/tests/preview.php"
```

## Unresolved decisions

None. The approved specification and final audit direction are sufficiently clear. Homepage-v0.1 deliberately uses a closed reviewed editorial set rather than attempting open-ended natural-language safety classification.

The only unresolved evidence item is environmental, not a product decision: the Docker/PHP WordPress gate above must still be run by the parent final gate.

## Migration impact

No schema or content migration is required. Existing valid site-owned homepages retain their identity. If lower-level stale duplicate relationships already exist, the next affected homepage save or `site_scope` mutation deterministically releases later duplicate identities without deleting their title/content. No Page/Post/Product route data is changed.

## Commit and external actions

- Commit: none in the C mirror, per parent handoff instruction. The patch is unstaged and uncommitted for parent isolation.
- External actions: none.
