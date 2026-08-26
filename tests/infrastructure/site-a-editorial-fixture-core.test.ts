import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))

describe('Site A editorial fixture core', () => {
  it('passes the isolated eligible apply, rollback, locking, and fixture-contract harness', () => {
    const result = spawnSync('docker', [
      'compose',
      '--env-file',
      'wordpress/.env',
      '-f',
      'wordpress/docker-compose.yml',
      'run',
      '--rm',
      '--no-TTY',
      '--entrypoint',
      'php',
      'wpcli',
      '/workspace/wordpress/tests/site-a-editorial-fixture-core.php',
    ], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 240_000,
    })

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain(
      'Site A editorial fixture isolated core contract passed',
    )
  }, 300_000)
})
