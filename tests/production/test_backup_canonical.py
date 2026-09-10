import json
from pathlib import Path
import tempfile
import unittest
import uuid
from tests.production.test_release_baseline import BaselineFixture
from tests.production.test_prepare_action import create_package
from release_actions import prepare_release
from release_contract import ReleaseError
import backup_core


class CanonicalBackupTests(unittest.TestCase):
    def test_fixed_backup_request_is_bound_and_has_no_path_or_command_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture=BaselineFixture(directory)
            baseline=fixture.validate(); create_package(fixture.paths)
            prepared=prepare_release(fixture.paths,baseline_validator=lambda paths:fixture.validate(),ownership_setter=lambda *args:None)
            request={'schemaVersion':'tio2-backup-request-v1','requestId':str(uuid.uuid4()),'preparedProofSha256':prepared['candidate']['proofSha256'],'baselineSha256':baseline['active']['enrollmentSha256']}
            path=fixture.paths.incoming/'backup-request.json'; path.write_text(json.dumps(request))
            self.assertEqual(backup_core.read_backup_request(fixture.paths,baseline,prepared['candidate']),request)
            for changed in ({**request,'path':'/arbitrary'},{**request,'preparedProofSha256':'0'*64},{**request,'requestId':'invalid'}):
                path.write_text(json.dumps(changed))
                with self.assertRaises(ReleaseError): backup_core.read_backup_request(fixture.paths,baseline,prepared['candidate'])

    def test_journal_binds_identity_and_rejects_unknown_fields_or_changed_baseline(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture=BaselineFixture(directory)
            baseline=fixture.validate()
            journal=backup_core.BackupJournal(fixture.paths)
            request={'schemaVersion':'tio2-backup-request-v1','requestId':str(uuid.uuid4()),'preparedProofSha256':'1'*64,'baselineSha256':baseline['active']['enrollmentSha256']}
            value=journal.begin(baseline,None,request)
            self.assertEqual(journal.load(baseline,None,request),value)
            self.assertFalse(value['stopIntent'])
            altered={**baseline,'active':{**baseline['active'],'sourceSha256':'f'*64}}
            with self.assertRaises(ReleaseError): journal.load(altered,None,request)
            path=fixture.paths.production/'state/backup-journal.json'
            value['arbitraryPath']='/other/data'
            path.write_text(json.dumps(value))
            with self.assertRaises(ReleaseError): journal.load(baseline,None,request)

    def test_idle_and_prepared_use_canonical_active_without_bridge_records(self):
        with tempfile.TemporaryDirectory() as directory:
            fixture=BaselineFixture(directory)
            baseline=fixture.validate()
            active,candidate,target=backup_core.load_identities(fixture.paths,baseline=baseline)
            self.assertEqual(active,baseline['active'])
            self.assertIsNone(candidate)
            self.assertEqual(target,fixture.source)
            create_package(fixture.paths)
            prepared=prepare_release(fixture.paths,baseline_validator=lambda paths:fixture.validate(),ownership_setter=lambda *args:None)
            active,candidate,target=backup_core.load_identities(fixture.paths,baseline=fixture.validate())
            self.assertEqual(candidate,prepared['candidate'])
            self.assertEqual(active,prepared['active'])
            self.assertFalse((fixture.paths.configuration/'runtime-baseline.json').exists())
            self.assertFalse((fixture.paths.configuration/'legacy-baseline.json').exists())


if __name__=='__main__': unittest.main()
