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
The installed content matcher allows only its explicit text paths. All existing
record validators run again before transaction commit. Direct metadata SQL avoids
per-record WordPress update hooks; one batch refresh follows commit. Existing
storage object ordering and nested empty objects are preserved independently of
canonical hashing.

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
