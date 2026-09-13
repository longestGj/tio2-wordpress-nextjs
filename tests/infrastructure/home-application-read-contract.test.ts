import {spawnSync} from 'node:child_process'
import {describe, expect, it} from 'vitest'
import vectors from '@/tests/fixtures/home-application-read-cases.json'
import {isolatedPhpArgs} from '@/tests/helpers/wordpress-test-support'
import {validateMalaysiaHomepageReadContent, validateMalaysiaApplicationHubReadContent} from '@/lib/wordpress/home-application-read-contract'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import type {MalaysiaApplicationHubContent} from '@/lib/wordpress/application-hub-v01-types'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

describe('PHP home / application read contract and record isolation', () => {
  it('runs shared vectors through real resolvers and retains record and write guards', () => {
    const result = spawnSync('docker', [...isolatedPhpArgs(process.cwd()), '/workspace/tests/infrastructure/php/home-application-read-contract.php'], {encoding:'utf8', maxBuffer: 12 * 1024 * 1024})
    if (result.status !== 0) throw new Error(`PHP harness failed (${result.status}):\n${result.stdout}\n${result.stderr}`)
    const output = JSON.parse(result.stdout)
    expect(output.caseCount).toBe(vectors.cases.length)
    expect(output.accepted).toBe(vectors.cases.filter(test => test.expected === 'accept').length)
    expect(output.accepted + output.rejected).toBe(vectors.cases.length)
    expect(output.recordChecks).toBeGreaterThanOrEqual(41)
    for (const record of output.projected) {
      const validate = record.pageId === 'HOME-001' ? validateMalaysiaHomepageReadContent : validateMalaysiaApplicationHubReadContent
      expect(validate(record.content)).toEqual(record.content)
      const common = {id: 'read-1', modifiedGmt: '2026-09-14T08:00:00', status: 'publish', siteScopes: {nodes: [{slug: 'tio2-my'}]}}
      const dto = record.pageId === 'HOME-001'
        ? toMalaysiaHomepageDto({...common, homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'}, malaysiaHomepageContractJson: JSON.stringify(record.content)})
        : toMalaysiaApplicationHubDto({...common, publishingFields: {publicPath: '/applications'}, malaysiaApplicationHubContractJson: JSON.stringify(record.content), routeReadiness: Object.fromEntries((record.content as MalaysiaApplicationHubContent).routeRegistry.map(route => [route.targetPageId, true]))})
      expect(dto.hero).toEqual(record.content.hero)
      expect(dto).not.toHaveProperty('footer')
    }
    const preview = toMalaysiaHomepageDto(output.previewRecord, {readMode: 'preview'})
    expect(preview.packageId).toBe('HOME-001-CURRENT-READ')
    expect(preview.identity.status).toBe('draft')
    expect(() => toMalaysiaHomepageDto(output.previewRecord)).toThrow()
  })
})
