# D16 Local Prerelease Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a persistent, isolated, Docker-based local prerelease environment for the complete `tio2-my` site, bound to a clean local `main` commit and equipped with ordinary no-submit tests plus an explicit real-form delivery test.

**Architecture:** A fixed Compose project runs MariaDB, WordPress, WP-CLI/bootstrap, a one-shot Node builder and a Next.js production runner on a private network. A PowerShell controller freezes clean `main` with `git archive`, owns lifecycle and identity records, and exposes only `127.0.0.1:3100` and `127.0.0.1:8180`. Prerelease form metadata is added inside the three existing receiver contracts without changing normal production payloads.

**Tech Stack:** PowerShell 7/Windows PowerShell, Docker Compose, MariaDB 11.4, WordPress PHP 8.3, WP-CLI, Node 24.16, Next.js 16.3.2, TypeScript, Vitest 4, Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-09-08-local-prerelease-environment-design.md`

## Global Constraints

- Initial site scope is exactly `tio2-my`; reject cross-site fallback.
- Accept only a clean local `main` commit for an authoritative prerelease run.
- Bind website to `127.0.0.1:3100`, WordPress to `127.0.0.1:8180`, and expose no MariaDB host port.
- Use Compose project `d16-tio2-my-prerelease` with independent database, WordPress and cache volumes.
- Keep the entire site `noindex, nofollow`.
- Preserve CMS data on Stop; ResetData may delete only prerelease-owned volumes.
- Ordinary Start/Test actions make no form submissions and no external POSTs.
- `TestLiveForms` is explicit and submits one marked RFQ, Sample and Documents request through the approved real receiver.
- Never print or commit database, WordPress, revalidation, preview or Web3Forms credentials.
- Do not run `verify:root-only`; do not deploy, publish, push, write production WordPress, change DNS or authorize Gate 10.
- Execute tasks sequentially in this session; do not dispatch parallel implementation agents.

---

### Task 1: Define the isolated Compose and configuration contract

**Files:**
- Create: `ops/prerelease/docker-compose.yml`
- Create: `ops/prerelease/.env.example`
- Create: `ops/prerelease/seed-manifest.json`
- Modify: `.gitignore`
- Test: `tests/infrastructure/prerelease-compose.test.ts`

**Interfaces:**
- Consumes: Docker Compose interpolation and current files below `wordpress/plugins/tio2-site-model` and `wordpress/seed`.
- Produces: services `db`, `wordpress`, `wpcli`, `builder`, `web`; volumes `prerelease_db`, `prerelease_wp`, `prerelease_npm_cache`; exact loopback ports; a deterministic seed list.

- [ ] **Step 1: Write the failing Compose contract test**

Create a Vitest suite using `yaml.parse` that expects the five exact services, database with no `ports`, WordPress port `127.0.0.1:8180:80`, web port `127.0.0.1:3100:3000`, health checks, private dependencies, read-only plugin/seed mounts, `SITE_ID=tio2-my`, `WORDPRESS_GRAPHQL_URL=http://wordpress/graphql`, project-owned volumes and no literal credential values.

```ts
const compose = parse(readFileSync('ops/prerelease/docker-compose.yml', 'utf8'))
expect(Object.keys(compose.services)).toEqual(['db', 'wordpress', 'wpcli', 'builder', 'web'])
expect(compose.services.db).not.toHaveProperty('ports')
expect(compose.services.wordpress.ports).toEqual(['127.0.0.1:8180:80'])
expect(compose.services.web.ports).toEqual(['127.0.0.1:3100:3000'])
expect(compose.services.web.environment).toMatchObject({SITE_ID: 'tio2-my'})
```

- [ ] **Step 2: Run the test and confirm the missing-contract failure**

Run: `npx vitest run tests/infrastructure/prerelease-compose.test.ts`

Expected: FAIL because `ops/prerelease/docker-compose.yml` does not exist.

