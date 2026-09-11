import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

describe('tio2-my installed production backup contract', () => {
  it('executes capture, restore, recovery and ciphertext-only publication through fake tools', () => {
    const result = spawnSync('python', ['-m', 'unittest',
      'tests.production.test_backup_core.BackupCoreTests.test_publication_follows_recovery_receipt_and_verification_and_exports_only_ciphertext',
    ], {encoding: 'utf8', timeout: 60000})
    expect(result.status, result.stderr).toBe(0)
  }, 65000)

  it('rejects caller-selected arguments in both installed entrypoints', () => {
    const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash'
    const shell = spawnSync(bash, [resolve('ops/production/server/backup.sh'), '--root', '/tmp/untrusted'], {encoding: 'utf8'})
    expect(shell.status, shell.stderr).toBe(1)
    expect(shell.stdout).toBe('')
    const core = spawnSync('python', [resolve('ops/production/server/backup_core.py'), '--root', '/tmp/untrusted'], {encoding: 'utf8'})
    expect(core.status, core.stderr).toBe(1)
    expect(core.stdout).toBe('')
  })
})
