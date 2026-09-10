# TiO₂ Malaysia Oracle VPS Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and use a constrained, auditable release system that deploys the exact approved `tio2-my` `main` commit, production WordPress data and Next.js frontend to Oracle VPS `129.146.68.82`, then verifies and can roll back the release.

**Architecture:** A Windows PowerShell controller creates a hash-bound package and calls a root-owned Python release program over the unprivileged `deploy` SSH account. The server program owns a closed state machine for preparation, backup, WordPress takeover and migration, ARM64 frontend build, loopback validation, Nginx switch, verification and rollback. Existing WordPress/MariaDB volumes are preserved; immutable code releases and verified backups are stored under root-owned production directories.

**Tech Stack:** PowerShell 7/Windows PowerShell 5.1, Node.js 24, TypeScript/Vitest, Python 3 standard library, PHP/WP-CLI, Docker Compose, WordPress 7.1, MariaDB 11.4, Next.js 16.3.x, Nginx, Certbot, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-10-oracle-vps-production-deployment-design.md`

## Global Constraints

- Work only on `codex/oracle-vps-production-deployment`, created from `develop@9571dd2ab7e7f2c7c9cb373e008ca81b3c534822`; do not modify `main` or `develop` while implementing tasks.
- The release source must be an exact clean approved `main` commit with a healthy local prerelease identity; the currently observed candidate is not a permanent hard-coded release version.
- Production identity is `SITE_ID=tio2-my`, `NODE_ENV=production`, `VERCEL_ENV=production`, public site `https://tio2malaysia.com`, CMS `https://cms.tio2malaysia.com`.
- Public routing is Nginx only. Next binds `127.0.0.1:3000`, candidate Next binds `127.0.0.1:3001`, WordPress binds `127.0.0.1:8080`, and MariaDB has no host port.
- `deploy` stays outside the Docker group and receives no general sudo. Its only privileged entry point is root-owned `/usr/local/sbin/tio2-release` with actions `status`, `prepare`, `backup`, `deploy`, `verify`, `rollback`.
- Production release roots are `/opt/tio2-production`, `/etc/tio2-production`, `/home/deploy/tio2-incoming` and `/home/deploy/tio2-outgoing`. No caller-controlled server path is accepted.
- Existing `wordpress_wp_data` and `wordpress_db_data` are production data. No destructive step may run before a validated complete backup and encrypted offsite export.
- Production migration is plan-bound, incremental and limited to proven `site_scope=tio2-my` identities. Do not run the prerelease bootstrap or replace the whole database.
- The release verification surface is the exact 58-entry `tests/fixtures/prerelease/scope-58.json`: 56 ordinary pages, `/thank-you/`, and the intended `/404/` 404 behavior.
- Production base images are pinned to the 2026-09-10 multi-architecture digests: `node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553`, `wordpress:php8.3-apache@sha256:5a93c470ae8220fddf71f6ebe3bc94e615ddc2ae4d9810f795b830fb11c41a17`, and `mariadb:11.4@sha256:80494b9810694179889f7281ec44ca928241df577159c0356a1070e2e94616a1`.
- Ordinary tests and release verification issue zero external form POSTs. A real production form submission remains a separate recorded action.
- Never print or commit secrets, receiver identity, private backup content, buyer data, full environment blocks or private SSH key bytes.
- The root `AGENTS.md` is not modified.
- Existing pre-task baseline: 3,040 tests passed, 52 skipped and 24 failed; 21 failures require the ignored `wordpress/.env` absent from the worktree, and 3 existing editorial fixture assertions miss `M-996`. Record these as baseline facts and require the new production-specific suites to pass independently.

`RELEASE_ID` below means the exact `yyyyMMddTHHmmssZ-` prefix plus 12 lowercase commit characters returned by `New-ProductionPackage`; `RELEASE_COMMIT` means its exact 40-character lowercase commit. These are validated runtime identities, never free-form path input.

---

## File and interface map

| File | Responsibility |
|---|---|
| `ops/production/release-package.schema.json` | JSON Schema for the non-secret local package manifest |
| `ops/production/release-surface.json` | Hash-bound 58-object public verification contract |
| `ops/production/migration-manifest.json` | Ordered, hash-bound production migration allowlist |
| `ops/production/.env.example` | Production variable names and non-secret shape documentation |
| `ops/production/Dockerfile` | Reproducible ARM64-compatible Next.js build/runtime image |
| `ops/production/docker-compose.yml` | Fixed production services, volumes, networks and loopback bindings |
| `ops/production/nginx/tio2malaysia.conf.template` | CMS, apex and `www` routing with staged HTTP/TLS blocks |
| `ops/production/server/tio2_release.py` | Closed privileged CLI and action dispatch only |
| `ops/production/server/release_contract.py` | Manifest, archive, path, environment and resource validation |
| `ops/production/server/release_state.py` | Locking, state transitions, atomic JSON and audit receipts |
| `ops/production/server/release_actions.py` | Fixed subprocess plans for backup, deploy, verify and rollback |
| `ops/production/server/install.sh` | One-time root bootstrap with fixed owners, modes and sudo rule |
| `ops/production/server/sudoers.tio2-release` | Exact sudo policy for the deployment account |
| `ops/production/server/sshd-tio2-production.conf` | Fixed key-only SSH hardening drop-in activated only after recovery and release checks |
| `ops/production/backup.sh` | Consistent DB/files/config backup and encrypted export |
| `ops/production/migrate-wordpress.sh` | WP-CLI plan/apply/readback orchestration |
| `wordpress/seed/tio2-my-production-migration.php` | Single-process transactional migration capability |
| `wordpress/seed/apply-tio2-my-production-routes.php` | Production-safe route readiness mutation called by the capability |
| `wordpress/seed/refresh-tio2-my-production-resources.php` | Production capability variant of the guarded R706/Chemours predecessor refresh |
| `wordpress/seed/export-tio2-my-production-audit.php` | Normalized production CMS readback |
| `scripts/production.ps1` | Public local actions: Package, Upload, Status, Release, Verify, Rollback |
| `scripts/production/Production.Core.psm1` | Git/package/SSH/hash/receipt functions used by the controller |
| `tests/production/*.test.py` | Server program unit tests using only temp directories and fake commands |
| `tests/infrastructure/production-*.test.ts` | Repository, Compose, controller, manifest and security contracts |
| `tests/e2e/production-public-surface.spec.ts` | Public 58-object no-POST production verification |
| `tests/fixtures/production/` | Local HTTP/CMS/listener fixture used to prove the production E2E suite before public execution |
| `docs/production-deployment.md` | Operator runbook and one-time bootstrap instructions |
| `docs/verification/production/tio2-my/RELEASE_ID/receipt.md` | Deliberately sealed non-secret production result |

The Python modules expose these stable interfaces:

