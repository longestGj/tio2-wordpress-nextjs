import {wordpressComposeArgs} from '../../helpers/wordpress-compose'
import {registerSharedWordPressMutationLock} from '../../helpers/wordpress-test-support'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, beforeAll, describe, expect, it} from 'vitest'
import {startIsolatedWordPress} from '../../helpers/wordpress-runtime'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_PRODUCT_RUNTIME === '1'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: true, serialMutationAuthorized: true} as const
registerSharedWordPressMutationLock(runLiveWordPress)
const fixtureTitle = 'TiO2 Product runtime closure fixture'
let fixtureId = 0

function wp(arguments_: string[]) {
  return spawnSync(
    'docker',
    [
      ...wordpressComposeArgs({...WORDPRESS_RUNTIME_MODE, runId: 'product-publication-runtime'}),
      'run',
      '--rm',
      '--no-deps',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      ...arguments_,
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 120_000},
  )
}

function requireWpSuccess(result: ReturnType<typeof wp>) {
  expect(result.error).toBeUndefined()
  expect(result.status, result.stderr || result.stdout).toBe(0)
  return result.stdout.trim()
}

function curl(arguments_: string[]) {
  return spawnSync('curl.exe', arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout: 30_000,
  })
}

let wordpressUrl: string
let graphqlUrl: string

beforeAll(async () => {
  if (!runLiveWordPress) return
  const runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId: 'product-publication-runtime'})
  if (!runtime.graphqlUrl) throw new Error('The shared CMS has no published HTTP endpoint')
  graphqlUrl = runtime.graphqlUrl
  wordpressUrl = new URL('/', graphqlUrl).origin
})

describe.runIf(runLiveWordPress)('live WordPress Product public-surface closure', () => {
  afterAll(() => {
    if (fixtureId > 0) {
      wp(['post', 'delete', String(fixtureId), '--force'])
    }
  })

  it('executes against live WordPress and keeps Product authoring while closing native and GraphQL access', async () => {
    const insert = wp([
      'post',
      'create',
      '--post_type=tio2_product',
      '--post_status=publish',
      `--post_title=${fixtureTitle}`,
      '--post_name=product-runtime-closure-fixture',
      '--porcelain',
    ])
    fixtureId = Number.parseInt(requireWpSuccess(insert), 10)
    expect(fixtureId).toBeGreaterThan(0)

    const state = JSON.parse(
      requireWpSuccess(
        wp([
          'eval',
          `echo wp_json_encode(['status'=>get_post_status(${fixtureId}),'showUi'=>get_post_type_object('tio2_product')->show_ui,'showRest'=>get_post_type_object('tio2_product')->show_in_rest,'showGraphql'=>get_post_type_object('tio2_product')->show_in_graphql]);`,
        ]),
      ),
    ) as {status: string; showUi: boolean; showRest: boolean; showGraphql: boolean}
    expect(state).toEqual({
      status: 'draft',
      showUi: true,
      showRest: true,
      showGraphql: true,
    })

    const nativeSingle = curl([
      '--noproxy',
      '*',
      '--max-time',
      '10',
      '--silent',
      '--show-error',
      '--output',
      'NUL',
      '--write-out',
      '%{http_code}',
      `${wordpressUrl}/?post_type=tio2_product&p=${fixtureId}`,
    ])
    expect(nativeSingle.error).toBeUndefined()
    expect(nativeSingle.status, nativeSingle.stderr).toBe(0)
    expect(Number.parseInt(nativeSingle.stdout, 10), 'native Product single unexpectedly resolved').toBe(404)

    for (const path of ['/tio2-product/product-runtime-closure-fixture/', '/tio2-product/']) {
      const response = curl([
        '--noproxy',
        '*',
        '--max-time',
        '10',
        '--silent',
        '--show-error',
        '--output',
        'NUL',
        '--write-out',
        '%{http_code}',
        `${wordpressUrl}${path}`,
      ])
      expect(response.error).toBeUndefined()
      expect(response.status, response.stderr).toBe(0)
      expect(Number.parseInt(response.stdout, 10), `${path} unexpectedly resolved`).toBe(404)
    }

    const graphqlResponse = curl([
      '--noproxy',
      '*',
      '--max-time',
      '10',
      '--silent',
      '--show-error',
      '--fail-with-body',
      '--header',
      'content-type: application/json',
      '--data',
      JSON.stringify({
        query: '{ tio2Products(first: 100) { nodes { databaseId title status } } }',
      }),
      graphqlUrl,
    ])
    expect(graphqlResponse.error).toBeUndefined()
    expect(graphqlResponse.status, graphqlResponse.stderr || graphqlResponse.stdout).toBe(0)
    const graphqlBody = JSON.parse(graphqlResponse.stdout) as {
      data?: {tio2Products?: {nodes?: Array<{databaseId: number; title: string; status: string}>}}
      errors?: unknown[]
    }
    expect(graphqlBody.errors).toBeUndefined()
    expect(graphqlBody.data?.tio2Products?.nodes).not.toContainEqual(
      expect.objectContaining({databaseId: fixtureId}),
    )
  }, 30_000)
})
