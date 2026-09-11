"""Local SSH-only controller pin regression; no CMS, deployment or remote target."""
import hashlib, json, os, socket, subprocess, sys, time, uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMAGE = 'sha256:b2a4521a35489def1d699f65d7c86140c01ba01b26080eb725ea99306dbc69ce'

def command(*args, data=None, check=True):
    return subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=check, timeout=60)

def run():
    run_id = 'tio2-ssh-pin-' + uuid.uuid4().hex
    folder = ROOT / '.tmp/task4' / run_id
    folder.mkdir(parents=True)
    result = {'runId': run_id, 'scope': 'local OpenSSH pins plus actual root rollback intent guard; Status interleaving is a fixture', 'cases': []}
    # Do not stop or replace another listener. Docker bind is the final arbiter.
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 22))
    with socket.socket() as probe:
        probe.bind(('127.0.0.1', 0)); alternate = probe.getsockname()[1]
    container = None
    private = folder / 'client-key'
    try:
        container = command('docker', 'run', '-d', '--name', run_id, '--label', 'tio2.task4=' + run_id,
                            '--network', 'bridge', '--publish', '127.0.0.1:22:22', '--publish', f'127.0.0.1:{alternate}:22',
                            '--mount', 'type=bind,source='+str(ROOT)+',target=/workspace,readonly', IMAGE).stdout.decode().strip()
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
        # Actual stdin transport into current main/root rollback guard. Only the
        # Status test hook simulates another completed publisher B -> C.
        case=folder/'interleaved-rollback';case.mkdir()
        digest=lambda value:hashlib.sha256(value).hexdigest()
        archive=b'local wire protocol fixture';(case/'release.tar.gz').write_bytes(archive)
        manifest={'siteId':'tio2-my','commit':'b'*40,'archiveSha256':digest(archive)}
        (case/'release-manifest.json').write_text(json.dumps(manifest))
        proof={'commit':manifest['commit'],'archiveSha256':manifest['archiveSha256'],'manifestSha256':digest((case/'release-manifest.json').read_bytes())}
        (case/'release-proof.json').write_text(json.dumps(proof))
        candidate={**proof,'proofSha256':digest((case/'release-proof.json').read_bytes())}
        (case/'prepare.json').write_text(json.dumps({'action':'prepare','ok':True,'state':'PREPARED','candidate':candidate,'active':{'enrollmentSha256':'a'*64}}))
        details={'candidate':candidate,'active':{'enrollmentSha256':'d'*64},'deploymentEvidence':{'baselineSha256':'a'*64,'backupId':'20260911T000000Z-'+'b'*40+'-'+'a'*32}}
        state={'state':'PUBLIC_VERIFIED','details':details}
        execute('sh','-c','mkdir -p /opt/tio2-production/state; chmod 700 /opt/tio2-production/state; cat > /opt/tio2-production/state/state.json; chmod 600 /opt/tio2-production/state/state.json',data=json.dumps(state).encode())
        wrapper='''#!/usr/bin/python3
import json,sys
from pathlib import Path
sys.path.insert(0,'/workspace/ops/production/server')
import tio2_release
from release_state import atomic_write_json
original=tio2_release.run_action
parse=tio2_release.read_rollback_intent
def capture(stream):
 value=parse(stream);Path('/root/received-intent.json').write_text(json.dumps(value));return value
def action(name,paths,**options):
 try:
  result=original(name,paths,**options)
 except Exception as error:
  Path('/root/guard-error.txt').write_text(str(error));raise
 flag=Path('/root/interleave')
 if name=='status' and flag.exists():
  flag.unlink()
  changed=json.loads(json.dumps(result['state']))
  changed['details']['candidate']['commit']='c'*40
  changed['details']['active']['enrollmentSha256']='e'*64
  changed['details']['deploymentEvidence']['backupId']='20260911T000001Z-'+'c'*40+'-'+'b'*32
  atomic_write_json(paths.production/'state/state.json',changed)
 return result
tio2_release.read_rollback_intent=capture;tio2_release.run_action=action
raise SystemExit(tio2_release.main())
'''
        execute('sh','-c','cat > /usr/local/sbin/tio2-release; chmod 755 /usr/local/sbin/tio2-release; touch /root/interleave',data=wrapper.encode())
        execute('sh','-c','cat >> /etc/sudoers.d/pin-status',data=b'deploy ALL=(root) NOPASSWD: /usr/local/sbin/tio2-release rollback\n')
        config['port']=alternate;config['hostKey']=' '.join(execute('cat','/root/host.pub').decode().split()[:2])
        config_path=folder/'rollback-config.json';config_path.write_text(json.dumps(config))
        process=command('pwsh','-NoProfile','-File',str(ROOT/'scripts/production.ps1'),'-Operation','Rollback','-ConfigPath',str(config_path),'-RunRoot',str(case),check=False)
        assert process.returncode!=0
        received=json.loads(execute('cat','/root/received-intent.json'))
        assert received==json.loads((case/'rollback-intent.json').read_text())
        assert received['candidate']==candidate and received['activeBaselineSha256']=='d'*64
        assert execute('cat','/root/guard-error.txt').decode()=='rollback expected candidate changed'
        after=json.loads(execute('cat','/opt/tio2-production/state/state.json'))
        assert after['state']=='PUBLIC_VERIFIED' and after['details']['candidate']['commit']=='c'*40
        execute('test','!','-e','/opt/tio2-production/state/deployment-journal.json')
        result['rollbackInterleaving']={'realStdinIntent':True,'observedCandidate':'b'*40,'currentCandidate':'c'*40,'rootRejectedBeforeJournalOrActivation':True,'statePreserved':True}
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
