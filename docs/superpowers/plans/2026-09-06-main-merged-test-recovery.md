# Main Merged Test Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the merged local `main` test suite from 16 failures to zero without weakening approved content, asset, security, or Site A editorial contracts.

**Architecture:** Repair the three failure sources at their boundaries: make local environment migration forward-compatible, pin immutable approved assets to LF bytes on Windows, and reconcile the local WordPress editorial seed through the existing audited Plan/Apply workflow. Keep tests strict and treat the 46 intentional skips as unchanged.

**Tech Stack:** PowerShell 7/Windows PowerShell, Git attributes, Vitest, Docker Compose, WordPress WP-CLI, Next.js/TypeScript.

**Spec:** Fresh `npm run validate` result on local `main` commit `ac2858d` (2026-09-06): 16 failed, 2218 passed, 46 skipped.

## Global Constraints

- Work only in the user-authorized local `main` checkout at `D:/16Wordpress_nextjs`.
- Do not run `verify:root-only`, deploy, publish, change DNS, enable indexing, or write production.
- Do not weaken exact Gate 7 payload or production SVG hash assertions.
- Preserve database and URL settings while rotating/generated local-only secrets.
- Use the existing Site A audited Plan/Apply path; do not edit the database ad hoc.

---

### Task 1: Forward-compatible local WordPress environment migration

**Files:**
- Modify: `tests/infrastructure/local-wordpress-env.test.ts`
- Modify: `scripts/new-local-wordpress-env.ps1`
- Local ignored state: `wordpress/.env`

**Interfaces:**
- Consumes: `wordpress/.env.example` as the complete key template.
- Produces: `new-local-wordpress-env.ps1 -Force` output containing every template key, preserving existing non-generated values and generating unique 64-hex secrets.

- [x] **Step 1: Extend the legacy migration test**

Add assertions that a legacy environment missing Malaysia keys receives `NEXTJS_REVALIDATION_URL_TIO2_MY`, `NEXTJS_REVALIDATION_SECRET_TIO2_MY`, `NEXTJS_PREVIEW_URL_TIO2_MY`, and `NEXTJS_PREVIEW_SECRET_TIO2_MY`, with generated secrets matching `^[0-9a-f]{64}$`.

- [x] **Step 2: Run the test and verify RED**

Run: `npx vitest run tests/infrastructure/local-wordpress-env.test.ts`

Expected: the migration case fails because missing template keys are not appended.

- [x] **Step 3: Implement template-key backfill**

Parse existing key names while preserving their lines, then append only template entries absent from the existing file. For generated names use the freshly generated secret; for other names use the template value.

- [x] **Step 4: Run the test and verify GREEN**

Run: `npx vitest run tests/infrastructure/local-wordpress-env.test.ts tests/infrastructure/bootstrap-wordpress.test.ts`

Expected: all tests pass.

- [x] **Step 5: Migrate the ignored local environment**

Run: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/new-local-wordpress-env.ps1 -Force`, then `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/assert-local-wordpress-env.ps1`.

Expected: migration and generated credential contract pass without printing secrets.

### Task 2: Preserve immutable approved bytes on Windows

**Files:**
- Create: `.gitattributes`
- Mechanically normalize: `public/tio2-my/brand/*.svg`
- Mechanically normalize: `tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json`
- Mechanically normalize: `wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json`
- Mechanically normalize: `tests/fixtures/documents/doc-tds/gate7/DOC-TDS_GATE7_SOURCE_PAYLOAD_V0.1.json`
- Mechanically normalize: `wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json`

**Interfaces:**
- Consumes: immutable LF byte sequences already stored in Git and their approved SHA-256 values.
- Produces: identical worktree bytes on Windows regardless of global `core.autocrlf=true`.

- [x] **Step 1: Confirm RED and blob/worktree divergence**

Run: `npx vitest run tests/infrastructure/tio2-my-global-chrome-contract.test.ts tests/infrastructure/tio2-my-document-reach-wordpress.test.ts tests/infrastructure/tio2-my-document-tds-wordpress.test.ts`

Expected: three byte/hash tests fail while `git show HEAD:<path>` hashes match the approved values.

- [x] **Step 2: Add exact line-ending attributes**

Set `/public/tio2-my/brand/*.svg text eol=lf` and mark the four immutable Gate 7 JSON paths `-text`, matching their repository blob bytes exactly.

- [x] **Step 3: Normalize only the listed files to LF**

Perform a byte-only CRLF-to-LF rewrite on the listed clean files; do not reformat JSON or SVG markup.

- [x] **Step 4: Verify GREEN and exact hashes**

Run the three Vitest files from Step 1 and `Get-FileHash -Algorithm SHA256` for every immutable payload.

Expected: all tests pass and hashes equal their approved contract values.

### Task 3: Reconcile the local Site A editorial population

**Files:**
- No production source change expected.
- Local WordPress data may be updated through the existing audited importer.

**Interfaces:**
- Consumes: 28-application, 11-resource, and approved Product manifests.
- Produces: exactly 39 Site A editorial drafts with Site B invariant unchanged.

- [x] **Step 1: Re-run the live adapter test after environment repair**

Run: `npx vitest run tests/integration/wordpress/site-a-editorial-live-adapter-runtime.test.ts`

Expected: if still RED, the marker reports the actual baseline count.

- [x] **Step 2: Run the formal audit to identify drift**

Run `scripts/audit-site-a-editorial.ps1` in `DeferredProductRelations` mode with the checked-in synthetic Application/Resource manifests and `D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json`.

Expected: fail closed with the exact missing/unexpected record identity.

- [x] **Step 3: Restore through Plan then Apply**

Run `scripts/apply-local-site-a-editorial-drafts.ps1` first in `Plan`, inspect the deterministic action list, then run `Apply` only when the plan contains the expected missing create and no destructive or cross-site action.

- [x] **Step 4: Verify audit and live adapter GREEN**

Re-run the formal audit and `tests/integration/wordpress/site-a-editorial-live-adapter-runtime.test.ts`.

Expected: 39 records and all rollback/invariant checks pass.

### Task 4: Full merged-main verification

**Files:**
- Review only: `git diff`, `git status`.

**Interfaces:**
- Consumes: Tasks 1-3 fixes.
- Produces: fresh evidence for lint, typecheck, 2280 Vitest cases, and production build.

- [x] **Step 1: Run focused regression files**

Run all eight files that failed in the initial merged-main test.

Expected: zero failures.

- [x] **Step 2: Run `npm run validate`**

Expected: lint has no errors, typecheck passes, Vitest has zero failures, and `next build` exits 0.

- [x] **Step 3: Inspect final repository state**

Run `git status --short --branch` and `git diff --check`.

Expected: only intentional source/plan changes are present; ignored local secrets and local WordPress data are not staged.
