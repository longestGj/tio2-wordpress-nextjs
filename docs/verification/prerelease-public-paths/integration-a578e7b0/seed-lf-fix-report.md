# Independent Windows seed LF repair

Date: 2026-09-09 (Asia/Shanghai). This is the new Task9A integration defect, not the withdrawn F01 proposal. Site: tio2-my. No business, seed-source, seed-manifest, CMS, provider, runtime or evidence-manifest changes.

## Identity and scope

- Base: develop `8a2698d7f4dc3d8d3fb3bafb3d91ee017c0bea58`.
- Branch: `codex/prerelease-seed-lf`.
- Worktree: `D:/16Wordpress_nextjs/.worktrees/prerelease-seed-lf`.
- Implementation commit: `b4eb8b13211449655518315e4f3491675fa8e184`; clean after commit.
- Only committed files: `.gitattributes`, `tests/infrastructure/prerelease-compose.test.ts` (40 insertions, 2 deletions).
- Exact attribute: `wordpress/seed/apply-tio2-my-prerelease-public-paths.php text eol=lf`.
- Approved seed SHA-256 / unchanged Git blob bytes: `496ca0fab2c9ed6b1dbb095011a4a03ee80c08b18825275f201e72c247b863e4`.
- Defective CRLF export SHA-256: `014c420d173de6e27d4cb777958c7e424892f4a1619aba206b154e074eb7f04b`.
- Parent reported original integration full run: 1 failing seed-hash test, 2997 passed, 51 skipped; 356 files passed, 1 failed, 21 skipped, 174.17 seconds. This agent did not rerun that full suite or modify its log.

## Preparation and test method

Used Superpowers worktree and TDD guidance. Verified target absent, branch absent, `.worktrees/prerelease-seed-lf` ignored, and develop exact base before `git worktree add .worktrees/prerelease-seed-lf -b codex/prerelease-seed-lf 8a2698d7f4dc3d8d3fb3bafb3d91ee017c0bea58` (exit 0).

Dependency reuse only: created a `node_modules` junction in the repair worktree to `D:/16Wordpress_nextjs/.worktrees/prerelease-public-paths-integration/node_modules`. No installation or copying. All subsequent test commands ran from the repair worktree.

The new regression creates a small temporary Git repository, reads the source seed using `git show HEAD:<path>`, verifies that blob against the existing approved manifest, copies the actual attributes, adds with `core.autocrlf=false`, removes the exported seed, and runs real `git -c core.autocrlf=true checkout-index --force -- <path>`. It verifies exported SHA and exact byte equality with the original blob. User-global attributes are disabled for the temporary operation; `core.safecrlf=false` makes the conversion reproducible without unrelated warning policy. No mock, manifest relaxation, seed-content normalization in assertions, Docker, network, or recursive worktree is involved. Cleanup is limited to the generated temporary directory after an absolute containment check.

## RED and GREEN

Command (same command for each focused run):

```powershell
node ../prerelease-public-paths-integration/node_modules/vitest/vitest.mjs run tests/infrastructure/prerelease-compose.test.ts --maxWorkers=1
```

1. RED at 09:45:29, exit 1: 3 failed / 7 passed, 883 ms. Expanded attribute assertion received `eol: unspecified`; actual temporary checkout returned the defective CRLF SHA above instead of the approved SHA; original manifest assertion failed for the same SHA. Both existing Linux entrypoint assertions were preserved.
2. Added only the exact LF attribute. Initial `git checkout-index --force -- <seed>` returned 0 but left the existing working file unchanged through Git's stat cache. At 09:45:37, focused run exit 1: new fresh-checkout regression and attribute check passed, 9 passed / 1 failed; original working-file hash assertion still saw the CRLF bytes. This intermediate result was not reported as a complete GREEN.
3. Verified `git diff --exit-code -- <seed>` returned 0, recorded its current SHA, removed only that exact tracked seed copy in the repair worktree, then used `git checkout-index --force -- <seed>` to export it afresh. Actual SHA became the approved LF SHA. No seed source edits or hash changes were made.
4. GREEN at 09:45:50, exit 0: 1 file / 10 tests passed, 897 ms (542 ms tests). This includes all original Compose assertions, expanded Linux-entrypoint/seed attributes, actual Windows-style checkout/readback, and all-manifest seed hashes.

## Validation and self-review

- `node ../prerelease-public-paths-integration/node_modules/eslint/bin/eslint.js tests/infrastructure/prerelease-compose.test.ts`: independent exit 0, no output.
- `git diff --check` and `git diff --cached --check`: exit 0. Git emitted ordinary working-copy LF-to-CRLF notices for the edited attributes/test text; these are not seed warnings or lint failures.
- Staging the freshly exported seed refreshed its Git stat information; `git diff --cached --name-status` contained only the two intended files, with no seed or manifest entry.
- `git diff --cached --exit-code -- wordpress/seed/apply-tio2-my-prerelease-public-paths.php ops/prerelease/seed-manifest.json`: exit 0.
- After commit, `git diff HEAD^ HEAD --exit-code -- wordpress/seed/apply-tio2-my-prerelease-public-paths.php ops/prerelease/seed-manifest.json`: exit 0.
- Removing this attribute reproduces the actual conversion bug, so the new regression guards the observable hash contract rather than merely matching configuration text. Existing manifest hash validation is unchanged.
- No full suite, typecheck, application build, E2E, CMS, provider or fresh Manifest operation was required or run by this repair. Parent owns technical review and integration verification.
- No merge to develop/main. Develop remained `8a2698d7f4dc3d8d3fb3bafb3d91ee017c0bea58` at completion.
- Original accepted worktree read-only final check: HEAD `b081001e93f7ad269dd25ff5c5b1a3177f8d63fa`, clean; on-disk Build ID `qyjMXbbCPr3yW3ZlKuD97`. No process was stopped or started, and its existing Manifest was not written. This report is in the original ignored SDD directory, as explicitly authorized; it is not a new evidence seal.
