# Trade freshness integration final review

Date: 2026-09-08\
Site: `tio2-my`\
Pages: `RES-TRADE-EU`, `RES-TRADE-UK`, `RES-TRADE-IN`, `RES-TRADE-BR`

## Review outcome

The seven freshness findings in the earlier `.tmp/editorial-freshness-review.md` are now addressed for the bounded Gate 8 implementation.

| Earlier finding | Current control |
|---|---|
| A hand-written `verified` value was not bound to evidence | The exact 13-key review is bound to site, Page ID, Gate 6 package SHA-256, freshness report SHA-256, check timestamp, evidence date, Kuala Lumpur timezone, bounded outcome and page policy. Unknown keys fail. |
| A warmed Resources Hub could outlive an article | WordPress removes an invalid Trade relation with the same review validator. Next repeats the decision after Hub transport by issuing the private, no-store editorial check. Review webhooks include both the article and `/resources`, and revalidation covers both editorial and Hub tags. |
| Existing records had no review-update path | The guarded single-page updater supports read-only Plan, Apply, persisted before/after history, exact resolver readback and compensating rollback verification without writing the approved body. |
| Invalid, old or caller-selected dates could pass | Both runtimes validate real calendar dates, enforce baseline ≤ evidence ≤ site-local today, validate the evidence timestamp, derive the 30-day limit and cap the due date at 2026-10-07. |
| Expiry used UTC | Both runtimes use `Asia/Kuala_Lumpur`; the current record stops passing at 2026-10-08 00:00 MYT. |
| Internal review provenance was publicly queryable | WordPress requires the exact private editorial token outside WP-CLI. Next sends it only from the server and does not expose review evidence in rendered content or a public API projection. |
| Suppression had no safe diagnostic reason | The server now logs only `freshness`, `contract` or `upstream` with site scope and Page ID before suppression. It never logs the caught message, hashes, evidence path or review object. The public response remains fact-free. |

The review status means only `NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK`. It is not a legal conclusion and does not claim that inaccessible official paths were checked. `unverified`, `withdrawn` and `event_pending` fail closed. The four policies retain their distinct event-trigger lists in the trusted local evidence manifest.

The evidence manifest can be revised through a controlled audited change without rewriting body HTML while the resulting due date remains within the approved 2026-10-07 cap. Extending that cap requires a newly approved content contract.

## Live guarded update exercise

The exercise used only the isolated `tio2my9` local WordPress stack on port 8186.

1. Resolved `RES-TRADE-EU` through the existing editorial resolver and snapshotted the review, history count and body SHA-256.
2. Changed only the review status to `withdrawn` and confirmed the validator rejected it.
3. Ran the guarded updater in Plan. It reported `changeRequired:true`, stored withdrawn state and the exact incoming trusted review.
4. Ran Apply to restore the trusted review.
5. Read back the review through both post meta and the resolver, and read back the persisted history.

Final state: `verified`, `no_open_trigger`, due 2026-10-07. History count is 1 and records `withdrawn` → `verified`. The editorial body stayed byte-identical with SHA-256 `071b8d1dc53eca3f6956e1db19ce9067a306f8c3a0b5d676f6cb24866a0abb77`. No other CMS record was changed.

The exercise also exposed an invalid delimiter in the in-progress internal-link readiness regex at `wordpress/plugins/tio2-site-model/includes/editorial-v01.php:110`. Its owning implementer corrected the delimiter to `~href="(/[^"?#]*)"~`, extracted the path parser and added focused WP probe assertions. The probe and PHP 8.3 lint passed after the correction.

## Verification

- Combined TypeScript freshness, delivery, Hub, route diagnostic, Resources dynamic request and revalidation regression tests: 6 files, 135 tests passed.
- PHP parity probe: 17 cases passed, including all four pages, invalid/old/future dates, future timestamps, altered hashes, unknown keys, non-current states and both sides of Kuala Lumpur midnight.
- PHP 8.3 syntax checks passed for the validator, updater and parity probe.
- `npm run typecheck` passed after generating current route types.
- ESLint passed for the changed TypeScript implementation and tests.
- The local freshness artifact independently hashes to `A40568E5A4A9EFE636D7DAB86E488A918B44A1D4DFE92AEAC4837A49A786329E`.
- Read-only updater Plan passed for all four Trade pages with exact `verified`, `no_open_trigger`, due 2026-10-07 review records.

A broad concurrent-worktree test snapshot completed with 2,514 passed, 48 skipped and 12 failures. Two directly related files were then corrected and pass in the 135-test focused run: `tests/integration/api/revalidate.test.ts` and `tests/integration/resources/malaysia-resource-hub-route.test.tsx`. The remaining snapshot failures were outside this freshness scope in:

- `tests/infrastructure/site-a-editorial-draft-import-contract.test.ts`
- `tests/integration/wordpress/site-a-product-audit-runtime.test.ts`
- `tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts`
- `tests/unit/app/document-language.test.tsx`
- `tests/unit/markets/malaysia-market-template.test.tsx`
- `tests/unit/products/malaysia-product-detail-template.test.tsx`

Those failures were not changed here; some were being updated concurrently by their owning agents. This report does not treat the historical broad-suite snapshot as a repository-wide pass.
