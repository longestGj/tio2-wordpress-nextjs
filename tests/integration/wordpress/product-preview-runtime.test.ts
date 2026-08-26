import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_PRODUCT_PREVIEW_RUNTIME === '1'

function runProductPreviewContract() {
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      'wordpress/.env',
      '-f',
      'wordpress/docker-compose.yml',
      'run',
      '--rm',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      'eval-file',
      '/workspace/wordpress/tests/product-preview.php',
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 120_000},
  )
}

describe.runIf(runLiveWordPress)('live WordPress protected Product preview', () => {
  it('enforces authorization, Product ownership, completeness, and the safe payload shape', () => {
    const result = runProductPreviewContract()

    expect(result.error).toBeUndefined()
    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(result.stdout).toContain('TiO2 protected Product preview test passed')
  }, 150_000)
})
