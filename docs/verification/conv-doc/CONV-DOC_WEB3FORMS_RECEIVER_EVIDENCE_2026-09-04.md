# CONV-DOC Web3Forms Receiver Evidence

Date: 2026-09-04
Scope: local production-equivalent code and runtime verification only
Provider: Web3Forms
Deployment, production-secret, publication and indexing actions: none

## Receiver boundary

- The Next.js Route Handler reads only the server-side `TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY` variable.
- The provider endpoint is fixed to `https://api.web3forms.com/submit`; no configurable cross-scope endpoint remains.
- The approved recipient must be bound in the provider account and is absent from repository code, tracked configuration, browser assets and rendered HTML. That provider-side binding remains unverified until a credential is issued.
- The provider payload retains the eight normalized fields, `site_scope=tio2-my`, `page_id=CONV-DOC`, `workflow=request_documents`, the stable request token and validated source attribution.
- Only HTTP `200`, an `application/json` response and `success=true` produce `receipt_confirmed`.
- Missing configuration produces `unavailable`; timeout, network failure, non-200, non-JSON and ambiguous responses produce the retryable `submission_unconfirmed` state.
- The existing same-origin check, 16 KB request-body limit, server validation, `no-store` responses and cross-scope rejection remain unchanged.

## TDD evidence

The first Web3Forms contract test failed against the generic URL/Bearer implementation with `expected receipt_confirmed, received unavailable`. Further red/green cycles proved that the provider reply-to address is normalized with the approved fields, the fixed endpoint cannot be overridden and JSON media-type matching rejects deceptive values. The completed receiver and route then passed the focused unit and integration suite: `2` files, `29` tests.

## Verification

- Request Documents unit, integration and WordPress infrastructure suite: `11` files, `109` tests passed.
- Production Playwright Request Documents suite: `15/15` passed across the approved and intermediate viewports.
- Targeted ESLint: passed.
- TypeScript typecheck: passed.
- Fresh TiO2 Malaysia production build: passed, `35` routes generated.
- Browser runtime: `/request-documents/` returned HTTP `200` with no browser console or page errors.
- API runtime without a credential: HTTP `503`, `{\"ok\":false,\"kind\":\"unavailable\"}`, `Cache-Control: no-store`.

## Privacy and secret scan

A fresh build used a non-secret sentinel value for the server-only variable. The generated browser static assets and rendered Request Documents HTML contained zero matches for:

- the sentinel access key;
- the approved recipient address;
- the unit-test name and email values.

The CONV-DOC form, receiver and Route Handler sources contain no console logging, analytics calls, `dataLayer` writes or recipient address.

## Credential and delivery status

No usable Web3Forms access key exists in the inspected local environment. No test submission was sent and no recipient delivery was confirmed.

Web3Forms' official setup flow requires creating an access key for the approved recipient and retrieving that key from the recipient mailbox. The key must then be installed directly as the server-only environment variable; it must not be pasted into repository files, browser code, URLs, analytics or public logs.

Web3Forms' official troubleshooting guidance also states that server-side API calls require an active paid subscription and server-IP safelisting. A production-equivalent test therefore also needs the authorized environment's outbound IP arrangement accepted by Web3Forms; otherwise the provider may return HTTP `403`, which this adapter safely treats as unconfirmed.

## Remaining release blockers

- Create or obtain one Web3Forms access key bound to the approved recipient and install it in the authorized production-equivalent server environment.
- Confirm an active Web3Forms plan and provider-approved server-side access, including the authorized environment's outbound IP safelist or an equivalent arrangement accepted by Web3Forms.
- Send at most one clearly labelled `[TEST]` submission after the key is installed and obtain actual mailbox receipt evidence.
- Complete Privacy Policy processor/data-flow parity before production release.
- Production configuration, deployment, publication and indexing remain separately unauthorized.
