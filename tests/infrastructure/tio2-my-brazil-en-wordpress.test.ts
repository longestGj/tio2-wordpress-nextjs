import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {expect, it} from 'vitest'

it('enforces the Brazil EN contract in the PHP runtime', () => {
  const result = spawnSync('docker', ['run','--rm','--network','none','-v',`${resolve('.')}:/work:ro`,
    'wordpress:php8.3-apache','php','/work/tests/infrastructure/php/market-brazil-en-contract.php'],
  {encoding:'utf8',timeout:60_000})
  expect(result.error).toBeUndefined()
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.stdout).toContain('Brazil English PHP contract PASS')
}, 65_000)
