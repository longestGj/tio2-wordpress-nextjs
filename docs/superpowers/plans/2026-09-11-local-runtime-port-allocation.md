# Local Runtime Port Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an enforceable local runtime ownership system that keeps development and prerelease on stable ports while giving automated and feature runtimes collision-free dynamic ports and owner-safe cleanup.

**Architecture:** A dependency-free Node.js lease core owns repository-local JSON lease records and exposes a JSON CLI wrapped by PowerShell. Stable controllers use the same ownership vocabulary, Docker tests use unique Compose projects plus explicit no-port/random-port overrides, and E2E launchers pass actual URLs instead of relying on fixed localhost fallbacks.

**Tech Stack:** Node.js 24 ESM, TypeScript 5.9, PowerShell 7/Windows PowerShell, Vitest 4, Playwright 1.62, Docker Compose v2, YAML.

**Spec:** `docs/superpowers/specs/2026-09-11-local-runtime-port-allocation-design.md`

## Global Constraints

- Stable development endpoints remain Site A `3001`, Site B `3002`, Malaysia `3003`, and WordPress `8080`.
- Stable prerelease endpoints remain Malaysia `3100` and WordPress `8180`; neither may fall back to a different port.
- Human feature runtimes lease from `32000-32099`; numeric-only automated fallbacks lease from `32100-32999`.
- Node fixtures and owned Next.js processes use OS-assigned port `0` whenever the caller can receive the selected port.
- Development Compose project `wordpress` and prerelease project `d16-tio2-my-prerelease` are reserved singleton names.
- Automated Compose projects use `d16-test-<short-run-id>` and never target persistent development or prerelease volumes.
- Cleanup may stop only a process or Compose project whose live identity still matches its recorded owner.
- Unknown listeners, processes, containers, and owner mismatches are reported and preserved.
- `.runtime/` is ignored runtime state; it contains no secrets and is never committed.
- Test data mode is explicit: `isolated`, `shared-read-only`, or `shared-mutating`; port choice never implies data ownership.
- Existing application assertion failures remain visible and are not weakened or skipped by this work.

## File Structure

- `scripts/runtime-ports/lease-core.mjs`: lease schema validation, locking, atomic writes, port probing, stale detection, reserve/attach/release/status operations.
- `scripts/runtime-ports/cli.mjs`: JSON command-line adapter for the lease core and diagnostics.
- `scripts/runtime-ports.ps1`: PowerShell operator wrapper for Reserve, Attach, Release, Status, and Doctor.
- `scripts/runtime-ports/doctor.mjs`: read-only inspection of stable ports, lease owners, and Docker Compose labels.
- `scripts/local-wordpress.ps1`: canonical controller for the persistent development CMS singleton.
- `wordpress/docker-compose.test-no-host.yml`: test override that removes the development WordPress host mapping.
- `wordpress/docker-compose.test-random-http.yml`: test override that replaces the mapping with a Docker-assigned loopback port.
- `tests/helpers/wordpress-compose.ts`: explicit test data-mode and unique-project argument builder.
- `tests/helpers/wordpress-runtime.ts`: owned isolated Compose lifecycle, published-port discovery, and cleanup.
- `tests/e2e/support/required-local-url.ts`: fail-closed environment URL reader shared by E2E specifications.
- `tests/e2e/support/owned-next-dev.ts`: existing owned Next.js lifecycle integrated with leases.
- `tests/infrastructure/runtime-port-leases.test.ts`: lease concurrency, stale-state, attachment, release, and mismatch contracts.
- `tests/infrastructure/runtime-port-cli.test.ts`: CLI and PowerShell wrapper contracts.
- `tests/infrastructure/runtime-port-doctor.test.ts`: stable endpoint and Compose ownership diagnostics.
- `tests/infrastructure/local-wordpress-controller.test.ts`: canonical CMS controller safety tests.
- `tests/infrastructure/wordpress-test-compose.test.ts`: rendered no-host/random-host Compose topology tests.
- `tests/infrastructure/e2e-runtime-url-contract.test.ts`: repository scan that rejects runnable fixed E2E fallbacks.
- `docs/runtime-ports.md`: operator runbook and ownership recovery procedure.
- `docs/development-execution.md`: authoritative development/test endpoint table and test data modes.
- `docs/prerelease-environment.md`: cross-reference to fixed prerelease ownership diagnostics.

---

### Task 1: Lease schema and atomic allocation core

**Files:**
- Create: `scripts/runtime-ports/lease-core.mjs`
- Create: `tests/infrastructure/runtime-port-leases.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `reserveLease(options): Promise<PortLeaseRecord>`
- Produces: `attachLease(options): Promise<PortLeaseRecord>`
- Produces: `registerObservedLease(options): Promise<PortLeaseRecord>` for a port already selected by an owned OS/Docker listener.
- Produces: `releaseLease(options): Promise<{released: boolean; leaseId: string}>`
- Produces: `listLeases(options?): Promise<PortLeaseRecord[]>`
- Produces: `inspectLease(options): Promise<LeaseInspection>`
- `PortLeaseRecord` fields are exactly `schemaVersion`, `leaseId`, `runId`, `purpose`, `siteId`, `worktree`, `commit`, `host`, `ports`, `processIds`, `composeProject`, `createdAt`, and `retainUntil`.

- [ ] **Step 1: Write failing schema and reservation tests**

Add tests that use a temporary lease root and a small injected port pool. The first test asserts the complete persisted record; the second launches two reservations concurrently and asserts distinct ports.

```ts
const first = await reserveLease({
  leaseRoot,
  runId: 'vitest-a',
  purpose: 'test-next',
  siteId: 'tio2-my',
  worktree: repositoryRoot,
  commit: 'a'.repeat(40),
  pool: {start: 32500, end: 32501},
})
expect(first).toMatchObject({
  schemaVersion: 1,
  runId: 'vitest-a',
  purpose: 'test-next',
  siteId: 'tio2-my',
  host: '127.0.0.1',
  processIds: [],
  composeProject: null,
})
expect(JSON.parse(readFileSync(join(leaseRoot, `${first.leaseId}.json`), 'utf8')))
  .toEqual(first)

