# Task 9A seed LF fix review

## Spec compliance

**PASS.** Reviewed fixed `8a2698d7f4dc3d8d3fb3bafb3d91ee017c0bea58..b4eb8b13211449655518315e4f3491675fa8e184` in `D:/16Wordpress_nextjs/.worktrees/prerelease-seed-lf`, together with the exact repair report. The two-file change stays within the authorized new Windows checkout defect; it is unrelated to the withdrawn F01 issue or the already accepted APP contract.

- `.gitattributes:31` adds only the precise `wordpress/seed/apply-tio2-my-prerelease-public-paths.php text eol=lf` rule. No seed source, manifest, approved SHA, business behavior or general PHP line-ending rule is changed.
- `tests/infrastructure/prerelease-compose.test.ts:43` retains both Linux entrypoint assertions and adds the affected seed to the exact LF-attribute assertion.
- `tests/infrastructure/prerelease-compose.test.ts:54` adds a real Git fresh-checkout regression. It validates the committed seed blob against the existing manifest first, indexes that blob with the actual repository attributes, removes the temporary exported copy, then checks out with `core.autocrlf=true`. Both the final approved SHA and exact blob-byte equality are required (`:60`, `:73`–`:78`). No hash relaxation, line-ending normalization in the assertion or mocked Git conversion is introduced.

## Quality

**Approved. No Critical, Important or Minor finding.**

- The observable Git export is exercised, so deleting or breaking the attribute reproduces the real hash contract failure rather than only failing a configuration-text expectation.
- Temporary Git operations are directed to the generated directory. Global attribute-file input is neutralized, staging/checking out affects only that temporary repository, and recursive cleanup verifies the resolved path remains under the owned temporary prefix before removal (`tests/infrastructure/prerelease-compose.test.ts:63`–`:84`). The repository, seed and original manifest are read-only inputs to this regression.
- The exact-path attribute is the smallest production-facing correction for the reported CRLF export. Existing all-manifest hash validation remains unchanged.

## Verification evidence and boundaries

- The report names the exact focused command and records RED 3 failed/7 passed, the honest intermediate 9 passed/1 failed due to Git stat-cache retention of the existing exported file, and final GREEN 10/10 after recreating only that working seed copy. It also records clean ESLint and unchanged seed/manifest Git diffs. These command outcomes are attributed to the implementer report; no standalone repair log file was supplied or found in the bounded SDD locations, and no test was rerun to regenerate it.
- The code directly supports the reported root cause: the approved blob/manifest stays `496ca0fab2c9ed6b1dbb095011a4a03ee80c08b18825275f201e72c247b863e4`, while the repair prevents checkout conversion to the reported CRLF hash. I read the fixed diff once and did not broaden the accepted whole-branch review.
- No tests, builds, CMS/provider operations, source/Git mutations or subagent dispatch. Only this requested review report was written in the original ignored SDD directory.

## Verdict

**Spec: PASS. Quality: Approved.** The bounded fix is ready for the parent's authorized integration and combination regression. This review does not claim the develop merge or subsequent integrated tests have occurred.
