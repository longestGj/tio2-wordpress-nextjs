import {spawnSync} from 'node:child_process'
import {expect, it} from 'vitest'
import {isolatedPhpArgs} from '../helpers/wordpress-test-support'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

it('validates released text changes while rejecting unsafe content, extra fields and cross-site identity', () => {
  const result = spawnSync('docker', [...isolatedPhpArgs(process.cwd()),
    '/workspace/tests/infrastructure/php/content-release-validation.php'], {encoding: 'utf8', timeout: 60_000})
  expect(result.status, result.stdout + result.stderr).toBe(0)
  expect(result.stdout).toMatch(/^PASS [1-9][0-9]* page policies, [1-9][0-9]* text paths; editorial and Sample actual validators/u)
}, 60_000)
