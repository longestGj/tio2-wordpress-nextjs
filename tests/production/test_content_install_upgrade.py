import copy
import hashlib
import json
from pathlib import Path
import unittest

from tests.production.test_content_install_resources import DockerFixture, InstallationResourcesTests
from content_release import canonical
from content_install_resources import InstallationResources
from release_contract import ReleaseError


class MultipleDockerFixture(DockerFixture):
    def __init__(self, plugin):
        super().__init__(plugin)
        self.containers = {}
        self.serial = 0
        self.fail_after_rename = False
        self.fail_after_stop = False
        self.fail_after_create = False

    def __call__(self, *args, data=None):
        def find(name):
            return next((v for k,v in self.containers.items() if k == name or v['Id'] == name), None)
        if args[0] == 'ps':
            name = args[args.index('--filter')+1].removeprefix('name=^/').removesuffix('$')
            return (name+'\n').encode() if name in self.containers else b''
        target=args[-1] if args[0] in {'rm','stop'} else (args[1] if len(args)>1 else '')
        if args[0] in {'inspect','start','stop','rm','rename'} and target not in ('wp',self.wp['Id']):
            name = target
            value = find(name)
            if value is None: raise ReleaseError('missing container')
            if args[0]=='inspect': return json.dumps([value]).encode()
            if args[0] in {'start','stop'}:
                value['State']['Running']=args[0]=='start'
                if args[0]=='stop' and self.fail_after_stop:
                    self.fail_after_stop=False;raise ReleaseError('injected disconnect after stop')
                return b''
            key=next(k for k,v in self.containers.items() if v is value)
            if args[0]=='rm': del self.containers[key];return b''
            if args[2] in self.containers: raise ReleaseError('name occupied')
            del self.containers[key];self.containers[args[2]]=value;value['Name']='/'+args[2]
            if self.fail_after_rename:
                self.fail_after_rename=False;raise ReleaseError('injected disconnect after rename')
            return b''
        result=super().__call__(*args,data=data)
        if args[0]=='create':
            self.serial+=1;self.importer['Id']=format(self.serial,'064x')
            name=args[args.index('--name')+1];self.importer['Name']='/'+name
            self.importer['HostConfig'].update(NetworkMode=args[args.index('--network')+1],
                CapDrop=['ALL'],SecurityOpt=['no-new-privileges'])
            self.importer['Config'].update(Entrypoint=['sleep'],Cmd=['infinity'])
            self.containers[name]=self.importer
            if self.fail_after_create:
                self.fail_after_create=False;raise ReleaseError('injected disconnect after create')
            return self.importer['Id'].encode()
        return result


