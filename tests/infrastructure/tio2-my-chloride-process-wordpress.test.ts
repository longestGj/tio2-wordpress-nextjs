import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, it} from 'vitest'

it('enforces explicit Chloride Process Grade tuples in PHP', () => {
  const result = spawnSync('docker', ['run','--rm','--network','none','-v',`${resolve('.')}:/work:ro`,
    'wordpress:php8.3-apache','php','/work/tests/infrastructure/php/product-process-chloride-contract.php'],
  {encoding:'utf8',timeout:60_000})
  expect(result.error).toBeUndefined()
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.stdout).toContain('Chloride Process PHP contract PASS')
}, 65_000)

it('registers the singleton GraphQL owner', () => {
  expect(readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php','utf8'))
    .toContain("require_once __DIR__ . '/includes/product-process-chloride-v01.php';")
  expect(readFileSync('wordpress/schema.graphql','utf8')).toContain('malaysiaChlorideProcessRecordJson: String!')
  const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php','utf8')
  expect(webhooks).toContain("'/products/chloride-process-titanium-dioxide'")
  expect(webhooks).toContain('TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META === $meta_key')
})
