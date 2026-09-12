"""Copy authenticated prerelease seed bytes without re-encoding or overwriting."""
import argparse
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent/'server'))
from cms_evidence import digest, require, strict_json, read_prerelease_seed_hashes
from collect_cms_comparison import _no_links, _read
from release_contract import validate_manifest, validate_prerelease_proof, inspect_archive

def prepare(source_root, identity_bytes, output):
    source_root, output = Path(source_root).absolute(), Path(output).absolute()
    _no_links(source_root); _no_links(output)
    require(not output.exists(), 'seed output already exists')
    identity = strict_json(identity_bytes)
    require(identity['schemaVersion'] == 1 and identity['siteScope'] == 'tio2-my', 'identity scope')
    manifest_path = source_root/'ops/prerelease/seed-manifest.json'
    _no_links(manifest_path)
    raw = _read(manifest_path)
    require(digest(raw) == identity['seedManifestSha256'], 'seed manifest bytes')
    contents = {}
    def reader(name):
        path=source_root/name; _no_links(path)
        data=_read(path)
        require(len(data) <= 8*1024*1024, 'seed size')
        contents[name]=data
        return data
    hashes=read_prerelease_seed_hashes(raw,reader)
    require(list(hashes.values()) == identity['orderedSeedHashes'], 'ordered seed hashes')
    output.mkdir()
    with (output/'seed-manifest.json').open('xb') as f: f.write(raw)
    for name,data in contents.items():
        path=output/'prerelease-seeds'/name; path.parent.mkdir(parents=True,exist_ok=True)
        with path.open('xb') as f: f.write(data)
    return {'seedManifestSha256':digest(raw),'seedFiles':len(hashes)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-root',required=True,type=Path)
    parser.add_argument('--prerelease-source',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args(); run=args.run_root
    manifest=validate_manifest(run/'release-manifest.json',run/'release.tar.gz')
    inspect_archive(run/'release.tar.gz',manifest)
    proof=validate_prerelease_proof(run/'release-proof.json',run/'release-manifest.json',manifest)
    identity=_read(run/'cms-identity.json')
    require(digest(identity)==proof['prerelease']['cmsIdentitySha256'],'original identity')
    import json
    print(json.dumps(prepare(args.prerelease_source,identity,args.output),sort_keys=True))

if __name__=='__main__': main()
