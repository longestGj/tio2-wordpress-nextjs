"""Root-only program generation upgrade after a completed phase-one migration.

Executed from a root-protected bundle directory beside admin/. Never changes
registry, release state, wrappers, sudoers, CMS or running frontend containers.
"""
from pathlib import Path
import argparse
import json
import os
import sys

if __name__ == '__main__':
    sys.path.insert(0, str(Path(__file__).resolve().parent / 'admin'))

from phase1_migration import Phase1Migration, MigrationPaths, COMMIT_ORDER, canonical, digest, require


def require_upgrade_state(state):
    """Admit only pending transactions or an evidenced safe frontend rollback."""
    from release_controller import ReleaseController
    details=state.get('details',{})
    require(state.get('state') in {'PREPARED','BACKED_UP','ROLLED_BACK'}
            and details.get('subject')=='tio2-my',
            'upgrade requires preserved pending or safely rolled-back transaction')
    if state['state']=='ROLLED_BACK':
        require(ReleaseController._safe_recovery(details.get('safeRecovery'),details),
                'upgrade requires verified frontend rollback evidence')


class ProgramUpgrade:
    def __init__(self, migration, *, verify, checkpoint=lambda point: None):
        self.io=migration
        self.paths=migration.paths
        self.verify=verify
        self.checkpoint=checkpoint
        manifest,_=self.io._bundle()
        self.work=self.paths.work.parent / 'program-upgrade' / manifest['toolCommit']
        self.journal=self.work / 'journal.json'
        self.receipt=self.work / 'receipt.json'

    def _preserved(self):
        io=self.io; paths=self.paths
        require(not paths.journal.exists(),'unfinished phase1 migration')
        receipt=io._json(paths.receipt)
        require(receipt.get('schemaVersion')=='d16-phase1-migration-receipt-v1'
                and receipt.get('subject')=='tio2-my' and receipt.get('state')=='PREPARED'
                and all(item.get('committed') is True for item in receipt['commits'])
                and [item.get('name') for item in receipt['commits']]==list(COMMIT_ORDER),
                'completed phase1 receipt required')
        # A failed preflight leaves blocked.json as historical evidence even
        # after a later successful migration. Preserve it and authenticate the
        # terminal journal instead of treating that marker as active state.
        journal=io._json(paths.work/'completed-journal.json')
        plan=journal['plan']
        payload={key:value for key,value in plan.items() if key!='planHash'}
        require(journal.get('schemaVersion')=='d16-phase1-migration-journal-v1'
                and journal.get('completed') is True and journal.get('commits')==receipt['commits']
                and digest(canonical(payload))==plan['planHash']==receipt['planHash'],
                'completed phase1 journal required')
        state=io._json(paths.state)
        require_upgrade_state(state)
        result={}
        for base in (paths.registry,paths.state.parent,paths.work):
            io._check(base)
            for path in sorted(base.rglob('*')):
                io._check(path)
                if path.is_file():result[str(path.relative_to(paths.root))]=digest(io._read(path))
        for path in (paths.legacy_state,paths.wrapper,paths.sudoers):
            result[str(path.relative_to(paths.root))]=digest(io._read(path))
        return result

    def _target(self):
        io=self.io; io._check(self.paths.program_link,link=True)
        target=(self.paths.program_link.read_text() if self.paths.simulation else os.readlink(self.paths.program_link))
        import re
        require(re.fullmatch(r'programs/[A-Za-z0-9][A-Za-z0-9_.-]*',target) is not None,'program target')
        io._check(self.paths.program_link.parent / target)
        return target

    def _plan(self):
        io=self.io; manifest,_=io._bundle()
        old=self._target()
        value={'schemaVersion':'d16-phase1-program-upgrade-plan-v1','subject':'tio2-my',
               'oldTarget':old,'oldFiles':io._tree(self.paths.program_link.parent/old),
               'newTarget':'programs/upgrade-'+manifest['toolCommit'],
               'toolCommit':manifest['toolCommit'],'archiveSha256':manifest['archiveSha256'],
               'newFiles':manifest['files'],'preserved':self._preserved()}
        return {**value,'planHash':digest(canonical(value))}

    def plan(self):
        with self.io._locked():
            require(not self.journal.exists(),'upgrade pending; apply or recover same plan')
            return self._plan()

    def _check_plan(self,plan,expected):
        value={key:item for key,item in plan.items() if key!='planHash'}
        require(digest(canonical(value))==plan['planHash']==expected,'upgrade plan mismatch')
        require(self._preserved()==plan['preserved'],'preserved files changed')
        require(self.io._tree(self.paths.program_link.parent/plan['oldTarget'])==plan['oldFiles'],'old generation changed')
        require(self._target() in {plan['oldTarget'],plan['newTarget']},'unexpected program generation')

    def _switch(self,target):
        self.io._atomic(self.paths.program_link,target.encode() if self.paths.simulation else target,
                        kind='file' if self.paths.simulation else 'link')

    def apply(self,expected):
        io=self.io
        with io._locked():
            if self.receipt.exists():
                receipt=io._json(self.receipt); plan=receipt['plan']
                self._check_plan(plan,expected)
                require(self._target()==plan['newTarget'],'completed upgrade target changed')
                require(io._tree(self.paths.program_link.parent/plan['newTarget'])==plan['newFiles'],'new generation changed')
                if self.journal.exists():
                    require(io._json(self.journal)==plan,'pending upgrade differs from receipt')
                    self.journal.unlink();io._sync(self.work)
                return receipt
            plan=io._json(self.journal) if self.journal.exists() else self._plan()
            self._check_plan(plan,expected)
            manifest,contents=io._bundle()
            require(manifest['files']==plan['newFiles'] and manifest['archiveSha256']==plan['archiveSha256'],
                    'upgrade bundle changed')
            target=self.paths.program_link.parent/plan['newTarget']
            if not self.journal.exists():
                require(not target.exists(),'upgrade generation already exists')
                io._atomic(self.journal,canonical(plan))
            io._mkdir(target)
            temporary_names={'.'+name+'.phase1-new' for name in contents}
            require(set(item.name for item in target.iterdir()) <= set(contents)|temporary_names,'unexpected staged file')
            for name,data in contents.items():
                path=target/name
                if path.exists():require(io._read(path)==data,'partial generation mismatch')
                # Also replaces any fixed temp left by an interrupted write.
                io._atomic(path,data,mode=0o750 if name.endswith('.sh') else 0o640)
            require(io._tree(target)==plan['newFiles'],'staged generation mismatch')
            io.self_test(target)
            self._check_plan(plan,expected)
            self._switch(plan['newTarget'])
            self.checkpoint('switched')
            self.verify(target)
            self._check_plan(plan,expected)
            receipt={'schemaVersion':'d16-phase1-program-upgrade-receipt-v1',
                     'state':'PROGRAM_UPGRADED','plan':plan,'preservedVerified':True}
            io._atomic(self.receipt,canonical(receipt))
            self.checkpoint('receipt-written')
            self.journal.unlink();io._sync(self.work)
            return receipt

    def recover(self,expected):
        io=self.io
        with io._locked():
            require(not self.receipt.exists(),'completed upgrade cannot be recovered')
            plan=io._json(self.journal);self._check_plan(plan,expected)
            self._switch(plan['oldTarget'])
            io._atomic(self.work/'recovered.json',canonical({'planHash':expected,'oldTarget':plan['oldTarget']}))
            # Keep the approved plan so the same immutable generation can be
            # resumed after recovery; never discard its ownership evidence.
            io._sync(self.work)
            return {'state':'PROGRAM_RESTORED','planHash':expected}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('action',choices=('plan','apply','recover'))
    parser.add_argument('plan_hash',nargs='?')
    args=parser.parse_args()
    root=Path(__file__).resolve().parent
    io=Phase1Migration(MigrationPaths.for_root('/'),root/'admin',root/'admin-bundle.tar.gz',
                       input_loader=lambda:None,snapshot=lambda:None)
    def verify(target):
        import subprocess
        # The administrator parent already holds both release locks. Invoke
        # only the read-only status body in the new interpreter, not a second
        # lock acquisition which would deadlock against this upgrade.
        code="import json; from release_controller import ReleaseController; print(json.dumps(ReleaseController.system()._execute('tio2-my','status')))"
        result=subprocess.run(['/usr/bin/python3','-B','-c',code],cwd=target,
                              check=True,capture_output=True,timeout=60,env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin'})
        status=json.loads(result.stdout)
        require_upgrade_state(status['state'])
        require(status['ok'] is True and status['subject']=='tio2-my'
                and status['state']==io._json(io.paths.state)
                and status['releaseCapabilities']['frontend-only'] is True
                and status['recoveryRequired'] is False
                and status['sharedCmsWindowActive'] is False,'upgraded frontend capability unavailable')
    upgrade=ProgramUpgrade(io,verify=verify)
    result=upgrade.plan() if args.action=='plan' else getattr(upgrade,args.action)(args.plan_hash)
    print(json.dumps(result,sort_keys=True,separators=(',',':')))


if __name__=='__main__':
    main()
