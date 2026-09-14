"""Build the bounded TiO2 Malaysia GA4 legal CMS content package.

The package contains data only. It never connects to WordPress or performs a release.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path


EXPECTED_IDS = ('LEGAL-COOKIE-EN', 'LEGAL-PRIV-EN', 'LEGAL-PRIV-MS')
ACTIVE_STATE = 'verified_google_analytics_active'


def canonical(value: object) -> bytes:
    return json.dumps(
        value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False,
    ).encode('utf-8')


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def build_package(source: dict) -> dict:
    _require(source.get('packageId') == 'LEGAL-PRIVACY-GA4-G6-DELIVERY-01', 'unexpected legal delivery identity')
    _require(source.get('schemaVersion') == 'legal-pages-v0.2-malaysia', 'unexpected legal source schema')
    _require(source.get('siteScope') == 'tio2-my', 'unexpected legal site scope')
    _require(source.get('releaseState') == ACTIVE_STATE, 'legal source is not the active GA4 delivery')
    controls = source.get('releaseControls')
    _require(isinstance(controls, dict) and controls.get('optionalAnalyticsAuthorized') is True, 'optional analytics is not authorized')
    pages = source.get('pages')
    _require(isinstance(pages, list) and len(pages) == 3, 'legal source must contain exactly three pages')
    by_id = {page.get('pageId'): page for page in pages if isinstance(page, dict)}
    _require(tuple(sorted(by_id)) == EXPECTED_IDS and len(by_id) == 3, 'legal page identities are incomplete or duplicated')
    _require(all(page.get('releaseState') == ACTIVE_STATE for page in by_id.values()), 'a legal page is not in the active GA4 state')

    cookie = by_id['LEGAL-COOKIE-EN'].get('buyerVisibleMarkdown', '')
    privacy_en = by_id['LEGAL-PRIV-EN'].get('buyerVisibleMarkdown', '')
    privacy_ms = by_id['LEGAL-PRIV-MS'].get('buyerVisibleMarkdown', '')
    for marker in (
        'Google Analytics is active for aggregate website measurement',
        '| `tio2_my_consent_v1` | TiO2 Malaysia | Local Storage |',
        '| `_ga` | Google Analytics | Cookie |',
        '| `_ga_QDHLMRH2WB` | Google Analytics | Cookie |',
        'Up to 2 years',
        '`ad_storage`, `ad_user_data` and `ad_personalization`',
    ):
        _require(marker in cookie, f'Cookie Policy is missing the active marker: {marker}')
    _require('We use Google Analytics, delivered through Google Tag Manager' in privacy_en, 'English Privacy Policy is not active')
    _require('Kami menggunakan Google Analytics, yang disampaikan melalui Google Tag Manager' in privacy_ms, 'BM Privacy Policy is not active')
    encoded_source = canonical(source)
    for placeholder in (b'[FINAL_CONSENT_STORAGE_KEY]', b'[PROPERTY_SPECIFIC_GA_COOKIE_NAME]', b'OPEN_RUNTIME_'):
        _require(placeholder not in encoded_source, f'unresolved legal placeholder: {placeholder.decode()}')

    records = [{'pageId': page_id, 'content': by_id[page_id]} for page_id in EXPECTED_IDS]
    return {
        'schemaVersion': 'd16-content-package-v1',
        'siteId': 'tio2-my',
        'records': records,
        'files': [],
        'contentSha256': hashlib.sha256(canonical(records)).hexdigest(),
    }


def write_new(path: Path, value: dict) -> None:
    path = path.resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        raise FileExistsError(f'output already exists: {path}')
    handle, temporary = tempfile.mkstemp(prefix=f'.{path.name}.', suffix='.tmp', dir=path.parent)
    try:
        with os.fdopen(handle, 'w', encoding='utf-8', newline='\n') as stream:
            json.dump(value, stream, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)
            stream.write('\n')
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    raw = args.source.read_bytes()
    source = json.loads(raw)
    package = build_package(source)
    write_new(args.output, package)
    print(json.dumps({
        'output': str(args.output.resolve()),
        'sourceSha256': hashlib.sha256(raw).hexdigest(),
        'contentSha256': package['contentSha256'],
        'pageIds': list(EXPECTED_IDS),
    }, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
