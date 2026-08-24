import {existsSync, readFileSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {runUnconditionalRestore} from './live-seed-lifecycle'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const seedScript = fileURLToPath(new URL('../../../scripts/seed-local-wordpress.ps1', import.meta.url))
const auditScript = fileURLToPath(new URL('../../../scripts/audit-seed.ps1', import.meta.url))
const migrateScript = fileURLToPath(
  new URL('../../../scripts/migrate-root-only-wordpress.ps1', import.meta.url),
)
const restoreScript = fileURLToPath(
  new URL('../../../scripts/restore-root-only-wordpress.ps1', import.meta.url),
)
const evidenceDirectory = join(repositoryRoot, '.local-evidence', 'task-9c-live-test')
const runLiveWordPress = process.env.WORDPRESS_ROOT_ONLY_RUNTIME === '1'

function execute(command: string, arguments_: string[], timeout = 1_200_000) {
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
  return execute('docker', [
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
  ])
}

function requireSuccess(result: ReturnType<typeof execute>, label: string): string {
  if (result.error || result.status !== 0) {
    throw new Error(
      `${label} failed: ${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`,
    )
  }
  return result.stdout.trim()
}

function requireFailure(result: ReturnType<typeof execute>, label: string): string {
  if (!result.error && result.status === 0) {
    throw new Error(`${label} unexpectedly succeeded:\n${result.stdout}\n${result.stderr}`)
  }
  return `${result.stdout}\n${result.stderr}`
}

function seedLegacyBaseline(): void {
  requireSuccess(
    powershell(seedScript, ['-ScalePages', '500', '-SeedMode', 'LegacyBaseline']),
    'LegacyBaseline seed',
  )
}

function auditLegacyBaseline(): void {
  const output = requireSuccess(
    powershell(auditScript, ['-ExpectedPerSite', '505']),
    'independent LegacyBaseline 505/505 audit',
  )
  expect(output).toContain('tio2-a: 505 public URLs')
  expect(output).toContain('tio2-b: 505 public URLs')
}

function auditRootOnlyTarget(): void {
  const output = requireSuccess(
    powershell(auditScript, ['-ExpectedPerSite', '1']),
    'independent RootOnly 1/1 audit',
  )
  expect(output).toContain('tio2-a: 1 public URLs')
  expect(output).toContain('tio2-b: 1 public URLs')
}

interface LiveState {
  pages: Array<{
    id: number
    status: string
    siteScope: string
    publicPath: string
    slug: string
    title: string
    content: string
    meta: Record<string, unknown>
    attachments: number[]
  }>
  product: {
    id: number
    status: string
    siteScopes: string[]
    publicPath: null
    slug: string
    title: string
    content: string
  }
}

function liveState(): LiveState {
  const php = String.raw`
$pages=[];
$ids=get_posts(['post_type'=>'page','post_status'=>['publish','draft','pending','private','future','trash'],'posts_per_page'=>-1,'fields'=>'ids','orderby'=>'ID','order'=>'ASC']);
foreach($ids as $id){
  $path=(string)get_post_meta($id,'public_path',true);
  $superseded=(string)get_post_meta($id,'_tio2_seed_superseded_snapshot',true);
  $scopes=wp_get_object_terms($id,'site_scope',['fields'=>'slugs']);
  if('/'===$path || ''===$path || ''!==$superseded || is_wp_error($scopes) || 1!==count($scopes) || !in_array($scopes[0],['tio2-a','tio2-b'],true)){continue;}
  $meta=get_post_meta($id);
  ksort($meta,SORT_STRING);
  $attachments=get_children(['post_parent'=>$id,'post_type'=>'attachment','post_status'=>'any','fields'=>'ids','orderby'=>'ID','order'=>'ASC']);
  $pages[]=['id'=>(int)$id,'status'=>(string)get_post_status($id),'siteScope'=>(string)$scopes[0],'publicPath'=>$path,'slug'=>(string)get_post_field('post_name',$id),'title'=>(string)get_post_field('post_title',$id),'content'=>(string)get_post_field('post_content',$id),'meta'=>$meta,'attachments'=>array_values(array_map('intval',$attachments))];
}
$products=get_posts(['post_type'=>'tio2_product','post_status'=>['publish','draft','pending','private','future','trash'],'posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_seed_fixture_id','meta_value'=>'test-product-reference']);
if(1!==count($products)){WP_CLI::error('Product fixture is missing or ambiguous.');}
$product_id=(int)$products[0]; $product_scopes=wp_get_object_terms($product_id,'site_scope',['fields'=>'slugs']);
$product_path=(string)get_post_meta($product_id,'public_path',true);
echo wp_json_encode(['pages'=>$pages,'product'=>['id'=>$product_id,'status'=>(string)get_post_status($product_id),'siteScopes'=>array_values($product_scopes),'publicPath'=>''===$product_path?null:$product_path,'slug'=>(string)get_post_field('post_name',$product_id),'title'=>(string)get_post_field('post_title',$product_id),'content'=>(string)get_post_field('post_content',$product_id)]]);`
  return JSON.parse(requireSuccess(wp(['eval', php]), 'live state export')) as LiveState
}

function mutationSummary(output: string) {
  const matches = [...output.matchAll(/TIO2_ROOT_ONLY_RESULT\s+(\{[^\r\n]+\})/g)]
  if (matches.length === 0) throw new Error(`Migration result missing:\n${output}`)
  return JSON.parse(matches.at(-1)![1]!) as {
    mode: string
    state: string
    mutated: number
    snapshotPath?: string
    snapshotChecksum: string
    invalidationBatches: Array<{siteId: string; paths: string[]}>
  }
}

function pageWithoutStatus(page: LiveState['pages'][number]) {
  return {
    id: page.id,
    siteScope: page.siteScope,
    publicPath: page.publicPath,
    slug: page.slug,
    title: page.title,
    content: page.content,
    meta: page.meta,
    attachments: page.attachments,
  }
}

function migrate(arguments_: string[] = []) {
  return powershell(migrateScript, [
    '-EvidenceDirectory',
    evidenceDirectory,
    ...arguments_,
  ])
}

function restore(snapshotPath: string, arguments_: string[] = []) {
  return powershell(restoreScript, ['-SnapshotPath', snapshotPath, ...arguments_])
}

function updatePageContent(pageId: number, content: string, label: string): void {
  const php = String.raw`
$priority=has_filter('wp_insert_post_data','tio2_guard_managed_publication');
$removed=false;
if(false!==$priority){$removed=remove_filter('wp_insert_post_data','tio2_guard_managed_publication',$priority);if(!$removed){WP_CLI::error('Could not enter test editorial context.');}}
$slug=(string)get_post_field('post_name',${pageId});
$preserve=static fn(string $sanitized,string $raw,string $context):string=>$raw===$slug?$slug:$sanitized;
add_filter('sanitize_title',$preserve,PHP_INT_MAX,3);
try{$result=wp_update_post(wp_slash(['ID'=>${pageId},'post_content'=>${JSON.stringify(content)},'post_name'=>$slug]),true);if(is_wp_error($result)){WP_CLI::error($result->get_error_message());}}
finally{remove_filter('sanitize_title',$preserve,PHP_INT_MAX);if($removed){add_filter('wp_insert_post_data','tio2_guard_managed_publication',$priority,4);}}`
  requireSuccess(wp(['eval', php]), label)
}

function updatePageStatus(pageId: number, status: 'publish' | 'draft', label: string): void {
  const php = String.raw`
$slug=(string)get_post_field('post_name',${pageId});
$preserve=static fn(string $sanitized,string $raw,string $context):string=>$raw===$slug?$slug:$sanitized;
add_filter('sanitize_title',$preserve,PHP_INT_MAX,3);
try{$result=wp_update_post(['ID'=>${pageId},'post_status'=>'${status}','post_name'=>$slug],true);if(is_wp_error($result)){WP_CLI::error($result->get_error_message());}}
finally{remove_filter('sanitize_title',$preserve,PHP_INT_MAX);}`
  requireSuccess(wp(['eval', php]), label)
}

function withRestoredLegacyBaseline(callback: () => void): void {
  let bodyFailure: unknown
  try {
    seedLegacyBaseline()
    auditLegacyBaseline()
    callback()
  } catch (error) {
    bodyFailure = error
  }

  try {
    runUnconditionalRestore({
      cleanup: [],
      restore: seedLegacyBaseline,
      audit: auditLegacyBaseline,
    })
  } catch (cleanupError) {
    if (bodyFailure instanceof Error) {
      ;(bodyFailure as Error & {suppressed?: unknown[]}).suppressed = [cleanupError]
    } else {
      throw cleanupError
    }
  }

  if (bodyFailure) throw bodyFailure
}

describe.runIf(runLiveWordPress)('live reversible root-only retirement', () => {
  it('dry-runs, retires idempotently, preserves retained data, and restores status/scope without overwriting copy', () => {
    withRestoredLegacyBaseline(() => {
      const legacy = liveState()
      expect(legacy.pages).toHaveLength(1008)
      expect(legacy.pages.every((page) => page.status === 'publish')).toBe(true)
      expect(legacy.product).toMatchObject({
        status: 'publish',
        siteScopes: [],
        publicPath: null,
        slug: 'test-product-reference',
      })

      const dryRunOutput = requireSuccess(migrate(['-DryRun']), 'root-only dry-run')
      const dryRun = mutationSummary(dryRunOutput)
      expect(dryRun).toMatchObject({mode: 'dry-run', state: 'legacy', mutated: 0})
      expect(liveState()).toEqual(legacy)
      expect(dryRun.snapshotPath).toBeTruthy()

      const firstOutput = requireSuccess(
        migrate(['-SnapshotPath', dryRun.snapshotPath!]),
        'first retirement',
      )
      const first = mutationSummary(firstOutput)
      expect(first).toMatchObject({mode: 'retire', state: 'target', mutated: 1009})
      expect(first.invalidationBatches.length).toBeGreaterThan(0)
      expect(first.invalidationBatches.every((batch) => batch.paths.length <= 256)).toBe(true)
      expect(first.invalidationBatches.every((batch) => ['tio2-a', 'tio2-b'].includes(batch.siteId))).toBe(true)

      const target = liveState()
      expect(target.pages).toHaveLength(1008)
      expect(target.pages.every((page) => page.status === 'draft')).toBe(true)
      expect(target.product).toMatchObject({status: 'draft', siteScopes: ['tio2-a']})
      expect(target.pages.map(pageWithoutStatus)).toEqual(legacy.pages.map(pageWithoutStatus))
      expect({...target.product, status: '', siteScopes: []}).toEqual({
        ...legacy.product,
        status: '',
        siteScopes: [],
      })
      auditRootOnlyTarget()

      const second = mutationSummary(
        requireSuccess(
          migrate(['-SnapshotPath', dryRun.snapshotPath!]),
          'idempotent second retirement',
        ),
      )
      expect(second).toMatchObject({mode: 'retire', state: 'target', mutated: 0})

      const editedPage = target.pages[0]!
      const editedCopy = `${editedPage.content}\n<p>Legitimate post-migration editorial edit.</p>`
      updatePageContent(editedPage.id, editedCopy, 'post-migration editorial edit')

      const restored = mutationSummary(
        requireSuccess(restore(dryRun.snapshotPath!), 'snapshot restore'),
      )
      expect(restored).toMatchObject({mode: 'restore', state: 'legacy', mutated: 1009})
      const afterRestore = liveState()
      expect(afterRestore.pages.every((page) => page.status === 'publish')).toBe(true)
      expect(afterRestore.pages.find((page) => page.id === editedPage.id)?.content).toBe(editedCopy)
      expect(afterRestore.product).toMatchObject({status: 'publish', siteScopes: []})

      const repeatedRestore = mutationSummary(
        requireSuccess(restore(dryRun.snapshotPath!), 'idempotent repeated restore'),
      )
      expect(repeatedRestore).toMatchObject({mode: 'restore', state: 'legacy', mutated: 0})
      auditLegacyBaseline()
    })
  }, 1_200_000)

  it('fails before mutation on drift/mixed ownership and compensates a partial transition', () => {
    withRestoredLegacyBaseline(() => {
      const baseline = liveState()
      const dryRun = mutationSummary(requireSuccess(migrate(['-DryRun']), 'failure test snapshot'))
      const snapshotPath = dryRun.snapshotPath!

      const driftPage = baseline.pages[0]!
      const originalContent = driftPage.content
      updatePageContent(driftPage.id, 'checksum drift', 'checksum drift setup')
      expect(requireFailure(migrate(['-SnapshotPath', snapshotPath]), 'checksum drift preflight')).toContain(
        'content checksum drift',
      )
      expect(liveState().pages.every((page) => page.status === 'publish')).toBe(true)
      updatePageContent(driftPage.id, originalContent, 'checksum drift cleanup')

      const mixedPage = baseline.pages[1]!
      updatePageStatus(mixedPage.id, 'draft', 'mixed state setup')
      expect(requireFailure(migrate(['-SnapshotPath', snapshotPath]), 'mixed state preflight')).toContain(
        'mixed',
      )
      seedLegacyBaseline()

      const ambiguousPage = liveState().pages[2]!
      requireSuccess(
        wp(['eval', `wp_set_object_terms(${ambiguousPage.id},['tio2-a','tio2-b'],'site_scope',false);`]),
        'ambiguous scope setup',
      )
      expect(
        requireFailure(migrate(['-SnapshotPath', snapshotPath]), 'ambiguous owner preflight'),
      ).toContain('ambiguous')
      seedLegacyBaseline()

      const partialFailure = requireFailure(
        migrate(['-SnapshotPath', snapshotPath, '-FailureAfter', '5']),
        'partial transition injection',
      )
      expect(partialFailure).toContain('Injected transition failure')
      expect(partialFailure).toContain('compensating rollback complete')
      expect(liveState()).toEqual(baseline)

      const tamperedPath = join(evidenceDirectory, 'tampered-snapshot.json')
      expect(existsSync(snapshotPath)).toBe(true)
      const tampered = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Record<string, unknown>
      tampered.inventoryVersion = 'tampered'
      writeFileSync(tamperedPath, JSON.stringify(tampered), 'utf8')
      expect(requireFailure(restore(tamperedPath), 'tampered restore snapshot')).toMatch(
        /snapshot checksum/i,
      )
      expect(liveState()).toEqual(baseline)
      auditLegacyBaseline()
    })
  }, 1_200_000)

  it('compensates forward and postflight failures, attempts every rollback record, and reports recoverable partial state', () => {
    withRestoredLegacyBaseline(() => {
      const newSnapshot = () =>
        mutationSummary(requireSuccess(migrate(['-DryRun']), 'failure-path snapshot')).snapshotPath!

      let snapshotPath = newSnapshot()
      const legacy = liveState()
      const retirePostflight = requireFailure(
        migrate(['-SnapshotPath', snapshotPath, '-PostflightFailure']),
        'retire postflight failure',
      )
      expect(retirePostflight).toContain('Injected retirement postflight failure')
      expect(retirePostflight).toContain('compensating rollback complete')
      expect(liveState()).toEqual(legacy)

      const retireRollbackFailure = requireFailure(
        migrate([
          '-SnapshotPath', snapshotPath,
          '-FailureAfter', '5',
          '-RollbackFailureAt', '2',
        ]),
        'retire rollback operation failure',
      )
      expect(retireRollbackFailure).toContain('Injected retirement rollback operation failure')
      expect(retireRollbackFailure).toContain('source verification FAILED')
      const recoverableRetire = liveState()
      expect(recoverableRetire.pages.filter(({status}) => status === 'draft')).toHaveLength(1)
      expect(recoverableRetire.pages.filter(({status}) => status === 'publish')).toHaveLength(1007)

      seedLegacyBaseline()
      auditLegacyBaseline()
      snapshotPath = newSnapshot()
      requireSuccess(migrate(['-SnapshotPath', snapshotPath]), 'prepare restore failure target')
      const target = liveState()

      const restoreForward = requireFailure(
        restore(snapshotPath, ['-FailureAfter', '5']),
        'restore forward failure',
      )
      expect(restoreForward).toContain('Injected restore transition failure')
      expect(restoreForward).toContain('compensating rollback complete')
      expect(liveState()).toEqual(target)

      const restorePostflight = requireFailure(
        restore(snapshotPath, ['-PostflightFailure']),
        'restore postflight failure',
      )
      expect(restorePostflight).toContain('Injected restore postflight failure')
      expect(restorePostflight).toContain('compensating rollback complete')
      expect(liveState()).toEqual(target)

      const restoreRollbackFailure = requireFailure(
        restore(snapshotPath, ['-FailureAfter', '5', '-RollbackFailureAt', '2']),
        'restore rollback operation failure',
      )
      expect(restoreRollbackFailure).toContain('Injected restore rollback operation failure')
      expect(restoreRollbackFailure).toContain('source verification FAILED')
      const recoverableRestore = liveState()
      expect(recoverableRestore.pages.filter(({status}) => status === 'publish')).toHaveLength(1)
      expect(recoverableRestore.pages.filter(({status}) => status === 'draft')).toHaveLength(1007)
    })
  }, 1_200_000)
})
