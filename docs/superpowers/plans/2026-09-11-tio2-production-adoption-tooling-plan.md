# TiO₂ Malaysia Production Adoption Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a root-only Plan/Apply adoption path that preserves the existing production CMS and database, adds the two-slot frontend, and binds prerelease, backup, public verification, and final E2E evidence to one release identity.

**Architecture:** Extend the existing administrator bundle and fixed six-action release protocol instead of creating a second daily deploy system. A root-only adoption entry point probes the legacy topology, computes a deterministic plan hash, and performs two durable adoption phases through three normal Apply invocations: backup/recovery, internal topology plus ACME readiness, then DNS-gated TLS activation. It enrolls the resulting v3 runtime. The local PowerShell controller seals exact prerelease evidence, transfers only fixed adoption artifacts, performs off-host restore, and creates the final production verification receipt.

**Tech Stack:** Python 3.12 standard library, PowerShell 7.2+, Docker Engine/BuildKit, MariaDB 11.4, WordPress PHP 8.3, Nginx 1.24, Node.js 24, Next.js 16, Vitest, Playwright, age.

**Spec:** [TiO₂ Malaysia production adoption design](../specs/2026-09-11-tio2-production-adoption-design.md)

## Global Constraints

- Start implementation from `develop` only after the existing `codex/oracle-vps-production-deployment` branch has passed final review and been integrated according to the D16 workflow; create `codex/tio2-production-adoption` from that exact `develop`.
- Do not modify root `AGENTS.md`, production servers, DNS, SSH configuration, CMS data, or shared branches while executing this development plan.
- Site identity is fixed: `tio2-my`, `https://tio2malaysia.com`, `https://cms.tio2malaysia.com`, Oracle VPS `129.146.68.82`.
- First adoption preserves the existing WordPress service, container MariaDB, `wordpress_wp_data`, `wordpress_db_data`, and CMS loopback port `127.0.0.1:8080`.
- Frontend ports are exactly `127.0.0.1:3000`, `127.0.0.1:3001`; the internal Nginx verification listener is exactly `127.0.0.1:8081`.
- Daily privileged actions remain exactly `status prepare backup deploy verify rollback`; adoption Plan/Apply is root-only and absent from deploy sudoers.
- Plan accepts no caller-selected path, container, image, network, mount, command, or environment override. Apply accepts exactly one lowercase 64-character plan hash.
- Production Compose is not executed during first adoption. The actual legacy Compose is copied as a protected snapshot and hashed in the enrollment record.
- No database, WordPress, plugin, or seed change is permitted by the first-adoption adapter. Unknown compatibility or content identity fails closed.
- Build occurs natively on ARM64 with no Swap, one global lock, one-hour timeout, at least 4 GiB available memory, and at least 12 GiB free disk.
- The accurate private receiver address and Web3Forms key remain in ignored/private configuration. Tracked files and receipts contain only binding/key fingerprints.
- Every implementation step follows RED-GREEN-REFACTOR; every task ends in an independently reviewable commit.

## File and Interface Map

