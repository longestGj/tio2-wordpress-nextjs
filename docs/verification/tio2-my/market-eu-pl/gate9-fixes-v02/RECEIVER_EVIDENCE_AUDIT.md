# PL-G9-E02 receiver evidence audit

2026-09-07; site `tio2-my`; Poland consumes `/request-a-quote/` and `/request-documents/`. Read-only source/history audit by delegated D16 evidence reviewer. No tests, servers, form submissions, emails, CMS changes or deployment were performed. Only this report was written. This does not close E02 or Gate 9.

Current inspected code: branch `codex/poland-development`, HEAD `c2764e6138aa0dc37d1f6cab04bc1ae39f45aecb` plus existing working changes. Receiver files below had no working-tree modifications at inspection. Parent's forthcoming shared-visual changes/build require their own runtime identity. Governance inputs: D16 AGENTS, site-registry and development-workflow; D23 Poland Gate 9 review V0.1; Gate 6 handoff S07/S08; RFQ Manifest V1.2 and receiver blocker V1.0; DOC current Gate 9 Manifest V0.4. No D23 files changed.

## Evidence and authority

- [Poland review](D:/23MySec/pages/markets/poland/07_qa/MARKET-EU-PL_GATE9_READ_ONLY_REVIEW_V0.1.md), E02 and PL-G9-04/05/11: receiver states and applicability must be separate from route HTTP 200.
- [S07/S08](D:/23MySec/pages/markets/poland/06_handoff/MARKET-EU-PL_GATE6_HANDOFF_PACKAGE_V0.1.md) preserve RFQ exact field/state contracts and later DOC Free/browser-direct authority.
- [RFQ blocker](D:/23MySec/pages/conversion/request-a-quote/05_review/CONV-RFQ_GATE8_RECEIVER_ENVIRONMENT_BLOCKER_RECORD_V1.0.md): 2026-09-04 report, commit `616193f`, route HTTP 200 but receiver unavailable. `RFQ_RECEIVER_ENVIRONMENT_RELEASE_BLOCKER=OPEN`; requires production-equivalent positive receipt, failure/retry/unavailable and parity evidence. No located subsequent authoritative RFQ provider-accepted evidence closes it.
- [RFQ historical local check](D:/16Wordpress_nextjs/docs/verification/conv-rfq/GATE8_LOCAL_VERIFICATION_2026-09-01.md): mocked JSON false/true responses, non-production evidence key, all submission calls intercepted; no actual delivery claim.
- [RFQ targeted closure](D:/16Wordpress_nextjs/docs/verification/conv-rfq/GATE9_PCR01_TARGETED_FIX_CLOSURE_2026-09-02.md): accepted `0461e594039b89764ecff89fb26b62f2acfd8f61` only for bounded timeout and robots; preserves open production receiver/delivery dependencies.
- [DOC current authority](D:/23MySec/pages/conversion/05_review/CONV-DOC_CURRENT_GATE9_BASELINE_MANIFEST_V0.4.md): Free/browser-direct fixed endpoint; one authorized provider acceptance retained, inbox open, production controls open. Supersedes server-only evidence. Original Free-plan runtime decision authorizes at most one test; that authorization was already exercised, not a new sending allowance.
- [DOC authorized actual test](D:/16Wordpress_nextjs/docs/verification/conv-doc/CONV-DOC_REAL_WEB3FORMS_E2E_EVIDENCE_2026-09-05.md): `2026-09-04T22:34:08.728Z`, `/request-documents/`, `https://api.web3forms.com/submit`, HTTP 200, application/json, `success=true`, visible `Document Request Received`. Request-token SHA-256 `288e0139c00a55981068e05cf522c66654e9f1fbd8bbe20d0f1a320b2da7658b`; no second submission. This proves one historical provider acceptance, not mailbox delivery.
- [DOC simulated receiver/build check](D:/16Wordpress_nextjs/docs/verification/conv-doc/CONV-DOC_WEB3FORMS_RECEIVER_EVIDENCE_2026-09-04.md): historical 15/15 Playwright, sentinel build, failure/retry/stable token and mocked explicit receipt. Does not prove provider acceptance by itself.

## Exact historical-to-current association

Both `33fe5fa45a4339a0679a79e99cacfb5883f27f0d` (DOC actual-test evidence) and `0461e594039b89764ecff89fb26b62f2acfd8f61` (RFQ targeted acceptance) are ancestors of current HEAD (`git merge-base --is-ancestor` each exit 0).