const [a, b] = await Promise.all([
  reserveLease({...options, runId: 'parallel-a'}),
  reserveLease({...options, runId: 'parallel-b'}),
])
expect(a.ports[0]).not.toBe(b.ports[0])
```

- [ ] **Step 2: Run the focused test and verify the red state**

Run: `npx vitest run tests/infrastructure/runtime-port-leases.test.ts`

Expected: FAIL because `scripts/runtime-ports/lease-core.mjs` does not exist.

- [ ] **Step 3: Implement validation, exclusive locking, port probing, and atomic writes**

Export the exact constants and functions below. Use `mkdir(lockPath)` as the exclusive allocator lock, write JSON to `<leaseId>.json.<pid>.tmp`, then rename it. Bind probes only to `127.0.0.1`. Reject unknown record fields, invalid UUIDs, non-40-character commits, out-of-range ports, and paths outside the supplied lease root.

```js
export const FEATURE_PORT_POOL = Object.freeze({start: 32000, end: 32099})
export const TEST_FALLBACK_PORT_POOL = Object.freeze({start: 32100, end: 32999})
export const LEASE_PURPOSES = Object.freeze([
  'feature-next', 'test-next', 'test-wordpress', 'fixture',
])

export async function reserveLease({
  leaseRoot = resolve('.runtime/port-leases'),
  runId,
  purpose,
  siteId = null,
  worktree,
  commit,
  count = 1,
  retainUntil = null,
  pool = purpose === 'feature-next' ? FEATURE_PORT_POOL : TEST_FALLBACK_PORT_POOL,
})

export async function attachLease({
  leaseRoot = resolve('.runtime/port-leases'),
  leaseId,
  processId,
  composeProject,
})

export async function registerObservedLease({
  leaseRoot = resolve('.runtime/port-leases'),
  runId,
  purpose,
  siteId = null,
  worktree,
  commit,
  ports,
  processIds = [],
  composeProject = null,
})

export async function releaseLease({
  leaseRoot = resolve('.runtime/port-leases'),
  leaseId,
  expectedProcessIds = [],
  expectedComposeProject = null,
})
```

Stale cleanup is allowed only when every recorded PID is absent, the recorded Compose project is absent, and every recorded port has no listener. `releaseLease` returns `OWNER_MISMATCH` as an error code when a supplied expected identity differs; it leaves the record intact.

`registerObservedLease` runs under the same allocator lock, rejects a port already present in another live lease, and requires either a process ID or Compose project. It expects the observed port to be listening instead of trying to bind it again.

- [ ] **Step 4: Add stale, owner-mismatch, retained-lease, and atomic-file tests**

```ts
await expect(releaseLease({
  leaseRoot,
  leaseId: lease.leaseId,
  expectedProcessIds: [process.pid + 1],
})).rejects.toMatchObject({code: 'OWNER_MISMATCH'})
expect(existsSync(join(leaseRoot, `${lease.leaseId}.json`))).toBe(true)

const retained = await reserveLease({...options, retainUntil: '2099-01-01T00:00:00.000Z'})
expect((await inspectLease({leaseRoot, leaseId: retained.leaseId})).stale).toBe(false)
expect(readdirSync(leaseRoot).filter(name => name.endsWith('.tmp'))).toEqual([])
```

- [ ] **Step 5: Run focused tests and verify green**

Run: `npx vitest run tests/infrastructure/runtime-port-leases.test.ts`

Expected: PASS with no leaked listeners or temporary lease files.

- [ ] **Step 6: Ignore runtime state and commit**

Add `/.runtime/` to `.gitignore`.

```powershell
git add .gitignore scripts/runtime-ports/lease-core.mjs tests/infrastructure/runtime-port-leases.test.ts
git commit -m "feat: add atomic local port leases"
```

---

### Task 2: JSON CLI and PowerShell operator interface

**Files:**
- Create: `scripts/runtime-ports/cli.mjs`
- Create: `scripts/runtime-ports.ps1`
- Create: `tests/infrastructure/runtime-port-cli.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 1 lease functions and record schema.
- Produces: commands `reserve`, `attach`, `release`, and `status`, each emitting one JSON object to stdout and diagnostics to stderr.
- Produces: PowerShell actions `Reserve`, `Attach`, `Release`, `Status`, and `Doctor` with the parameter names approved in the spec.

- [ ] **Step 1: Write failing CLI contract tests**

```ts
const result = spawnSync(process.execPath, [
  resolve('scripts/runtime-ports/cli.mjs'), 'reserve',
  '--lease-root', leaseRoot,
  '--purpose', 'feature-next',
  '--run-id', 'manual-review',
  '--site-id', 'tio2-my',
  '--worktree', repositoryRoot,
  '--commit', 'b'.repeat(40),
], {encoding: 'utf8'})
expect(result.status, result.stderr).toBe(0)
expect(JSON.parse(result.stdout)).toMatchObject({ok: true, action: 'reserve'})
```

Also assert: missing required flags exit `2`; allocation exhaustion exits `1` with `PORT_POOL_EXHAUSTED`; `status --json` emits no prose; PowerShell `-Action Reserve -Json` returns the same schema.

- [ ] **Step 2: Run the focused test and verify the red state**

Run: `npx vitest run tests/infrastructure/runtime-port-cli.test.ts`

Expected: FAIL because the CLI and wrapper do not exist.

- [ ] **Step 3: Implement the Node CLI**

Parse only the documented flags and reject duplicates or unknown flags. Resolve the current worktree with `git rev-parse --show-toplevel` and commit with `git rev-parse HEAD` only when the caller omits them. Never echo environment contents.

