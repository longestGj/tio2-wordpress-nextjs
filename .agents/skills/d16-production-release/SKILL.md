---
name: d16-production-release
description: Use when preparing, executing, verifying, closing, or rolling back a D16 website production release, including first adoption, fixed deploy-user operations, production E2E, live form acceptance, inbox confirmation, and release receipts.
---

# D16 Production Release

Use the repository's evidence-bound release protocol. A successful command or reachable page is one stage; completion requires the final acceptance receipt.

## Start

In `D:\16Wordpress_nextjs`, read the root `AGENTS.md`, `docs/site-registry.md`, `docs/development-workflow.md` section 7, and the target site's production runbook. Use the project-scoped `.codex/agents/d16-release-agent.toml` when delegating release execution; its absence on an older production `main` does not itself block status checks or a registered routine release.

Resolve the site, environment, exact `main` commit, authorization, and operation mode:

| Mode | Entry |
|---|---|
| Read-only diagnosis | `scripts/production.ps1 -Operation Status` |
| Routine release | `Package`, then `Release`, `Verify`, and final acceptance |
| Rollback | Fixed `Rollback` using the originating RunRoot |
| First adoption or root program upgrade | Separate adoption design and explicit production authorization |

Use the fixed `Status` result to determine whether the server is enrolled. A prose runbook may lag a just-completed adoption; resolve that discrepancy from the persisted server state and update the documentation on `develop`. Never infer an unregistered or registered server solely from a document banner.

## Enforce the three gates

1. **Candidate:** require clean `main` and a healthy prerelease receipt bound to the same site, commit, Build ID, CMS identity, and surface. Package into one immutable RunRoot.
2. **Deploy:** use the site's ignored connection file and deploy user's fixed controller. Preserve the same RunRoot across retries. Require encrypted backup, real decrypt/restore verification, deployment evidence, and server `PUBLIC_VERIFIED`. Routine release changes only the frontend; treat WordPress, database, seed, migration, Nginx, TLS, sudo, or root-program changes as separate work.
3. **Acceptance:** run the site's public E2E contract, authorized live forms, token-bound inbox confirmation, and `Seal-ProductionReceipt.ps1`. Announce completion only for `PRODUCTION_VERIFIED`.

Do not infer success from an SSH disconnect. Read persisted state through `Status`. Do not use ad-hoc remote shell or root to bypass a failed fixed action. If identities diverge, stop writes, report the exact stage, and use the defined retry or rollback path.

Keep private keys, access keys, receiver addresses, database credentials, mailbox content, and personal form values in ignored local or platform storage. Tracked receipts contain hashes, counts, statuses, and non-secret identities only.

Report production commit separately from later tooling commits on `develop`, so source control never falsely claims an undeployed `main` is live.
