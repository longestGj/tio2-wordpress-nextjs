# Root-only local rollback

This runbook is limited to the disposable local WordPress environment. It does not authorize a production migration, remote CMS write, deployment, DNS change, indexing change, push, or remote cache operation. External actions: none.

## Required evidence

- Use the exact JSON snapshot created by `scripts/migrate-root-only-wordpress.ps1` under the ignored `.local-evidence/` directory.
- Record its `schemaVersion`, `inventoryVersion`, and `snapshotChecksum` before any transition.
- Record the ordered implementation commit set from the current branch history. Do not guess file revisions. The compatibility runtime baseline is `b9b38b257024e5f5082cddd5fbe02318cfc2407a`.
- Keep every snapshot and audit artifact, including evidence from failed or superseded attempts.

## Data rollback order

1. Stop new local editorial mutations and confirm the snapshot path resolves inside this worktree's `.local-evidence/` directory.
2. While the current restore tooling still exists, run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restore-root-only-wordpress.ps1 -SnapshotPath <exact-snapshot.json>
   ```

3. The CLI-only restore context must validate the typed snapshot and checksum before mutation. It restores only each Page's prior status and the Product fixture's prior status plus original empty `site_scope`. It must not restore or overwrite titles, bodies, excerpts, ACF values, media references, paths, slugs, or legitimate later editorial edits.
4. Run an independent legacy audit:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/audit-seed.ps1 -ExpectedPerSite 505
   ```

5. Confirm both sites independently report 505 public URLs, the Product fixture is `publish + [] + publicPath:null`, both dedicated homepages remain published, and the audit reports `crossSiteLeaks: 0`. Stop if any check fails.

## Repository configuration rollback

Only after the data restore and independent 505/505 audit pass, reverse the recorded ordered implementation commit set back toward runtime baseline `b9b38b257024e5f5082cddd5fbe02318cfc2407a`. Preserve the snapshot and audit evidence outside the reverted commit set. Test the commit reversal against a disposable fixture/worktree first; do not mutate the implementation branch as a rollback experiment.

Run the baseline compatibility acceptance commands recorded for that baseline. A repository rollback is incomplete until the restored WordPress state and baseline runtime pass together.

## Failure handling

- A checksum mismatch, missing record, duplicate/ambiguous ownership, count drift, mixed state, identity drift, pending delete/trash state, or partial transition must fail closed.
- Retirement and restore use compensating rollback for any partial WordPress API transition. After a compensation warning, independently audit the expected source state before retrying.
- Never use direct SQL to change status/scope, never delete or trash retained records, and never recreate content from snapshot payloads. The snapshot intentionally contains hashes and restoration state, not copy or media payloads.
