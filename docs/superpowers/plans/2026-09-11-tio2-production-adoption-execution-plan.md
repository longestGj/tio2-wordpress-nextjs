# TiO₂ Malaysia Production Adoption Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the verified TiO₂ Malaysia release tooling on `129.146.68.82`, preserve the existing CMS/data, publish the exact approved `main`, and produce a complete Gate A/B/C production receipt.

**Architecture:** The local controller seals and stages one exact release plus one exact administrator bundle. Root runs only the hash-bound adoption `plan` and resumable `apply`; the three normal Apply invocations establish backup recovery, internal frontend/ACME readiness, and public TLS readiness. The daily fixed protocol then verifies the public runtime, while local Playwright and mailbox confirmation complete Gate C.

**Tech Stack:** PowerShell 7.2+, OpenSSH/SCP with pinned Ed25519 host key, Python 3.12, Docker/BuildKit, age, WordPress/MariaDB, Nginx/Certbot, Next.js 16, Playwright.

**Spec:** [TiO₂ Malaysia production adoption design](../specs/2026-09-11-tio2-production-adoption-design.md)

**Tooling Plan:** [Production adoption tooling implementation plan](2026-09-11-tio2-production-adoption-tooling-plan.md)

## Global Constraints

- Begin only after the tooling plan has passed whole-branch review, merged to `develop`, completed required E2E, and been merged to `main` under the D16 workflow.
- Package and deploy one exact clean `main` commit. A change to `main`, prerelease Build ID, CMS identity, release archive, plan facts, server topology, DNS target, or administrator bundle invalidates downstream evidence.
- Use `deploy@129.146.68.82`, `C:\Users\longe\.ssh\d16_oracle_deploy_ed25519`, and `C:\Users\longe\.ssh\known_hosts`; require `BatchMode`, `IdentitiesOnly`, and strict host-key checking for every non-root connection.
- Root is used only for the verified administrator staging and `tio2_adopt.py plan/apply`. Do not grant deploy Docker membership, a general shell through sudo, or additional privileged actions.
- First adoption preserves WordPress, container MariaDB, both existing volumes, CMS port8080 and business data. A content mismatch stops this plan before Apply; it does not authorize seed or migration.
- Never print the host key, private SSH key, age identity, environment values, Web3Forms key, receiver address, form body, email body, or database credentials.
- Gate C includes the previously authorized three real production form submissions. A failed attempt is recorded and is not silently retried.
- Any nonzero command stops the current task. Resume only with the same RunRoot, plan hash, release identity and recorded journal.

## Evidence Locations

All local operational evidence is ignored by Git under:

```text
D:\16Wordpress_nextjs\.production\adoption-runs\$ReleaseId\
```

The controller sets `$ReleaseId` to the current UTC timestamp formatted as `yyyyMMddTHHmmssZ-`, followed by the first 12 characters of `$MainCommit`; it records the value in `connection.json` and returns the exact absolute `$RunRoot`. At final reporting it sets `$UtcDate = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-dd')` and writes the redacted record to `docs/verification/$UtcDate-tio2-production-adoption.md` plus the matching non-secret JSON receipt.

---

### Task 1: Integrate the Tooling and Complete Gate A on Exact Main

**Files:**
- Consume: `docs/superpowers/plans/2026-09-11-tio2-production-adoption-tooling-plan.md`
- Produce ignored: `.prerelease/runs/$PrereleaseRunId/run-manifest.json`
- Produce ignored: `docs/verification/prerelease/runs/$TestCommandId/result.json`
- Produce ignored: `docs/verification/prerelease/runs/$LiveFormsCommandId/result.json`
- Produce ignored: `docs/verification/prerelease/runs/$LiveFormsCommandId/inbox-confirmation.json`
- Produce ignored: `.production/gates/$MainCommit/prerelease-production-gate.json`

**Interfaces:**
- Consumes `scripts/prerelease.ps1` actions `Start`, `Test`, `TestLiveForms`.
- Consumes `scripts/prerelease/Confirm-PrereleaseInbox.ps1`.
- Produces `tio2-prerelease-production-gate-v1` bound to one commit/Build ID/CMS identity and counts 56/58/3/174.

- [ ] **Step 1: Finish and integrate the tooling branch through develop**

  Use `superpowers:finishing-a-development-branch`. Review the complete diff against the tooling plan, run its full verification commands, merge the approved task branch into `develop`, and record the resulting develop commit. Preserve a clean tree.

