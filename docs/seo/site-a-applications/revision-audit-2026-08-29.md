# Review Remediation Audit — 2026-08-29

## Scope

- Audited package: `D:\16Wordpress_nextjs\docs\seo\site-a-applications\`
- Research scope: TIOVAR Site A Applications only.
- Market statement: `US baseline + international English terminology review`.
- No page code, WordPress content, approved copy, route, deployment, DNS, indexing, or Site B file was changed.
- Git commit: not created; package is awaiting review.

## Consistency results

| Check | Result | Detail |
|---|---:|---|
| Mapping records | Pass | 28 records. |
| Unique `pageId` | Pass | 28 of 28 unique. |
| Unique target-query ownership | Pass | 28 of 28 normalized `targetQuery` values unique. |
| Frozen hierarchy | Pass | 1 Hub, 6 Categories, 21 Details. |
| Frozen IA comparison | Pass | 0 differences in `pageId`, `path`, `level`, or `parentId` versus `D:\11SEO\01ComInfo\outputs\site-a-applications-v0.1.json`. |
| Specific evidence resolution | Pass | 56 primary references resolve against 126 unique `observationId`, `queryObservationId`, and `serpAuditId` values; 0 missing and 0 duplicate evidence IDs. |
| Manufacturer in page-usable mapping records | Pass | 0 matches across all 28 page records, including target, title, H1, variants, commercial terms, anchors, and placement guidance. |
| Manufacturer research-only status | Pass | 4 root-level queries; all marked `research-only / prohibited for on-page claims`. |
| Exact-match rule | Pass | 28 of 28 records have `mustUseExactMatch: false`; no mechanical primary-placement field remains. |
| Variant count semantics | Pass | 71 candidates reviewed; 30 decision-related variant observations archived. |
| Volume semantics | Pass | `measured` (including numeric zero) and `unavailable` remain distinct. |
| Low-confidence pages | Pass | 3: Soft PVC / Solar Backsheet, Powder / Coil Coatings, Functional Materials. Their split triggers remain in the risk register. |
| JSON parsing | Pass | Both JSON files parse successfully. |
| File scope | Pass | Revision writes are confined to the audited package directory. Existing unrelated repository status entries were not touched. |

## Exact-query remediation

The exact review batch is `SEM-US-20260829-EXACT-REVIEW`; its screenshot is `evidence/semrush/semrush-us-exact-review-2026-08-29.png`.

| Target or reviewed query | Specific evidence | Outcome |
|---|---|---|
| `titanium dioxide pigment for solar module films` | `SEMOBS-US-REVIEW-001`, `SERPAUDIT-SOLAR-CATEGORY-20260829` | Selected for Solar Film Category at medium confidence. |
| `titanium dioxide for photovoltaic films` | Rejected in `DEC-APP-006`; competing intent recorded in `SERP-20260829-SOLAR-AMBIGUITY` and the Solar audit | Downgraded/rejected because of deposited-film, photoanode, ETL, and photovoltaic-material research intent. |
| `UV resistant titanium dioxide for engineering plastics` | `SEMOBS-US-REVIEW-005`, `SERPAUDIT-UV-ENGINEERING-PLASTICS-20260829` | Retained at medium confidence with natural-copy guidance. |
| `low ion titanium dioxide for electrophoretic coatings` | `SEMOBS-US-REVIEW-006`, `SERPAUDIT-ECOAT-20260829` | Retained at medium confidence; coating-pigment context must be explicit. |
| `titanium dioxide pigment for automotive coatings` | `SEMOBS-US-REVIEW-007`, `SERPQ-AUTO-001` | Retained at medium confidence. |
| `multi-purpose titanium dioxide` | `SEMOBS-US-REVIEW-008`, `SERPQ-MULTIPURPOSE-001` | Retained at medium confidence. |
| `high purity titanium dioxide for functional materials` | `SEMOBS-US-REVIEW-009`, `SERPAUDIT-FUNCTIONAL-MATERIALS-20260829` | Retained at low confidence because the frozen page combines multiple submarkets. |

## High-risk SERP samples

- Solar Category: 10 results recorded.
- Soft PVC / Solar Backsheet: 10 results recorded.
- Powder / Coil Coatings: 10 results recorded.
- Functional Materials: 8 results recorded.
- Electrophoretic Coating: 8 results recorded.
- UV-resistant Engineering Plastics: 8 results recorded.

Every audit stores result URL, result type, intent class, distribution, and conclusion.

## Solar three-page ownership boundary

| Page | Target ownership | Boundary and recommended anchor direction |
|---|---|---|
| Solar Film Category | `titanium dioxide pigment for solar module films` | Family discovery and routing for pigment used in polymer/module films. Parent/Hub anchor: `TiO2 pigment for solar module films`. |
| Photovoltaic White Film Detail | `titanium dioxide for photovoltaic white film` | Owns white EVA/POE film, reflectance, loading, thickness, dispersion, and exposure validation. Category anchor: `TiO2 for photovoltaic white film`. |
| Soft PVC / Solar Backsheet Detail | `titanium dioxide for soft PVC` | Owns soft/flexible PVC. Solar backsheet is a discrete secondary section and split trigger, not the page target. Solar-side anchor: `TiO2 for solar backsheet and soft PVC film`. |

## Files changed by this revision

- `README.md`
- `methodology.md`
- `site-a-applications-keyword-map.json`
- `keyword-evidence.json`
- `keyword-decision-log.md`
- `cannibalization-register.md`
- `evidence/semrush/README.md`
- `evidence/serp/README.md`
- `evidence/semrush/semrush-us-exact-review-2026-08-29.png` (new evidence)
- `revision-audit-2026-08-29.md` (this report)

## Remaining human review

1. Approve the Solar Category's revised family wording before the later copy task adopts the recommended Title/H1 variants.
2. Decide after Search Console data whether Soft PVC and Solar Backsheet warrant separate URLs.
3. Decide after demand and content-depth review whether Powder and Coil Coatings warrant separate URLs.
4. Decide whether Optical Glass, Battery Materials, and other Functional Materials have enough distinct approved content and demand for separate pages.
5. Reconfirm the prohibition on TIOVAR manufacturer claims during the later copy-writing and structured-data review.
