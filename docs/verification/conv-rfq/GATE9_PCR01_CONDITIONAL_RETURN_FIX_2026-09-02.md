# CONV-RFQ Gate 9 PCR-01 conditional-return fix — 2026-09-02

Review ID: `CONV-RFQ-G9-PCR-01`

Disposition: `TARGETED_FIX_COMPLETE / READY_FOR_READ_ONLY_REVIEW / NOT_DEPLOYED`

This record covers only P0-01 receiver timeout and P1-01 robots gating. Approved Buyer Clean copy, visual layout, site scope, shared Chrome, links, Schema and external dependency status were not changed. This is not Gate 9 PASS, Gate 10 authorization or release approval.

## P0-01 — bounded receiver timeout

- Internal timeout: `MALAYSIA_RFQ_SUBMISSION_TIMEOUT_MS = 10_000` milliseconds.
- The timeout covers both the Web3Forms fetch and JSON acknowledgement body parsing.
- At timeout the request's `AbortController` is aborted and an independent timeout promise settles the transaction. A fetch implementation that ignores the signal or a response body that never resolves therefore cannot leave the page in `SUBMITTING` forever.
- Timeout, `AbortError`, network/server/malformed/ambiguous response all map to `submission_unconfirmed`.
- The existing client state mapping retains all entered values, restores enabled fieldsets and `REQUEST QUOTE`, exposes the approved `TRY AGAIN`, and does not render or emit `receipt_confirmed`.
- No timeout detail or duration enters Buyer Clean.

Evidence:

- receiver never resolves → aborted signal + `submission_unconfirmed` PASS;
- JSON body never resolves → bounded `submission_unconfirmed` PASS;
- explicit `AbortError` → `submission_unconfirmed` PASS;
- component deferred/unconfirmed state → `SUBMITTING` lock observed, then fields/actions enabled, company value retained, `TRY AGAIN` visible and success copy absent PASS.

## P1-01 — robots three-gate control

`index,follow` is possible only when all of the following are true:

1. exact production/site condition: `site.id=tio2-my`, `wordpressScope=tio2-my`, `site.url=https://tio2malaysia.com` and `VERCEL_ENV=production`;
2. scoped page contract: `page.releaseControls.indexingAuthorized === true`;
3. independent release signal: `TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED === "true"`.

Any missing, false or non-exact gate produces `noindex,nofollow`. The current approved contract still has `indexingAuthorized=false`; the current production-mode browser evidence therefore remains `noindex,nofollow`, even if the other two signals are simulated open. The `.env.example` default for the independent signal is `false`. No indexing was enabled.

Unit coverage includes:

- current contract hold + other gates open → noindex;
- preview environment → noindex;
- missing independent release signal → noindex;
- non-exact `TRUE` release signal → noindex;
- contract hold → noindex;
- future logical positive case with exact production + simulated contract approval + exact independent signal → index/follow;
- mismatched host → fail closed;
- actual route metadata with production + independent signal but current scoped contract hold → noindex.

## Verification results

| Check | Result |
|---|---|
| Changed-file ESLint | PASS — 0 errors, 0 warnings |
| TypeScript `tsc --noEmit` | PASS |
| RFQ unit/integration | PASS — 11 files, 55 tests |
| Fresh Next production build | PASS — 14/14 static pages generated; RFQ remains dynamic |
| Production-mode RFQ Playwright | PASS — 10 tests |
| Runtime robots | PASS — `noindex, nofollow` |
| Sitemap hold | PASS — RFQ absent |
| 1440/768/390 visual/a11y/overflow | PASS; evidence hashes unchanged |
| 320/375/430/1024/1280 overflow/target sizes | PASS |

Existing screenshot hashes remained byte-identical because this return changed no visual output:

- Desktop 1440: `DBDF2A71BABEAAB8630A8C3FCDC18743BD8E23A80875C037484D9FA443BE5945`
- Tablet 768: `846FF461F0F3925ECD6B0766B8A4839B03D9B45C85E9CF3FE7AA89672A2E9C37`
- Mobile 390: `6842602B917472A9DDE81FFE4CC0A8288459D0795166C251A67561159B79C00F`

## External blockers unchanged

- production receiver/access key, accountable owner and delivery evidence;
- Web3Forms plan/DPA/subprocessors/security/retention/transfer evidence;
- approved Privacy Policy route and actual data-flow parity;
- shared CMP/Cookie/GA4-GTM consent evidence;
- functional `/request-sample/` and `/request-documents/` destinations;
- Gate 10/indexing authorization.

No Contact fallback, hidden sibling link, fake dependency, real form submission, deployment, publication, DNS or indexing action was performed.
