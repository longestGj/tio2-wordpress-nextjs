# Country and editorial candidate integration plan

> Execute locally using superpowers:executing-plans. User approved continuing the stated candidate integration; no new business design is introduced.

**Goal:** Preserve Country reviewed repairs and nine approved editorial pages in one local production-mode candidate; verify ES-G9-F03 and IN-G9-F01 click/return dependencies.

**Architecture:** Reuse the existing isolated worktree on codex/country-editorial-integration from a5230cd. Incorporate Country repairs d764c36 and 47307b8. Their shared Chrome/Consent remains authoritative for this integration; retain editorial Inter only inside the editorial wrapper when removing Country's global font injection. Use a separate .next-country-editorial build and port 3226, retaining 3029 and 3216.

**Tech stack:** Next 16.3.2, existing WordPress tio2my9 at 8186, Vitest/Playwright. No dependency install.

**Spec:** D23 GATE8_TRADE4_APPLICATION5_AUTHORIZATION_AND_DISPATCH_V1.0.md §5 and current Country targeted Gate 9 records; user explicitly said continue integration.

## Constraints

- Exact approved identities, hrefs, text and source hashes; tio2-my only. No hidden dependency/fallback.
- Preserve all prior candidates and records. Worktree source branch changes; 3216 continues using its frozen build. No WordPress source changes are planned.
- No merge to release/main, push, deployment, production/DNS/index writes, real submissions, Gate 9/10 closure.

## Steps

- [x] Record five target-owner results and both environments; confirm 3029 still404 and 3216 target click/back passes.
- [x] Incorporate Country repair commits and resolve only integration conflicts. Test editorial typography ownership before adapting renderer/font file; keep approved Country styling intact.
- [x] Update only browser test expectations for the approved shared menu. Run relevant editorial/Country/Chrome/Consent regressions, types, lint and target build.
- [x] Start task-owned 3226; verify five real Country entry/target/return chains, all nine editorial routes and shared interactions, and Country previously repaired behavior. Inspect applicable screenshots, not just assertions.
- [x] Commit implementation and evidence; return exact new candidate and original Finding IDs, retained old environments, open dependencies and rollback.

Execution: c0f33af/c15de45 incorporate approved Country repairs; 4fa585b scopes editorial typography. 3226 build 1AwBNw0A1szLVVlTyLyQU. 479 related unit/integration tests pass; browser46pass/1RFQconfigurationfailure retained in RETURN.md. Five same-candidate targetclick/return chains pass; four Documents navigation checks pass with no submissions. Original3029/3216 preserved. Independent source and bounded visual review completed; Gate9 remains independent.
