# CONV-DOC Real Web3Forms E2E Evidence — 2026-09-05

## Scope and safety boundary

- Exactly one authorized `[TEST]` Request Documents submission was made through the current local `/request-documents/` page and its active browser-direct receiver.
- The request used the configured `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`; neither the key nor the complete buyer payload is recorded here.
- No retry or second submission was made.
- The current form has no Market / Destination field, so no unapproved field was added or transmitted.
- No mailbox access, deployment, publication, DNS change, or indexing operation was performed.

## Sanitized provider evidence

| Evidence item | Observed value |
| --- | --- |
| Submitted at (UTC) | `2026-09-04T22:34:08.728Z` |
| Submitted at (Asia/Shanghai) | `2026-09-05 06:34:08.728 +08:00` |
| Page path | `/request-documents/` |
| Provider endpoint | `https://api.web3forms.com/submit` |
| HTTP status | `200` |
| Response content type | `application/json` |
| Provider `success` | `true` |
| Request-token SHA-256 | `288e0139c00a55981068e05cf522c66654e9f1fbd8bbe20d0f1a320b2da7658b` |
| Page result | `Document Request Received` |

The receiver exposes the success page only after the provider returns HTTP `200`, the normalized media type is exactly `application/json`, and the decoded response body contains `success === true`. This evidence therefore establishes **provider accepted** for the single test submission. It does not establish delivery to or appearance in the recipient mailbox.

## Code and verification baseline

- Free browser receiver commit verified: `c2a62677e6781ad21e9a05ee9e90f419ec61a167`.
- Shared Malaysia Web3Forms key commit verified: `0b42ccfbb41f3e487c64dc4173dec5d608ed1141`.
- CONV-DOC Vitest scope: `10` files, `102` tests passed.
- TypeScript `tsc --noEmit`: passed.
- Changed-file ESLint scope: passed with zero errors.

## Remaining external confirmation

The only remaining operational confirmation for this test is for the user to check whether the `[TEST]` message arrived in the approved recipient mailbox. Provider acceptance and mailbox receipt are separate facts.
