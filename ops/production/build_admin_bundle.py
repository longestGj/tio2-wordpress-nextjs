"""Build a local administrator-only program bundle from one approved Git commit.

This does not install, upload or invoke any privileged operation.
"""
import argparse,ast,hashlib,json,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def blob(revision,path):return subprocess.check_output(['git','-C',str(ROOT),'show',revision+':'+path])
def build(revision,output):
 if not re.fullmatch('[a-f0-9]{40}',revision):raise ValueError('exact tool commit required')
 tree=ast.parse(blob(revision,'ops/production/server/bootstrap_install.py'))
 names=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='REQUIRED_FILES' for t in n.targets))
 if not isinstance(names,tuple) or any(not re.fullmatch('[A-Za-z0-9_.-]+',n) for n in names):raise ValueError('invalid installer inventory')
 contents={name:blob(revision,'ops/production/Dockerfile' if name=='web.Dockerfile' else 'ops/production/server/'+name) for name in names}
 output.mkdir(parents=True,exist_ok=False)
 for name,data in contents.items():(output/name).write_bytes(data)
 record={'toolCommit':revision,'files':{name:hashlib.sha256(data).hexdigest() for name,data in contents.items()},'installationPerformed':False}
 output.with_name(output.name+'.sha256.json').write_text(json.dumps(record,indent=2))
 return record
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--revision',required=True);parser.add_argument('--output',required=True,type=Path);args=parser.parse_args()
 print(json.dumps(build(args.revision,args.output)))