```js
const actions = new Map([
  ['reserve', reserveCommand],
  ['attach', attachCommand],
  ['release', releaseCommand],
  ['status', statusCommand],
])

const response = await actions.get(action)(parseArgs(process.argv.slice(3)))
process.stdout.write(`${JSON.stringify({ok: true, action, ...response})}\n`)
```

- [ ] **Step 4: Implement the PowerShell wrapper as a strict adapter**

The wrapper converts PowerShell parameters into an argument array and invokes `node scripts/runtime-ports/cli.mjs`; it must not reimplement locking or allocation.

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Reserve', 'Attach', 'Release', 'Status', 'Doctor')]
    [string] $Action,
    [string] $Purpose,
    [string] $RunId,
    [string] $SiteId,
    [string] $LeaseId,
    [int] $ProcessId,
    [string] $ComposeProject,
    [int] $Count = 1,
    [switch] $Json
)
```

- [ ] **Step 5: Add package scripts and run focused tests**

Add:

```json
"runtime:status": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/runtime-ports.ps1 -Action Status -Json",
"runtime:doctor": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/runtime-ports.ps1 -Action Doctor -Json"
```

Run: `npx vitest run tests/infrastructure/runtime-port-leases.test.ts tests/infrastructure/runtime-port-cli.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add package.json scripts/runtime-ports.ps1 scripts/runtime-ports/cli.mjs tests/infrastructure/runtime-port-cli.test.ts
git commit -m "feat: expose runtime port lease commands"
```

---

### Task 3: Read-only Doctor and canonical development CMS ownership

**Files:**
- Create: `scripts/runtime-ports/doctor.mjs`
- Create: `scripts/local-wordpress.ps1`
- Create: `tests/infrastructure/runtime-port-doctor.test.ts`
- Create: `tests/infrastructure/local-wordpress-controller.test.ts`
- Modify: `scripts/runtime-ports/cli.mjs`
- Modify: `package.json`
- Modify: `scripts/start-local-sites.ps1`
- Modify: `tests/infrastructure/local-sites-controller.test.ts`

**Interfaces:**
- Consumes: lease records from Task 1 and JSON dispatch from Task 2.
- Produces: `doctorRuntime({leaseRoot, dockerInspect, probePort}): Promise<DoctorReport>`.
- Produces: `scripts/local-wordpress.ps1 -Action Plan|Start|Status|Stop [-Json]`.
- `DoctorReport.fixedEndpoints` includes `environment`, `service`, `host`, `port`, `state`, and `owner`; state is `available`, `expected-owner`, `unknown-listener`, or `owner-mismatch`.

- [ ] **Step 1: Write failing read-only Doctor tests with injected probes**

```ts
const report = await doctorRuntime({
  leaseRoot,
  probePort: async port => port === 8080,
  dockerInspect: async () => [{
    project: 'wordpress',
    workingDir: repositoryRoot,
    configFiles: [resolve('wordpress/docker-compose.yml')],
  }],
})
expect(report.fixedEndpoints.find(item => item.port === 8080)).toMatchObject({
  environment: 'development',
  service: 'wordpress',
  state: 'expected-owner',
})
expect(report.actionsTaken).toEqual([])
```

Cover ports `3001`, `3002`, `3003`, `8080`, `3100`, and `8180`; duplicate project labels; an unknown listener; stale leases; and Docker unavailable without converting unavailable evidence into `available`.

- [ ] **Step 2: Write failing local WordPress controller safety tests**

Use a fake `docker` executable earlier on `PATH` that records argument arrays. Assert `-Plan` reports project `wordpress`, fixed endpoint `8080`, canonical Compose path, and persistent-volume behavior. Assert `-Stop` refuses a label mismatch and never issues `down`.

```ts
expect(plan).toMatchObject({
  project: 'wordpress',
  endpoint: 'http://127.0.0.1:8080',
  composeFile: resolve('wordpress/docker-compose.yml'),
  volumes: 'persistent',
})
expect(recordedCalls.some(call => call.includes('down'))).toBe(false)
```

- [ ] **Step 3: Run both focused tests and verify the red state**

Run: `npx vitest run tests/infrastructure/runtime-port-doctor.test.ts tests/infrastructure/local-wordpress-controller.test.ts`

Expected: FAIL because Doctor and the controller do not exist.

- [ ] **Step 4: Implement Doctor without mutation paths**

Inspect listeners using Node sockets and inspect Compose ownership using:

```text
docker ps --filter label=com.docker.compose.project --format {{json .}}
docker inspect <container-id> --format {{json .Config.Labels}}
```

Recognize `com.docker.compose.project`, `com.docker.compose.project.working_dir`, and `com.docker.compose.project.config_files`. Export only data; do not expose a stop or cleanup function from `doctor.mjs`.

- [ ] **Step 5: Implement the canonical development CMS controller**

`Start` must preflight port `8080`, inspect any existing `wordpress` project, and then execute the exact project explicitly:

```powershell
docker compose --project-name wordpress --env-file wordpress/.env `
  -f wordpress/docker-compose.yml up -d db wordpress
```

Write `.runtime/development-wordpress.json` atomically with repository root, commit, Compose file, project name, container IDs, and creation time. `Status` compares live labels and container IDs. `Stop` rechecks identities immediately before:

```powershell
docker compose --project-name wordpress --env-file wordpress/.env `
  -f wordpress/docker-compose.yml stop wordpress db
