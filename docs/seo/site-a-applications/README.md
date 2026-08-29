# Site A Applications Keyword Research

## Status

- Scope: TIOVAR Site A Applications only.
- Information architecture: 1 Applications Hub, 6 Category pages, 21 Detail pages.
- Research date: 2026-08-29.
- Market: `US baseline + international English terminology review`; Semrush US is the quantitative comparison baseline and the UK check is a one-observation terminology pilot.
- Repository location: `D:\16Wordpress_nextjs\docs\seo\site-a-applications`.
- This package does not change WordPress content, approved claims, application-page copy, templates, routes, deployment, DNS, or indexing.

## Authority and use

The files in this directory are the SEO research and keyword-to-page mapping layer for the later Site A Applications copy-integration task. Existing WordPress content and the source JSON are references for page scope, approved facts, product relationships, and resource relationships; they are not treated as keyword evidence and are not rewritten here.

The approved representative fixture is newer than `D:\11SEO\01ComInfo\outputs\site-a-applications-v0.1.json` for `applications-hub`, `coatings`, and `water-based-paint`. The mapping therefore uses the frozen page IDs and paths, not the older Hub title as an SEO decision source.

## Files

- `site-a-applications-keyword-map.json`: machine-readable final mapping for all 28 pages.
- `keyword-evidence.json`: Semrush observations, public SERP source ledger, project references, and evidence IDs.
- `methodology.md`: research method, data rules, evidence grading, and update procedure.
- `keyword-decision-log.md`: selected target query and rejected alternatives for every page.
- `cannibalization-register.md`: conflicts, page-boundary rules, and future split risks.

## Trace path

Every page record in `site-a-applications-keyword-map.json` includes `decisionId`, `targetQuery`, and `primaryEvidenceRefs`.

```text
pageId
  -> decisionId in keyword-decision-log.md
  -> primaryEvidenceRefs in keyword-evidence.json
  -> unique observationId, queryObservationId, or serpAuditId
```

## Important data convention

- `volumeStatus: measured`: Semrush displayed a numeric value, including a displayed zero.
- `volumeStatus: unavailable`: Semrush did not provide a usable volume value. This is not converted to zero.
- Semrush observations are point-in-time browser observations and must be rechecked before a future major rewrite.
- Public SERP observations record the query, observation date, source URL, result type, and the inference made from the result set.
- The 71-variant review archives 30 decision-related structured observations; `71` is the candidate count, not the stored observation count.
- High-risk and low-confidence targets include 5–10-result SERP intent audits in `serpQueryAudits`.
- Manufacturer-shaped searches are research-only and prohibited for on-page titles, headings, copy, CTAs, structured data, and TIOVAR brand claims.

## Updating the package

When data is refreshed, preserve the old evidence record, add a new dated evidence record, and update the page mapping only if the search intent or page boundary has materially changed. Do not silently replace an unavailable value with zero, and do not change a page's target query solely because a higher-volume but differently intended query appears.