- [ ] **Step 2: Run develop integration E2E before advancing main**

  Execute the repository tests required by `docs/development-workflow.md` for this infrastructure change, including the isolated adoption runtime, existing release rehearsal, and controlled 58×3 Playwright suite. If any check fails, fix it on a new task branch from `develop`, repeat review, and rerun affected integration evidence.

- [ ] **Step 3: Advance main and bind the candidate identity**

  Merge the verified `develop` into `main` according to the agreed branch flow. Then run:

  ```powershell
  Set-Location 'D:\16Wordpress_nextjs'
  git status --short --branch
  $MainCommit = (git rev-parse main).Trim()
  $HeadCommit = (git rev-parse HEAD).Trim()
  if ($HeadCommit -cne $MainCommit -or (git branch --show-current).Trim() -cne 'main' -or (git status --porcelain)) { throw 'Exact clean main is required.' }
  $MainCommit
  ```

  Expected: branch `main`, empty porcelain output, and one 40-character lowercase commit.

- [ ] **Step 4: Build the exact local prerelease environment and run the 58-object suite**

  ```powershell
  pwsh -NoProfile -File scripts/prerelease.ps1 -Action Stop
  pwsh -NoProfile -File scripts/prerelease.ps1 -Action Start
  pwsh -NoProfile -File scripts/prerelease.ps1 -Action Status -Json
  $TestInvocation = pwsh -NoProfile -File scripts/prerelease.ps1 -Action Test | ConvertFrom-Json
  if ($TestInvocation.state -cne 'PASSED') { throw 'Prerelease Test did not pass.' }
  $PrereleaseRunId = [string]$TestInvocation.runId
  $TestCommandId = [string]$TestInvocation.evidenceId
  $TestReceiptPath = Join-Path $PWD "docs/verification/prerelease/runs/$TestCommandId/result.json"
  if (-not (Test-Path -LiteralPath $TestReceiptPath -PathType Leaf)) { throw 'Prerelease Test receipt is missing.' }
  ```

  Expected: the current run manifest reports the exact `$MainCommit`, 56 seeded/published records, and a healthy Build ID; Test reports all ten required checks passed, 58 registered objects, three widths, and zero external POSTs.

- [ ] **Step 5: Run the three authorized prerelease live forms and confirm inbox**

  ```powershell
  $LiveFormsInvocation = pwsh -NoProfile -File scripts/prerelease.ps1 -Action TestLiveForms | ConvertFrom-Json
  if ($LiveFormsInvocation.state -cne 'PASSED' -or $LiveFormsInvocation.runId -cne $PrereleaseRunId) { throw 'Prerelease live-form identity failed.' }
  $LiveFormsCommandId = [string]$LiveFormsInvocation.evidenceId
  $LiveFormsEvidenceRoot = Join-Path $PWD "docs/verification/prerelease/runs/$LiveFormsCommandId"
  $LiveFormsReceiptPath = Join-Path $LiveFormsEvidenceRoot 'result.json'
  if (-not (Test-Path -LiteralPath $LiveFormsReceiptPath -PathType Leaf)) { throw 'Prerelease live-form receipt is missing.' }
  ```

  Expected before continuing: RFQ, Sample and Documents each issue exactly one POST, receive HTTP200 with provider `accepted`, and reach the correct Thank You state. Locate that command's evidence directory from the returned JSON, then run:

  ```powershell
  pwsh -NoProfile -File scripts/prerelease/Confirm-PrereleaseInbox.ps1 -EvidenceRoot $LiveFormsEvidenceRoot
  ```

  Enter the actually observed yes/no and UTC receipt time for each unique request token. Any 400, ambiguous response, missing email or negative confirmation stops production work. Diagnose under `superpowers:systematic-debugging`; do not reuse the 2026-09-09 failed receipt.

- [ ] **Step 6: Seal Gate A and verify its identity**

  ```powershell
  $ProductionGatePath = Join-Path $PWD ".production/gates/$MainCommit/prerelease-production-gate.json"
  [System.IO.Directory]::CreateDirectory((Split-Path -Parent $ProductionGatePath)) | Out-Null
  pwsh -NoProfile -File scripts/prerelease/Seal-ProductionGate.ps1 `
    -TestReceiptPath $TestReceiptPath `
    -LiveFormsReceiptPath $LiveFormsReceiptPath `
    -InboxReceiptPath (Join-Path $LiveFormsEvidenceRoot 'inbox-confirmation.json') `
    -OutputPath $ProductionGatePath
  $Gate = Get-Content -LiteralPath $ProductionGatePath -Raw | ConvertFrom-Json
  if ($Gate.state -cne 'PASSED' -or $Gate.commit -cne $MainCommit -or $Gate.counts.browserCases -ne 174) { throw 'Gate A seal mismatch.' }
  ```

  Expected: one immutable Gate A receipt for the exact current main.

