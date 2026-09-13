# CMS semantic comparison and route repair

Goal: resolve the approved tio2-my production gap without replacing page content.

Architecture: retain read-only snapshot verification, version the semantic snapshot, and limit JSON normalization to known contract keys. Preserve production historical slugs. A separate explicit route repair must bind the 95 changes to the approved route inventory and an actual backup/restore window; never weaken frontend-only checks to perform writes.

- [ ] Add failing tests for JSON equivalence and semantic differences; implement v2 snapshot in cms_content_snapshot.php/.py and migrate current test fixtures. Recollect evidence after deployment; never relabel v1 receipts.
- [ ] Confirm the administrator repair execution path against existing installation prerequisites. Existing installation requires a completed frontend transaction, whereas this server is PREPARED before phase-one adoption. Do not bypass that prerequisite or silently expand an installation action.
- [ ] Build and test a separately bound route repair with existing full-database backup/restore primitives, write blocking, same-window recovery and exact site/route assertions. Keep unknown metadata and historical slug values intact.
- [ ] Independent review, local real-database rehearsal, then freeze and prerelease the result before preparing any production write command.
