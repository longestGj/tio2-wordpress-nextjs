import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const installer = resolve('ops/production/server/install.sh')
const core = resolve('ops/production/server/bootstrap_install.py')
const selfTest = resolve('ops/production/server/bootstrap_selftest.py')
const sudoers = resolve('ops/production/server/sudoers.tio2-release')
const sshd = resolve('ops/production/server/sshd-tio2-production.conf')
const actions = ['status', 'prepare', 'backup', 'deploy', 'verify', 'rollback']
const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : ''

describe('tio2-my one-time production bootstrap', () => {
  it('uses a server-only staged bootstrap core with descriptor-safe paths and rollback', () => {
    const script = read(installer)
    const source = read(core)

    expect(existsSync(installer)).toBe(true)
    expect(existsSync(core)).toBe(true)
    expect(existsSync(selfTest)).toBe(true)
    expect(script).toContain('id -u')
    expect(script).toContain('apt-get install --yes --no-install-recommends age')
    expect(script).toContain('bootstrap_install.py')
    expect(script).not.toContain('unittest discover')
    expect(script).not.toMatch(/docker|usermod|gpasswd/u)
    expect(script).not.toContain('/etc/ssh/')
    expect(source).toContain('REQUIRED_FILES')
    expect(source).toContain('bootstrap_selftest.py')
    expect(source).toContain('O_NOFOLLOW')
    expect(source).toContain('unsafe destination symlink')
    expect(source).toContain('_backup_previous_program')
    expect(source).toContain('_restore(target, snapshot')
    expect(source).toContain('visudo')
  })

  it('limits deploy sudo to the exact closed release actions', () => {
    expect(read(sudoers).trim().split(/\r?\n/u)).toEqual([
      'Defaults!/usr/local/sbin/tio2-release env_reset,secure_path=/usr/sbin:/usr/bin:/sbin:/bin,!setenv',
      `deploy ALL=(root) NOPASSWD: ${actions.map(action => `/usr/local/sbin/tio2-release ${action}`).join(', ')}`,
    ])
  })

  it('stores the exact inactive SSH hardening template', () => {
    expect(read(sshd).trim().split(/\r?\n/u)).toEqual([
      'PasswordAuthentication no', 'KbdInteractiveAuthentication no', 'PermitRootLogin no', 'PubkeyAuthentication yes', 'AllowUsers deploy',
    ])
  })
})
