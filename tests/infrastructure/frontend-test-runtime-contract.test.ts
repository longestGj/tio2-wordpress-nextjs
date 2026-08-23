import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

import vitestConfig from '@/vitest.config'

interface PackageManifest {
  readonly version?: string
  readonly devDependencies?: Readonly<Record<string, string>>
  readonly engines?: Readonly<Record<string, string>>
}

interface PackageLock {
  readonly packages: Readonly<Record<string, PackageManifest>>
}

function readJson(path: string): PackageManifest {
  return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')) as PackageManifest
}

describe('frontend test runtime contract', () => {
  it('bounds default Vitest workers below the 16-worker host pressure point', () => {
    const testConfig = (vitestConfig as {readonly test?: {readonly maxWorkers?: number}}).test

    expect(testConfig?.maxWorkers).toBe(4)
  })

  it('locks jsdom to a dev-only release whose Node engine includes Node 20.9', () => {
    const manifest = readJson('package.json')
    const installed = readJson('node_modules/jsdom/package.json')
    const lock = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package-lock.json'), 'utf8'),
    ) as PackageLock

    expect(manifest.devDependencies?.jsdom).toBe('26.1.0')
    expect(lock.packages['']?.devDependencies?.jsdom).toBe('26.1.0')
    expect(lock.packages['node_modules/jsdom']?.version).toBe('26.1.0')
    expect(installed.engines?.node).toBe('>=18')
  })
})
