# Superpowers-Only Project Workflow Design

**Date:** 2026-08-25
**Status:** Approved in conversation
**Approval:** “按照你的判断执行。”

## Objective

Simplify project governance by removing all repository-defined custom agents and project-specific skills. Future work uses the installed Superpowers workflow directly, with only a small set of repository constraints in `AGENTS.md`.

## Active workflow

1. Use `superpowers:brainstorming` before design or behavior changes.
2. Record and approve designs at a scale appropriate to the task.
3. Use `superpowers:writing-plans` for multi-step implementation.
4. Use `superpowers:test-driven-development` for implementation and bug fixes.
5. Use temporary generic subagents only when a Superpowers workflow calls for independent implementation or review. No permanent project role agents are required.
6. Use focused verification during normal development.
7. Run the complete `verify:root-only` gate only before release or the formal 505-to-1 migration, and only after fresh explicit user authorization.

## Repository changes

- Remove `.codex/agents/tio2-home-template.toml`.
- Remove `.codex/agents/tio2-product-template.toml`.
- Remove `.codex/agents/tio2-site-template.toml`.
- Remove `.agents/skills/tio2-home-template/**`.
- Remove `.agents/skills/tio2-product-template/**`.
- Remove `.agents/skills/tio2-site-template/**`.
- Remove `docs/agents/template-agent-shared-contract.md`.
- Remove infrastructure tests whose only purpose is requiring those agents and skills to exist.
- Replace the routing rules in `AGENTS.md` with concise Superpowers-only project constraints.

## Preserved project constraints

- Normal business-page and template development targets Site A only.
- Site B remains in the shared repository and WordPress installation, but its business pages and templates are not developed unless the user separately changes that scope.
- Homepage content must not link to product or application pages until separately approved.
- Normal development uses tests directly related to the change. Single-site or two-site builds and a small number of critical E2E tests may be used when needed.
- The complete `verify:root-only` gate is not a daily development command.
- Formal migration, deployment, DNS changes, indexing, remote writes, and production operations require separate explicit authorization.

## Historical records

Existing approved specifications, plans, and SDD reports remain unchanged as historical records. Their references to former custom agents describe the workflow used at that time and no longer control future work. The active root `AGENTS.md` supersedes those historical routing instructions.

## Non-goals

- No homepage, product, WordPress, GraphQL, DTO, route, fixture, or visual implementation changes.
- No test, build, E2E, migration, seed, deployment, DNS, indexing, remote, or production execution beyond focused checks of this governance change.
- No deletion of installed Superpowers skills.

## Acceptance criteria

- No project custom-agent TOML files remain.
- No project-specific TiO2 Skill directories remain.
- No active shared agent contract remains.
- No active test requires a removed agent or skill.
- `AGENTS.md` states the Superpowers-only workflow and the preserved project constraints.
- Historical implementation artifacts remain intact.
