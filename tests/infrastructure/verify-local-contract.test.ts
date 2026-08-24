import {execFileSync, spawnSync} from 'node:child_process'
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {describe, expect, it} from 'vitest'

const verifier = resolve('scripts/verify-local.ps1')

describe.runIf(process.platform === 'win32')('local verification gate', () => {
  it('describes an inventory-driven disposable RootOnly gate without changing local state', () => {
    const output = execFileSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        verifier,
        '-Plan',
        '-RootOnly',
      ],
      {encoding: 'utf8'},
    )

    expect(JSON.parse(output)).toEqual({
      mode: 'root-only-plan',
      ports: [3001, 3002],
      gates: [
        'compose',
        'wordpress-homepage',
        'wordpress-smoke',
        'seed-audit-legacy',
        'lint',
        'typecheck',
        'schema',
        'codegen',
        'homepage-vitest',
        'vitest',
        'vitest-live-product-fixture',
        'vitest-live-product-publication',
        'vitest-live-seed',
        'vitest-live-homepage-migration',
        'vitest-live-root-only-migration',
        'root-only-transition',
        'build-tio2-a',
        'build-tio2-b',
        'launch',
        'homepage-e2e',
        'playwright',
        'homepage-bundle',
        'homepage-lighthouse-a11y',
        'homepage-lighthouse-performance',
        'http-audit',
        'tracked-worktree',
      ],
      controller: {
        healthTimeoutSeconds: 120,
        maximumSequentialHealthWaitSeconds: 240,
        parentTimeoutSeconds: 270,
        cancellationGraceSeconds: 30,
        forceKillOnTimeout: false,
        cleanupWithoutEmittedState: true,
      },
      worktree: {
        requireCleanAtStart: true,
        requireCleanAtEnd: true,
        includeUntracked: true,
      },
      wordpressSmoke: {
        tests: [
          'smoke',
          'authoring',
          'webhook-routing',
          'preview',
          'admin-credentials',
          'root-only-retirement-safety',
          'product-publication',
        ],
      },
      inventory: {
        version: 'root-only-v0.1',
        expectedPublicUrls: {'tio2-a': 1, 'tio2-b': 1},
        roots: {'tio2-a': '/', 'tio2-b': '/'},
      },
      rootOnlyLifecycle: {
        disposable: true,
        formalTask12AMigration: false,
        capturedPathsSource: 'verified-migration-snapshot',
        restoreInFinally: true,
        restoreSeedMode: 'LegacyBaseline',
        restoreAuditFromSnapshot: true,
        productRestore: {
          status: 'publish',
          siteScopes: [],
          publicPath: null,
        },
      },
      runtimeSuites: {
        rejectSkippedSuites: true,
        suites: [
          {
            gate: 'vitest-live-product-fixture',
            test: 'tests/integration/wordpress/product-fixture-runtime.test.ts',
            environment: 'WORDPRESS_PRODUCT_FIXTURE_RUNTIME',
            log: 'vitest-live-product-fixture',
          },
          {
            gate: 'vitest-live-product-publication',
            test: 'tests/integration/wordpress/product-publication-runtime.test.ts',
            environment: 'WORDPRESS_PRODUCT_RUNTIME',
            log: 'vitest-live-product-publication',
          },
          {
            gate: 'vitest-live-seed',
            test: 'tests/integration/wordpress/seed-runtime.test.ts',
            environment: 'WORDPRESS_SEED_RUNTIME',
            log: 'vitest-live-seed',
          },
          {
            gate: 'vitest-live-homepage-migration',
            test: 'tests/integration/wordpress/seed-homepage-migration-runtime.test.ts',
            environment: 'WORDPRESS_SEED_RUNTIME',
            log: 'vitest-live-homepage-migration',
          },
          {
            gate: 'vitest-live-root-only-migration',
            test: 'tests/integration/wordpress/root-only-migration-runtime.test.ts',
            environment: 'WORDPRESS_ROOT_ONLY_RUNTIME',
            log: 'vitest-live-root-only-migration',
          },
        ],
      },
      summary: {
        inventoryVersion: 'root-only-v0.1',
        publishedUrlsPerSite: {'tio2-a': 1, 'tio2-b': 1},
        retainedDraftPagesPerSite: {'tio2-a': 504, 'tio2-b': 504},
        sitemapUrlsPerSite: {'tio2-a': 1, 'tio2-b': 1},
        crossSiteLeaks: 0,
        deletes: 0,
      },
    })
  })

  it('reads public counts from an injected versioned inventory and rejects zero roots', () => {
    const temporaryDirectory = mkdtempSync(join(tmpdir(), 'tio2-verify-inventory-'))
    const inventoryPath = join(temporaryDirectory, 'public-routes.json')
    const runPlan = () => spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        verifier,
        '-Plan',
        '-RootOnly',
        '-InventoryPath',
        inventoryPath,
      ],
      {encoding: 'utf8'},
    )

    try {
      writeFileSync(inventoryPath, JSON.stringify({
        version: 'inventory-test-v1',
        sites: {
          'tio2-a': {
            expectedPublicUrls: 2,
            routes: [
              {path: '/', template: 'site-a-homepage-active'},
              {path: '/approved', template: 'site-a-approved'},
            ],
          },
          'tio2-b': {
            expectedPublicUrls: 1,
            routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}],
          },
        },
      }))
      const inventoryPlan = runPlan()
      expect(inventoryPlan.status, inventoryPlan.stderr).toBe(0)
      expect(JSON.parse(inventoryPlan.stdout).inventory).toMatchObject({
        version: 'inventory-test-v1',
        expectedPublicUrls: {'tio2-a': 2, 'tio2-b': 1},
      })

      writeFileSync(inventoryPath, JSON.stringify({
        version: 'inventory-zero-v1',
        sites: {
          'tio2-a': {expectedPublicUrls: 0, routes: []},
          'tio2-b': {
            expectedPublicUrls: 1,
            routes: [{path: '/', template: 'site-b-homepage-v0.1-frozen'}],
          },
        },
      }))
      const zeroRoot = runPlan()
      expect(zeroRoot.status).not.toBe(0)
      expect(zeroRoot.stderr).toContain('exactly one root route')
    } finally {
      rmSync(temporaryDirectory, {recursive: true, force: true})
    }
  })

  it('rejects an untracked file by its exact path', () => {
    const probeName = `verify-untracked-probe-${process.pid}.txt`
    const probePath = resolve(probeName)
    writeFileSync(probePath, 'untracked verification probe')

    try {
      const result = spawnSync(
        'powershell',
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          verifier,
          '-CheckWorktree',
        ],
        {encoding: 'utf8'},
      )

      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(probeName)
    } finally {
      rmSync(probePath, {force: true})
    }
  })
})
