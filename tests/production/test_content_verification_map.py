import copy
import hashlib
from pathlib import Path
import sys
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'scripts/production'))
from build_content_verification_map import build_pages, canonical
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

    def test_publication_metadata_is_frozen_separately_without_changing_package(self):
        package,inventory=self.fixture();before=copy.deepcopy(package)
        pages=build_pages(package,inventory,{'evidenceState':'sufficient'})
        self.assertEqual(pages['HOME-001']['publishedSeo']['description'],'Publication description')
        self.assertEqual(pages['HOME-001']['fields'],['hero.heading'])
        self.assertEqual(package,before)

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
