# Content database window runtime

This is installed code, not an uploaded executable package. Production installation
is a separate authorized operation. No default maintenance, cache, or verification
hook is supplied: absent verified enrollment the content adapter remains unavailable.

`release.php` accepts one JSON package on stdin and the fixed action `validate`,
`export`, or `import` from `D16_CONTENT_ACTION`. It loads the installed WordPress
runtime at `/var/www/html/wp-load.php` and adjacent `registry.php`. The package has
exactly `schemaVersion: d16-content-package-v1`, `siteId`, ordered unique `records`
of `{pageId, content}`, `files: []`, and `contentSha256`. The digest covers UTF-8 JSON
records with recursively sorted object keys, compact separators, and unescaped
Unicode/slashes. No post IDs, metadata names, SQL, seed paths, PHP or shell actions
are accepted. Media additions/replacements remain unavailable.

The registry covers 26 existing MY metadata families. It discovers stable page IDs
from currently valid published records, including nested document identities;
duplicates, missing identities, foreign scopes and invalid existing contracts fail.
HOME-001 and APP-000 use technical write validation and independent version approval,
including pure-content array additions/removals within schema limits. The remaining
24 families keep the installed matcher and their existing validators. All existing
record validators run again before transaction commit. Direct metadata SQL avoids
per-record WordPress update hooks; one batch refresh follows commit. Existing
storage object ordering and nested empty objects are preserved independently of
canonical hashing.

For the two migrated pages, `validate` and `import` freshly read the selected
independent proof before authorizing the exact full stored JSON; `export` is read-only
and does not require a proof. `D16_CONTENT_APPROVAL_ID` is supplied only by the fixed
Python runtime from protected configuration, never package/receipt data. A PASSED
test receipt, packageId or `approved=true` grants no approval. The package remains
v1 with exactly the original keys. Approval digests are separate from the unchanged
legacy release digest: sorted valid Unicode keys, literal U+2028/U+2029, arrays in
order, integer-only exact 53-bit numbers, no duplicate keys or nonfinite values.
Python `approval_digest(raw_json)` and PHP `tio2_content_digest` share this domain;
neither function is approval authority. HOME's legacy footer must retain its exact
semantic value and presence; initial content cannot introduce one.

Registry explicitly loads approval/schema code from the installed
`WP_PLUGIN_DIR/tio2-site-model` path; standalone importer snapshots must contain that
plugin and its schema files. Both validation and importer runtimes require installed
constants `TIO2_CONTENT_APPROVAL_ROOT`, `TIO2_CONTENT_ENVIRONMENT_ID`, and nonroot integer
`TIO2_CONTENT_WRITER_UID`. Root and environment are not taken from request variables.
Proofs are `<root>/<approvalId>.json`, validated by the shared protected loader:
Linux POSIX root-owned regular files and all root-owned ancestors, no symlinks or
group/world write; unsupported permission checks fail closed. Root CLI alone does
not establish source trust. Registration records independent human approval provenance;
this adapter creates no business approval. Tests use disposable synthetic records only.

## Administrator enrollment prerequisites

The Python `ContentDockerRuntime.from_path(config_path, cms_state_directory)` reads
a root-owned non-writable config; every component of each installed hook executable
path must also be root-owned, non-writable and free of symlinks. Config keys are:

```json
{
  "schemaVersion": "d16-content-runtime-v1",
  "siteId": "tio2-my",
  "database": "wordpress",
  "dbContainer": "enrolled-db",
  "wordpressContainer": "enrolled-wp",
  "importerContainer": "enrolled-content-importer",
  "dbDefaultsFile": "/run/secrets/admin.cnf",
  "hooks": {
    "identity": ["/usr/local/libexec/d16-content-hook", "identity"],
    "enter": ["/usr/local/libexec/d16-content-hook", "enter"],
    "assert": ["/usr/local/libexec/d16-content-hook", "assert"],
    "leave": ["/usr/local/libexec/d16-content-hook", "leave"],
    "refresh": ["/usr/local/libexec/d16-content-hook", "refresh"],
    "verify": ["/usr/local/libexec/d16-content-hook", "verify"]
  }
}
```

Names are placeholders requiring actual enrollment. The database must have no
published ports, replication/cluster writers, roles, or non-root accounts with
SUPER/READ_ONLY ADMIN. Normal WordPress must actually connect as an unprivileged
account; the runtime checks both its configuration and `CURRENT_USER()`. All tables
in the shared WordPress database must use InnoDB. Root/host administrators remain
trusted and must not run competing privileged DB jobs during the release lock.

The exact runtime-v1 configuration above remains supported. It may additionally
contain `"approvalId": "registered-approval-id"`, matching
`[A-Za-z0-9][A-Za-z0-9_-]{0,95}`. A present empty/null/invalid ID is rejected. Absent
IDs refuse migrated validate/import operations while preserving other families and
read-only export. Each PHP invocation explicitly overrides inherited approval ID
environment variables (empty for export/absent configuration). This is source-code
support only: no production runtime, proof root, hooks or approval was installed.

