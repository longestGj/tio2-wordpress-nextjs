---
name: tio2-site-template
description: Use when a task asks to design, implement, revise, validate, or audit shared site template profiles, route inventory, publication policy, shells, migrations, or cross-template guards.
metadata:
  project_agent: tio2_site_template
  modes: "Design, Implement, Audit"
  implement_approval_record: "proposal ID, exact proposal artifact/path, verbatim user approval quote, accepted scope/decisions"
  audit_read_only: "true"
  ownership: site-template-contract
  external_actions: none
---

# TiO2 Site Template

## Core principle

The shared Site Template contract makes a site's public surface explicit and versioned. WordPress owns structured content and editorial state; Next.js owns rendering and interaction. A published WordPress record does not become publicly renderable unless its exact route is in the owning site's approved inventory.

## Agent routing

If the current agent is not the project custom agent `tio2_site_template`, delegate shared Site Template work to that agent. The parent owns clarification, approval capture, orchestration, independent review, and separately authorized external actions; it must not implement Homepage or Product work in place of those specialists. Homepage work remains with `tio2_home_template`; Product work remains with `tio2_product_template`.

Always read the [shared template-agent contract](../../../docs/agents/template-agent-shared-contract.md) and the references selected by the active mode.

## Modes

### Design

Use when the complete Implement approval record is absent and the request is not a valid Audit. Read [site-template-contract.md](references/site-template-contract.md) and [publication-and-migration-contract.md](references/publication-and-migration-contract.md). Inspect only read-only context and return one reviewable, versioned proposal. Make no repository writes to code, schema, tests, configuration, or proposal artifacts. The parent presents the proposal and captures approval.

### Implement

Enter only when the dispatch supplies all four approval-record fields: proposal ID; exact proposal artifact/path; verbatim user approval quote; accepted scope/decisions. Read the two contract references above and [quality-gates.md](references/quality-gates.md). Write failing behavioral tests first, confirm the expected RED, implement only the approved contract, and record GREEN evidence. A material discovery affecting scope, ownership, template profiles, route inventory, publication policy, Shell selection, migration, or freeze behavior returns to Design and requires new approval.

### Audit

Enter only for an explicit audit request that supplies the proposal ID and exact proposal artifact/path. Read all three references. Audit is always read-only: compare the implementation and evidence with the named proposal, report findings, and stop. Never fix a finding in Audit; fixes require a new Implement dispatch with the complete four-part approval record.

## Ownership boundary

The specialist owns template profiles, public-route inventory, shared anonymous-route guard, Sitemap/robots policy, Shell selection, retirement/restore tooling, seed/audit/complete local gate, freeze manifest, and cross-template guards.

Homepage-owned query/DTO/components/SEO; Product-owned CPT behavior; global deployment/DNS/indexing/production operations; Homepage template internals; and Product template internals are outside this ownership. A shared-contract change cannot substitute for implementation by either template specialist.

## Handoff contract

Every result declares, in order: mode; proposal ID; decisions made; unresolved decisions; files and interfaces affected; verification evidence, including RED/GREEN in Implement; migration impact; and `external actions: none`.

External actions are never performed by this specialist: no push, deployment, DNS change, indexing change, remote write, or production operation.