DOC Manifest V0.4 references the former worktree evidence path `.worktrees/home-001-tio2-my/docs/verification/conv-doc/CONV-DOC_REAL_WEB3FORMS_E2E_EVIDENCE_2026-09-05.md`; that file is absent at that original location in this inspection. Its current repository copy is recoverably identical in Git text: current raw SHA-256 `EE76045CB31169DEE64FBC33CF313CB0FD79B4D073F818D0C3C79B9FCEA8D6B1`; after CRLF-to-LF normalization SHA-256 `DC8633FE1CB8975964DE2B99BD2C1901EECA5AD5AC4910C3C3ED6AD45D62D9DA`, exactly the Manifest value and the `git show 33fe5fa:...` blob-byte SHA-256. LF-normalized current bytes equal historical Git bytes. This explains the byte-hash difference without silently equating the raw files.

The following Git blob comparisons use `git hash-object -- <current-path>` and `git rev-parse <historical-commit>:<path>` (repository canonical text), with current disk SHA-256 also recorded below. Historical DOC column is `33fe5fa`; RFQ column is `0461e59`.

| File | Historical blob | Current blob | Association |
|---|---|---|---|
| `lib/request-documents/malaysia-request-documents-receiver.ts` | `7288822bcb44a7b56e0b2179d50196633748c7f2` | `7288822bcb44a7b56e0b2179d50196633748c7f2` | DOC transport unchanged |
| `lib/request-documents/malaysia-request-documents-validation.ts` | `dfef7acf16bece60146f06d843ae7381cae5e66f` | `dfef7acf16bece60146f06d843ae7381cae5e66f` | DOC validation unchanged |
| `wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json` | `07804f078be32382ec8be7039df25879953db455` | `07804f078be32382ec8be7039df25879953db455` | Source config unchanged; not actual CMS-state identity |
| `lib/request-documents/malaysia-request-documents-prefill.ts` | `626486e06900fb8583f69a642bbd962c532dacd1` | `f14985d5a89f97e90cfd0961ab33b2318bdbd377` | Changed: trusted TDS/REACH context, ordering and notes |
| `components/sites/tio2-my/request-documents/malaysia-request-documents-form.tsx` | `ba2e24114db6f9a12f846dc360407a79bc49b9ab` | `8063bee426bb1db63e329db537d8b563eebd8d63` | Changed: REACH labels/review notes; transport call unchanged |
| `lib/rfq/malaysia-rfq-receiver.ts` | `c39ad46d7ee5cec7c3d3c49324de88564b65503a` | `bed878d13160d1b2934ee656d04b38830816d7f9` | Added allowlisted RES-ORIGIN interest payload; confirmation/timeout unchanged |
| `lib/rfq/malaysia-rfq-runtime.ts` | `cda09994d0eb86ad432b200d28aae5eb6990cead` | `75a45d89e9bf905bd7197e9c1843d6908eeaad82` | Privacy path fixed; prior privacy/CMP readiness gates removed; current provider key variable same |
| `components/sites/tio2-my/request-a-quote/malaysia-rfq-form.tsx` | `4119fc37de4ee4795e70679fc0caa66ccc3ad47a` | `132b94965e55eb7fd70027c17533a6f10468bb39` | Added interest argument; not identical old form |

DOC route `app/(en)/request-documents/page.tsx` and query wrapper also changed since actual-test commit. Therefore transport inheritance is strong source evidence; full-page/runtime identity is not unchanged and cannot be blanket-inherited.

## Build/environment/config limitation

The original DOC live-test receipt names receiver baseline `c2a62677e6781ad21e9a05ee9e90f419ec61a167`, key-wiring commit `0b42ccfbb41f3e487c64dc4173dec5d608ed1141`, and evidence commit `33fe5fa...`; it does not record Build ID, full source snapshot, configured key fingerprint, account ownership attestation or exact CMS response hash. Those missing historic facts cannot be reconstructed from the receipt. Do not claim old/current key equality or current provider account binding.

Both current forms reference `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`; RFQ resolves it via `lib/rfq/malaysia-rfq-runtime.ts`, DOC reads it in the Client Component. No `.env.local`, process environment values, key values or live provider configuration were inspected by this audit. Environment-variable name equality is not value/account equality; DOC client configuration is build-time while RFQ availability also depends on page runtime resolution. The original authorized local test and the Poland runtime are different execution occasions.

Poland prior runtime review binds `http://127.0.0.1:3015`, `.next-poland-http`, Build ID `y0X9yLdjyKOuGbj62JYsz`, base commit plus 35-file implementation snapshot. That establishes Poland review identity at its capture time, not the original DOC provider request or a future corrected build. Parent must bind any fresh mocked run to its actual new build/source/environment. No current Build ID or running HTTP state was revalidated here.

## Safe reproducible checks for parent

