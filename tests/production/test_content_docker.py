"""Configuration and SQL fencing admission tests; live exercise in content_rehearsal."""
from pathlib import Path
import sys
import unittest
import json

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))


class DockerConfigTests(unittest.TestCase):
    def test_protected_approval_selector_is_bound_only_to_writes(self):
        from content_docker import ContentDockerRuntime, validate_config
        base=dict(schemaVersion='d16-content-runtime-v1',siteId='tio2-my',database='wordpress',
                  dbContainer='local-db',wordpressContainer='local-wp',importerContainer='local-importer',
                  dbDefaultsFile='/run/secrets/admin.cnf',
                  hooks={key:['/usr/local/libexec/d16-window',key] for key in ('identity','enter','assert','leave','refresh','verify')})
        for selected in (None,'synthetic-registered'):
            config={**base,**({'approvalId':selected} if selected else {})}
            runtime=ContentDockerRuntime(config,'.')
            runtime.sql=lambda query:'enrolled-db'
            calls=[]
            def transport(*args,data=None):
                calls.append((args,data)); return b'{"ok":true}'
            runtime.docker=transport
            for action in ('validate','import','export'):
                runtime._php(action,{'approvalId':'package-cannot-select'})
                args,_=calls[-1]
                self.assertNotIn('D16_CONTENT_APPROVAL_ID=package-cannot-select',args)
                # An explicit empty binding also overrides stale inherited container environment.
                self.assertIn('D16_CONTENT_APPROVAL_ID='+(selected if selected and action!='export' else ''),args)
        for value in ('../unsafe','',None,33,'a'*97):
            with self.assertRaises(Exception): validate_config({**base,'approvalId':value})

    def test_reject_shell_hook_and_nonabsolute_credentials(self):
        from content_docker import validate_config
        base = dict(schemaVersion='d16-content-runtime-v1', siteId='tio2-my', database='wordpress',
                    dbContainer='local-db', wordpressContainer='local-wp', importerContainer='local-importer',
                    dbDefaultsFile='/run/secrets/admin.cnf',
                    hooks={key: ['/usr/local/libexec/d16-window', key] for key in ('identity','enter','assert','leave','refresh','verify')})
        self.assertEqual(validate_config(base)['database'], 'wordpress')
        for change in ({'database': 'wp;DROP DATABASE wp'}, {'dbDefaultsFile': 'relative'},
                       {'hooks': {key: ['/bin/sh', '-c', 'echo yes'] for key in base['hooks']}}):
            with self.assertRaises(Exception): validate_config({**base, **change})


class ContentScopeEvidenceTests(unittest.TestCase):
    def runtime(self,*,empty=False,lose_fence=False):
        from content_docker import ContentDockerRuntime
        from release_contract import ReleaseError
        runtime=ContentDockerRuntime.__new__(ContentDockerRuntime)
        runtime.config={'siteId':'tio2-my','wordpressContainer':'test-wp'}
        runtime.fenced=True
        runtime._state=lambda:{'owner':'release-one'}
        def assert_window(owner):
            if not runtime.fenced:raise ReleaseError('fence lost')
        runtime.assert_window=assert_window
        runtime._hook=lambda *args:dict(ok=True,content=True,status=True,seo=True,sitemap=True,contentSha256='b'*64)
        def run(args,data=None):
            if args==['docker','inspect','test-wp']:return json.dumps([{'Id':'c'*64}]).encode()
            if args[:5]==['docker','exec','c'*64,'php','-r']:
                if lose_fence:runtime.fenced=False
                return json.dumps([] if empty else [{'type':'page','slug':'home','title':'Home','content':'a'*64}]).encode()
            raise AssertionError('unexpected scope transport '+repr(args))
        runtime.run=run
        return runtime

    def test_terminal_verification_captures_stable_full_cms_scope(self):
        result=self.runtime().verify_public({'contentSha256':'b'*64},False)
        self.assertEqual(result.get('cmsScope'),{'siteScope':'tio2-my','publishedRecords':1,
            'contentSha256':'8dfa88e192a2b1f3eda5a8e18e9404d993df75803e5a7967fb1bdfdc90c913f0'})

    def test_scope_read_cannot_succeed_after_fence_loss(self):
        from release_contract import ReleaseError
        with self.assertRaises(ReleaseError): self.runtime(lose_fence=True).verify_public({'contentSha256':'b'*64},False)

    def test_empty_full_scope_cannot_be_enrolled(self):
        from release_contract import ReleaseError
        with self.assertRaises(ReleaseError): self.runtime(empty=True).verify_public({'contentSha256':'b'*64},False)


if __name__ == '__main__': unittest.main()
