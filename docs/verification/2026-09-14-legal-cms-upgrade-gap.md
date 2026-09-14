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

## Correction after retrieving the previous actual CMS update receipt

The user correctly recalled a previous CMS plugin upgrade. Located the actual local copy of the server result at D:/16Wordpress_nextjs/.production/candidates/cms-permission-retry/server-result.json (SHA-256 c84ee7315e7c8062dd86f056611c05b113252829b709de13623971e3705b22e5), matching installation artifact 532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895. It records phase=completed, evidence.verified=true, plugin inventory changing from 111 to 113 files, readonly importer ID 0373a42fc27f23b74ba9a14489a329f4a18286806fc8c66f22ba63f45437af25, and contentCapabilityEnabled=false. Backup evidence includes database, databaseRestore and resources.

The earlier categorical wording that the program cannot upgrade CMS plugins was inaccurate: that installation transaction did upgrade existing plugin files and create the sealed importer. The specific current restriction is that the same initial-installation resource snapshot refuses an already-existing configured importer. This is evidence against blindly rerunning that entrypoint, not proof that every possible administrator upgrade path has been exhausted. Do not require new tool development solely on the previous overbroad claim. Continue tracing applicable historical execution/configuration before choosing the next production action. Existing scoped user upgrade authorization remains valid; no new production mutation occurred during this audit.

## Historical invocation recovered from the previous release task

Read prior task 00预发布与部署1, turn 01a099cb-0a51-7862-94a3-6a2e7237bff7. Its actual operator instruction invoked installed content_install_cli.py apply with --config /etc/tio2-production/cms-install.json, --archive /root/d16-cms-retry-8bd903de/cms-install.tar.gz, artifact 532a03aed459e3707d7b88a81d4cb5076f98e2a235a48e6ce1801b7507430895, plan bfcf48cd837b2a8a2df305cb2a13d58940b07acef674b58d2d5cd5f9efd206cc, and result /root/d16-cms-retry-8bd903de/result.json. The absent result from the recent *config*.json filename search was not evidence of missing configuration: cms-install.json does not match that pattern.

The historical success used the same initial resource-installation flow; its install method creates a named importer and binds independent execution files to the transaction. Repeated installation with the same existing importer name is rejected. A new importer generation would require an explicitly prepared configuration, retained prior resources, and verification of failure restoration and enrollment; it is only a candidate approach, not yet a validated production plan. No operator should delete the existing importer or override its ownership to make the old command run.

## Confirmed configuration and local repeat-install rejection tests

User returned the actual /etc/tio2-production/cms-install.json summary: site tio2-my; WordPress wordpress-wordpress-1; resources and runtime importer both d16-my-content-importer; pluginSource /opt/tio2-cms/tio2-wordpress-nextjs/wordpress/plugins/tio2-site-model; verificationPackageFile /etc/tio2-production/cms-install-verification.json exists; saved previousProductionReceipt b31f4dec2dd52a7d97dd1a8df793b10f0f83f2ee1fff4ff430539d731e92d66f. These are existing-installation inputs, not a fresh approved upgrade plan. The receipt is historical and must not be copied into a new plan as a freshly observed binding.

Actually ran `python -B -m unittest tests.production.test_content_install_resources tests.production.test_content_install_backend -v`: 26 tests, 1.290 seconds, OK. In particular test_plan_rejects_wrong_mount_and_existing_importer_without_writing_plugin and test_double_install_refuses_existing_gate confirm the current entrypoint's deliberate repeat-install refusals. These use local fixtures and are not a production upgrade rehearsal. The second gate means merely choosing a new importer name is not a validated workaround. No live Nginx content was read in this turn, so presence of that gate in production is not asserted from the local fixture.

Next required engineering work is a reviewed repeat-upgrade path covering already-enrolled importer identity, reuse of a verified maintenance guard, old/new sealed code and configuration preservation, current receipt binding, real backup and rollback validation, and continued consistency with frontend packaging. The existing initial-installation path must retain its refusal for unidentified resources. User upgrade authorization remains in effect, but no runnable new production plan or upgrade has been produced.

## Actual server plan attempt for main CMS artifact

Uploaded only the validated immutable main CMS archive to /home/deploy/tio2-incoming/cms-main-eebfb029-73a9a9a0.tar.gz using the enrolled deploy connection and pinned host key. User copied it into /root/d16-cms-main-eebfb029/cms.tar.gz, verified SHA-256 73a9a9a0c373499460bb928a65ab979df82bd542a082da31f9e2967b910ce2ed, and actually ran installed content_install_cli.py plan with /etc/tio2-production/cms-install.json. The CLI returned ok=false, error="administrator installation failed; inspect persisted status". The generic CLI response does not establish which underlying check failed. No apply was invoked.

Fresh fixed production Status after this result: ROLLED_BACK, recoveryRequired=false, sharedCmsWindowActive=false, content-only=false. The next diagnostic must expose the installed planning function's specific exception using the same archive/config and release lock without applying changes, printing secrets, changing configuration or removing checks. Do not label the server failure as existing-importer or maintenance-gate rejection until its actual cause is observed.