```

Do not run `down` and do not remove volumes.

Update `Wait-SiteHealthy` in `scripts/start-local-sites.ps1` so a `200` response is accepted only when its HTML contains `data-site-id="<expected-site-id>"`. Extend the existing controller test's `-Plan` contract with `readinessIdentity = 'data-site-id'`; fixed ports and distribution directories remain unchanged.

- [ ] **Step 6: Wire Doctor and package scripts, then verify**

Add:

```json
"wordpress:start": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-wordpress.ps1 -Action Start -Json",
"wordpress:status": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-wordpress.ps1 -Action Status -Json",
"wordpress:stop": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/local-wordpress.ps1 -Action Stop -Json"
```

Run: `npx vitest run tests/infrastructure/runtime-port-doctor.test.ts tests/infrastructure/local-wordpress-controller.test.ts tests/infrastructure/local-sites-controller.test.ts tests/infrastructure/prerelease-controller.test.ts`

Expected: PASS; existing development and prerelease controller contracts remain unchanged.

- [ ] **Step 7: Commit**

```powershell
git add package.json scripts/local-wordpress.ps1 scripts/runtime-ports/cli.mjs scripts/runtime-ports/doctor.mjs scripts/start-local-sites.ps1 tests/infrastructure/runtime-port-doctor.test.ts tests/infrastructure/local-wordpress-controller.test.ts tests/infrastructure/local-sites-controller.test.ts
git commit -m "feat: diagnose stable runtime ownership"
```

---

### Task 4: Docker test topologies and owned Compose lifecycle

**Files:**
- Create: `wordpress/docker-compose.test-no-host.yml`
- Create: `wordpress/docker-compose.test-random-http.yml`
- Create: `tests/helpers/wordpress-runtime.ts`
- Create: `tests/infrastructure/wordpress-test-compose.test.ts`
- Modify: `tests/helpers/wordpress-compose.ts`
- Modify: `tests/infrastructure/wordpress-compose.test.ts`
- Modify: `tests/infrastructure/docker-compose.test.ts`

**Interfaces:**
- Consumes: `registerObservedLease`, `attachLease`, and `releaseLease` from Task 1.
- Produces: `wordpressComposeArgs(options, environment?): string[]`, where `options.dataMode` is required.
- Produces: `startIsolatedWordPress(options): Promise<OwnedWordPressRuntime>`.
- `OwnedWordPressRuntime` exposes `projectName`, `composeArgs`, `graphqlUrl`, `wp(args)`, and `stop()`.

- [ ] **Step 1: Write failing rendered-topology tests**

Run Docker Compose `config --format json` against the base plus each override. Assert no-host has no `ports` entry and random-http contains target `80`, host IP `127.0.0.1`, and published port `0`/empty according to Compose's rendered JSON.

```ts
expect(noHost.services.wordpress.ports ?? []).toEqual([])
expect(randomHttp.services.wordpress.ports).toEqual([
  expect.objectContaining({target: 80, host_ip: '127.0.0.1'}),
])
expect(randomHttp.services.db.ports ?? []).toEqual([])
```

- [ ] **Step 2: Write failing helper contract and cleanup tests**

```ts
expect(wordpressComposeArgs({
  dataMode: 'isolated',
  runId: 'vitest-1234',
  hostHttp: false,
}, {})).toEqual([
  'compose', '--project-name', 'd16-test-vitest-1234',
  '--env-file', 'wordpress/.env',
  '-f', 'wordpress/docker-compose.yml',
  '-f', 'wordpress/docker-compose.test-no-host.yml',
])
expect(() => wordpressComposeArgs({
  dataMode: 'shared-mutating', runId: 'x', hostHttp: false,
}, {})).toThrow(/explicit serial authorization/u)
```

Mock process execution for lifecycle tests. Assert startup attaches the exact Compose project, `stop()` calls `down` only for that exact argument vector, omits `--volumes` by default, releases the lease after the listener closes, and retains the lease on owner mismatch.

- [ ] **Step 3: Run focused tests and verify the red state**

Run: `npx vitest run tests/infrastructure/wordpress-compose.test.ts tests/infrastructure/wordpress-test-compose.test.ts`

Expected: FAIL because explicit data modes, overrides, and lifecycle do not exist.

- [ ] **Step 4: Add explicit override files**

Use Compose's replacement tags so the development binding is removed rather than merged:

```yaml
# wordpress/docker-compose.test-no-host.yml
services:
  wordpress:
    ports: !reset []
```

```yaml
# wordpress/docker-compose.test-random-http.yml
services:
  wordpress:
    ports: !override
      - target: 80
        published: "0"
        host_ip: 127.0.0.1
        protocol: tcp
```

- [ ] **Step 5: Implement explicit argument construction and lifecycle**

```ts
export type WordPressDataMode = 'isolated' | 'shared-read-only' | 'shared-mutating'

export interface WordPressComposeOptions {
  dataMode: WordPressDataMode
  runId: string
  hostHttp: boolean
  serialMutationAuthorized?: boolean
}