---

### Task 2: Stage the Exact Artifacts and Review the Root Plan

**Files:**
- Produce ignored: `.production/adoption-runs/$ReleaseId/release.tar.gz`
- Produce ignored: `.production/adoption-runs/$ReleaseId/release-manifest.json`
- Produce ignored: `.production/adoption-runs/$ReleaseId/release-proof.json`
- Produce ignored: `.production/adoption-runs/$ReleaseId/admin-bundle.tar.gz`
- Produce ignored: `.production/adoption-runs/$ReleaseId/admin-bundle.sha256.json`
- Produce ignored: `.production/private/tio2-backup.agekey`
- Read-only production output: adoption Plan JSON on the root terminal

**Interfaces:**
- Consumes local `production-adoption.ps1 -Operation Stage`.
- Produces an administrator bundle hash, exact release candidate tuple, backup public recipient, and root Plan hash.
- Root Plan performs no filesystem, Docker, Nginx, systemd, SQL or HTTP write.

- [ ] **Step 1: Create the pinned ignored connection config**

  Use the already pinned line in `C:\Users\longe\.ssh\known_hosts`; do not obtain a replacement with `ssh-keyscan`. Write `.production/adoption-connection.json` with `siteId=tio2-my`, host `129.146.68.82`, port22, username `deploy`, the dedicated identity file, the existing pinned Ed25519 host key, and the local Docker context used by the verified recovery rehearsal. Restrict the file to the current Windows user and validate it through `production-adoption.ps1 -Operation Status`.

- [ ] **Step 2: Stage the website, administrator bundle and backup public key**

  ```powershell
  $ToolCommit = (git rev-parse HEAD).Trim()
  $Stage = pwsh -NoProfile -File scripts/production-adoption.ps1 `
    -Operation Stage `
    -ConfigPath '.production/adoption-connection.json' `
    -PrereleaseReceiptPath $ProductionGatePath `
    -ToolRevision $ToolCommit | ConvertFrom-Json
  $RunRoot = [System.IO.Path]::GetFullPath([string]$Stage.runRoot)
  $ReleaseId = Split-Path -Leaf $RunRoot
  $ExpectedReleaseSuffix = '-' + $MainCommit.Substring(0, 12)
  if (-not $ReleaseId.EndsWith($ExpectedReleaseSuffix, [System.StringComparison]::Ordinal) -or -not (Test-Path -LiteralPath $RunRoot -PathType Container)) { throw 'Staged RunRoot identity failed.' }
  ```

  Expected: the command returns one absolute RunRoot and hashes for the exact release archive, manifest, proof, administrator archive/manifest and backup public key. It uploads only those fixed files into `/home/deploy/tio2-incoming/`.

- [ ] **Step 3: Move and verify the administrator staging as root**

  In the existing root SSH session, copy the two administrator artifacts from `/home/deploy/tio2-incoming/` into a newly created root-only staging directory, compare the archive hash to the value printed locally, safely extract it, set root ownership, remove group/world write bits, and run the bundle self-test. Do not run `install.sh` directly and do not add deploy to sudo or Docker groups.

- [ ] **Step 4: Run the read-only Plan twice and compare hashes**

  ```bash
  PLAN_ONE="$(python3 /root/tio2-adoption-staging/tio2_adopt.py plan)"
  PLAN_TWO="$(python3 /root/tio2-adoption-staging/tio2_adopt.py plan)"
  PLAN_HASH_ONE="$(printf '%s' "$PLAN_ONE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["planHash"])')"
  PLAN_HASH_TWO="$(printf '%s' "$PLAN_TWO" | python3 -c 'import json,sys; print(json.load(sys.stdin)["planHash"])')"
  test "$PLAN_HASH_ONE" = "$PLAN_HASH_TWO"
  printf '%s\n' "$PLAN_ONE"
  ```

  Expected: identical plan hashes and no production state change.

