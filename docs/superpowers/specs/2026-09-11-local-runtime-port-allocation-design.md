# D16 Local Runtime Port Allocation Design

## 1. Purpose and decision status

D16 needs one enforceable port and process-ownership contract for local development, automated tests and the independent local prerelease environment. The immediate trigger is a full `develop` test run in which Docker-backed WordPress tests attempted to publish `127.0.0.1:8080` while the canonical development CMS already owned that endpoint. The same run also showed that multiple worktrees can reuse the Compose project name `wordpress`, making service ownership ambiguous even before a TCP collision occurs.

The design direction was approved by the user on 2026-09-11. This document defines the target behavior. It does not implement the allocator, modify runtime scripts, merge `develop` into `main`, rebuild prerelease or authorize production deployment.

The selected approach is hybrid:

- stable human-operated environments keep documented fixed endpoints;
- automated and short-lived runtimes receive dynamically allocated endpoints;
- every long-lived local runtime has one identifiable owner;
- every test-created runtime is cleaned up by the run that created it;
- an occupied endpoint owned by another task is reported and preserved, never killed automatically.

## 2. Goals and non-goals

### 2.1 Goals

- Preserve stable URLs for ordinary development and authoritative local prerelease.
- Allow independent worktrees and test processes to run without sharing a fixed test port.
- Prevent worktrees from accidentally controlling the same Docker Compose project.
- Remove fixed fallback ports from automated Playwright, Vitest, fixture and proxy runtimes.
- Make runtime ownership, site identity, worktree, process/container identity and cleanup responsibility inspectable.
- Make failed and interrupted tests release their own processes, containers and port leases.
- Keep development, prerelease and production endpoint identities distinct.
- Unblock a fresh `develop` verification, `develop` to `main` promotion and exact-main prerelease rebuild.

### 2.2 Non-goals

- This design does not change the public website routes, CMS content or approved business behavior.
- It does not combine development and prerelease data stores.
- It does not make the local prerelease port dynamic.
- It does not provide a general machine-wide service supervisor.
- It does not allocate production VPS ports from the local allocator.
- It does not terminate unknown processes or containers.
- It does not preserve historical evidence runtimes indefinitely; an evidence task must explicitly request and own a retained runtime.

## 3. Current state and failure modes

The current repository contains these stable local endpoints:

| Environment | Endpoint | Current source |
|---|---|---|
| Development Site A | `127.0.0.1:3001` | `scripts/start-local-sites.ps1` and WordPress preview configuration |
| Development Site B | `127.0.0.1:3002` | `scripts/start-local-sites.ps1` and WordPress preview configuration |
| Development Malaysia | `127.0.0.1:3003` | `scripts/start-local-sites.ps1` and WordPress preview configuration |
| Development WordPress | `127.0.0.1:8080` | `wordpress/docker-compose.yml` |
| Local prerelease Malaysia | `127.0.0.1:3100` | `ops/prerelease/docker-compose.yml` |
| Local prerelease WordPress | `127.0.0.1:8180` | `ops/prerelease/docker-compose.yml` |

Historical tests and evidence flows also contain fixed ports including 3004, 3005, 3013, 3015, 3017, 3018, 3021-3024, 3029, 3183, 3216, 3226, 3236, 4013, 4024, 8186 and 8187. These values are not a managed allocation contract. They can collide with a running task or another test worker.

The 2026-09-11 full-suite failure exposed four distinct failure modes:

1. Docker integration tests started the ordinary WordPress Compose file under a test project name while it still published host port 8080.
2. More than one worktree used Compose project name `wordpress`, so `docker compose` could associate the same project with different source directories.
3. Tests that only needed WP-CLI still started the host-facing WordPress port even though no browser or host HTTP client required it.
4. Fixed fallback URLs in test source allowed an omitted launcher variable to silently target another running service.

Port isolation will remove the environmental failures. Separate application assertions found by the same full run remain ordinary test failures and must be debugged independently; the port redesign must not hide them.