- [ ] **Step 3: Add configuration and evidence ignore rules**

Add these repository rules:

```gitignore
.prerelease/
docs/verification/prerelease/runs/
!ops/prerelease/.env.example
```

The example file declares names with non-secret placeholder values: database credentials, WordPress admin credentials, `NEXTJS_REVALIDATION_SECRET_TIO2_MY`, `NEXTJS_PREVIEW_SECRET_TIO2_MY`, `NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY`, and `PRERELEASE_LIVE_FORMS_ENABLED=false`. Actual configuration remains `.env.prerelease.local` at repository root and is already covered by `.env.*`.

- [ ] **Step 4: Implement the Compose stack**

Use pinned major/minor images `mariadb:11.4`, `wordpress:php8.3-apache`, `wordpress:cli-php8.3`, and `node:24.16-bookworm-slim`. Define health checks with MariaDB ping, WordPress HTTP, and web HTTP. Mount `${PRERELEASE_SOURCE_DIR}` into builder/web, `${PRERELEASE_RUN_DIR}` for state, and only the dedicated named volumes for CMS persistence/cache.

- [ ] **Step 5: Create the deterministic seed manifest**

List every current `wordpress/seed/apply-tio2-my-*.php` file in lexical order with a `schemaVersion`, `siteScope: "tio2-my"`, and a committed SHA-256 for each entry. Exclude Site A scripts, export/audit scripts, route retirement scripts and unscoped `apply-seed.php`.

- [ ] **Step 6: Run the contract test and Compose parser**

Run:

```powershell
npx vitest run tests/infrastructure/prerelease-compose.test.ts
docker compose --project-name d16-tio2-my-prerelease --env-file ops/prerelease/.env.example -f ops/prerelease/docker-compose.yml config --quiet
```

Expected: test PASS and Compose exit 0 without printing resolved secrets.

- [ ] **Step 7: Commit the configuration contract**

```powershell
git add .gitignore ops/prerelease tests/infrastructure/prerelease-compose.test.ts
git commit -m "feat(prerelease): define isolated Docker stack"
```

---

### Task 2: Add source preflight, locking and safe lifecycle control

**Files:**
- Create: `scripts/prerelease/Prerelease.Core.psm1`
- Create: `scripts/prerelease.ps1`
- Test: `tests/infrastructure/prerelease-controller.test.ts`

**Interfaces:**
- Consumes: action name, repository root, Git executable, Docker executable, `.env.prerelease.local`.
- Produces: `Invoke-PrereleaseAction -Action <Start|Status|Stop|ResetData|Test|TestLiveForms>`; JSON `-Plan` and `-Status` outputs; `.prerelease/operation.lock`.

- [ ] **Step 1: Write failing controller plan and source-safety tests**

Invoke the PowerShell entry point from Vitest and assert:

```ts
expect(plan).toMatchObject({
  composeProject: 'd16-tio2-my-prerelease',
  siteId: 'tio2-my',
  website: 'http://127.0.0.1:3100',
  wordpress: 'http://127.0.0.1:8180',
  acceptedBranch: 'main',
})
expect(plan.actions).toEqual(['Start', 'Status', 'Stop', 'ResetData', 'Test', 'TestLiveForms'])
```

Use a temporary Git repository to prove Start preflight rejects a non-main branch and dirty tracked or untracked files before invoking Docker. Add a fake-command seam through `-DockerExecutable` so the tests never touch the real Docker daemon.

- [ ] **Step 2: Run the tests and confirm the entry point is missing**

Run: `npx vitest run tests/infrastructure/prerelease-controller.test.ts`

Expected: FAIL because `scripts/prerelease.ps1` is absent.

- [ ] **Step 3: Implement pure preflight and identity helpers**

Export these functions from `Prerelease.Core.psm1`:

