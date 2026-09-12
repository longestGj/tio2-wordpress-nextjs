# Minimal content release implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development. Track each task below; use red/green behavioral tests and independent review.

**Goal:** Reuse the release controller across registered websites and release existing MY content with a full shared-database backup and immediate failure recovery.

**Architecture:** Keep SITE_ID-bound frontends and shared WordPress. Transport reads validated site configuration; content uses declarative records and installed validators. A fenced publication window owns full-database backup, import, cache refresh, verification and immediate recovery.

**Tech Stack:** PowerShell, Python 3.12, PHP/WordPress, MariaDB, TypeScript/Next.js, unittest/Vitest and isolated Docker tests.

**Spec:** [Approved design](../specs/2026-09-12-minimal-content-release-design.md).

## Global constraints

- BASE db36592574dc4847f9dae456ea36b9d9a984b2f8; worktree phase2-tio2-my-content-release, branch codex/phase2-tio2-my-content-release.
- No production actions, no root AGENTS.md edits, no changes to another task's worktree.
- No generation, per-site database backup, historical per-site restore or new frontend tenancy model.
- All shared CMS writers remain fenced from before backup through successful publication or verified full restore.
- Preserve existing identity, schema, path, secret, evidence/publication and unsafe-content restrictions.
- Existing compatibility migration stays bound to its original site/candidate. Generic transport is not evidence of generic production deployment support.
- File-bearing packages fail before mutation until file handling is verified; existing file references remain valid.

## Task 1: Configured website transport and receipt validation

Owner: minimal_site_client. Files: scripts/production.ps1, scripts/production/Production.Core.psm1, client tests.

Consumes connection siteId, host identity, fixed action and existing candidate/receipt. Produces configured subject command and registry-compatible fixed transport paths; returned receipts must match the configured subject.

- [ ] Write behavioral tests that invoke normal client transport for a second site and observe SSH/SCP arguments without network access; assert legacy tio2-my paths stay unchanged.
- [ ] Test shell/path injection IDs, reserved subjects, mismatched candidate/receipt subject and changed persisted connection; observe rejection before transport.
- [ ] Run tests against original implementation and record expected failures.
- [ ] Add separate normal-site validation while retaining legacy compatibility validation. Resolve normal paths using the server registry conventions, never caller-provided shell strings or arbitrary remote paths.
- [ ] Wire configured subject into normal operation receipt checking; keep unsupported server capabilities explicit.
- [ ] Run affected client regressions, record red/green evidence and commit owned files.

## Task 2: Runtime content validation and DTO projection