- [ ] **Step 5: Review every production fact before Apply**

  Confirm the Plan reports the exact current WordPress/DB container IDs and images, `wordpress_wp_data`, `wordpress_db_data`, CMS8080, existing plugin binding, current Compose path, frontend ports3000/3001, internal port8081, DB exclusion from frontend, and host MariaDB isolation. Confirm its candidate equals Gate A and its changes contain no seed, migration, database replacement, volume replacement, broad sudo or Docker permission.

  Require the content section to report exactly56 approved published business records with the expected site scope and hashes. If it reports sparse, missing, foreign, duplicate or changed content, stop this execution plan before Apply and create a separate data-migration design.

---

### Task 3: Run Apply Phase A and Prove Off-Host Recovery

**Files:**
- Production root: `/opt/tio2-production/state/adoption.json`
- Production root: `/opt/tio2-production/backups/releases/$BackupId/`
- Production deploy-readable: `/home/deploy/tio2-outgoing/adoption-phase-a.json`
- Produce ignored local: `$RunRoot/ciphertext.age`, `decryption.json`, `restore.json`, `adoption-evidence.json`

**Interfaces:**
- First root Apply ends at `AWAITING_OFFHOST_VERIFICATION`.
- Local Recover consumes the exact phase-A receipt and encrypted backup and uploads one `tio2-adoption-evidence-v1`.

- [ ] **Step 1: Invoke the first Apply with the reviewed hash**

  ```bash
  python3 /root/tio2-adoption-staging/tio2_adopt.py apply "$PLAN_HASH_ONE"
  ```

  Expected: fixed program installed; provisional legacy baseline validated; release prepared; server backup and isolated restore passed; WordPress writes resumed; encrypted artifact exported; state `AWAITING_OFFHOST_VERIFICATION`. CMS remains available at its original URL and no frontend network/container/Nginx site is created.

- [ ] **Step 2: Verify CMS continuity from the local machine**

  Check `https://cms.tio2malaysia.com/` and `/graphql` return the expected CMS identity and status. Then run:

  ```powershell
  $PhaseA = pwsh -NoProfile -File scripts/production-adoption.ps1 `
    -Operation Status `
    -ConfigPath '.production/adoption-connection.json' `
    -RunRoot $RunRoot | ConvertFrom-Json
  $BackupId = [string]$PhaseA.backupId
  if ($PhaseA.state -cne 'AWAITING_OFFHOST_VERIFICATION' -or [string]::IsNullOrWhiteSpace($BackupId)) { throw 'Phase A identity failed.' }
  ```

  Confirm the phase-A candidate, baseline and `$BackupId` equal the Plan. Do not proceed on a new container/volume/config identity.

- [ ] **Step 3: Download, decrypt and restore the backup locally**

  ```powershell
  pwsh -NoProfile -File scripts/production-adoption.ps1 `
    -Operation Recover `
    -ConfigPath '.production/adoption-connection.json' `
    -RunRoot $RunRoot
  ```

  Expected: ciphertext SHA matches; age decrypts; manifest and every component validate; isolated MariaDB table counts, WordPress file bytes, post counts and UID33 plugin load match; recovery resources are cleaned; `adoption-evidence.json` is uploaded.

- [ ] **Step 4: Re-run local Status and inspect immutable identities**

  Require the same plan hash, candidate, backup ID, ciphertext hash, manifest hash and writes-resumed state. A changed or missing value requires retrying with the same RunRoot; never delete the backup request or journal to start over.

---

### Task 4: Run Apply Phase B, Prepare ACME, and Activate TLS

**Files:**
- Production root: `/etc/tio2-production/production.env`
- Production root: `/etc/tio2-production/baseline.json`
- Production root: `/etc/tio2-production/web-upstream.conf`
- Production Nginx: fixed TiO₂ Malaysia internal/bootstrap/final site files
- DNS: apex and `www` A records for `129.146.68.82`

**Interfaces:**
- Second root Apply ends at `AWAITING_DNS` after Gate B and HTTP503/ACME readiness.
- Third root Apply ends at `PUBLIC_READY` after DNS/TLS/public routing activation.

- [ ] **Step 1: Invoke the second Apply**

  ```bash
  python3 /root/tio2-adoption-staging/tio2_adopt.py apply "$PLAN_HASH_ONE"
  ```

  If prompted for a missing root-private production field, enter only the requested named value through `/dev/tty`; input is hidden and never logged. Expected: frontend bridge created; DB excluded; WordPress connected or safely recreated; ARM64 image built at port3000; port3001 remains free; alias `wordpress`/`web` correct; internal `8081` Gate B passes; HTTP apex/`www` returns503 except ACME; v3 baseline validates; state `AWAITING_DNS`.

