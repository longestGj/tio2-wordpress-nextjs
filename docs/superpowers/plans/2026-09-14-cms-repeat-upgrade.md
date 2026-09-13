# CMS repeat upgrade implementation and local release verification

Authorized by the user: fix local installer, test the complete local publication chain, then perform the production release. Target website is tio2-my; business/content input remains frozen main eebfb029 and its 57-record prerelease export. Repair branch starts at c8866731 (same implementation as main, plus release evidence). Do not include ongoing develop business changes.

## Design

Extend the existing administrator transaction with an explicit `--upgrade-from` completed installation artifact hash. Resolve only inside the registered installation-state root. Initial installation keeps all current refusal checks. Upgrade accepts only the named completed installation, verifies its journal, old plugin inventory, sealed importer ownership/files/mounts and current resource identities, and binds them into the new immutable plan.

Reuse a maintenance rule only when its exact registered marker/upstream rule can be verified; active/foreign markers and altered layouts remain rejected. Keep the old importer stopped under a transaction-owned retained name during replacement. Journal before stop/rename and create the new importer under the configured name. Failed transactions restore old plugin/PHP/config/database and the exact old importer container; do not remove a foreign container. Successful transactions retain the old stopped importer and old snapshots as evidence, without offering historical database rollback.

Expose known non-secret ReleaseError reasons with action/stage, and keep unexpected errors generic. Old config receipt values must not silently substitute for current production state. Upgrade keeps content capability pending until compatible frontend completion and content finalization; this task's starting state is pending, not an already-active content runtime.

## Tasks and evidence

1. TDD maintenance reuse and error reporting. Preserve existing initial-install and injection/foreign-rule rejection tests. Add full exact-rule reuse and malformed/mismatched rule tests.
2. TDD repeat resource upgrade with the existing filesystem/Docker boundary fixture extended for multiple immutable container IDs. Cover success, create failure, stop/rename interruptions, foreign replacement, old receipt/hash drift and restore to first-install identity. Implement bounded previous-installation verification and journalled importer replacement.
3. Wire CLI/backend upgrade mode and current-state bindings. Verify initial installation remains compatible, plan/apply use the same prior installation, and wrong or incomplete prior state is rejected before effects.
4. Run real Docker WordPress/MariaDB resource rehearsal through first install, second update and second-update failure recovery. Extend full backend rehearsal to prove maintenance, shared DB backup/restore, enrollment and reopening together. Use task-owned resources only.
5. Exercise fixed frontend and content publishing locally against a production-shaped isolated runtime using the frozen main inputs. Verify packaging, backup, stage/activation, public verification, content enable/import/refresh, completion and failure recovery. Reuse actual prerelease mail evidence; do not send additional mail. A fixture frontend alone does not meet this step.
6. Independent review (required by project workflow/requesting-code-review skill), resolve findings, freeze tested tool hashes and document actual results/limits. Only then prepare production tool update/CMS upgrade plan and continue the already authorized publication using the user's root terminal where required.

Progress: implementation not started at plan creation. Earlier 26 tests passed but assert repeat rejection; they are baseline, not proof of the fix.
