import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, it} from 'vitest'

it('enforces the Brazil PT contract in the PHP runtime', () => {
  const result = spawnSync('docker', ['run','--rm','--network','none','-v',`${resolve('.')}:/work:ro`,
    'wordpress:php8.3-apache','php','/work/tests/infrastructure/php/market-brazil-pt-contract.php'],
  {encoding:'utf8',timeout:60_000})
  expect(result.error).toBeUndefined()
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.stdout).toContain('Brazil Portuguese PHP contract PASS')
}, 65_000)

it('registers the PT singleton and its exact webhook route/meta owner', () => {
  const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
  const schema = readFileSync('wordpress/schema.graphql', 'utf8')
  const webhooks = readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php', 'utf8')
  expect(plugin).toContain("require_once __DIR__ . '/includes/market-page-brazil-pt-v02.php';")
  expect(schema).toContain('malaysiaBrazilPtMarketRecordJson: String!')
  expect(webhooks).toContain("'/pt-br/markets/brazil'")
  expect(webhooks).toContain('TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META === $meta_key')
})