## 4. Endpoint classes

### 4.1 Stable local development endpoints

The ordinary shared development environment keeps these endpoints:

| Owner | Service | Endpoint |
|---|---|---|
| `d16-dev-sites` controller | Site A Next.js | `http://127.0.0.1:3001` |
| `d16-dev-sites` controller | Site B Next.js | `http://127.0.0.1:3002` |
| `d16-dev-sites` controller | Malaysia Next.js | `http://127.0.0.1:3003` |
| canonical development CMS | WordPress, GraphQL and admin | `http://127.0.0.1:8080` |

The existing Compose project name `wordpress` is retained during migration to preserve its current named volumes. It becomes a reserved singleton project. It may be started only through the canonical development CMS entry point and from the recorded canonical source checkout. A worktree may consume this CMS but may not start, recreate or stop the singleton project.

Renaming the existing Compose project is deferred because a careless rename would select different named volumes and appear to lose development data.

### 4.2 Stable local prerelease endpoints

The existing prerelease contract remains unchanged:

| Owner | Service | Endpoint |
|---|---|---|
| `d16-tio2-my-prerelease` | Malaysia production-mode Next.js | `http://127.0.0.1:3100` |
| `d16-tio2-my-prerelease` | isolated WordPress, GraphQL and admin | `http://127.0.0.1:8180` |

These ports never fall back to another value. Start and status actions must verify the run ID, source commit, Build ID, CMS identity and Compose project. If either port is owned by another runtime, prerelease start stops with an ownership report.

### 4.3 Human-operated feature runtimes

Feature runtimes that must remain open for manual review receive a lease from `32000-32099`. The range provides stable-for-the-life-of-the-lease URLs without colliding with historical low 3000-series ports.

A feature runtime may request more than one adjacent port only when its contract requires multiple sites or a companion fixture. The lease records each port separately under one run ID. A feature runtime never assumes a particular numeric port before reservation.

### 4.4 Automated test runtimes

Automated runtimes use operating-system or Docker-assigned ports wherever possible:

- Node HTTP fixtures listen on port `0` and publish the returned address.
- Playwright receives the actual `baseURL` from its launcher environment.
- Docker services that need host HTTP use loopback random publishing, equivalent to `127.0.0.1::80`, and the launcher inspects the assigned host port.
- Docker tests that only use Compose-network clients publish no host port.
- WP-CLI tests run against the Compose service name on an isolated Compose network and do not expose WordPress or MariaDB to the host.

If a third-party command requires a numeric port before it starts, the local allocator may lease one from `32100-32999`. This is a fallback allocation pool, not a source-code default.

### 4.5 Production VPS endpoints

Production ports are a separate host-level contract and are not allocated locally:

| Service | Production binding |
|---|---|
| Nginx | public ports 80 and 443 |
| Next.js | VPS loopback port 3001 |
| WordPress | VPS loopback port 8080 |
| MariaDB | Docker network only |

Using the same numeric port on the developer computer and VPS does not create a collision because the hosts are different. Production scripts must not read local port leases.

## 5. Runtime ownership and lease model

### 5.1 Lease directory

Local runtime leases live under the Git common directory, shared by every worktree of the repository and outside tracked source:

```text
<git-common-dir>/d16-runtime/port-leases/
  <lease-id>.json
```

The directory is runtime state and is never committed. A lease contains no secret values. Default CLI, PowerShell, Doctor, owned Next, WordPress runtime and public E2E calls resolve the same directory; the worktree/run fields retain the individual caller identity. A non-Git standalone project uses its own `.runtime/port-leases`. Explicit test/diagnostic root injection creates a separate reservation domain and is not a daily launcher option. Unrelated repositories do not share a machine-global registry.

Each record contains:

```json
{
  "schemaVersion": 1,
  "leaseId": "uuid",
  "runId": "task-or-test-run-id",
  "purpose": "feature-next|test-next|test-wordpress|fixture",
  "siteId": "tio2-my",
  "worktree": "absolute-path",
  "commit": "40-character-git-sha",
  "host": "127.0.0.1",
  "ports": [32000],
  "processIds": [],
  "composeProject": null,
  "createdAt": "ISO-8601 timestamp",
  "retainUntil": null
}
```