export function wordpressComposeArgs(
  options: WordPressComposeOptions,
  environment: Record<string, string | undefined> = process.env,
): string[]
```

For `isolated`, sanitize the run ID to `[a-z0-9-]`, cap it so the full name fits Compose labels, add a collision-resistant suffix, and apply one test override. For `shared-read-only`, target `wordpress` without an override and reject mutation methods in `OwnedWordPressRuntime.wp`. For `shared-mutating`, require `serialMutationAuthorized: true` and never call `up`, `down`, or `stop` from the helper.

After random-http startup, discover the port using:

```text
docker compose <recorded-args> port wordpress 80
```

Parse only `127.0.0.1:<port>` or `[::1]:<port>` and build `graphqlUrl` from that result.

Once the project and published port are known, call `registerObservedLease` with that port and `composeProject`; the runtime's `stop()` verifies the live Compose labels before cleanup and releases this exact lease last.

- [ ] **Step 6: Verify both topologies against real Compose config**

Run: `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml -f wordpress/docker-compose.test-no-host.yml config --format json`

Run: `docker compose --env-file wordpress/.env -f wordpress/docker-compose.yml -f wordpress/docker-compose.test-random-http.yml config --format json`

Expected: first output has no WordPress published port; second has one loopback random mapping; neither publishes MariaDB.

- [ ] **Step 7: Run focused tests and commit**

Run: `npx vitest run tests/infrastructure/docker-compose.test.ts tests/infrastructure/wordpress-compose.test.ts tests/infrastructure/wordpress-test-compose.test.ts`

Expected: PASS.

```powershell
git add wordpress/docker-compose.test-no-host.yml wordpress/docker-compose.test-random-http.yml tests/helpers/wordpress-compose.ts tests/helpers/wordpress-runtime.ts tests/infrastructure/docker-compose.test.ts tests/infrastructure/wordpress-compose.test.ts tests/infrastructure/wordpress-test-compose.test.ts
git commit -m "test: isolate WordPress compose runtimes"
```

---

### Task 5: Classify and migrate Docker-backed Vitest callers

**Files:**
- Modify: `tests/integration/wordpress/application-resource-preview-runtime.test.ts`
- Modify: `tests/integration/wordpress/application-resource-publication-runtime.test.ts`
- Modify: `tests/integration/wordpress/application-resource-webhook-runtime.test.ts`
- Modify: `tests/integration/wordpress/product-fixture-runtime.test.ts`
- Modify: `tests/integration/wordpress/product-preview-runtime.test.ts`
- Modify: `tests/integration/wordpress/product-publication-runtime.test.ts`
- Modify: `tests/integration/wordpress/product-webhook-runtime.test.ts`
- Modify: `tests/integration/wordpress/root-only-migration-runtime.test.ts`
- Modify: `tests/integration/wordpress/seed-homepage-migration-runtime.test.ts`
- Modify: `tests/integration/wordpress/seed-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-application-page-draft-import-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-editorial-audit-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-editorial-draft-import-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-editorial-fixture-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-editorial-live-adapter-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-editorial-phase1-preview-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-product-audit-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-product-draft-import-runtime.test.ts`
- Modify: `tests/integration/wordpress/site-a-product-representative-import-runtime.test.ts`
- Modify: `tests/integration/wordpress/tio2-my-product-readiness-runtime.test.ts`
- Modify: `tests/integration/markets/poland-live-cms.test.tsx`
- Create: `tests/infrastructure/wordpress-runtime-classification.test.ts`

**Interfaces:**
- Consumes: Task 4 `wordpressComposeArgs` and `startIsolatedWordPress`.
- Produces: an exported `WORDPRESS_RUNTIME_MODE` declaration in every Docker-backed Vitest file.

- [ ] **Step 1: Write a failing classification guard**

Scan TypeScript files that execute Docker Compose and require exactly one declaration:

```ts
export const WORDPRESS_RUNTIME_MODE = {
  dataMode: 'isolated',
  hostHttp: false,
} as const
```

The guard permits `shared-read-only` only when the source contains no WP-CLI mutation command, and permits `shared-mutating` only when the suite is opt-in and passes `serialMutationAuthorized: true`.

- [ ] **Step 2: Run the classification test and verify the red state**

Run: `npx vitest run tests/infrastructure/wordpress-runtime-classification.test.ts`

Expected: FAIL listing every unclassified Docker-backed Vitest file.

- [ ] **Step 3: Migrate isolated WP-CLI-only tests**

For tests that create all their own fixtures, start one `hostHttp: false` isolated runtime in `beforeAll`, call `runtime.wp(...)`, and stop it in `afterAll` inside `try/finally`. Remove direct base Compose argument arrays.

```ts
let runtime: OwnedWordPressRuntime

beforeAll(async () => {
  runtime = await startIsolatedWordPress({
    runId: `product-preview-${process.pid}`,
    hostHttp: false,
  })
})

afterAll(async () => {
  await runtime?.stop()
})
```

- [ ] **Step 4: Migrate browser/HTTP WordPress tests**

For tests that call native WordPress or GraphQL over the host, use `hostHttp: true` and replace every literal `http://127.0.0.1:8080` request with `runtime.wordpressUrl` or `runtime.graphqlUrl`.

```ts
const nativeUrl = new URL(`/?post_type=tio2_product&p=${fixtureId}`, runtime.wordpressUrl)
const graphqlResponse = await fetch(runtime.graphqlUrl, requestOptions)
```

- [ ] **Step 5: Classify canonical-data tests without giving them lifecycle authority**

Suites that intentionally validate the existing development CMS use `shared-read-only` or `shared-mutating`. They call the reserved singleton project explicitly, require their existing opt-in environment variable, and may run WP-CLI but may not execute Compose lifecycle commands. Shared-mutating suites acquire their existing database/application lock and remain serial.

- [ ] **Step 6: Run the affected Vitest group**

Run: `npx vitest run tests/infrastructure/wordpress-runtime-classification.test.ts tests/infrastructure/wordpress-compose.test.ts tests/integration/wordpress tests/integration/markets/poland-live-cms.test.tsx --maxWorkers=4`

Expected: PASS or explicit environment-gated skips; no attempt binds host port `8080` for isolated WP-CLI-only tests.

- [ ] **Step 7: Prove coexistence with stable ports already occupied**

With the correct development CMS listening on `8080` and prerelease listening on `3100/8180`, run:

```powershell
npx vitest run tests/infrastructure/wordpress-test-compose.test.ts tests/integration/wordpress --maxWorkers=4
npm run runtime:doctor
```

Expected: tests do not report bind conflicts; Doctor still reports the original stable owners after the run; no `d16-test-*` containers or leases remain.

- [ ] **Step 8: Commit**

```powershell
git add tests/integration tests/infrastructure/wordpress-runtime-classification.test.ts
git commit -m "test: declare WordPress runtime ownership"
```

---

### Task 6: Fail-closed E2E URL contract and dynamic fixture ports