- [ ] **Step 2: Verify Gate B independently**

  Check the returned container, image, Build ID, baseline and content fingerprint against Plan/Gate A. Through fixed Status, require all 58 safe GET objects and internal links to pass against the production CMS/runtime, with no external POST. Confirm CMS HTTPS remains unchanged.

- [ ] **Step 3: Set the two authoritative DNS records**

  In the authoritative DNS control plane, set:

  ```text
  tio2malaysia.com.      A  129.146.68.82
  www.tio2malaysia.com.  A  129.146.68.82
  ```

  Keep the existing `cms.tio2malaysia.com` record unchanged. Do not add a wildcard record or point CMS at a frontend slot.

- [ ] **Step 4: Wait for authoritative and public resolution**

  ```powershell
  $Expected = '129.146.68.82'
  foreach ($Name in 'tio2malaysia.com','www.tio2malaysia.com') {
    $Addresses = @(Resolve-DnsName -Type A $Name -ErrorAction Stop | Where-Object Type -eq 'A' | Select-Object -ExpandProperty IPAddress -Unique)
    if ($Addresses.Count -ne 1 -or $Addresses[0] -cne $Expected) { throw "DNS is not exact for $Name" }
  }
  ```

  Expected: each name resolves to exactly the production IP. HTTP challenge requests reach the fixed ACME webroot; normal frontend requests still return503.

- [ ] **Step 5: Invoke the third Apply**

  ```bash
  python3 /root/tio2-adoption-staging/tio2_adopt.py apply "$PLAN_HASH_ONE"
  ```

  Expected: exact Plan/baseline/DNS reconfirmed; Certbot obtains a valid certificate with apex and `www` SANs; final Nginx syntax passes; apex HTTPS serves the active Build ID; `www` redirects to apex; CMS remains on8080; the adoption journal is `PUBLIC_READY` while the enrolled daily-release state remains `INTERNAL_VERIFIED` until fixed `verify`. A failed third Apply leaves HTTP503/ACME active and returns the adoption journal to `AWAITING_DNS`.

- [ ] **Step 6: Enroll the normal deploy connection after public readiness**

  ```powershell
  $PublicReady = pwsh -NoProfile -File scripts/production-adoption.ps1 `
    -Operation Status `
    -ConfigPath '.production/adoption-connection.json' `
    -RunRoot $RunRoot | ConvertFrom-Json
  if ($PublicReady.state -cne 'PUBLIC_READY' -or -not (Test-Path -LiteralPath '.production/production-connection.json' -PathType Leaf)) { throw 'Normal production connection was not enrolled.' }
  ```

  Expected: the generated ignored connection binds the same host, site, release and validated v3 baseline, so later daily actions cannot reuse the provisional legacy baseline.

---

### Task 5: Complete Gate C and Seal the Production Receipt

**Files:**
- Produce ignored: `$RunRoot/verify.json`
- Produce ignored: `$RunRoot/production-surface.json`
- Produce ignored: `$RunRoot/production-live-forms.json`
- Produce ignored: `$RunRoot/production-inbox.json`
- Produce ignored: `$RunRoot/production-release-receipt.json`
- Create after redaction: `docs/verification/$UtcDate-tio2-production-adoption.md`
- Create after redaction: `docs/verification/$UtcDate-tio2-production-adoption-receipt.json`

**Interfaces:**
- Daily fixed `verify` advances `INTERNAL_VERIFIED` to `PUBLIC_VERIFIED` after DNS/TLS and 58 safe GET checks.
- Local Playwright produces exactly174 surface cases and three separately authorized form attempts.
- Final sealer produces `tio2-production-release-receipt-v1` only when every identity and result matches.

- [ ] **Step 1: Run the fixed server public verification**

  ```powershell
  pwsh -NoProfile -File scripts/production.ps1 `
    -Operation Verify `
    -ConfigPath '.production/production-connection.json' `
    -RunRoot $RunRoot
  ```

  Expected: apex/`www` DNS, TLS, redirects, CMS isolation, release header, Build ID and all58 expected statuses pass; server state `PUBLIC_VERIFIED`; no form POST.