| File | Responsibility |
|---|---|
| `scripts/prerelease/Seal-ProductionGate.ps1` | Combine exact Test, TestLiveForms, inbox, source, Build ID, CMS and surface evidence into one immutable Gate A receipt |
| `scripts/production/Production.Core.psm1` | Require the sealed Gate A receipt during packaging; reuse fixed SSH/SCP and local recovery primitives |
| `scripts/production-adoption.ps1` | Local `Stage`, `Recover`, `Status`, and fixed `ReportGateCFailure` orchestration; never invokes root Plan/Apply |
| `ops/production/server/adoption_contract.py` | Strict schemas, canonical hashes, safe fixed paths, and adoption evidence validation |
| `ops/production/server/adoption_probe.py` | Read-only Docker/Nginx/MariaDB/CMS/release probe and deterministic plan creation |
| `ops/production/server/adoption_state.py` | Atomic root journal and allowed phase transitions for the three normal Apply invocations |
| `ops/production/server/adoption_apply.py` | Phase A installation/backup and Phase B topology/enrollment orchestration |
| `ops/production/server/adoption_wordpress.py` | Exact legacy WordPress snapshot, frontend network attachment, controlled recreation, and restoration |
| `ops/production/server/adoption_nginx.py` | Protected Nginx staging, `8081` and HTTP 503/ACME listeners, syntax validation, reload, and exact rollback |
| `ops/production/server/adoption_tls.py` | Fixed DNS preflight, Certbot webroot issuance, certificate validation, HTTPS activation, and exact recovery |
| `ops/production/server/tio2_adopt.py` | Root-only CLI exposing only `plan` and `apply PLAN_SHA256` |
| `ops/production/nginx/tio2malaysia.internal.conf.template` | Loopback-only activity verifier that includes `web-upstream.conf` |
| `ops/production/release-surface.json` | Authoritative 58-object public GET inventory used by Gate B/C |
| `tests/production/test_adoption_*.py` | Unit and failure-injection tests for contracts, probe, state, backup, WordPress, Nginx and Apply |
| `tests/production-runtime/adoption_runtime.py` | Real isolated legacy-to-v3 Linux/Docker/Nginx rehearsal |
| `tests/e2e/production-live-surface.spec.ts` | Real-domain 58×3 Gate C browser matrix without form writes |
| `tests/e2e/production-live-forms.spec.ts` | Three explicitly authorized production Web3Forms submissions and safe evidence |
| `scripts/production/Confirm-ProductionInbox.ps1` | Record three token-correlated production inbox observations without mailbox content or recipient address |
| `docs/production-deployment.md` | Operator flow, state meaning, fixed artifacts, failure recovery, and evidence boundary |

---

### Task 1: Seal Gate A and Produce a Read-Only Adoption Plan

**Files:**
- Create: `scripts/prerelease/Seal-ProductionGate.ps1`
- Create: `ops/production/server/adoption_contract.py`
- Create: `ops/production/server/adoption_probe.py`
- Create: `ops/production/server/tio2_adopt.py`
- Create: `tests/production/test_adoption_contract.py`
- Create: `tests/production/test_adoption_probe.py`
- Create: `tests/infrastructure/production-prerelease-gate.test.ts`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `ops/production/build_admin_bundle.py`
- Modify: `ops/production/server/bootstrap_install.py`
- Modify: `ops/production/server/bootstrap_selftest.py`

**Interfaces:**
- Produces executable script parameters `-TestReceiptPath -LiveFormsReceiptPath -InboxReceiptPath -OutputPath`; the script invokes `New-PrereleaseProductionGate` and emits the resulting `PSCustomObject` as JSON.
- Produces: `canonical_hash(value: dict[str, object]) -> str` and `validate_plan(value: object) -> dict[str, object]`.
- Produces: `ProductionProbe.inspect() -> dict[str, object]` and `build_plan(probe: dict[str, object], candidate: dict[str, str], tool_commit: str) -> dict[str, object]`.
- Produces one complete JSON object on CLI stdout with schema `tio2-production-adoption-plan-v1`, a 64-character lowercase `planHash`, and fully populated `facts`, `changes`, and `rollback` objects; tests use `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` as the valid hash fixture.
- Consumes the existing `New-ProductionPackage`, `ReleasePaths`, `validate_release_inputs`, Docker inspect format, and release surface v1 inventory.

- [ ] **Step 1: Write failing Gate A receipt tests**

  Add Vitest fixtures for the exact current failure modes: Test receipt at a foreign commit, TestLiveForms `FAILED`, missing inbox confirmation, different Build ID/CMS identity, duplicate workflow, changed surface hash, and a valid three-workflow receipt. The successful fixture must assert this exact contract:

  ```ts
  expect(sealed).toMatchObject({
    schemaVersion: 'tio2-prerelease-production-gate-v1',
    siteId: 'tio2-my',
    state: 'PASSED',
    commit: 'a'.repeat(40),
    counts: {businessPages: 56, registeredObjects: 58, widths: 3, browserCases: 174},
    forms: {rfq: 'RECEIVED', sample: 'RECEIVED', documents: 'RECEIVED'},
  })
  ```

- [ ] **Step 2: Run the Gate A tests and record RED**

  Run: `npx vitest run tests/infrastructure/production-prerelease-gate.test.ts`

  Expected: FAIL because `Seal-ProductionGate.ps1` and the production-gate schema do not exist.