**Files:**
- Create: `tests/e2e/support/required-local-url.ts`
- Create: `tests/infrastructure/e2e-runtime-url-contract.test.ts`
- Create: `scripts/run-owned-e2e.mjs`
- Create: `tests/infrastructure/owned-e2e-launcher.test.ts`
- Modify: `tests/e2e/about-page.spec.ts`
- Modify: `tests/e2e/app000-gate8.spec.ts`
- Modify: `tests/e2e/brazil-en-market.spec.ts`
- Modify: `tests/e2e/brazil-pt-market.spec.ts`
- Modify: `tests/e2e/chloride-process-page.spec.ts`
- Modify: `tests/e2e/country-markets.spec.ts`
- Modify: `tests/e2e/document-coo.spec.ts`
- Modify: `tests/e2e/document-reach-dependencies.spec.ts`
- Modify: `tests/e2e/document-reach.spec.ts`
- Modify: `tests/e2e/document-tds.spec.ts`
- Modify: `tests/e2e/documents-hub.spec.ts`
- Modify: `tests/e2e/editorial-five.spec.ts`
- Modify: `tests/e2e/editorial-isolation.spec.ts`
- Modify: `tests/e2e/editorial-native-zoom.spec.ts`
- Modify: `tests/e2e/editorial-nine.spec.ts`
- Modify: `tests/e2e/editorial-targets.spec.ts`
- Modify: `tests/e2e/european-union-market.spec.ts`
- Modify: `tests/e2e/gate9-trade-app5-repair.spec.ts`
- Modify: `tests/e2e/legal-privacy.spec.ts`
- Modify: `tests/e2e/malaysia-homepage-gate9.spec.ts`
- Modify: `tests/e2e/market-hub.spec.ts`
- Modify: `tests/e2e/poland-g9-isolation.spec.ts`
- Modify: `tests/e2e/poland-g9-native-zoom-v03.spec.ts`
- Modify: `tests/e2e/poland-g9-native-zoom.spec.ts`
- Modify: `tests/e2e/poland-g9-rfq-focus.spec.ts`
- Modify: `tests/e2e/poland-g9-shared-visual.spec.ts`
- Modify: `tests/e2e/poland-live-cache.spec.ts`
- Modify: `tests/e2e/poland-market.spec.ts`
- Modify: `tests/e2e/product-detail.spec.ts`
- Modify: `tests/e2e/product-hub.spec.ts`
- Modify: `tests/e2e/request-documents.spec.ts`
- Modify: `tests/e2e/request-sample.spec.ts`
- Modify: `tests/e2e/res-origin-gate8.spec.ts`
- Modify: `tests/e2e/res-proc-gate8.spec.ts`
- Modify: `tests/e2e/resource-hub.spec.ts`
- Modify: `tests/e2e/rfq-page.spec.ts`
- Modify: `tests/e2e/site-a-editorial-homepage.spec.ts`
- Modify: `tests/e2e/tio2-my-global-navigation.spec.ts`
- Modify: `tests/e2e/united-kingdom-market.spec.ts`
- Modify: `tests/e2e/support/document-tds-cms.mjs`
- Modify: `tests/e2e/support/document-reach-cms.mjs`
- Modify: `tests/e2e/support/editorial-preview-source.ts`
- Modify: `tests/e2e/support/market-uk-cms.mjs`
- Modify: `tests/e2e/support/request-documents-cms.mjs`
- Modify: `tests/e2e/support/request-sample-cms.mjs`
- Modify: `tests/e2e/support/product-review-preview-source.ts`

**Interfaces:**
- Produces: `requiredLocalUrl(environmentName, expectedPath?): URL`.
- Consumes: launcher-provided environment variables and fixture stdout containing JSON `{host, port, baseUrl}`.
- Produces: `node scripts/run-owned-e2e.mjs --site <site-id> --spec <path> [--fixture <env-name>=<script>] [--env <name>=<value>]`.

- [ ] **Step 1: Write failing URL validation and repository-scan tests**

```ts
expect(() => requiredLocalUrl('TIO2_MY_BASE_URL', '/', {}))
  .toThrow(/TIO2_MY_BASE_URL is required/u)
expect(requiredLocalUrl('TIO2_MY_BASE_URL', '/', {
  TIO2_MY_BASE_URL: 'http://127.0.0.1:32701/',
}).href).toBe('http://127.0.0.1:32701/')
expect(() => requiredLocalUrl('TIO2_MY_BASE_URL', '/', {
  TIO2_MY_BASE_URL: 'https://example.com/',
})).toThrow(/loopback HTTP/u)
```

The scan rejects `process.env.X ?? 'http://localhost:<number>'`, `process.env.X || 'http://127.0.0.1:<number>'`, and top-level fixed base URL constants in `tests/e2e/**`. Exempt only prerelease defaults `3100` in files whose names start with `prerelease-`, because those target the fixed authoritative environment.

Add a launcher test with fake Next.js, Playwright, and fixture executables. Assert it passes `--port 0` to fixtures, passes the discovered `TIO2_MY_BASE_URL` to Playwright, records each PID/port lease, and stops only its own children in reverse startup order.

- [ ] **Step 2: Run the contract test and verify the red state**

Run: `npx vitest run tests/infrastructure/e2e-runtime-url-contract.test.ts`

Expected: FAIL with the current fixed-fallback file list.

- [ ] **Step 3: Implement the shared fail-closed URL reader**

```ts
export function requiredLocalUrl(
  environmentName: string,
  expectedPath = '/',
  environment: Record<string, string | undefined> = process.env,
): URL {
  const raw = environment[environmentName]
  if (!raw) throw new Error(`${environmentName} is required`)
  const url = new URL(raw)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error(`${environmentName} must be a loopback HTTP URL`)
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== expectedPath) {
    throw new Error(`${environmentName} must use path ${expectedPath} without credentials, query, or fragment`)
  }
  return url
}
```

