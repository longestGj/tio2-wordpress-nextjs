"""Pure verification of three independent CMS evidence objects; never writes CMS.

seed_manifest is a snapshot made only after validating the frozen archive:
manifestBytes are the original prerelease seed manifest, candidate is its three
release identity fields, and archiveFiles maps validated member paths to hashes.
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


@dataclass(frozen=True)
class CmsEvidence:
    prerelease_identity_sha256: str
    proof_sha256: str
    candidate_sha256: str
    seed_manifest_sha256: str
    seed_snapshot_sha256: str
    adoption_sha256: str
    live_scope_sha256: str
    site_scope: str
    published_records: int
    adoption_content_sha256: str
    live_content_sha256: str
    verified: bool = True

    def as_dict(self): return asdict(self)


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
        require(isinstance(seeds, list) and len(seeds) > 0, 'seed list')
        paths, hashes = [], []
        for seed in seeds:
            require(isinstance(seed, dict) and set(seed) == {'path', 'sha256'}, 'seed fields')
            path, sha = seed['path'], seed['sha256']
            require(isinstance(path, str) and path.startswith('wordpress/seed/') and '\\' not in path
                    and '..' not in PurePosixPath(path).parts and PurePosixPath(path).as_posix() == path
                    and path not in paths and valid_hash(sha), 'seed path/hash')
            require(seed_manifest['archiveFiles'].get(path) == sha, 'archived seed')
            paths.append(path); hashes.append(sha)
        require(identity['orderedSeedHashes'] == hashes, 'ordered seed hashes')
        require(set(adoption) == {'siteScope', 'candidate', 'publishedRecords', 'contentSha256', 'seedManifestSha256', 'orderedSeedHashes'}, 'adoption fields')
        require(adoption['candidate'] == candidate and adoption['siteScope'] == 'tio2-my'
                and adoption['seedManifestSha256'] == seed_hash and adoption['orderedSeedHashes'] == hashes, 'adoption identity')
        require(type(adoption['publishedRecords']) is int and adoption['publishedRecords'] == counts['published']
                and valid_hash(adoption['contentSha256']), 'adoption content')
        require(set(live_scope) == {'siteScope', 'publishedRecords', 'contentSha256', 'observedAt'}, 'live fields')
        require(live_scope['siteScope'] == 'tio2-my' and type(live_scope['publishedRecords']) is int
                and live_scope['publishedRecords'] == adoption['publishedRecords']
                and live_scope['contentSha256'] == adoption['contentSha256'], 'live content')
        observed = datetime.fromisoformat(live_scope['observedAt'].replace('Z', '+00:00'))
        require(observed.tzinfo is not None and -30 <= (datetime.now(timezone.utc) - observed).total_seconds() <= 300, 'live freshness')
        seed_record = {**seed_manifest, 'manifestBytes': seed_hash}
        return CmsEvidence(identity_hash, digest(canonical(proof)), digest(canonical(candidate)), seed_hash,
                           digest(canonical(seed_record)), digest(canonical(adoption)), digest(canonical(live_scope)),
                           'tio2-my', counts['published'], adoption['contentSha256'], live_scope['contentSha256'])
    except (KeyError, TypeError, ValueError, AttributeError, OverflowError) as error:
        raise ReleaseError('CMS evidence is incomplete or invalid') from error
