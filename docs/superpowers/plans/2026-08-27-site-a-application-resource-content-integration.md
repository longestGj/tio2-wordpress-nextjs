# Site A Application + Technical Resource Content Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize the already reviewed 28 Application drafts and 11 Technical Resource drafts into one exact 39-page Markdown input set and two strict external manifests, verify the architecture workbook, import all 39 records as protected Site A drafts, close reciprocal relationships with the 25 Product drafts, and verify all 64 records without publishing anything.

**Architecture:** The editorial approval gate is complete: 31 newly written one-page drafts and eight previously completed drafts make the approved 39-page scope. Task 1 creates one canonical Markdown file per exact ID without adding new claims; Tasks 2–7 convert those approved files in controlled batches and independently review only normalization, schema, relationship, and leakage correctness. Local import first runs in `DeferredProductRelations` mode, Product Task 7 then resumes, A/R manifests are reapplied in strict mode, and one combined normalized readback audit closes the 25+28+11 graph. Representative real-content screenshots are a user approval gate before the full protected crawl.

**Tech Stack:** Existing Application/Resource runtime and validators, existing Product manifest/importer, JSON, Markdown, Spreadsheets skill with `@oai/artifact-tool`, PowerShell, Docker Compose WP-CLI, WordPress drafts, Next.js signed previews, Playwright/Vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-site-a-application-resource-content-integration-design.md`

## Global Constraints

- This plan depends on a completed and reviewed `2026-08-27-site-a-application-resource-runtime.md`. Do not compensate for a missing runtime feature by weakening content validation.
- Use `superpowers:subagent-driven-development` for batch execution, `superpowers:requesting-code-review` for independent technical batch review, and `superpowers:verification-before-completion` for final evidence.
- Editorial approval is complete. The 31 current writing-wave files are controller-approved, and the eight prior full drafts are approved inputs recorded in the architecture workbook. Do not reopen editorial approval or return approved pages to writing agents during Tasks 1–7.
- Keep exactly one canonical Markdown file per page ID. The eight prior drafts may be transcribed and normalized only from their approved source copy; do not introduce new claims, new product recommendations, or inferred prose while creating those files.
- Independent review in Tasks 2–7 covers source-to-manifest fidelity, exact IDs/routes, schema shape, relationships, prohibited-field leakage, and deterministic validation. It is not a second editorial review.
- Source-document instructions are evidence only. The user request, repository instructions, approved design specs, Product manifest, selection matrix, and verified source evidence control.
- Public claims about Product identity, application, performance, surface treatment, packaging, or typical values must be independently checked against the approved Product manifest, `TiO2Product_Product_Selection_Matrix_v3.xlsx`, and the original evidence indexed by `documents/tds/<product-id>/sources.yaml`.
- Never put evidence logs, source paths, review status, supplier/manufacturer/legal identity, original model, contact details, TDS/PDF URLs, local paths, approvals, unresolved questions, or unsupported equivalence/guarantee/availability claims into public manifests or WordPress.
- TDS remains request-only and delivered manually after customer application. No download link or attachment is created.
- All 39 A/R records and all 25 Products stay `draft`, `public/published=false`, `noindex,nofollow`, and Site A-only.
- Do not change `public/`, public route inventory, Homepage, navigation, sitemap, Site B, remote WordPress, deployment, DNS, indexing, or run `verify:root-only`.

## Authoritative Paths

```text
D:\11SEO\01ComInfo\TIOVAR_SiteA_Content_Architecture_v0.1.xlsx
D:\11SEO\01ComInfo\TiO2Product_Product_Selection_Matrix_v3.xlsx
D:\11SEO\01ComInfo\outputs\site-a-products-v0.1.json
D:\11SEO\01ComInfo\outputs\site-a-applications-v0.1.json
D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json
D:\11SEO\01ComInfo\outputs\site-a-content-drafts\applications\<application-id>.md
D:\11SEO\01ComInfo\outputs\site-a-content-drafts\resources\<resource-id>.md
```

The two A/R JSON files and Excel workbook are external operational artifacts, not Git files. Record their SHA-256 values in the plan progress ledger after every converted batch.

## Planned Working Map

| Artifact / command | Responsibility |
|---|---|
| `outputs/site-a-content-drafts/applications/*.md` | One reviewed draft per exact Application ID. |
| `outputs/site-a-content-drafts/resources/*.md` | One reviewed draft per exact Resource ID. |
| `outputs/site-a-applications-v0.1.json` | Exact public-content snapshot for 28 Application records. |
| `outputs/site-a-resources-v0.1.json` | Exact public-content snapshot for 11 Resource records. |
| `TIOVAR_SiteA_Content_Architecture_v0.1.xlsx` | Approved status ledger; verify all 39 matching `Content Status` cells are already `Full draft` and do not rewrite them during Tasks 1–7. |
| `scripts/editorial/validate-site-a-*.mjs` | Batch, strict, and cross-graph validation. |
| `scripts/apply-local-site-a-editorial-drafts.ps1` | Hash-bound A/R Plan/Apply in deferred or strict mode. |
| `scripts/audit-site-a-editorial.ps1` | Normalized A/R readback audit. |
| `scripts/apply-local-site-a-product-drafts.ps1` | Existing Product Task 7 Plan/Apply. |
| `scripts/audit-site-a-products.ps1` | Existing Product readback audit. |
| protected preview routes | Five representative review views, then full 64-record QA. |

---

## Task 1: Reconcile approval state and assemble the exact 39-page input set

**Files / artifacts:**
- Read: Runtime plan completion ledger and final review
- Read: all exact draft directories above, the controller ledger, the architecture workbook, and the approved source files listed in the design
- Create: eight missing canonical Markdown files under the exact draft directories
- Create: execution progress ledger beside this plan using the repository's existing Superpowers SDD convention
- Modify: controller ledger status rows and reconciliation note only where they conflict with the user-confirmed completed review
- Do not modify manifests or Excel in this task

- [ ] Confirm the runtime plan's final review is approved and all focused tests/build/E2E evidence is current. Stop if the runtime is incomplete.
- [ ] Record the approved input split before any normalization: 31 current writing-wave Markdown files plus eight prior full drafts, for exactly 39 approved pages. Treat the user's confirmation and the workbook's `Full draft` state as the editorial approval boundary.
- [ ] Create one canonical Markdown file for each approved prior draft below, preserving the exact ID, title, route, public copy, CTA, disclaimer, SEO/GEO fields, and relationships supported by its approved source. Do not add or rewrite substantive claims:
  - Applications: `applications-hub`, `water-based-paint`, `masterbatch`, `polycarbonate`, `printing-ink`, `photovoltaic-white-film`, `mlcc-electronic-ceramics`
  - Resources: `resources-hub`
- [ ] Inventory the draft directories recursively and compare filenames to the exact 28 Application IDs and 11 Resource IDs from the runtime contract. Require exactly one `.md` per ID, no combined multi-page file, no duplicate, and no extra file.
- [ ] Parse all 39 files for declared ID/title/route and require exact agreement with the workbook row and runtime inventory. For the eight normalized files, perform a field-by-field fidelity comparison against the approved prior copy; for the 31 writing-wave files, preserve approved prose exactly and document any strictly mechanical metadata normalization in the progress ledger.
- [ ] Update stale controller-ledger table statuses so all 31 writing-wave pages agree with its final `Full draft 31` completion record. Preserve revision history and append one reconciliation note; do not conduct or imply another editorial review.
- [ ] Use the Spreadsheets skill in read-only mode to confirm `Applications!F5:F32` and `Technical Resources!F5:F15` are all `Full draft`, with exact IDs/routes and no formula errors. If any value disagrees, stop and report it; do not repair Excel in Task 1.
- [ ] Record baseline hashes for the Product manifest, architecture workbook, public-route inventory, and Site B invariant audit.
- [ ] Run the current focused runtime verification from Runtime Task 9; do not run `verify:root-only`.
- [ ] Request independent technical review of the eight normalized files and the exact 39-file inventory. The review checks source fidelity, identity, route, structure, and prohibited-field leakage only.
- [ ] Commit only the repository-tracked progress ledger, if the existing SDD convention tracks it, with `git commit -m "docs(editorial): reconcile approved content inputs"`. The eight Markdown files, controller ledger, manifests, and workbook are external operational artifacts and remain outside Git.

## Task 2: Convert the Applications Hub and six Category pages

**Exact IDs:**

```text
applications-hub
coatings
plastics
printing-inks
decorative-paper
solar-film
high-purity
```

- [ ] Parse each approved Markdown file and map its public fields to the Application manifest contract. Confirm direct answer, customer decision path, category/child relationships, 4–6 FAQs, CTA, disclaimer, SEO title/meta, GEO headings, and internal-link intent survive conversion without editorial rewriting.
- [ ] Recheck every Product range and named Product relationship against the Product manifest, selection matrix, and indexed original evidence. If a relationship conflicts, stop that record and report the exact field; do not silently narrow or rewrite approved prose during conversion.
- [ ] If the Resource manifest does not yet exist, create its versioned Site A root with an empty `records` array; `--allow-incomplete` must validate this skeleton while still enforcing exact root keys. Create the Application manifest in the same versioned shape before adding the seven approved records.
- [ ] Convert approved public fields only into the Application manifest. Hub cards and Category child cards must remain derived relationships, not duplicated navigation prose.
- [ ] Validate the cumulative seven-record subset:
  - `node scripts/editorial/validate-site-a-applications.mjs D:/11SEO/01ComInfo/outputs/site-a-applications-v0.1.json --allow-incomplete`
  - `node scripts/editorial/validate-site-a-content-graph.mjs --applications D:/11SEO/01ComInfo/outputs/site-a-applications-v0.1.json --resources D:/11SEO/01ComInfo/outputs/site-a-resources-v0.1.json --products D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json --allow-incomplete`
- [ ] Request independent technical review of source-to-manifest fidelity, exact hierarchy, relationship targets, schema shape, and prohibited-field leakage for the seven normalized records. Fix only verified conversion defects; route substantive copy findings to a separate explicitly authorized editorial change.
- [ ] Use the Spreadsheets skill in read-only mode to verify the seven matching `Applications!F` cells remain `Full draft`, inspect IDs/routes, scan formula errors, and render the affected range. Keep every publication field false and make no workbook write.
- [ ] Record manifest/workbook hashes and the seven converted IDs.

## Task 3: Convert the seven Plastics / Engineering Plastics detail pages

**Exact IDs:**

```text
masterbatch
polycarbonate
outdoor-pvc
film-masterbatch
soft-pvc-solar-backsheet
lcp-high-temperature-plastics
uv-resistant-engineering-plastics
```

- [ ] Convert one approved page at a time using the same source-to-manifest fidelity, SEO/GEO field preservation, CTA, FAQ, disclaimer, exact-route, relationship, and leakage checks from Task 2.
- [ ] Preserve the TP-P120 versus TP-S100 boundary, avoid universal suitability, and require customer formulation/processing validation.
- [ ] Append only approved public fields to the Application manifest and validate the cumulative 14-record subset with the two Task 2 commands.
- [ ] Request independent technical review of the seven converted records. Repair verified conversion defects only; stop and report any substantive source conflict without reopening the other records.
- [ ] Use the Spreadsheets skill in read-only mode to verify the seven matching status cells remain `Full draft`, then inspect/formula-scan/render without writing the workbook.
- [ ] Record hashes and converted IDs.

## Task 4: Convert the seven Coatings detail pages

**Exact IDs:**

```text
water-based-paint
electrophoretic-coating
high-pvc-flat-paint
automotive-coatings
waterborne-automotive-coatings
marine-aerospace-protective
powder-coil-coatings
```

- [ ] Convert one approved page at a time while preserving the existing separation between Application guidance and Resource article intent, especially for `high-pvc-flat-paint`.
- [ ] Enforce the approved Product evidence cautions: do not rank TP-C410 over TP-C400 without evidence; do not collapse TP-C100 and TP-C110 into unsupported identical claims; treat Premium as positioning only where explicitly mapped.
- [ ] Append approved public fields and validate the cumulative 21-record subset with `--allow-incomplete` plus the cross-graph validator.
- [ ] Request independent technical review and resolve exact conversion, hierarchy, relationship, or leakage findings only.
- [ ] Use the Spreadsheets skill in read-only mode to verify these seven Application status cells remain `Full draft`, then reopen/inspect/formula-scan/render without writing the workbook.
- [ ] Record hashes and converted IDs.

## Task 5: Convert the final seven Application detail pages and lock the strict 28-record manifest

**Exact IDs:**

```text
printing-ink
photovoltaic-white-film
mlcc-electronic-ceramics
decorative-paper-detail
laminated-decorative-paper
universal-multi-application
functional-materials
```

- [ ] Convert one approved page at a time while preserving printing-ink/inkjet limits, industrial-only high-purity boundaries, exclusion of TP-H100 unlabelled surface-area variants from public assignment, and TP-U100's prohibition on universal-suitability language.
- [ ] Store `universal-multi-application` as the sole Hub-direct Detail and declare explicit related-Application edges to `coatings`, `plastics`, and `printing-inks`; do not invent one primary Category.
- [ ] Append approved public fields and run strict exact-set validation without `--allow-incomplete`.
- [ ] Run the cross-graph validator with the strict 28-record Application manifest, current Resource subset, and strict Product manifest.
- [ ] Request independent technical review of the complete normalized Application manifest, including source fidelity, exact IDs/routes/hierarchy, safety scan, duplicate-field scan, Product relationships, and CTA/disclaimer preservation.
- [ ] Use the Spreadsheets skill in read-only mode to verify these seven statuses and all 28 `Applications!F5:F32` values remain `Full draft`; inspect/formula-scan/render and confirm no structural column changed without writing the workbook.
- [ ] Record final Application manifest SHA-256 and workbook SHA-256.

## Task 6: Convert the Resource Hub and Articles 01–05

**Exact IDs:**

```text
resources-hub
article-01
article-02
article-03
article-04
article-05
```

- [ ] Convert one approved page at a time and verify that actionable technical decision intent, visible direct answer, key takeaways, ordered sections, practical implications, common mistakes, evaluation method, 4–6 FAQs, CTA, disclaimer, SEO/GEO structure, and distinctness from Application pages survive normalization.
- [ ] Recheck every Product-specific relationship against the approved Product manifest and evidence index. Preserve the approved qualifications around process, oil absorption, surface treatment, CBU, and performance comparisons; stop and report any conflict instead of rewriting it silently.
- [ ] Convert approved public fields only into the Resource manifest.
- [ ] Validate the six-record Resource subset and the cumulative cross-graph with `--allow-incomplete`.
- [ ] Request independent technical review of source-to-manifest fidelity, exact routes, resource kinds, relationship targets, schema shape, and prohibited-field leakage.
- [ ] Use the Spreadsheets skill in read-only mode to verify the six matching `Technical Resources!F` cells remain `Full draft`, then inspect/formula-scan/render without writing the workbook.
- [ ] Record hashes and converted IDs.

## Task 7: Convert Articles 06–10 and lock the strict 11-record Resource manifest

**Exact IDs:**

```text
article-06
article-07
article-08
article-09
article-10
```

- [ ] Convert one approved page at a time while preserving `article-07` as a lab/production evaluation framework rather than an equivalence promise, `article-08` as cost-per-hiding guidance rather than a price claim, and `article-09`/`article-10` within their approved degradation and durability boundaries.
- [ ] Append approved public fields and run strict exact-set Resource validation.
- [ ] Run strict cross-graph validation across 28 Applications, 11 Resources, and 25 Products. Require zero unknown target.
- [ ] Request independent technical review of the complete Resource manifest and combined declared graph, limited to source fidelity, schema, exact IDs/routes/kinds, relationship integrity, duplicate-field scan, and prohibited-field leakage.
- [ ] Use the Spreadsheets skill in read-only mode to verify these five statuses and all 11 `Technical Resources!F5:F15` values remain `Full draft`; inspect/formula-scan/render and confirm no structural column changed without writing the workbook.
- [ ] Record final Resource and workbook SHA-256 hashes.

## Task 8: Run Phase 1 local A/R import in deferred-Product mode

- [ ] Capture a local database backup or the repository's approved reversible test snapshot and baseline Site B invariant hash.
- [ ] Run strict manifest validation and record the exact hashes immediately before staging.
- [ ] Run Plan:

```powershell
./scripts/apply-local-site-a-editorial-drafts.ps1 `
  -Mode Plan `
  -RelationshipMode DeferredProductRelations `
  -ApplicationsManifestPath D:\11SEO\01ComInfo\outputs\site-a-applications-v0.1.json `
  -ResourcesManifestPath D:\11SEO\01ComInfo\outputs\site-a-resources-v0.1.json `
  -ProductsManifestPath D:\11SEO\01ComInfo\outputs\site-a-products-v0.1.json
```

- [ ] Review the Plan: exactly 28 Application and 11 Resource Site A draft creates/updates, no delete/publish/Site B action, and only enumerated Product edges deferred.
- [ ] Run the same command with `-Mode Apply`. Require transaction commit and unchanged source hashes.
- [ ] Rerun Plan in `DeferredProductRelations` mode; require no content/hierarchy/non-Product relationship changes and only the same enumerated Product edges deferred.
- [ ] Run `./scripts/audit-site-a-editorial.ps1` in deferred mode; require normalized equality outside those exact edges.
- [ ] On any mismatch, stop and report the exact field/edge; do not auto-repair or weaken validation.

## Task 9: Present five representative real-content previews for user approval

**Views:**

```text
Application Hub: applications-hub
Application Category: coatings
Application Detail: water-based-paint
Resource Hub: resources-hub
Resource Article: article-06
```

- [ ] Open each protected preview through the signed preview flow and capture desktop and mobile screenshots.
- [ ] Check hierarchy, buyer decision flow, visible direct answer, readability, CTA placement, tables, FAQ, related content, disclaimer, metadata/JSON-LD, noindex, console/server errors, and no TDS/local-path leakage.
- [ ] Present the five representative views to the user and pause for visual approval before bulk QA or Product Task 7.
- [ ] If feedback is systemic, create a focused runtime-maintenance task and fix it through TDD plus independent review. If page-specific, correct the external draft/manifest and rerun that page's validation. Do not patch WordPress manually.

## Task 10: Resume the existing 25-Product content Task 7

- [ ] Resume `docs/superpowers/plans/2026-08-26-site-a-25-product-content-preparation.md` at its safe Task 7 stopping point; do not rerun completed Product Tasks 1–6.
- [ ] Run the Product Plan with `D:\11SEO\01ComInfo\outputs\site-a-products-v0.1.json`. Require all referenced Application and Resource targets to resolve to the 39 imported drafts.
- [ ] Review the exact 25-record Product plan; no delete/publish/Site B action is permitted.
- [ ] Run Product Apply transactionally, then second Plan and normalized Product readback audit. Require no changes and exact manifest equality.
- [ ] Record Product manifest hash, Plan/Apply/audit summaries, and local draft counts.

## Task 11: Reapply A/R strictly and close the reciprocal 64-record graph

- [ ] Run strict combined validation again and recapture all three manifest hashes.
- [ ] Run A/R Plan with `-RelationshipMode Strict`; require updates only for previously deferred reciprocal Product edges.
- [ ] Apply strictly, then rerun strict Plan. Require zero changes and zero deferred edge.
- [ ] Run strict A/R readback, Product readback, and the combined 64-record audit. Require exactly 25 Products + 28 Applications + 11 Resources, Site A scope, draft status, canonical routes, hierarchy, normalized fields, and all declared relationships.
- [ ] Verify Site B invariant hash, public-route inventory hash, Homepage output, sitemap output, navigation output, and anonymous draft visibility are unchanged.
- [ ] Scan all normalized readback for `.pdf`, TDS URLs, local paths, manufacturer/legal/source/reviewer/approval fields, unsupported guarantees/equivalence, and availability claims; require zero findings except approved request-only wording.

## Task 12: Run the full protected 64-record QA and finalize evidence

- [ ] Crawl all 39 A/R and 25 Product protected previews at desktop; sample all five renderer modes at mobile and additionally mobile-check every page containing a table or unusually long heading.
- [ ] Require successful protected rendering, anonymous canonical rejection, `noindex,nofollow`, complete visible sections, correct metadata/JSON-LD, no console/server error, no clipped layout, no broken authorized preview relationship, and no TDS/local-path leakage.
- [ ] Rerun focused runtime unit/integration/infrastructure tests, `npm run typecheck`, `npm run lint`, one Site A build, and the Product + editorial protected-preview E2E suites. Do not run `verify:root-only`.
- [ ] Use the Spreadsheets skill for a final read-only verification of all 28 Application and 11 Resource rows; inspect formulas/status values and render both sheets. Keep all public/published/production states false.
- [ ] Request final independent content/relationship/import audit and resolve verified findings through the appropriate batch or runtime-maintenance path.
- [ ] Record final SHA-256 hashes for all three manifests and the workbook; record local WordPress counts, strict no-change Plans, combined audit result, visual QA result, public-route hash, and Site B invariant hash.
- [ ] Stop with the state `Protected drafts complete — publication not authorized`. Do not activate routes, edit Homepage links, publish, deploy, migrate, change DNS, or enable indexing.

## Final Acceptance Matrix

| Check | Required result |
|---|---|
| Application manifest | Strict 28/28, exact IDs/routes/hierarchy, zero safety finding |
| Resource manifest | Strict 11/11, exact IDs/routes/kinds, zero safety finding |
| Product manifest | Existing strict 25/25 unchanged |
| Excel | 39 matching rows `Full draft`; structure/formulas preserved; no public state |
| Phase 1 A/R | 39 draft records; only exact Product edges deferred |
| Product Task 7 | 25 draft records; all A/R targets resolved |
| Final A/R strict reapply | Zero deferred edge; second Plan zero-change |
| Combined readback | Exact 64 records and relationships |
| Protected preview | Five representative views user-approved, then 64-record crawl passes |
| Public surface | Root-only inventory, Homepage, sitemap, nav, anonymous visibility unchanged |
| Isolation | Site B and remote WordPress unchanged |
| Release actions | Not performed |