- [ ] **Step 3: Implement the strict Gate A sealer and packaging check**

  The sealer must parse JSON with duplicate-key rejection, hash every input, require one exact commit/Build ID/CMS identity, require the ten approved Test check IDs, require three provider `success=true` results with one POST each, and require three matching inbox confirmations. Write the result by exclusive create. Change `Assert-ProductionCandidate` and `New-ProductionPackage` to accept only this schema and bind `productionGateReceiptSha256` into `release-proof.json`:

  ```powershell
  $gate = Read-ProductionJsonStrict $PrereleaseReceiptPath
  if ($gate.schemaVersion -cne 'tio2-prerelease-production-gate-v1' -or
      $gate.state -cne 'PASSED' -or $gate.commit -cne $GitIdentity.commit -or
      $gate.counts.registeredObjects -ne 58 -or $gate.counts.browserCases -ne 174) {
      throw 'Exact production prerelease gate is not satisfied.'
  }
  ```

- [ ] **Step 4: Write failing adoption contract and read-only probe tests**

  Test exact schema membership, duplicate JSON keys, wrong site/host/ports, caller-controlled paths, non-hex hash, changing `observedAt`, Docker identity drift, missing WordPress volume, database joined to frontend, host MariaDB sharing the Docker volume, callback mismatch, sparse CMS content, foreign scope, and unexpected Nginx server names. Instrument the fake runner and filesystem adapter so the Plan test asserts zero write, mkdir, rename, Docker mutation, systemctl mutation, Nginx reload, SQL mutation, or HTTP POST calls.

- [ ] **Step 5: Run the adoption tests and record RED**

  Run: `python -m unittest tests.production.test_adoption_contract tests.production.test_adoption_probe -v`

  Expected: FAIL because the adoption modules and CLI are absent.

- [ ] **Step 6: Implement deterministic Plan creation**

  Use a canonical payload that excludes only the informational observation timestamp, so an unchanged server recomputes the same hash during Apply:

  ```python
  def canonical_hash(value: dict[str, object]) -> str:
      encoded = json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
      return hashlib.sha256(encoded).hexdigest()

  def build_plan(probe, candidate, tool_commit):
      bound = {
          'schemaVersion': 'tio2-production-adoption-plan-v1',
          'siteId': 'tio2-my', 'host': '129.146.68.82',
          'toolCommit': tool_commit, 'candidate': candidate,
          'facts': probe['facts'], 'changes': probe['changes'], 'rollback': probe['rollback'],
      }
      return {**bound, 'observedAt': probe['observedAt'], 'planHash': canonical_hash(bound)}
  ```

  Probe only fixed sources: `/etc/os-release`, `/proc`, systemd MariaDB properties, `/etc/nginx`, `/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/docker-compose.yml`, fixed Docker labels/inspect APIs, the two named volumes, CMS loopback endpoints, and the three fixed incoming release files. Host MariaDB passes only when its datadir and every open data FD are outside the Docker database mountpoint. CMS output is normalized to site ID, plugin identity, current managed-record count, state, route/page ID/scope and content hashes. A sparse initial CMS is bound as `initialize-approved-56-after-backup`; it is not treated as already approved.

- [ ] **Step 7: Install the root-only entry without widening daily sudo**

  Add the adoption files to the administrator bundle manifest and bootstrap self-test. `tio2_adopt.py` must require POSIX UID 0, clear the environment, expose only `plan` or `apply` plus one plan hash, and return redacted JSON. Do not add it to `sudoers.tio2-release` or the deploy fixed action parser.

- [ ] **Step 8: Run GREEN, regression, and commit**

  Run:

  ```powershell
  npx vitest run tests/infrastructure/production-prerelease-gate.test.ts tests/infrastructure/production-package.test.ts
  python -m unittest tests.production.test_adoption_contract tests.production.test_adoption_probe tests.production.test_admin_bundle tests.production.test_bootstrap_install -v
  ```

  Expected: all tests PASS; Plan output is stable for identical facts and changes hash on any bound fact; root bundle tests prove adoption remains absent from deploy sudo.

  Commit: `feat(production): add sealed prerelease gate and adoption plan`

---

### Task 2: Implement Apply Phase A and Off-Host Recovery

