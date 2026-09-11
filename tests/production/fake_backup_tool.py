"""Executable Docker/age/nginx double: no network or actual service operations."""
import json
from pathlib import Path
import sys

root = Path(sys.argv[1])
tool = sys.argv[2]
args = sys.argv[3:]
config = json.loads((root/'fake.json').read_text())
with (root/'commands.jsonl').open('a') as out:
    out.write(json.dumps([tool, *args])+'\n')
joined = ' '.join(args)
failure = config.get('failure')
if failure and failure in joined:
    raise SystemExit(19)
if tool == 'age':
    if args == ['--version']:
        print('age fake')
    else:
        data = sys.stdin.buffer.read()
        Path(args[args.index('-o')+1]).write_bytes(b'age-encryption.org/v1\n'+__import__('hashlib').sha256(data).digest())
elif tool == 'docker':
    if args[:2] == ['ps', '--all']:
        print('c'*64+'\n'+'d'*64+'\n'+'e'*64)
    elif args[0] == 'inspect':
        values = []
        for cid in args[1:]:
            role = {'c':'db', 'd':'wordpress', 'e':'stopped'}[cid[0]]
            volume, dest = ('wordpress_db_data', '/var/lib/mysql') if role == 'db' else ('wordpress_wp_data', '/var/www/html')
            values.append({'Id':cid, 'Name':'/'+role, 'Image':'sha256:'+cid, 'State':{'Running':role!='stopped', 'Status':'running' if role!='stopped' else 'exited', 'Health':{'Status':config.get('health', 'healthy')}}, 'Config':{'Labels':{'com.docker.compose.project':'wordpress', 'com.docker.compose.service':role}}, 'Mounts':[] if role=='stopped' else [{'Type':'volume','Name':volume, 'Destination':dest}]})
            if config.get('noHealth'):
                values[-1]['State'].pop('Health')
            if role=='stopped' and config.get('stoppedMount'):
                values[-1]['Mounts'] = [{'Type':'volume','Name':'wordpress_wp_data','Destination':'/var/www/html'}]
        print(json.dumps(values))
    elif args[:2] == ['image', 'inspect']:
        print(json.dumps([{'Id':image, 'RepoDigests':['mariadb@'+image]} for image in args[2:]]))
    elif args[:2] == ['volume', 'inspect']:
        print(json.dumps([{'Name':name,'Mountpoint':str(root/('db' if name=='wordpress_db_data' else 'wp'))} for name in args[2:]]))
    elif args[0] == 'create':
        print('f'*64)
    elif 'mariadb-dump' in args:
        mode = config.get('sql', 'valid')
        if mode == 'corrupt':
            sys.stdout.buffer.write(b'not SQL')
        else:
            sys.stdout.buffer.write(b'CREATE DATABASE wp;\nUSE wp;\nCREATE TABLE posts(id int);\n')
            if mode == 'large':
                sys.stdout.buffer.write(b'INSERT INTO posts VALUES(1);\n'*300000)
            if mode != 'truncated':
                sys.stdout.buffer.write(b'-- Dump completed on 2026-09-11 00:00:00\n')
    elif 'mariadb' in args:
        if '-e' in args:
            sql = args[args.index('-e')+1]
            if 'information_schema.TABLES' in sql:
                print('wp\tposts\tBASE TABLE')
            elif 'COUNT(*)' in sql:
                print('300000' if config.get('sql')=='large' else '0')
            elif 'VERSION()' in sql:
                print('11.4.8\tutf8mb4\t45')
            else:
                print('1')
        else:
            sql = sys.stdin.buffer.read()
            (root/'restored.sql').write_bytes(sql)
            if b'-- Dump completed on ' not in sql or config.get('restoreFail'):
                raise SystemExit(12)
    elif 'core' in args:
        print('6.8.3')
    elif 'plugin' in args:
        print('[{"name":"tio2-site-model","status":"active","version":"1.0"}]')
    elif 'post' in args:
        print('58')
    elif args[0] == 'exec' and args[-1].startswith('umask 077;'):
        (root/'streamed-defaults').write_bytes(sys.stdin.buffer.read())