```python
@dataclass(frozen=True)
class ReleasePaths:
    incoming: Path
    outgoing: Path
    production: Path
    configuration: Path

def validate_manifest(manifest_path: Path, archive_path: Path) -> dict[str, object]: ...
def inspect_archive(archive_path: Path, manifest: dict[str, object]) -> list[str]: ...
def transition(state_root: Path, expected: set[str], next_state: str, details: dict[str, object]) -> dict[str, object]: ...
def run_action(action: str, paths: ReleasePaths) -> dict[str, object]: ...
```

The PowerShell module exposes:

```powershell
Get-ProductionGitIdentity
Assert-ProductionCandidate
New-ProductionPackage
Send-ProductionPackage
Invoke-ProductionReleaseAction
Receive-ProductionBackup
Write-ProductionReceipt
```

## Task 1: Freeze production package, migration and 58-object contracts

**Files:**
- Create: `ops/production/release-package.schema.json`
- Create: `ops/production/release-surface.json`
- Create: `ops/production/migration-manifest.json`
- Create: `ops/production/.env.example`
- Create: `tests/infrastructure/production-contracts.test.ts`

**Interfaces:**
- Consumes: `tests/fixtures/prerelease/scope-58.json`, `ops/prerelease/seed-manifest.json`, current environment reads in application code.
- Produces: schema version `tio2-production-release-v1`, surface version `tio2-my-production-surface-v1`, migration version `tio2-my-production-migration-v1`.

- [ ] **Step 1: Write failing contract tests**

Create tests that require exact site/domain/port identities, 58 ordered surface entries, 57 expected 200 responses plus `/404/` expected 404, and a production migration allowlist whose file hashes match Git bytes. Include this exact core assertion:

```ts
expect(surface).toMatchObject({
  schemaVersion: 'tio2-my-production-surface-v1',
  siteId: 'tio2-my',
  website: 'https://tio2malaysia.com',
})
expect(surface.objects).toHaveLength(58)
expect(surface.objects.filter(item => item.expectedStatus === 200)).toHaveLength(57)
expect(surface.objects.find(item => item.id === 'SYS-404')).toMatchObject({path: '/404/', expectedStatus: 404})
```

Assert that `migration-manifest.json` excludes `ops/prerelease/bootstrap-wordpress.sh`, `wordpress/seed/apply-tio2-my-prerelease-public-paths.php` and the local-only `wordpress/seed/refresh-tio2-my-resource-candidate.php`, and includes only `wordpress/seed/` paths matching their SHA-256.

- [ ] **Step 2: Run the tests and confirm the files are missing**

Run: `npx vitest run tests/infrastructure/production-contracts.test.ts`

Expected: FAIL with `ENOENT` for `ops/production/release-surface.json`.

- [ ] **Step 3: Add the four production contracts**

Build `release-surface.json` by copying the exact ordered objects from `tests/fixtures/prerelease/scope-58.json`, then normalize `SYS-404` as the production ID while preserving `/404/` and status 404. Define required environment names without values:

```dotenv
SITE_ID=tio2-my
NODE_ENV=production
VERCEL_ENV=production
NEXT_PUBLIC_SITE_URL=https://tio2malaysia.com
WORDPRESS_GRAPHQL_URL=http://wordpress/graphql
WORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com
WORDPRESS_PREVIEW_URL=https://cms.tio2malaysia.com/wp-json/tio2/v1/preview
NEXTJS_REVALIDATION_URL_TIO2_MY=http://web:3000/api/revalidate
NEXTJS_REVALIDATION_SECRET_TIO2_MY=REQUIRED_ROOT_ONLY_VALUE
NEXTJS_PREVIEW_SECRET_TIO2_MY=REQUIRED_ROOT_ONLY_VALUE
WORDPRESS_EDITORIAL_API_TOKEN=REQUIRED_ROOT_ONLY_VALUE
NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=REQUIRED_APPROVED_UUID
TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=false
```

Define the package schema with `additionalProperties: false`, lowercase 40-hex commit, lowercase 64-hex hashes, fixed `siteId: tio2-my`, ordered `files`, migration hash and surface hash. Copy the current prerelease seed allowlist into the production migration manifest except the prerelease route script and local-only resource refresh; retain each current SHA-256 and add their production capability replacements after Task 7 creates them.

- [ ] **Step 4: Run contract tests**

Run: `npx vitest run tests/infrastructure/production-contracts.test.ts`

Expected: PASS; output reports one passing file and no skipped production contract.

- [ ] **Step 5: Commit**

```bash
git add ops/production tests/infrastructure/production-contracts.test.ts
git commit -m "test(deploy): define production release contracts"
```

## Task 2: Build the deterministic local package core

**Files:**
- Create: `scripts/production/Production.Core.psm1`
- Create: `tests/infrastructure/production-package.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: Task 1 schemas and a clean Git `main` checkout.
- Produces: `New-ProductionPackage -RepositoryRoot $repositoryRoot -OutputRoot $outputRoot` returning `{releaseId, commit, archivePath, archiveSha256, manifestPath, manifestSha256}`.

- [ ] **Step 1: Write failing package tests**

Use a temporary Git repository and assert rejection of a feature branch, dirty tracked files, untracked files, wrong site, absent prerelease receipt, path traversal and a file changed after hashing. Assert that secrets and ignored files are absent from the archive.

```ts
expect(result.status).not.toBe(0)
expect(result.stderr).toContain('Production packaging requires a clean main worktree')
expect(result.stderr).not.toContain('database-secret')
```

- [ ] **Step 2: Run the package test red phase**

Run: `npx vitest run tests/infrastructure/production-package.test.ts`

Expected: FAIL because `Production.Core.psm1` does not exist.

- [ ] **Step 3: Implement Git identity, candidate and hashing functions**

Implement `Get-ProductionGitIdentity`, `Assert-ProductionCandidate` and `Get-ProductionSha256`. Require branch `main`, empty porcelain output and a prerelease receipt whose commit/site/Build/CMS fields are complete. Read receipt data only from an explicit path below `.prerelease/runs/` and never serialize secret environment values.

- [ ] **Step 4: Implement `New-ProductionPackage`**

Use `git archive --format=tar` for the exact commit, enumerate archive members, calculate ordered per-file hashes after safe extraction to the fresh `.production/runs/RELEASE_ID/` directory, validate Task 1 contracts, write canonical UTF-8 JSON and create `release.tar.gz`. Use create-new semantics for every run file.

Return exactly:

```powershell
[pscustomobject][ordered]@{
  releaseId = $releaseId; commit = $commit
  archivePath = $archivePath; archiveSha256 = $archiveSha256
  manifestPath = $manifestPath; manifestSha256 = $manifestSha256
}
```

- [ ] **Step 5: Ignore generated production runs and rerun tests**

Add `.production/` to `.gitignore`.

Run: `npx vitest run tests/infrastructure/production-package.test.ts`

Expected: PASS, including the archive-content and mutation-after-hash cases.

- [ ] **Step 6: Commit**

```bash
git add .gitignore scripts/production/Production.Core.psm1 tests/infrastructure/production-package.test.ts
git commit -m "feat(deploy): create deterministic production packages"
```

## Task 3: Implement the privileged program’s validation and state core

**Files:**
- Create: `ops/production/server/release_contract.py`
- Create: `ops/production/server/release_state.py`
- Create: `ops/production/server/tio2_release.py`
- Create: `tests/production/test_release_contract.py`
- Create: `tests/production/test_release_state.py`

**Interfaces:**
- Consumes: fixed `ReleasePaths`, incoming manifest/archive and closed action string.
- Produces: safe extracted release, exclusive lock, atomic state and one JSON result per action.

- [ ] **Step 1: Write Python red tests for the privilege boundary**

Use `tempfile.TemporaryDirectory`, synthetic tar archives and fake fixed paths. Cover absolute paths, `..`, symlinks, devices, undeclared members, duplicate members, excessive count/expanded size, invalid commit/hash/site, wrong owner/mode simulation, concurrent lock and illegal transitions.

```python
with self.assertRaisesRegex(ReleaseError, "unsafe archive member"):
    inspect_archive(self.archive, self.manifest)
