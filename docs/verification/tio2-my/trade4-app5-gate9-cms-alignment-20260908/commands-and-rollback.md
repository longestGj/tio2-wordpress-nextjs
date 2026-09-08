# Direct CMS alignment commands and rollback

All commands run from `D:/16Wordpress_nextjs/.worktrees/trade4-app5-gate8`. They use `.tmp/docker-compose.editorial.yml`, which binds the task-owned `tio2my9_editorial_wp` and `tio2my9_editorial_db` volumes and exposes WordPress only on `127.0.0.1:8186`.

## Plan

```powershell
docker compose -p tio2my9 --env-file wordpress/.env -f .tmp/docker-compose.editorial.yml run --rm wpcli wp eval-file /workspace/docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/sync-approved-contracts.php Plan
```

The captured result is `cms-sync-plan.json`. `cms-rollback-seed.json` is an immutable copy containing each prior value as base64 plus the before/after hashes and allowed field diff.

## Apply

```powershell
docker compose -p tio2my9 --env-file wordpress/.env -f .tmp/docker-compose.editorial.yml run --rm wpcli wp eval-file /workspace/docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/sync-approved-contracts.php Apply /workspace/docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/cms-sync-plan.json
```

The captured result is `cms-sync-apply.json`. All three `exact` values are `true`.

## Restore prior isolated-CMS bytes

Run only if the review candidate is withdrawn:

```powershell
docker compose -p tio2my9 --env-file wordpress/.env -f .tmp/docker-compose.editorial.yml run --rm wpcli wp eval-file /workspace/docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/sync-approved-contracts.php Restore /workspace/docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/cms-rollback-seed.json
```

Expected restored hashes are the three `beforeSha256` values in `cms-sync-plan.json`. Restore is reversible by repeating Apply against the same Plan after verifying the current hashes.

## Direct build and preview

Environment values are loaded locally from ignored `wordpress/.env`; secret values are never written to evidence.

```powershell
$env:SITE_ID='tio2-my'
$env:WORDPRESS_GRAPHQL_URL='http://127.0.0.1:8186/graphql'
$env:NEXT_DIST_DIR='.next-gate9-direct-4a7e170'
npm run build -- --webpack
node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3231
```

The running process also receives the local editorial token and revalidation secret from the ignored environment file. Runtime identity is recorded in `runtime-identity.json`.