`siteId` may be null for infrastructure-only fixtures. `retainUntil` is null for ordinary tests. A retained manual-review runtime must use an explicit release condition or timestamp.

### 5.2 Reservation behavior

The allocator performs an exclusive reservation operation:

1. acquire the allocator lock;
2. discard only leases proven stale by both missing owner process/project and absent listener;
3. select a free loopback port from the requested pool;
4. bind-check the port while holding the lock;
5. write the lease atomically;
6. return machine-readable JSON to the launcher;
7. release the allocator lock.

The launcher immediately starts the service and updates the lease with the process ID or Compose project. If startup fails, the launcher releases the lease in `finally`.

A lease file alone never authorizes killing a process. Cleanup may stop a process or Compose project only when its recorded identity still matches the current process command or Compose labels.

### 5.3 Operator interface

One shared controller provides these operations:

```text
Reserve  -Purpose <purpose> -RunId <id> [-SiteId <site>] [-Count <n>]
Attach   -LeaseId <id> -ProcessId <pid> | -ComposeProject <name>
Release  -LeaseId <id>
Status   [-Json]
Doctor
```

The PowerShell entry point is intended for Windows operator workflows. Test helpers may call a small cross-platform Node module containing the same lease validation and allocation core. Both interfaces use the same schema and lock rules rather than implementing competing allocators.

`Doctor` reports fixed-port ownership, active leases, stale leases, duplicate Compose project names and listeners that have no lease. It does not modify or stop anything.

## 6. Docker Compose ownership

Compose projects are divided into three classes:

| Class | Project naming | Lifecycle |
|---|---|---|
| Development CMS singleton | existing `wordpress` | operator-controlled, persistent |
| Local prerelease singleton | `d16-tio2-my-prerelease` | prerelease controller, persistent data |
| Automated test | `d16-test-<short-run-id>` | test-controlled, ephemeral containers/network |

An automated test project must never use `wordpress` or `d16-tio2-my-prerelease`. Its name includes a collision-resistant run ID, not only a worker number.

Tests use a Compose override or generated configuration that removes the ordinary `127.0.0.1:8080:80` mapping. The base development Compose file may retain its human-development mapping; automated tests are responsible for applying the test topology explicitly.

Test cleanup runs `docker compose down` for the exact project and configuration files recorded by the run. It does not pass `--volumes` unless the test created disposable named volumes and recorded them as disposable. Persistent development and prerelease volumes are never cleanup targets.

## 7. Launcher and test contracts

### 7.1 No source-code fallback ports

Automated Playwright specifications and shared helpers must not contain a runnable localhost fallback such as:

```ts
process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:3004'
```

They either:

- receive a required URL from the launcher and fail with a clear configuration error when absent; or
- create their own server on port `0` and use its returned URL.

Static URL strings remain allowed in unit tests that test parsing or validation without opening a listener.

### 7.2 Owned processes

Long-running Next.js launchers record:

- worktree and commit;
- site identity;
- port and Build directory;
- process ID and start time;
- command identity;
- stdout/stderr location;
- cleanup condition.

The launcher verifies readiness by polling an identity endpoint or page marker, not only by seeing an open port or a `Ready` log line.

### 7.3 Parallel test execution

Tests that share mutable CMS data remain serialized even after their TCP ports are isolated. Port isolation permits concurrent network binding; it does not make a shared database transactionally isolated.

Every Docker-backed test declares one of these data modes:

- `isolated`: unique Compose project and disposable data volumes; safe to run concurrently;
- `shared-read-only`: canonical development CMS, no writes; concurrency allowed only when the test verifies read-only behavior;
- `shared-mutating`: canonical development CMS with explicit serial execution and recovery; excluded from unconstrained full-suite workers.