self.assertEqual(parse_action(["status"]), "status")
with self.assertRaisesRegex(ReleaseError, "fixed action"):
    parse_action(["shell", "id"])
```

- [ ] **Step 2: Run the Python tests and confirm imports fail**

Run: `python -m unittest discover -s tests/production -p "test_*.py" -v`

Expected: FAIL with `ModuleNotFoundError` for the new server modules.

- [ ] **Step 3: Implement archive and manifest validation**

Set immutable defaults:

```python
DEFAULT_PATHS = ReleasePaths(
    incoming=Path('/home/deploy/tio2-incoming'),
    outgoing=Path('/home/deploy/tio2-outgoing'),
    production=Path('/opt/tio2-production'),
    configuration=Path('/etc/tio2-production'),
)
ACTIONS = frozenset({'status', 'prepare', 'backup', 'deploy', 'verify', 'rollback'})
MAX_MEMBERS = 10_000
MAX_EXPANDED_BYTES = 2 * 1024 * 1024 * 1024
```

Open archives without following links, reject non-regular/non-directory members, verify the complete ordered member list and hashes, extract to a newly created root-owned directory and atomically rename it to `releases/RELEASE_COMMIT`.

- [ ] **Step 4: Implement lock, state and audit receipts**

Use `fcntl.flock(LOCK_EX | LOCK_NB)`, write JSON to a same-directory temporary file, `fsync`, `os.replace`, then fsync the directory. Permit only:

```python
TRANSITIONS = {
  'IDLE': {'PREPARED'}, 'PREPARED': {'BACKED_UP'},
  'BACKED_UP': {'DEPLOYING'}, 'DEPLOYING': {'INTERNAL_VERIFIED', 'FAILED'},
  'INTERNAL_VERIFIED': {'PUBLIC_VERIFIED', 'FAILED'},
  'PUBLIC_VERIFIED': {'PREPARED', 'ROLLING_BACK'},
  'FAILED': {'PREPARED', 'ROLLING_BACK'},
  'ROLLING_BACK': {'ROLLED_BACK', 'FAILED'}, 'ROLLED_BACK': {'PREPARED'},
}
```

- [ ] **Step 5: Implement the CLI shell**

Clear the environment to `PATH=/usr/sbin:/usr/bin:/sbin:/bin`, reject extra arguments, acquire the global lock, dispatch one action and print one redacted JSON result. Catch known `ReleaseError` as exit 2 and unexpected exceptions as exit 3 without printing configuration contents.

- [ ] **Step 6: Run Python tests**

Run: `python -m unittest discover -s tests/production -p "test_*.py" -v`

Expected: PASS with all archive, action and transition cases green.

- [ ] **Step 7: Commit**

```bash
git add ops/production/server tests/production
git commit -m "feat(deploy): constrain privileged release state"
```

## Task 4: Define fixed Compose, image and Nginx templates

**Files:**
- Create: `ops/production/Dockerfile`
- Create: `ops/production/docker-compose.yml`
- Create: `ops/production/nginx/tio2malaysia.conf.template`
- Create: `tests/infrastructure/production-runtime-contract.test.ts`

**Interfaces:**
- Consumes: immutable release directory and `/etc/tio2-production/production.env`.
- Produces: services `db`, `wordpress`, `wpcli`, `web`, `candidate`; fixed host endpoints 8080, 3000 and 3001.

- [ ] **Step 1: Write failing runtime contract tests**

Assert fixed project name, external volume names, no DB `ports`, read-only plugin mount, loopback bindings, health checks, restart policies, production build arguments and no bind mount from `/home/deploy`.

```ts
expect(compose.services.db.ports).toBeUndefined()
expect(compose.services.wordpress.ports).toEqual(['127.0.0.1:8080:80'])
expect(compose.services.web.ports).toEqual(['127.0.0.1:3000:3000'])
expect(compose.services.candidate.ports).toEqual(['127.0.0.1:3001:3000'])
```

Assert the Nginx template contains only the three approved hosts, `www` 301 to apex, CMS 8080, frontend 3000, `nginx -t` staging marker and no wildcard default proxy.

- [ ] **Step 2: Run the runtime test red phase**

Run: `npx vitest run tests/infrastructure/production-runtime-contract.test.ts`

Expected: FAIL because the three runtime templates do not exist.

- [ ] **Step 3: Add the multi-stage Dockerfile**

Use `node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553`, install with `npm ci`, run `npm run build`, and copy only the required runtime files into the final non-root image. Set `HOSTNAME=0.0.0.0`, expose 3000 and run `npm run start -- --hostname 0.0.0.0 --port 3000`. Use the pinned WordPress and MariaDB digests from Global Constraints and record the resolved platform-specific digests in the release receipt.

- [ ] **Step 4: Add the fixed Compose definition**

Declare external volumes exactly:

```yaml
volumes:
  wp_data:
    external: true
    name: wordpress_wp_data
  db_data:
    external: true
    name: wordpress_db_data
