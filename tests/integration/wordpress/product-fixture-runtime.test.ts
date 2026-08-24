import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, describe, expect, it} from 'vitest'

import {runUnconditionalRestore} from './live-seed-lifecycle'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const seedScript = fileURLToPath(
  new URL('../../../scripts/seed-local-wordpress.ps1', import.meta.url),
)
const auditScript = fileURLToPath(new URL('../../../scripts/audit-seed.ps1', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_PRODUCT_FIXTURE_RUNTIME === '1'

interface ProductFixtureState {
  id: number
  fixtureId: string
  postType: string
  status: string
  siteScopes: string[]
  publicPath: string | null
  slug: string
  title: string
  content: string
  excerpt: string
  technicalSummary: string
  evidenceSourceUrl: string
  attachmentIds: number[]
}

function execute(command: string, arguments_: string[], timeout = 900_000) {
  return spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout,
  })
}

function powershell(script: string, arguments_: string[] = []) {
  return execute('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    ...arguments_,
  ])
}

function wp(arguments_: string[]) {
  return execute(
    'docker',
    [
      'compose',
      '--env-file',
      'wordpress/.env',
      '-f',
      'wordpress/docker-compose.yml',
      'run',
      '--rm',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      ...arguments_,
    ],
    180_000,
  )
}