- [ ] **Step 4: Replace every runnable E2E fallback with an explicit variable**

Each specification imports the helper and names the actual launcher contract:

```ts
const baseUrl = requiredLocalUrl('TIO2_MY_BASE_URL').origin
const cmsGraphqlUrl = requiredLocalUrl('FIVE_WORDPRESS_GRAPHQL_URL', '/graphql').href
```

Keep literal localhost URLs only in assertions that never open a listener or make a request. Do not turn missing variables into skipped tests; fail with the configuration error.

- [ ] **Step 5: Convert fixture servers to port `0` and emit selected URLs**

Each Node fixture binds `0` by default, reads `server.address()` after listening, and writes one JSON line:

```js
server.listen(0, '127.0.0.1', () => {
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Fixture did not expose a TCP address')
  process.stdout.write(`${JSON.stringify({
    host: '127.0.0.1',
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
  })}\n`)
})
```

Launchers parse the JSON line and set the corresponding `*_FIXTURE_URL` environment variable before invoking Playwright.

- [ ] **Step 6: Implement the owned E2E launcher**

Parse repeated `--spec`, `--fixture`, and `--env` flags without invoking a shell. Reserve a numeric fallback port from `32100-32999` because the Next.js CLI requires its port before launch, attach the spawned PID, wait for the expected `data-site-id`, then spawn Playwright with an explicit environment. Fixture processes still bind port `0`, and a fixture declaration maps its JSON `baseUrl` to the named environment variable.

```js
const nextLease = await reserveLease({
  runId: options.runId,
  purpose: 'test-next',
  siteId: options.site,
  worktree: repositoryRoot,
  commit: sourceCommit,
})
const next = await startOwnedCommand({
  command: process.execPath,
  args: [nextCli, 'dev', '--hostname', '127.0.0.1', '--port', String(nextLease.ports[0])],
  expectedSiteId: options.site,
})
const childEnvironment = {
  ...selectedEnvironment,
  TIO2_MY_BASE_URL: next.baseUrl,
}
const playwright = spawn(process.execPath, [playwrightCli, 'test', ...options.specs], {
  cwd: repositoryRoot,
  env: childEnvironment,
  stdio: 'inherit',
  windowsHide: true,
})
```

Install `SIGINT`, `SIGTERM`, normal-exit, and error cleanup through one idempotent `finally` path. Reject `--env` keys not named by a specification contract and reject non-loopback URL values.

- [ ] **Step 7: Run contract, launcher, and TypeScript checks**

Run: `npx vitest run tests/infrastructure/e2e-runtime-url-contract.test.ts tests/infrastructure/owned-e2e-launcher.test.ts`

Run: `npm run typecheck`

Expected: both PASS; the repository scan reports zero runnable fixed E2E fallbacks outside fixed prerelease tests.

- [ ] **Step 8: Run representative launcher-owned E2E groups**

Run these exact launcher shapes, substituting only environment values sourced from the local ignored environment file where a CMS credential is required:

```text
node scripts/run-owned-e2e.mjs --site tio2-my --spec tests/e2e/product-hub.spec.ts
node scripts/run-owned-e2e.mjs --site tio2-my --spec tests/e2e/editorial-five.spec.ts --env FIVE_WORDPRESS_GRAPHQL_URL=http://127.0.0.1:8080/graphql
node scripts/run-owned-e2e.mjs --site tio2-my --spec tests/e2e/document-reach.spec.ts --fixture DOC_REACH_FIXTURE_URL=tests/e2e/support/document-reach-cms.mjs
node scripts/run-owned-e2e.mjs --site tio2-my --spec tests/e2e/poland-g9-isolation.spec.ts --env POLAND_LOCAL_GRAPHQL_URL=http://127.0.0.1:8080/graphql
```

Record the actual allocated URLs in the task receipt. The Poland command must declare its canonical CMS access as `shared-mutating` and retain its existing database/application lock.

Expected: all four groups target their provided loopback URLs; none assumes historical ports `3004`, `3015`, `3216`, `3236`, `4013`, `4024`, `8186`, or `8187`.

- [ ] **Step 9: Commit**

```powershell
git add scripts/run-owned-e2e.mjs tests/e2e tests/infrastructure/e2e-runtime-url-contract.test.ts tests/infrastructure/owned-e2e-launcher.test.ts
git commit -m "test: require launcher-owned e2e urls"
```

---

### Task 7: Integrate owned Next.js processes with leases and interruption cleanup

**Files:**
- Modify: `tests/e2e/support/owned-next-dev.ts`
- Modify: `tests/e2e/owned-next-dev-lifecycle.spec.ts`
- Create: `tests/infrastructure/owned-next-dev-lease.test.ts`

**Interfaces:**
- Consumes: Task 1 `reserveLease`, `attachLease`, and `releaseLease` functions.
- Preserves: `startOwnedNextDev(options): Promise<OwnedNextDevRuntime>` public interface.
- Adds: `leaseId: string` to `OwnedNextDevRuntime`.

- [ ] **Step 1: Write failing lease lifecycle tests**

Inject lease operations and process spawning so tests assert ordering:

```ts
expect(events).toEqual([
  'reserve-port-0',
  'spawn-next',
  'attach-pid',
  'ready-identity',
  'stop-owned-process',
  'listener-closed',
  'release-lease',
])
```

Add cases for startup failure, test assertion failure, timeout, `SIGINT`, Windows `taskkill` failure, and PID start-time mismatch. Owner mismatch must retain the lease and the unrelated process.

- [ ] **Step 2: Run focused tests and verify the red state**

Run: `npx vitest run tests/infrastructure/owned-next-dev-lease.test.ts`

Expected: FAIL because the runtime does not expose or update a lease.

- [ ] **Step 3: Attach the existing OS-selected port and process identity**