```powershell
Get-PrereleasePlan
Get-PrereleaseGitIdentity -RepositoryRoot <path>
Assert-PrereleaseSource -GitIdentity <object>
Enter-PrereleaseLock -StateRoot <path>
Exit-PrereleaseLock -Lock <object>
Assert-PrereleasePorts -Ports @(3100,8180)
Invoke-PrereleaseDocker -Arguments <string[]> -DockerExecutable <path>
```

`Get-PrereleaseGitIdentity` returns `branch`, `commit`, `shortCommit`, and the exact porcelain entries. `Assert-PrereleaseSource` accepts only branch `main` with zero entries. The lock uses an exclusive file handle and stores PID/start time without terminating other processes.

- [ ] **Step 4: Implement the CLI dispatch shell**

Use one validated `Action` parameter and switches `-Plan`, `-Json`, plus injectable repository/state paths for tests. `Stop` and `Status` may run when the source branch is not main; Start, ResetData, Test and TestLiveForms enforce the recorded identity appropriate to their action.

- [ ] **Step 5: Implement safe Stop and ResetData guards**

Stop calls only:

```text
docker compose --project-name d16-tio2-my-prerelease ... stop
```

ResetData first checks that the stack is stopped, resolves Compose volumes from `docker compose config --volumes`, asserts each resolved name starts with `d16-tio2-my-prerelease_`, and passes those exact names back to Docker without filesystem deletion or cross-shell path composition.

- [ ] **Step 6: Run controller tests**

Run: `npx vitest run tests/infrastructure/prerelease-controller.test.ts`

Expected: plan, dirty-tree, wrong-branch, lock, stop-identity and reset-volume tests PASS without contacting Docker.

- [ ] **Step 7: Commit lifecycle control**

```powershell
git add scripts/prerelease.ps1 scripts/prerelease/Prerelease.Core.psm1 tests/infrastructure/prerelease-controller.test.ts
git commit -m "feat(prerelease): add safe lifecycle controller"
```

---

### Task 3: Bootstrap deterministic WordPress data and CMS identity

**Files:**
- Create: `ops/prerelease/bootstrap-wordpress.sh`
- Create: `ops/prerelease/collect-cms-identity.sh`
- Create: `wordpress/bootstrap/validate-prerelease-site.php`
- Modify: `scripts/prerelease/Prerelease.Core.psm1`
- Test: `tests/infrastructure/prerelease-wordpress.test.ts`

**Interfaces:**
- Consumes: persistent `prerelease_db`/`prerelease_wp`, environment credentials, frozen seed manifest and source snapshot.
- Produces: installed CMS, applied seed state, `/run-state/cms-identity.json` with no secrets.

- [ ] **Step 1: Write failing bootstrap and seed-integrity tests**

Test that the shell script installs WordPress at `http://127.0.0.1:8180`, skips email, activates the required plugins, creates `site_scope=tio2-my`, verifies every seed hash before `wp eval-file`, and ends by invoking `validate-prerelease-site.php` and `collect-cms-identity.sh`. Test that a modified seed hash causes a nonzero dry-run result before any seed execution.

- [ ] **Step 2: Run the test and confirm the scripts are absent**

Run: `npx vitest run tests/infrastructure/prerelease-wordpress.test.ts`

Expected: FAIL on missing bootstrap files.

- [ ] **Step 3: Implement idempotent bootstrap**

Wait for `wp db check`, run `wp core install` only when necessary, ensure the configured administrator, install/activate `wp-graphql`, `advanced-custom-fields`, `wordpress-seo`, `wpgraphql-acf`, `add-wpgraphql-seo`, activate `tio2-site-model`, create the `tio2-my` term, set `/%postname%/`, verify the seed manifest hashes, and execute each manifest entry once per matching hash. Record applied hashes in a non-public WordPress option so normal restart can validate instead of reseeding.

- [ ] **Step 4: Implement scope and record validation**

`validate-prerelease-site.php` fails unless `tio2-my` exists and every seeded Page ID resolves to exactly one published/draft record with the expected `site_scope`. It outputs counts as JSON and never prints content bodies, email addresses or credentials.