- [ ] **Step 2: Run the real-domain 174-case E2E suite**

  ```powershell
  $env:PRODUCTION_E2E_BASE_URL='https://tio2malaysia.com'
  $env:PRODUCTION_EXPECTED_COMMIT=$MainCommit
  $env:PRODUCTION_E2E_EVIDENCE_DIR=$RunRoot
  npx playwright test --config=tests/fixtures/production/playwright.live.config.ts tests/e2e/production-live-surface.spec.ts
  $SurfacePath = Join-Path $RunRoot 'production-surface.json'
  if (-not (Test-Path -LiteralPath $SurfacePath -PathType Leaf)) { throw 'Production surface evidence is missing.' }
  ```

  Expected: 56 business pages, Thank You and new404 pass at1440/768/390; total174 unique cases; no write request; canonical, robots, Schema, navigation, images, cookie/menu keyboard, focus and overflow checks pass.

- [ ] **Step 3: Run the three authorized production forms once**

  ```powershell
  npx playwright test --config=tests/fixtures/production/playwright.live.config.ts tests/e2e/production-live-forms.spec.ts
  $LiveFormsPath = Join-Path $RunRoot 'production-live-forms.json'
  if (-not (Test-Path -LiteralPath $LiveFormsPath -PathType Leaf)) { throw 'Production live-form evidence is missing.' }
  ```

  Expected: exactly one RFQ, one Sample and one Documents POST; each provider response is HTTP200 with `success=true`; each reaches its correct Thank You state. Preserve the three request tokens and redacted result.

- [ ] **Step 4: Confirm the three production inbox receipts**

  ```powershell
  pwsh -NoProfile -File scripts/production/Confirm-ProductionInbox.ps1 -RunRoot $RunRoot
  $ProductionInboxPath = Join-Path $RunRoot 'production-inbox.json'
  if (-not (Test-Path -LiteralPath $ProductionInboxPath -PathType Leaf)) { throw 'Production inbox evidence is missing.' }
  ```

  For each workflow/token, enter the actually observed yes/no and UTC received time. Continue only when all three are `RECEIVED`; do not repeat a failed or missing request under the same release receipt.

- [ ] **Step 5: Seal and verify the final production receipt**

  ```powershell
  pwsh -NoProfile -File scripts/production/Seal-ProductionReceipt.ps1 -RunRoot $RunRoot
  $Receipt = Get-Content -LiteralPath (Join-Path $RunRoot 'production-release-receipt.json') -Raw | ConvertFrom-Json
  if ($Receipt.state -cne 'PRODUCTION_VERIFIED' -or $Receipt.commit -cne $MainCommit -or $Receipt.counts.browserCases -ne 174) { throw 'Final production receipt mismatch.' }
  ```

  Expected: receipt binds commit, archive, manifest, proof, Plan, v3 baseline, backup, ciphertext, Build ID, CMS fingerprint, DNS/TLS,58 objects,174 cases, three provider acceptances and three inbox receipts without private values.

- [ ] **Step 6: Execute the defined first-launch failure path when needed**

  If Steps1–4 fail after TLS activation, run:

  ```powershell
  pwsh -NoProfile -File scripts/production-adoption.ps1 `
    -Operation ReportGateCFailure `
    -ConfigPath '.production/adoption-connection.json' `
    -RunRoot $RunRoot
  ```

  Then rerun the same root `apply "$PLAN_HASH_ONE"`. Require state `PUBLIC_FAILED`, apex HTTP503/ACME, and healthy CMS. Do not restore the database or edit Nginx manually.

- [ ] **Step 7: Write the redacted deployment verification record**

  Set `$UtcDate = [DateTimeOffset]::UtcNow.ToString('yyyy-MM-dd')`. Record the exact release/tool commits, Plan hash, backup ID, active image/Build ID, CMS fingerprint, DNS/TLS fingerprints, Gate A/B/C counts, form/inbox statuses, timestamps, rollback state and unresolved operational items in `docs/verification/$UtcDate-tio2-production-adoption.md` and `docs/verification/$UtcDate-tio2-production-adoption-receipt.json`. Validate Markdown links, run `git diff --check`, scan for keys/email/database credentials, and commit the redacted verification record on a documentation task branch from `develop`.

## Execution Completion Gate

Production adoption is complete only when the final receipt is `PRODUCTION_VERIFIED`, CMS remains healthy, the root and deploy privilege boundaries match the design, no private value appears in tracked evidence, and the final verification record is reviewed. A stopped content gate, `AWAITING_OFFHOST_VERIFICATION`, `AWAITING_DNS`, `PUBLIC_READY`, `PUBLIC_FAILED`, server-only `PUBLIC_VERIFIED`, failed form, or missing inbox receipt is an intermediate state and must be reported by its exact name.