Keep the existing OS-assisted free-port discovery and process-tree cleanup. Immediately reserve the discovered numeric port through a single-port pool before spawning Next.js, attach PID plus start time after spawn, and add cleanup handlers that call the same idempotent `stop()` implementation.

```ts
const lease = await reserveLease({
  runId: runtimeId,
  purpose: 'test-next',
  siteId: environment.SITE_ID ?? null,
  worktree: repositoryRoot,
  commit: sourceCommit,
  pool: {start: port, end: port},
})
await attachLease({leaseId: lease.leaseId, processId: nextServer.pid})
```

Readiness must verify the expected site marker/identity response, not only `robots.txt` status.

- [ ] **Step 4: Verify cleanup paths**

Run: `npx vitest run tests/infrastructure/owned-next-dev-lease.test.ts`

Run: `npx playwright test tests/e2e/owned-next-dev-lifecycle.spec.ts --config=playwright.config.ts`

Expected: PASS; `.runtime/port-leases` contains no record from the completed test.

- [ ] **Step 5: Commit**

```powershell
git add tests/e2e/support/owned-next-dev.ts tests/e2e/owned-next-dev-lifecycle.spec.ts tests/infrastructure/owned-next-dev-lease.test.ts
git commit -m "test: track owned Next runtimes"
```

---

### Task 8: Documentation, complete verification, and promotion handoff

**Files:**
- Create: `docs/runtime-ports.md`
- Modify: `docs/development-execution.md`
- Modify: `docs/prerelease-environment.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: all prior runtime commands and fixed endpoint contracts.
- Produces: one operator workflow for development, tests, prerelease, diagnosis, and safe recovery.

- [ ] **Step 1: Add a documentation contract test before writing prose**

Extend `tests/infrastructure/runtime-port-cli.test.ts` to assert every documented npm command exists and `runtime:doctor` is read-only. Extend `tests/infrastructure/e2e-runtime-url-contract.test.ts` to assert the runbook contains the fixed endpoint table and both dynamic ranges.

Run: `npx vitest run tests/infrastructure/runtime-port-cli.test.ts tests/infrastructure/e2e-runtime-url-contract.test.ts`

Expected: FAIL until the runbook and package scripts are complete.

- [ ] **Step 2: Write the operator runbook**

Document these exact flows:

```text
npm run wordpress:start
npm run sites:start
npm run runtime:status
npm run runtime:doctor
npm run prerelease:status
```

Include: endpoint table; lease JSON fields; feature reservation and release examples; explicit data modes; Compose project names; `OWNER_MISMATCH` recovery; how to identify a stale listener without stopping it; interruption cleanup; logs; and the rule that `.runtime` evidence is not a deployment receipt.

- [ ] **Step 3: Update authoritative development and prerelease docs**

In `docs/development-execution.md`, replace historical ad-hoc port guidance with the stable/dynamic allocation table and require launcher-supplied E2E URLs. In `docs/prerelease-environment.md`, keep `3100/8180` fixed and link to `runtime:doctor`; do not change prerelease start/reset semantics.

- [ ] **Step 4: Run documentation and infrastructure verification**

Run: `npx vitest run tests/infrastructure/runtime-port-leases.test.ts tests/infrastructure/runtime-port-cli.test.ts tests/infrastructure/runtime-port-doctor.test.ts tests/infrastructure/local-wordpress-controller.test.ts tests/infrastructure/local-sites-controller.test.ts tests/infrastructure/prerelease-controller.test.ts tests/infrastructure/docker-compose.test.ts tests/infrastructure/wordpress-compose.test.ts tests/infrastructure/wordpress-test-compose.test.ts tests/infrastructure/wordpress-runtime-classification.test.ts tests/infrastructure/e2e-runtime-url-contract.test.ts tests/infrastructure/owned-next-dev-lease.test.ts`

Expected: PASS.

- [ ] **Step 5: Run full static and build verification**

Run in order:

```text
npm run lint
npm run typecheck
npm run build
```

Expected: all exit `0`.

- [ ] **Step 6: Run the complete Vitest suite with stable environments active**

Preflight with `npm run runtime:doctor`, record development and prerelease owner/container IDs, then run:

```text
npm test
```

Expected: all tests pass with zero port-binding failures. If the already-observed `five-core-review` assertions or another application assertion fails, keep this port branch unchanged, capture the exact failure, and resolve it under a separate systematic-debugging change before promotion; do not skip or weaken it.

- [ ] **Step 7: Verify no owned resources leaked and stable owners did not change**

Run:

```text
npm run runtime:doctor
docker ps --filter label=com.docker.compose.project --format "{{.ID}} {{.Label \"com.docker.compose.project\"}}"
```

Expected: no `d16-test-*` project or completed lease remains; development and prerelease owner/container IDs match the preflight evidence; ports `3001/3002/3003/8080/3100/8180` still belong to their recorded owners.

- [ ] **Step 8: Commit documentation and final integration**

```powershell
git add package.json docs/runtime-ports.md docs/development-execution.md docs/prerelease-environment.md tests/infrastructure/runtime-port-cli.test.ts tests/infrastructure/e2e-runtime-url-contract.test.ts
git commit -m "docs: standardize local runtime ownership"
```

- [ ] **Step 9: Produce the promotion handoff without merging**

Record branch commit, clean worktree status, exact test/build commands, counts, Doctor before/after reports, remaining application failures, and the exact `develop` commit onto which the work must be integrated. Stop before merging this branch into `develop`; integration review and the previously authorized `develop` to `main` promotion are separate gates.

After integration is reviewed and merged to `develop`, the release sequence is:

```text
fresh full develop verification
  -> merge develop into main
  -> verify the exact main commit
  -> rebuild local prerelease from that clean main commit
  -> prerelease health, smoke, visual, and applicable full-site checks
  -> deploy that exact accepted main commit to the authorized Oracle VPS
```