```

Use a private bridge network, root-only env file, fixed health checks and image tags derived by the privileged program, not Compose interpolation supplied by the SSH caller.

- [ ] **Step 5: Add the Nginx template and rerun tests**

Create HTTP and TLS sections for `cms.tio2malaysia.com`, `tio2malaysia.com` and `www.tio2malaysia.com`. Preserve Certbot certificate includes through fixed paths. Proxy CMS to 8080 and apex to 3000; return 301 from `www` while preserving `$request_uri`.

Run: `npx vitest run tests/infrastructure/production-runtime-contract.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ops/production/Dockerfile ops/production/docker-compose.yml ops/production/nginx tests/infrastructure/production-runtime-contract.test.ts
git commit -m "feat(deploy): define production runtime topology"
```

## Task 5: Install the fixed server program safely

**Files:**
- Create: `ops/production/server/install.sh`
- Create: `ops/production/server/sudoers.tio2-release`
- Create: `ops/production/server/sshd-tio2-production.conf`
- Create: `tests/infrastructure/production-bootstrap.test.ts`

**Interfaces:**
- Consumes: a root-copied, SHA-256-verified bootstrap directory.
- Produces: root-owned program/config directories and the sole `deploy` sudo entry.

- [ ] **Step 1: Write failing bootstrap contract tests**

Assert owner/mode commands for every directory, `python3 -m unittest` pre-install check, `visudo -cf`, atomic installation, backup of an earlier program, no Docker-group modification, no immediate SSH hardening and no execution from `/home/deploy`. Require the inactive hardening template to contain `PasswordAuthentication no`, `KbdInteractiveAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes` and `AllowUsers deploy`.

Require sudoers content equivalent to:

```sudoers
Defaults!/usr/local/sbin/tio2-release env_reset,secure_path=/usr/sbin:/usr/bin:/sbin:/bin,!setenv
deploy ALL=(root) NOPASSWD: /usr/local/sbin/tio2-release status, /usr/local/sbin/tio2-release prepare, /usr/local/sbin/tio2-release backup, /usr/local/sbin/tio2-release deploy, /usr/local/sbin/tio2-release verify, /usr/local/sbin/tio2-release rollback
```

- [ ] **Step 2: Run the bootstrap test red phase**

Run: `npx vitest run tests/infrastructure/production-bootstrap.test.ts`

Expected: FAIL because installer and sudoers files are absent.

- [ ] **Step 3: Implement idempotent root installation**

The installer requires UID 0, rejects group/world-writable source files, installs into a root temporary directory, runs tests, installs `age` from the Ubuntu 24.04 package repository when absent, creates fixed directories with explicit modes, installs the program and sudoers via `install`, validates with `visudo -cf`, then atomically activates. It stores the SSH hardening file below the root-owned program directory without enabling it. It creates incoming/outgoing directories owned by `deploy` but never changes Docker membership.

- [ ] **Step 4: Run bootstrap tests and shell syntax check**

Run:

```bash
npx vitest run tests/infrastructure/production-bootstrap.test.ts
bash -n ops/production/server/install.sh
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add ops/production/server/install.sh ops/production/server/sudoers.tio2-release ops/production/server/sshd-tio2-production.conf tests/infrastructure/production-bootstrap.test.ts
git commit -m "feat(deploy): add one-time constrained bootstrap"
```

## Task 6: Implement validated backup and encrypted export

**Files:**
- Create: `ops/production/backup.sh`
- Modify: `ops/production/server/release_actions.py`
- Create: `tests/production/test_backup_action.py`
- Create: `tests/infrastructure/production-backup-contract.test.ts`

**Interfaces:**
- Consumes: state `PREPARED`, current Compose inventory, root config and fixed local backup public key.
- Produces: `/opt/tio2-production/backups/RELEASE_ID/manifest.json`, state `BACKED_UP`, encrypted outgoing artifact and hashes.

- [ ] **Step 1: Write red tests for command order and failure boundaries**

Use a fake command runner to require: resource threshold check; mutation block; request drain; `mariadb-dump --single-transaction`; gzip test; SQL structure check; WordPress stop; tar listing; Nginx copy and `nginx -t`; config archive mode 600; manifest hashes; encryption; and old service restart when deployment does not continue.

Assert no state transition when any validator exits nonzero and no plaintext artifact enters `/home/deploy/tio2-outgoing`.

- [ ] **Step 2: Run red tests**

Run:

```bash
python -m unittest tests.production.test_backup_action -v
npx vitest run tests/infrastructure/production-backup-contract.test.ts
```

Expected: FAIL because `backup.sh` and `backup_release()` are absent.

- [ ] **Step 3: Implement fixed backup script**

Use `set -euo pipefail`, fixed volume/container discovery and `umask 077`. Require free disk `>= max(8 GiB, 2 × measured working set)` and available memory `>= 2 GiB`. Write each component to a new backup directory, validate before hashing, then create the manifest last. Never interpolate package values into shell code.

- [ ] **Step 4: Implement encryption and retention**

Encrypt the registered backup tar stream with `age` to the configured local backup public key; write ciphertext only to outgoing. Retain the newest three complete verified server backups and refuse deletion unless the current release and replacement backup both verify. If `age` is absent, `backup` fails before production mutation; the bootstrap installs or verifies it explicitly.

- [ ] **Step 5: Run backup tests**

Run the two Step 2 commands.

Expected: PASS, including dump corruption, tar corruption, low disk/memory, encryption failure and retention safety cases.

- [ ] **Step 6: Commit**

```bash
git add ops/production/backup.sh ops/production/server/release_actions.py tests/production/test_backup_action.py tests/infrastructure/production-backup-contract.test.ts
git commit -m "feat(deploy): create verified encrypted backups"
```

## Task 7: Build the production WordPress plan/apply/readback capability

**Files:**
- Create: `wordpress/seed/tio2-my-production-migration.php`
- Create: `wordpress/seed/apply-tio2-my-production-routes.php`
- Create: `wordpress/seed/refresh-tio2-my-production-resources.php`
- Create: `wordpress/seed/export-tio2-my-production-audit.php`
- Create: `ops/production/migrate-wordpress.sh`
- Modify: `ops/production/migration-manifest.json`
- Create: `tests/infrastructure/production-wordpress-migration.test.ts`
- Create: `tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts`

**Interfaces:**
- Consumes: capability JSON `{version, mode, token, manifestPath, manifestSha256, expectedCurrentSha256, planSha256}`.
- Produces in Plan mode `{mode, siteScope, currentSha256, desiredSha256, actions, planSha256}` and in Apply mode `{mode, planSha256, readbackSha256, actionsApplied}`.

- [ ] **Step 1: Write failing source and runtime tests**

Require `WP_CLI`, `wp_get_environment_type() === 'production'`, environment token equality, exact manifest hash and `site_scope=tio2-my`. Test wrong scope, unknown duplicate, unexpected current hash, altered plan, token reuse, cross-site mutation, webhook fanout, transaction rollback and exact readback. Reject any allowlisted legacy seed containing its own `START TRANSACTION`, `COMMIT` or `ROLLBACK`, so only the outer capability controls the transaction.

```ts
expect(plan).toMatchObject({mode: 'plan', siteScope: 'tio2-my'})
expect(plan.planSha256).toMatch(/^[a-f0-9]{64}$/u)
expect(apply.planSha256).toBe(plan.planSha256)
expect(after.siteBIdentitySha256).toBe(before.siteBIdentitySha256)
```

- [ ] **Step 2: Run the migration tests red phase**

Run: `npx vitest run tests/infrastructure/production-wordpress-migration.test.ts tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts`

Expected: FAIL because the production migration capability is absent.

- [ ] **Step 3: Implement production route readiness**

Extract the reusable 42-route identity logic from the prerelease route script into the new production route file. Remove the local/prerelease environment guard, require the production migration capability instead, preserve canonical apex URLs and `LIVE_APPROVED`, and expose a callable function without opening its own transaction.

Create `refresh-tio2-my-production-resources.php` from the current guarded R706/Chemours predecessor logic. Require the same production migration capability and preserve its exact predecessor hashes, Plan/Apply distinction and compensating readback. Replace `refresh-tio2-my-resource-candidate.php` with this production file in the production migration manifest; do not weaken the original local-only guard.

- [ ] **Step 4: Implement deterministic Plan mode**

Verify every ordered manifest entry and dependent config hash. Export a normalized current CMS snapshot by stable page ID, post type, status, scope, route metadata and approved content hash. Reject unknown/multi-owned records. Canonically hash `{manifestSha256,current,desired,actions}` and perform no writes.

- [ ] **Step 5: Implement single-process Apply mode**

Recompute current and plan hashes, require exact equality, start one `$wpdb` transaction, suppress per-record webhook callbacks, execute each allowlisted seed inside an isolated closure on the same PHP process/DB connection, apply route readiness, run normalized readback, commit only after all checks pass, then emit one bounded revalidation event. Roll back and restore hooks on any `Throwable`.

- [ ] **Step 6: Implement the shell wrapper**

`migrate-wordpress.sh` creates a root-only one-use capability, calls Plan, validates one JSON marker, creates a fresh Apply capability bound to Plan, calls Apply, removes both capabilities in `trap`, and writes non-secret plan/readback files below the release state directory.

- [ ] **Step 7: Refresh migration hashes and run tests**

Update `ops/production/migration-manifest.json` with all final current SHA-256 values and the new production route entry. Run the Step 2 command twice: once against a fresh fixture and once against its already-applied state.

Expected: PASS; the second run is an idempotent zero-action plan with the same desired readback.

- [ ] **Step 8: Commit**

```bash
git add wordpress/seed/tio2-my-production-migration.php wordpress/seed/apply-tio2-my-production-routes.php wordpress/seed/refresh-tio2-my-production-resources.php wordpress/seed/export-tio2-my-production-audit.php ops/production/migrate-wordpress.sh ops/production/migration-manifest.json tests/infrastructure/production-wordpress-migration.test.ts tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts
git commit -m "feat(deploy): add production CMS migration capability"
```

## Task 8: Implement prepare, WordPress takeover and internal deployment

**Files:**
- Modify: `ops/production/server/release_actions.py`
- Create: `tests/production/test_deploy_action.py`

**Interfaces:**
- Consumes: validated package, state `BACKED_UP`, fixed Compose/config and Task 7 migration.
- Produces: state `INTERNAL_VERIFIED`, active WordPress on 8080, verified candidate on 3001 and built image identity.

- [ ] **Step 1: Write red tests for complete fixed command plans**

Test `prepare` resource/package checks and `deploy` sequencing with a fake runner. Require old Compose inventory capture, old stack stop, no concurrent volume writers, controlled DB/WP start, plugin compatibility, Plan/Apply/readback, image build, candidate start, `/api` identity probes, and automatic pre-public restore on migration failure.

- [ ] **Step 2: Run red tests**

Run: `python -m unittest tests.production.test_deploy_action -v`

Expected: FAIL because `prepare_release()` and `deploy_internal()` are absent.

- [ ] **Step 3: Implement `prepare_release`**

Validate manifest/archive via Task 3, production env field presence and fingerprints, fixed DNS/site identity, current server inventory, disk/memory thresholds and existing volume names. Create the release directory and state `PREPARED` without starting/stopping containers.

- [ ] **Step 4: Implement controlled WordPress takeover**

After state `BACKED_UP`, stop the old stack, prove no container mounts either data volume, start fixed `db` and `wordpress`, require healthy states, verify WordPress/core/plugin versions, run Task 7 Plan/Apply/readback and preserve the old project files for rollback.

- [ ] **Step 5: Implement image build and candidate validation**

Build tag `tio2-my-web:RELEASE_COMMIT` using the prepared release and root config. Record image digest, run candidate on 3001, require health, fetch runtime site/commit/Build/CMS markers and representative pages, and prove zero external POSTs. On failure stop candidate and restore the first-launch backup when the state proves no public write window.

- [ ] **Step 6: Run deploy action tests**

Run: `python -m unittest tests.production.test_deploy_action -v`

Expected: PASS for success plus every injected failure point.

- [ ] **Step 7: Commit**

```bash
git add ops/production/server/release_actions.py tests/production/test_deploy_action.py
git commit -m "feat(deploy): stage production CMS and frontend"
```

## Task 9: Implement Nginx activation, public verification and rollback

**Files:**
- Modify: `ops/production/server/release_actions.py`
- Create: `tests/production/test_activation_rollback.py`

**Interfaces:**
- Consumes: state `INTERNAL_VERIFIED`, candidate image/identity and fixed Nginx template.
- Produces: active Next 3000, validated Nginx, `PUBLIC_VERIFIED`, or verified `ROLLED_BACK`.

- [ ] **Step 1: Write failing activation/rollback tests**

Inject failures at active-container replacement, health check, `nginx -t`, reload, DNS, certificate, public HTTPS, SSH syntax and key-login probe. Assert candidate config is never installed before `nginx -t`, prior active image restarts on replacement failure, SSH hardening stays inactive until recovery/readiness markers exist, and rollback only chooses `previousVerifiedRelease` from root state.

- [ ] **Step 2: Run red tests**

Run: `python -m unittest tests.production.test_activation_rollback -v`

Expected: FAIL because activation and rollback implementations are absent.

- [ ] **Step 3: Implement active frontend replacement and Nginx staging**

Stop candidate, replace only the fixed `web` service on 3000 with the same verified image digest, check identity again, render the site and a complete candidate main configuration below `/opt/tio2-production/state/nginx/`, run `nginx -t -c /opt/tio2-production/state/nginx/nginx.candidate.conf`, atomically install the validated site file and reload. A failed check restores the prior image/config and verifies them.

- [ ] **Step 4: Implement DNS/TLS completion**

Resolve apex, `www` and `cms` through authoritative nameservers. Require apex and `www` to point to `129.146.68.82` before invoking Certbot for the fixed two domains. Re-run Nginx syntax, HTTPS, apex canonical and `www` redirect checks. If DNS is not ready, keep `INTERNAL_VERIFIED` and return a nonzero `publicLaunchComplete=false` result.

- [ ] **Step 5: Implement fixed rollback**

Read only `previousVerifiedRelease`, set `ROLLING_BACK`, activate its recorded plugin path/image/Nginx configuration, run health/identity checks and set `ROLLED_BACK`. Never restore a database after public traffic automatically; emit the registered backup ID and write-window interval when data rollback needs a decision.

- [ ] **Step 6: Implement gated security completion inside `verify`**

After public checks and a successful rollback rehearsal, require the root-owned recovery-console marker created during bootstrap. Probe a second key-based `deploy` SSH connection, install the fixed SSH drop-in, run `sshd -t`, reload SSH and probe key access again. Inspect reverse dependencies before disabling `rpcbind`; disable/firewall TCP 111 only when no active consumer exists, otherwise record the exact dependency and leave it unchanged. A failed SSH syntax/probe restores the prior drop-in before reload.

- [ ] **Step 7: Run activation tests**

Run: `python -m unittest tests.production.test_activation_rollback -v`

Expected: PASS, including first-launch no-frontend behavior and post-launch code-only rollback.

- [ ] **Step 8: Commit**

```bash
git add ops/production/server/release_actions.py tests/production/test_activation_rollback.py
git commit -m "feat(deploy): activate and roll back production releases"
```

## Task 10: Implement the local operator controller

**Files:**
- Create: `scripts/production.ps1`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `package.json`
- Create: `tests/infrastructure/production-controller.test.ts`

**Interfaces:**
- Consumes: local clean main, dedicated SSH key, fixed host/account and server JSON results.
- Produces: Package, Upload, Status, Release, Verify and Rollback actions with local evidence.

- [ ] **Step 1: Write failing controller tests with fake `ssh` and `scp`**

Require fixed destination `deploy@129.146.68.82`, fixed incoming names, `BatchMode=yes`, host-key checking, exact sudo commands, JSON parsing, stop-on-nonzero, encrypted backup download/hash check and no secrets in argv/logs.

```ts
expect(commands).toContainEqual(['sudo', '/usr/local/sbin/tio2-release', 'prepare'])
expect(commands.some(args => args.join(' ').includes('bash -c'))).toBe(false)
expect(result.stderr).not.toContain('receiver-key')
```

- [ ] **Step 2: Run controller tests red phase**

Run: `npx vitest run tests/infrastructure/production-controller.test.ts`

Expected: FAIL because `scripts/production.ps1` is absent.

- [ ] **Step 3: Implement upload and fixed remote invocation**

`Send-ProductionPackage` copies only `release.tar.gz` and `release-manifest.json`. `Invoke-ProductionReleaseAction` accepts an enum, executes `ssh` with argument arrays, requires one valid JSON result and writes redacted output to `.production/runs/RELEASE_ID/`.

- [ ] **Step 4: Implement resumable `Release`**

Run actions in order: Package, Upload, prepare, backup, encrypted backup download/verification, deploy, verify. Read server state before resuming and require the same commit/archive hash. Stop on any nonzero status and print the failed stage and evidence path.

- [ ] **Step 5: Add package scripts**

```json
"production:status": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/production.ps1 -Action Status",
"production:release": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/production.ps1 -Action Release",
"production:verify": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/production.ps1 -Action Verify",
"production:rollback": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/production.ps1 -Action Rollback"
```

- [ ] **Step 6: Run controller tests**

Run: `npx vitest run tests/infrastructure/production-controller.test.ts tests/infrastructure/production-package.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/production.ps1 scripts/production/Production.Core.psm1 package.json package-lock.json tests/infrastructure/production-controller.test.ts
git commit -m "feat(deploy): automate production release control"
```

## Task 11: Adapt the prerelease evidence logic to public production verification

**Files:**
- Create: `tests/e2e/production-public-surface.spec.ts`
- Create: `tests/e2e/production-server-boundary.spec.ts`
- Create: `tests/fixtures/production/playwright.fixture.config.ts`
- Create: `tests/fixtures/production/server.mjs`
- Create: `tests/infrastructure/production-e2e-contract.test.ts`
- Modify: `scripts/production/Production.Core.psm1`

**Interfaces:**
- Consumes: `ops/production/release-surface.json`, active server receipt and public URLs.
- Produces: no-POST E2E JSON bound to commit, Build, CMS, backup and deployment attempt.

- [ ] **Step 1: Write failing production E2E contract tests**

Require the suite to load the exact 58-object contract, reject a mismatch with the server receipt, block every non-GET browser request, test 1440/768/390 widths, expected status/canonical/site marker, `/404/`, Thank You direct-state behavior, robots/sitemap, mixed content, `www` redirect, CMS GraphQL and loopback/public listener evidence.

- [ ] **Step 2: Run the contract test red phase**

Run: `npx vitest run tests/infrastructure/production-e2e-contract.test.ts`

Expected: FAIL because the production E2E files are absent.

- [ ] **Step 3: Implement the public surface suite**

Reuse only helper logic from prerelease, with base URL fixed to `https://tio2malaysia.com`. Register a route guard that aborts and counts every non-GET request. For every object assert expected status, one H1 where applicable, canonical apex, Malaysia identity and no mixed-content resource. Exercise form validation without submission and the Thank You state without calling Web3Forms.

