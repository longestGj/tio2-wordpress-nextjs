# SYS-404 + CONV-THANK Gate 8 Implementation Plan

**Task:** `G8-SYS404-CONVTHANK-20260908-01`
**Baseline:** `cfe9ef3`
**Branch:** `codex/sys404-convthank-gate8`
**Scope:** local `tio2-my` implementation and Gate 9 evidence only. No main merge, push, deploy, production write, publication, DNS, indexing, or real external form submission.

## Implementation sequence

1. Add contract tests for the real 404 boundary, exact recovery content, `NONE` navigation state, metadata and scope fallback.
2. Implement the scoped SYS-404 boundary with shared Malaysia Header, Footer, Logo, RFQ and Consent components; verify valid routes still resolve through their existing route files.
3. Add a strict, short-lived, same-tab session marker for `quote | documents | sample`, with exact-query matching and fail-closed parsing.
4. Add tests for all four CONV-THANK panels, the eight Direct fallbacks, refresh/expiry/new-session behavior, data minimization, SEO and cross-scope rejection.
5. Implement `/thank-you/` with shared Chrome and code-managed approved copy. Keep all user-specific state client-side so the route and caches always return a neutral 200 shell.
6. Integrate the three existing source forms. Write a marker and navigate only after each receiver's own positive predicate; retain existing validation, retry, value retention and duplicate guards on every failure.
7. Tighten Sample positive acknowledgement to `ok=true && receipt_confirmed=true`; retain RFQ explicit acknowledgement and Documents `200 + JSON success=true`.
8. Run targeted unit/integration tests, typecheck/lint, scoped build and browser checks at 1440/768/390, keyboard, menu, consent, 200% zoom and Chromium/non-Chromium.
9. Commit SYS-404, then CONV-THANK, then evidence. Generate a schema-valid `gate8_evidence_manifest.json`, machine validation/precheck outputs and the Gate 8 receipt with exact `EVIDENCE:` lines.
10. Start a traceable local runtime and hold it for Gate 9. Send the implementation/evidence identities to the assigned D23 task and wait for `GATE9_PASS_OR_RETURN_NOTICE`.
