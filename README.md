# TiO₂ local WordPress + two-site Next.js integration

This repository is a local-only integration environment for one WordPress content source and two isolated Next.js sites:

- Site A: `http://localhost:3001` (`SITE_ID=tio2-a`, `.next-tio2-a`)
- Site B: `http://localhost:3002` (`SITE_ID=tio2-b`, `.next-tio2-b`)
- WordPress: `http://localhost:8080`

GitHub, Vercel, real domains, production deployment, and Search Console work are intentionally paused. The checked-in `tio2-a.example.com` and `tio2-b.example.com` origins are placeholders used to prove canonical, sitemap, robots, and JSON-LD isolation; they are not contacted by local tests.

## Requirements

- Windows PowerShell 5.1 or newer
- Node.js and npm
- Docker Desktop with Linux containers
- Available local ports 8080, 3001, and 3002

## First-time setup

From the repository root:

```powershell
Copy-Item wordpress/.env.example wordpress/.env
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml up -d
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-wordpress.ps1
powershell -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500
npm install
npx playwright install chromium
npm run verify:local
```

The seed creates five representative pages plus 500 deterministic scale pages per site: exactly 505 published paths in each site scope. All `long-tail-*` pages are visibly labeled synthetic test content and must not be treated as verified commercial or technical claims.

## One-command local verification

```powershell
npm run verify:local
```

The gate is fail-fast and requires a completely clean Git worktree at both the start and end, including no untracked files. Commit or remove intentional local source changes before running it; ignored `.tmp` logs and build artifacts do not affect this check. It checks Compose configuration and service health, runs the real WordPress plugin smoke test and exact 505-per-site seed audit, lint, typecheck, deterministic GraphQL code generation, all normal Vitest tests, the opt-in live seed suite, both current-site builds, 12 Chromium acceptance tests, and independent HTTP audits. The live seed stage restores and audits the exact 505-per-site baseline in `finally`, including when the live test fails. The last stdout line is one machine-readable JSON success summary. Detailed command logs are written under ignored `.tmp/local-verify`.

Verification always stops only the two Node processes it started, including after a failed test or a bounded startup timeout. The controller writes recoverable process state after every launch and accepts cooperative cancellation. PID, executable path, process start time, Next CLI path, and port arguments are validated immediately before stopping through the retained process handle. It never kills a process merely by name or port.

Local output is deliberately `noindex,nofollow`, and local `robots.txt` uses `Disallow: /`. This protects local and preview evidence even though canonical and sitemap URLs use the current placeholder domain.

## Keep both sites running for browser review

Run the full gate once so both current build directories exist, then start the controller-owned servers:

```powershell
npm run sites:start
npm run sites:status
```

Open `http://localhost:3001` and `http://localhost:3002`. Standard output, standard error, PID identity, and controller state are stored under ignored `.tmp/local-sites`. The launcher uses hidden Windows processes but leaves the sites available after the command returns.

Stop only those recorded and identity-validated processes:

```powershell
npm run sites:stop
```

The equivalent explicit modes are:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-local-sites.ps1 -KeepRunning
powershell -ExecutionPolicy Bypass -File scripts/start-local-sites.ps1 -Stop
```

## Stop Docker services

```powershell
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml down
```

Do not add `-v`: the named local database and WordPress volumes are retained by default.

## Troubleshooting

- **Missing `wordpress/.env`:** copy `wordpress/.env.example`, keep the real file local, then rerun setup.
- **A Compose service is unavailable:** run `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml ps`; start it with the setup `up -d` command and rerun bootstrap if needed.
- **Seed audit does not report exactly 505:** rerun `scripts/seed-local-wordpress.ps1 -ScalePages 500`, then `scripts/audit-seed.ps1 -ExpectedPerSite 505`.
- **Chromium is missing:** run `npx playwright install chromium`.
- **A build directory is missing or stale:** run `npm run verify:local`; it rebuilds `.next-tio2-a` and `.next-tio2-b` from live local WordPress.
- **Port 3001 or 3002 is occupied:** inspect the owning application yourself. The controller refuses to kill unrecorded or identity-mismatched processes.
- **A local site fails health checks:** inspect `.tmp/local-sites/tio2-a.stderr.log` and `.tmp/local-sites/tio2-b.stderr.log`.
- **A verification gate fails:** inspect the named log under `.tmp/local-verify`; rerunning remains safe because the verifier cleans up its own child processes in `finally`.
- **The gate reports a dirty worktree:** run `git status --short --untracked-files=all`, then commit or remove every intentional tracked and untracked source file before retrying.
