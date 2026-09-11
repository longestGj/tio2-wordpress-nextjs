# Supported plugin recovery permission policy

The normal release actions never restore a database, rewrite CMS records, or change the enrolled plugin source permissions. Prepared source stays root-private (directories0700/files0600); running WordPress retains its original readable, read-only plugin bind.

A backup `release-state.json` may declare exactly this source mapping:

```json
{"archive":"release.tar.gz","source":"wordpress/plugins/tio2-site-model","destination":"/var/www/html/wp-content/plugins/tio2-site-model","readOnly":true,"permissionPolicy":"tio2-ro-plugin-root-v1"}
```

`permissionPolicy` is covered by the inventory/component hashes in the encrypted backup. This is the only supported overlay. Missing/unknown policies require administrator review; they are not silently inferred or patched into archived evidence.

During separately authorized restoration into an isolated or replacement environment:

1. Verify ciphertext, decryption, manifest/component hashes and archive safety before extraction. Extract the active source into a new root-owned tree; retain the private archive unchanged.
2. Call the installed Python recovery consumer `backup_core.restore_mapped_plugin_permissions(restored_source, inventory)` as the administrator. This is a library boundary for the recovery controller, not a new publisher-facing action. Neither `deploy` nor `rollback` invokes it.
3. The consumer refuses the recorded active source path, wrong mapping/policy, changed or extra source files, links/special entries, non-root or writable ancestors, and unknown plugin directories. It compares the full restored source against the archived active file hashes before any permission change.
4. Only the exact mapped plugin subtree is materialized as root:root directories0755/files0644. All plugin bytes, other restored source paths, configuration and original active source remain unchanged. The recovered WordPress container must bind this directory read-only at the fixed destination.
5. Verify PHP/WordPress plugin loading as UID33, original CMS content/media and database readback before attesting restoration. Permissions alone are not restore success.

The shared isolated consumer is `Rehearsal.recover_plugin_source()` in `tests/production-runtime/backup_restore.py`; Task3's real update/rollback fixture calls it for backups from A, rolled-back A and managed B. The routine only handles plugin filesystem permissions; database restoration has its own separately authorized workflow.

Task4 must preserve this declared policy and use the consumer (or implement an equivalent reviewed bounded consumer) when validating a restored backup. Do not recursively chmod the entire source tree or loosen root preparation/enrollment guards.
