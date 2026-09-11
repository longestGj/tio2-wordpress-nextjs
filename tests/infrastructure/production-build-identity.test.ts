import {readFileSync} from 'node:fs'
import {expect,it} from 'vitest'

it('reuses the sealed prerelease Build ID only for an explicitly bound production build',()=>{
  const config=readFileSync('next.config.ts','utf8')
  const dockerfile=readFileSync('ops/production/Dockerfile','utf8')
  expect(config).toContain('TIO2_BUILD_ID')
  expect(config).toContain('generateBuildId')
  expect(dockerfile).toContain('ARG TIO2_BUILD_ID')
  expect(dockerfile).toContain('TIO2_BUILD_ID=${TIO2_BUILD_ID}')
})
