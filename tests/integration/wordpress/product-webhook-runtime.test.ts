import {wordpressComposeArgs} from '../../helpers/wordpress-compose'
import {registerSharedWordPressMutationLock} from '../../helpers/wordpress-test-support'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_PRODUCT_WEBHOOK_RUNTIME === '1'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true} as const
registerSharedWordPressMutationLock(runLiveWordPress)

function runProductWebhookContract() {
  return spawnSync(
    'docker',
    [
      ...wordpressComposeArgs({...WORDPRESS_RUNTIME_MODE, runId: 'product-webhook-runtime'}),
      'run',
      '--rm',
      '--no-deps',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      'eval-file',
      '/workspace/wordpress/tests/webhook-routing.php',
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 120_000},
  )
}

describe.runIf(runLiveWordPress)('live WordPress Product webhook routing', () => {
  it('emits canonical future Product metadata while suppressing normal draft edits', () => {
    const result = runProductWebhookContract()

    expect(result.error).toBeUndefined()
    expect(result.status, result.stderr || result.stdout).toBe(0)
    expect(result.stdout).toContain('TiO2 per-site webhook routing smoke test passed')
  }, 150_000)
})