- [ ] **Step 5: Implement CMS identity collection**

Write JSON containing WordPress version, active plugin names/versions, seed manifest SHA-256, ordered seed hashes, `tio2-my` counts and initialization timestamp. Store it at `/run-state/cms-identity.json`.

- [ ] **Step 6: Run tests and a disposable Compose bootstrap**

Run:

```powershell
npx vitest run tests/infrastructure/prerelease-wordpress.test.ts
docker compose --project-name d16-tio2-my-prerelease-contract --env-file ops/prerelease/.env.example -f ops/prerelease/docker-compose.yml config --quiet
```

Expected: tests PASS. The disposable project is configuration-only and creates no persistent production/prerelease volumes.

- [ ] **Step 7: Commit CMS bootstrap**

```powershell
git add ops/prerelease wordpress/bootstrap/validate-prerelease-site.php scripts/prerelease/Prerelease.Core.psm1 tests/infrastructure/prerelease-wordpress.test.ts
git commit -m "feat(prerelease): bootstrap isolated tio2-my CMS"
```

---

### Task 4: Freeze main, build Next.js and bind runtime identity

**Files:**
- Modify: `ops/prerelease/docker-compose.yml`
- Modify: `scripts/prerelease/Prerelease.Core.psm1`
- Modify: `scripts/prerelease.ps1`
- Test: `tests/infrastructure/prerelease-runtime-identity.test.ts`

**Interfaces:**
- Consumes: clean-main Git identity, healthy CMS identity, `.prerelease/runs/<run-id>`.
- Produces: immutable source archive, Next Build ID, `run-manifest.json`, `current-run.json`, HEALTHY/UNHEALTHY/STALE_MAIN status.

- [ ] **Step 1: Write failing archive and status tests**

Use temporary Git repositories and fake Docker/HTTP adapters to verify that Start executes `git archive <full-commit>`, hashes the archive, creates `<UTC>-<shortCommit>` run IDs, records the Next Build ID, and refuses HEALTHY when the live Build marker, site marker, CMS identity or saved commit differs. Verify that moving local main changes Status to `STALE_MAIN` without stopping the recorded runtime.

- [ ] **Step 2: Run the tests and confirm runtime identity is incomplete**

Run: `npx vitest run tests/infrastructure/prerelease-runtime-identity.test.ts`

Expected: FAIL on missing archive/Manifest/status behavior.

- [ ] **Step 3: Implement frozen-source creation**

Create `.prerelease/runs/<run-id>/source` exclusively from `git archive --format=tar <commit>`, hash the tar before extraction, and never copy the mutable checkout. Write a provisional Manifest with state `STARTING` and failed stage tracking.

- [ ] **Step 4: Implement containerized build and web start**

Start db/wordpress, run wpcli bootstrap, then run builder with `SITE_ID=tio2-my`, `NEXT_DIST_DIR=.next-prerelease`, `WORDPRESS_GRAPHQL_URL=http://wordpress/graphql`, `NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3100`, release/indexing disabled and the configured receiver variables. Run web from the same frozen source/build using `next start --hostname 0.0.0.0 --port 3000`; only Compose publishes it to loopback.

- [ ] **Step 5: Implement Manifest finalization and Status**

Read `.next-prerelease/BUILD_ID`, Docker image IDs, CMS identity and HTTP markers. Finalize HEALTHY only after two GET-only rounds pass for `/`, `/request-a-quote/`, `/request-sample/`, `/request-documents/`, `/privacy-policy/` and `/graphql`. Status emits no environment values and compares the running state to `current-run.json`.

- [ ] **Step 6: Run the runtime identity tests**

Run: `npx vitest run tests/infrastructure/prerelease-runtime-identity.test.ts`

Expected: PASS for matching, mismatch, unhealthy and stale-main cases.

- [ ] **Step 7: Commit build/runtime identity**

