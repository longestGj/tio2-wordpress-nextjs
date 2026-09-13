"""One approved MY route repair; no generic content adapter or sudo capability.

The administrator CLI holds the release lock. Installation supplies durable
same-window recovery; InstallationDatabase supplies full backup and fencing.
Only the three route keys below can be written, using root SQL, never privileged
PHP from an application-writable WordPress directory.
"""
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from cms_content_snapshot import read_content_snapshot
from content_install_database import InstallationDatabase
from release_actions import SubprocessCommandRunner
from release_contract import ReleaseError
from release_state import atomic_write_json

KEYS = ('_tio2_my_route_page_id','_tio2_my_route_canonical','_tio2_my_route_release_state')


def require(ok, message):
    if not ok: raise ReleaseError('route repair '+message)


def sha(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def text_sql(value):
    return "CONVERT(X'"+value.encode().hex()+"' USING utf8mb4)"


def validate_payload(value, routes):
    require(isinstance(value,dict) and set(value)=={'schemaVersion','siteId','beforeSemanticSha256',
            'afterSemanticSha256','targets','changes'},'payload fields')
    require(value['schemaVersion']=='d16-my-route-repair-v1' and value['siteId']=='tio2-my','payload identity')
    for key in ('beforeSemanticSha256','afterSemanticSha256'):
        require(isinstance(value[key],str) and re.fullmatch('[a-f0-9]{64}',value[key]),'content hash')
    require(routes.get('siteScope')=='tio2-my' and routes.get('candidateId')==
            'TIO2-MY-PRERELEASE-PUBLIC-PATHS-2026-09-09-V1','approved routes')
    approved={r['pageId']:r for r in routes['routes'] if r['pageId']!='CONV-THANK'}
    targets=value['targets']; require(isinstance(targets,dict) and len(targets)==len(approved)==41,'route count')
    seen=set()
    for record, meta in targets.items():
        require(re.fullmatch('[a-z0-9_]+:[a-z0-9_-]+',record) and set(meta)==set(KEYS),'record identity')
        require(all(isinstance(v,list) and len(v)==1 and isinstance(v[0],str) for v in meta.values()),'target values')
        page=meta[KEYS[0]][0]
        require(page in approved and page not in seen,'page identity');seen.add(page)
        require(meta[KEYS[1]]==[approved[page]['canonical']] and
                approved[page]['canonical']=='https://tio2malaysia.com'+approved[page]['path'] and
                meta[KEYS[2]]==['LIVE_APPROVED'],'approved target')
    changes=value['changes'];require(isinstance(changes,list) and len(changes)==95,'change count')
    seen=set()
    for item in changes:
        require(isinstance(item,dict) and set(item)=={'record','meta','operation','beforeSha256','target'},'change fields')
        identity=(item['record'],item['meta'])
        require(item['record'] in targets and item['meta'] in KEYS and identity not in seen,'change identity');seen.add(identity)
        require(item['target']==targets[item['record']][item['meta']][0],'target mismatch')
        require((item['operation']=='insert' and item['beforeSha256'] is None) or
                (item['operation']=='update' and item['meta']==KEYS[2] and
                 isinstance(item['beforeSha256'],str) and re.fullmatch('[a-f0-9]{64}',item['beforeSha256'])),'operation')
    require(Counter(c['operation'] for c in changes)=={'insert':81,'update':14},'approved operation counts')
    return value


def change_sql(prefix, changes, records):
    require(isinstance(prefix,str) and re.fullmatch('[a-zA-Z0-9_]+',prefix),'table prefix')
    sql=['START TRANSACTION;']
    for item in changes:
        require(item['meta'] in KEYS and item['operation'] in {'insert','update'},'write key')
        record=records[item['record']];pid=record['id']
        require(type(pid) is int and pid>0,'post id')
        key=text_sql(item['meta']);value=text_sql(item['target'])
        if item['operation']=='insert':
            sql.append(f'INSERT INTO {prefix}postmeta (post_id,meta_key,meta_value) VALUES ({pid},{key},{value});')
        else:
            sql.append(f'UPDATE {prefix}postmeta SET meta_value={value} WHERE post_id={pid} AND BINARY meta_key=BINARY {key};')
        sql.append('SELECT ROW_COUNT();')
    sql.append('COMMIT;')
    return '\n'.join(sql)


class RouteRepairBackend:
    def __init__(self, runtime, directory, payload, routes, prefix, verify_frontend, refresh_frontend):
        self.payload=validate_payload(payload,routes)
        require(re.fullmatch('[a-zA-Z0-9_]+',prefix),'table prefix')
        self.prefix=prefix;self.directory=Path(directory)
        self.database=InstallationDatabase(runtime,self.directory)
        self.verify_frontend=verify_frontend
        self.refresh_frontend=refresh_frontend

    def _sql(self, query):
        return self.database.sql('USE `'+self.database.config['database']+'`;\n'+query)

    def _snapshot(self):
        wp=json.loads(self.database.docker('inspect',self.database.config['wordpressContainer']))[0]
        require(wp['State']['Running'] and not wp['HostConfig'].get('Privileged'),'WordPress identity')
        # Verify the read probe and privileged SQL target exactly the same DB.
        probe="define('SHORTINIT',true);require '/var/www/html/wp-load.php';global $wpdb;echo $wpdb->get_var('SELECT CONCAT(@@hostname,CHAR(9),DATABASE(),CHAR(9),CURRENT_USER())').chr(9).$wpdb->prefix;"
        binding=self.database.docker('exec',wp['Id'],'php','-r',probe).decode().strip().split('\t')
        require(len(binding)==4 and '\t'.join(binding[:2])==self._sql('SELECT @@hostname,DATABASE()')
                and binding[3]==self.prefix,'database or prefix binding')
        require(binding[2].split('@')[0] not in {'','root','mariadb.sys'},'WordPress account bypasses fence')
        value=read_content_snapshot(SubprocessCommandRunner(),wp['Id'])
        return {'snapshot':value,'wordpressId':wp['Id'],'wordpressImage':wp['Image']}

    def _records(self):
        p=self.prefix
        query=f"""SELECT p.ID,HEX(p.post_type),HEX(p.post_name),
          (SELECT COUNT(*) FROM {p}term_relationships r JOIN {p}term_taxonomy t ON t.term_taxonomy_id=r.term_taxonomy_id
           WHERE r.object_id=p.ID AND t.taxonomy='site_scope')
          FROM {p}posts p WHERE p.post_status='publish' AND EXISTS
          (SELECT 1 FROM {p}term_relationships r JOIN {p}term_taxonomy t ON t.term_taxonomy_id=r.term_taxonomy_id
           JOIN {p}terms s ON s.term_id=t.term_id WHERE r.object_id=p.ID AND t.taxonomy='site_scope' AND s.slug='tio2-my')"""
        records={}
        for line in self._sql(query).splitlines():
            pid,kind,slug,scopes=line.split('\t')
            key=bytes.fromhex(kind).decode()+':'+bytes.fromhex(slug).decode()
            if key not in self.payload['targets']:continue
            require(key not in records and scopes=='1','record scope or duplicate')
            records[key]={'id':int(pid),'meta':{}}
        by_id={row['id']:key for key,row in records.items()}
        require(bool(by_id),'empty target inventory')
        keys=','.join(text_sql(k) for k in (*KEYS,'public_path'))
        ids=','.join(str(pid) for pid in sorted(by_id))
        for line in self._sql(f"SELECT post_id,HEX(meta_key),CONCAT('v',HEX(meta_value)) FROM {p}postmeta WHERE post_id IN ({ids}) AND BINARY meta_key IN ({keys}) ORDER BY meta_id").splitlines():
            pid,k,v=line.split('\t');name=bytes.fromhex(k).decode()
            require(int(pid) in by_id and v.startswith('v'),'metadata identity')
            if name in KEYS or name=='public_path':
                records[by_id[int(pid)]]['meta'].setdefault(name,[]).append(bytes.fromhex(v[1:]).decode())
        for key,row in records.items():
            target=self.payload['targets'][key]
            path=target[KEYS[1]][0].removeprefix('https://tio2malaysia.com')
            paths=row['meta'].get('public_path',[])
            require((target[KEYS[0]]==['HOME-001'] and paths in ([],['/'])) or
                    (len(paths)==1 and paths[0].rstrip('/')==path.rstrip('/')),'public path binding')
        require(set(records)==set(self.payload['targets']),'missing target record')
        return records

    def _check_before(self, records):
        actual=[]
        for record,target in self.payload['targets'].items():
            for key,values in target.items():
                old=records[record]['meta'].get(key)
                require(old is None or len(old)==1,'duplicate route meta')
                if old!=values:
                    actual.append({'record':record,'meta':key,'operation':'insert' if old is None else 'update',
                                   'beforeSha256':None if old is None else sha(old),'target':values[0]})
        require(sorted(actual,key=lambda v:(v['record'],v['meta']))==
                sorted(self.payload['changes'],key=lambda v:(v['record'],v['meta'])),'observed changes differ')

    def observe(self):
        database=self.database.observe();snapshot=self._snapshot();records=self._records();self._check_before(records)
        require(snapshot['snapshot']['contentSha256']==self.payload['beforeSemanticSha256'],'content drift')
        require(self.verify_frontend() is True,'frontend precheck')
        return {'siteId':'tio2-my','database':database,'content':snapshot,'records':records,'payloadSha256':sha(self.payload)}

    def enter(self,owner,baseline):
        self.database.enter(owner,baseline['database'])
        require(self._snapshot()==baseline['content'] and self._records()==baseline['records'],'fenced baseline drift')

    def backup(self,owner,baseline):
        backup=self.database.backup(owner)
        restoration=self.database.verify_backup_restore(owner,backup)
        require(restoration.get('verified') is True,'backup restoration')
        return {'database':backup,'restoration':restoration}

    def install(self,owner,baseline,backup):
        self.database.assert_window(owner)
        require(self._snapshot()==baseline['content'],'content changed before write')
        records=self._records();require(records==baseline['records'],'records changed before write');self._check_before(records)
        result=self._sql(change_sql(self.prefix,self.payload['changes'],records))
        require(result.splitlines()==['1']*95,'affected row counts')
        self.database.assert_window(owner)
        require(self.refresh_frontend() is True,'frontend cache refresh')

    def verify(self,owner,baseline):
        self.database.assert_window(owner);snapshot=self._snapshot()
        require(snapshot['wordpressId']==baseline['content']['wordpressId'] and
                snapshot['wordpressImage']==baseline['content']['wordpressImage'],'WordPress drift')
        require(snapshot['snapshot']['contentSha256']==self.payload['afterSemanticSha256'],'resulting content')
        for key,row in self._records().items():
            require(all(row['meta'].get(k)==v for k,v in self.payload['targets'][key].items()),'route result')
        require(self.verify_frontend() is True,'frontend verification')
        return {'verified':True,'changedMeta':95,'content':snapshot,
                'frontendCompatibility':'bound-container-smoke',
                'finalFrontendAcceptance':'required-after-frontend-release'}

    def enroll(self,owner,evidence):
        atomic_write_json(self.directory/'route-repair-receipt.json',{'owner':owner,'evidence':evidence})

    def _verify_restored(self,baseline):
        require(self._snapshot()==baseline['content'],'restored content')

    def restore(self,owner,baseline,backup):
        if backup is not None:self.database.restore(owner,backup['database'])
        self._verify_restored(baseline)
        if backup is not None:require(self.refresh_frontend() is True,'restored frontend refresh')

    def leave(self,owner,baseline):
        self.database.leave(owner)
