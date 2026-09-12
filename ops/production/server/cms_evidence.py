"""Pure verification of three independent CMS evidence objects; never writes CMS.

seed_manifest is a snapshot made only after validating the frozen archive:
manifestBytes are the original prerelease seed manifest, candidate is its three
release identity fields, and seedSourceHashes comes from reading and validating
the original prerelease script bytes. Production archive validation is separate.
adoption is derived from the root-protected adoption plan/journal and its frozen
seed archive; live_scope must come from a new read-only production query.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import hashlib
import json
from pathlib import PurePosixPath
import re

from release_contract import ReleaseError


def canonical(value: object) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=True, allow_nan=False).encode()


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def strict_json(data: bytes) -> dict:
    def unique(pairs):
        value = {}
        for key, item in pairs:
            if key in value: raise ReleaseError('CMS evidence contains duplicate fields')
            value[key] = item
        return value
    try:
        value = json.loads(data.decode('utf-8'), object_pairs_hook=unique,
                          parse_constant=lambda _: (_ for _ in ()).throw(ValueError()))
        if not isinstance(value, dict): raise ValueError()
        return value
    except (UnicodeError, ValueError, TypeError) as error:
        raise ReleaseError('CMS evidence JSON is invalid') from error


def require(condition, label):
    if not condition: raise ReleaseError('CMS evidence ' + label + ' mismatch')


def valid_hash(value):
    return isinstance(value, str) and re.fullmatch('[a-f0-9]{64}', value) is not None


def verify_comparison(value, candidate, identity_hash, proof, live):
    from cms_content_snapshot import validate_snapshot
    require(isinstance(value, dict) and set(value) == {'schemaVersion', 'candidate', 'prereleaseIdentitySha256',
            'proofSha256', 'snapshot', 'verification', 'verificationSha256', 'observedAt', 'containerId'}, 'comparison fields')
    require(value['schemaVersion'] == 'd16-cms-comparison-evidence-v1' and value['candidate'] == candidate
            and value['prereleaseIdentitySha256'] == identity_hash
            and value['proofSha256'] == digest(canonical(proof)), 'comparison identity')
    validate_snapshot(value['snapshot']); validate_snapshot(live['contentSnapshot'])
    require(value['snapshot'] == live['contentSnapshot']
            and value['snapshot']['publishedRecords'] == live['publishedRecords'], 'actual CMS content; content release required if it differs')
    verification = value['verification']
    require(isinstance(verification, dict) and set(verification) == {'schemaVersion', 'state', 'siteId', 'commit',
            'runId', 'contentSnapshotSha256', 'passed', 'failed', 'skipped', 'completedAt'}, 'comparison verification fields')
    require(verification['schemaVersion'] == 'd16-cms-comparison-verification-v1'
            and verification['state'] == 'PASSED' and verification['siteId'] == 'tio2-my'
            and verification['commit'] == candidate['commit']
            and isinstance(verification['runId'], str) and 0 < len(verification['runId'].strip()) <= 200
            and verification['contentSnapshotSha256'] == digest(canonical(value['snapshot']))
            and type(verification['passed']) is int and verification['passed'] > 0
            and verification['passed'] >= proof['prerelease']['counts']['browserCases']
            and type(verification['failed']) is int and verification['failed'] == 0
            and type(verification['skipped']) is int and verification['skipped'] == 0
            and value['verificationSha256'] == digest(canonical(verification)), 'comparison verification')
    require(isinstance(value['containerId'], str) and re.fullmatch('[a-f0-9]{64}', value['containerId']), 'comparison container')
    observed = datetime.fromisoformat(value['observedAt'].replace('Z', '+00:00'))
    completed = datetime.fromisoformat(verification['completedAt'].replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    require(observed.tzinfo is not None and completed.tzinfo is not None
            and -30 <= (now-observed).total_seconds() <= 86400
            and -30 <= (now-completed).total_seconds() <= 86400
            and -30 <= (observed-completed).total_seconds() <= 86400, 'comparison freshness')


@dataclass(frozen=True)
class CmsEvidence:
    prerelease_identity_sha256: str
    proof_sha256: str
    candidate_sha256: str
    seed_manifest_sha256: str
    adoption_seed_manifest_sha256: str
    seed_snapshot_sha256: str
    adoption_sha256: str
    live_scope_sha256: str
    site_scope: str
    published_records: int
    adoption_content_sha256: str
    live_content_sha256: str
    comparison_content_sha256: str
    verified: bool = True

    def as_dict(self): return asdict(self)


def read_prerelease_seed_hashes(manifest_bytes, read_source):
    """Validate each original prerelease script before returning its byte hash.

    The reader is rooted by the caller, never by a path from an upload.
    Production archive hashes remain independently verified by the migration.
    """
    manifest = strict_json(manifest_bytes)
    require(manifest.get('schemaVersion') == 1 and manifest.get('siteScope') == 'tio2-my', 'seed scope')
    seeds = manifest.get('seeds')
    require(isinstance(seeds, list) and 0 < len(seeds) <= 10000, 'seed list')
    hashes = {}
    for seed in seeds:
        require(isinstance(seed, dict) and set(seed) == {'path', 'sha256'}, 'seed fields')
        path = seed['path']
        require(isinstance(path, str) and path.startswith('wordpress/seed/') and '\\' not in path
                and ':' not in path and '..' not in PurePosixPath(path).parts
                and PurePosixPath(path).as_posix() == path and path not in hashes
                and valid_hash(seed['sha256']), 'seed path/hash')
        data = read_source(path)
        require(isinstance(data, bytes) and digest(data) == seed['sha256'], 'prerelease seed bytes')
        hashes[path] = digest(data)
    return hashes


def verify_frontend_only_evidence(proof, identity_bytes, seed_manifest, adoption, live_scope) -> CmsEvidence:
    try:
        require(isinstance(identity_bytes, bytes), 'identity bytes')
        identity_hash = digest(identity_bytes)
        require(proof['schemaVersion'] == 'tio2-production-proof-v1' and proof['siteId'] == 'tio2-my', 'proof identity')
        prerelease = proof['prerelease']
        require(prerelease['state'] == 'PASSED' and prerelease['siteId'] == 'tio2-my'
                and prerelease['commit'] == proof['commit'] and prerelease['cmsIdentitySha256'] == identity_hash, 'prerelease proof')
        candidate = {name: proof[name] for name in ('commit', 'archiveSha256', 'manifestSha256')}
        require(isinstance(candidate['commit'], str) and re.fullmatch('[a-f0-9]{40}', candidate['commit'])
                and all(valid_hash(candidate[key]) for key in ('archiveSha256', 'manifestSha256')), 'candidate')
        identity = strict_json(identity_bytes)
        require(identity['schemaVersion'] == 1 and identity['siteScope'] == 'tio2-my', 'identity scope')
        counts = identity['counts']
        require(set(counts) == {'seedFiles', 'seededRecords', 'published', 'draft'}
                and all(type(item) is int for item in counts.values()) and counts['seedFiles'] > 0
                and counts['published'] == counts['seededRecords'] > 0 and counts['draft'] == 0, 'identity counts')
        raw_manifest = seed_manifest['manifestBytes']
        require(isinstance(raw_manifest, bytes), 'seed bytes')
        seed_hash = digest(raw_manifest)
        require(identity['seedManifestSha256'] == seed_hash and seed_manifest['candidate'] == candidate, 'seed candidate')
        manifest = strict_json(raw_manifest)
        require(manifest['schemaVersion'] == 1 and manifest['siteScope'] == 'tio2-my', 'seed scope')
        seeds = manifest['seeds']
        # Legacy seedFiles counted ledger entries; the final route seed was omitted.
        # Actual content evidence, not execution counts, establishes equivalence.
        require(isinstance(seeds, list) and 0 < counts['seedFiles'] <= len(seeds), 'seed list')
        paths, hashes = [], []
        for seed in seeds:
            require(isinstance(seed, dict) and set(seed) == {'path', 'sha256'}, 'seed fields')
            path, sha = seed['path'], seed['sha256']
            require(isinstance(path, str) and path.startswith('wordpress/seed/') and '\\' not in path
                    and '..' not in PurePosixPath(path).parts and PurePosixPath(path).as_posix() == path
                    and path not in paths and valid_hash(sha), 'seed path/hash')
            require(seed_manifest['seedSourceHashes'].get(path) == sha, 'prerelease seed source')
            paths.append(path); hashes.append(sha)
        require(identity['orderedSeedHashes'] == hashes, 'ordered seed hashes')
        require(set(seed_manifest['seedSourceHashes']) == set(paths), 'prerelease seed inventory')
        require(set(adoption) == {'siteScope', 'candidate', 'publishedRecords', 'contentSha256', 'seedManifestSha256', 'orderedSeedHashes', 'migrationManifestBytes'}, 'adoption fields')
        raw_adoption_manifest = adoption['migrationManifestBytes']
        require(isinstance(raw_adoption_manifest, bytes), 'adoption manifest bytes')
        adoption_seed_hash = digest(raw_adoption_manifest)
        adopted_manifest = strict_json(raw_adoption_manifest)
        require(set(adopted_manifest) == {'schemaVersion', 'siteId', 'seeds'}
                and adopted_manifest['schemaVersion'] == 'tio2-my-production-migration-v1'
                and adopted_manifest['siteId'] == 'tio2-my', 'actual adoption seed sequence')
        adopted_seeds = adopted_manifest['seeds']
        require(isinstance(adopted_seeds, list) and len(adopted_seeds) > 0, 'adoption seeds')
        adopted_paths, adopted_hashes = [], []
        for item in adopted_seeds:
            require(isinstance(item, dict) and set(item) == {'path', 'sha256'}, 'adoption seed fields')
            path = item['path']
            require(isinstance(path, str) and path.startswith('wordpress/seed/') and '\\' not in path
                    and '..' not in PurePosixPath(path).parts and PurePosixPath(path).as_posix() == path
                    and path not in adopted_paths and valid_hash(item['sha256']), 'adoption seed path/hash')
            adopted_paths.append(path); adopted_hashes.append(item['sha256'])
        # The original CMS adoption and a later frontend release have separate
        # identities. The caller authenticates adoption against its protected
        # plan/journal; fresh content comparison below links the two.
        adopted_candidate = adoption['candidate']
        require(isinstance(adopted_candidate, dict)
                and set(adopted_candidate) == {'commit', 'archiveSha256', 'manifestSha256'}
                and isinstance(adopted_candidate['commit'], str)
                and re.fullmatch('[a-f0-9]{40}', adopted_candidate['commit']) is not None
                and all(valid_hash(adopted_candidate[key]) for key in ('archiveSha256', 'manifestSha256')), 'adoption candidate')
        require(adoption['siteScope'] == 'tio2-my'
                and adoption['seedManifestSha256'] == adoption_seed_hash
                and adoption['orderedSeedHashes'] == adopted_hashes, 'adoption identity')
        require(type(adoption['publishedRecords']) is int and adoption['publishedRecords'] == counts['published']
                and valid_hash(adoption['contentSha256']), 'adoption content')
        require(set(live_scope) == {'siteScope', 'publishedRecords', 'contentSha256', 'observedAt', 'contentSnapshot'}, 'live fields')
        require(live_scope['siteScope'] == 'tio2-my' and type(live_scope['publishedRecords']) is int
                and live_scope['publishedRecords'] == adoption['publishedRecords']
                and live_scope['contentSha256'] == adoption['contentSha256'], 'live content')
        observed = datetime.fromisoformat(live_scope['observedAt'].replace('Z', '+00:00'))
        require(observed.tzinfo is not None and -30 <= (datetime.now(timezone.utc) - observed).total_seconds() <= 300, 'live freshness')
        verify_comparison(seed_manifest['comparisonEvidence'], candidate, identity_hash, proof, live_scope)
        seed_record = {**seed_manifest, 'manifestBytes': seed_hash}
        adoption_record = {**adoption, 'migrationManifestBytes': adoption_seed_hash}
        return CmsEvidence(identity_hash, digest(canonical(proof)), digest(canonical(candidate)), seed_hash, adoption_seed_hash,
                           digest(canonical(seed_record)), digest(canonical(adoption_record)), digest(canonical(live_scope)),
                           'tio2-my', counts['published'], adoption['contentSha256'], live_scope['contentSha256'],
                           digest(canonical(live_scope['contentSnapshot'])))
    except (KeyError, TypeError, ValueError, AttributeError, OverflowError) as error:
        raise ReleaseError('CMS evidence is incomplete or invalid') from error