```powershell
git add ops/prerelease/docker-compose.yml scripts/prerelease.ps1 scripts/prerelease/Prerelease.Core.psm1 tests/infrastructure/prerelease-runtime-identity.test.ts
git commit -m "feat(prerelease): bind runtime to clean main"
```

---

### Task 5: Add prerelease identity to all three form payloads

**Files:**
- Create: `lib/forms/submission-environment.ts`
- Modify: `lib/rfq/malaysia-rfq-receiver.ts`
- Modify: `lib/request-sample/malaysia-request-sample-receiver.ts`
- Modify: `lib/request-documents/malaysia-request-documents-receiver.ts`
- Modify: the three corresponding client form components to pass the environment flag
- Test: `tests/unit/forms/submission-environment.test.ts`
- Test: `tests/unit/rfq/malaysia-rfq-receiver.test.ts`
- Test: `tests/unit/request-sample/malaysia-request-sample-receiver.test.ts`
- Test: `tests/unit/request-documents/malaysia-request-documents-receiver.test.ts`

**Interfaces:**
- Consumes: public runtime flag `NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT`; existing RFQ request token, Sample idempotency key and Documents request token.
- Produces: optional `{environment: 'local-prerelease', test_run_id: string}` fields and `[LOCAL PRERELEASE]` subject prefix only in prerelease.

- [ ] **Step 1: Write failing payload isolation tests**

For each receiver, capture the request JSON with a fake fetcher. Assert normal mode has no `environment` or `test_run_id` and preserves the existing subject. Assert prerelease mode adds exact marker, uses that submission's existing unique token as `test_run_id`, prefixes the subject, and does not add recipient identity.

```ts
expect(prereleasePayload).toMatchObject({
  environment: 'local-prerelease',
  test_run_id: expect.stringMatching(/\S/u),
})
expect(prereleasePayload).not.toHaveProperty('recipient')
expect(normalPayload).not.toHaveProperty('environment')
```

- [ ] **Step 2: Run the four targeted suites and confirm marker failures**

Run:

```powershell
npx vitest run tests/unit/forms/submission-environment.test.ts tests/unit/rfq/malaysia-rfq-receiver.test.ts tests/unit/request-sample/malaysia-request-sample-receiver.test.ts tests/unit/request-documents/malaysia-request-documents-receiver.test.ts
```

Expected: new prerelease cases FAIL before implementation; existing cases remain PASS.

- [ ] **Step 3: Implement the exact environment helper**

Define:

```ts
export type SubmissionEnvironment = 'local-prerelease' | null
export function resolveSubmissionEnvironment(value: string | undefined): SubmissionEnvironment {
  return value === 'local-prerelease' ? value : null
}
export function submissionEnvironmentFields(environment: SubmissionEnvironment, token: string) {
  return environment ? {environment, test_run_id: token} as const : {}
}
```

Unknown values resolve to null rather than being forwarded.

- [ ] **Step 4: Extend receiver options and payloads**

Add optional `environment?: SubmissionEnvironment` to each receiver options interface, spread `submissionEnvironmentFields` after generating/receiving the existing token, and prefix only the prerelease subject. Keep endpoint, access-key, timeout, retry token, validation and result semantics unchanged.

- [ ] **Step 5: Pass the public environment from each client form**

Each form calls `resolveSubmissionEnvironment(process.env.NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT)` and passes the result to its receiver. Do not render it and do not add it to analytics or Schema.

- [ ] **Step 6: Run targeted receiver and type checks**

Run the four Vitest files above, then `npm run typecheck`.

Expected: all targeted tests and TypeScript PASS.

- [ ] **Step 7: Commit form environment isolation**

```powershell
git add lib/forms lib/rfq lib/request-sample lib/request-documents components/sites/tio2-my tests/unit
git commit -m "feat(forms): mark local prerelease submissions"
```

---

### Task 6: Add ordinary and explicit live-form prerelease tests

