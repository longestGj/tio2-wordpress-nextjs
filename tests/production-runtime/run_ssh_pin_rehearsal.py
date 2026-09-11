"""Local SSH-only controller pin regression; no CMS, deployment or remote target."""
import json, os, socket, subprocess, sys, time, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMAGE = 'sha256:b2a4521a35489def1d699f65d7c86140c01ba01b26080eb725ea99306dbc69ce'

def command(*args, data=None, check=True):
    return subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check, timeout=60)

def run():
    run_id = 'tio2-ssh-pin-' + uuid.uuid4().hex
    folder = ROOT / '.tmp/task4' / run_id
    folder.mkdir(parents=True)
    result = {'runId': run_id, 'scope': 'local OpenSSH pin only; status endpoint is a fixture', 'cases': []}
    # Do not stop or replace another listener. Docker bind is the final arbiter.
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 22))
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0)); alternate = probe.getsockname()[1]
    container = None
    private = folder / 'client-key'
    try:
        container = command('docker', 'run', '-d', '--name', run_id, '--label', 'tio2.task4=' + run_id,
                            '--network', 'bridge', '--publish', '127.0.0.1:22:22', '--publish', f'127.0.0.1:{alternate}:22', IMAGE).stdout.decode().strip()
        def execute(*args, data=None):
            return command('docker', 'exec', '-i', container, *args, data=data).stdout
        execute('sh', '-c', 'id deploy >/dev/null 2>&1 || useradd -m -s /bin/sh deploy; usermod -p "*" deploy; mkdir -p /run/sshd /home/deploy/.ssh; chmod 700 /home/deploy/.ssh')
        for name in ('host', 'client', 'wrong'):
            execute('ssh-keygen', '-t', 'ed25519', '-N', '', '-f', '/root/' + name)
        private.write_bytes(execute('cat', '/root/client'))
        if os.name == 'nt':
            command('icacls', str(private), '/inheritance:r')
            command('icacls', str(private), '/grant:r', os.environ['USERNAME'] + ':F')
        else:
            private.chmod(0o600)
        execute('sh', '-c', 'cat > /home/deploy/.ssh/authorized_keys; chown -R deploy:deploy /home/deploy/.ssh; chmod 600 /home/deploy/.ssh/authorized_keys', data=execute('cat', '/root/client.pub'))
        execute('sh', '-c', 'cat > /root/pin-sshd.conf', data=b'Port 22\nListenAddress 0.0.0.0\nHostKey /root/host\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nPermitRootLogin no\nAllowUsers deploy\nUsePAM no\nLogLevel VERBOSE\n')
        execute('sh', '-c', 'cat > /usr/local/sbin/tio2-release; chmod 755 /usr/local/sbin/tio2-release', data=b'#!/bin/sh\n[ "$1" = status ] || exit 99\necho status >> /tmp/pin-actions\nprintf \'%s\\n\' \'{"action":"status","ok":true,"state":{"state":"IDLE"}}\'\n')
        execute('sh', '-c', 'cat > /etc/sudoers.d/pin-status; chmod 440 /etc/sudoers.d/pin-status', data=b'deploy ALL=(root) NOPASSWD: /usr/local/sbin/tio2-release status\n')
        execute('/usr/sbin/sshd', '-f', '/root/pin-sshd.conf', '-E', '/root/pin-sshd.log')
        for port in (22, alternate):
            for attempt in range(20):
                try:
                    with socket.create_connection(('127.0.0.1', port), timeout=1): pass
                    break
                except OSError:
                    if attempt == 19: raise
                    time.sleep(.1)
            for correct in (True, False):
                case = folder / f'{port}-{"correct" if correct else "wrong"}'
                case.mkdir()  # fresh run: cannot fail at pre-existing connection binding
                key = ' '.join(execute('cat', '/root/' + ('host' if correct else 'wrong') + '.pub').decode().split()[:2])
                config = {'siteId': 'tio2-my', 'host': '127.0.0.1', 'port': port, 'username': 'deploy', 'hostKey': key,
                          'identityFile': str(private), 'baselineSha256': 'a' * 64}
                config_path = folder / (case.name + '.json')
                config_path.write_text(json.dumps(config))
                process = command('pwsh', '-NoProfile', '-File', str(ROOT / 'scripts/production.ps1'), '-Operation', 'Status',
                                  '-ConfigPath', str(config_path), '-RunRoot', str(case), check=False)
                assert (process.returncode == 0) == correct, process.stderr.decode(errors='replace')
                if correct:
                    assert json.loads(process.stdout)['state']['state'] == 'IDLE'
                else:
                    failure = json.loads((case / 'transport-failure.json').read_text())
                    assert failure['exitCode'] == 255 and not failure['completed']
                lookup = '127.0.0.1' if port == 22 else f'[127.0.0.1]:{port}'
                assert (case / 'known_hosts').read_text() == lookup + ' ' + key + '\n'
                result['cases'].append({'port': port, 'correctPin': correct, 'exitCode': process.returncode, 'passed': True})
        assert execute('cat', '/tmp/pin-actions').decode().splitlines() == ['status', 'status']
        result['remoteStatusExecutions'] = 2
        (folder / 'sshd.log').write_bytes(execute('cat', '/root/pin-sshd.log'))
        result['passed'] = True
    finally:
        pending = sys.exc_info()[1]
        try:
            if container:
                observed = json.loads(command('docker', 'inspect', container).stdout)[0]
                assert observed['Config']['Labels']['tio2.task4'] == run_id
                command('docker', 'rm', '-f', container)
                result['cleanupVerified'] = True
        except Exception as error:
            result['cleanupVerified'] = False
            result['cleanupError'] = str(error)
            if pending is None: raise
        finally:
            private.unlink(missing_ok=True)
            (folder / 'evidence.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'evidence': str(folder / 'evidence.json'), **result}))

if __name__ == '__main__':
    if sys.argv[1:] != ['--isolated']:
        raise SystemExit('--isolated required; only local loopback ports are allowed')
    run()
