# D16 Local Prerelease Environment Design

## 1. Purpose

D16 needs one durable local prerelease environment for final testing of the complete `tio2-my` website after code has entered local `main`. It replaces temporary page-specific ports and build directories as the authoritative local prerelease target. It does not replace feature worktrees, targeted development tests, D23 Gate 9 review, a remote Preview environment, or Production.

The environment must be reproducible, isolated from the ordinary local WordPress stack, bound to an exact clean `main` commit, and safe to keep running between test sessions.

## 2. Approved Decisions

- Initial site scope: `tio2-my` only.
- Runtime architecture: a dedicated Docker Compose stack for Next.js, WordPress, MariaDB and one-shot WP-CLI/bootstrap work.
- Website URL: `http://127.0.0.1:3100`.
- WordPress URL and admin: `http://127.0.0.1:8180` and `http://127.0.0.1:8180/wp-admin/`.
- MariaDB has no host port.
- The complete current `tio2-my` website is tested, not a page subset.
- Source authority: an exact clean local `main` commit only.
- WordPress database and uploads persist across normal stop/start operations.
- An explicit reset operation may rebuild only the prerelease database and upload volumes.
- RFQ, Request Sample and Request Documents use the approved real Web3Forms receiver configuration in prerelease.
- Ordinary prerelease tests never submit a form. Live form delivery uses a separate explicit command.
- Every live prerelease form payload carries a `local-prerelease` marker and a unique test run identifier.
- The environment remains `noindex, nofollow` and grants no release, deployment or Gate 10 authority.

## 3. Environment Boundary

The Compose project name is fixed as `d16-tio2-my-prerelease`. Every container, network and named volume uses this project boundary. The stack must not reuse the existing `wordpress/docker-compose.yml` database, WordPress volume, ports or project name.

Only these host ports are exposed:

| Host endpoint | Container service | Purpose |
|---|---|---|
| `127.0.0.1:3100` | `web:3000` | Complete `tio2-my` prerelease site |
| `127.0.0.1:8180` | `wordpress:80` | Prerelease CMS, GraphQL and admin |

The database, WP-CLI and Next.js build services are reachable only on the Compose network. All host bindings must state `127.0.0.1` explicitly; an unspecified or `0.0.0.0` binding is an error.

Feature runtimes such as ports 3232, 3233, 3240 and 3241 are independent evidence environments. Their state cannot be used as the prerelease Build or CMS state.

## 4. Components and Responsibilities

### 4.1 Compose stack

`ops/prerelease/docker-compose.yml` defines:

- `db`: MariaDB with a dedicated health check and persistent database volume.
- `wordpress`: WordPress with a dedicated persistent site/upload volume, project plugin mounted read-only, loopback-only port 8180 and health check.
- `wpcli`: one-shot bootstrap and seed service attached to the same volumes and network.
- `builder`: one-shot Node 24 build service that consumes the frozen source snapshot, connects to `http://wordpress/graphql`, and writes the exact Next build into the run directory.
- `web`: Node 24 local-production runtime that consumes the frozen source and build, binds container port 3000, and exposes only loopback port 3100.

The Next.js runner uses `next start`, not `next dev`. A standalone-output migration is outside this first version; the runner uses the repository's existing Next.js 16.3.2 production command and dependency layout.

### 4.2 Orchestration script

`scripts/prerelease.ps1` is the single operator interface. It accepts one action at a time:

- `Start`
- `Status`
- `Stop`
- `ResetData`
- `Test`
- `TestLiveForms`

Thin package scripts may call these actions, but business logic remains in the PowerShell script. The script never prints secret values or full container environment blocks.

### 4.3 Frozen source snapshot

`Start` must run from the primary D16 checkout and verify:

1. the current branch is exactly `main`;
2. the worktree has no tracked or untracked changes outside ignored runtime output;
3. no other prerelease operation holds the environment lock;
4. ports 3100 and 8180 are available or already owned by the exact recorded prerelease stack.

