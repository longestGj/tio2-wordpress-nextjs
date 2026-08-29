# SERP Evidence

The public source ledger is stored in `../../keyword-evidence.json`. Each stored query has a unique `queryObservationId`. High-risk and low-confidence targets additionally have a `serpAuditId` with 5–10 result URLs, result types, intent classes, a counted intent distribution, and a boundary conclusion.

Public result composition changes over time. On refresh, add a new dated evidence record rather than silently rewriting the previous observation.
