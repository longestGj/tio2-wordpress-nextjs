import {spawnSync} from 'node:child_process'
import {isolatedPhpArgs} from '../helpers/wordpress-test-support'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))
const runWordPressRuntime = process.env.WORDPRESS_EDITORIAL_FIXTURE_RUNTIME === '1'
export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

describe.runIf(runWordPressRuntime)('Site A editorial fixture core', () => {
  it('passes the isolated eligible apply, rollback, locking, and fixture-contract harness', () => {
    const result = spawnSync('docker', [
      ...isolatedPhpArgs(repositoryRoot),
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
