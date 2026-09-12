"""Explicit administrator-only PREPARED migration. No traffic or CMS writes."""
from __future__ import annotations

from copy import deepcopy
from contextlib import contextmanager
from dataclasses import dataclass
import base64
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile
from uuid import uuid4
from cms_evidence import CmsEvidence, canonical, digest, require, valid_hash
from release_contract import ReleaseError
from release_state import STATE_SCHEMA, ReleaseLock, validate_identity
from bootstrap_install import REQUIRED_FILES

COMPATIBILITY_COMMIT = '8bf2a3d437b0582ef0ce193b69478622e26419af'
COMPATIBILITY_RELEASE_ID = '20260911T215847Z-8bf2a3d437b0'
COMPATIBILITY_RUN_ROOT = '.production/runs/' + COMPATIBILITY_RELEASE_ID


def migrate_prepared_state(legacy_state, transaction, host_baseline, cms_evidence, site_baseline) -> dict[str, object]:
    """Map a validated old state in memory; the original file is never rewritten."""
    try:
        require(legacy_state['state'] == 'PREPARED' and 'schemaVersion' not in legacy_state, 'legacy PREPARED')
        details = deepcopy(legacy_state['details'])
        candidate = details['candidate']
        require(candidate['commit'] == COMPATIBILITY_COMMIT and details['commit'] == candidate['commit']
                and details['archiveSha256'] == candidate['archiveSha256'], 'legacy candidate')
        require(details.get('runRoot', COMPATIBILITY_RUN_ROOT) == COMPATIBILITY_RUN_ROOT, 'legacy RunRoot')
        require(set(transaction) == {'schemaVersion', 'subject', 'releaseType', 'releaseId', 'sourceCommit',
                                    'runRoot', 'candidate', 'artifacts', 'proofObjectSha256'}, 'transaction fields')
        require(transaction['schemaVersion'] == 'd16-production-transaction-v1' and transaction['subject'] == 'tio2-my'
                and transaction['releaseType'] == 'frontend-only' and transaction['releaseId'] == COMPATIBILITY_RELEASE_ID
                and transaction['sourceCommit'] == COMPATIBILITY_COMMIT and transaction['runRoot'] == COMPATIBILITY_RUN_ROOT
                and transaction['candidate'] == candidate, 'transaction identity')
        require(isinstance(cms_evidence, CmsEvidence) and cms_evidence.verified is True
                and cms_evidence.site_scope == 'tio2-my', 'verified scope')
        require(cms_evidence.candidate_sha256 == digest(canonical({key: candidate[key] for key in ('commit', 'archiveSha256', 'manifestSha256')}))
                and cms_evidence.proof_sha256 == transaction['proofObjectSha256'], 'verified candidate')
        expected = {'release.tar.gz': candidate['archiveSha256'], 'release-manifest.json': candidate['manifestSha256'],
                    'release-proof.json': candidate['proofSha256'], 'cms-identity.json': cms_evidence.prerelease_identity_sha256}
        require(transaction['artifacts'] == expected and all(valid_hash(value) for value in expected.values()), 'transaction artifacts')
        require(host_baseline['subject'] == 'host' and site_baseline['subject'] == 'tio2-my', 'baseline subjects')
        require(site_baseline['active'] == details['active'] and site_baseline['runtime'] == details['runtime']
                and site_baseline['configurationSha256'] == details['configurationFingerprint'], 'unchanged baseline')
        details.update(releaseId=COMPATIBILITY_RELEASE_ID, subject='tio2-my', releaseType='frontend-only',
                       sourceCommit=COMPATIBILITY_COMMIT, candidateManifestSha256=candidate['manifestSha256'],
                       previousProductionReceipt=site_baseline['previousProductionReceipt'], adapterVersion=site_baseline['adapterVersion'],
                       runRoot=COMPATIBILITY_RUN_ROOT, transactionSha256=digest(canonical(transaction)),
                       cmsEvidence=cms_evidence.as_dict(), hostBaselineSha256=digest(canonical(host_baseline)),
                       siteBaselineSha256=digest(canonical(site_baseline)))
        validate_identity(details)
        return {**deepcopy(legacy_state), 'schemaVersion': STATE_SCHEMA, 'state': 'PREPARED', 'details': details}
    except (KeyError, TypeError, ValueError, AttributeError) as error:
        raise ReleaseError('phase1 legacy migration evidence is invalid') from error


COMMIT_ORDER = ('generation', 'registry-host', 'registry-cms', 'registry-site', 'transaction', 'state', 'program', 'wrapper', 'sudoers')
REGISTRATION_FILES = ('host.json', 'cms/subject.json', 'sites/tio2-my/site.json')
WRAPPER = b'#!/bin/sh\nexec /usr/bin/python3 -B /opt/tio2-production/program/d16_release.py "$@"\n'


@dataclass(frozen=True)
class MigrationPaths:
    root: Path
    legacy_state: Path
    legacy_lock: Path
    program_link: Path
    registry: Path
    state: Path
    transaction: Path
    wrapper: Path
    sudoers: Path
    lock: Path
    work: Path
    simulation: bool = False

    @classmethod
    def for_root(cls, root, *, simulation=False):
        root = Path(root).absolute()
        old = root / 'opt/tio2-production'
        control = root / 'opt/d16-release'
        return cls(root, old / 'state/state.json', old / 'state/release.lock', old / 'program',
                   root / 'etc/d16-release', control / 'state/tio2-my/state.json', control / 'state/tio2-my/compatibility-transaction.json',
                   root / 'usr/local/sbin/d16-release', root / 'etc/sudoers.d/tio2-release',
                   control / 'state/release.lock', control / 'migration/phase1', simulation)

    @property
    def journal(self): return self.work / 'journal.json'
    @property
    def blocked(self): return self.work / 'blocked.json'
    @property
    def receipt(self): return self.work / 'receipt.json'


