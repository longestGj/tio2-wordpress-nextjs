"""Local interoperability probe only; not part of the installed server program."""
import json
from pathlib import Path
import shutil
import sys
import tempfile

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT))
sys.path.insert(0,str(ROOT/'ops/production/server'))
from tests.production.test_release_baseline import BaselineFixture
from release_actions import prepare_release

with tempfile.TemporaryDirectory() as root:
    fixture=BaselineFixture(root)
    for source,name in zip(sys.argv[1:],('release.tar.gz','release-manifest.json','release-proof.json'),strict=True):
        shutil.copyfile(source,fixture.paths.incoming/name)
    result=prepare_release(fixture.paths,baseline_validator=lambda paths:fixture.validate(),ownership_setter=lambda *args:None)
    print(json.dumps({'result':result,'readOnlyCommands':fixture.calls}))