**Files:**
- Create: `tests/e2e/prerelease-smoke.spec.ts`
- Create: `tests/e2e/prerelease-live-forms.spec.ts`
- Modify: `scripts/prerelease.ps1`
- Modify: `scripts/prerelease/Prerelease.Core.psm1`
- Test: `tests/infrastructure/prerelease-test-actions.test.ts`

**Interfaces:**
- Consumes: HEALTHY `current-run.json`, `PRERELEASE_LIVE_FORMS_ENABLED`, site at port 3100.
- Produces: ignored `docs/verification/prerelease/runs/<test-run-id>/result.json`, screenshots, provider acknowledgement results and mailbox items marked pending.

- [ ] **Step 1: Write failing action-boundary tests**

Assert Test launches only `prerelease-smoke.spec.ts` with a network guard that aborts every non-GET request. Assert TestLiveForms refuses unless both the explicit action and `PRERELEASE_LIVE_FORMS_ENABLED=true` are present. Assert neither action logs the receiver key or email field values.

- [ ] **Step 2: Run action tests and confirm missing test runners**

Run: `npx vitest run tests/infrastructure/prerelease-test-actions.test.ts`

Expected: FAIL because the actions/specs are missing.

- [ ] **Step 3: Implement the ordinary smoke suite**

Use `TIO2_PRERELEASE_BASE_URL=http://127.0.0.1:3100`. Cover representative full-site routes, shared navigation, CMS-backed Page IDs, canonical/robots, Cookie Settings, RFQ/Sample/Documents availability, form validation without submit, keyboard flow, 1440/768/390 layouts, overflow and required native 200% zoom. Register a catch-all route that aborts and records any non-GET request; require the final list to be empty.

- [ ] **Step 4: Implement the explicit live-form suite**

Generate a command-level UUID. Submit one syntactically valid, clearly labeled test request through RFQ, Sample and Documents. Verify visible positive receipt only when Web3Forms returns explicit JSON success. Save workflow, command UUID, page request token/idempotency key, browser timestamp and provider result; omit contact values, payload bodies and access keys. Record `inboxConfirmed: false` and `mailboxCheck: "PENDING_MANUAL_CONFIRMATION"`.

- [ ] **Step 5: Implement action output and non-overwrite behavior**

Create a new evidence directory with `yyyyMMddTHHmmssZ-<uuid>` and fail if it exists. Store result JSON and selected screenshots. Ordinary Test records `externalPostCount: 0`. Live test records exactly three attempted workflows and does not claim inbox receipt.

- [ ] **Step 6: Run test-action and no-submit E2E tests**

Run:

```powershell
npx vitest run tests/infrastructure/prerelease-test-actions.test.ts
$env:TIO2_PRERELEASE_BASE_URL='http://127.0.0.1:3100'; npx playwright test tests/e2e/prerelease-smoke.spec.ts --workers=1
```

Expected: tests PASS against a HEALTHY prerelease runtime; ordinary E2E reports zero external POSTs. Do not run `prerelease-live-forms.spec.ts` during this step.

- [ ] **Step 7: Commit prerelease tests**

```powershell
git add scripts/prerelease.ps1 scripts/prerelease/Prerelease.Core.psm1 tests/e2e/prerelease-*.spec.ts tests/infrastructure/prerelease-test-actions.test.ts
git commit -m "test(prerelease): add smoke and explicit live form flows"
```

---

### Task 7: Expose commands, document operation and verify the integrated environment

**Files:**
- Modify: `package.json`
- Create: `docs/prerelease-environment.md`
- Modify: `docs/development-workflow.md`
- Modify: `docs/site-registry.md`
- Test: all targeted prerelease and receiver suites from Tasks 1–6

**Interfaces:**
- Consumes: completed controller, Compose stack and tests.
- Produces: six stable npm commands, operator documentation, exact local-main integration and first HEALTHY run receipt.

