---
name: d16-production-release
description: Use when a separately authorized D16 website release must be prepared, verified, executed, recovered, rolled back, or closed.
---

# D16 Production Release

Use the repository's subject-scoped release protocol. This skill is project-level; do not copy or install it into a personal skills directory.

## Start from an independent instruction

Require an independent release instruction naming the subject, environment, allowed actions, and endpoint. A `MERGED_TO_DEVELOP` receipt is an input, not a trigger.

Read `AGENTS.md`, `docs/site-registry.md`, `docs/release-workflow.md`, `docs/release-architecture.md`, and the subject's runbook. Freeze the exact `develop` commit in an isolated worktree. Verify Git receipts against the actual diff, then run release-side integration E2E. Return code defects to Gate8 with a blocking receipt; do not edit business code in the release worktree.

Only after integration passes, merge that exact candidate to `main`, build an identity-bound prerelease from clean `main`, and validate it before packaging.

## Resolve `subject + action`

Classify the candidate from actual Git, content, and configuration differences. The package supplies `subject + releaseType`; the operator never overrides the type.

Read the adapter status in `docs/site-registry.md` before any write. Phase one installs only the verified `tio2-my/frontend-only` compatibility path. `content-only`, `combined`, `cms-platform`, and `host-infrastructure` are `not-installed`; their write actions stop with `capability-not-installed`.

The fixed actions are `status`, `prepare`, `backup`, `stage`, `activate`, `verify`, and `rollback`. Use `scripts/production.ps1` and the subject's ignored connection file. Never construct remote shell commands or pass paths and type overrides to the privileged entrypoint.

## Enforce the three gates

| Gate | Required evidence |
|---|---|
| Candidate | One subject/type, exact commit, Build, CMS/configuration identities, previous production receipt, prerelease receipt, and immutable hashes |
| Deploy | Same RunRoot and request through `status -> prepare -> backup -> stage -> activate -> verify`; encrypted backup, real decryption, isolated restore, and internal verification before activation |
| Acceptance | `PUBLIC_VERIFIED`, subject-specific business E2E, authorized live forms, inbox confirmation, and final evidence validated by the second `verify` |

Keep the same RunRoot after interruption. Query `status` rather than infer from an SSH disconnect. Stop all ordinary writes for identity drift, missing evidence, unavailable capability, or `RECOVERY_REQUIRED`.

`rollback` uses only the registered previous version and evidence for the same subject and transaction. Do not edit state, Docker, Nginx, sudoers, or protected programs by hand. Administrator installation, first adoption, and future Release Campaign execution require separate instructions.

Report hashes, states, counts, and non-secret identities. Keep keys, credentials, mailbox data, and personal form values out of Git. Announce completion only when the final receipt is `PRODUCTION_VERIFIED`.