Owner: minimal_content_validation. Files: wordpress/plugins/tio2-site-model/includes/ content validators/helpers, lib/wordpress/*dto.ts, applicable lib/editorial runtime readers and their behavioral tests.

Consumes existing page identity, installed immutable rules and CMS payload. Produces the same GraphQL/DTO shapes with validated CMS editable content. Keep the installed content input as a fixture and stable-rule baseline, not as the required runtime text version.

- [ ] Enumerate actual whole-payload comparisons and compiled-payload returns; record page/type and mutable-field coverage.
- [ ] For each affected type test a legitimate content edit reaches the output; separately test changed scope/path/schema, unsafe links/HTML and protected evidence values are rejected.
- [ ] Run new tests before changes and preserve the observed failures.
- [ ] Replace full-text equality with explicit supported editable fields plus preserved structure/identity/security checks; use delivered values in projections. Do not infer unrestricted mutability from unknown JSON.
- [ ] Expose installed PHP validation to the importer so runtime reads and release imports enforce the same rules.
- [ ] Run PHP and TS tests for all changed types plus shared A/B consumers; commit owned files.

## Task 3: Full database publication window and integration

Engine owner: minimal_database_release. Integration owner: primary. Files: new ops/production/server/content_* modules; wordpress/release import/export scripts; tests/production/test_content_*; tests/production-runtime/content*; controller/candidate/bootstrap integration and documentation.

Consumes a trusted installed runtime configuration and immutable d16-content-package-v1 data: siteId, records (pageId, content), empty files until file support exists, and canonical contentSha256. Installed PHP registration owns the metadata key; callers cannot supply it. Produces a durable publication journal and success or verified full-restore evidence. Credentials and executable commands never come from the package.

- [ ] Test invalid/duplicate identities, wrong scope, hash mismatch and files before any runtime mutation.
- [ ] Test failures at fence, backup, import, commit, refresh, verify and restore boundaries. Backups are never overwritten on resume; uncertain recovery does not reopen writes.
- [ ] Run red tests, then implement a durable engine using installed runtime operations for actual fencing, complete database dump/restore, transactional import, canonical export, refresh and public readback.
- [ ] Implement fixed PHP import/export of existing page records, resolving local IDs by stable identity and running Task 2 validators; reject unknown metadata and executable package inputs.
- [ ] Exercise a real isolated WordPress/MariaDB database with two scopes. Prove backup/restore restores both scopes, blocked normal writers, valid update readback, failed import and failed validation recovery. Never use a shared or production database.
- [ ] Integrate the adapter through the existing controller; allow only installed runtime capabilities, maintain global window exclusion across actions and keep completion independent from unrelated live email evidence.
- [ ] Add package/client integration only after engine and runtime contracts agree. Normal frontend compatibility restrictions may only be removed once their replacement baseline/stage/restore proof is tested.
- [ ] Run fresh affected integration and task E2E checks. Verify runtime content changes without rebuilding the same frontend. Inspect page output and cache restoration.
- [ ] Run independent whole-branch review, address findings, update implementation/capability docs without claiming production installed, and commit development evidence.

## Progress / rulings

- User approved spec at d184504. Implementation is present; final integration review and merge are tracked in the development receipt. The checklist above preserves the initial work breakdown rather than retroactively claiming every regression test had an observed red phase.
- Task 1 and Task 2 operate on disjoint files; Task 3 engine work is separate from the primary's controller integration.
- Canonical content hash is an integrity comparison, never a substitute for the approved content input.
- A runtime interface or fake backend does not demonstrate production writer fencing or real database restore. Installation must remain unavailable until the concrete runtime and rehearsal pass.

### Implementation evidence (2026-09-12)

- Task 1: configured client and immutable offline builder committed; client Status, explicitly requested recovery and read-only terminal reconciliation covered. CMS worker independently reviewed client changes.
- Task 2: 57 page policies/1692 text paths, PHP and TS validation, projection and conversion-page SEO wiring committed. Observed behavioral red/green: Sample body, Editorial text, projected relation text and conversion SEO. Other page tests are regression coverage.
- Task 3: full database engine, fixed installed PHP registry/importer, controller and enrolled adapter integration committed. Observed behavioral red/green: classifier handling executable seed code, proof tamper rejection, completion persistence/reconciliation, prior frontend admission, terminal archive retention and configured capability reporting. External Test/Publish/Rollback wrappers now hide the fixed internal steps.
- Fresh primary verification: 61 controller/adapter/enrollment tests; 185 direct content/cache tests; TypeScript check; same-PID Next development fixture initial/change/restore with visible paragraph, metadata and JSON-LD. Next fixture does not establish real WP-to-Next production E2E.
- Real isolated MariaDB/WordPress rehearsal passed with writer denial, publication and whole database restore across two scopes, including interrupted restore, restart-persistent fencing, exact database identity and modification timestamps.
- Actual WPGraphQL-to-Next production-build rehearsal passed on Build Bb4YWK810UdFCmT3skUd4, same process35948: cached old HOME before signed refresh, updated body/title/description and actual sitemap after refresh, actual prior HTML read before injected failure, full database restore and revalidated restored page. Primary inspected its browser screenshot. Subsequent probe/cleanup refinement has five direct regression tests; artifact records the original full-chain execution.
- Production remains not installed: sealed importer, credentials, maintenance/identity/cache/public-verification programs and actual target configuration require separate installation and real prerelease/production acceptance. No remote writes occurred here.
