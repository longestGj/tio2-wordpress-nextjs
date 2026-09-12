"""Subject-scoped release state and dispatch under a single global lock."""
from __future__ import annotations

import hashlib
import json
import re
from email import policy
from email.parser import BytesParser
from pathlib import Path
from types import MappingProxyType
from typing import Mapping
from uuid import uuid4

from candidate_contract import CandidateEnvelope, validate_payload
from release_adapter import ReleaseContext, SafeFrontendRollback, _CONTEXT_AUTHORITY
from release_contract import D16_ACTIONS, ReleaseError, _open_regular_read, sha256_file
from release_state import (COMPLETION_FILES, IDENTITY_FIELDS, STATE_SCHEMA, ReleaseLock, atomic_write_json,
                           read_state, redact, transition, validate_identity,
                           validate_completion_evidence, write_audit_receipt)
from subject_registry import SubjectRegistry, load_registry


def _freeze(value):
    if isinstance(value, Mapping):
        return MappingProxyType({key: _freeze(item) for key, item in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_freeze(item) for item in value)
    return value


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ReleaseError("duplicate receipt field")
        result[key] = value
    return result


class ReleaseController:
    def __init__(self, registry: SubjectRegistry, *, adapters=None, baseline_loader=None,
                 actor="root", lock_factory=ReleaseLock):
        self.registry = registry
        # Root-installed code supplies exact (adapter-id, release-type) pairs.
        # No dynamic import, uploaded module, default adapter or cross-site fallback.
        self.adapters = dict(adapters or {})
        self.baseline_loader = baseline_loader or self._load_baselines
        self.actor = actor
        self.lock_factory = lock_factory
        self.lock_path = registry.host.state_root.parent / "release.lock"

    @classmethod
    def system(cls, *, actor="root"):
        from site_frontend_adapter import SiteFrontendAdapter, load_live_baselines
        from installed_content import installed_adapters
        registry = load_registry(Path('/etc/d16-release'))
        adapter = SiteFrontendAdapter()
        adapters = {(name, "frontend-only"): adapter for name in
                    ("tio2-web-bluegreen-v1", "site-frontend-v1", "d16-site-frontend-v1")}
        adapters.update(installed_adapters(registry))
        return cls(registry, actor=actor, adapters=adapters,
                   baseline_loader=load_live_baselines)

    def _load_baselines(self, subject):
        # Installing an adapter alone must not turn root-owned declarations into
        # evidence of a fresh live baseline. Task 5 supplies the trusted runtime
        # validator; the controller then checks its subject/receipt/hash binding.
        raise ReleaseError("capability-not-installed")

    def execute(self, subject_id: str, action: str) -> dict[str, object]:
        if action not in D16_ACTIONS:
            raise ReleaseError("fixed action is required")
        self.registry.resolve(subject_id)
        with self.lock_factory(self.lock_path):
            return self._execute(subject_id, action)

    def _execute(self, subject_id, action):
        from site_content_adapter import SiteContentAdapter, SafeContentRollback
        subject = self.registry.resolve(subject_id)
        window = self._shared_content_window()
        if window is not None and action != 'status' and (
                window.get('siteId') != subject_id or action == 'prepare'):
            raise ReleaseError('shared CMS publication window is active')
        # These capabilities remain closed for phase one, even when a caller
        # accidentally supplies a matching adapter in the installed mapping.
        if action != "status" and subject.kind in {"host", "cms"}:
            raise ReleaseError("capability-not-installed")
        if action != "status" and not any(key[0] == subject.adapter for key in self.adapters):
            raise ReleaseError("capability-not-installed")
        state = read_state(subject.state_root)
        current = state["state"]
        if state.get("schemaVersion") == STATE_SCHEMA and current != "IDLE":
            details = state.get("details")
            if not isinstance(details, Mapping) or details.get("subject") != subject_id:
                raise ReleaseError("stored subject identity mismatch")
            validate_identity(details)
        journal = self._journal(subject)
        stage_proven = self._stage_proven(state)
        recovery = (current == "RECOVERY_REQUIRED" or self._transaction_conflicts(subject, state, journal)
                    or current == "STAGED" and not stage_proven)
        frontend_journal = subject.state_root / 'frontend-deployment.json'
        if frontend_journal.exists():
            from frontend_backup import read_record
            recovery = recovery or read_record(frontend_journal).get('phase') in {
                'switching', 'upstream-replaced', 'nginx-tested', 'nginx-reloaded', 'recovering', 'rolling-back'}
        if action == "status":
            release_capabilities = {kind:any(key == (subject.adapter,kind)
                and subject_id in getattr(adapter,'enrolled_subjects',{subject_id})
                for key,adapter in self.adapters.items()) for kind in
                ('frontend-only','content-only','combined','cms-platform','host-infrastructure')}
            result = {"ok": True, "action": action, "subject": subject_id, "state": state,
                           "sharedCmsWindowActive": window is not None,
                           "releaseCapabilities": release_capabilities,
                           "recoveryRequired": recovery,
                           "stageResumeAvailable": current == "STAGED" and stage_proven and not recovery,
                           "capabilities": {name: name == "status" or subject.kind == "site" and any(release_capabilities.values()) for name in sorted(D16_ACTIONS)}}
            terminal_path = self.registry.cms.state_root / 'content-window.json'
            if state.get('details', {}).get('releaseType') == 'content-only' and terminal_path.exists():
                with _open_regular_read(terminal_path) as source:
                    terminal = json.load(source, object_pairs_hook=_unique)
                if (terminal.get('siteId') == subject_id
                        and terminal.get('releaseId') == state['details']['releaseId']
                        and terminal.get('phase') in {'completed','rolled-back'}):
                    result['contentTerminalReconciliation'] = 'verify' if terminal['phase'] == 'completed' else 'rollback'
            compatibility = subject.state_root / 'compatibility-transaction.json'
            if compatibility.exists() and state.get('details', {}).get('releaseType') == 'frontend-only':
                from frontend_backup import read_record
                from cms_evidence import canonical
                transaction = read_record(compatibility)
                if hashlib.sha256(canonical(transaction)).hexdigest() != state['details'].get('transactionSha256'):
                    raise ReleaseError('compatibility transaction mismatch')
                result['compatibilityTransaction'] = transaction
            return redact(result)
        content = isinstance(self.adapters.get((subject.adapter, state.get('details', {}).get('releaseType'))), SiteContentAdapter)
        if content and action in {'verify','rollback'} and current in {
                'PREPARED','BACKED_UP','STAGED','INTERNAL_VERIFIED','ACTIVATED','RECOVERY_REQUIRED','FAILED'}:
            reconciled = self._reconcile_content_terminal(subject, action, state)
            if reconciled is not None:
                return reconciled
        content_recovery = (content and action == 'rollback' and window is not None
                            and window.get('siteId') == subject_id
                            and window.get('releaseId') == state.get('details', {}).get('releaseId'))
        if recovery and not content_recovery:
            raise ReleaseError("recovery-required")
        if current != "IDLE" and state.get("schemaVersion") != STATE_SCHEMA:
            raise ReleaseError("legacy state requires explicit migration")
        if action == "stage" and current in {"STAGED", "INTERNAL_VERIFIED"} and stage_proven:
            # The successful internal verification and its full identity were
            # fsynced together with STAGED. Re-entry only finishes that state
            # write; never rebuild/restage or reinterpret mutable incoming data.
            if current == 'INTERNAL_VERIFIED':
                from site_frontend_adapter import SiteFrontendAdapter
                if isinstance(self.adapters.get((subject.adapter, state['details']['releaseType'])), SiteFrontendAdapter):
                    context, _, adapter = self._context(subject, state)
                    adapter.validate_context(context)
                    adapter._restore(context, adapter._backup(context))
            after = (transition(subject.state_root, {"STAGED"}, "INTERNAL_VERIFIED", state["details"])
                     if current == "STAGED" else state)
            return self._receipt(subject, action, state, after)
        allowed = {"prepare": {"IDLE", "FAILED", "ROLLED_BACK", "COMPLETED"},
                   "backup": {"PREPARED"}, "stage": {"BACKED_UP"},
                   "activate": {"INTERNAL_VERIFIED"},
                   "verify": {"ACTIVATED", "PUBLIC_VERIFIED"},
                   "rollback": {"ACTIVATED", "PUBLIC_VERIFIED", "FAILED"}}
        if content_recovery:
            allowed['rollback'] |= {'PREPARED','BACKED_UP','STAGED','INTERNAL_VERIFIED','RECOVERY_REQUIRED'}
        from site_frontend_adapter import SiteFrontendAdapter
        from site_content_adapter import SiteContentAdapter, SafeContentRollback
        frontend = isinstance(self.adapters.get((subject.adapter, state.get('details', {}).get('releaseType'))), SiteFrontendAdapter)
        content = isinstance(self.adapters.get((subject.adapter, state.get('details', {}).get('releaseType'))), SiteContentAdapter)
        repeated = frontend and (action, current) in {
            ('prepare', 'PREPARED'), ('backup', 'BACKED_UP'), ('activate', 'ACTIVATED'), ('rollback', 'ROLLED_BACK'), ('verify', 'COMPLETED')}
        if frontend and action == 'prepare' and current in {'FAILED','ROLLED_BACK','COMPLETED'}:
            _, _, next_adapter = self._context(subject, state)
            if not isinstance(next_adapter, SiteContentAdapter):
                raise ReleaseError('compatibility transaction is terminal; a new candidate workflow is not installed')
            frontend, content = False, True
        repeated = repeated or content and action == 'verify' and current == 'COMPLETED'
        if current not in allowed[action] and not repeated:
            raise ReleaseError("unexpected release state")
        if action == "verify" and current in {"PUBLIC_VERIFIED", "COMPLETED"}:
            details = dict(state["details"])
            validate_identity(details)
            if details["subject"] != subject_id:
                raise ReleaseError("release identity changed")
            try:
                if frontend:
                    context, identity, adapter = self._context(subject, state)
                    adapter.validate_context(context)
                    adapter._restore(context, adapter._backup(context))
                if content:
                    context, _, adapter = self._context(subject, state)
                    details['completionEvidence'] = adapter.completed_evidence(context)
                    validate_completion_evidence(details)
                else:
                    details["completionEvidence"] = self._completion(subject, details)
            except Exception:
                self._receipt(subject, action, state, state, failure_stage="completion-evidence")
                raise
            after = transition(subject.state_root, {current}, "COMPLETED", details) if current != 'COMPLETED' else state
            return self._receipt(subject, action, state, after)
        try:
            context, identity, adapter = self._context(subject, state)
            if current != "IDLE":
                stored = state.get("details")
                if not isinstance(stored, Mapping):
                    raise ReleaseError("stored release identity is invalid")
                validate_identity(stored)
                if action != "prepare" and any(stored[key] != identity[key] for key in IDENTITY_FIELDS):
                    raise ReleaseError("release identity changed")
        except Exception:
            self._receipt(subject, action, state, state, failure_stage="validation")
            raise
        details = {**(state.get("details", {}) if action != "prepare" or repeated else {}), **identity}
        if action == "prepare" and journal is not None and not repeated:
            # Archive before publishing the next PREPARED state. If interrupted
            # here the old terminal state still agrees with the old RESULT. The
            # next state's hash reference is the only permission to retain an
            # earlier result until the next active-version intent replaces it.
            digest = self._transaction_digest(journal)
            archive = subject.state_root / "transaction-history" / (digest + ".json")
            if archive.exists() or archive.is_symlink():
                if sha256_file(archive) != digest:
                    raise ReleaseError("recovery-required")
            else:
                atomic_write_json(archive, journal)
            details["previousTransactionSha256"] = digest
        commit_action = action in {"activate", "rollback"}
        intent = {"schemaVersion": "d16-release-transaction-v1", "phase": "INTENT", "action": action,
                  "transactionId": uuid4().hex, "actor": self.actor, "beforeState": current, "identity": identity}
        if commit_action:
            atomic_write_json(context.transaction_path, redact(intent))
        try:
            result = getattr(adapter, action)(context)
            if not isinstance(result, Mapping) or result.get("ok") is not True:
                raise ReleaseError("adapter verification failed")
            details["actionEvidence"] = redact(dict(result))
            if isinstance(adapter, SiteContentAdapter):
                if 'contentEvidence' in result:
                    details['contentEvidence'] = result['contentEvidence']
            if "binding" in result:
                from frontend_backup import BINDING_FIELDS
                candidate_binding = result["binding"]
                if (not isinstance(candidate_binding, Mapping) or set(candidate_binding) != set(BINDING_FIELDS)
                        or any(candidate_binding.get(key) != identity[key] for key in IDENTITY_FIELDS)):
                    raise ReleaseError("adapter binding mismatch")
                details.update(candidate_binding)
                if action == "backup": details["frontendBackup"] = result["backup"]
                if action == "stage": details["frontendStage"] = result
            if action == "stage":
                if result.get("internalVerified") is not True:
                    raise ReleaseError("internal verification is required")
                details["stageVerification"] = {"schemaVersion": "d16-stage-verification-v1",
                                                "identity": identity, "internalVerified": True}
            target = {"prepare": "PREPARED", "backup": "BACKED_UP", "stage": "STAGED",
                      "activate": "ACTIVATED", "verify": "PUBLIC_VERIFIED", "rollback": "ROLLED_BACK"}[action]
            if content_recovery:
                if result.get('contentEvidence', {}).get('phase') != 'rolled-back':
                    raise ReleaseError('content recovery not verified')
                after = {'schemaVersion': STATE_SCHEMA, 'state': 'ROLLED_BACK', 'details': details}
                atomic_write_json(subject.state_root / 'state.json', after)
            elif repeated:
                after = {**state, 'details': details}
                atomic_write_json(subject.state_root / 'state.json', after)
            else:
                after = transition(subject.state_root, {current}, target, details)
            if action == "stage":
                after = transition(subject.state_root, {"STAGED"}, "INTERNAL_VERIFIED", details)
            if commit_action:
                atomic_write_json(context.transaction_path, redact({**intent, "phase": "RESULT", "afterState": after["state"], "ok": True}))
            return self._receipt(subject, action, state, after)
        except BaseException as error:
            if (not isinstance(error, Exception) and action == "stage"
                    and read_state(subject.state_root)["state"] == "STAGED"
                    and self._stage_proven(read_state(subject.state_root))):
                # Pure controller persistence after the verified slot proof was
                # fsynced cannot switch traffic. Preserve Task 3 safe re-entry.
                raise
            # An exception after entering a commit point cannot prove whether the
            # active version changed. Never retry it or guess that rollback worked.
            if isinstance(error, SafeContentRollback) and isinstance(adapter, SiteContentAdapter) and self._safe_content_recovery(error, adapter, context, details):
                # Only accept the engine's persisted owned window after a real
                # restore and verification, never exception text or a flag alone.
                details['contentEvidence'] = error.evidence
                after = {'schemaVersion': STATE_SCHEMA, 'state': 'ROLLED_BACK', 'details': details}
                atomic_write_json(subject.state_root / 'state.json', after)
                atomic_write_json(context.transaction_path, redact({**intent,'action':'rollback','phase':'RESULT','afterState':'ROLLED_BACK','ok':True}))
            elif isinstance(error, SafeFrontendRollback) and self._safe_recovery(error.evidence, details):
                details["safeRecovery"] = error.evidence
                after = {"schemaVersion": STATE_SCHEMA, "state": "ROLLED_BACK", "details": details}
                atomic_write_json(subject.state_root / "state.json", after)
                atomic_write_json(context.transaction_path, redact({**intent, "action": "rollback", "phase": "RESULT", "afterState": "ROLLED_BACK", "ok": True}))
            elif action == 'backup' and frontend:
                # This action only captures and encrypts frontend bytes. Its
                # durable request permits safe retry after process/transport loss.
                after = state
            elif commit_action or action in {'backup','stage','verify'} and content or action in {'stage','verify'} and frontend or not isinstance(error, Exception) or isinstance(error, SafeFrontendRollback):
                after = {"schemaVersion": STATE_SCHEMA, "state": "RECOVERY_REQUIRED", "details": details}
                atomic_write_json(subject.state_root / "state.json", after)
                atomic_write_json(context.transaction_path, redact({**intent, "phase": "RESULT", "afterState": "RECOVERY_REQUIRED", "ok": False}))
            else:
                actual = read_state(subject.state_root)["state"]
                if actual in {"PREPARED", "BACKED_UP", "STAGED", "INTERNAL_VERIFIED", "ACTIVATED"}:
                    details["failedFromState"] = actual
                    after = transition(subject.state_root, {actual}, "FAILED", details)
                else:
                    after = read_state(subject.state_root)
            self._receipt(subject, action, state, after, failure_stage="adapter-or-persistence")
            raise ReleaseError("release action failed") from error

    @staticmethod
    def _safe_recovery(evidence, details):
        from frontend_backup import BINDING_FIELDS
        if (not isinstance(evidence, Mapping) or set(evidence) != {"schemaVersion", "binding", "backup", "active", "publicVerified", "health", "cmsUnchanged"}
                or evidence.get("schemaVersion") != "d16-safe-frontend-rollback-v1"
                or evidence.get("binding") != {key: details.get(key) for key in BINDING_FIELDS}
                or evidence.get("backup") != details.get("frontendBackup") or not isinstance(details.get("frontendBackup"), Mapping)
                or evidence.get("active") != details["frontendBackup"].get("active")
                or evidence.get("publicVerified") is not True or evidence.get("cmsUnchanged") is not True):
            return False
        active, health = evidence.get("active"), evidence.get("health")
        return (isinstance(active, Mapping) and set(active) == {"commit", "sourceRoot", "buildId", "imageId", "containerId"}
                and all(isinstance(value, str) and value for value in active.values())
                and isinstance(health, Mapping) and health.get("proxy") is True
                and all(health.get(key) == active[key] for key in ("buildId", "imageId", "containerId")))

    def _shared_content_window(self):
        path = self.registry.cms.state_root / 'content-window.json'
        if not path.exists() and not path.is_symlink():
            return None
        with _open_regular_read(path) as source:
            value = json.load(source, object_pairs_hook=_unique)
        if not isinstance(value, dict) or value.get('schemaVersion') != 'd16-content-window-v1':
            raise ReleaseError('shared CMS publication window is invalid')
        return None if value.get('phase') in {'completed','rolled-back'} else value

    def _reconcile_content_terminal(self, subject, action, state):
        # A terminal engine record proves the publication window already closed.
        # Repair only controller bookkeeping; never import/restore after reopening.
        path = self.registry.cms.state_root / 'content-window.json'
        if not path.exists():
            return None
        with _open_regular_read(path) as source:
            window = json.load(source, object_pairs_hook=_unique)
        expected = 'completed' if action == 'verify' else 'rolled-back'
        if window.get('phase') != expected:
            return None
        context, identity, adapter = self._context(subject, state)
        details = dict(state['details'])
        if any(details.get(key) != identity[key] for key in IDENTITY_FIELDS):
            raise ReleaseError('content reconciliation identity changed')
        evidence = adapter.terminal_evidence(context, expected)
        saved = details.get('contentEvidence')
        if (evidence is None or saved is not None and
                evidence['backupReceiptSha256'] != saved.get('backupReceiptSha256')
                or saved is None and window.get('backup') is not None):
            raise ReleaseError('content terminal backup evidence mismatch')
        details['contentEvidence'] = evidence
        target = 'PUBLIC_VERIFIED' if action == 'verify' else 'ROLLED_BACK'
        after = {'schemaVersion':STATE_SCHEMA,'state':target,'details':details}
        atomic_write_json(context.transaction_path, {
            'schemaVersion':'d16-release-transaction-v1','phase':'RESULT',
            'action':'activate' if action == 'verify' else 'rollback',
            'transactionId':uuid4().hex,'actor':self.actor,'beforeState':state['state'],
            'identity':identity,'afterState':'ACTIVATED' if action == 'verify' else 'ROLLED_BACK','ok':True})
        atomic_write_json(subject.state_root/'state.json',after)
        return self._receipt(subject,action,state,after)

    @staticmethod
    def _safe_content_recovery(error, adapter, context, details):
        try:
            observed = adapter._window(context, adapter.engine_factory(context), adapter._package(context))
            return (observed.get('phase') == 'rolled-back'
                    and error.evidence == adapter._evidence(observed)
                    and error.evidence['backupReceiptSha256'] == details.get('contentEvidence', {}).get('backupReceiptSha256'))
        except Exception:
            return False

    @staticmethod
    def _transaction_digest(journal):
        return hashlib.sha256(json.dumps(journal, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()).hexdigest()

    def _transaction_conflicts(self, subject, state, journal):
        if journal is None:
            return state["state"] in {"ACTIVATED", "PUBLIC_VERIFIED", "COMPLETED", "ROLLED_BACK"}
        if journal.get("phase") != "RESULT" or journal.get("ok") is not True:
            return True
        details = state.get("details", {})
        current = state["state"]
        digest = self._transaction_digest(journal)
        if (current in {"PREPARED", "BACKED_UP", "STAGED", "INTERNAL_VERIFIED", "FAILED"}
                and details.get("previousTransactionSha256") == digest):
            try:
                return sha256_file(subject.state_root / "transaction-history" / (digest + ".json")) != digest
            except (OSError, ReleaseError):
                return True
        if journal["identity"] != {key: details.get(key) for key in IDENTITY_FIELDS}:
            return True
        if journal["action"] == "activate":
            if journal["afterState"] != "ACTIVATED":
                return True
            return (current not in {"ACTIVATED", "PUBLIC_VERIFIED", "COMPLETED", "ROLLED_BACK"}
                    and not (current == "FAILED" and details.get("failedFromState") == "ACTIVATED"))
        return journal["afterState"] != "ROLLED_BACK" or current != "ROLLED_BACK"

    @staticmethod
    def _stage_proven(state):
        details = state.get("details", {})
        evidence = details.get("stageVerification")
        return (isinstance(evidence, Mapping)
                and set(evidence) == {"schemaVersion", "identity", "internalVerified"}
                and evidence["schemaVersion"] == "d16-stage-verification-v1"
                and evidence["internalVerified"] is True
                and evidence["identity"] == {key: details.get(key) for key in IDENTITY_FIELDS})

    def _context(self, subject, state):
        manifest = subject.incoming / "candidate-manifest.json"
        compatible = False
        if not manifest.exists() and (subject.state_root / "compatibility-transaction.json").exists():
            from site_frontend_adapter import compatibility_candidate,SiteFrontendAdapter
            adapter = self.adapters.get((subject.adapter, "frontend-only"))
            if not isinstance(adapter,SiteFrontendAdapter): raise ReleaseError("capability-not-installed")
            candidate,payload = compatibility_candidate(subject,state)
            before_hash = candidate.manifest_sha256
            compatible = True
        else:
            before_hash = sha256_file(manifest)
            candidate = CandidateEnvelope.from_path(manifest)
        if candidate.subject != subject.subject_id:
            raise ReleaseError("candidate subject mismatch")
        adapter = self.adapters.get((subject.adapter, candidate.release_type))
        if adapter is None or subject.subject_id not in getattr(adapter,'enrolled_subjects',{subject.subject_id}):
            raise ReleaseError("capability-not-installed")
        from site_frontend_adapter import SiteFrontendAdapter
        if isinstance(adapter, SiteFrontendAdapter) and not compatible:
            # Phase one installs only the approved Task 4 compatibility input
            # path. General v2 candidate preparation/evidence is not installed.
            raise ReleaseError('capability-not-installed')
        if not compatible:
            payload = validate_payload(candidate, subject.incoming / "payload")
            if sha256_file(manifest) != before_hash:
                raise ReleaseError("candidate changed during validation")
        loader = getattr(adapter,'baseline_loader',None)
        baseline, global_baseline = loader(subject,state,candidate) if loader else self.baseline_loader(subject)
        if (baseline.get("subject") != subject.subject_id or global_baseline.get("subject") != "host"
                or baseline.get("previousProductionReceipt") != candidate.previous_production_receipt
                or not compatible and baseline.get("configurationSha256") != candidate.configuration_sha256
                or baseline.get("cmsContractSha256") != candidate.cms_contract_sha256):
            raise ReleaseError("candidate baseline mismatch")
        identity = {"releaseId": candidate.release_id, "subject": candidate.subject,
                    "releaseType": candidate.release_type, "sourceCommit": candidate.source_commit,
                    "candidateManifestSha256": before_hash,
                    "previousProductionReceipt": candidate.previous_production_receipt,
                    "adapterVersion": adapter.version}
        if compatible:
            saved_version=state['details']['adapterVersion']
            if saved_version not in {adapter.version,*adapter.compatible_versions}:
                raise ReleaseError('frontend adapter version requires explicit compatibility')
            identity['adapterVersion']=saved_version
            from frontend_backup import read_record,plain
            request=read_record(subject.incoming/'backup-request.json')
            binding={**identity,'runRoot':state['details']['runRoot'],'transactionSha256':state['details']['transactionSha256'],
                     'cmsEvidenceSha256':hashlib.sha256(json.dumps(plain(state['details']['cmsEvidence']),sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()).hexdigest(),
                     'requestId':request['requestId']}
            if any(key in state['details'] and state['details'][key] != value for key,value in binding.items()):
                raise ReleaseError('frontend transaction binding changed')
            baseline={**baseline,'binding':binding}
        validate_identity(identity)
        context = ReleaseContext(_authority=_CONTEXT_AUTHORITY, subject=subject, candidate=candidate,
            payload=payload, state=_freeze(state), subject_baseline=_freeze(baseline),
            global_baseline=_freeze(global_baseline), transaction_path=subject.state_root / "transaction.json")
        if compatible:
            from site_frontend_adapter import validate_frontend_baselines
            validate_frontend_baselines(context)
        return context, identity, adapter

    def _journal(self, subject):
        path = subject.state_root / "transaction.json"
        if not path.exists() and not path.is_symlink():
            return None
        try:
            with _open_regular_read(path) as source:
                value = json.loads(source.read(1024 * 1024 + 1), object_pairs_hook=_unique)
            if (not isinstance(value, dict)
                    or value.get("schemaVersion") != "d16-release-transaction-v1"
                    or value.get("action") not in {"activate", "rollback"}
                    or value.get("phase") not in {"INTENT", "RESULT"}
                    or not isinstance(value.get("transactionId"), str)
                    or re.fullmatch(r"[a-f0-9]{32}", value["transactionId"]) is None
                    or not isinstance(value.get("identity"), dict)
                    or value["identity"].get("subject") != subject.subject_id):
                raise ValueError()
            validate_identity(value["identity"])
            if value["phase"] == "RESULT":
                if (type(value.get("ok")) is not bool
                        or value.get("afterState") not in {"ACTIVATED", "ROLLED_BACK", "RECOVERY_REQUIRED"}
                        or value["ok"] is False and value["afterState"] != "RECOVERY_REQUIRED"):
                    raise ValueError()
            return value
        except (OSError, ValueError, ReleaseError):
            return {"phase": "INVALID"}

    def _completion(self, subject, details):
        try:
            fields = IDENTITY_FIELDS
            if 'frontendBackup' in details:
                from frontend_backup import BINDING_FIELDS
                fields = (*BINDING_FIELDS, 'backupId')
                details = {**details, 'backupId': details['frontendBackup']['backupId']}
            with _open_regular_read(subject.incoming / "completion-receipt.json") as source:
                raw = source.read(1024 * 1024 + 1)
            if len(raw) > 1024 * 1024:
                raise ValueError()
            value = json.loads(raw, object_pairs_hook=_unique)
            if (not isinstance(value, dict)
                    or set(value) != {*fields, "schemaVersion", "businessE2E", "forms", "evidenceSha256"}
                    or value.get("schemaVersion") != "d16-release-completion-v1"
                    or any(value.get(key) != details[key] for key in fields)):
                raise ValueError()
            evidence = {"businessE2E": value["businessE2E"], "forms": value["forms"],
                        "receiptSha256": hashlib.sha256(raw).hexdigest(), "evidenceSha256": value["evidenceSha256"]}
            validate_completion_evidence({"completionEvidence": evidence})
            blobs = {}
            for name in sorted(COMPLETION_FILES):
                with _open_regular_read(subject.incoming / name) as source:
                    blob = source.read(1024 * 1024 + 1)
                if len(blob) > 1024 * 1024 or hashlib.sha256(blob).hexdigest() != value["evidenceSha256"][name]:
                    raise ValueError()
                blobs[name] = blob
            e2e = json.loads(blobs["business-e2e-receipt.json"], object_pairs_hook=_unique)
            inbox = json.loads(blobs["inbox-confirmation-receipt.json"], object_pairs_hook=_unique)
            if (not isinstance(e2e, dict)
                    or set(e2e) != {*fields, "schemaVersion", "environment", "suite", "state", "runId"}
                    or e2e.get("schemaVersion") != "d16-production-business-e2e-v1"
                    or e2e.get("environment") != "production" or e2e.get("suite") != "business-e2e"
                    or e2e.get("state") != "PASSED" or not isinstance(e2e.get("runId"), str)
                    or not 1 <= len(e2e["runId"].strip()) <= 256
                    or not isinstance(inbox, dict)
                    or set(inbox) != {*fields, "schemaVersion", "source", "forms"}
                    or inbox.get("schemaVersion") != "d16-production-inbox-v1"
                    or inbox.get("source") != "server-inbox"
                    or not isinstance(inbox.get("forms"), dict)
                    or set(inbox["forms"]) != {"rfq", "sample", "documents"}
                    or any(record.get(key) != details[key] for record in (e2e, inbox) for key in fields)):
                raise ValueError()
            message_ids = set()
            for form in ("rfq", "sample", "documents"):
                mail = inbox["forms"][form]
                name = form + "-received.eml"
                if (not isinstance(mail, dict) or set(mail) != {"state", "messageId", "emlSha256"}
                        or mail.get("state") != "RECEIVED" or mail.get("emlSha256") != value["evidenceSha256"][name]
                        or not isinstance(mail.get("messageId"), str) or not mail["messageId"]
                        or mail["messageId"] in message_ids):
                    raise ValueError()
                message = BytesParser(policy=policy.default).parsebytes(blobs[name])
                if (message.defects or message.get_all("Message-ID") != [mail["messageId"]]
                        or not message.get_all("Received")):
                    raise ValueError()
                message_ids.add(mail["messageId"])
            return evidence
        except (OSError, ValueError, TypeError, KeyError, ReleaseError) as error:
            raise ReleaseError("completion evidence is missing or invalid") from error

    def _receipt(self, subject, action, before, after, failure_stage=None):
        result = {"ok": failure_stage is None, "subject": subject.subject_id, "action": action,
                  "beforeState": before["state"], "afterState": after["state"], "state": after,
                  "identity": {key: after.get("details", {}).get(key) for key in IDENTITY_FIELDS}}
        write_audit_receipt(subject.state_root, action, result, actor=self.actor, failure_stage=failure_stage)
        return redact(result)
