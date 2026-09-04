# CONV-DOC Web3Forms Free Browser Runtime Evidence

Date: 2026-09-04
Scope: local production-equivalent code and runtime verification only
Provider/runtime: Web3Forms free plan, browser-direct submission
Deployment, publication, production configuration and indexing actions: none

This record supersedes the server-side receiver conclusions previously recorded under this filename. The earlier implementation remains identifiable at commit `782e7fe1945071d293851bd6e4b43cb90d98764b`; it is not the active CONV-DOC runtime.

## Active receiver boundary

- The Client Component reads only `NEXT_PUBLIC_TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY`. The old server-only `TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY` setting is removed from the active implementation and `.env.example`.
- The approved local placement is the untracked worktree-root `.env.local`; production-equivalent hosting must use its Environment Variables facility. No access-key value is stored in tracked files or this evidence.
- The provider endpoint is fixed and non-overridable: `https://api.web3forms.com/submit`.
- The recipient is bound to the access key in Web3Forms. Neither `recipient` nor `to` is present in the browser payload.
- The browser payload retains the eight normalized fields, `site_scope=tio2-my`, `page_id=CONV-DOC`, `workflow=request_documents`, stable request token and validated source attribution.
- Source attribution is revalidated against the final visible Grade and application immediately before submission; stale or forged attribution is discarded.
- The serialized provider payload is rejected before transport when it exceeds 16 KiB.
- Requests use `cache: no-store`, `referrerPolicy: origin` and `redirect: error`; a query-bearing prefill URL is not sent as the cross-origin Referer, and HTTP redirects cannot forward the access key or Buyer payload beyond the fixed endpoint.
- Only HTTP `200`, exact `application/json` media type and JSON `success=true` produce `receipt_confirmed`.
- Missing configuration produces the existing generic failure/retry state without contacting Web3Forms. Timeout, network failure, non-200, non-JSON and ambiguous responses remain unconfirmed; entered values and the logical request token are retained for retry.
- The former same-origin `POST /api/tio2-my/request-documents` Route Handler and its integration test are removed so no dual receiver runtime remains. The page remains owned, rendered and scoped solely by `tio2-my`; the approved free-plan decision expressly replaces the internal same-origin transport with the fixed Web3Forms browser endpoint.

## TDD and verification evidence

- Direct-browser contract test first failed against the old same-origin form implementation, then passed after the form called the fixed receiver with the dedicated public environment variable.
- The 16 KiB boundary and final-visible-context source-attribution tests each failed before their implementation and passed afterward.
- `referrerPolicy: origin` first failed at the request-init assertion, then passed after the receiver set it explicitly.
- Request Documents unit, integration and WordPress isolation suite: `10` files, `101` tests passed, including explicit 307 and 308 rejection.
- Changed-file ESLint: passed.
- TypeScript typecheck: passed after regenerating Next route types to remove the deleted API route from generated validators.
- Fresh TiO2 Malaysia production build: passed; `34` static pages generated and `/request-documents` emitted without `/api/tio2-my/request-documents`.
- Production-build Playwright Request Documents suite: `15/15` passed across 1440, 768, 390, 320, 375, 430, 1024 and 1280 checks.
- The browser test intercepts only `https://api.web3forms.com/submit`, verifies the public routing key is in the request body, verifies `recipient` and `to` are absent, then exercises failure, retained-value retry, stable token and explicit provider receipt success.
- Runtime POST to the removed same-origin API path returns HTTP `404`.

## Browser exposure and privacy scan

The production-equivalent build used a non-secret public sentinel, never the user's real key. The sentinel appears in two generated client-bundle artifacts, which is intentional for the approved Web3Forms free browser runtime. It is absent from URLs and is sent only in the JSON body to the fixed Web3Forms endpoint.

Generated assets contain zero matches for the Buyer test names and email addresses. Source and browser tests also verify that no recipient address, `recipient` field or `to` field is emitted. No CONV-DOC analytics or console logging was added.

## Credential and delivery status

The user's real access key was not read, printed or used during this verification. No real Web3Forms request or email was sent, so mailbox delivery is not claimed. If an authorized live check is requested, it must be limited to one clearly labelled `[TEST]` submission and separately confirmed in the bound recipient mailbox.

## Remaining release blockers

- Configure the approved access key in the target hosting Environment Variables without committing it.
- Complete at most one authorized `[TEST]` submission and obtain actual mailbox receipt evidence before claiming end-to-end delivery.
- Complete Privacy Policy processor, retention and international-transfer parity for the actual Web3Forms data flow.
- WordPress target-environment data migration, Gate 10, deployment, publication and indexing remain separately unauthorized.