- [ ] **Step 1: Add the six package commands**

```json
"prerelease:start": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action Start",
"prerelease:status": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action Status -Json",
"prerelease:stop": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action Stop",
"prerelease:reset": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action ResetData",
"prerelease:test": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action Test",
"prerelease:test:forms-live": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prerelease.ps1 -Action TestLiveForms"
```

- [ ] **Step 2: Write operator documentation**

Document prerequisites, creating `.env.prerelease.local` from the example, Start/Status/Stop/Reset/Test/LiveForms, URLs, identity fields, persistence, stale-main meaning, log/evidence locations, manual mailbox confirmation, and recovery from port/config/CMS/build failures. State that live forms send three real external requests.

- [ ] **Step 3: Update D16 workflow and site registry**

Register local prerelease as the authoritative full-site local environment for `tio2-my` after local-main integration. Preserve the distinction among feature runtime, local prerelease, remote Preview and Production. State that prerelease health grants no Gate 9, Gate 10 or release authority.

- [ ] **Step 4: Run all targeted static and controller checks**

Run:

```powershell
npx vitest run tests/infrastructure/prerelease-compose.test.ts tests/infrastructure/prerelease-controller.test.ts tests/infrastructure/prerelease-wordpress.test.ts tests/infrastructure/prerelease-runtime-identity.test.ts tests/infrastructure/prerelease-test-actions.test.ts tests/unit/forms/submission-environment.test.ts tests/unit/rfq/malaysia-rfq-receiver.test.ts tests/unit/request-sample/malaysia-request-sample-receiver.test.ts tests/unit/request-documents/malaysia-request-documents-receiver.test.ts
npm run typecheck
npx eslint scripts tests/infrastructure tests/e2e/prerelease-*.spec.ts lib/forms lib/rfq/malaysia-rfq-receiver.ts lib/request-sample/malaysia-request-sample-receiver.ts lib/request-documents/malaysia-request-documents-receiver.ts
docker compose --project-name d16-tio2-my-prerelease --env-file ops/prerelease/.env.example -f ops/prerelease/docker-compose.yml config --quiet
```

Expected: all targeted checks PASS. Record intentional environment-gated live-form tests as not run.

- [ ] **Step 5: Commit the operator interface and documentation**

```powershell
git add package.json docs/prerelease-environment.md docs/development-workflow.md docs/site-registry.md
git commit -m "docs(prerelease): publish local environment workflow"
```

- [ ] **Step 6: Review and integrate the exact branch into local main**

Verify the feature worktree is clean and its commit is unchanged after tests. Recheck primary `main` is clean and no other integration task is `INTEGRATING`. Merge the exact `codex/local-prerelease-environment` HEAD into local `main` with a merge commit, record main before/after, and do not push.

- [ ] **Step 7: Create actual local configuration without exposing values**

Copy `ops/prerelease/.env.example` to `.env.prerelease.local`, replace generated local-only database/WordPress/revalidation/preview placeholders, and use the already approved receiver configuration available on this host. Validate required values without printing them.

- [ ] **Step 8: Start and validate the first authoritative prerelease run**

From clean local main run:

```powershell
npm run prerelease:start
npm run prerelease:status
npm run prerelease:test
```

Expected: status `HEALTHY`; website 3100 and WordPress 8180 available only on loopback; MariaDB has no host listener; Manifest matches main commit, Build, CMS identity and `tio2-my`; smoke passes with zero external POSTs.

- [ ] **Step 9: Leave live form delivery explicit**

Do not automatically run `npm run prerelease:test:forms-live`. Report that the command is ready, the exact three external requests it will create, and that provider acceptance and mailbox receipt must be recorded separately when the explicit live test is run.

- [ ] **Step 10: Record final state**

Return the integration commit, run ID, Build ID, CMS identity hash, service health, targeted test/E2E results, live-form status, URLs and final `git status`. Keep the prerelease stack running for user testing unless the user asks to stop it.
