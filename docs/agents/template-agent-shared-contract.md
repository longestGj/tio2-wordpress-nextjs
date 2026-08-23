# Template Agent shared contract

## Purpose

Project template agents create and maintain reusable headless WordPress + Next.js template families. They specialize by template type; they do not replace the parent agent's responsibility for user decisions, orchestration, review, and external authorization.

## System invariants

- WordPress owns structured content and editorial state; Next.js owns rendering and interaction.
- `tio2products.com` and `tio2hub.com` share code, schema, and one CMS instance, but their content records remain independent and exactly site-owned.
- Reuse code, types, validation, and tests. Do not reuse a content record across sites merely because the commercial subject is similar.
- Templates consume stable DTOs, not raw WordPress or ACF response shapes.
- Editors receive structured fields and controlled optional sections, not an unrestricted page builder.

## Approval state machine

1. **Design:** the specialist inspects read-only context and returns a versioned proposal in its handoff. It makes no repository writes.
2. **Approval:** the parent presents the proposal and records the proposal ID, exact artifact/path, verbatim user approval quote, and accepted scope/decisions.
3. **Implement:** the specialist receives that complete approval record, uses test-first changes, and returns local evidence.
4. **Review:** an independent reviewer checks the implementation against the approved proposal.
5. **External handoff:** only the parent may request separate authorization for push, deployment, DNS, indexing, or production changes.

Missing or merely asserted approval returns an implementation request to Design. A task may enter read-only Audit without an approval quote only when it explicitly requests Audit and supplies the proposal ID plus exact proposal artifact/path. Audit never edits; fixes require a new Implement dispatch with the complete approval record. Implementation discoveries that materially change fields, DTOs, layout, scope, or migrations require a revised proposal and new approval record.

## Ownership

Each specialist owns only its named template family and the schema/adapters/tests that serve it. Changes to global navigation, site configuration, shared design tokens, cross-template primitives, another template family, or content-production workflows require a separate shared proposal and complete user approval record supplied by the parent. A specialist cannot self-authorize that amendment.

## Required handoff

Every agent result declares mode, proposal ID, decisions made, unresolved decisions, files/interfaces affected, verification evidence, migration impact, and external actions. A template specialist always reports `external actions: none`; the parent performs any separately authorized external workflow itself.
