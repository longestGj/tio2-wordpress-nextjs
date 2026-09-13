# TiO2 Malaysia active GA4 Gate 8 handoff receipt

- Handoff ID: `G8-G9-TIO2-MY-GA4-ACTIVE-20260913-01`
- Gate 8 task ID: `D16-G8-TIO2-MY-GA4-ACTIVE-20260913-01`
- Site scope: `tio2-my`
- Branch: `codex/tio2-my-full-public-seo-ga4`
- Baseline commit: `b52702cf52a1eb6a8292db160920158a3def3eed`
- Implementation commit: `30e026318006c141b725a1231f1942f555cd9a07`
- Test-alignment commit: `691ad3ed24384eea9f72a269da49035814c93bbd`
- Evidence head: `c55eb8f8dec38f9d96a817228cf7d66bfac9afeb`
- Build ID: `tio2-my-ga4-g8-30e02631-20260913`
- Build directory: `.next-tio2-my-ga4-g8-30e02631`
- Next runtime: `http://127.0.0.1:3123`
- Isolated CMS runtime: `http://127.0.0.1:8280`
- Runtime hold: until Gate 9 returns PASS or RETURN
- Gate 8 disposition: `GATE8_IMPLEMENTATION_ACCEPTANCE_READY`

## Implemented behavior

The Malaysia site now uses one GTM loader for container `GTM-MWQVK7J4` and binds the approved GA4 property `G-QDHLMRH2WB`. Consent defaults deny Analytics and all advertising fields. The active Cookie Settings UI grants only Analytics, persists the canonical `tio2-my` consent record, and removes both Malaysia GA cookies when the user returns to Necessary only. The English and Bahasa Malaysia legal pages and Cookie Policy describe the active behavior and approved cookie inventory.

The three provider-accepted events use the approved names and four non-PII parameters:

- `rfq_provider_accepted`: `site_scope=tio2-my`, `page_id=CONV-RFQ`, `source=web3forms`, `form_type=quote`
- `documents_provider_accepted`: `site_scope=tio2-my`, `page_id=CONV-DOC`, `source=web3forms`, `form_type=documents`
- `sample_provider_accepted`: `site_scope=tio2-my`, `page_id=CONV-SAMPLE`, `source=web3forms`, `form_type=sample`

## Verification

- Targeted Vitest: 8 files passed; 37 tests passed.
- GA4/CMP Playwright: 2/2 passed. The GTM loader, all-denied bootstrap, canonical consent record, Analytics grant and GA-cookie withdrawal behavior were verified with a deterministic GTM fixture.
- Legal/CMP Playwright: 13/13 passed across the approved 390, 768 and 1440 widths, including Cookie Settings keyboard containment and route exclusions.
- TypeScript: passed.
- Targeted ESLint: passed.
- Existing production-equivalent build: passed and held under the declared Build ID.
- Runtime probes: the request-a-quote route and isolated CMS GraphQL endpoint both returned HTTP 200.

## Real Tag Assistant Preview evidence

The user-shared Preview was tested against the held local runtime. Preview authorization parameters were not committed.

- Initial state: all four Consent Mode fields were denied.
- Accepted state: `analytics_storage` became granted; `ad_storage`, `ad_user_data`, and `ad_personalization` remained denied.
- Cookie state: `_ga` and `_ga_QDHLMRH2WB` were created for `127.0.0.1`, path `/`, with an observed duration of about 400 days; both were absent after withdrawal.
- Page views: the initial and withdrawn page loads used `gcs=G100`; a fresh page load with stored Analytics consent sent exactly one `page_view` to `G-QDHLMRH2WB` with `gcs=G101`.
- Approved events: the RFQ, document and sample Preview tags each reported `Fired`, `Succeeded`, and one hit to `G-QDHLMRH2WB` after controlled direct `dataLayer` pushes.
- Payload: the three event requests contained only the four approved fields. No buyer information, form values, email, phone or free text was transmitted.
- Isolation: the sanitized target-page request set contained no other container or measurement ID.

No real form was submitted. The local form receiver and production WordPress were not written.

## Gate 9 and release boundaries

Gate 9 must independently validate the implementation commit, evidence head, Build/runtime identity, file hashes, Cookie lifecycle, consent ordering, accepted page-view count, three event hits, no-PII assertion and cross-scope absence. This receipt records the Gate 8 result and does not declare Gate 9 acceptance.

Publishing the GTM workspace, merging, deploying, writing production WordPress, requesting indexing and Gate 10 remain unauthorized.

## Evidence references

The machine-readable list, SHA-256 values and proof statements are in `gate8_evidence_manifest.json`. The referenced files are frozen in evidence commit `c55eb8f8dec38f9d96a817228cf7d66bfac9afeb`.

EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/build-identity.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/runtime-audit.json
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/summary.json
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/targeted-vitest.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/ga4-active-playwright.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/legal-playwright.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/typecheck.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/eslint.txt
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-observation.md
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-runtime-evidence.json
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-initial-denied-consent.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-accepted-consent.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-google-tag-page-view.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-rfq-event-fired.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-documents-event-fired.png
EVIDENCE: docs/verification/tio2-my-ga4-active-gate8-20260913/tagassistant-sample-event-fired.png