- [ ] **Step 4: Implement server/CMS boundary suite and evidence sealing**

Verify public 80/443/22 expectations, absence of public 3000/3001/3306/8080, CMS HTTPS/GraphQL, commit/Build/CMS identities and the exact deployment attempt. Redact headers, cookies, bodies and environment values. Write create-new evidence under `.production/runs/RELEASE_ID/evidence/`.

- [ ] **Step 5: Run contract and local fixture tests**

Run:

```bash
npx vitest run tests/infrastructure/production-e2e-contract.test.ts
npx playwright test tests/e2e/production-public-surface.spec.ts --config=tests/fixtures/production/playwright.fixture.config.ts
```

Expected: PASS against a local fixture with 58 expected objects and `externalPostCount: 0`.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/production-public-surface.spec.ts tests/e2e/production-server-boundary.spec.ts tests/infrastructure/production-e2e-contract.test.ts tests/fixtures/production scripts/production/Production.Core.psm1
git commit -m "test(deploy): verify the public production surface"
```

## Task 12: Document operations and update current architecture only as target capability

**Files:**
- Create: `docs/production-deployment.md`
- Modify: `docs/development-workflow.md`
- Modify: `docs/development-execution.md`
- Modify: `docs/software-architecture.md`
- Modify: `docs/site-registry.md`
- Create: `tests/infrastructure/production-docs.test.ts`

**Interfaces:**
- Consumes: implemented commands and current design.
- Produces: one operator entry and accurate separation of implemented tooling from actual deployment state.

- [ ] **Step 1: Write failing documentation consistency tests**

Assert all relative links exist; the five current documents point to `production-deployment.md`; Production remains distinct from local prerelease; root `AGENTS.md` is unchanged; and no document says the site is deployed before a production receipt exists.

- [ ] **Step 2: Run docs tests red phase**

Run: `npx vitest run tests/infrastructure/production-docs.test.ts`

Expected: FAIL because the runbook and references are absent.

- [ ] **Step 3: Write the runbook**

Document prerequisites, exact package scripts, state meanings, incoming/outgoing paths, one-time root bootstrap, backup components, migration Plan/Apply/readback, DNS/TLS, 58-object test, rollback decision table, secret handling and failure recovery. State that real production form submission is separate.

- [ ] **Step 4: Update current-state documents accurately**

Before server installation, describe the code as an implemented production release capability whose remote state is unverified. After Task 15 obtains evidence, update the same text to the exact deployed commit, Build, CMS/backup identity and date. Do not copy operational commands into the root rules.

- [ ] **Step 5: Run docs tests and diff checks**

Run:

```bash
npx vitest run tests/infrastructure/production-docs.test.ts
git diff --check
git diff -- AGENTS.md
```

Expected: docs test and diff check PASS; `git diff -- AGENTS.md` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add docs/production-deployment.md docs/development-workflow.md docs/development-execution.md docs/software-architecture.md docs/site-registry.md tests/infrastructure/production-docs.test.ts
git commit -m "docs(deploy): connect production operations to D16 workflow"
```