@dataclass(frozen=True)
class MigrationPlan:
    document: bytes
    @property
    def plan_hash(self): return digest(self.document)
    def as_dict(self): return {**json.loads(self.document), 'planHash': self.plan_hash}


@dataclass(frozen=True)
class MigrationReceipt:
    document: bytes
    def as_dict(self): return json.loads(self.document)


@dataclass(frozen=True)
class RecoveryReceipt(MigrationReceipt):
    pass


def _without_observation(value):
    if isinstance(value, dict):
        return {key: _without_observation(item) for key, item in value.items() if key not in {'observedAt', 'live_scope_sha256'}}
    if isinstance(value, list): return [_without_observation(item) for item in value]
    return value


class Phase1Migration:
    def __init__(self, paths: MigrationPaths, source: Path, bundle: Path, *, input_loader, snapshot,
                 lock_factory=ReleaseLock, root_check=None, self_test=None, sudo_validator=None,
                 checkpoint=None, fail_after=None):
        self.paths, self.source, self.bundle = paths, Path(source), Path(bundle)
        self.input_loader, self.snapshot = input_loader, snapshot
        self.lock_factory = lock_factory
        self.root_check = root_check or (lambda: os.name == 'posix' and os.geteuid() == 0)
        self.self_test = self_test or self._self_test
        self.sudo_validator = sudo_validator or (lambda path: subprocess.run(['/usr/sbin/visudo', '-cf', str(path)], check=True, capture_output=True))
        self.checkpoint = checkpoint or (lambda point: None)
        self.fail_after = fail_after

    def _check(self, path, *, link=False):
        """Every existing ancestor must be protected; no deploy-controlled paths."""
        for item in (*reversed(path.parents), path):
            try: metadata = item.lstat()
            except FileNotFoundError: continue
            is_link = stat.S_ISLNK(metadata.st_mode) or bool(getattr(metadata, 'st_file_attributes', 0) & 0x400)
            if is_link and not (item == path and link): raise ReleaseError('unsafe migration symlink')
            if not self.paths.simulation and (metadata.st_uid != 0 or not is_link and stat.S_IMODE(metadata.st_mode) & 0o022):
                raise ReleaseError('migration path is not root protected')
            if is_link:
                require(path in {self.paths.program_link, self.paths.program_link.with_name('.program.phase1-new')}, 'fixed program link')
                value = os.readlink(path)
                require(re.fullmatch(r'programs/[A-Za-z0-9][A-Za-z0-9_.-]*', value) is not None, 'program link target scope')
                target = path.parent / value
                # Check the un-resolved path first so a symlink anywhere in the
                # target ancestry cannot escape the fixed generation directory.
                self._check(target)
                require(target.is_dir() and target.resolve(strict=True).parent == (path.parent / 'programs').resolve(strict=True), 'resolved program generation')

    def _read(self, path, *, limit=32 * 1024 * 1024):
        self._check(path)
        flags = os.O_RDONLY | getattr(os, 'O_BINARY', 0) | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_NONBLOCK', 0)
        descriptor = os.open(path, flags)
        with os.fdopen(descriptor, 'rb') as source:
            before = os.fstat(source.fileno())
            if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1 or before.st_size > limit:
                raise ReleaseError('migration input is not a bounded regular file')
            data = source.read(limit + 1)
            after = os.fstat(source.fileno())
            if len(data) > limit or (before.st_size, before.st_mtime_ns, before.st_ino) != (after.st_size, after.st_mtime_ns, after.st_ino):
                raise ReleaseError('migration input changed during read')
        return data

    def _json(self, path):
        from cms_evidence import strict_json
        return strict_json(self._read(path))

    def _sync(self, directory):
        if not self.paths.simulation:
            descriptor = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
            try: os.fsync(descriptor)
            finally: os.close(descriptor)

    def _mkdir(self, path):
        self._check(path)
        absent = []
        cursor = path
        while not cursor.exists(): absent.append(cursor); cursor = cursor.parent
        for directory in reversed(absent):
            directory.mkdir(mode=0o700)
            self._sync(directory.parent)

    def _atomic(self, target, data, mode=0o600, *, kind='file', uid=0, gid=0, replaced=None, staged=None):
        self._check(target, link=target == self.paths.program_link)
        self._mkdir(target.parent)
        temporary = target.parent / ('.' + target.name + '.phase1-new')
        # A prior interrupted rename may leave only this fixed private temp file.
        self._check(temporary, link=kind == 'link')
        if os.path.lexists(temporary): temporary.unlink()
        if kind == 'link':
            temporary.symlink_to(data, target_is_directory=True)
            if not self.paths.simulation: os.lchown(temporary, uid, gid)
        else:
            with temporary.open('xb') as output:
                output.write(data); output.flush()
                if os.name == 'posix':
                    os.fchmod(output.fileno(), mode)
                    if not self.paths.simulation: os.fchown(output.fileno(), uid, gid)
                os.fsync(output.fileno())
        if staged: staged()
        os.replace(temporary, target)
        if replaced: replaced()
        self._sync(target.parent)

    def _point(self, name):
        self.checkpoint(name)
        if name == self.fail_after: raise ReleaseError('injected phase1 interruption: ' + name)

    def _snapshot_path(self, path, *, link=False):
        self._check(path, link=link or path == self.paths.program_link)
        if not os.path.lexists(path): return {'kind': 'absent'}
        metadata = path.lstat()
        if stat.S_ISLNK(metadata.st_mode):
            return {'kind': 'link', 'data': os.readlink(path), 'uid': metadata.st_uid, 'gid': metadata.st_gid}
        if not stat.S_ISREG(metadata.st_mode): raise ReleaseError('unsupported existing migration target')
        return {'kind': 'file', 'data': base64.b64encode(self._read(path)).decode(), 'mode': stat.S_IMODE(metadata.st_mode),
                'uid': metadata.st_uid, 'gid': metadata.st_gid}

    def _tree(self, path):
        self._check(path)
        if not path.is_dir(): raise ReleaseError('program generation is unavailable')
        entries = {}
        for item in sorted(path.rglob('*')):
            self._check(item)
            if not item.is_dir(): entries[item.relative_to(path).as_posix()] = digest(self._read(item))
        return entries

    def _installed_hash(self, name, path):
        return digest(canonical(self._target_snapshot(name, path)))

    def _target_snapshot(self, name, path):
        if name != 'generation' or not path.exists(): return self._snapshot_path(path, link=name == 'program')
        self._check(path)
        require(path.is_dir(), 'program generation directory')
        entries = {}
        for item in sorted(path.iterdir()):
            value = self._snapshot_path(item)
            require(value['kind'] == 'file', 'flat program generation')
            entries[item.name] = {**value, 'data': digest(base64.b64decode(value['data']))}
        metadata = path.stat()
        return {'kind': 'generation', 'files': entries, 'mode': stat.S_IMODE(metadata.st_mode),
                'uid': metadata.st_uid, 'gid': metadata.st_gid}

    def _unmanaged(self, targets, absent_parents):
        """Bind adjacent state/registration/program files, including later transactions."""
        excluded = {*targets.values(), *(path.with_name('.' + path.name + '.phase1-new') for path in targets.values()), self.paths.legacy_lock}
        ignored_dirs = {Path(value) for value in absent_parents}
        roots = (self.paths.legacy_state.parent, self.paths.program_link.parent / 'programs', self.paths.registry,
                 self.paths.state.parent, self.paths.wrapper.parent, self.paths.sudoers.parent)
        values = {}
        for root in roots:
            if not root.exists(): continue
            for path in (root, *sorted(root.rglob('*'))):
                if any(path == item or path.is_relative_to(item) for item in excluded): continue
                self._check(path)
                if path.is_dir():
                    if path not in ignored_dirs:
                        metadata = path.stat()
                        values[str(path)] = {'kind': 'directory', 'mode': stat.S_IMODE(metadata.st_mode), 'uid': metadata.st_uid, 'gid': metadata.st_gid}
                else:
                    value = self._snapshot_path(path)
                    values[str(path)] = {**value, 'data': digest(base64.b64decode(value['data']))}
        return values

    def _expected(self, replacements, staging):
        sample = self._snapshot_path(staging / 'tool-commit.txt')
        expected = {'generation': self._target_snapshot('generation', staging)}
        for name in COMMIT_ORDER[1:]:
            if name == 'program' and not self.paths.simulation:
                expected[name] = {'kind': 'link', 'data': replacements[name], 'uid': 0, 'gid': 0}
            else:
                mode = 0o440 if name == 'sudoers' else 0o750 if name == 'wrapper' else 0o600
                content = replacements[name].encode() if name == 'program' else replacements[name]
                expected[name] = {**sample, 'data': base64.b64encode(content).decode(), 'mode': mode if os.name == 'posix' else sample['mode']}
        return expected

    def _bundle(self):
        manifest = self._json(self.bundle.with_name(self.bundle.name + '.sha256.json'))
        data = self._read(self.bundle)
        require(set(manifest) == {'schemaVersion', 'toolCommit', 'files', 'installationPerformed', 'archiveSha256'}
                and manifest['schemaVersion'] == 'd16-phase1-admin-v1' and manifest['installationPerformed'] is False
                and isinstance(manifest['toolCommit'], str) and re.fullmatch('[a-f0-9]{40}', manifest['toolCommit'])
                and manifest['archiveSha256'] == digest(data) and set(manifest['files']) == set(REQUIRED_FILES), 'administrator bundle')
        self._check(self.source)
        require(set(item.name for item in self.source.iterdir()) == set(REQUIRED_FILES), 'administrator source inventory')
        contents = {}
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
            members = archive.getmembers()
            require([item.name for item in members] == ['admin/' + name for name in sorted(REQUIRED_FILES)], 'administrator archive inventory')
            for item in members:
                name = item.name[6:]
                require(item.isfile() and item.size <= 8 * 1024 * 1024 and not item.pax_headers
                        and (item.uid, item.gid, item.mtime, item.uname, item.gname) == (0, 0, 0, '', '')
                        and item.mode == (0o750 if name.endswith('.sh') else 0o640), 'administrator archive metadata')
                contents[name] = archive.extractfile(item).read()
                require(valid_hash(manifest['files'][name]) and digest(contents[name]) == manifest['files'][name]
                        and self._read(self.source / name) == contents[name], 'administrator source bytes')
        require(contents['tool-commit.txt'] == (manifest['toolCommit'] + '\n').encode(), 'administrator commit')
        return manifest, contents

    @contextmanager
    def _locked(self):
        if not self.root_check(): raise ReleaseError('phase1 migration requires root')
        # Hold both locks: older installed tools still use the legacy namespace.
        for path in (self.paths.lock, self.paths.legacy_lock): self._check(path)
        with self.lock_factory(self.paths.lock), self.lock_factory(self.paths.legacy_lock):
            yield

    def _blocked(self, stage):
        self._atomic(self.paths.blocked, canonical({'schemaVersion': 'd16-phase1-blocked-v1', 'subject': 'tio2-my',
                                                   'stage': stage, 'state': 'BLOCKED', 'successful': False}))

    def _targets(self, commit):
        return dict(zip(COMMIT_ORDER, (self.paths.program_link.parent / 'programs' / ('phase1-' + commit),
            *(self.paths.registry / name for name in REGISTRATION_FILES), self.paths.transaction, self.paths.state,
            self.paths.program_link, self.paths.wrapper, self.paths.sudoers), strict=True))

    def _prepare(self):
        manifest, contents = self._bundle()
        if self.paths.journal.exists(): raise ReleaseError('phase1 recovery required')
        if self.paths.receipt.exists() or (self.paths.work / 'completed-journal.json').exists(): raise ReleaseError('phase1 migration already completed')
        runtime = _without_observation(self.snapshot())
        inputs = self.input_loader()
        legacy_bytes = self._read(self.paths.legacy_state)
        from cms_evidence import strict_json
        state = migrate_prepared_state(strict_json(legacy_bytes), inputs['transaction'], inputs['hostBaseline'], inputs['cmsEvidence'], inputs['siteBaseline'])
        require(set(inputs['registration']) == set(REGISTRATION_FILES) and all(isinstance(data, bytes) for data in inputs['registration'].values()), 'registration inventory')
        targets = self._targets(manifest['toolCommit'])
        require(all(not os.path.lexists(path.with_name('.' + path.name + '.phase1-new')) for path in targets.values()), 'no unjournaled staged target')
        before = {name: self._snapshot_path(path) for name, path in targets.items()}
        require(before['generation']['kind'] == 'absent' and before['state']['kind'] == 'absent'
                and before['transaction']['kind'] == 'absent', 'new migration targets')
        old = before['program']
        require(old['kind'] == ('file' if self.paths.simulation else 'link'), 'old program link')
        old_target = base64.b64decode(old['data']).decode() if self.paths.simulation else old['data']
        old_program = (self.paths.program_link.parent / old_target).resolve(strict=True)
        require(old_program.parent == (self.paths.program_link.parent / 'programs').resolve(strict=True), 'old program generation')
        old_files = self._tree(old_program)
        absent_parents = set()
        for target in targets.values():
            cursor = target.parent
            while not cursor.exists(): absent_parents.add(str(cursor)); cursor = cursor.parent
        program_target = 'programs/phase1-' + manifest['toolCommit']
        replacements = {**{name: contents for name in ('generation',)},
                        **{name: inputs['registration'][relative] for name, relative in zip(COMMIT_ORDER[1:4], REGISTRATION_FILES, strict=True)},
                        'transaction': canonical(inputs['transaction']), 'state': canonical(state),
                        'program': program_target, 'wrapper': WRAPPER, 'sudoers': contents['sudoers.tio2-release']}
        binding = {'schemaVersion': 'd16-phase1-migration-plan-v1', 'subject': 'tio2-my', 'legacyStateSha256': digest(legacy_bytes),
                   'oldProgram': {'target': old_target, 'files': old_files}, 'targetCommit': manifest['toolCommit'],
                   'adminArchiveSha256': manifest['archiveSha256'], 'adminFiles': manifest['files'],
                   'registrationSha256': {name: digest(data) for name, data in inputs['registration'].items()},
                   'transactionSha256': digest(replacements['transaction']), 'stateTemplateSha256': digest(canonical(_without_observation(state))),
                   'cmsEvidence': _without_observation(inputs['cmsEvidence'].as_dict()),
                   'beforeSha256': digest(canonical(before)), 'absentParents': sorted(absent_parents),
                   'unmanagedSha256': digest(canonical(self._unmanaged(targets, absent_parents))),
                   'replacementOrder': list(COMMIT_ORDER), 'runtimeBefore': runtime}
        return MigrationPlan(canonical(binding)), before, replacements

    def plan(self) -> MigrationPlan:
        with self._locked():
            try: return self._prepare()[0]
            except Exception as error:
                self._blocked('preflight')
                raise ReleaseError('phase1 preflight blocked') from error

    @staticmethod
    def _self_test(staged):
        # The existing selftest intentionally compiles files. Run a disposable
        # copy so generated bytecode cannot become part of the new program.
        with tempfile.TemporaryDirectory(prefix='d16-phase1-selftest-') as temporary:
            copy = Path(temporary) / 'program'
            shutil.copytree(staged, copy)
            subprocess.run([sys.executable, '-B', str(copy / 'bootstrap_selftest.py')], cwd=copy, check=True, capture_output=True)
            subprocess.run([sys.executable, '-B', '-c', 'import adoption_probe, nginx_inventory, tls_identity, cms_evidence, phase1_migration, d16_release'], cwd=copy, check=True, capture_output=True)

    def apply(self, plan_hash: str) -> MigrationReceipt:
        with self._locked():
            try:
                plan, before, replacements = self._prepare()
                if not valid_hash(plan_hash) or plan.plan_hash != plan_hash: raise ReleaseError('phase1 plan changed')
                data = plan.as_dict(); targets = self._targets(data['targetCommit'])
                self._mkdir(self.paths.work)
                staging = self.paths.work / ('staging-' + uuid4().hex)
                self._mkdir(staging)
                try:
                    for name, content in replacements['generation'].items():
                        self._atomic(staging / name, content, 0o750 if name.endswith('.sh') else 0o640)
                    self.self_test(staging)
                    require(self._tree(staging) == data['adminFiles'], 'staged program bytes')
                    self.sudo_validator(staging / 'sudoers.tio2-release')
                    expected = self._expected(replacements, staging)
                    journal = {'schemaVersion': 'd16-phase1-migration-journal-v1', 'plan': data, 'before': before,
                               'expected': expected, 'expectedSha256': digest(canonical(expected)),
                               'commits': [], 'staging': staging.name, 'restored': [], 'restoring': []}
                    self._atomic(self.paths.journal, canonical(journal))
                    for directory in sorted(data['absentParents'], key=lambda value: len(Path(value).parts)):
                        self._mkdir(Path(directory))
                    for name in COMMIT_ORDER:
                        target = targets[name]
                        journal['commits'].append({'name': name, 'committed': False})
                        self._atomic(self.paths.journal, canonical(journal))
                        self._point(name + ':intent')
                        if name == 'generation':
                            os.replace(staging, target)
                            self._point(name + ':replaced'); self._sync(target.parent)
                        elif name == 'program':
                            value = replacements[name]
                            self._atomic(target, value.encode() if self.paths.simulation else value, kind='file' if self.paths.simulation else 'link',
                                         replaced=lambda: self._point(name + ':replaced'), staged=lambda: self._point(name + ':staged'))
                        else:
                            self._atomic(target, replacements[name], 0o440 if name == 'sudoers' else 0o750 if name == 'wrapper' else 0o600,
                                         replaced=lambda: self._point(name + ':replaced'), staged=lambda: self._point(name + ':staged'))
                        journal['commits'][-1]['installedSha256'] = self._installed_hash(name, target)
                        require(self._target_snapshot(name, target) == expected[name], 'expected installed target')
                        journal['commits'][-1]['committed'] = True
                        self._atomic(self.paths.journal, canonical(journal)); self._point(name + ':committed')
                    for item in journal['commits']:
                        require(self._installed_hash(item['name'], targets[item['name']]) == item['installedSha256'], 'installed migration bytes')
                    after = _without_observation(self.snapshot())
                    require(after == data['runtimeBefore'] and digest(self._read(self.paths.legacy_state)) == data['legacyStateSha256'], 'unchanged production after migration')
                    require(digest(canonical(self._unmanaged(targets, data['absentParents']))) == data['unmanagedSha256'], 'unchanged surrounding state')
                    self._point('verified')
                    receipt = {'schemaVersion': 'd16-phase1-migration-receipt-v1', 'planHash': plan_hash, 'subject': 'tio2-my',
                               'state': 'PREPARED', 'commits': journal['commits'], 'runtimeAfter': after, 'legacyStateSha256': data['legacyStateSha256']}
                    self._point('receipt')
                    # Publishing the receipt terminates recovery, even if power
                    # fails before the journal can be moved to its archive.
                    self._atomic(self.paths.receipt, canonical(receipt))
                    journal['completed'] = True; self._atomic(self.paths.journal, canonical(journal))
                    os.replace(self.paths.journal, self.paths.work / 'completed-journal.json'); self._sync(self.paths.work)
                    return MigrationReceipt(canonical(receipt))
                finally:
                    if staging.is_dir(): shutil.rmtree(staging)
            except Exception as error:
                self._blocked('apply')
                raise ReleaseError('phase1 apply blocked; recover any pending journal') from error

    def recover(self) -> RecoveryReceipt:
        with self._locked():
            # Validate trusted code and journal before reading any recovery path.
            administrator, _ = self._bundle()
            try:
                require(not os.path.lexists(self.paths.receipt) and not os.path.lexists(self.paths.work / 'completed-journal.json'), 'unfinished migration')
                journal = self._json(self.paths.journal); plan = journal['plan']; before = journal['before']
                payload = {key: value for key, value in plan.items() if key != 'planHash'}
                require(journal['schemaVersion'] == 'd16-phase1-migration-journal-v1' and digest(canonical(payload)) == plan['planHash']
                        and plan['replacementOrder'] == list(COMMIT_ORDER) and set(before) == set(COMMIT_ORDER)
                        and digest(canonical(before)) == plan['beforeSha256'] and re.fullmatch('[a-f0-9]{40}', plan['targetCommit'])
                        and administrator['toolCommit'] == plan['targetCommit'] and administrator['archiveSha256'] == plan['adminArchiveSha256'], 'recovery journal binding')
                require(not journal.get('completed'), 'unfinished journal')
                require(isinstance(journal['staging'], str) and re.fullmatch('staging-[a-f0-9]{32}', journal['staging']), 'recovery staging identity')
                targets = self._targets(plan['targetCommit'])
                allowed_parents = {str(parent) for target in targets.values() for parent in target.parents if parent.is_relative_to(self.paths.root)}
                require(set(plan['absentParents']) <= allowed_parents, 'recovery directory scope')
                require(digest(self._read(self.paths.legacy_state)) == plan['legacyStateSha256'], 'legacy state before recovery')
                expected = journal['expected']; commits = journal['commits']; restoring = journal['restoring']
                require(set(expected) == set(COMMIT_ORDER) and digest(canonical(expected)) == journal['expectedSha256']
                        and [item['name'] for item in commits] == list(COMMIT_ORDER[:len(commits)])
                        and all(item['committed'] is True for item in commits[:-1])
                        and (not commits or type(commits[-1]['committed']) is bool)
                        and restoring == list(reversed(COMMIT_ORDER))[:len(restoring)], 'recovery progress')
                restored_names = [item['name'] for item in journal['restored']]
                require(len(restored_names) == len(set(restored_names)) and set(restored_names) <= set(restoring)
                        and all(item['restoredSha256'] == digest(canonical(before[item['name']])) for item in journal['restored']), 'recovery restore progress')
                retired = self.paths.work / ('retired-' + journal['staging'])
                self._check(retired)
                if os.path.lexists(retired):
                    require('generation' in restoring and not os.path.lexists(targets['generation'])
                            and self._target_snapshot('generation', retired) == expected['generation'], 'retired migration ownership')
                for index, name in enumerate(COMMIT_ORDER):
                    current = self._target_snapshot(name, targets[name])
                    allowed = [before[name]] if index >= len(commits) or name in restored_names else [expected[name]]
                    if name in restoring or index < len(commits) and not commits[index]['committed']: allowed.append(before[name])
                    require(current in allowed, 'current migration ownership')
                    if index < len(commits) and commits[index]['committed']:
                        require(commits[index]['installedSha256'] == digest(canonical(expected[name])), 'installed journal target')
                    temporary = targets[name].with_name('.' + targets[name].name + '.phase1-new')
                    if os.path.lexists(temporary):
                        staged = self._snapshot_path(temporary, link=name == 'program')
                        # Apply can leave a temp only at an uncommitted intent.
                        # Recovery can stage the plan-bound old snapshot even
                        # for targets apply never reached. Its intent must be
                        # in the continuous reverse-order prefix checked above.
                        apply_owned = index < len(commits) and not commits[index]['committed'] and staged == expected[name]
                        recovery_owned = name in restoring and staged == before[name]
                        require(name != 'generation' and name not in restored_names and (apply_owned or recovery_owned), 'staged migration ownership')
                require(digest(canonical(self._unmanaged(targets, plan['absentParents']))) == plan['unmanagedSha256'], 'surrounding migration ownership')
                old_program = (self.paths.program_link.parent / plan['oldProgram']['target']).resolve(strict=True)
                require(self._tree(old_program) == plan['oldProgram']['files'], 'old program before recovery')
                require(_without_observation(self.snapshot()) == plan['runtimeBefore'], 'runtime before recovery')
            except Exception as error:
                raise ReleaseError('phase1 recovery journal is invalid') from error
            failures, restored = [], list(journal['restored'])
            for name in reversed(COMMIT_ORDER):
                target, previous = targets[name], before[name]
                try:
                    if name in restored_names: continue
                    if name not in journal['restoring']: journal['restoring'].append(name)
                    self._atomic(self.paths.journal, canonical(journal))
                    temporary = target.parent / ('.' + target.name + '.phase1-new')
                    self._check(temporary, link=name == 'program')
                    if os.path.lexists(temporary): temporary.unlink(); self._sync(temporary.parent)
                    if previous['kind'] == 'absent':
                        self._check(target)
                        if name == 'generation' and target.exists():
                            require(self._snapshot_path(self.paths.program_link) == before['program'], 'program restored before generation removal')
                            require(self._tree(target) == plan['adminFiles'], 'recovery generation bytes')
                            retired = self.paths.work / ('retired-' + journal['staging'])
                            self._check(retired)
                            require(not os.path.lexists(retired), 'unused retirement path')
                            os.replace(target, retired); self._sync(self.paths.work)
                        else: target.unlink(missing_ok=True)
                        if target.parent.exists(): self._sync(target.parent)
                    elif previous['kind'] == 'file':
                        self._atomic(target, base64.b64decode(previous['data'], validate=True), previous['mode'], uid=previous['uid'], gid=previous['gid'])
                    elif previous['kind'] == 'link' and name == 'program':
                        self._atomic(target, previous['data'], kind='link', uid=previous['uid'], gid=previous['gid'])
                    else: raise ReleaseError('invalid recovery snapshot')
                    if self._snapshot_path(target) != previous: raise ReleaseError('recovered target differs')
                    restored.append({'name': name, 'restoredSha256': digest(canonical(previous))})
                    journal['restored'] = restored; self._atomic(self.paths.journal, canonical(journal))
                except Exception as error: failures.append(error)
            for directory in sorted(plan['absentParents'], key=lambda value: len(Path(value).parts), reverse=True):
                path = Path(directory)
                if path.exists():
                    try: path.rmdir(); self._sync(path.parent)
                    except OSError as error: failures.append(error)
            after = _without_observation(self.snapshot())
            if after != plan['runtimeBefore']: failures.append(ReleaseError('runtime changed'))
            old_program = (self.paths.program_link.parent / plan['oldProgram']['target']).resolve(strict=True)
            if self._tree(old_program) != plan['oldProgram']['files']: failures.append(ReleaseError('old program changed'))
            if failures: raise ReleaseError('phase1 recovery incomplete') from failures[0]
            receipt = {'schemaVersion': 'd16-phase1-recovery-receipt-v1', 'planHash': plan['planHash'], 'restored': restored,
                       'runtimeAfter': after, 'legacyStateSha256': digest(self._read(self.paths.legacy_state))}
            self._atomic(self.paths.work / 'recovery-receipt.json', canonical(receipt))
            self._atomic(self.paths.work / 'recovered-journal.json', canonical(journal))
            self.paths.journal.unlink(); self._sync(self.paths.work)
            return RecoveryReceipt(canonical(receipt))