Use an isolated task build with a clearly non-secret nonempty routing sentinel and local CMS contract, with provider calls intercepted; never use a real sending test to fill this gap. Existing Playwright config has no webServer/global setup and uses one Chromium worker; `TIO2_MY_BASE_URL` selects the prepared server. Commands below are suggested, not executed:

```powershell
$env:TIO2_MY_BASE_URL = 'http://127.0.0.1:<task-port>'
npx playwright test tests/e2e/rfq-page.spec.ts --project=chromium --grep 'validates, retains values' --output docs/verification/tio2-my/market-eu-pl/gate9-fixes-v02/rfq-test-output
npx playwright test tests/e2e/request-documents.spec.ts --project=chromium --grep 'validation, failure retention' --output docs/verification/tio2-my/market-eu-pl/gate9-fixes-v02/doc-test-output
```

RFQ case validates empty submission, mocks HTTP 200 success=false, checks values retained, returns via TRY AGAIN, mocks success=true, checks confirmation focus and exactly two intercepted submissions. It does not prove stable RFQ retry token/deduplication. Its `unroute` is followed immediately by replacement before the next click; no submit occurs between interceptors. DOC case mocks 500 then 200 success=true, checks submitting/retained values, focus and same logical token. DOC screenshots are hardcoded to `docs/verification/conv-doc/conv-doc-state-*.png`, unaffected by `--output`; parent should preserve historical files or adapt a task-local runner before executing. No safe test should send real traffic if interception fails; use a sentinel and optionally fail-closed network guard.

Additional existing unit coverage (all mocked fetch/receivers): `tests/unit/rfq/malaysia-rfq-receiver.test.ts` covers missing config, network, stalled fetch, AbortError and stalled body; `tests/unit/rfq/malaysia-rfq-template.test.tsx` covers unavailable UI and timeout field/action restoration. `tests/unit/request-documents/malaysia-request-documents-receiver.test.ts` covers missing configuration, invalid input, non-200/non-JSON/ambiguous response, network, complete exchange timeout, redirects, payload bound. These can substantiate current simulated unavailable/recovery behavior, not real receipt. RFQ current receiver generates a fresh token inside each call; do not transfer DOC stable-token claim to RFQ.

## Disposition by evidence class

| Class | Supported | Remaining gap |
|---|---|---|
| Simulated current receiver states | Existing inspectable test implementations; old local simulated results | Parent must actually rerun selected tests against exact corrected build; audit itself is source inspection only |
| DOC provider accepted | One historical authorized success=true; original evidence hash reconciled; transport/validation identical | No current live provider test claimed; old/current runtime/account configuration equality unproven |
| RFQ provider accepted | No applicable positive live evidence located | Original receiver blocker stays open; mocked success does not close positive receiver acceptance |
| Inbox | Neither this audit nor preserved DOC test verifies inbox appearance | DOC user/external confirmation remains open; RFQ accountable receipt/delivery open |
| Production controls | Current manifests explicitly retain controls | Production CMS singleton/read-back, provider account/key placement/recipient binding, applicable Privacy/legal/consent and separate Gate 10 authorization remain their owner responsibilities |

The precise improvement supplied here is recoverable historical evidence identity and transport-level applicability, with nonidentical caller/prefill files and missing configuration/build association exposed. No broad pass or new authorization is inferred.

## Current raw disk SHA-256 inventory
- lib/request-documents/malaysia-request-documents-receiver.ts: 48EC34947FB5D5CB227DA549534AFA8BBC93FDD70DAA80C2B41DEF0A228CC76A
- lib/request-documents/malaysia-request-documents-validation.ts: E6DD97264AE3C3A9BE8A1B0EBFB0EF50DA36557311B44A95794D6B017B5898D5
- lib/request-documents/malaysia-request-documents-prefill.ts: F95CBBDE7592DE82EB7CA923644618937B08570100848F8D3DEFCA6A872EBF42
- components/sites/tio2-my/request-documents/malaysia-request-documents-form.tsx: EC38C279BC7A27FED0B806EAA27D81F52BBD45967968173F91C08AE6068F2806
- wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json: 8931061F423ECF8414E1CE87447A200C7B26C2DFA2FD64AD4C1D32B263EC010D
- lib/rfq/malaysia-rfq-receiver.ts: 27355B7DCB28F7A0D65320609E093FC9A2F65204B3BDD6F2C694E488B922016F
- lib/rfq/malaysia-rfq-runtime.ts: 4599C9E30FD3C68A8639070B3ED2DDAC143357D1A3B3495E6F5AE56424299B6D
- components/sites/tio2-my/request-a-quote/malaysia-rfq-form.tsx: F3E03CE6EBBBFD1F22A28D738080B25A3A5A12FBA3D3DDA247E2704C27992482
