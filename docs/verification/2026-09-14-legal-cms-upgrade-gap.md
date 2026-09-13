# main legal CMS upgrade: bounded planning result

Status: `CMS_UPGRADE_CAPABILITY_REQUIRED`. This is a read-only planning result and development handoff, not a server-generated executable installation plan or installation authorization.

Subject: `tio2-my`, production CMS at cms.tio2malaysia.com; frontend target main `eebfb0299ab8d3a4de7241211be9b6b20b9ad090`. The user approved administrator read-only inventory and planning. Existing production deployment authorization remains valid for its original scope. No administrator installation, CMS changes, content activation or real external form submission has been authorized by the subsequent planning approval.

## Verified inputs

User-operated root SSH observation confirms program target `/opt/tio2-production/programs/upgrade-7c849af234602cf299cb75e772a0104f77b849cd`. All 59 regular program files match the historical bundle exactly; only `tool-commit.txt` differs from the main administrator bundle. No administrator program upgrade is needed merely to align that version label.

WordPress container: `wordpress-wordpress-1`; current plugin host source `/opt/tio2-cms/tio2-wordpress-nextjs/wordpress/plugins/tio2-site-model`, bind-mounted read-only at `/var/www/html/wp-content/plugins/tio2-site-model`. Database container `wordpress-db-1`; existing sealed importer `d16-my-content-importer`. The user provided both Docker mount output and the 113-file plugin hash inventory. This is user-provided live terminal evidence, not a direct agent execution.

Plugin attachment SHA-256: `43bfb345d330b71aa784aae5068bef6d14fb42e8ae1a0b101f144317024b4521`. Canonical observed inventory SHA-256: `62426e7a28fe083e053f344b70c51a10dd0aeff79bb67da88e1f5b484bed9889`, matching the previously observed fixed controller status. Main inventory: 115 files, canonical SHA-256 `6708f6e3421a62e6306cb1a5ba63db206a0a32b404cfec14815838785bd56195`.

| Plugin-relative path | Action | Current SHA-256 | Main SHA-256 |
|---|---|---|---|
| includes/legal-pages-v01.php | Replace | 8178b43b0f524bbf55853312bffc143a67a0469a31b683edb2e8d29092f00f76 | 5c507379580f4e4ed44b4c5cfe1b30c40eb054f5a20dd99de8e74c6cb29c8bb4 |
| includes/legal-pages-read-contract.php | Add | Absent | 1b68750fe61025da7a156c4eab6c2e0cd3cd8eb179cdd519ca51539afd0ae3cd |
| config/tio2-my-legal-read-contract.json | Add | Absent | 3f92fceb00443eba53c257754bfe29c2f1b2206964a1166471eb0c5f45390c97 |

All other 112 observed plugin files match main. No plugin files are removed. The main CMS review artifact is `.production/runs/20260914-main-eebfb029-preflight/cms-eebfb029.tar.gz`, SHA-256 `73a9a9a0c373499460bb928a65ab979df82bd542a082da31f9e2967b910ce2ed`. It has not been uploaded or installed. Parsed evidence is in `cms-plugin-observation.json` and `cms-plugin-observed-hashes.json` in the same ignored RunRoot.

## Why the installed planning path is not applicable

The exact installed `content_install_resources.py` hash matches main. Its `InstallationResources.snapshot()` explicitly rejects an existing configured importer with `initial installation refuses an existing importer`. `InstallationBackend.observe()` calls that snapshot to construct a plan. It also rejects already installed active content runtime and an existing maintenance gate. The existing importer is confirmed by the user's Docker output; other gate states need not be probed to establish that this is an initial-installation workflow, not an installed-plugin upgrade workflow.

The public controller continues to advertise cms-platform=false. The installed enrollment-repair entrypoint updates approved registration bindings; it does not install a new plugin payload. The program-upgrade entrypoint changes administrator program generations only and does not update WordPress. None of these can be used to hide the PHP update in a frontend-only transaction.

No installation CLI was invoked simply to reproduce its expected admission failure. No importer was stopped/removed, maintenance marker edited, registration changed, or permission check bypassed. No server executable installation plan hash was produced; fabricating one locally would not satisfy the release gate.

## Minimum development handoff before installation planning can finish

An implementation task must provide a bounded, administrator-only upgrade path for the already-installed MY plugin. It must consume exact immutable old/new plugin inventories above, inspect the existing installation/configuration and sealed importer, and generate a hash-bound plan before any runtime mutation. It must reject unrelated file changes, concurrent transactions, unknown installed resources and identity drift.

The implementation must preserve old plugin/configuration/importer identities and a validated same-transaction rollback path. It must resolve how the sealed importer and CMS/frontend enrollment remain consistent with the updated plugin, rather than merely copying three PHP/JSON files and editing hashes. Any shared database maintenance, backup or restore requirements must be explicit in the resulting plan. No content import/reset, content-capability activation, DNS/indexing, other-site changes or full-site decoupling is part of this bounded handoff.

Acceptance requires tests for an already-present importer, wrong old/new hashes, interrupted upgrade, same-transaction rollback and unchanged existing content/frontend; an independent review and a new exact tool artifact must precede administrator installation. The release worktree must not implement this missing capability as an incidental fix. Development does not authorize installation: return the concrete server plan, affected resources, backup and rollback identities for the final installation decision.

This handoff identifies required behavior; it does not claim a completed design, implemented upgrade adapter, tested rollback, or permission to develop beyond the current release scope. The remaining user decision is whether to authorize that minimal development task. No further generic root inventory requests are needed to identify the blocker.
