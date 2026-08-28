# TIOVAR Homepage v0.3 Brand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` for implementation, `superpowers:test-driven-development` for every behavior change, and `superpowers:verification-before-completion` before any completion claim.

**Goal:** Replace only Site A's rejected editorial homepage with the user-approved TIOVAR brand homepage, backed by a semantically correct `homepage-v0.3-brand` WordPress contract and verified locally.

**Architecture:** Keep the existing `tio2_homepage` record and shared WordPress/Next.js infrastructure, add Site A v0.3 ACF fields and a dedicated GraphQL-to-DTO adapter, then render a fixed Server Component section tree with one local-only Client Component for inquiry validation. Site B and all non-homepage business routes remain unchanged.

**Tech Stack:** WordPress/PHP/ACF/WPGraphQL, Next.js 16 App Router, React 19, TypeScript, CSS Modules, `next/font`, `next/image`, Vitest, React Testing Library, and Playwright.

**Approved artifacts:** `C:\Users\longe\.codex\visualizations\2026\08\28\01a04793-de99-7132-b1cd-5c7f0b58a880\tiovar-homepage-seo-final-preview.html` and `tiovar-homepage-seo-final.html` in the same directory.

## Constraints

- Site A only; do not alter Site B's template, data, or styling.
- Keep Homepage product/application/resource labels non-navigable until separate link approval.
- TDS is request-only; expose no public download URL.
- Use only TIOVAR outward branding and avoid manufacturer, owner, factory, equivalence, or unsupported performance claims.
- Inquiry is a visibly local-only interaction in this phase: no network, WordPress write, CRM, cookie, or storage side effect.
- Do not deploy, write remote WordPress, change DNS/indexing, or run `verify:root-only`.

## Tasks

### Task 1: Lock the v0.3 contract with failing tests

- Add DTO/adapter tests for fixed identity, required bounded collections, safe same-page CTA targets, controlled-document status, and exact SEO fields.
- Add template tests for one H1, approved section order, TDS request-only language, FAQ semantics, and absence of product/application/resource hrefs.
- Add isolation tests proving Site B still selects v0.1.
- Run the new tests and record the expected RED failures.

### Task 2: Add the local WordPress and GraphQL content model

- Register the semantically named Site A v0.3 ACF fields without deleting v0.2 fields.
- Update the schema expectation, committed GraphQL operation/types, DTO adapter, homepage union, retrieval, template profile, preview, and local seed fixture.
- Populate the approved English copy, 12+/30+/30,000+ metrics, six applications, eight families, four factors/resources/documents, five steps, inquiry labels, FAQ, and SEO metadata.
- Confirm the contract tests pass.

### Task 3: Implement the approved Site A interface

- Add the official optimized logo and approved hero image to local public assets.
- Replace the Site A homepage renderer/shell with the bright TIOVAR design using Space Grotesk, Source Sans 3, CSS Modules, and rounded ~10px buttons.
- Keep navigation discovery labels inert; use only same-page inquiry/document anchors.
- Add accessible responsive FAQ, mobile navigation treatment, and local-only inquiry validation.
- Confirm component and route tests pass.

### Task 4: Verify the completed homepage locally

- Run targeted unit/integration tests, PHP syntax checks, typecheck, lint, and the Site A build.
- Start the local Site A app and inspect desktop/mobile rendering, metadata, link policy, overflow, and interaction behavior.
- Review the final diff for Site B isolation and absence of external actions.