class SystemMigrationInputs:
    """Fixed root-copied inputs; neither command line nor uploads select paths.

    /root/d16-phase1/inputs contains the original four candidate artifacts plus
    seed-manifest.json, cms-comparison-evidence.json and registration files.
    The adoption plan/journal and live baseline are read at their original fixed
    locations, never reconstructed from a user-supplied 'verified' assertion.
    """
    def __init__(self, migration):
        self.migration = migration
        self.input_root = Path('/root/d16-phase1/inputs')
        self.baseline = None
        self.live_scope = None
        self.ingress = None

    def snapshot(self):
        from adoption_probe import LocalSnapshotSource, registered_ingress_snapshot, read_cms_scope
        from release_baseline import validate_baseline
        from subject_registry import load_registry
        import urllib.request
        registry = load_registry(self.input_root / 'registration')
        reader = LocalSnapshotSource()
        reader._configure_tls_allowlist(registry)
        self.baseline = validate_baseline()
        self.ingress = registered_ingress_snapshot(reader._run(['/usr/sbin/nginx', '-T']), registry, reader)
        wordpress = next(item['id'] for item in self.baseline['runtime']['containers'] if item['role'] == 'wordpress')
        self.live_scope = read_cms_scope(reader, wordpress)
        from cms_content_snapshot import read_content_snapshot
        self.live_scope['contentSnapshot'] = read_content_snapshot(reader, wordpress)
        ids = sorted(item['id'] for item in self.baseline['runtime']['containers'])
        containers = json.loads(reader._run(['/usr/bin/docker', 'inspect', *ids]))
        running = {item['Id']: {'image': item['Image'], 'running': item['State']['Running'],
                              'startedAt': item['State']['StartedAt'], 'pid': item['State']['Pid']} for item in containers}
        require(set(running) == set(ids) and all(value['running'] is True for value in running.values()), 'live containers')
        pid = self.migration._read(Path('/run/nginx.pid')).decode().strip()
        require(pid.isdigit(), 'Nginx master identity')
        process = Path('/proc') / pid / 'stat'
        nginx_start = process.read_text().rsplit(')', 1)[1].split()[19]
        with urllib.request.urlopen('https://tio2malaysia.com/', timeout=20) as response:
            public = response.headers.get('X-Tio2-Release')
            require(response.status == 200 and response.geturl() == 'https://tio2malaysia.com/'
                    and public == self.baseline['active']['commit'], 'public version')
        return {'active': self.baseline['active'], 'runtime': self.baseline['runtime'],
                'configurationSha256': self.baseline['configurationFingerprint'], 'ingress': self.ingress,
                'cms': self.live_scope, 'containers': running, 'nginxMaster': {'pid': pid, 'start': nginx_start}, 'publicVersion': public}

    def inputs(self):
        from adoption_contract import validate_plan
        from cms_evidence import strict_json, verify_frontend_only_evidence, read_prerelease_seed_hashes
        from release_contract import validate_manifest, validate_prerelease_proof, inspect_archive, sha256_file
        m = self.migration
        require(self.baseline is not None and self.live_scope is not None, 'fresh runtime snapshot')
        files = {name: self.input_root / name for name in ('release.tar.gz', 'release-manifest.json', 'release-proof.json', 'cms-identity.json')}
        for path in files.values():
            m._check(path)
            metadata = path.lstat()
            require(stat.S_ISREG(metadata.st_mode) and metadata.st_nlink == 1, 'root candidate input')
        manifest = validate_manifest(files['release-manifest.json'], files['release.tar.gz'])
        inspect_archive(files['release.tar.gz'], manifest)
        proof = validate_prerelease_proof(files['release-proof.json'], files['release-manifest.json'], manifest)
        legacy = m._json(m.paths.legacy_state)
        candidate = legacy['details']['candidate']
        identity = m._read(files['cms-identity.json'], limit=1024 * 1024)
        artifacts = {name: sha256_file(path) for name, path in files.items()}
        require(manifest['commit'] == candidate['commit'] == COMPATIBILITY_COMMIT and
                artifacts['release.tar.gz'] == candidate['archiveSha256'] and artifacts['release-manifest.json'] == candidate['manifestSha256']
                and artifacts['release-proof.json'] == candidate['proofSha256'] and proof == legacy['details']['prereleaseProof'], 'old candidate artifacts')
        seed_bytes = m._read(self.input_root / 'seed-manifest.json')
        release_identity = {key: candidate[key] for key in ('commit', 'archiveSha256', 'manifestSha256')}
        seed_snapshot = {'manifestBytes': seed_bytes, 'candidate': release_identity,
                         'archiveFiles': {item['path']: item['sha256'] for item in manifest['files']},
                         'seedSourceHashes': read_prerelease_seed_hashes(seed_bytes,
                             lambda path: m._read(self.input_root / 'prerelease-seeds' / path, limit=8 * 1024 * 1024)),
                         'comparisonEvidence': strict_json(m._read(self.input_root / 'cms-comparison-evidence.json'))}
        adoption_plan = validate_plan(m._json(Path('/etc/tio2-production/adoption-plan.json')))
        journal = m._json(Path('/opt/tio2-production/state/adoption.json'))
        require(journal['schemaVersion'] == 'tio2-production-adoption-journal-v1' and journal['state'] == 'PUBLIC_READY'
                and journal['planHash'] == adoption_plan['planHash'], 'original adoption journal')
        adopted = {key: adoption_plan['candidate'][key] for key in release_identity}
        # validate_plan and journal.planHash authenticate the original adoption.
        # Read its own frozen seeds, then compare content continuity with the
        # separately validated PREPARED archive; their release IDs may differ.
        adopted_root = Path('/opt/tio2-production/releases') / adopted['commit']
        content = journal['details']['content']
        migration_bytes = m._read(adopted_root / 'ops/production/migration-manifest.json')
        require(digest(migration_bytes) == content['seedManifestSha256'], 'adoption seed receipt')
        migration_manifest = strict_json(migration_bytes)
        require(set(migration_manifest) == {'schemaVersion', 'siteId', 'seeds'}
                and migration_manifest['schemaVersion'] == 'tio2-my-production-migration-v1'
                and migration_manifest['siteId'] == 'tio2-my', 'original adoption manifest')
        # initialize() executed this original manifest list in its recorded
        # order. The prerelease list must never supply adoption evidence.
        seeds = migration_manifest['seeds']
        require(isinstance(seeds, list) and len(seeds) > 0, 'actual adopted seed sequence')
        ordered_hashes = []
        for item in seeds:
            # Validate paths against the manifest before joining a root path.
            require(isinstance(item, dict) and set(item) == {'path', 'sha256'}
                    and isinstance(item['path'], str) and item['path'].startswith('wordpress/seed/')
                    and '..' not in PurePosixPath(item['path']).parts and '\\' not in item['path']
                    and PurePosixPath(item['path']).as_posix() == item['path']
                    and valid_hash(item['sha256']), 'adopted seed path')
            value = digest(m._read(adopted_root / item['path']))
            require(value == item['sha256'], 'original adopted seed bytes')
            ordered_hashes.append(value)
        adoption = {'siteScope': 'tio2-my', 'candidate': adopted, 'publishedRecords': content['publishedRecords'],
                    'contentSha256': content['contentSha256'], 'migrationManifestBytes': migration_bytes,
                    'seedManifestSha256': content['seedManifestSha256'], 'orderedSeedHashes': ordered_hashes}
        cms = verify_frontend_only_evidence(proof, identity, seed_snapshot, adoption, self.live_scope)
        transaction = {'schemaVersion': 'd16-production-transaction-v1', 'subject': 'tio2-my', 'releaseType': 'frontend-only',
                       'releaseId': COMPATIBILITY_RELEASE_ID, 'sourceCommit': COMPATIBILITY_COMMIT, 'runRoot': COMPATIBILITY_RUN_ROOT,
                       'candidate': candidate, 'artifacts': artifacts, 'proofObjectSha256': cms.proof_sha256}
        registration = {name: m._read(self.input_root / 'registration' / name) for name in REGISTRATION_FILES}
        site_record = strict_json(registration['sites/tio2-my/site.json'])
        site = {'subject': 'tio2-my', 'previousProductionReceipt': adoption_plan['planHash'], 'adapterVersion': site_record['adapter'],
                'active': self.baseline['active'], 'runtime': self.baseline['runtime'], 'configurationSha256': self.baseline['configurationFingerprint']}
        return {'transaction': transaction, 'hostBaseline': {'subject': 'host', 'ingress': self.ingress},
                'cmsEvidence': cms, 'siteBaseline': site, 'registration': registration}


def main(argv=None):
    arguments = list(sys.argv[1:] if argv is None else argv)
    if os.name != 'posix' or os.geteuid() != 0:
        return 2
    if not (arguments in (['plan'], ['recover']) or len(arguments) == 2 and arguments[0] == 'apply' and valid_hash(arguments[1])):
        return 2
    os.environ.clear(); os.environ['PATH'] = '/usr/sbin:/usr/bin:/sbin:/bin'; os.umask(0o077)
    migration = Phase1Migration(MigrationPaths.for_root(Path('/')), Path('/root/d16-phase1/admin'), Path('/root/d16-phase1/admin-bundle.tar.gz'),
                                input_loader=None, snapshot=None)
    inputs = SystemMigrationInputs(migration)
    migration.input_loader, migration.snapshot = inputs.inputs, inputs.snapshot
    try:
        result = migration.apply(arguments[1]) if arguments[0] == 'apply' else getattr(migration, arguments[0])()
        print(json.dumps(result.as_dict(), sort_keys=True, separators=(',', ':')))
        return 0
    except Exception:
        print('{"ok":false,"error":"phase1 migration blocked"}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
