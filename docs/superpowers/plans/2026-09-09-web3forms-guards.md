# Web3Forms F02–F04 repair plan

Approved specification: D:/23MySec/docs/architecture/PRERELEASE_TASK10_WEB3FORMS_INVALID_REQUEST_RETURN_V1.0.md (72989041512a2ca7e4dc61bc1c85fdff063481e8).

Goal: fail closed for malformed Web3Forms configuration, classify invalid requests without retaining provider text, and report inbox applicability accurately.

Base: develop ba37af03bec4cf9f44f56415afc243be1c297847; isolated branch codex/prerelease-web3forms-guards.

## Global constraints

- Simulated provider responses only. No real provider request, key replacement, prerelease reset, direct main edit, remote write or deployment.
- Preserve fields, Buyer Clean copy, endpoint architecture, recipient, three active workflows, strict acceptance and independent timeout/abort behavior.
- Preserve the V1.1 evidence allowlist. Never persist or log keys, email addresses, buyer values, request payloads, raw provider messages/bodies, cookies, sessions or filled DOM/trace.
- Generic UUID shape means hexadecimal 8-4-4-4-12 groups; no version/variant restriction. Tests use synthetic values only.
- HTTP 400/422 diagnostics may expose only allowlisted categories: invalid_access_key, domain_or_origin_restricted, invalid_email, malformed_request, provider_policy, unknown_invalid_request. Preserve other existing status classes.
- Inbox status is PENDING_MANUAL_CONFIRMATION only when all three required workflows are provider-accepted; otherwise NOT_APPLICABLE_PROVIDER_NOT_ACCEPTED. Do not invent receipt confirmation.
- Root AGENTS.md and D23 source documents are unchanged. Keep prior runtime and evidence intact.

## Task 1: implement the bounded repair using TDD

1. Establish focused baseline on browser transport, runtime readiness and prerelease evidence tests.
2. Write behavioral failing tests for blank/placeholder/52-character malformed keys and generic UUID positive cases, including fail-closed transport with zero fetch calls. Share a small contract between TypeScript and PowerShell preflight; wire active RFQ/Sample/Documents readiness consumers.
3. Implement the minimum validator. Replace only synthetic positive fixture keys made invalid by the new contract; keep intentional invalid vectors.
4. Write failing classification tests using transient provider responses, including unknown/malformed bodies and privacy sentinel values. Implement a shared normalizer used by browser transport and live evidence capture. Match only provider error structures/messages; do not recursively inspect echoed buyer data. Unknown responses remain unknown, never fabricate the historical root cause.
5. Write failing aggregate tests for all rejected, mixed/missing and all accepted attempts; correct inbox status and category validation while retaining exact evidence field restrictions.
6. Run related unit/infrastructure and controlled browser privacy/E2E regressions. All external submissions must be intercepted or network-blocked. Run types/lint and relevant build checks where appropriate. Save RED/GREEN commands and outputs; commit implementation and tests.

Architecture responsibility: lib/forms owns shared provider validation/classification; active readiness modules consume it; scripts/prerelease owns preflight and final evidence; tests/e2e/support shares sanitized classification without persisting response text.

## Task 2: independent review and candidate verification

Generate one fixed diff package for Task 1. Independent reviewer evaluates specification compliance and code quality; route corrections to the implementer and re-review the correction diff. Perform whole-branch review per SDD. Verify the exact candidate with applicable controlled E2E and record code/test identities. Simulated E2E does not prove actual provider acceptance or mailbox receipt.

## Task 3: authorized develop integration and handoff

After review and task verification pass, merge into develop in its existing checkout, run the affected combination tests on that exact tree, and send the repair/evidence identity to D23 for its identity check. Stop before main promotion and prerelease retry; configuration F01 and a newly authorized live attempt remain separate prerequisites.
