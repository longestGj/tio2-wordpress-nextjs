"""HTTP contract tests for installed hooks; Docker transport alone is substituted."""
import copy
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'ops/production/server'))
from content_release import canonical
from release_contract import ReleaseError


class ContentHooksTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.marker = self.root / 'maintenance.json'
        self.secret = self.root / 'secret'; self.secret.write_text('s' * 64)
        self.body = 'New visible heading'
        self.description = 'Description'
        self.sitemap = 'https://example.test/'
        self.signature_valid = False
        self.build = b'build-one\n'
        self.plugin_digest = 'd'*64
        self.inspect = {'Id':'container-one','Image':'sha256:'+'a'*64,
                        'State':{'Running':True},'Config':{'Env':['SITE_ID=tio2-my']}}
        outer = self
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                if self.server.public and outer.marker.exists():
                    self.send_response(503); self.end_headers(); return
                self.send_response(200); self.end_headers()
                if self.path == '/sitemap.xml':
                    self.wfile.write(('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+outer.sitemap+'</loc></url></urlset>').encode())
                else:
                    self.wfile.write(('<html><head><title>Title</title><meta name="description" content="'+outer.description+'"><meta name="robots" content="index, follow"><link rel="canonical" href="https://example.test/"></head><body><h1>'+outer.body+'</h1></body></html>').encode())
            def do_POST(self):
                raw=self.rfile.read(int(self.headers['Content-Length']))
                payload=json.loads(raw)
                outer.signature_valid=hmac.compare_digest(self.headers.get('x-tio2-signature',''),hmac.new(b's'*64,raw,hashlib.sha256).hexdigest())
                self.send_response(200 if outer.signature_valid and payload['siteIds']==['tio2-my'] and payload['paths']==['/'] else 403)
                self.end_headers(); self.wfile.write(json.dumps({'contentRelease':payload['contentRelease']}).encode())
            def log_message(self,*args): pass
        def server(public):
            instance=ThreadingHTTPServer(('127.0.0.1',0),Handler);instance.public=public
            threading.Thread(target=instance.serve_forever,daemon=True).start()
            self.addCleanup(instance.server_close);self.addCleanup(instance.shutdown)
            return 'http://127.0.0.1:'+str(instance.server_port)
        self.config=dict(schemaVersion='d16-content-hooks-v1',siteId='tio2-my',frontendContainer='test-next',
            wordpressContainer='test-wp',buildIdFile='/app/.next/BUILD_ID',cmsContractFile='/plugin/paths.json',cmsPluginDirectory='/plugin',
            maintenanceFile=str(self.marker),publicOrigin=server(True),internalOrigin=server(False),publicHost='example.test',
            revalidationSecretFile=str(self.secret),expectedIdentity={},
            pages={'HOME-001':dict(path='/',fields=['hero.heading'],robots='index',sitemap=True)})
        from content_hooks import ContentHooks
        self.hooks=ContentHooks(self.config,run=self.command)
        self.config['expectedIdentity']=self.hooks.observe_identity()
        self.request={'siteId':'tio2-my','owner':'release-one'}
        records=[{'pageId':'HOME-001','content':{'hero':{'heading':'New visible heading'},'seo':{'title':'Title','description':'Description','canonical':'https://example.test/'}}}]
        self.package=dict(schemaVersion='d16-content-package-v1',siteId='tio2-my',records=records,files=[],contentSha256=hashlib.sha256(canonical(records)).hexdigest())

    def command(self,args):
        if args==['docker','inspect','test-next']: return json.dumps([self.inspect]).encode()
        if args==['docker','inspect','test-wp']: return json.dumps([{'Id':'wp-one','Image':'sha256:'+'b'*64,'State':{'Running':True},'Config':{}}]).encode()
        if args==['docker','exec','test-next','cat','/app/.next/BUILD_ID']: return self.build
        if args==['docker','exec','test-wp','cat','/plugin/paths.json']: return canonical({'plugin.php':'d'*64})
        if args[:5]==['docker','exec','test-wp','php','-r'] and args[-1]=='/plugin': return canonical({'plugin.php':self.plugin_digest})
        raise AssertionError(args)

    def test_actual_maintenance_internal_read_and_owner_leave(self):
        self.assertTrue(self.hooks.execute('enter',self.request)['ok'])
        self.assertTrue(self.marker.exists())
        with self.assertRaises(ReleaseError): self.hooks.execute('leave',{**self.request,'owner':'other'})
        self.assertTrue(self.marker.exists())
        self.hooks.execute('assert',self.request)
        self.hooks.execute('leave',self.request)
        self.assertFalse(self.marker.exists())

    def test_fresh_build_drift_fails_and_keeps_gate(self):
        self.hooks.execute('enter',self.request);self.build=b'new-build'
        with self.assertRaises(ReleaseError): self.hooks.execute('leave',self.request)
        self.assertTrue(self.marker.exists())

    def test_plugin_bytes_drift_fails(self):
        self.plugin_digest='e'*64
        with self.assertRaises(ReleaseError): self.hooks.execute('identity',{'siteId':'tio2-my'})

    def test_hidden_body_cannot_pass_visible_check(self):
        self.hooks.execute('enter',self.request)
        self.body='Old heading<span hidden>New visible heading</span>'
        with self.assertRaises(ReleaseError): self.hooks.execute('verify',{**self.request,'package':self.package})

    def test_wrong_site_rejected_before_marker(self):
        with self.assertRaises(ReleaseError): self.hooks.execute('enter',{**self.request,'siteId':'tio2-b'})
        self.assertFalse(self.marker.exists())

    def test_stopped_or_wrong_scope_frontend_rejected(self):
        for edit in ({'State':{'Running':False}},{'Config':{'Env':['SITE_ID=tio2-b']}}):
            old=copy.deepcopy(self.inspect);self.inspect.update(edit)
            with self.assertRaises(ReleaseError): self.hooks.execute('identity',{'siteId':'tio2-my'})
            self.inspect=old

    def test_refresh_signature_is_accepted_by_http_receiver(self):
        self.hooks.execute('enter',self.request)
        result=self.hooks.execute('refresh',{**self.request,'pageIds':['HOME-001'],'contentRelease':{'releaseId':'release-one','contentSha256':self.package['contentSha256']}})
        self.assertTrue(result['ok']);self.assertTrue(self.signature_valid)

    def test_actual_content_seo_sitemap_pass(self):
        self.hooks.execute('enter',self.request)
        result=self.hooks.execute('verify',{**self.request,'package':self.package})
        self.assertEqual(result['contentSha256'],self.package['contentSha256'])
        self.assertTrue(all(result[key] for key in ('content','status','seo','sitemap')))

    def register_published_seo(self):
        seo=self.package['records'][0]['content']['seo']
        seo['description']='CMS source description differs from approved publication metadata'
        self.package['contentSha256']=hashlib.sha256(canonical(self.package['records'])).hexdigest()
        self.config['pages']['HOME-001']['publishedSeo']={
            'title':'Title','description':'Description','canonical':'https://example.test/',
            'contentSeoSha256':hashlib.sha256(canonical(seo)).hexdigest()}
        from content_hooks import ContentHooks
        self.hooks=ContentHooks(self.config,run=self.command)
        self.config['expectedIdentity']=self.hooks.observe_identity()

    def test_registered_publication_metadata_preserves_original_content_package(self):
        self.register_published_seo()
        before=copy.deepcopy(self.package)
        self.assertTrue(self.hooks.verify(self.package)['seo'])
        self.assertEqual(self.package,before)

    def test_registered_publication_metadata_rejects_changed_content_seo(self):
        self.register_published_seo()
        self.package['records'][0]['content']['seo']['description']='Unreviewed change'
        self.package['contentSha256']=hashlib.sha256(canonical(self.package['records'])).hexdigest()
        with self.assertRaisesRegex(ReleaseError,'content SEO differs'):
            self.hooks.verify(self.package)

    def test_registered_publication_metadata_still_rejects_wrong_rendered_seo(self):
        self.register_published_seo();self.description='Wrong publication'
        with self.assertRaisesRegex(ReleaseError,'page SEO verification failed'):
            self.hooks.verify(self.package)

    def test_registered_publication_metadata_rejects_other_site_canonical(self):
        self.register_published_seo()
        self.config['pages']['HOME-001']['publishedSeo']['canonical']='https://another.test/'
        from content_hooks import validate_config
        with self.assertRaises(ReleaseError):validate_config(self.config)

    def test_legal_body_checks_prose_links_and_table_cells_not_just_breadcrumb(self):
        self.config['pages']['HOME-001']['fields']=['buyerVisibleMarkdown']
        self.package['records'][0]['content']['buyerVisibleMarkdown']=(
            '# Privacy\n\n**Last updated: today**\n\nRead our [policy](/privacy-policy/).\n\n'
            '## Storage\n\n| Name | Purpose |\n|---|---|\n| `cookie` | **Remember choice** |')
        self.package['contentSha256']=hashlib.sha256(canonical(self.package['records'])).hexdigest()
        self.body='Privacy Last updated: today Read our policy. Storage Name Purpose cookie Remember choice'
        self.assertTrue(self.hooks.verify(self.package)['content'])
        self.body='Privacy Last updated: today Read our policy. Storage Name Purpose cookie Old body'
        with self.assertRaisesRegex(ReleaseError,'visible page content verification failed'):
            self.hooks.verify(self.package)

    def test_origin_canonical_empty_path_and_slash_are_equivalent(self):
        self.package['records'][0]['content']['seo']['canonical']='https://example.test'
        self.package['contentSha256']=hashlib.sha256(canonical(self.package['records'])).hexdigest()
        self.hooks.execute('enter',self.request)
        self.assertTrue(self.hooks.execute('verify',{**self.request,'package':self.package})['seo'])

    def test_unmapped_seo_field_is_not_silently_verified(self):
        self.config['pages']['HOME-001']['fields'].append('seo.routeSafeDescription')
        self.config['expectedIdentity']=self.hooks.observe_identity()
        self.hooks.execute('enter',self.request)
        with self.assertRaises(ReleaseError):self.hooks.execute('verify',{**self.request,'package':self.package})

    def test_stale_body_cannot_pass_using_script_text(self):
        self.hooks.execute('enter',self.request)
        self.body='Old heading<script>New visible heading</script>'
        with self.assertRaises(ReleaseError): self.hooks.execute('verify',{**self.request,'package':self.package})

    def test_wrong_seo_and_sitemap_are_rejected(self):
        self.hooks.execute('enter',self.request)
        self.description='Wrong description'
        with self.assertRaises(ReleaseError): self.hooks.execute('verify',{**self.request,'package':self.package})
        self.description='Description';self.sitemap='https://another.test/'
        with self.assertRaises(ReleaseError): self.hooks.execute('verify',{**self.request,'package':self.package})

    def test_document_metadata_uses_registered_canonical_and_meta_description(self):
        self.config['pages']['HOME-001']['canonical']='https://example.test/'
        self.config['expectedIdentity']=self.hooks.observe_identity()
        seo=self.package['records'][0]['content']['seo']
        seo['meta_description']=seo.pop('description');del seo['canonical']
        self.package['contentSha256']=hashlib.sha256(canonical(self.package['records'])).hexdigest()
        self.hooks.execute('enter',self.request)
        self.assertTrue(self.hooks.execute('verify',{**self.request,'package':self.package})['seo'])


if __name__=='__main__': unittest.main()
