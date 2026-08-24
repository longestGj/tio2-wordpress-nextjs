# Superpowers-Only Project Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every repository-defined TiO2 custom agent and project Skill while preserving a concise Superpowers-only project workflow.

**Architecture:** The repository root `AGENTS.md` becomes the only active project-specific workflow entry point and delegates process selection to installed Superpowers skills. Because this task removes configuration and human instructions rather than changing production behavior, acceptance uses exact filesystem and reference scans instead of adding a brittle source-text contract test.

**Tech Stack:** Markdown, Vitest, Node.js filesystem APIs, Git

**Spec:** `docs/superpowers/specs/2026-08-25-superpowers-only-workflow-design.md`

## Global Constraints

- Preserve all homepage, product, WordPress, GraphQL, DTO, route, fixture, and visual implementation files.
- Preserve historical specifications, plans, and SDD reports; their former Agent references are historical only.
- Do not run builds, E2E, seeds, migrations, `verify:root-only`, deployment, DNS, indexing, remote writes, or production operations.
- Normal future development targets Site A; Site B remains present but frozen unless separately authorized.
- The complete `verify:root-only` gate requires fresh explicit user authorization.

---

### Task 1: Replace custom Agent governance with a Superpowers-only contract

**Files:**
- Modify: `AGENTS.md`
- Delete: `.codex/agents/tio2-home-template.toml`
- Delete: `.codex/agents/tio2-product-template.toml`
- Delete: `.codex/agents/tio2-site-template.toml`
- Delete: `.agents/skills/tio2-home-template/**`
- Delete: `.agents/skills/tio2-product-template/**`
- Delete: `.agents/skills/tio2-site-template/**`
- Delete: `docs/agents/template-agent-shared-contract.md`
- Delete: `tests/infrastructure/homepage-agent-contract.test.ts`
- Delete: `tests/infrastructure/site-template-agent-contract.test.ts`

**Interfaces:**
- Consumes: installed `superpowers:*` skills supplied by Codex, outside this repository.
- Produces: an active root `AGENTS.md` containing repository constraints without any project custom-agent or project-Skill routing.

- [x] **Step 1: Record the existing Agent-contract baseline**

Run:

```powershell
npx vitest run tests/infrastructure/homepage-agent-contract.test.ts tests/infrastructure/site-template-agent-contract.test.ts
```

Expected: 8 tests passed, proving the soon-to-be-removed Agent/Skill contract is intact before the governance change.

- [x] **Step 2: Replace the active repository instructions**

Replace `AGENTS.md` with:

```markdown
# Project workflow

- Use installed Superpowers skills for design, planning, implementation, debugging, review, and verification. This repository defines no custom project agents or project-specific Skills.
- Normal business-page and template development targets Site A only.
- Site B remains in the shared repository and WordPress installation, but do not develop its business pages or templates unless the user separately changes that scope.
- Keep the Homepage free of product-page and application-page links until the user separately approves those links.
- During normal development, run only tests directly related to the change. Single-site or two-site builds and a small number of critical E2E tests are allowed when they are necessary for the change.
- Do not run `verify:root-only` as a routine development check. It is reserved for release or the formal 505-to-1 migration and requires fresh, separate explicit user authorization.
- Formal migration, deployment, DNS changes, indexing, remote writes, and production operations require separate explicit user authorization.
```

- [x] **Step 3: Remove the obsolete project Agent/Skill artifacts and contract tests**

Delete exactly the files and directories listed in this task's **Files** block. Do not edit or delete historical specs, plans, SDD reports, or application code.

- [x] **Step 4: Verify the exact removal set**

Run:

```powershell
$paths = @(
  '.codex/agents/tio2-home-template.toml',
  '.codex/agents/tio2-product-template.toml',
  '.codex/agents/tio2-site-template.toml',
  '.agents/skills/tio2-home-template',
  '.agents/skills/tio2-product-template',
  '.agents/skills/tio2-site-template',
  'docs/agents/template-agent-shared-contract.md',
  'tests/infrastructure/homepage-agent-contract.test.ts',
  'tests/infrastructure/site-template-agent-contract.test.ts'
)
$remaining = $paths | Where-Object { Test-Path -LiteralPath $_ }
if ($remaining) { throw "Obsolete project Agent artifacts remain: $($remaining -join ', ')" }
```

Expected: command exits successfully with no remaining paths.

- [x] **Step 5: Scan active files for obsolete routing**

Run:

```powershell
rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' --glob '!docs/superpowers/specs/**' --glob '!docs/superpowers/plans/**' --glob '!.superpowers/**' "tio2_(home|product|site)_template|\$tio2-(home|product|site)-template|template-agent-shared-contract" .
```

Expected: no matches. Historical specs, plans, and SDD reports are deliberately excluded.

- [x] **Step 6: Verify the patch is narrow**

Run:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected: no whitespace errors; only the approved workflow spec/plan, root instructions, and removal of Agent/Skill/contract artifacts are changed.

- [x] **Step 7: Commit the governance change**

```powershell
git add AGENTS.md .codex/agents .agents/skills docs/agents tests/infrastructure docs/superpowers/specs/2026-08-25-superpowers-only-workflow-design.md docs/superpowers/plans/2026-08-25-superpowers-only-workflow.md
git commit -m "chore: use superpowers-only project workflow"
```
