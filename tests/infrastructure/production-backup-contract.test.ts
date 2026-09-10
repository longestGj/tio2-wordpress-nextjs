import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const scriptPath = 'ops/production/backup.sh'
const actionPath = 'ops/production/server/release_actions.py'

describe('tio2-my production backup contract', () => {
  it('ships a closed backup program with validation before encryption and plaintext-free export', () => {
    expect(existsSync(scriptPath)).toBe(true)
    expect(existsSync(actionPath)).toBe(true)
    const script = readFileSync(scriptPath, 'utf8')

    expect(script).toContain('set -euo pipefail')
    expect(script).toContain('umask 077')
    expect(script).toContain('mariadb-dump --single-transaction')
    expect(script).toContain('gzip -t')
    expect(script).toContain('"$NGINX" -t')
    expect(script).toContain('age -R')
    expect(script).toContain('/home/deploy/tio2-outgoing')
    expect(script).toContain('keep_newest_three')
    expect(script).toContain('restart_wordpress')
    expect(script.indexOf('wordpress_container="$(compose ps -q wordpress)"')).toBeLessThan(
      script.indexOf('compose stop wordpress'),
    )
  })
})