function requireSuccess(result: ReturnType<typeof execute>, label: string): string {
  if (result.error || result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`,
    )
  }
  return result.stdout.trim()
}

function seed(mode: 'RootOnly' | 'LegacyBaseline') {
  return powershell(seedScript, ['-ScalePages', '500', '-SeedMode', mode])
}

function auditLegacyBaseline(): void {
  requireSuccess(
    powershell(auditScript, ['-ExpectedPerSite', '505']),
    'LegacyBaseline 505/505 audit',
  )
}

function readSeedSummary(output: string): Record<string, number> {
  const match = output.match(/TIO2_SEED_SUMMARY\s+(\{[^\r\n]+\})/)
  if (!match) throw new Error(`Seed output omitted TIO2_SEED_SUMMARY:\n${output}`)
  return JSON.parse(match[1]!) as Record<string, number>
}

function requireZeroDeleteSeed(
  result: ReturnType<typeof execute>,
  label: string,
): Record<string, number> {
  const output = requireSuccess(result, label)
  const summary = readSeedSummary(output)
  if (summary.entities_duplicates_deleted !== 0 || summary.pages_duplicates_deleted !== 0) {
    throw new Error(`${label} deleted managed records: ${JSON.stringify(summary)}`)
  }
  return summary
}

function productState(): ProductFixtureState {
  const php = String.raw`
$ids=get_posts(['post_type'=>'tio2_product','post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_seed_fixture_id','meta_value'=>'test-product-reference']);
if (1!==count($ids)) { fwrite(STDERR,'Product fixture is missing or ambiguous.'); exit(1); }
$id=(int)$ids[0];
$scopes=wp_get_object_terms($id,'site_scope',['fields'=>'slugs']);
if (is_wp_error($scopes)) { fwrite(STDERR,$scopes->get_error_message()); exit(1); }
$attachments=get_children(['post_parent'=>$id,'post_type'=>'attachment','post_status'=>'any','fields'=>'ids','orderby'=>'ID','order'=>'ASC']);
$path=get_post_meta($id,'public_path',true);
echo wp_json_encode([
  'id'=>$id,
  'fixtureId'=>(string)get_post_meta($id,'_tio2_seed_fixture_id',true),
  'postType'=>(string)get_post_type($id),
  'status'=>(string)get_post_status($id),
  'siteScopes'=>array_values($scopes),
  'publicPath'=>''===$path?null:(string)$path,
  'slug'=>(string)get_post_field('post_name',$id),
  'title'=>(string)get_post_field('post_title',$id),
  'content'=>(string)get_post_field('post_content',$id),
  'excerpt'=>(string)get_post_field('post_excerpt',$id),
  'technicalSummary'=>(string)get_post_meta($id,'technical_summary',true),
  'evidenceSourceUrl'=>(string)get_post_meta($id,'evidence_source_url',true),
  'attachmentIds'=>array_values(array_map('intval',$attachments)),
]);`
  return JSON.parse(requireSuccess(wp(['eval', php]), 'Product fixture export')) as ProductFixtureState
}

function anonymousGraphqlProductIds(): number[] {
  const php = String.raw`
wp_set_current_user(0);
$result=graphql(['query'=>'{ tio2Products(first: 100) { nodes { databaseId } } }']);
if (!empty($result['errors'])) { fwrite(STDERR,wp_json_encode($result['errors'])); exit(1); }
$nodes=$result['data']['tio2Products']['nodes']??[];
echo wp_json_encode(array_values(array_map(static fn(array $node):int=>(int)$node['databaseId'],$nodes)));`
  return JSON.parse(requireSuccess(wp(['eval', php]), 'anonymous Product GraphQL query')) as number[]
}

const expectedContent = {
  fixtureId: 'test-product-reference',
  postType: 'tio2_product',
  publicPath: null,
  slug: 'test-product-reference',
  title: 'Synthetic Test Product Reference',
  content:
    '<p><strong>SYNTHETIC TEST CONTENT.</strong> Placeholder product entity for local integration behavior only. It is not a commercial offer or specification.</p>',
  excerpt: '',
  evidenceSourceUrl: 'https://example.test/synthetic-only',
  attachmentIds: [],
} as const

function preservedContent(state: ProductFixtureState) {
  return {
    id: state.id,
    fixtureId: state.fixtureId,
    postType: state.postType,
    publicPath: state.publicPath,
    slug: state.slug,
    title: state.title,
    content: state.content,
    excerpt: state.excerpt,
    technicalSummary: state.technicalSummary,
    evidenceSourceUrl: state.evidenceSourceUrl,
    attachmentIds: state.attachmentIds,
  }
}

let capturedLegacyBaseline: ProductFixtureState | undefined

describe.runIf(runLiveWordPress)('live WordPress Product fixture lifecycle', () => {
  afterAll(() => {
    runUnconditionalRestore({
      cleanup: [],
      restore: () => {
        requireZeroDeleteSeed(seed('LegacyBaseline'), 'LegacyBaseline Product fixture restore')
        const restored = productState()
        expect(restored).toMatchObject({
          ...expectedContent,
          status: 'publish',
          siteScopes: [],
        })
        if (capturedLegacyBaseline) {
          expect(preservedContent(restored)).toEqual(preservedContent(capturedLegacyBaseline))
        }
      },
      audit: auditLegacyBaseline,
    })
  }, 1_200_000)

  it('is idempotent, private to anonymous GraphQL, zero-delete, and content preserving', () => {
    requireZeroDeleteSeed(seed('LegacyBaseline'), 'LegacyBaseline setup')
    const legacy = productState()
    capturedLegacyBaseline = legacy
    expect(legacy).toMatchObject({
      ...expectedContent,
      status: 'publish',
      siteScopes: [],
    })

    expect(requireZeroDeleteSeed(seed('RootOnly'), 'first RootOnly Product fixture seed')).toMatchObject({
      entities_duplicates_deleted: 0,
      pages_duplicates_deleted: 0,
    })
    const first = productState()
    expect(first).toMatchObject({
      ...expectedContent,
      id: legacy.id,
      status: 'draft',
      siteScopes: ['tio2-a'],
    })
    expect(preservedContent(first)).toEqual(preservedContent(legacy))
    expect(anonymousGraphqlProductIds()).not.toContain(first.id)

    expect(requireZeroDeleteSeed(seed('RootOnly'), 'second RootOnly Product fixture seed')).toMatchObject({
      entities_duplicates_deleted: 0,
      pages_duplicates_deleted: 0,
    })
    expect(productState()).toEqual(first)
  }, 1_200_000)
})
