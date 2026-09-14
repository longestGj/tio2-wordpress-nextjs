"""Build administrator-reviewed page probes from frozen MY publication inputs.

Does not alter the content package or install the resulting mapping. Actual HTTP
verification remains mandatory; producing this file is not a passing receipt.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'ops/production/server'))
from content_release import canonical, validate_package
from release_contract import ReleaseError


def build_pages(package, inventory, about_evidence, *, robots='index'):
    validate_package(package,'tio2-my')
    entries={p['pageId']:p for p in inventory}
    if len(entries)!=len(inventory):raise ReleaseError('duplicate publication entry')
    if robots not in {'index','noindex'}:raise ReleaseError('invalid page robots mode')
    pages={}
    for record in package['records']:
        pid=record['pageId'];content=record['content'];entry=entries[pid]
        if entry['siteScope']!='tio2-my' or not entry['publicAccess'] or entry['expectedStatus']!=200:
            raise ReleaseError('page is not approved for public verification')
        if pid=='ABOUT-001' and about_evidence['evidenceState']!='sufficient':
            raise ReleaseError('restricted about evidence requires a separately reviewed page map')
        fields=[]
        choices=['hero.heading','hero.h1','heading','modules.0.h1','modules.0.heading','sections.0.h1']
        if pid.startswith('GRADE-'):choices=['hero.summaryLead']
        if pid.startswith('LEGAL-'):choices=['buyerVisibleMarkdown']
        for field in choices:
            value=content
            try:
                for key in field.split('.'):value=value[int(key)] if isinstance(value,list) else value[key]
            except (KeyError,IndexError,TypeError,ValueError):continue
            if isinstance(value,str) and value:fields=[field];break
        if not fields:raise ReleaseError('no reviewed visible field for '+pid)
        source_seo=content['seo']
        dynamic=pid in {'HOME-001','APP-000','LEGAL-COOKIE-EN','LEGAL-PRIV-EN','LEGAL-PRIV-MS'}
        title=source_seo['title'] if dynamic else entry['title']
        description=source_seo['description'] if dynamic else entry['metaDescription']
        pages[pid]={'path':entry['pathname'],'fields':fields,
                    'robots':robots if entry['indexingAuthorized'] else 'noindex',
                    'sitemap':entry['sitemapAuthorized'],
                    'publishedSeo':{'title':title,'description':description,
                        'canonical':entry['canonical'],'openGraphTitle':title,
                        'contentSeoSha256':hashlib.sha256(canonical(source_seo)).hexdigest()}}
    return pages


def from_revision(package, revision, *, robots='index'):
    if not re.fullmatch('[a-f0-9]{40}',revision):raise ReleaseError('exact committed revision required')
    def read(path):
        return json.loads(subprocess.check_output(['git','show',revision+':'+path],cwd=ROOT))
    inventory=read('lib/seo/tio2-my-publication-inventory.data.json')
    expected={p['pageId'] for p in inventory if p['indexingAuthorized']}
    if len(expected)!=57 or {p['pageId'] for p in package['records']}!=expected:
        raise ReleaseError('complete MY publication map requires exactly the 57 published records')
    return build_pages(package,inventory,
                       read('wordpress/plugins/tio2-site-model/config/tio2-my-about-evidence.json'),robots=robots)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--revision',required=True)
    parser.add_argument('--package',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    parser.add_argument('--robots',choices=['index','noindex'],default='index')
    args=parser.parse_args()
    package=json.loads(args.package.read_bytes())
    pages=from_revision(package,args.revision,robots=args.robots)
    raw=canonical(pages)+b'\n'
    with args.output.open('xb') as destination:destination.write(raw)
    print(json.dumps({'pages':len(pages),'sourceRevision':args.revision,
                      'contentSha256':package['contentSha256'],'pageMapSha256':hashlib.sha256(raw).hexdigest(),
                      'httpVerified':False}))
