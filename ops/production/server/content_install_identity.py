"""Live installation bindings independent of the not-yet-installed CMS manifest."""
import hashlib
import json
from pathlib import PurePosixPath
import re
import subprocess

from release_contract import ReleaseError


WP_DATABASE_IDENTITY = """define('DISABLE_WP_CRON',true);
require '/var/www/html/wp-load.php';
$row=$wpdb->get_row('SELECT DATABASE() AS databaseName, @@hostname AS databaseHostname',ARRAY_A);
if(!$row){exit(2);}echo json_encode($row,JSON_THROW_ON_ERROR);"""


def observe_database_binding(resources_config, database_runtime):
    """Require HTTP WordPress and the administrator client to reach the same DB."""
    name = resources_config.get('database')
    wordpress = resources_config.get('wordpressContainer')
    if (not isinstance(name, str) or not re.fullmatch('[A-Za-z][A-Za-z0-9_]{0,63}', name)
            or database_runtime.config.get('database') != name
            or not isinstance(wordpress, str) or not re.fullmatch('[a-z][a-z0-9_-]{0,100}', wordpress)):
        raise ReleaseError('invalid installation database identity configuration')
    try:
        raw = database_runtime.docker('exec', wordpress, 'php', '-r', WP_DATABASE_IDENTITY)
        if len(raw) > 4096:
            raise ReleaseError('invalid WordPress database identity response')
        actual = json.loads(raw)
        # The administrator transport intentionally has no default schema.
        expected = database_runtime.sql('USE `' + name + '`; SELECT DATABASE(), @@hostname;').split('\t')
        if (not isinstance(actual, dict) or set(actual) != {'databaseName', 'databaseHostname'}
                or actual.get('databaseName') != name or len(expected) != 2 or expected[0] != name
                or not isinstance(actual.get('databaseHostname'), str)
                or not re.fullmatch('[A-Za-z0-9_.-]{1,255}', actual['databaseHostname'])
                or actual['databaseHostname'] != expected[1]):
            raise ReleaseError('WordPress and installation administrator database identities differ')
        return actual
    except (ValueError, TypeError, KeyError, UnicodeError) as error:
        raise ReleaseError('invalid installation database identity evidence') from error


def _run(args):
    try:
        result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ReleaseError('installation frontend identity command failed') from error
    if result.returncode:
        raise ReleaseError('installation frontend identity command failed')
    return result.stdout


def observe_frontend_identity(hooks_config, *, run=None):
    """Capture immutable container/config/Build evidence without CMS-manifest reads."""
    container = hooks_config.get('frontendContainer')
    build_path = hooks_config.get('buildIdFile')
    if (hooks_config.get('siteId') != 'tio2-my' or not isinstance(container, str)
            or not re.fullmatch('[a-z][a-z0-9_-]{0,100}', container)
            or not isinstance(build_path, str) or not re.fullmatch('/[A-Za-z0-9_./-]+', build_path)
            or '..' in PurePosixPath(build_path).parts):
        raise ReleaseError('invalid installation frontend identity configuration')
    run = run or _run
    try:
        raw = run(['docker', 'inspect', container])
        if len(raw) > 1024 * 1024:
            raise ReleaseError('frontend inspection exceeds identity limit')
        observed = json.loads(raw)
        if not isinstance(observed, list) or len(observed) != 1 or not isinstance(observed[0], dict):
            raise ReleaseError('frontend inspection identity is ambiguous')
        value = observed[0]
        site_values = [item for item in value['Config'].get('Env', []) if item.startswith('SITE_ID=')]
        if (value['State']['Running'] is not True or value['HostConfig'].get('Privileged')
                or site_values != ['SITE_ID=tio2-my']
                or not re.fullmatch('[a-f0-9]{64}', value['Id'])
                or not re.fullmatch('sha256:[a-f0-9]{64}', value['Image'])):
            raise ReleaseError('frontend is not the running MY installation subject')
        build = run(['docker', 'exec', container, 'head', '-c', '257', build_path]).decode().strip()
        if not re.fullmatch('[A-Za-z0-9_.-]{1,128}', build):
            raise ReleaseError('frontend Build identity is invalid')
        material = {key: value.get(key) for key in ('Config', 'HostConfig', 'Mounts')}
        material['Mounts'] = sorted(material['Mounts'] or [], key=lambda mount: mount['Destination'])
        return {'containerId': value['Id'], 'imageId': value['Image'], 'buildId': build,
                'configurationSha256': hashlib.sha256(json.dumps(material, sort_keys=True, separators=(',', ':')).encode()).hexdigest()}
    except (ValueError, TypeError, KeyError, UnicodeError, AttributeError) as error:
        raise ReleaseError('invalid installation frontend identity evidence') from error


def assert_frontend_identity(hooks_config, expected, *, run=None):
    actual = observe_frontend_identity(hooks_config, run=run)
    if actual != expected:
        raise ReleaseError('frontend changed since installation plan')
    return actual