No test infers its data mode from a port number.

## 8. Failure handling and cleanup

Every launcher installs cleanup for normal completion, assertion failure, timeout and interruption. Cleanup order is:

1. stop the owned child process or exact test Compose project;
2. wait for the listener to close;
3. remove only disposable containers and network;
4. preserve logs and failure evidence;
5. release the lease;
6. report any resource that could not be cleaned.

When the recorded owner no longer matches the live owner, cleanup refuses to stop it and reports `OWNER_MISMATCH`. The lease is retained for investigation.

Stable development and prerelease services are stopped only through their existing controllers. A test failure cannot stop them.

## 9. Migration plan

Implementation proceeds in bounded stages:

1. Add the runtime lease schema, shared allocation core, PowerShell operator wrapper and ignored runtime directory.
2. Add contract tests for atomic reservation, concurrent allocation, stale detection, owner mismatch and release.
3. Add `Doctor` checks for fixed ports and Compose project ownership.
4. Establish a canonical development CMS controller while retaining the existing `wordpress` project and volumes.
5. Add an automated-test Compose override with no fixed host WordPress port and unique project naming.
6. Convert Docker-backed Vitest helpers to internal networking or inspected random host ports.
7. Convert owned Next.js, proxy and fixture launchers to returned ports.
8. Remove runnable fixed fallbacks from Playwright specifications and require launcher-provided URLs.
9. Add failure, timeout and interruption cleanup tests.
10. Run the full test suite with the canonical development CMS and prerelease allowed to remain active, proving that tests neither collide with nor stop them.

Migration may be split by helper family, but mixed behavior is not considered complete. Until conversion finishes, legacy fixed-port tests must be identified and run serially with a preflight check; they may not silently use a port owned by another runtime.

## 10. Verification and acceptance criteria

The implementation is accepted only when fresh evidence proves all of the following:

- The documented fixed development and prerelease endpoints remain unchanged.
- Starting two isolated test runs produces different ports and different Compose project names.
- WP-CLI-only tests publish no WordPress or database host port.
- Browser-to-WordPress tests discover a random loopback port and receive the correct site identity.
- A test run can execute while development port 8080 and prerelease ports 3100/8180 are occupied by their correct owners.
- Failed and interrupted tests remove their own listeners, containers and leases.
- Owner mismatch prevents cleanup from stopping another task.
- No automated E2E test contains a runnable fixed localhost fallback.
- `Doctor` reports the active owner for each fixed endpoint and detects duplicate reserved Compose project names.
- The complete Vitest suite passes without port-collision failures.
- Required typecheck, lint, build and affected Playwright suites pass.
- Existing development and prerelease containers keep their pre-test identity and data after the suite.

Application-level failures unrelated to port ownership must still pass or receive a separate verified fix before `develop` can enter `main`.

## 11. Relationship to integration and release

The interrupted promotion sequence resumes only after this implementation is integrated into `develop` and the fresh `develop` verification is green:

```text
port isolation implementation
  -> full develop verification
  -> merge develop into main
  -> verify the exact merged main tree
  -> rebuild independent local prerelease from that clean main commit
  -> run prerelease health, smoke and applicable full-site checks
  -> begin the separately authorized VPS production deployment
```

Old prerelease Build IDs do not prove the merged main candidate. Production packaging must use the exact clean main commit that produced the accepted prerelease run.

## 12. Documentation ownership

- Stable development and prerelease endpoint assignments belong in `docs/development-execution.md`.
- Concrete prerelease commands remain in `docs/prerelease-environment.md`.
- The allocator and ownership commands receive a focused runtime-ports runbook.
- `scripts/start-local-sites.ps1`, `wordpress/docker-compose.yml` and `scripts/prerelease.ps1` remain the implementation authorities for their existing environments.
- Test-specific dynamic allocation behavior belongs in shared test helpers, not copied into individual specifications.

This design becomes historical intent once implementation lands. Current behavior must then be described from the actual controllers and tests rather than inferred from this document alone.
