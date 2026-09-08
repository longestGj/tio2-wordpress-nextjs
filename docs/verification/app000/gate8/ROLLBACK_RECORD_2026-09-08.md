# APP-000 Gate 8 rollback record

- Site/page: `tio2-my` / `APP-000`
- Candidate implementation: `f0285f288e256ce0c48205931dd8edf4b802b285`
- Candidate build: `.next-app000-f0285f2` / `jf9b1VFzbgKGSQMVOMMbU`
- Candidate runtime: `http://127.0.0.1:4391`
- Prior target commit: `cfe9ef37ca3a8d9c6b05365ca6b09bcd22baf670`
- Prior APP-000 build directory / Build ID: `NONE`; the baseline has no Malaysia APP-000 implementation artifact.
- Result: `DRY_RUN_IDENTITY_AND_PROCEDURE_VERIFIED / NOT_APPLIED_WHILE_GATE9_CANDIDATE_IS_HELD`

`git cat-file -e cfe9ef37ca3a8d9c6b05365ca6b09bcd22baf670^{commit}` succeeded. Source inspection at that commit confirms the APP-000 Malaysia contract, scoped CMS model, renderer and Gate 8 route implementation introduced by this branch are absent. The baseline therefore represents the exact prior repository identity and would restore the prior controlled-unavailable Malaysia `/applications/` behavior.

The rollback procedure is: create an isolated checkout at the prior target commit; restore the site-bound environment without copying candidate CMS/config values; build to a new, unique `NEXT_DIST_DIR`; stop only the APP-000 candidate processes after a rollback decision; clear the APP-000 Next build/cache directory and restart its site-bound CMS/runtime; then verify `/applications/` is controlled-unavailable for `tio2-my`, representative Site A behavior is unchanged, no foreign-site fallback appears, and the prior commit/build/runtime markers agree. Revalidation and cache clearing stay scoped to APP-000 tags and the new rollback build directory.

No rollback was applied because Gate 8 must hold the exact candidate for Gate 9. The procedure avoids changing main, other worktrees, the SYS/THANK runtime, production, CMS content or consumer pages. This record supplies the repository identity, cache-clear path and restored-runtime checks required by `APP000-G9-14` and `APP000-G9-15`; execution remains contingent on a Gate 9 return or explicit rollback instruction.
