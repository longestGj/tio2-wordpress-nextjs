import importlib.util
from pathlib import Path
import sys
import unittest
import json
import tempfile
import hashlib
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'ops/production/server'))
from release_contract import ReleaseError


class MaintenanceConfigurationTests(unittest.TestCase):
    def test_scope_binding_uses_container_id_and_excludes_observation_time(self):
        from content_install_backend import InstallationBackend
        from types import SimpleNamespace
        backend=object.__new__(InstallationBackend)
        backend.config={'runtime':{'wordpressContainer':'wordpress'}}
        backend.database=SimpleNamespace(docker=lambda *args:json.dumps([{'Id':'a'*64}]).encode())
        values=[dict(siteScope='tio2-my',publishedRecords=57,contentSha256='b'*64,observedAt=t) for t in ['first','second']]
        with patch('adoption_probe.read_cms_scope',side_effect=values) as reader:
            self.assertEqual(backend._scope(),backend._scope())
            self.assertEqual('a'*64,reader.call_args.args[1])

    def setUp(self):
        self.assertIsNotNone(importlib.util.find_spec('content_install_backend'), 'actual installation orchestration missing')
        from content_install_backend import render_maintenance
        self.render = render_maintenance

    def test_enrolled_upstream_gets_marker_guard_without_changing_other_routes(self):
        raw = b'server {\n location / {\n  include /etc/tio2-production/web-upstream.conf;\n }\n location /health { return 200; }\n}\n'
        actual = self.render(raw,'/opt/d16-release/maintenance/my.json','/etc/tio2-production/web-upstream.conf')
        self.assertIn(b'if (-f /opt/d16-release/maintenance/my.json) { return 503; }',actual)
        self.assertIn(b'location /health { return 200; }',actual)
        self.assertEqual(1,actual.count(b'include /etc/tio2-production/web-upstream.conf;'))

    def test_unknown_layout_refuses_to_rewrite_nginx(self):
        with self.assertRaises(ReleaseError):
            self.render(b'server { proxy_pass http://another-site; }','/safe/marker','/expected/upstream')

    def test_directive_injection_cannot_enter_marker_path(self):
        with self.assertRaises(ReleaseError):
            self.render(b'include /a;', '/x; return 200;', '/a')

    def test_double_install_refuses_existing_gate(self):
        once=self.render(b'include /etc/upstream;\n','/safe/marker','/etc/upstream')
        with self.assertRaises(ReleaseError): self.render(once,'/safe/marker','/etc/upstream')

    def test_actual_verification_package_loads_and_binds_my(self):
        from content_install_backend import InstallationBackend
        from content_release import canonical
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'package.json'
            records=[{'pageId':'HOME-001','content':{'heading':'Approved'}}]
            package={'schemaVersion':'d16-content-package-v1','siteId':'tio2-my','records':records,
                     'files':[],'contentSha256':hashlib.sha256(canonical(records)).hexdigest()}
            path.write_text(json.dumps(package))
            backend=object.__new__(InstallationBackend)
            backend.config={'verificationPackageFile':str(path)}
            with patch('content_install_backend.protected_path',lambda p,**kwargs:p):
                self.assertEqual(package,backend._package())
                package['siteId']='other';path.write_text(json.dumps(package))
                with self.assertRaises(ReleaseError):backend._package()

    def test_configuration_drift_is_rejected_before_maintenance(self):
        from content_install_backend import InstallationBackend
        with tempfile.TemporaryDirectory() as directory:
            path=Path(directory)/'nginx.conf'
            path.write_bytes(b'changed after plan')
            backend=object.__new__(InstallationBackend)
            backend._files=lambda:[path]
            with self.assertRaises(ReleaseError):
                backend._snapshot_files({str(path):hashlib.sha256(b'approved').hexdigest()})

    def test_configuration_snapshot_preserves_absence_and_original_bytes(self):
        from content_install_backend import InstallationBackend
        import base64
        with tempfile.TemporaryDirectory() as directory:
            present=Path(directory)/'nginx.conf'; absent=Path(directory)/'new.json'
            present.write_bytes(b'approved')
            backend=object.__new__(InstallationBackend)
            backend._files=lambda:[present,absent]
            snapshot=backend._snapshot_files({str(present):hashlib.sha256(b'approved').hexdigest(),str(absent):None})
            self.assertEqual(b'approved',base64.b64decode(snapshot[str(present)]['data']))
            self.assertIsNone(snapshot[str(absent)])

    def test_recovery_before_any_effect_does_not_require_missing_backup(self):
        from content_install_backend import InstallationBackend
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);backend=object.__new__(InstallationBackend)
            backend.directory=root;backend.marker=root/'marker'
            backend.database=SimpleNamespace(state_path=root/'database-state')
            backend.restore('owner',{},None)
            backend.leave('owner',{})
            self.assertEqual([],list(root.iterdir()))

    def test_foreign_marker_is_rejected_before_database_reopens(self):
        from content_install_backend import InstallationBackend
        from types import SimpleNamespace
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);backend=object.__new__(InstallationBackend)
            backend.directory=root;backend.marker=root/'marker'
            backend.marker.write_text(json.dumps({'siteId':'tio2-my','owner':'someone-else'}))
            state=root/'database-state';state.write_text('paused')
            backend.database=SimpleNamespace(state_path=state,leave=lambda owner:state.write_text('open'))
            with self.assertRaises(ReleaseError):backend.leave('owner',{})
            self.assertEqual('paused',state.read_text())


if __name__=='__main__': unittest.main()