**Files:**
- Create: `ops/production/server/adoption_state.py`
- Create: `ops/production/server/adoption_apply.py`
- Create: `scripts/production-adoption.ps1`
- Create: `tests/production/test_adoption_state.py`
- Create: `tests/production/test_adoption_apply_backup.py`
- Create: `tests/infrastructure/production-adoption-controller.test.ts`
- Modify: `ops/production/server/tio2_adopt.py`
- Modify: `ops/production/server/bootstrap_install.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `ops/production/server/release_baseline.py`
- Modify: `ops/production/server/backup_core.py`

**Interfaces:**
- Consumes Task 1 `build_plan()` and `validate_plan()`.
- Produces: `AdoptionJournal.load_or_create(plan_hash: str) -> dict`, `transition(expected: set[str], target: str, details: dict) -> dict`.
- Produces: `Adoption.apply(plan_hash: str) -> dict[str, object]` with first-call state `AWAITING_OFFHOST_VERIFICATION`.
- Produces local operations `Stage`, `Recover`, `Status`, and `ReportGateCFailure`; `Stage` uploads the three release files plus the separately hashed administrator archive/manifest, while recovery transfer files are `adoption-phase-a.json`, `$BackupId.tar.age`, and `adoption-evidence.json`.
- Reuses existing `install_bootstrap`, `enroll_baseline`, `prepare_release`, `backup_release`, and `client_recovery.py` rather than copying their implementation.

- [ ] **Step 1: Write failing phase and replay tests**

  Cover the exact phase graph:

  ```python
  ALLOWED = {
      'NEW': {'INSTALLING'},
      'INSTALLING': {'NEW', 'BASELINE_ENROLLED'},
      'BASELINE_ENROLLED': {'PREPARED'},
      'PREPARED': {'BASELINE_ENROLLED', 'BACKUP_COMPLETE'},
      'BACKUP_COMPLETE': {'PREPARED', 'AWAITING_OFFHOST_VERIFICATION'},
      'AWAITING_OFFHOST_VERIFICATION': {'APPLYING_TOPOLOGY'},
      'APPLYING_TOPOLOGY': {'AWAITING_OFFHOST_VERIFICATION', 'INTERNAL_VERIFIED'},
      'INTERNAL_VERIFIED': {'AWAITING_DNS'},
      'AWAITING_DNS': {'APPLYING_TLS'},
      'APPLYING_TLS': {'AWAITING_DNS', 'PUBLIC_READY'},
      'PUBLIC_READY': {'PUBLIC_FAILED'},
  }
  ```

  Inject interruption before and after every durable mutation. Repeating the same plan must resume; a different plan hash, changed candidate, changed topology, changed backup request, or missing canonical receipt must fail before another effect. Each operational failure records a redacted `lastError`, performs its fixed compensation, and transitions to the listed safe checkpoint: installation to `NEW`, backup to `PREPARED` with WordPress writes resumed, topology to `AWAITING_OFFHOST_VERIFICATION`, and TLS to `AWAITING_DNS`. `PUBLIC_FAILED` is reserved for a validated Gate C failure receipt.

- [ ] **Step 2: Run phase tests and record RED**

  Run: `python -m unittest tests.production.test_adoption_state tests.production.test_adoption_apply_backup -v`

  Expected: FAIL because adoption journal and phase-A orchestration are absent.

- [ ] **Step 3: Implement root journal and provisional baseline enrollment**

  Persist `/opt/tio2-production/state/adoption.json` with exclusive, root-private, atomic writes. Phase A recomputes Task 1 Plan, obtains the existing global release lock, invokes `install_bootstrap`, copies the observed Compose to `/etc/tio2-production/legacy-compose.snapshot.yml`, and writes a v2 enrollment describing the exact legacy DB/WP containers and volumes. Enrollment must validate against live Docker before it becomes `baseline.json`. All code, plugin and migration bytes are staged in this first transfer; no later content upload is required.

- [ ] **Step 4: Reuse prepare and canonical backup**

  Use the fixed incoming release package from the plan, invoke `prepare_release`, create one persisted UUID backup request, and call `backup_release` with the inherited lock descriptor. Require `writesResumed=true` and `autoRestoreEligible=false`; write the sanitized phase-A receipt to `/home/deploy/tio2-outgoing/adoption-phase-a.json` beside the encrypted backup. Phase A must not create the frontend network, change WordPress, write Nginx, or build an image.

- [ ] **Step 5: Write failing local controller tests**

  Test strict SSH pinning, exact `siteId/host/planHash/candidate/backupId`, ciphertext mismatch, replacement of `.part`, invalid age identity, incomplete restore, duplicate evidence, changed RunRoot connection, and additional upload filenames. Assert that `Recover` calls the existing recovery container and produces:

  ```json
  {
    "schemaVersion":"tio2-adoption-evidence-v1",
    "siteId":"tio2-my",
    "planHash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "offHost":{"verified":true,"sha256":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},
    "decryption":{"verified":true,"evidenceSha256":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},
    "restore":{"verified":true,"evidenceSha256":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}
  }
  ```

- [ ] **Step 6: Implement fixed Stage/Recover/Status orchestration**

  `Stage` calls `New-ProductionPackage` using the sealed Gate A receipt, calls `build_admin_bundle.py` for one exact tool commit, creates a deterministic administrator tar plus SHA-256 manifest, and uploads only those two administrator artifacts plus the three existing release files. It creates or reuses `.production/private/tio2-backup.agekey` through the fixed local recovery image, keeps the identity file local with owner-only permissions, and uploads only `backup.age.pub`. `Recover` downloads the exact phase-A receipt and ciphertext, performs hash verification and `client_recovery.py`, writes `adoption-evidence.json` by exclusive create, then uploads only that file. `Status` reads daily `status`, downloads a fixed adoption receipt when present, and after validated v3 enrollment creates `.production/production-connection.json` pinned to that baseline. `ReportGateCFailure` reads only the fixed Gate C evidence names beneath the pinned RunRoot, creates one bounded redacted failure receipt, and uploads only that file. All run identity is pinned in `connection.json`.

- [ ] **Step 7: Run GREEN, full backup regression, and commit**

  Run:

  ```powershell
  python -m unittest tests.production.test_adoption_state tests.production.test_adoption_apply_backup tests.production.test_backup_core tests.production.test_backup_action tests.production.test_backup_canonical -v
  npx vitest run tests/infrastructure/production-adoption-controller.test.ts tests/infrastructure/production-controller.test.ts
  ```

  Expected: all tests PASS; failure injection proves phase A never changes runtime topology and the same plan/request resumes to the same backup identity.

  Commit: `feat(production): add recoverable adoption backup phase`

---

### Task 3: Implement Apply Phase B, Initial Frontend, and Internal Nginx

**Files:**
- Create: `ops/production/server/adoption_wordpress.py`
- Create: `ops/production/server/adoption_nginx.py`
- Create: `ops/production/nginx/tio2malaysia.internal.conf.template`
- Create: `tests/production/test_adoption_wordpress.py`
- Create: `tests/production/test_adoption_nginx.py`
- Create: `tests/production/test_adoption_apply_topology.py`
- Modify: `ops/production/server/adoption_apply.py`
- Modify: `ops/production/server/deployment_core.py`
- Modify: `ops/production/server/release_baseline.py`
- Modify: `ops/production/nginx/tio2malaysia.conf.template`
- Modify: `ops/production/.env.example`
- Rename: `ops/production/docker-compose.yml` to `ops/production/docker-compose.full-takeover.reference.yml`
- Modify: `ops/production/build_admin_bundle.py`
- Modify: `ops/production/server/bootstrap_install.py`

**Interfaces:**
- Consumes Task 2 `AWAITING_OFFHOST_VERIFICATION` journal and validated `tio2-adoption-evidence-v1`.
- Produces: `snapshot_wordpress(container_id: str) -> WordPressSnapshot`, `attach_frontend(snapshot, network_id) -> str`, `restore_wordpress(snapshot) -> str`.
- Produces: `NginxAdoption.stage(upstream_port: int)`, `activate()`, and `restore()` using fixed files only.
- Produces: `DockerWebAdapter.build_initial(record, candidate) -> dict` returning a fully validated v3 baseline with one active web container on port 3000.
- Produces second-call Apply state `AWAITING_DNS`, an internally verified v3 `baseline.json`, and the HTTP 503/ACME entry required before the DNS change.

- [ ] **Step 1: Write failing WordPress topology tests**

  Test the no-recreation case, callback-mismatch recreation, exact env/bind/volume/port/restart/label replay, frontend alias `wordpress`, DB exclusion from frontend, one writable WP container, name collision, unexpected mount, callback secret preservation, create/start failure, health failure, and exact restoration of the old container. The fake Docker runner must reject every argv outside the fixed create/connect/disconnect/start/stop/rename/remove/inspect set.

- [ ] **Step 2: Write failing Nginx and initial-web tests**

  Test a loopback-only `listen 127.0.0.1:8081`, exact host header forwarding, fixed include path, existing CMS server block preservation, staged `nginx -t`, reload failure rollback, port collision, candidate Build ID mismatch, public binding, extra web mounts, wrong network, DB on frontend, and more than one `web` alias.

- [ ] **Step 3: Run topology tests and record RED**

  Run: `python -m unittest tests.production.test_adoption_wordpress tests.production.test_adoption_nginx tests.production.test_adoption_apply_topology -v`

  Expected: FAIL because phase-B components and internal template do not exist.

- [ ] **Step 4: Implement controlled WordPress attachment/recreation**

  Capture an immutable snapshot before effects. After the off-host recovery evidence is accepted, run every seed in the production migration manifest in its fixed order and verify the resulting 56-record approved content fingerprint. If initialization or verification fails, restore the database and WordPress files from the phase-A backup before continuing. Then create a fixed `tio2-production-frontend` bridge, connect WordPress as alias `wordpress`, and leave DB detached. If callback values differ, stop and rename the old WordPress container, create the replacement from the snapshot with only the two fixed Malaysia callback URL changes, start and health-check it, then remove the old container only after v3 enrollment succeeds. On failure remove the replacement, restore the original name/networks and start the original.

  Validate the root-private production environment against a fixed field set. In addition to the current example, require `TIO2_MY_RFQ_ATTRIBUTION_SECRET` and a valid `TIO2_MY_SAMPLE_RECEIVER_BINDING` whose `site_scope` is `tio2-my`, whose private recipient is nonempty, and whose `key_sha256` matches the approved Web3Forms key. When this file is absent during first Apply, read only these named values from `/dev/tty` without echo and create it mode0600; never accept an environment path or value on argv/stdin, and never print the values.

- [ ] **Step 5: Implement the initial native ARM64 web build**

  Refactor the existing adapter so normal A/B releases keep their interface while adoption can call one explicit initial method. Enforce native `aarch64`, BuildKit/buildx, 4 GiB available memory, 12 GiB free disk, one-hour timeout, no Swap creation, fixed Dockerfile, fixed build arguments, secret mount, tmpfs cache and low process/I/O priority. Start only port 3000 with no mounts on the frontend network; assign alias `web` only after candidate health succeeds.

- [ ] **Step 6: Implement internal Nginx activation and v3 enrollment**

  Generate `web-upstream.conf` for port 3000 and the release header. Stage the `8081` listener plus the HTTP-only apex/`www` server that serves only `/.well-known/acme-challenge/` and returns503 elsewhere; require `nginx -t`; atomically install and reload. First perform a three-route health probe for `/`, `/about/`, and `/markets/`, then verify all 58 release-surface objects with their exact expected status and scan all internal links through `127.0.0.1:8081` using Host `tio2malaysia.com`; issue no external POST. Build the v3 record from observed container/image/network/volume/config identities, install it via `baseline.enrollment.json`, call the existing independent baseline validator, keep port3001 empty, and transition the adoption journal to `AWAITING_DNS` only after the full Gate B suite passes.

- [ ] **Step 7: Remove the executable full-takeover Compose path**

  Rename the repository file to an explicit reference name, update package inventory and docs, and add tests proving Plan/Apply and daily release never run `docker compose`. The enrolled `configuration.compose` must point to the root-protected observed legacy snapshot, not the repository reference.

- [ ] **Step 8: Run GREEN, deployment regression, and commit**

  Run:

  ```powershell
  python -m unittest tests.production.test_adoption_wordpress tests.production.test_adoption_nginx tests.production.test_adoption_apply_topology tests.production.test_deployment_core tests.production.test_release_baseline -v
  python -m unittest discover -s tests/production -p 'test_*.py' -q
  ```

  Expected: all tests PASS; existing update/rollback behavior remains unchanged; no test permits database, volume or content migration.

  Commit: `feat(production): adopt legacy cms into frontend topology`

---

### Task 4: Complete Public Verification, Real E2E Contracts, and Full Rehearsal

**Files:**
- Create: `ops/production/server/public_verification.py`
- Create: `ops/production/server/adoption_tls.py`
- Create: `tests/production/test_public_verification.py`
- Create: `tests/production-runtime/adoption_runtime.py`
- Create: `tests/e2e/production-live-surface.spec.ts`
- Create: `tests/e2e/production-live-forms.spec.ts`
- Create: `tests/fixtures/production/playwright.live.config.ts`
- Create: `scripts/production/Confirm-ProductionInbox.ps1`
- Create: `scripts/production/Seal-ProductionReceipt.ps1`
- Create: `tests/infrastructure/production-final-receipt.test.ts`
- Modify: `ops/production/server/deployment_core.py`
- Modify: `ops/production/server/release_actions.py`
- Modify: `scripts/production/Production.Core.psm1`
- Modify: `scripts/production.ps1`
- Modify: `scripts/production-adoption.ps1`
- Modify: `ops/production/server/adoption_apply.py`
- Modify: `package.json`
- Modify: `docs/production-deployment.md`
- Modify: `docs/software-architecture.md`

**Interfaces:**
- Consumes the v3 active baseline and `ops/production/release-surface.json` with exactly 58 objects.
- Produces third-call `Adoption.apply(plan_hash)` state `PUBLIC_READY` after fixed DNS/TLS activation.
- Produces: `verify_public(record, expected_ip='129.146.68.82') -> dict[str, object]` with DNS, TLS, redirect, CMS isolation and 58 GET results.
- Produces local `production-surface.json`, `production-live-forms.json`, `production-inbox.json`, and final `tio2-production-release-receipt-v1`.
- Produces a fixed, redacted `production-gate-c-failure.json` when any Gate C check fails; a root retry of the same Apply validates this evidence and restores the apex HTTP503 configuration while preserving CMS.
- `deploy` ends at `INTERNAL_VERIFIED`; the fixed `verify` action advances to `PUBLIC_VERIFIED` only after server-side public verification.

- [ ] **Step 1: Write failing third-Apply DNS/TLS tests**

  Cover apex or `www` not resolving exclusively to `129.146.68.82`, challenge failure, wrong adoption phase, changed plan/baseline/Nginx bytes, Certbot nonzero exit, wrong SAN, expired certificate, `nginx -t` failure, reload failure, interrupted issuance and repeat invocation. Assert the helper runs only the fixed Certbot webroot command for `tio2malaysia.com` and `www.tio2malaysia.com`; failure restores HTTP503/ACME while leaving the CMS server block active.

- [ ] **Step 2: Implement and verify third-Apply TLS activation**

  `adoption_tls.py` must validate DNS and the existing challenge path, call fixed Certbot webroot issuance, validate the resulting certificate, stage the exact HTTPS template, run `nginx -t`, reload, probe apex/`www`/CMS, and transition the adoption journal `AWAITING_DNS -> APPLYING_TLS -> PUBLIC_READY`. The enrolled daily-release state remains `INTERNAL_VERIFIED` until fixed `verify` completes server-side Gate C. Certbot, certificate, Nginx or probe failure restores HTTP503/ACME and returns the adoption journal to `AWAITING_DNS`. Repeating the same Apply at `PUBLIC_READY` returns the same receipt without another certificate request.

- [ ] **Step 3: Write failing server public-verification tests**

  Use local HTTP/TLS fixtures to cover apex A-record mismatch, missing SAN, expired/untrusted certificate, `www` wrong redirect, CMS wrong upstream/release header, non-loopback slot, changed Build ID, wrong release header, one of 58 statuses wrong, redirect accepted as 200, duplicate surface object/path, and all 58 exact results. Assert only GET/HEAD are issued.

- [ ] **Step 4: Run server tests and record RED**

  Run: `python -m unittest tests.production.test_public_verification -v`

  Expected: FAIL because `public_verification.py` is absent and current verify checks only three internal routes.

- [ ] **Step 5: Implement server-side PUBLIC_VERIFIED semantics**

  Load the exact surface from the active managed release and compare its hash to the prepared proof. Resolve apex and `www` to `129.146.68.82`; validate TLS chain, SANs and time; require `www` 301 to the apex path; verify the expected status for all 58 objects; require the active release header on apex responses and its absence on CMS responses. Keep form submission out of this action. Store only status, normalized host/path, certificate fingerprint, release identity and timestamps.

- [ ] **Step 6: Write failing 174-case and real-form contract tests**

  The live surface test must parameterize the checked-in 58 objects and three viewports:

  ```ts
  for (const width of [1440, 768, 390]) {
    for (const object of surface.objects) {
      test(`${object.id} @ ${width}`, async ({page}) => {
        const response = await page.goto(new URL(object.path, baseURL).toString())
        expect(response?.status()).toBe(object.expectedStatus)
      })
    }
  }
  ```

  Extend each case with site/release identity, canonical/robots/Schema, navigation targets, images, cookie/menu keyboard flow, visible focus and horizontal overflow checks. Tests must fail if any non-GET write occurs. In a separate suite, require exactly one provider POST each for RFQ, Sample and Documents, unique synthetic request tokens, HTTP 200, `success=true`, and the matching Thank You route; redact payloads and secrets from trace/output.

- [ ] **Step 7: Implement final receipt sealing**

  `Confirm-ProductionInbox.ps1` accepts only the fixed production live-form result beneath the pinned RunRoot and records one yes/no plus UTC receipt time for each of its three unique request tokens. `Seal-ProductionReceipt.ps1` accepts only the exact public-verify receipt, 174-case result, three-form result, and three inbox confirmations for one commit/Build ID/CMS fingerprint/active baseline/backup. The output contract includes `state='PRODUCTION_VERIFIED'`, counts `58/3/174`, three `RECEIVED` workflows, DNS/TLS fingerprints, backup ID and all evidence hashes. It excludes recipient address, key, buyer fields, response bodies and mailbox content.

  If the public path suite, live-form suite, or inbox confirmation fails, `production-adoption.ps1` must write and upload one bounded `production-gate-c-failure.json` containing only plan hash, active baseline hash, commit, failed check IDs and evidence hashes. A root retry of `apply PLAN_SHA256` accepts it only in `PUBLIC_READY`, restores the exact HTTP503/ACME configuration, validates CMS continuity, and records `PUBLIC_FAILED`. It never restores the database or accepts a caller-selected Nginx file.

- [ ] **Step 8: Build a real isolated legacy-to-v3 rehearsal**

  `adoption_runtime.py --isolated` must create its own labelled MariaDB/WordPress volumes, legacy Compose-equivalent containers, a separate host-MariaDB fixture, Nginx process, age identity, release A, and fixed ports allocated by the harness. Run Plan twice, phase A, encrypted download/decrypt/restore, phase B, internal verify, simulated DNS/TLS public verify, release B, rollback A, and repeat release B. Inject SIGKILL after each journaled phase and verify deterministic recovery and complete labelled-resource cleanup. It must refuse non-test Docker contexts and never accept production paths.

- [ ] **Step 9: Run focused GREEN and the full local regression**

  Run:

  ```powershell
  python -m unittest tests.production.test_public_verification -v
  npx vitest run tests/infrastructure/production-final-receipt.test.ts tests/infrastructure/production-controller.test.ts tests/infrastructure/production-adoption-controller.test.ts
  python -m unittest discover -s tests/production -p 'test_*.py' -q
  npx vitest run tests/infrastructure/production-package.test.ts tests/infrastructure/production-contracts.test.ts
  ```

  Expected: all tests PASS. Do not run the real Web3Forms live suite during development; fixture tests prove its write-count and evidence contract.

- [ ] **Step 10: Run Linux/Docker and browser rehearsals**

  Run:

  ```powershell
  python tests/production-runtime/adoption_runtime.py --isolated
  python tests/production-runtime/run_release_rehearsal.py --isolated
  npx playwright test --config=tests/fixtures/production/playwright.fixture.config.ts
  ```

  Expected: adoption A, update B, rollback A and repeat B pass; 58×3 unique browser cases pass in the controlled fixture; no real provider request is sent. Record that native production ARM64, real DNS/TLS and real inbox remain for the execution plan.

- [ ] **Step 11: Update docs, self-review, independent review, and commit**

  Update the operator guide and architecture with actual implemented behavior, fixed commands, two durable phases through three normal Apply invocations, `8081`, state meanings, evidence files, content blocker and failure recovery. Run `git diff --check`, verify every changed Markdown link, scan for private values, confirm root `AGENTS.md` unchanged, and request independent whole-branch review.

  Commit: `feat(production): complete adoption verification workflow`

## Plan Completion Gate

The development branch is complete only when all four task commits have their focused RED/GREEN evidence, the full Python/Vitest/Linux/Docker/browser regression passes, whole-branch review has no unresolved findings, and the docs identify native ARM64 and real production actions as unperformed. Use `superpowers:verification-before-completion` before claiming completion and `superpowers:finishing-a-development-branch` before integrating into `develop`.