class RepeatUpgradeTests(unittest.TestCase):
    def setUp(self):
        InstallationResourcesTests.setUp(self)
        self.docker=MultipleDockerFixture(self.plugin)
        self.prior_sha='a'*64
        self.prior=self.base/self.prior_sha
        self.resources=InstallationResources(self.config,self.artifact,self.prior,runner=self.docker)
        baseline=self.resources.snapshot()
        plan=dict(schemaVersion='d16-content-install-plan-v1',siteId='tio2-my',
                  artifactSha256=self.prior_sha,baseline={'resources':baseline})
        plan['planSha256']=hashlib.sha256(canonical(plan)).hexdigest()
        self.owner=plan['planSha256']
        self.resources.backup(self.base/'first-backup')
        result=self.resources.install(self.owner)
        self.old_id=result['newImporterId']
        receipt=dict(schemaVersion='d16-content-install-state-v1',phase='completed',plan=plan,
                     evidence={'verified':True,'resources':result['verification']})
        (self.prior/'state.json').write_bytes(canonical(receipt))
        self.next_artifact=copy.deepcopy(self.artifact)
        self.next_artifact['contents']['wordpress/plugins/tio2-site-model/new.php']=b'newer plugin'
        self.next=InstallationResources(self.config,self.next_artifact,self.base/('b'*64),
                                       runner=self.docker,previous_installation=self.prior)
        self.next_owner='e'*64

    def test_second_install_retains_old_importer_and_restores_exact_first_version(self):
        backup=self.next.backup(self.base/'second-backup')
        result=self.next.install(self.next_owner)
        self.assertNotEqual(self.old_id,result['newImporterId'])
        old=next(v for v in self.docker.containers.values() if v['Id']==self.old_id)
        self.assertFalse(old['State']['Running'])
        self.assertEqual(b'newer plugin',(self.plugin/'new.php').read_bytes())
        self.next.restore(self.next_owner,backup)
        self.assertEqual(self.old_id,self.docker.containers['importer']['Id'])
        self.assertTrue(self.docker.containers['importer']['State']['Running'])
        self.assertEqual(b'new plugin',(self.plugin/'new.php').read_bytes())
        self.assertEqual(1,len(self.docker.containers))
        self.next.restore(self.next_owner,backup)

    def test_create_failure_restores_old_importer(self):
        backup=self.next.backup(self.base/'second-backup');self.docker.fail_create=True
        with self.assertRaises(ReleaseError):self.next.install(self.next_owner)
        self.docker.fail_create=False;self.next.restore(self.next_owner,backup)
        self.assertEqual(self.old_id,self.docker.containers['importer']['Id'])
        self.assertTrue(self.docker.containers['importer']['State']['Running'])

    def test_disconnect_after_rename_is_recoverable(self):
        backup=self.next.backup(self.base/'second-backup');self.docker.fail_after_rename=True
        with self.assertRaises(ReleaseError):self.next.install(self.next_owner)
        self.next.restore(self.next_owner,backup)
        self.assertEqual(self.old_id,self.docker.containers['importer']['Id'])

    def test_old_importer_security_drift_rejected_before_changes(self):
        self.docker.containers['importer']['HostConfig']['NetworkMode']='host'
        with self.assertRaises(ReleaseError):self.next.snapshot()
        self.assertEqual(b'new plugin',(self.plugin/'new.php').read_bytes())

    def test_incomplete_prior_installation_rejected(self):
        path=self.prior/'state.json';value=json.loads(path.read_bytes());value['phase']='opening'
        path.write_bytes(canonical(value))
        with self.assertRaises(ReleaseError):self.next.snapshot()

    def test_stop_or_create_response_loss_restores_first_install(self):
        for fault in ('fail_after_stop','fail_after_create'):
            with self.subTest(fault=fault):
                self.next.directory=self.base/('retry-'+fault)
                from content_install_upgrade import ImporterUpgrade
                self.next.upgrade=ImporterUpgrade(self.next,self.prior)
                backup=self.next.backup(self.base/('backup-'+fault))
                setattr(self.docker,fault,True)
                with self.assertRaises(ReleaseError):self.next.install(self.next_owner)
                self.next.restore(self.next_owner,backup)
                self.assertEqual(self.old_id,self.docker.containers['importer']['Id'])

    def test_rollback_rename_response_loss_can_be_retried(self):
        backup=self.next.backup(self.base/'second-backup');self.next.install(self.next_owner)
        self.docker.fail_after_rename=True
        with self.assertRaises(ReleaseError):self.next.restore(self.next_owner,backup)
        self.next.restore(self.next_owner,backup)
        self.assertEqual(self.old_id,self.docker.containers['importer']['Id'])
        self.assertTrue(self.docker.containers['importer']['State']['Running'])

    def test_foreign_replacement_is_not_deleted_by_rollback(self):
        backup=self.next.backup(self.base/'second-backup');self.next.install(self.next_owner)
        self.docker.containers['importer']['Id']='f'*64
        with self.assertRaises(ReleaseError):self.next.restore(self.next_owner,backup)
        self.assertEqual('f'*64,self.docker.containers['importer']['Id'])

    def test_initial_mode_cannot_restore_an_upgrade_backup(self):
        backup=self.next.backup(self.base/'second-backup');self.next.install(self.next_owner)
        wrong=InstallationResources(self.config,self.next_artifact,self.next.directory,runner=self.docker)
        with self.assertRaises(ReleaseError):wrong.restore(self.next_owner,backup)
        self.assertEqual(2,len(self.docker.containers))
        self.next.restore(self.next_owner,backup)

    def test_completed_receipt_importer_id_must_match(self):
        self.docker.containers['importer']['Id']='f'*64
        with self.assertRaises(ReleaseError):self.next.snapshot()

    def test_old_plugin_change_rejected_before_backup(self):
        (self.plugin/'new.php').write_bytes(b'unapproved')
        with self.assertRaises(ReleaseError):self.next.backup(self.base/'second-backup')
        self.assertTrue(self.docker.containers['importer']['State']['Running'])


class ErrorReportingTests(unittest.TestCase):
    def test_expected_reason_preserved_and_unexpected_details_hidden(self):
        from content_install_cli import installation_error
        value=installation_error('plan','plan',ReleaseError('maintenance gate already installed'))
        self.assertEqual('maintenance gate already installed',value['reason'])
        self.assertEqual('plan',value['stage'])
        value=installation_error('plan','inputs',ValueError('secret-value'))
        self.assertNotIn('secret-value',json.dumps(value))


if __name__=='__main__':unittest.main()
