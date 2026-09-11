# HOME-001 Applications-Aligned Gate 8 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle only the TiO2 Malaysia Home body so the existing approved content and behavior match the Applications visual family at 1440, 1024, 768, 390, and 320 pixels.

**Architecture:** Keep the existing CMS DTO, Home server renderer, responsive product disclosure, shared Malaysia Global Chrome, metadata, JSON-LD, and scoped route pipeline. Limit production changes to the Home renderer and CSS Module, and change `responsive-product-groups.tsx` only if a failing accessibility test proves it necessary. Add focused unit and Playwright coverage, then bind the exact implementation commit, build, runtime, and committed evidence in the Gate 8 manifest and receipt.

**Tech Stack:** Next.js 16.3.2 App Router, React 19, TypeScript, CSS Modules, Vitest, Testing Library, Playwright, Axe.

**Spec:** `D:/23MySec/pages/home/06_handoff/HOME-001_APPLICATIONS_ALIGNED_GATE6_HANDOFF_PACKAGE_V1.0.md`

## Global Constraints

- Page ID `HOME-001`, route `/`, and `site_scope=tio2-my` remain exact.
- Preserve all Home visible copy, hrefs, module order, fourteen Grade IDs and `6/5/2/1` grouping, CMS JSON, metadata, canonical, JSON-LD, and production SVG bytes.
- Reuse `MalaysiaGlobalHeader` and `MalaysiaGlobalFooter`; do not edit shared Chrome or create Home-specific Chrome.
- Keep Start Here at all five widths; show the page RFQ at 1440/1024/768 and omit it from layout and accessibility at 390/320.
- Do not implement child routes, receiver behavior, merge, push, deployment, publication, DNS, indexing, Gate 9 approval, or Gate 10.

---

### Task 1: Lock Baseline and Frozen Inputs

**Files:**
- Create: `docs/verification/home-001/applications-aligned-gate8/prework-identity.json`

**Interfaces:**
- Consumes: D16 Git identity, Gate 6 handoff hashes, current Home/Chrome/SEO/CMS/SVG files.
- Produces: a machine-readable baseline used by preservation checks and the final receipt.

- [ ] Record repository root, worktree, branch, baseline HEAD, upstream, and porcelain status.
- [ ] Hash the authorized Home renderer/CSS and every frozen CMS, SEO, Chrome, and SVG input.
- [ ] Verify the three dispatched D23 hashes and record the rollback commit `616193f3dbf059f0e081c8d59119c008ba2b848b`.
- [ ] Run the existing focused Home/SEO/scope/Chrome test set and record the 63-test clean baseline.

### Task 2: Drive the Applications Visual Contract with Failing Tests

**Files:**
- Create: `tests/unit/homepage/malaysia-visual-unification.test.ts`
- Modify: `tests/unit/homepage/malaysia-template.test.tsx`
- Create: `tests/e2e/malaysia-homepage-visual-unification.spec.ts`

**Interfaces:**
- Consumes: the V1.1 visual tokens and `HOME-VU-A01..A11` conditions.
- Produces: source, DOM, viewport, accessibility, and visual-state assertions for the Home renderer.

- [ ] Add CSS source tests for the nine approved colors, 1200px shell, 14px/12px radii, card borders/shadows, light Documents section, rounded Deep Navy page RFQ, and 560px mobile breakpoint.
- [ ] Add DOM assertions for stable card hooks, decorative Hero image semantics, exact module order, exact Grade order/counts, exact href inventory, and shared Chrome reuse.
- [ ] Run only the new unit tests and confirm they fail because the old Home visual implementation lacks the new contract.
- [ ] Commit the red tests and pre-work evidence before editing production files.

### Task 3: Implement the Home-Owned Visual Update

**Files:**
- Modify: `components/sites/tio2-my/homepage/malaysia-homepage.tsx`
- Modify: `components/sites/tio2-my/homepage/malaysia-homepage.module.css`

**Interfaces:**
- Consumes: unchanged `MalaysiaHomepageDto`, `MalaysiaGlobalHeader`, `MalaysiaGlobalFooter`, and `ResponsiveProductGroups` interfaces.
- Produces: Applications-aligned Home body markup with stable evidence hooks and responsive CSS.

- [ ] Add Home-only shell/card classes and data hooks without changing text, destinations, ordering, semantics, or shared Chrome calls.
- [ ] Replace mixed full-bleed body styling with the approved shell, surface, card, Hero media, section rhythm, and page RFQ rules.
- [ ] Keep desktop/tablet product groups expanded in four or two columns and mobile groups collapsed as native disclosures.
- [ ] Ensure 390/320 page RFQ uses `display:none` while shared Header/Menu/Footer RFQ remains untouched.
- [ ] Run the new tests to green, then run the original 63-test focused baseline and targeted lint/type checking.
- [ ] Commit the implementation.

### Task 4: Build and Verify the Locked Runtime

**Files:**
- Create: `playwright.home-001-app-align.config.ts`
- Update: `tests/e2e/malaysia-homepage-visual-unification.spec.ts`
- Create: `docs/verification/home-001/applications-aligned-gate8/runtime/*.json`

**Interfaces:**
- Consumes: the implementation commit and a scoped local CMS/runtime.
- Produces: a build ID, loopback URL, viewport metrics, Axe results, route statuses, and seven runtime image files.

- [ ] Build with `SITE_ID=tio2-my` into a unique `.next-home-001-app-align` directory and capture the Build ID.
- [ ] Start the exact implementation commit on an unused `127.0.0.1` port with an isolated output directory.
- [ ] Run Playwright at 1440/1024/768/390/320 and assert layout, overflow, Hero media, Start Here, products, page RFQ, focus/targets, content/hrefs, SEO, scope markers, and serious/critical Axe count.
- [ ] Capture full-page images at all five widths plus 390 Menu-open and 390 Products-expanded.
- [ ] Open all seven images at original detail and record visual review results.

### Task 5: Prove Preservation and Prepare Gate 9 Handoff

**Files:**
- Create: `docs/verification/home-001/applications-aligned-gate8/preservation-report.json`
- Create: `docs/verification/home-001/applications-aligned-gate8/gate8_evidence_manifest.json`
- Create: `docs/verification/home-001/applications-aligned-gate8/GATE8_HANDOFF_RECEIPT.md`

**Interfaces:**
- Consumes: baseline hashes, test/build/runtime outputs, screenshots, and exact implementation commit.
- Produces: a schema-valid evidence set mapped to `HOME-VU-A01..A12` and held for Gate 9.

- [ ] Re-hash CMS JSON, SEO, JSON-LD, shared Chrome, responsive disclosure, and SVGs; require byte identity for every frozen file.
- [ ] Record external route liveness without changing any Home href or implementing missing destinations.
- [ ] Create the manifest with exact repository/branch/baseline/implementation/evidence HEAD/Build/runtime identities, hashes, commands, acceptance mappings, open items, and `GATE9_PASS_OR_RETURN_NOTICE` hold.
- [ ] Create one `EVIDENCE: <repo-relative-path>` line for every manifest receipt reference and require exact set equality.
- [ ] Run the D23 manifest validator and two-round Gate 9 preflight; fix evidence-only defects without changing the locked implementation.
- [ ] Commit the evidence and receipt, confirm final status, and return exact identities to project control without claiming Gate 9 approval.