The importer is a pre-enrolled dedicated container, with read-only root filesystem
and mounts, a sealed WordPress code snapshot separate from every application-writable
mount, the project plugin, and `/opt/d16-content/{release.php,registry.php}`. It must
connect using the private release administrator credential. Never expose that
credential to the HTTP WordPress container or load administrator PHP from its
writable uploads/plugins volume. Credential files are administrator secrets, not
package payload or receipt content. The current installer does not create this
container, its secret, or the site-specific hooks.

Hooks read a bounded JSON request on stdin and emit JSON with `ok: true` only after
verifying the real operation. `identity` returns `identity` with `frontendImageId`,
`buildId`, `configurationSha256`, and `cmsContractSha256`, derived from the actual
enrolled frontend/configuration/CMS code. `enter` creates an owner-bound target-site
maintenance gate and returns that identity. `assert` verifies the same gate and
identity; `leave` removes only this owner's gate. It must be possible to perform
internal authenticated reads while ordinary target-site traffic receives maintenance.
The global shared CMS write fence separately uses MariaDB read_only, disables the
event scheduler, and drains existing DB sessions before content export and backup.
An exclusively created owner-bound `zz-d16-content-fence.cnf` in the enrolled DB
container's `/etc/mysql/conf.d` retains read_only and scheduler suspension across
that container's restart. The runtime checks MariaDB loads the fixed settings,
retains the same container ID, and verifies the marker digest at every boundary.
Only that owner's marker is removed when opening the window. Administrator
replacement of the DB container during the global lock is unsupported; it cannot
be mistaken for the enrolled fenced database.

The importer independently checks the actual database/hostname; imports additionally
require `CURRENT_USER()` root, read_only=1, and suspended event scheduling. Inside
its owned REPEATABLE READ transaction it locks each target post, its complete
object_id relationship range and metadata range, then locates identities again and
compares the locked baseline to preflight. Approval is freshly reloaded after locks
and before commit using installed environment and system time. Every migrated
readback digest must equal its approved candidate; mixed batches commit together.
Scope/route conflicts, approval revocation or a baseline race reject the batch.
These row locks supplement the controller's global lock and drained-session fence;
competing privileged administrator jobs remain outside the enrolled runtime contract.
SQL updates invoke no per-record WordPress hooks. Batch refresh and public verification
stay in the existing engine after commit; failed import retains its recoverable window
and backup ownership.

`refresh` receives `siteId`, `owner`, `pageIds`, and `contentRelease` containing the
release ID and expected content hash (the old hash during recovery). It must perform
the signed batch `/api/revalidate` request and verify its acknowledgment, including
tags, paths and sitemap. `verify` receives the exact expected package and must read
the actual target using the maintained internal route: return `content`, `status`,
`seo`, `sitemap` all true and the actual normalized `contentSha256`. An acknowledgment
from the cache endpoint alone is not public content evidence. A hook cannot claim
success merely because its command exited zero.

## Recovery and evidence

The caller holds the existing global release lock. The shared CMS journal is
`content-window.json`; the runtime journal is `content-runtime-window.json` in the
same protected directory. Journal state and each external-effect intent are flushed
before effects. Full SQL backup contains the entire configured shared WordPress DB,
all scopes/tables/options, triggers, routines and events. It is generated by the
server, kept private, bound to this window, and checked by digest before import or
restore. It is not a website-specific backup or a backup of upload files.

Disconnects during backup/import/verification require recovery, not a new backup or
blind import replay. Interrupted restore keeps the write fence and maintenance gate;
retry restores the same full backup and compares the deterministic entire-DB dump
hash before public read verification. Failure during gate opening has uncertain
writer history and is deliberately not automatically restorable. Completed windows
never allow historical whole-DB rollback over later edits.

`python tests/production-runtime/content_rehearsal.py` creates UUID-named isolated
MariaDB and WordPress containers, two code/data volumes and one network, and cleans
up only those resources. It exercises a real production HOME contract validator,
application writer denial, target HTTP maintenance, normalized import and full-DB
restores across two scopes. Its HTTP endpoint is a WordPress test fixture; it does
not establish Next.js visual acceptance, production hook installation, or a real
production release. The test prints its actual checks and this limitation.

`python -m pytest tests/production/test_content_approval_binding.py` exercises actual
`release.php` against its own UUID-named WordPress/MariaDB resources, protected synthetic
proof mounts, negative approvals, mixed families, readback rollback, concurrent version
and identity mutation, SQL writer denial and target relationship range locking. The
Vitest `content-approved-import.test.ts` entry runs that same isolated suite. These
tests establish importer behavior, not sealed production enrollment, Next rendering,
or the later full-database recovery rehearsal.
