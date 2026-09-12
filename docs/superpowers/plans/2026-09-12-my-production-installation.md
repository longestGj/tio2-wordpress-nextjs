# MY Production Installation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Install the approved content runtime and CMS upgrade on the existing MY topology and admit the next verified frontend candidate.

**Architecture:** Keep the shared CMS, fixed root/deploy boundary and release controller. Add explicit administrator installation with durable recovery, real content hooks, and separately enrolled frontend candidate preparation. Never reinterpret the legacy compatibility transaction as a new release.

**Tech Stack:** Python standard library, Docker/MariaDB/WordPress PHP, existing PowerShell client, Next/Playwright verification.

**Spec:** `docs/superpowers/specs/2026-09-12-my-production-installation-design.md` (user approved all three items).

## Global Constraints

### 2026-09-12 execution status

Implementation and independent review of all three tasks are complete. Real resource upgrade/restore, whole-database restore/fence recovery, installed hooks against production Next.js, and complete installer success/verification-failure rollback passed. After proxy connectivity recovered, the final frontend build/candidate switching/rollback rehearsal passed all 11 cases at ee6aa01e. Full regression passed 558 tests with 9 platform skips and no failures. Development merge follows these verified results; production remains a separate workflow. See the [verification evidence directory](../../verification/production-release-system/development/2026-09-12-my-production-installation/).

The task lists retain the implementation sequence. All tasks are complete; develop merge a5a8c279 and its post-merge 119-test regression passed. See the development receipt.

- Work in `codex/my-production-installation`, based on `b39cc830`; no production connections/writes, main changes or root AGENTS edits during development.
- Preserve prior candidate evidence, shared consumers and unrelated work. No arbitrary incoming scripts, credentials in receipts, fabricated verification or generic Campaign framework.
- Real installation resources must be the ones exercised by the Docker rehearsal. Production enrollment follows observed identity and successful checks, never mere config existence.
- Apply whole-DB restore only within the owned shared write-pause window. Never silently restore historical DB over later edits.

## Task 1: Actual content runtime hooks

Files: create `ops/production/server/content_hooks.py`, `tests/production/test_content_hooks.py`; maintain script wrappers via administrator installer from Task 2.
Consumes existing `ContentDockerRuntime.HOOKS` requests: identity/enter/assert/leave/refresh/verify. Produces `ContentHooks(config, ...).execute(action, request)` JSON and CLI; final config contract shared with installer before integration.

- [x] Write failing tests for false/stale identity, owner mismatch, real HTTP maintenance/internal access, signed cache request, stale visible body and incorrect SEO/sitemap. Use local actual HTTP servers where appropriate; do not assert mock calls instead of outcomes.
- [x] Run `python -m unittest tests.production.test_content_hooks -v` and record failing behavior.
- [x] Implement root-protected config and fixed commands, bounded HTTP parsing, owner-bound maintenance marker, fresh Docker/Build/config/CMS identity, signed refresh and actual page validation. Reuse the runtime contract; test-only substitutes belong in tests.
- [x] Run tests, report exact output and run actual hooks in the integrated Docker rehearsal.
- [x] Commit only owned files, then independent review.

Illustrative acceptance test (the actual fixture constructs a real local server):
```python
with self.assertRaises(ReleaseError):
    hooks.execute('verify', package_with_new_heading)
# server still serves old heading, even when status=200 and cache ACK succeeds
```

## Task 2: Administrator install/upgrade/rollback

Files: create `ops/production/server/content_install.py`, `ops/production/build_content_install_bundle.py`, `tests/production/test_content_install.py`; modify `bootstrap_install.py` only to include tested programs after integration. Add actual runtime test at `tests/production-runtime/content_install_rehearsal.py`.
Consumes Task 1 installed hooks and existing `ContentDockerRuntime`/`ContentRelease` fence, SQL dump/restore and registry contracts. Produces immutable Git-built installation artifacts and root-only plan/apply/status/rollback with persisted baseline, backup identity and owned resource steps.

- [x] Test artifact tampering, snapshot drift, wrong scope, unfinished transaction and unknown resources before writes. Verify failed backup leaves plugin unchanged; interrupted install restores only owned resources and original bytes.
- [x] Run `python -m unittest tests.production.test_content_install -v` to confirm missing behavior.
- [x] Implement trusted artifact validation, explicit observed resource binding, whole DB + old plugin/config backup, sealed importer provisioning, hook and PHP deployment, fresh verification and enrollment last. Record each irreversible-side-effect intent before action and resume via saved state.
- [x] Exercise real isolated Docker upgrade and restore with two scopes; verify low-privilege WP, root credential separation, read-only importer, real maintenance and recovery. No production host use.
- [x] Run relevant bootstrap/admin bundle regression, commit and request review.

Acceptance tests must inspect resulting files/database rather than method calls:
```python
self.assertEqual(old_plugin_bytes, plugin_path.read_bytes())
self.assertEqual(before_scope_b, export_scope_b())
self.assertFalse(runtime_config.exists())  # installation did not verify
```

## Task 3: New frontend candidate and integration

Files: `release_controller.py`, `site_frontend_adapter.py`, `deployment_core.py`, new narrowly scoped candidate helper(s) under `ops/production/server/`, `scripts/production/Production.Core.psm1` and related tests as needed. Ownership separate from installer/hooks.
Consumes current `CandidateEnvelope`, verified registry/live baselines and fresh upgraded CMS evidence. Produces an explicitly enrolled next frontend workflow, source admission/staging, existing backup/activation/rollback/evidence contracts. Legacy constants and transaction remain intact.

- [x] Add failing tests showing a correctly bound new frontend candidate cannot currently prepare; wrong Build/hash/CMS/site, nonterminal old transaction and replay must stay rejected.
- [x] Implement strict source/proof mapping and fresh baseline, terminal transition and normal-client transport; do not disable WordPress compatibility checks without replacing them with actual enrolled CMS evidence.
- [x] Run relevant candidate/controller/frontend/client tests. Exercise two different real frontend candidates through fixed entrypoint, actual Docker staging, proxy selection and rollback in isolated resources.
- [x] Integrate Task 1/2 artifacts, run actual CMS→Next success and rollback with installed hooks, inspect visual evidence, update runbook/ability status as development facts only.
- [x] Final independent exact-HEAD review; fix observed defects, merge reviewed tree into develop, write development receipt. Then return to separate release workflow with a new frozen candidate.

Acceptance test:
```python
self.assertNotEqual(first_build, second_build)
self.assertEqual(second_build, read_actual_active_build())
rollback_same_transaction()
self.assertEqual(first_build, read_actual_active_build())
```

## Execution rulings

Tasks 1 and 3 can run independently; Task 2 prepares artifact/journal tests while Task 1 stabilizes the hook configuration. Installer integration and real runtime validation are sequential. Existing production tests are reused for legacy compatibility; fresh real evidence is required for new runtime behavior. Any implementation-level interface refinements are recorded alongside their tests without expanding the approved topology or release scope.
