# Release coverage repair implementation plan

> **For agentic workers:** Execute task-by-task with test-driven development and independent code review before merging to develop.

**Goal:** Admit the approved 59-object / 177-case candidate without accepting incomplete or mismatched historical evidence.

**Architecture:** Counts come from installed policy keyed to the immutable release-surface hash, never from an operator override. Keep the historical v2 tuple and introduce a v3 tuple for the already-approved current surface. Connect prerelease sealing, packaging, server admission and completion generation to this policy.

**Tech Stack:** PowerShell 5/7, Python standard library unittest, Vitest.

**Spec:** Release blocker `codex/release-9d8f3131:docs/verification/production-release-system/release-2026-09-13-9d8f3131.md`; user's instruction on 2026-09-13 to correct the release, excluding maintenance and CMS write suspension.

## Constraints

- No remote changes, maintenance page, CMS write suspension, database restore or plugin installation in this development task.
- Preserve old 58-object evidence; unknown hashes and mismatched counts fail closed.
- No business/page/content changes. No fabricated production evidence.
- Work from develop in the existing isolated worktree; independent review before develop merge.

## Task 1: Identity-bound coverage admission

- [ ] Add real failing cases in `tests/production/test_frontend_candidate.py` and `tests/infrastructure/production-prerelease-gate.test.ts`: a current hash with `{businessPages:57,registeredObjects:59,widths:3,browserCases:177}` is admitted; old counts on that hash are rejected.
- [ ] Run `python -m unittest tests.production.test_frontend_candidate` and the targeted Vitest gate test, observing the old-count failure.
- [ ] Add Python policy in `ops/production/server/release_contract.py` and PowerShell policy in `scripts/production/ReleaseCoverage.ps1`; current hash `6655c74b695b0f0f4d0f9ac94607ba138bf1d42b063e2d5daa101d2953c19cad`, legacy hash `42b29755e99dec1ec71fe07a98a7cf586349cf60bfb25f7f90d74ca6f35bd152`.
- [ ] Wire `frontend_candidate.py`, `Production.Core.psm1`, `Seal-ProductionGate.ps1` and completion generator to exact hash-derived counts; preserve legacy v2 and add current v3 frozen tuple.
- [ ] Update current test fixtures to describe current archive bytes, not legacy counts; explicitly test legacy policy and unknown-hash rejection.

## Task 2: Completion and regression

- [ ] Add completion tests through the actual PowerShell generator, with synthetic local mail fixtures explicitly distinguished from real mail.
- [ ] Verify valid 177-case current coverage, rejected incomplete coverage, zero unauthorized writes, unchanged candidate/CMS/backup/mail binding checks.
- [ ] Run affected Python production tests and infrastructure gate/package/contract tests. Record exact pass/fail results and any separate defects rather than weakening assertions.
- [ ] Commit implementation, request independent review, address findings, then merge the exact reviewed commit to develop and save a development receipt.
- [ ] Document that production CMS installation remains blocked under the no-maintenance/no-write-suspension constraint; do not alter its safety implementation.
