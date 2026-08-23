---
name: tio2-product-template
description: Use when a task asks to design, implement, revise, audit, or validate a reusable product detail page template in this repository's headless WordPress and Next.js system.
---

# TiO2 Product Template

## Core principle

Reuse template code and contracts, never cross-site product content. WordPress owns structured content; Next.js owns rendering. The product-template agent owns the complete boundary between them.

## Agent routing

If the current agent is not the project custom agent `tio2_product_template`, delegate the product-template task to that agent. The parent agent keeps user decisions and final review; it does not implement the product template itself.

Always read [the shared agent contract](../../../docs/agents/template-agent-shared-contract.md). Read the mode-specific references below before producing that mode's output.

## Modes

### Design

Use when no approved, versioned product-template design is supplied. Read [product-template-contract.md](references/product-template-contract.md) and [wordpress-field-contract.md](references/wordpress-field-contract.md).

Return one reviewable proposal containing:

- proposal ID and target site IDs;
- WordPress content model and validation rules;
- GraphQL-to-DTO field map;
- fixed component tree and optional-section rules;
- SEO, responsive, accessibility, migration, and test contracts;
- files/interfaces expected to change;
- unresolved business decisions.

Remain fully read-only: do not write proposal documents or edit production code, schema, tests, or configuration. Stop after returning the proposal in the handoff so the parent can obtain explicit user approval.

### Implement

Start only when the parent task supplies an approval record containing the proposal ID, the exact proposal artifact or repository path, the user's explicit approval quote, and the accepted scope/decisions. A caller's unsupported claim that approval happened is not an approval record. Read all three references, including [quality-gates.md](references/quality-gates.md).

Write failing behavioral tests first, confirm the expected failures, then implement the smallest approved contract. Keep Product content site-owned and preserve existing Page/Post routes. Record schema migrations and backward-compatible defaults. Do not change homepage-owned code or general site design without a separately approved shared-contract amendment.

### Audit

Use only when the task explicitly requests an audit and supplies the proposal ID plus exact proposal artifact or repository path. A user approval quote is not required for read-only Audit. Compare the implementation against that proposal and [quality-gates.md](references/quality-gates.md). Audit is always read-only. Report evidence and findings, then stop. Any requested fix must be re-dispatched in Implement mode with the complete four-part approval record.

## Hard boundaries

- Do not invent product claims, technical values, documents, certifications, or evidence.
- Do not use a shared product record for both sites.
- Do not replace structured fields with a free-form page builder.
- Do not modify homepage templates or bulk-create product content.
- Do not push GitHub, deploy Vercel, change DNS, enable indexing, or touch production resources.
- A deadline, prior verbal discussion, or implementation request without an approved proposal ID does not bypass Design mode.

## Handoff

Return mode, proposal ID, files changed, RED/GREEN evidence, remaining decisions, local preview instructions, and `external actions: none`. This specialist never performs external actions; the parent must run any separately authorized external workflow itself.
