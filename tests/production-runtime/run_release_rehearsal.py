"""Run only local labeled SSH/installed-program/controller/browser rehearsal."""
import hashlib,json,os,shutil,socket,subprocess,sys,time
from pathlib import Path
from update_rollback import UpdateRehearsal,ROOT

REUSE=ROOT/'.tmp/task3/reuse/tio2-update-test-84e4137a60264b20b140b7252ac69ce8'
EVIDENCE=ROOT/'.superpowers/sdd/2026-09-11-release-tooling-revised'
class ReleaseRehearsal(UpdateRehearsal):
    def __init__(self):
        super().__init__();self.run_id=self.run_id.replace('update-test','controller-test');self.evidence_prefix='task-4'
        self.run_root=ROOT/'.tmp/task4'/self.run_id;self.run_root.mkdir(parents=True)
    def ports(self):
        values=super().ports()
        if not hasattr(self,'cached_cms_reserved'):
            # Reuse the original build ARG only when the local port is free.
            # This is a cache optimization, never a runtime identity assertion.
            with socket.socket() as probe:probe.bind(('127.0.0.1',50272))
            values[0]=50272;self.cached_cms_reserved=True
        return values
    def inspect(self,kind,name):
        if kind=='image' and name=='tio2-update-runtime:task3':name='tio2-release-runtime:task4'
        return super().inspect(kind,name)
    def controller(self,operation,*,config=None,popen=False):
        argv=['pwsh','-NoProfile','-File',str(ROOT/'scripts/production.ps1'),'-Operation',operation,'-ConfigPath',str(config or self.config_path),'-RunRoot',str(self.run_root)]
        if popen:return subprocess.Popen(argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=ROOT)
        p=subprocess.run(argv,stdout=subprocess.PIPE,stderr=subprocess.PIPE,cwd=ROOT,timeout=3600)
        (self.run_root/(operation+'.stdout')).write_bytes(p.stdout);(self.run_root/(operation+'.stderr')).write_bytes(p.stderr)
        if p.returncode:raise RuntimeError('controller '+operation+' failed: '+p.stderr.decode(errors='replace')[-900:])
        return json.loads(p.stdout)
    def setup_ssh(self):
        self.ssh_port=self.ports()[0];backend_port=self.ssh_port
        self.exec(self.server,'ssh-keygen','-t','ed25519','-N','','-f','/root/task4-host')
        self.exec(self.server,'ssh-keygen','-t','ed25519','-N','','-f','/root/task4-client')
        key=self.exec(self.server,'cat','/root/task4-client');private=self.directory/'client-key';private.write_bytes(key)
        # Windows OpenSSH accepts only the owner on private files.
        if os.name=='nt':
            subprocess.run(['icacls',str(private),'/inheritance:r'],stdout=subprocess.DEVNULL,check=True)
            subprocess.run(['icacls',str(private),'/grant:r',os.environ['USERNAME']+':F'],stdout=subprocess.DEVNULL,check=True)
        authorized=self.exec(self.server,'cat','/root/task4-client.pub')
        self.exec(self.server,'sh','-c','mkdir -p /home/deploy/.ssh; chmod 700 /home/deploy/.ssh; cat > /home/deploy/.ssh/authorized_keys; chown -R deploy:deploy /home/deploy/.ssh; chmod 600 /home/deploy/.ssh/authorized_keys',data=authorized)
        self.exec(self.server,'usermod','-p','*','deploy')
        configuration=('Port '+str(self.ssh_port)+'\nListenAddress 0.0.0.0\nHostKey /root/task4-host\nPasswordAuthentication no\nKbdInteractiveAuthentication no\nPubkeyAuthentication yes\nPermitRootLogin no\nAllowUsers deploy\nUsePAM no\nSubsystem sftp internal-sftp\nPidFile /run/task4-sshd.pid\n')
        self.exec(self.server,'sh','-c','mkdir -p /run/sshd; cat > /root/task4-sshd.conf',data=configuration.encode())
        self.exec(self.server,'/usr/sbin/sshd','-f','/root/task4-sshd.conf','-E','/root/task4-sshd.log')
        # Docker Desktop host-network listeners are not necessarily forwarded to
        # Windows. Publish only this owned SSH relay on loopback.
        gateway=self.inspect('network','bridge')['IPAM']['Config'][0]['Gateway']
        self.ssh_port=self.ports()[0]
        def relay_code(port,host,target):
            return "import socket,select,threading; s=socket.socket();s.bind(('0.0.0.0',"+str(port)+"));s.listen();\ndef forward(a):\n b=socket.create_connection(('"+host+"',"+str(target)+"));\n try:\n  while True:\n   for x in select.select([a,b],[],[])[0]:\n    data=x.recv(65536)\n    if not data:return\n    (b if x is a else a).sendall(data)\n finally:a.close();b.close()\nwhile True:threading.Thread(target=forward,args=(s.accept()[0],),daemon=True).start()"
        self.public_port=self.ports()[0];proxy_backend=self.ports()[0]
        relay_id=self.container('ssh-relay',self.images['runtime']['Id'],'--network','bridge','--publish','127.0.0.1:'+str(self.ssh_port)+':2222','--publish','127.0.0.1:'+str(self.public_port)+':2223')
        self.docker('exec','-d',relay_id,'python3','-c',relay_code(2222,gateway,backend_port))
        self.docker('exec','-d',self.server,'python3','-c',relay_code(proxy_backend,'127.0.0.1',self.fixture_ports[1]))
        self.docker('exec','-d',relay_id,'python3','-c',relay_code(2223,gateway,proxy_backend))
        hostkey=' '.join(self.exec(self.server,'cat','/root/task4-host.pub').decode().split()[:2])
        baseline=json.loads(self.exec(self.server,'cat','/etc/tio2-production/baseline.json'))
        # Baseline identity is the SHA over canonical enrollment record bytes.
        status=json.loads(self.exec(self.server,'python3','-B','-c',"import sys,json;sys.path.insert(0,'/opt/tio2-production/program');from release_baseline import validate_baseline;from release_contract import DEFAULT_PATHS;print(json.dumps(validate_baseline(DEFAULT_PATHS)['active']))"))
        age=self.directory/'identity.age';age.write_bytes(self.exec(self.client,'cat','/client/key.txt'))
        self.config={'siteId':'tio2-my','host':'127.0.0.1','port':self.ssh_port,'username':'deploy','hostKey':hostkey,'identityFile':str(private),'baselineSha256':status['enrollmentSha256'],'recoveryImageId':self.images['runtime']['Id'],'dockerContext':'desktop-linux','ageIdentityFile':str(age)}
        self.config_path=self.directory/'controller.json';self.config_path.write_text(json.dumps(self.config))
        # Non-secret runtime identity survives cleanup for review.
        (self.run_root/'fixture.json').write_text(json.dumps({'runId':self.run_id,'ports':self.fixture_ports,'sshPort':self.ssh_port,'publicProxyPort':self.public_port,'hostKey':hostkey,'baselineSha256':status['enrollmentSha256'],'imageId':self.images['runtime']['Id'],'platform':'linux/amd64','sourceProvenance':'Task3 fixture archive, not clean main'}))
    def run(self):
        result={'runId':self.run_id,'productionValidated':False,'platform':'linux/amd64'}
        try:
            for required in (REUSE/'release.tar.gz',REUSE/'release-manifest.json',REUSE/'release-proof.json',Path('D:/16Wordpress_nextjs/.env.prerelease.local'),Path('D:/16Wordpress_nextjs/node_modules/@playwright/test/cli.js')):
                if not required.is_file():raise RuntimeError('recorded development replay prerequisite missing: '+str(required))
            self.prepare();self.setup_ssh();print(json.dumps({'stage':'local-SSH-ready','runId':self.run_id}),flush=True)
            for name in ('release.tar.gz','release-manifest.json','release-proof.json'):shutil.copyfile(REUSE/name,self.run_root/name)
            require_hash=hashlib.sha256((self.run_root/'release.tar.gz').read_bytes()).hexdigest()
            assert require_hash=='a8403f155299b84b0792e84c13a724e889e1652e2b8d1929a0f6dc7fb511f215'
            result['status']=self.controller('Status')
            bad=self.directory/'wrong-pin.json'; wrong=dict(self.config);wrong['hostKey']=wrong['hostKey'][:-2]+'AA';bad.write_text(json.dumps(wrong))
            try:self.controller('Status',config=bad)
            except RuntimeError:result['wrongHostPinRejected']=True
            else:raise RuntimeError('wrong SSH host pin accepted')
            # A fresh run binding is restored to its original pin; wrong pin test
            # uses an existing run and is expected to stop before transport.
            first=self.controller('Release',popen=True)
            deadline=time.monotonic()+240
            while not (self.run_root/'backup-request.json').exists():
                if first.poll() is not None:raise RuntimeError('early controller exit: '+first.communicate()[1].decode()[-900:])
                if time.monotonic()>deadline:raise RuntimeError('request persistence timeout')
                time.sleep(.1)
            request=(self.run_root/'backup-request.json').read_bytes()
            first.terminate();first.communicate(timeout=30)
            result['interruptedAfterDurableRequest']=True
            # Server may be completing the dispatched backup after client loss.
            for _ in range(90):
                try:
                    state=self.controller('Status')['state']['state']
                    if state in ('PREPARED','BACKED_UP'):break
                except RuntimeError:pass
                time.sleep(1)
            print(json.dumps({'stage':'durable-request-interrupted'}),flush=True)
            result['release']=self.controller('Release')
            assert (self.run_root/'backup-request.json').read_bytes()==request
            result['requestBytesReused']=True
            result['repeatRelease']=self.controller('Release')
            print(json.dumps({'stage':'controller-B-verified'}),flush=True)
            baseline=json.loads(self.exec(self.server,'cat','/etc/tio2-production/baseline.json'))
            result['activeImage']=next(c['imageId'] for c in baseline['runtime']['containers'] if c['role']=='web');result['buildId']=baseline['runtime']['deployment']['buildId']
            web=next(c['id'] for c in baseline['runtime']['containers'] if c['role']=='web')
            assert result['buildId']==self.docker('exec',web,'cat','/app/.next/BUILD_ID').decode().strip()
            result['currentImageScan']=self.scan_image(result['activeImage'])
            env={**os.environ,'TIO2_PRODUCTION_BASE_URL':'http://127.0.0.1:'+str(self.public_port),'TIO2_EXPECT_RELEASE':'b'*40,'TIO2_PRODUCTION_ARTIFACTS':str(self.run_root/'browser'),'TIO2_PRODUCTION_REPORT':str(self.run_root/'browser.json')}
            p=subprocess.run(['node','D:/16Wordpress_nextjs/node_modules/@playwright/test/cli.js','test','--config=tests/fixtures/production/playwright.fixture.config.ts'],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=1800)
            (self.run_root/'browser.log').write_bytes(p.stdout);result['browserExit']=p.returncode
            result['rollback']=self.controller('Rollback');result['repeatRollback']=self.controller('Rollback');result['verifyRollback']=self.controller('Verify')
            assert result['rollback']['databaseRestored'] is False
            print(json.dumps({'stage':'controller-rollback-verified','browserExit':p.returncode}),flush=True)
            if p.returncode:raise RuntimeError('actual public surface verification failed; inspect browser.log')
            result['result']='passed'
        except BaseException:
            if hasattr(self,'server'):
                for filename in ('state.json','deployment-journal.json'):
                    try:(self.run_root/filename).write_bytes(self.exec(self.server,'cat','/opt/tio2-production/state/'+filename))
                    except Exception:pass
                try:
                    observed=json.loads((self.run_root/'state.json').read_text())
                    if observed['state'] not in ('FAILED','DEPLOYING','BACKED_UP'):raise RuntimeError('deploy diagnostic is not applicable to '+observed['state'])
                    diagnostic=self.exec(self.server,'python3','-B','/workspace/tests/production-runtime/update_runtime_server.py','diagnose',data=json.dumps({'action':'deploy'}).encode(),timeout=3600)
                    (self.run_root/'diagnostic-deploy.json').write_bytes(diagnostic)
                except Exception as e:
                    (self.run_root/'diagnostic-error.txt').write_text(str(e))
                    try:(self.run_root/'build-diagnostic.log').write_bytes(self.exec(self.server,'cat','/root/deploy-build-diagnostic.log'))
                    except Exception:pass
            if hasattr(self,'config') and (self.run_root/'backup.json').exists():
                recovery_key=self.run_root/'fixture-recovery.agekey'; recovery_key.write_bytes(Path(self.config['ageIdentityFile']).read_bytes())
                if os.name=='nt':
                    subprocess.run(['icacls',str(recovery_key),'/inheritance:r'],stdout=subprocess.DEVNULL,check=True)
                    subprocess.run(['icacls',str(recovery_key),'/grant:r',os.environ['USERNAME']+':F'],stdout=subprocess.DEVNULL,check=True)
            if hasattr(self,'server'):
                try:(self.run_root/'sshd.log').write_bytes(self.exec(self.server,'cat','/root/task4-sshd.log'))
                except Exception:pass
            raise
        finally:
            if hasattr(self,'server'):
                try:
                    state=json.loads(self.exec(self.server,'cat','/opt/tio2-production/state/state.json'))
                    if state.get('details',{}).get('backupId'):self.backup_ids.append(state['details']['backupId'])
                except Exception:pass
            pending=sys.exc_info()[1]
            if pending is not None:result['failure']={'type':type(pending).__name__,'message':str(pending)}
            try:
                self.cleanup();result['cleanupVerified']=True
            except Exception as cleanup_error:
                result['cleanupVerified']=False;result['cleanupError']={'type':type(cleanup_error).__name__,'message':str(cleanup_error)}
                if pending is None:raise
            finally:
                (EVIDENCE/'task-4-runtime-evidence.json').write_text(json.dumps(result,indent=2))
        print(json.dumps({'runId':self.run_id,'result':result.get('result'),'browserExit':result.get('browserExit'),'cleanupVerified':result['cleanupVerified']}))
if __name__=='__main__':
    if sys.argv[1:]!=['--isolated']:raise SystemExit('explicit --isolated required; no production target options')
    ReleaseRehearsal().run()
