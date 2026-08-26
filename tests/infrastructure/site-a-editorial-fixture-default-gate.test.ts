import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url))

describe('Site A editorial fixture default test gate', () => {
  it('skips the Docker harness unless the WordPress runtime is explicitly enabled', () => {
    const environment = {...process.env}
    delete environment.WORDPRESS_EDITORIAL_FIXTURE_RUNTIME
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/vitest/vitest.mjs',
        'run',
        'tests/infrastructure/site-a-editorial-fixture-core.test.ts',
      ],
      {
        cwd: repositoryRoot,
        encoding: 'utf8',
        env: environment,
        timeout: 120_000,
      },
    )
    const output = `${result.stdout}\n${result.stderr}`

    expect(result.status, output).toBe(0)
    expect(output).toMatch(/1 skipped/u)
    expect(output).not.toContain('Container wordpress-')
  }, 150_000)
})
