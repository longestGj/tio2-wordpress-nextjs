import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {projectEligibleMalaysiaResources} from '@/lib/wordpress/resource-hub-v01-dto'
import {malaysiaResourceMappingAllowsPublic} from '@/lib/wordpress/resource-page-registry'
import {
  resourceFixturePolicies,
  resourceH0Relations,
  resourceH1Relations,
  resourceH2Relations,
  resourceH3Relations,
  resourceH4Relations,
  resourceH5Relations,
} from '@/tests/fixtures/tio2-my-resource-hub-states'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const harness = fileURLToPath(new URL('../../infrastructure/php/resource-hub-projection.php', import.meta.url))
const pluginRoot = fileURLToPath(new URL('../../../wordpress/plugins/tio2-site-model', import.meta.url))

const vectors = {
  H0: resourceH0Relations,
  H1: resourceH1Relations,
  H2: resourceH2Relations,
  H3: resourceH3Relations,
  H4: resourceH4Relations,
  H5: resourceH5Relations,
}

describe.runIf(process.env.TIO2_MY_RESOURCE_PHP_RUNTIME === '1')('RES-000 PHP and TypeScript H0-H5 parity', () => {
  it('projects the same public cards, fields, allocation and steady state', () => {
    const php = spawnSync('docker', [
      'run', '--rm', '-i',
      '--mount', `type=bind,source=${pluginRoot},target=/plugin,readonly`,
      '--entrypoint', 'php',
      'wordpress:php8.3-apache',
      '/dev/stdin', '/plugin/includes/resource-hub-v01.php',
      Buffer.from(JSON.stringify(vectors)).toString('base64'),
    ], {
      cwd: root,
      input: readFileSync(harness, 'utf8'),
      encoding: 'utf8',
      timeout: 60_000,
    })
    expect(php.status, php.stderr).toBe(0)
    const actual = JSON.parse(php.stdout) as Record<string, unknown>
    const expected: Record<string, unknown> = Object.fromEntries(Object.entries(vectors).map(([name, relations]) => [
      name,
      projectEligibleMalaysiaResources(relations, resourceFixturePolicies),
    ]))
    expected.REGISTRY_POLICY = {
      originApproved: malaysiaResourceMappingAllowsPublic(
        'RES-ORIGIN', 'APPROVED_PRD_V0.3', '/resources/non-china-titanium-dioxide/',
      ),
      inventedStatus: malaysiaResourceMappingAllowsPublic(
        'RES-ORIGIN', 'PUBLIC_ELIGIBLE', '/resources/non-china-titanium-dioxide/',
      ),
      candidate: malaysiaResourceMappingAllowsPublic(
        'RES-PROC', 'NEW_PAGE_CANDIDATE', '/resources/chloride-vs-sulfate-titanium-dioxide/',
      ),
      plannedTrade: malaysiaResourceMappingAllowsPublic(
        'RES-TRADE-EU', 'PLANNED_CONTENT', '/resources/eu-titanium-dioxide-anti-dumping-duty/',
      ),
    }
    expect(actual).toEqual(expected)
  })
})
