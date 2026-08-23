---
name: tio2-home-template
description: Use when a task asks to design, implement, revise, validate, or audit the repository's homepage template across WordPress, GraphQL, HomepageDto, Next.js, SEO, fixtures, or tests.
metadata:
  project_agent: tio2_home_template
  modes: "Design, Implement, Audit"
  implement_approval_record: "proposal ID, exact proposal artifact/path, verbatim user approval quote, accepted scope/decisions"
  audit_read_only: "true"
  ownership: homepage-template
  external_actions: none
---

# TiO2 Homepage Template

## Core principle

The homepage is one fixed, versioned, site-owned contract from WordPress through `HomepageDto` to the root Next.js template. Reuse code and validation, never a homepage content record across sites.

## Agent routing

If the current agent is not the project custom agent `tio2_home_template`, delegate homepage template work to that agent. The parent owns clarification, approval capture, orchestration, independent review, and separately authorized external actions; it does not implement the homepage template in place of the specialist.

Do not delegate homepage work to `tio2_product_template`. Always read the [shared template-agent contract](../../../docs/agents/template-agent-shared-contract.md) and the references selected by the active mode.

## Modes

### Design

Use when the complete Implement approval record is absent and the request is not a valid Audit. Read [homepage-template-contract.md](references/homepage-template-contract.md) and [wordpress-field-contract.md](references/wordpress-field-contract.md). Inspect only read-only context and return one reviewable, versioned proposal. Make no repository writes to code, schema, tests, configuration, or proposal artifacts. The parent presents the proposal and captures approval.

### Implement

Enter only when the dispatch supplies all four approval-record fields: proposal ID; exact proposal artifact or repository path; verbatim user approval quote; accepted scope and decisions. Read the two contract references above and [quality-gates.md](references/quality-gates.md). Write failing behavioral tests first, confirm the expected RED, implement only the approved contract, and record GREEN evidence. A material discovery affecting fields, DTOs, layout, scope, ownership, or migration returns to Design and requires new approval.

### Audit

Enter only for an explicit audit request that supplies the proposal ID and exact proposal artifact or repository path. Read all three references. Audit is always read-only: compare the implementation and evidence with the named proposal, report findings, and stop. Never fix a finding in Audit; fixes require a new Implement dispatch with the complete four-part approval record.

## Ownership boundary

The specialist owns the homepage-only WordPress content type and fields; homepage GraphQL operation, generated types, adapter, and `HomepageDto`; root-route assembly, fixed homepage template and sections; homepage metadata, JSON-LD, fixtures, and tests.

Product schema/DTO/template/components, global navigation/footer, `SiteConfig`, shared design tokens, cross-template primitives, bulk content production, and external systems are outside this ownership. Do not copy a navigation shell inside the root template. Do not manufacture quantitative, certification, capacity, ranking, performance, or third-party claims. The approved business boundary may distinguish owned production for some products from OEM/partner production for others.

## Handoff contract

Every result declares, in order: mode; proposal ID; decisions made; unresolved decisions; files and interfaces affected; verification evidence, including RED/GREEN in Implement; migration impact; and `external actions: none`.

External actions are never performed by this specialist: no push, deployment, DNS change, indexing change, remote write, or production operation.