The script exports the exact `main` tree with `git archive`, rather than bind-mounting the mutable checkout into the builder. The extracted source lives below the ignored `.prerelease/` directory. This prevents Next type generation, build output and container file ownership from modifying `main`.

The source snapshot is immutable for one run. A newer `main` commit requires a new build and run identity; it cannot silently reuse the previous Build ID.

## 5. WordPress Data Lifecycle

The first start creates dedicated database and WordPress volumes, installs WordPress, creates the configured local administrator, installs the required plugins, activates `tio2-site-model`, configures permalinks and imports the current approved `tio2-my` content represented by `main`.

Initialization is driven by a deterministic prerelease seed manifest. The manifest lists applicable seed scripts in order and records their SHA-256 values. Unlisted ad hoc scripts are not run. The bootstrap must create and validate the `tio2-my` site scope and reject records that resolve to another site.

Normal `Stop` preserves the database, administrator and uploads. `ResetData` removes only volumes owned by `d16-tio2-my-prerelease`, recreates them, reruns bootstrap and seed, and records a new CMS data identity. It must resolve and display the exact Compose project and volume names before deletion; it must not enumerate paths in one shell and delete them in another.

The CMS data identity contains:

- WordPress core version;
- active plugin names and versions;
- seed manifest hash;
- ordered seed script hashes;
- relevant record counts and `site_scope=tio2-my` checks;
- initialization time.

The runtime never reads content from `D:\23MySec`; approved material must already be represented in the selected D16 `main` commit.

## 6. Configuration and Secrets

Committed configuration consists of a documented example file with placeholders. Actual values live in `.env.prerelease.local`, which remains covered by the repository's `.env.*` ignore rule.

The file supplies dedicated local database credentials, WordPress administrator credentials, revalidation/preview secrets and the approved Web3Forms receiver access key. The scripts validate presence and basic shape without printing values. Secrets must not enter generated manifests, test reports, command output, Docker labels or Git commits.

The three forms share the approved receiver configuration. Prerelease-only payload metadata includes:

- `environment=local-prerelease`;
- `test_run_id=<unique run id>`;
- the existing page/workflow identity.

Recipient identity is internal configuration and must not render in page content, metadata, Schema, analytics or diagnostics. The local Build may contain the existing public client access-key mechanism required by the current forms, but tooling must not copy or expose that value in evidence.

## 7. Build and Runtime Identity

Each successful `Start` creates a run ID using UTC time plus the short Git commit. The run directory is `.prerelease/runs/<run-id>/` and contains the frozen source, build output, non-secret logs and machine state.

After building, the orchestrator records:

- site ID;
- Git branch and full commit;
- source archive SHA-256;
- Next Build ID;
- builder and runtime image digests;
- Compose project name;
- CMS data identity;
- website and WordPress URLs;
- startup and health-check timestamps;
- configured form mode without its credentials.

`Status` derives live state from Docker and compares it with the saved run Manifest. A listening port alone is insufficient. Status is healthy only when container health, Git commit, Build ID, `SITE_ID=tio2-my`, CMS identity and HTTP page markers all agree.

## 8. Operational Flow

### 8.1 Start

1. Acquire the prerelease operation lock.
2. Validate clean `main`, Docker availability, configuration and ports.
3. Create the frozen source and provisional run Manifest.
4. Start and health-check MariaDB and WordPress.
5. Bootstrap or validate the persistent CMS data.
6. Run the containerized Next production build against the prerelease WordPress GraphQL endpoint.
7. Start the web container with the exact build.
8. Run GET-only identity and health checks.
9. Finalize the run Manifest and current-run pointer.
10. Release the lock.

If a step fails, the script records the failed stage and preserves useful non-secret logs. It stops a newly created unhealthy web container but does not delete persistent CMS data automatically.

### 8.2 Stop

`Stop` stops only containers that belong to the exact prerelease Compose project. It preserves volumes, run evidence and source/build identity.

### 8.3 ResetData

`ResetData` requires the prerelease stack to stop, verifies volume ownership, deletes only its database and WordPress volumes, then runs a fresh `Start`. It records the previous and replacement CMS identities.

## 9. Test Contract

### 9.1 Automatic prerelease test