## Task 13: Review, validate and integrate the implementation branch

**Files:**
- Modify only findings produced by review in the files owned by Tasks 1–12.

**Interfaces:**
- Consumes: complete task branch.
- Produces: reviewed candidate ready for the established task-branch → develop → main process.

- [ ] **Step 1: Run focused production suites**

```bash
python -m unittest discover -s tests/production -p "test_*.py" -v
npx vitest run tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-package.test.ts tests/infrastructure/production-runtime-contract.test.ts tests/infrastructure/production-bootstrap.test.ts tests/infrastructure/production-backup-contract.test.ts tests/infrastructure/production-wordpress-migration.test.ts tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-e2e-contract.test.ts tests/infrastructure/production-docs.test.ts
bash -n ops/production/server/install.sh ops/production/backup.sh ops/production/migrate-wordpress.sh
git diff --check develop...HEAD
```

Expected: every production-specific test passes with zero skipped cases; shell syntax and diff check exit 0.

- [ ] **Step 2: Perform independent code review**

Invoke `superpowers:requesting-code-review`. Review against the approved spec with emphasis on caller-controlled paths/arguments, archive extraction, sudo boundaries, secret output, backup validation, transaction boundaries, old-volume safety, Nginx activation and database rollback after public writes.

- [ ] **Step 3: Fix findings with TDD and rerun focused suites**

