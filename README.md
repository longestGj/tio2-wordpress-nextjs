# TiO₂ local WordPress + two-site Next.js integration

This repository is a local-only integration environment for one WordPress CMS and two isolated Next.js sites. The sites share code, schema, and the CMS instance, but each managed Page/Post belongs to exactly one site and the two content sets remain independent:

- Site A: `http://localhost:3001` (`SITE_ID=tio2-a`, `.next-tio2-a`)
- Site B: `http://localhost:3002` (`SITE_ID=tio2-b`, `.next-tio2-b`)
- WordPress: `http://127.0.0.1:8080` (loopback only)

The verified code is backed up in a private GitHub repository. Vercel, DNS changes, production deployment, and Search Console work remain paused. The approved origins are `tio2products.com` for Site A and `tio2hub.com` for Site B; local tests use them only for canonical, sitemap, robots, and JSON-LD assertions and never contact the public domains.

## Requirements

- Windows PowerShell 5.1 or newer
- Node.js 20.9 or newer and npm
- Docker Desktop with Linux containers
- Available local ports 8080, 3001, and 3002

## First-time setup

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-local-wordpress-env.ps1
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml up -d
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-wordpress.ps1
powershell -ExecutionPolicy Bypass -File scripts/seed-local-wordpress.ps1 -ScalePages 500
npm install
npx playwright install chromium
npm run verify:local
```

The environment generator writes the ignored `wordpress/.env` with a non-default editor name plus independent, cryptographically random admin, revalidation, and preview secrets. It refuses to overwrite an existing file unless `-Force` is explicitly supplied and never prints generated secrets. Bootstrap applies that generated password to the real local WordPress administrator and removes the legacy `admin` login. On a fresh install, the password reaches the one-shot WP-CLI process only through standard input, never through container/process arguments or logs. Verification checks both the file contract and the live WordPress login state without logging credentials.

If this worktree already has an older `wordpress/.env`, migrate it in place. The force mode preserves its database settings, URLs, and administrator email while rotating every administrator/integration credential:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/new-local-wordpress-env.ps1 -Force
docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml up -d --force-recreate --no-deps wordpress
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-wordpress.ps1
```

Managed Page/Post routes are unique across both post types for an exact `(site_scope, public_path)` pair. Draft, pending, private, future, published, trashed, and auto-draft owners reserve the route until their path changes or they are permanently deleted. Invalid ownership, duplicate ownership, or a WordPress-suffixed internal slug forces public-ish saves back to draft and leaves a persistent Admin error.

The seed creates five representative pages plus 500 deterministic scale pages per site: exactly 505 published paths in each site scope. All `long-tail-*` pages are visibly labeled synthetic test content and must not be treated as verified commercial or technical claims. The optional TiO₂ custom-post-type fixtures exercise the schema; managed pages do not depend on shared entity content or a cross-site invalidation graph.

## One-command local verification

```powershell
npm run verify:local
```

The gate is fail-fast and requires a completely clean Git worktree at both the start and end, including no untracked files. Commit or remove intentional local source changes before running it; ignored `.tmp` logs and build artifacts do not affect this check. It checks Compose configuration and service health, runs the dedicated WordPress homepage smoke before the remaining schema/authoring/webhook/preview contracts, audits exactly 505 public URLs per site, runs lint, typecheck, deterministic schema refresh and GraphQL code generation, homepage-focused plus complete 4-worker Vitest suites, the opt-in live seed suites, both current-site builds, 20 Chromium acceptance tests, deterministic homepage bundle budgets, two-site mobile Lighthouse audits, and independent HTTP audits. The browser suites cover 360/768/1440 screenshots, section order, site isolation, overflow, keyboard-visible focus, RFQ anchor and local-only form behavior, native FAQ interaction, axe serious/critical findings, unexpected network requests, unpublished Preview, 404s, and owning-site webhook delivery. The webhook queue preserves each site's exact old/new route pairing during an ownership move instead of forming a cross-product. The live seed stage restores and audits the exact 505-per-site baseline in `finally`, including when a live test fails. The last stdout line is the approved machine-readable homepage success summary. Detailed command logs are written under ignored `.tmp/local-verify`.

Homepage visual evidence is written to ignored `.tmp/homepage-evidence/{siteId}/{width}.png`. Lighthouse JSON reports are written to ignored `.tmp/homepage-evidence/lighthouse`. The deterministic bundle audit compares root-route client JavaScript with the shared/catch-all baseline and enforces 25,600 gzip bytes for each site. Lighthouse uses local mobile emulation only, rejects non-loopback requests or navigation, requires Performance of at least 0.90, and requires Accessibility of exactly 1.00.

Verification always stops only the two Node processes it started, including after a failed test or a bounded startup timeout. The controller writes recoverable process state after every launch and accepts cooperative cancellation. PID, executable path, process start time, Next CLI path, and port arguments are validated immediately before stopping through the retained process handle. It never kills a process merely by name or port.

Local output is deliberately `noindex,nofollow`, and local `robots.txt` uses `Disallow: /`. This protects local and preview evidence even though canonical and sitemap URLs use the approved production domains. A signed preview link creates only an HttpOnly, same-site, expiring session for its exact site and public path; it cannot authorize a second draft path and stops authorizing when the link expiry is reached. Published requests continue through the normal published GraphQL path.

## Keep both sites running for browser review

Run the full gate once so both current build directories exist, then start the controller-owned servers:

```powershell
npm run sites:start
npm run sites:status
```

Open `http://localhost:3001` and `http://localhost:3002`. Standard output, standard error, PID identity, and controller state are stored under ignored `.tmp/local-sites`. The launcher uses hidden Windows processes but leaves the sites available after the command returns. It reads each site's preview and revalidation secrets from the ignored WordPress environment; secrets are never written to logs. The Next servers listen on the local host network so the WordPress container can deliver its signed per-site webhooks, while WordPress port 8080 itself remains loopback-bound.

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

- **Missing `wordpress/.env`:** run `scripts/new-local-wordpress-env.ps1`; keep the generated file local and never commit it.
- **The environment/admin credential gate rejects retained local state:** use the three-command migration sequence above. Do not hand-edit a predictable password into `.env`.
- **A Compose service is unavailable:** run `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml ps`; start it with the setup `up -d` command and rerun bootstrap if needed.
- **Seed audit does not report exactly 505:** rerun `scripts/seed-local-wordpress.ps1 -ScalePages 500`, then `scripts/audit-seed.ps1 -ExpectedPerSite 505`.
- **Chromium is missing:** run `npx playwright install chromium`.
- **A homepage bundle or Lighthouse gate fails:** inspect `.tmp/local-verify/homepage-bundle.log`, `.tmp/local-verify/homepage-lighthouse-a11y.log`, and `.tmp/local-verify/homepage-lighthouse-performance.log`; JSON reports remain under `.tmp/homepage-evidence/lighthouse`.
- **A build directory is missing or stale:** run `npm run verify:local`; it rebuilds `.next-tio2-a` and `.next-tio2-b` from live local WordPress.
- **Port 3001 or 3002 is occupied:** inspect the owning application yourself. The controller refuses to kill unrecorded or identity-mismatched processes.
- **A local site fails health checks:** inspect `.tmp/local-sites/tio2-a.stderr.log` and `.tmp/local-sites/tio2-b.stderr.log`.
- **A verification gate fails:** inspect the named log under `.tmp/local-verify`; rerunning remains safe because the verifier cleans up its own child processes in `finally`.
- **The gate reports a dirty worktree:** run `git status --short --untracked-files=all`, then commit or remove every intentional tracked and untracked source file before retrying.
