import {spawnSync} from 'node:child_process'
import {describe, expect, it} from 'vitest'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

describe('controlled SQL approval adapter on isolated WordPress/MariaDB', () => {
  it('runs the actual importer, SQL fence, fresh approval and version/identity rejection cases', () => {
    const result=spawnSync('python',['-m','pytest','-q','tests/production/test_content_approval_binding.py'],{encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024})
    expect(result.status,result.stdout+'\n'+result.stderr).toBe(0)
    expect(result.stdout).toContain('passed')
  },250000)
})
