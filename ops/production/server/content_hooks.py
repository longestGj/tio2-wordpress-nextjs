"""Root-installed content hooks. No request may choose a command or origin.

The installer adds a public Nginx `if (-f MAINTENANCE_FILE) { return 503; }`
gate and a separate loopback internal listener. The caller holds the CMS lock.
The marker is durable ownership evidence, retained when any check fails.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
import uuid
import xml.etree.ElementTree as ET

from content_docker import ContentDockerRuntime
from content_release import canonical, validate_package
from release_contract import ReleaseError


def validate_config(config):
    keys={'schemaVersion','siteId','frontendContainer','wordpressContainer','buildIdFile',
          'cmsContractFile','cmsPluginDirectory','maintenanceFile','publicOrigin','internalOrigin','publicHost',
          'revalidationSecretFile','expectedIdentity','pages'}
    if not isinstance(config,dict) or set(config)!=keys or config['schemaVersion']!='d16-content-hooks-v1':
        raise ReleaseError('content hooks configuration schema mismatch')
    for key in ('siteId','frontendContainer','wordpressContainer'):
        if not isinstance(config[key],str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,100}',config[key]):
            raise ReleaseError('content hooks identity invalid')
    for key in ('buildIdFile','cmsContractFile','cmsPluginDirectory','maintenanceFile','revalidationSecretFile'):
        value=config[key]
        path_type=PurePosixPath if key in {'buildIdFile','cmsContractFile','cmsPluginDirectory'} else Path
        if not isinstance(value,str) or not path_type(value).is_absolute() or '..' in path_type(value).parts or '\x00' in value:
            raise ReleaseError('content hooks path invalid')
    for key in ('publicOrigin','internalOrigin'):
        url=urlsplit(config[key])
        if url.scheme not in {'http','https'} or not url.hostname or url.username or url.password or url.path or url.query or url.fragment:
            raise ReleaseError('content hooks origin invalid')
        if key=='internalOrigin':
            try: loopback=ipaddress.ip_address(url.hostname).is_loopback
            except ValueError: loopback=False
            if not loopback: raise ReleaseError('internal verification origin must be loopback')
    if not isinstance(config['publicHost'],str) or not re.fullmatch(r'[A-Za-z0-9.-]+(?::[0-9]+)?',config['publicHost']):
        raise ReleaseError('content hooks Host invalid')
    if not isinstance(config['pages'],dict) or not config['pages']: raise ReleaseError('page verification map missing')
    for page_id,page in config['pages'].items():
        if not re.fullmatch(r'[A-Z][A-Z0-9-]{0,95}',page_id) or not isinstance(page,dict) or not {'path','fields','robots','sitemap'} <= set(page) or set(page)-{'path','fields','robots','sitemap','canonical','publishedSeo'}:
            raise ReleaseError('page verification map invalid')
        if 'canonical' in page:
            url=urlsplit(page['canonical'])
            if url.scheme not in {'http','https'} or url.netloc!=config['publicHost'] or url.query or url.fragment:
                raise ReleaseError('page canonical registration invalid')
        path=page['path']
        if not isinstance(path,str) or not re.fullmatch(r'/[A-Za-z0-9/_-]*',path) or path.startswith('//') or page['robots'] not in {'index','noindex'} or type(page['sitemap']) is not bool:
            raise ReleaseError('page verification route invalid')
        if not isinstance(page['fields'],list) or not page['fields'] or not all(isinstance(x,str) and re.fullmatch(r'[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*',x) for x in page['fields']):
            raise ReleaseError('visible field verification map missing')
        if 'publishedSeo' in page:
            seo=page['publishedSeo']
            required={'title','description','canonical','contentSeoSha256'}
            if (not isinstance(seo,dict) or not required <= set(seo)
                    or set(seo)-required-{'openGraphTitle'}
                    or not all(isinstance(v,str) and v for v in seo.values())
                    or not re.fullmatch('[a-f0-9]{64}',seo['contentSeoSha256'])):
                raise ReleaseError('published SEO registration invalid')
            url=urlsplit(seo['canonical'])
            if (url.scheme not in {'http','https'} or url.netloc!=config['publicHost']
                    or url.query or url.fragment or (url.path.rstrip('/') or '/')!=(path.rstrip('/') or '/')):
                raise ReleaseError('published SEO canonical registration invalid')
    return config


def canonical_url(value):
    parsed=urlsplit(value)
    return parsed.scheme,parsed.netloc.lower(),parsed.path or '/',parsed.query,parsed.fragment


class Page(HTMLParser):
    """Read rendered text, excluding head, scripts and explicitly hidden nodes."""
    def __init__(self,html):
        super().__init__(convert_charrefs=True)
        self.stack=[]; self.parts=[]; self.titles=[]; self.meta={}; self.links={}
        self.feed(html)

    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if tag=='meta': self.meta[attrs.get('name',attrs.get('property'))]=attrs.get('content')
        if tag=='link': self.links[attrs.get('rel')]=attrs.get('href')
        hidden=tag in {'script','style','template','noscript'} or 'hidden' in attrs or attrs.get('aria-hidden')=='true' or bool(re.search(r'(display\s*:\s*none|visibility\s*:\s*hidden)',attrs.get('style',''),re.I))
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append((tag,hidden))
        if not hidden and not any(x[1] for x in self.stack):
            for key in ('alt','aria-label','title'):
                if attrs.get(key): self.parts.append(attrs[key])

    def handle_endtag(self,tag):
        for index in range(len(self.stack)-1,-1,-1):
            if self.stack[index][0]==tag:
                del self.stack[index:]; break

    def handle_data(self,data):
        tags={x[0] for x in self.stack}
        if 'title' in tags: self.titles.append(data)
        if 'head' not in tags and not any(x[1] for x in self.stack): self.parts.append(data)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None


def legal_visible_fragments(markdown):
    """Probe the restricted legal renderer's text, including every body line.

    This is not a Markdown renderer: it extracts the exact inline forms used by
    malaysia-legal-page.tsx, leaving unsupported punctuation intact to fail closed.
    """
    def inline(value):
        def replace(match):
            token=match.group()
            if token.startswith('**'):return token[2:-2]
            if token.startswith('`'):return token[1:-1]
            return token[1:token.index('](')]
        return re.sub(r'\*\*[^*]+\*\*|\[[^\]\n]+\]\([^)\n]+\)|`[^`]+`',replace,value)
    fragments=[]
    for line in markdown.replace('\r\n','\n').replace('\r','\n').split('\n'):
        if not line.strip():continue
        if re.fullmatch(r'\|[\s:|-]+\|',line):continue
        if re.match(r'^(Actions|Tindakan):',line):
            fragments.extend(inline(x.strip()) for x in line.split(':',1)[1].split('\u00b7') if x.strip())
        elif line.startswith('|') and line.endswith('|'):
            fragments.extend(inline(x.strip()) for x in line[1:-1].split('|') if x.strip())
        elif re.match(r'^#{1,3} ',line):fragments.append(line.split(' ',1)[1])
        else:fragments.append(inline(line[2:] if line.startswith('- ') else line))
    if not fragments:raise ReleaseError('legal content has no visible text')
    return fragments


class ContentHooks:
    # Fixed administrator code; the only argument is the enrolled plugin path.
    PLUGIN_HASH_PHP = '''$root=$argv[1];if(is_link($root)||!is_dir($root)){exit(2);}
$files=[];$it=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root,FilesystemIterator::SKIP_DOTS));
foreach($it as $file){if($file->isLink()){exit(2);}if(!$file->isFile()){exit(2);}
$name=substr($file->getPathname(),strlen($root)+1);$files[$name]=hash_file('sha256',$file->getPathname());}
ksort($files);echo json_encode($files,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);'''

    @classmethod
    def from_path(cls,path):
        path=Path(path);ContentDockerRuntime._trusted_file(path)
        config=validate_config(json.loads(path.read_text(encoding='utf-8')))
        ContentDockerRuntime._trusted_file(Path(config['revalidationSecretFile']))
        # The marker need not exist yet, but its entire parent path is trusted.
        parent=Path(config['maintenanceFile']).parent
        from release_contract import assert_root_owned
        for item in [parent,*parent.parents]:
            if item.is_symlink(): raise ReleaseError('maintenance parent may not be a symlink')
            assert_root_owned(item.lstat())
        return cls(config)

    def __init__(self,config,*,run=None):
        self.config=validate_config(config)
        self.run=run or self._run
        self.marker=Path(config['maintenanceFile'])
        self.http=urllib.request.build_opener(urllib.request.ProxyHandler({}),NoRedirect())

    @staticmethod
    def _run(args):
        try: result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=60)
        except (OSError,subprocess.TimeoutExpired) as error: raise ReleaseError('content identity command failed') from error
        if result.returncode: raise ReleaseError('content identity command failed')
        return result.stdout

    def observe_identity(self):
        """Fresh facts for administrator enrollment; does not attest expected identity."""
        observed=[]
        for key in ('frontendContainer','wordpressContainer'):
            data=json.loads(self.run(['docker','inspect',self.config[key]]))
            if len(data)!=1 or data[0]['State']['Running'] is not True: raise ReleaseError('content hook container not running')
            observed.append(data[0])
        frontend,wp=observed
        env=dict(x.split('=',1) for x in frontend['Config'].get('Env',[]) if '=' in x)
        if env.get('SITE_ID')!=self.config['siteId']: raise ReleaseError('frontend scope mismatch')
        build=self.run(['docker','exec',self.config['frontendContainer'],'cat',self.config['buildIdFile']]).decode().strip()
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,256}',build): raise ReleaseError('frontend Build identity invalid')
        manifest=json.loads(self.run(['docker','exec',self.config['wordpressContainer'],'cat',self.config['cmsContractFile']]))
        files=json.loads(self.run(['docker','exec',self.config['wordpressContainer'],'php','-r',self.PLUGIN_HASH_PHP,self.config['cmsPluginDirectory']]))
        if not isinstance(files,dict) or not files or files!=manifest or not all(isinstance(x,str) and re.fullmatch(r'[a-f0-9]{64}',x) for x in files.values()):
            raise ReleaseError('CMS plugin bytes differ from installed contract')
        contract=hashlib.sha256(canonical(files)).hexdigest()
        material={'hooks':{key:value for key,value in self.config.items() if key!='expectedIdentity'},
                  'frontend':{key:frontend[key] for key in ('Id','Image','Config')},
                  'wordpress':{key:wp[key] for key in ('Id','Image','Config')}}
        return dict(frontendImageId=frontend['Image'],buildId=build,
                    configurationSha256=hashlib.sha256(canonical(material)).hexdigest(),cmsContractSha256=contract)

    def identity(self):
        actual=self.observe_identity()
        if actual!=self.config['expectedIdentity']: raise ReleaseError('installed content identity drift')
        return actual

    def request(self,origin,path,*,data=None,headers=None):
        try:
            request=urllib.request.Request(origin+path,data=data,headers={'Host':self.config['publicHost'],'Cache-Control':'no-cache',**(headers or {})})
            try: response=self.http.open(request,timeout=30)
            except urllib.error.HTTPError as error: response=error
            with response:
                body=response.read(8*1024*1024+1)
                if len(body)>8*1024*1024: raise ReleaseError('content verification HTTP response too large')
                return response.status,body.decode('utf-8')
        except (OSError,UnicodeError,urllib.error.URLError) as error: raise ReleaseError('content verification HTTP failed') from error

    def _state(self,owner):
        if self.marker.is_symlink() or not self.marker.is_file(): raise ReleaseError('maintenance marker missing or unsafe')
        state=json.loads(self.marker.read_text(encoding='utf-8'))
        if state.get('owner')!=owner or state.get('siteId')!=self.config['siteId']: raise ReleaseError('maintenance owner mismatch')
        return state

    def _gate(self):
        if self.request(self.config['publicOrigin'],'/')[0]!=503: raise ReleaseError('public maintenance gate not active')
        if self.request(self.config['internalOrigin'],'/')[0]!=200: raise ReleaseError('internal verification unavailable')

    def execute(self,action,request):
        if not isinstance(request,dict) or request.get('siteId')!=self.config['siteId']: raise ReleaseError('content hook subject mismatch')
        if action not in {'identity','enter','assert','leave','refresh','verify'}: raise ReleaseError('unknown content hook')
        identity=self.identity()
        if action=='identity': return dict(ok=True,identity=identity)
        owner=request.get('owner')
        if not isinstance(owner,str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,127}',owner): raise ReleaseError('maintenance owner invalid')
        if action=='enter':
            try:
                with self.marker.open('xb') as output:
                    os.chmod(self.marker,0o600)
                    output.write(canonical(dict(owner=owner,siteId=self.config['siteId'],identity=identity)))
                    output.flush();os.fsync(output.fileno())
            except FileExistsError as error: raise ReleaseError('maintenance gate already owned') from error
        state=self._state(owner)
        if state.get('identity')!=identity: raise ReleaseError('maintenance identity drift')
        self._gate()
        if action=='leave':
            self.marker.unlink()
            if self.request(self.config['publicOrigin'],'/')[0]!=200:
                with self.marker.open('xb') as output:
                    output.write(canonical(state));output.flush();os.fsync(output.fileno())
                raise ReleaseError('public maintenance exit failed; gate restored')
        elif action=='refresh': self.refresh(request)
        elif action=='verify': return self.verify(request['package'])
        return dict(ok=True,identity=identity)

    def refresh(self,request):
        ids=request.get('pageIds')
        release=request.get('contentRelease')
        if not isinstance(ids,list) or not ids or len(ids)>256 or any(x not in self.config['pages'] for x in ids): raise ReleaseError('refresh pages not enrolled')
        if not isinstance(release,dict) or set(release)!={'releaseId','contentSha256'} or release['releaseId']!=request['owner'] or not re.fullmatch(r'[a-f0-9]{64}',release['contentSha256']):
            raise ReleaseError('refresh release binding invalid')
        payload=dict(eventId=str(uuid.uuid4()),siteIds=[self.config['siteId']],contentId=1,
                     paths=sorted({self.config['pages'][x]['path'] for x in ids}),entityIds=[],
                     modified=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),contentRelease=release)
        raw=canonical(payload);secret=Path(self.config['revalidationSecretFile']).read_bytes().strip()
        if len(secret)<32: raise ReleaseError('revalidation credential invalid')
        status,body=self.request(self.config['internalOrigin'],'/api/revalidate',data=raw,
            headers={'Content-Type':'application/json','x-tio2-signature':hmac.new(secret,raw,hashlib.sha256).hexdigest()})
        if status!=200 or json.loads(body).get('contentRelease')!=release: raise ReleaseError('signed refresh not acknowledged')

    def verify(self,package):
        package=validate_package(package,self.config['siteId'])
        status,body=self.request(self.config['internalOrigin'],'/sitemap.xml')
        if status!=200: raise ReleaseError('sitemap unavailable')
        try: root=ET.fromstring(body)
        except ET.ParseError as error: raise ReleaseError('sitemap invalid') from error
        urls={canonical_url(node.text) for node in root.iter() if node.tag.split('}')[-1]=='loc' and node.text}
        normalize=lambda text:' '.join(text.split())
        for record in package['records']:
            probe=self.config['pages'].get(record['pageId'])
            if not probe: raise ReleaseError('page verification not enrolled')
            status,body=self.request(self.config['internalOrigin'],probe['path'])
            if status!=200: raise ReleaseError('page status verification failed: '+record['pageId']+' HTTP '+str(status))
            page=Page(body);content=record['content'];seo=content.get('seo',{})
            if 'publishedSeo' in probe:
                # Root enrollment freezes the frontend's publication metadata and
                # the unmodified CMS SEO it was reviewed against. A later content
                # SEO edit cannot silently pass against that old registration.
                registered=probe['publishedSeo']
                if hashlib.sha256(canonical(seo)).hexdigest()!=registered['contentSeoSha256']:
                    raise ReleaseError('content SEO differs from publication registration')
                seo=registered
            else:
                seo={**seo,'description':seo.get('description',seo.get('meta_description')),'canonical':seo.get('canonical',probe.get('canonical'))}
            if probe.get('canonical') and canonical_url(seo['canonical'])!=canonical_url(probe['canonical']): raise ReleaseError('page canonical input differs from registration')
            if not all(isinstance(seo.get(x),str) and seo[x] for x in ('title','description','canonical')): raise ReleaseError('page SEO input missing')
            if normalize(''.join(page.titles))!=normalize(seo['title']) or page.meta.get('description')!=seo['description'] or not page.links.get('canonical') or canonical_url(page.links['canonical'])!=canonical_url(seo['canonical']):
                raise ReleaseError('page SEO verification failed')
            if seo.get('openGraphTitle') and page.meta.get('og:title')!=seo['openGraphTitle']: raise ReleaseError('page OpenGraph verification failed')
            robots={x.strip() for x in page.meta.get('robots','').lower().split(',')}
            if probe['robots'] not in robots or (probe['robots']=='index' and 'noindex' in robots): raise ReleaseError('page robots verification failed')
            if (canonical_url(seo['canonical']) in urls)!=probe['sitemap']: raise ReleaseError('page sitemap verification failed')
            visible=normalize(' '.join(page.parts))
            for field in probe['fields']:
                if field.startswith('seo.'):
                    if field not in {'seo.title','seo.description','seo.meta_description','seo.canonical','seo.openGraphTitle'}:
                        raise ReleaseError('requested SEO field verification is not installed')
                    if field.split('.')[1] not in content.get('seo',{}): raise ReleaseError('requested SEO field unavailable')
                    continue
                expected=content
                try:
                    for key in field.split('.'): expected=expected[int(key)] if isinstance(expected,list) else expected[key]
                except (KeyError,IndexError,ValueError,TypeError) as error: raise ReleaseError('visible field unavailable') from error
                if not isinstance(expected,str) or not expected: raise ReleaseError('visible field must be nonempty text')
                if field=='bodyHtml': expected=' '.join(Page(expected).parts)
                fragments=legal_visible_fragments(expected) if field=='buyerVisibleMarkdown' else [expected]
                if any(normalize(part) not in visible for part in fragments): raise ReleaseError('visible page content verification failed')
        return dict(ok=True,content=True,status=True,seo=True,sitemap=True,contentSha256=package['contentSha256'])


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True)
    parser.add_argument('action',choices=['identity','enter','assert','leave','refresh','verify'])
    args=parser.parse_args()
    try:
        raw=sys.stdin.buffer.read(17*1024*1024+1)
        if len(raw)>17*1024*1024: raise ReleaseError('hook request too large')
        result=ContentHooks.from_path(args.config).execute(args.action,json.loads(raw))
        print(json.dumps(result));return 0
    except (ReleaseError,OSError,ValueError,KeyError,TypeError):
        print(json.dumps({'ok':False,'error':'installed content hook failed'}));return 1


if __name__=='__main__': sys.exit(main())
