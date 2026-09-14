import copy
import hashlib
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/production'))
from build_content_verification_map import build_pages, canonical
from content_hooks import ContentHooks
from release_contract import ReleaseError


class ContentVerificationMapTests(unittest.TestCase):
    def fixture(self,pid='HOME-001'):
        content={'hero':{'heading':'Actual heading'},'buyerVisibleMarkdown':'# Privacy\n\n## Policy\n\nReal body',
                 'breadcrumb':[{'label':'Home'},{'label':'Privacy'}],
                 'seo':{'title':'CMS title','description':'CMS description'}}
        records=[{'pageId':pid,'content':content}]
        package={'schemaVersion':'d16-content-package-v1','siteId':'tio2-my','files':[],
                 'records':records,'contentSha256':hashlib.sha256(canonical(records)).hexdigest()}
        entry={'pageId':pid,'siteScope':'tio2-my','publicAccess':True,'expectedStatus':200,
               'title':'Publication title','metaDescription':'Publication description','canonical':'https://tio2malaysia.com/',
               'pathname':'/','indexingAuthorized':True,'sitemapAuthorized':True}
        return package,[entry]

    def assert_generated_map_verifies(self,pid,path,title,description):
        package,inventory=self.fixture(pid)
        inventory[0].update(pathname=path,canonical='https://tio2malaysia.com'+path)
        # CMS policy-like fields deliberately differ: publication policy stays inventory-owned.
        package['records'][0]['content']['seo'].update(
            canonical='https://cms.example.test/other',robots='noindex',sitemap=False)
        if pid=='APP-000':
            package['records'][0]['content']['hero']={'h1':'Actual heading'}
        package['contentSha256']=hashlib.sha256(canonical(package['records'])).hexdigest()
        before=copy.deepcopy(package)
        pages=build_pages(package,inventory,{'evidenceState':'sufficient'})
        root=Path(__file__).resolve().parent
        config=dict(schemaVersion='d16-content-hooks-v1',siteId='tio2-my',
            frontendContainer='test-next',wordpressContainer='test-wp',
            buildIdFile='/app/.next/BUILD_ID',cmsContractFile='/plugin/paths.json',
            cmsPluginDirectory='/plugin',maintenanceFile=str(root/'unused-maintenance.json'),
            publicOrigin='https://tio2malaysia.com',internalOrigin='http://127.0.0.1:1',
            publicHost='tio2malaysia.com',revalidationSecretFile=str(root/'unused-secret'),
            expectedIdentity={},pages=pages)
        hooks=ContentHooks(config)
        # Only the HTTP boundary is substituted; expectations never come from the generated map.
        html=('<html><head><title>'+title+'</title><meta name="description" content="'+description+'">'
              '<meta property="og:title" content="'+title+'"><meta name="robots" content="index, follow">'
              '<link rel="canonical" href="https://tio2malaysia.com'+path+'"></head>'
              '<body><h1>Actual heading</h1></body></html>')
        responses={'/sitemap.xml':(200,'<urlset><url><loc>https://tio2malaysia.com'+path+'</loc></url></urlset>'),
                   path:(200,html)}
        with patch.object(hooks,'request',side_effect=lambda origin,route:responses[route]):
            try:
                result=hooks.verify(package)
            except ReleaseError as error:
                self.fail('fresh '+pid+' map rejected correctly rendered HTML: '+str(error))
            self.assertTrue(all(result[key] for key in ('ok','content','status','seo','sitemap')))
            self.assertEqual(result['contentSha256'],package['contentSha256'])
            # Each rendered SEO field must still match its registered value.
            for current,stale in ((title,'Stale title'),(description,'Stale description')):
                with self.subTest(pid=pid,stale=stale):
                    responses[path]=(200,html.replace(current,stale))
                    with self.assertRaisesRegex(ReleaseError,'page SEO verification failed'):
                        hooks.verify(package)
            responses[path]=(200,html)
            responses['/sitemap.xml']=(200,'<urlset/>')
            with self.assertRaisesRegex(ReleaseError,'sitemap'):
                hooks.verify(package)
        self.assertEqual(pages[pid]['publishedSeo']['canonical'],'https://tio2malaysia.com'+path)
        self.assertEqual(pages[pid]['robots'],'index')
        self.assertTrue(pages[pid]['sitemap'])
        self.assertEqual(package,before)

    def test_home_fresh_map_verifies_cms_metadata(self):
        self.assert_generated_map_verifies('HOME-001','/','CMS title','CMS description')

    def test_application_hub_fresh_map_verifies_cms_metadata(self):
        self.assert_generated_map_verifies('APP-000','/applications/','CMS title','CMS description')

    def test_unmigrated_about_map_verifies_inventory_metadata(self):
        self.assert_generated_map_verifies('ABOUT-001','/about/','Publication title','Publication description')

    def test_inventory_and_environment_retain_robots_and_sitemap_authority(self):
        for pid in ('HOME-001','APP-000'):
            for indexing,sitemap,robots,want in ((False,False,'index','noindex'),(True,True,'noindex','noindex')):
                with self.subTest(pid=pid,indexing=indexing,robots=robots):
                    package,inventory=self.fixture(pid)
                    inventory[0].update(indexingAuthorized=indexing,sitemapAuthorized=sitemap)
                    page=build_pages(package,inventory,{'evidenceState':'sufficient'},robots=robots)[pid]
                    self.assertEqual(page['robots'],want)
                    self.assertEqual(page['sitemap'],sitemap)

    def test_legal_page_uses_dynamic_cms_metadata(self):
        package,inventory=self.fixture('LEGAL-PRIV-MS')
        seo=build_pages(package,inventory,{'evidenceState':'sufficient'})['LEGAL-PRIV-MS']['publishedSeo']
        self.assertEqual(seo['description'],'CMS description')
        self.assertEqual(seo['openGraphTitle'],'CMS title')

    def test_restricted_about_evidence_is_not_assumed_sufficient(self):
        package,inventory=self.fixture('ABOUT-001')
        with self.assertRaises(ReleaseError):build_pages(package,inventory,{'evidenceState':'partial'})

    def test_wrong_site_and_nonpublic_page_are_rejected(self):
        package,inventory=self.fixture()
        for field,value in [('siteScope','tio2-b'),('publicAccess',False),('expectedStatus',404)]:
            changed=copy.deepcopy(inventory);changed[0][field]=value
            with self.assertRaises(ReleaseError):build_pages(package,changed,{'evidenceState':'sufficient'})
