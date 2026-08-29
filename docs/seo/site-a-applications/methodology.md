# Research Methodology

## 1. Objective

Assign one unique English target query to each of the 28 frozen Site A Applications pages, then define supporting, long-tail, question, and commercial-intent terms without changing the approved page facts or information architecture.

The quantified market scope is **US baseline + international English terminology review**. The UK observation is a terminology pilot, not a second fully quantified market, and this package does not claim global English-market quantification.

## 2. Evidence order

1. Current public SERP composition: determines the actual intent and result type.
2. Semrush Keyword Overview: supplements the decision with US baseline volume, KD, intent, CPC, and result-count observations, plus a limited UK terminology pilot.
3. Official producer/application and primary technical sources: confirm that an application is recognized by the market and reveal normal industry terminology.
4. Project content: confirms page scope, product relationships, technical-resource relationships, and approved factual boundaries.

Project content is not used to manufacture demand. A phrase appearing in WordPress or JSON is not treated as search evidence unless current search data or current SERPs support it.

## 3. Target-query ownership rules

- One unique `targetQuery` owner per page and no exact target-query duplicates.
- Hub owns the broad application-discovery query.
- Category pages own family-level discovery and commercial-investigation queries.
- Detail pages own application-, process-, resin-, or performance-qualified evaluation queries.
- Search intent and page fit outrank raw volume.
- A precise industrial term may be selected when Semrush volume is unavailable if the current SERP and the page scope are aligned.
- An ambiguous phrase is qualified with the material role or application context. Examples include `pigment`, `photovoltaic white film`, `low ion`, `e-coat`, or `engineering plastics`.
- A combined page receives only one target query. The other application is retained as a secondary cluster and documented as a split risk.

## 4. Intent model

- `informational-discovery`: identify application families or understand where TiO2 is used.
- `commercial-investigation`: compare suppliers, grades, products, or application fit.
- `technical-validation`: evaluate formulation, processing, testing, and finished-product requirements.
- `transactional-support`: request TDS, sample, quote, or technical discussion.

## 5. Customer decision stages

- `discover`: visitor is identifying the relevant application family.
- `explore`: visitor is comparing solution directions and subapplications.
- `shortlist`: visitor is selecting candidate grades or supplier options.
- `validate`: visitor is checking formulation, process, and final-product fit.
- `engage`: visitor is ready to request documentation, a sample, or a technical discussion.

## 6. Semantic placement model

- `targetQuery`: controls the page topic, intent, and ownership boundary; it is not a mechanical repetition instruction.
- `recommendedSeoTitle` and `recommendedH1`: natural, page-appropriate expressions of the target topic. They may differ from the exact query.
- `naturalCopyVariants`: approved semantic alternatives for headings and body copy.
- `mustUseExactMatch`: `false` for all current records. No long or awkward query must appear verbatim in the Title, H1, opening, and body.
- Supporting keywords: category overview, selection factors, product comparison, and related-application blocks.
- Long-tail keywords: technical selection criteria, resin/process notes, validation steps, and finished-product requirements.
- Question keywords: FAQ headings and concise answers.
- Commercial-intent keywords: product-starting-point section, documentation block, TDS/sample/quote CTA, and enquiry copy.
- Technical how-to and measurement terms: summarize briefly and link to the relevant Technical Resource instead of making the Applications page own the tutorial query.

Natural meaning, readability, factual accuracy, and page differentiation take priority over exact-match density.

## 7. On-page claim compliance

TIOVAR must not be described as a titanium dioxide manufacturer unless that status is separately verified and approved. On-page commercial language in this mapping is limited to compliant expressions such as `supplier`, `application-specific supplier`, `technical and supply support`, product documentation, sample request, and technical discussion.

Manufacturer-shaped queries may have competitive-research value, so a small set is retained only in the root-level `researchOnlyQueries` field with the explicit status `research-only / prohibited for on-page claims`. These queries must not be used in an SEO title, H1, body copy, CTA, structured data, or TIOVAR brand self-description. They are excluded from every page's commercial-intent keywords and copy recommendations.

## 8. Semrush procedure

- Tool: Semrush Keyword Overview opened in the Codex in-app browser using the existing authenticated session.
- Primary database: US.
- International terminology pilot: UK, one observation only.
- Date: 2026-08-29.
- Query sets: an initial set of 28 page-shaped phrases, 71 candidate variants, and an 11-query exact remediation batch.
- Of the 71 candidate variants, **30 decision-related observations are archived in structured form**. The remaining candidates were reviewed but are not represented as 71 stored observations.
- All visible rows were refreshed before recording the final observations.
- Numeric zero and unavailable volume are stored separately.
- Semrush is a supplement and audit source, not the sole basis for a target-query decision.
- Each stored observation has a unique `observationId`; page records cite the specific observation rather than only the containing batch.

## 9. SERP procedure

- Search current English results for the broad family term, the page-shaped exact term, and important variants.
- Give every stored query a unique `queryObservationId`.
- Classify representative results as producer/application page, product page, technical guide, research paper, patent, regulatory page, marketplace, or broad information.
- Prefer authoritative producer/application pages and primary technical sources when recording terminology and application recognition. Source type does not authorize a manufacturer claim about TIOVAR.
- Record intent ambiguity when the same phrase produces a materially different technology, such as TiO2 thin-film deposition instead of white pigment used in solar film.
- For high-risk and low-confidence targets, archive a 5–10-result intent sample with a unique `serpAuditId`, per-result type, intent class, distribution, and boundary conclusion.
- Point-in-time SERP samples support intent classification; they are not rank tracking or exhaustive market-share measurements.

## 10. Evidence grades

- `high`: Semrush signal and current SERP both support the page boundary, normally with authoritative producer/application results.
- `medium`: the SERP is aligned but volume is unavailable, or the phrase requires a qualifier to avoid an adjacent intent.
- `low`: sparse or mixed SERP, combined-page compromise, or material dependence on project terminology. Low confidence does not mean the page is invalid; it means the keyword should be rechecked earlier.

## 11. Solar Film boundary decision

The Category target is `titanium dioxide pigment for solar module films`, not `titanium dioxide for photovoltaic films`. The rejected phrase repeatedly overlaps deposited TiO2 films, photoanodes, electron-transport layers, photocatalysis, and solar-cell materials research. Adding both `pigment` and `solar module films` shifts the observed set toward polymer module films and backsheets while preserving a family-level category.

- Solar Film Category owns module-film application discovery and routing.
- Photovoltaic White Film Detail owns white EVA/POE film, reflectance, loading, dispersion, thickness, and exposure validation.
- Soft PVC / Solar Backsheet Detail owns `titanium dioxide for soft PVC`; solar backsheet is a discrete secondary section and split candidate.

The category remains medium confidence because its current results still skew technical and toward backsheets. `mustUseExactMatch: false` prevents an awkward keyword phrase from dictating copy.

## 12. Refresh triggers

Re-run the affected research when any of these occur:

- a page is split, merged, renamed, or moved;
- a primary product/application fact changes;
- the copy task proposes a different H1 or page promise;
- a Semrush refresh shows a material new demand pattern;
- the top results shift to a different dominant intent;
- Search Console later shows persistent cross-page impressions for the same query.