`Test` binds Playwright and other runtime probes to `http://127.0.0.1:3100`. It performs no external POST and covers:

- exact site, commit, Build and CMS identity;
- representative complete-site routes and required shared navigation;
- WordPress GraphQL health and `tio2-my` isolation;
- route availability and selected cross-page relations;
- canonical and mandatory `noindex, nofollow` behavior;
- Cookie Settings;
- RFQ, Request Sample and Request Documents form availability;
- validation and keyboard flows that do not submit;
- responsive viewports and required native browser zoom where applicable;
- absence of horizontal overflow and blocker-level clipping;
- no unexpected non-GET requests during the ordinary suite.

The suite is scoped to the current `tio2-my` prerelease acceptance surface. It does not automatically run unrelated full-repository tests or the specialized `verify:root-only` command.

### 9.2 Explicit live form delivery test

`TestLiveForms` is a separate operator action and is never called by `Start` or `Test`. It creates one run ID and submits one clearly marked request through each of the three forms. It records browser-side submission time, workflow, correlation ID, provider response class and a pending mailbox-confirmation item without recording personal data or credentials.

Provider-positive acknowledgement and actual inbox receipt remain separate facts. The command cannot declare inbox receipt automatically unless a separately authorized mailbox integration returns a correlated result. Repeating a live run creates new test identifiers and does not reuse an earlier success.

### 9.3 Evidence storage

Ephemeral machine reports and screenshots are written below `docs/verification/prerelease/runs/<run-id>/` and ignored by default so testing does not dirty `main`. A task may deliberately seal selected evidence into a tracked receipt on its own branch. No run overwrites another run's files.

## 10. Commands and User Experience

The intended package interfaces are:

```text
npm run prerelease:start
npm run prerelease:status
npm run prerelease:stop
npm run prerelease:reset
npm run prerelease:test
npm run prerelease:test:forms-live
```

Successful `Start` prints only the website URL, WordPress admin URL, Git commit, Build ID, CMS identity, run ID and health summary. `Status` uses the same identity fields. Failure output names the failed stage, affected service and log path.

## 11. State Model and Boundaries

The prerelease state is one of:

- `STOPPED`
- `STARTING`
- `HEALTHY`
- `UNHEALTHY`
- `STALE_MAIN`
- `RESETTING`

`STALE_MAIN` means the running environment is healthy for its recorded commit but local `main` has moved. It must not be represented as the current prerelease candidate until rebuilt.

A healthy local prerelease environment proves only the recorded local combination. It does not imply D23 Gate 9 approval, remote Preview deployment, production receiver delivery, Production deployment, sitemap/indexing authorization or Gate 10. It performs no Git merge or push.

## 12. Acceptance Criteria

The first implementation is complete when all of the following are demonstrated:

1. A clean `main` starts the complete stack with one command.
2. The site is available only on `127.0.0.1:3100` and WordPress only on `127.0.0.1:8180`; MariaDB has no host listener.
3. WordPress admin login, GraphQL and current approved `tio2-my` records work from the dedicated persistent volumes.
4. Stop/start preserves CMS data; reset recreates only prerelease-owned data.
5. The web runtime serves the exact recorded Git commit and Build ID and rejects a cross-site identity.
6. The full `tio2-my` runtime remains `noindex, nofollow`.
7. Ordinary tests perform zero external form submissions.
8. The explicit live form command can exercise RFQ, Sample and Documents with unique `local-prerelease` identifiers and separate provider/inbox conclusions.
9. Missing configuration, dirty/non-main source, port conflicts, unhealthy CMS, build failure and identity mismatch fail closed with non-secret diagnostics.
10. Generated runtime evidence does not dirty `main`, expose credentials or overwrite historical runs.

## 13. Deferred Scope

The first version does not provide remote access, TLS, a public hostname, a remote staging server, production deployment, automated mailbox reading, multiple D16 sites in one prerelease stack, production database cloning, DNS changes or automatic Gate transitions. Other sites may adopt the same pattern later using their own site identity, ports, volumes, configuration and acceptance contract.