For every accepted finding, add or tighten a failing test, reproduce it, implement the smallest correction and rerun the affected suite plus the complete Step 1 suite.

- [ ] **Step 4: Commit review fixes**

```bash
git add ops/production scripts/production wordpress/seed/tio2-my-production-migration.php wordpress/seed/apply-tio2-my-production-routes.php wordpress/seed/refresh-tio2-my-production-resources.php wordpress/seed/export-tio2-my-production-audit.php tests/production tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-package.test.ts tests/infrastructure/production-runtime-contract.test.ts tests/infrastructure/production-bootstrap.test.ts tests/infrastructure/production-backup-contract.test.ts tests/infrastructure/production-wordpress-migration.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-e2e-contract.test.ts tests/infrastructure/production-docs.test.ts tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts tests/e2e/production-public-surface.spec.ts tests/e2e/production-server-boundary.spec.ts tests/fixtures/production docs/production-deployment.md docs/development-workflow.md docs/development-execution.md docs/software-architecture.md docs/site-registry.md package.json package-lock.json .gitignore
git commit -m "fix(deploy): address production release review"
```

- [ ] **Step 5: Merge through the approved branch flow**

Use `superpowers:finishing-a-development-branch`. Merge the task branch into the then-current `develop`, resolve only verified conflicts, run the Step 1 suite on the exact develop combination, then follow the authorized `develop` → `main` integration process. Do not merge the task branch directly to `main`.

- [ ] **Step 6: Rebuild and retest the exact main prerelease candidate**

From a clean `main`, run the documented local prerelease Start/Test flow. Require a fresh HEALTHY run bound to exact main, all ordinary prerelease suites including the 58-object surface, zero external POSTs and current CMS/Build identities. Historical run evidence does not substitute.

## Task 14: Prepare and execute the one-time root bootstrap

**Files:**
- Create runtime evidence only below ignored `.production/runs/RELEASE_ID/bootstrap/`.

**Interfaces:**
- Consumes: exact clean main bootstrap files and the existing deploy key.
- Produces: installed root-owned release program and verified restricted sudo access.

- [ ] **Step 1: Create and verify the bootstrap artifact locally**

Archive only `ops/production/server/`, calculate SHA-256, list members and save the exact expected hash. Run all Task 3 and Task 5 tests from the archive extraction, not the mutable checkout.

- [ ] **Step 2: Upload bootstrap bytes as `deploy`**

Copy to `/home/deploy/tio2-incoming/bootstrap.tar.gz` and verify the remote unprivileged SHA-256 equals the local value. Do not execute from the deploy-owned directory.

- [ ] **Step 3: Give the user one concrete root command**

After the user confirms Oracle console recovery is available, the command must copy the archive into a new root-owned temporary directory, verify the exact literal SHA-256 again, extract without unsafe members, run `install.sh` and create `/etc/tio2-production/recovery-console-ready` mode 600. This is the only manual root operation; wait for the user to report its exit status because root credentials are not available to the agent. If console recovery is not confirmed, omit the marker and leave SSH hardening pending while continuing the release safely.

- [ ] **Step 4: Verify the installed privilege boundary as `deploy`**

Run:

```bash
ssh -i C:/Users/longe/.ssh/d16_oracle_deploy_ed25519 deploy@129.146.68.82 "sudo -n /usr/local/sbin/tio2-release status"
ssh -i C:/Users/longe/.ssh/d16_oracle_deploy_ed25519 deploy@129.146.68.82 "sudo -n -l"
```

Expected: `status` returns one JSON object; sudo listing contains only the six fixed `tio2-release` commands. Confirm `docker ps`, root config reads and `sudo -n id` fail for `deploy`.

- [ ] **Step 5: Record bootstrap evidence**

Save command exit codes, installed file hashes/owners/modes and redacted sudo listing. Do not save `/etc/tio2-production/production.env` contents.

## Task 15: Create the first verified production backup and dry run

**Files:**
- Create runtime evidence only below ignored `.production/runs/RELEASE_ID/`.

**Interfaces:**
- Consumes: installed program, exact approved main package, production config supplied root-only.
- Produces: state `BACKED_UP`, complete server backup and encrypted offsite artifact; no public frontend change.

