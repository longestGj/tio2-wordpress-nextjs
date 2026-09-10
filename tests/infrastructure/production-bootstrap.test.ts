import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const installerPath = resolve('ops/production/server/install.sh')
const sudoersPath = resolve('ops/production/server/sudoers.tio2-release')
const sshdTemplatePath = resolve('ops/production/server/sshd-tio2-production.conf')
const actions = ['status', 'prepare', 'backup', 'deploy', 'verify', 'rollback']

function source(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

describe('tio2-my one-time production bootstrap', () => {
  it('installs the fixed root-owned release boundary through a staged atomic activation', () => {
    const installer = source(installerPath)

    expect(existsSync(installerPath)).toBe(true)
    expect(installer).toContain('id -u')
    expect(installer).toContain('mktemp -d')
    expect(installer).toContain('python3 -m unittest discover -s')
    expect(installer).toContain('apt-get install --yes --no-install-recommends age')
    expect(installer).toContain('visudo -cf')
    expect(installer).toMatch(/\bmv\b[^\n]*PROGRAM_LINK_NEW[^\n]*PROGRAM_LINK/u)
    expect(installer).toMatch(/\bmv\b[^\n]*WRAPPER_NEW[^\n]*WRAPPER_TARGET/u)
    expect(installer).toMatch(/\bmv\b[^\n]*SUDOERS_NEW[^\n]*SUDOERS_TARGET/u)
    expect(installer).toMatch(/cp -a[^\n]*PROGRAM_LINK[^\n]*BACKUP_ROOT/u)

    for (const [directory, owner, mode] of [
      ['/opt/tio2-production', 'root', '0750'],
      ['/opt/tio2-production/programs', 'root', '0750'],
      ['/opt/tio2-production/backups', 'root', '0750'],
      ['/opt/tio2-production/releases', 'root', '0750'],
      ['/opt/tio2-production/state', 'root', '0750'],
      ['/etc/tio2-production', 'root', '0750'],
      ['/home/deploy/tio2-incoming', 'deploy', '0700'],
      ['/home/deploy/tio2-outgoing', 'deploy', '0700'],
    ] as const) {
      const escapedDirectory = directory.replaceAll('/', '\\/')
      expect(installer).toMatch(new RegExp(`install -d -o ${owner} -g ${owner} -m ${mode} ${escapedDirectory}`))
    }

    expect(installer).toMatch(/stat -c '%a'[\s\S]*10#\$mode & 022/u)
    expect(installer).toMatch(/stat -c '%u'[\s\S]*\$owner" -eq 0/u)
    expect(installer).toMatch(/case "\$SOURCE_DIR" in[\s\S]*\/home\/deploy\/\*/u)
    expect(installer).not.toMatch(/docker|usermod|gpasswd/u)
    expect(installer).not.toMatch(/systemctl\s+(?:reload|restart)\s+ssh(?:d)?|service\s+ssh(?:d)?\s+(?:reload|restart)/u)
    expect(installer).not.toContain('/etc/ssh/')
  })

  it('limits deploy sudo to the exact closed release actions and a hardened environment', () => {
    const sudoers = source(sudoersPath)

    expect(existsSync(sudoersPath)).toBe(true)
    expect(sudoers.trim().split(/\r?\n/u)).toEqual([
      'Defaults!/usr/local/sbin/tio2-release env_reset,secure_path=/usr/sbin:/usr/bin:/sbin:/bin,!setenv',
      `deploy ALL=(root) NOPASSWD: ${actions.map(action => `/usr/local/sbin/tio2-release ${action}`).join(', ')}`,
    ])
    expect(sudoers).not.toContain('ALL=(ALL)')
  })

  it('stores, but does not activate, the fixed SSH hardening template', () => {
    const sshd = source(sshdTemplatePath)

    expect(existsSync(sshdTemplatePath)).toBe(true)
    expect(sshd.trim().split(/\r?\n/u)).toEqual([
      'PasswordAuthentication no',
      'KbdInteractiveAuthentication no',
      'PermitRootLogin no',
      'PubkeyAuthentication yes',
      'AllowUsers deploy',
    ])
  })
})