- [ ] **Step 1: Inventory production configuration without revealing values**

Use `status` to record required field presence/fingerprints, Compose/container/volume/Nginx identities, WordPress/core/plugin/content counts, ports, disk and memory. Resolve any missing field in `/etc/tio2-production/production.env` through one root-only write; never send the values through chat or commit them.

- [ ] **Step 2: Package and prepare the exact main candidate**

Run the controller Package/Upload/Prepare stages and compare local/server commit, archive, manifest, migration and surface hashes.

- [ ] **Step 3: Run backup and download encrypted export**

Invoke the fixed `backup` action. Require validated SQL, WordPress archive, code/Compose, Nginx, root config and release-state components. Download the encrypted artifact and compare its server/local ciphertext SHA-256.

- [ ] **Step 4: Prove backup recoverability before deployment**

In an isolated temporary Docker project, restore the SQL and WordPress archives, start WordPress without public ports and verify core/plugin/content/media identities. Destroy only the explicitly named temporary restore project after recording results.

- [ ] **Step 5: Stop if any backup fact is incomplete**

Do not run `deploy` unless server backup validation, offsite hash and isolated restore all pass. Report the exact failed component and keep the old CMS service available.

## Task 16: Deploy internally, rehearse rollback and switch public traffic

**Files:**
- Create runtime evidence only below ignored `.production/runs/RELEASE_ID/`.

**Interfaces:**
- Consumes: state `BACKED_UP` and proven restore.
- Produces: `INTERNAL_VERIFIED`, rollback rehearsal, then public Nginx/DNS/TLS activation.

- [ ] **Step 1: Run controlled WordPress takeover and migration**

Invoke `deploy`, inspect Plan before Apply in evidence, then require exact plan/apply/readback hashes, existing volume identities, `site_scope=tio2-my`, no cross-site mutation and CMS/GraphQL health.

- [ ] **Step 2: Verify ARM64 candidate frontend on 3001**

Require commit, archive hash, image digest, Next Build ID, CMS identity, site ID and representative routes. Confirm candidate 3001 is loopback-only and external POST count is zero.

- [ ] **Step 3: Rehearse code rollback before DNS**

Use the fixed rollback path or the program’s first-launch rehearsal mode to restore the prior recorded service/plugin state, verify CMS health, then redeploy the same immutable candidate and reproduce `INTERNAL_VERIFIED`. Never restore data after a public write window.

- [ ] **Step 4: Activate Next 3000 and staged Nginx**

Require the same candidate image digest on active 3000, successful `nginx -t`, local host-header checks for apex/CMS/`www`, and an atomic reload. Close candidate port 3001 after the switch.

- [ ] **Step 5: Change DNS and complete TLS**

At the Aliyun/HiChina DNS authority, set apex and `www` to `129.146.68.82` while preserving `cms`. Record authoritative answers. Reinvoke the idempotent deploy/verify stage so the fixed Certbot path obtains apex/`www` TLS and Nginx enforces HTTP→HTTPS and `www`→apex.

- [ ] **Step 6: Stop on incomplete public activation**

If DNS or certificate checks fail, keep the internally healthy stack, record `publicLaunchComplete=false`, and do not claim Production complete.

## Task 17: Run public verification, harden SSH and seal the release receipt

**Files:**
- Create: `docs/verification/production/tio2-my/RELEASE_ID/receipt.md`
- Modify: `docs/software-architecture.md`
- Modify: `docs/site-registry.md`
- Modify: `docs/production-deployment.md`

**Interfaces:**
- Consumes: exact active public release and Task 16 identities.
- Produces: state `PUBLIC_VERIFIED`, security evidence and tracked non-secret release receipt.

- [ ] **Step 1: Run public no-POST E2E**

Run the production public-surface and server-boundary suites against the exact active receipt. Require all 58 objects, three widths, 404, Thank You, canonical, redirects, robots/sitemap/index flags, CMS/media, no mixed content and `externalPostCount: 0`.

- [ ] **Step 2: Verify indexing state separately**

Compare every page’s runtime robots/canonical result with its approved page-level release flag. Enable only already-approved indexing flags. Record any intentionally non-indexable page without treating it as a failure.

- [ ] **Step 3: Complete server hardening after recovery is proven**

Confirm Oracle console recovery and create the root-owned recovery marker as part of the one-time bootstrap. Invoke the fixed `verify` action to disable password SSH and direct root SSH, retain deploy key access, re-check the fixed sudo list, remove public access to unused `rpcbind`/111, and verify public listeners. Do not disable `rpcbind` until `systemctl` dependency checks prove no consumer.

- [ ] **Step 4: Run final status and rollback-target checks**

Require state `PUBLIC_VERIFIED`, active and previous release IDs, backup ID, image/Build/CMS identities, DNS/TLS results and no candidate listener on 3001. Confirm rollback targets only the immediately previous verified release without invoking it after public traffic.

- [ ] **Step 5: Write and verify the production receipt**

Record site/environment, commit, archive/manifest/image/Build/CMS/migration/backup identities, URLs, deployment times, verification counts, DNS/TLS, indexing, form-test status, security state, rollback target and unresolved operations. Do not include secret values, private email addresses or form payloads.

- [ ] **Step 6: Update current architecture from evidence**

Replace target-only wording with the exact deployed state in the three operational documents. Keep CI-on-push, centralized monitoring and automatic real form submission marked outside the implemented scope.

- [ ] **Step 7: Verify documentation and commit the receipt**

```bash
npx vitest run tests/infrastructure/production-docs.test.ts
git diff --check
git diff -- AGENTS.md
git add docs/verification/production/tio2-my/RELEASE_ID/receipt.md docs/software-architecture.md docs/site-registry.md docs/production-deployment.md
git commit -m "docs(release): record tio2-my Oracle production launch"
```

Expected: documentation checks pass, root `AGENTS.md` remains unchanged, and the commit contains only the non-secret receipt/current-state updates.

## Completion evidence

Before claiming the work complete, run `superpowers:verification-before-completion` and freshly verify:

```bash
python -m unittest discover -s tests/production -p "test_*.py" -v
npx vitest run tests/infrastructure/production-contracts.test.ts tests/infrastructure/production-package.test.ts tests/infrastructure/production-runtime-contract.test.ts tests/infrastructure/production-bootstrap.test.ts tests/infrastructure/production-backup-contract.test.ts tests/infrastructure/production-wordpress-migration.test.ts tests/integration/wordpress/tio2-my-production-migration-runtime.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-e2e-contract.test.ts tests/infrastructure/production-docs.test.ts
git status --short --branch
```

Then compare the active server `status` JSON with the tracked receipt. Report production-specific pass/fail counts, the known unrelated baseline failures if they still exist, the active release identity, backup/rollback identities, public verification result, external form submission status and any remaining operational limitations.
