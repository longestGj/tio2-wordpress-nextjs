import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const seedScript = fileURLToPath(new URL('../../../scripts/seed-local-wordpress.ps1', import.meta.url))
const auditScript = fileURLToPath(new URL('../../../scripts/audit-seed.ps1', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_SEED_RUNTIME === '1'
const fixtureIds: number[] = []

function execute(command: string, arguments_: string[], timeout = 240_000) {
  return spawnSync(command, arguments_, {cwd: repositoryRoot, encoding: 'utf8', timeout})
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

function snapshotManagedState() {
  const php = String.raw`
$ids=get_posts(['post_type'=>['page','post','tio2_homepage'],'post_status'=>['publish','future','draft','pending','private','trash'],'posts_per_page'=>-1,'fields'=>'ids','orderby'=>'ID','order'=>'ASC']);
$rows=[];
foreach($ids as $id){
  $marker=(string)get_post_meta($id,'_tio2_seed_internal_slug',true);
  $home_marker=(string)get_post_meta($id,'_tio2_seed_homepage_site_id',true);
  if($marker==='' && $home_marker===''){continue;}
  $scopes=wp_get_object_terms($id,'site_scope',['fields'=>'slugs']);
  $rows[]=['id'=>(int)$id,'type'=>(string)get_post_type($id),'status'=>(string)get_post_status($id),'slug'=>(string)get_post_field('post_name',$id),'title'=>(string)get_post_field('post_title',$id),'content'=>(string)get_post_field('post_content',$id),'path'=>(string)get_post_meta($id,'public_path',true),'marker'=>$marker,'homepageMarker'=>$home_marker,'scopes'=>is_wp_error($scopes)?[]:array_values($scopes),'previousStatus'=>(string)get_post_meta($id,'_tio2_previous_root_status',true),'previousScopes'=>(string)get_post_meta($id,'_tio2_previous_root_site_scope',true),'superseded'=>(string)get_post_meta($id,'_tio2_seed_superseded_snapshot',true)];
}
echo 'TIO2_STATE '.wp_json_encode($rows);
`
  const result = wp(['eval', php])
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  const match = result.stdout.match(/TIO2_STATE (\[.*\])/)
  expect(match, result.stdout).not.toBeNull()
  return JSON.parse(match![1]) as unknown[]
}

function rawFixture(php: string) {
  const result = wp(['eval', php])
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  const id = Number(result.stdout.trim().split(/\s+/).at(-1))
  expect(id).toBeGreaterThan(0)
  fixtureIds.push(id)
  return id
}

function deleteFixture(id: number) {
  const result = wp(['post', 'delete', String(id), '--force'])
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  fixtureIds.splice(fixtureIds.indexOf(id), 1)
}

describe.runIf(runLiveWordPress)('homepage seed migration transaction', () => {
  afterAll(() => {
    for (const id of [...fixtureIds]) {
      wp(['post', 'delete', String(id), '--force'])
    }
    fixtureIds.length = 0
  })

  it('restores exact managed state for failures before and after root release', () => {
    for (const failurePoint of ['before-homepage-write', 'after-root-release']) {
      const before = snapshotManagedState()
      const failed = powershell(seedScript, [
        '-ScalePages',
        '500',
        '-FailurePoint',
        failurePoint,
      ])
      expect(failed.status).not.toBe(0)
      expect(`${failed.stdout}\n${failed.stderr}`).toContain('Injected seed failure')
      expect(snapshotManagedState()).toEqual(before)
    }

    for (const marked of [false, true]) {
      const homepageId = rawFixture(String.raw`
global $wpdb;
$wpdb->insert($wpdb->posts,['post_author'=>1,'post_date'=>current_time('mysql'),'post_date_gmt'=>current_time('mysql',true),'post_content'=>'Preflight fixture','post_title'=>'Preflight homepage candidate','post_status'=>'draft','post_name'=>'${marked ? 'marked-homepage-candidate' : 'tio2-a--homepage'}','post_modified'=>current_time('mysql'),'post_modified_gmt'=>current_time('mysql',true),'post_parent'=>0,'guid'=>'','post_type'=>'tio2_homepage','comment_count'=>0]);
$id=(int)$wpdb->insert_id;
${marked ? "add_post_meta($id,'_tio2_seed_homepage_site_id','tio2-a');" : ''}
echo $id;
`)
      const collisionState = snapshotManagedState()
      const collisionSeed = powershell(seedScript, ['-ScalePages', '500'])
      expect(collisionSeed.status).not.toBe(0)
      expect(`${collisionSeed.stdout}\n${collisionSeed.stderr}`).toMatch(
        /Unproven homepage candidate|Ambiguous seeded homepage identity/,
      )
      expect(snapshotManagedState()).toEqual(collisionState)
      deleteFixture(homepageId)
    }

    const rootConflictId = rawFixture(String.raw`
global $wpdb;
$term=get_term_by('slug','tio2-a','site_scope');
$wpdb->insert($wpdb->posts,['post_author'=>1,'post_date'=>current_time('mysql'),'post_date_gmt'=>current_time('mysql',true),'post_content'=>'Root conflict fixture','post_title'=>'Raw root conflict','post_status'=>'draft','post_name'=>'raw-root-conflict','post_modified'=>current_time('mysql'),'post_modified_gmt'=>current_time('mysql',true),'post_parent'=>0,'guid'=>'','post_type'=>'post','comment_count'=>0]);
$id=(int)$wpdb->insert_id;
add_post_meta($id,'public_path','/');
$wpdb->insert($wpdb->term_relationships,['object_id'=>$id,'term_taxonomy_id'=>(int)$term->term_taxonomy_id,'term_order'=>0]);
echo $id;
`)
    const rootCollisionState = snapshotManagedState()
    const rootCollisionSeed = powershell(seedScript, ['-ScalePages', '500'])
    expect(rootCollisionSeed.status).not.toBe(0)
    expect(`${rootCollisionSeed.stdout}\n${rootCollisionSeed.stderr}`).toContain(
      'Ambiguous Page/Post root ownership',
    )
    expect(snapshotManagedState()).toEqual(rootCollisionState)
    deleteFixture(rootConflictId)

    const prepareRoots = wp(['eval', String.raw`
global $wpdb;
foreach(['tio2-a','tio2-b'] as $site_id){
  $ids=get_posts(['post_type'=>'page','post_status'=>['publish','draft'],'posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_seed_internal_slug','meta_value'=>$site_id.'--home']);
  if(count($ids)!==1){WP_CLI::error('Missing unique root backup for '.$site_id);}
  $id=(int)$ids[0];
  wp_set_object_terms($id,[$site_id],'site_scope',false);
  $wpdb->update($wpdb->posts,['post_status'=>'publish','post_name'=>$site_id.'--home'],['ID'=>$id],['%s','%s'],['%d']);
  clean_post_cache($id);
}
`])
    expect(prepareRoots.status, `${prepareRoots.stdout}\n${prepareRoots.stderr}`).toBe(0)
    const rootsBeforeSuccessfulMigration = snapshotManagedState().filter((entry) => {
      const route = entry as {marker: string}
      return route.marker === 'tio2-a--home' || route.marker === 'tio2-b--home'
    }) as Array<{
      id: number
      status: string
      slug: string
      content: string
      path: string
      marker: string
      scopes: string[]
    }>
    expect(rootsBeforeSuccessfulMigration).toHaveLength(2)

    const faultyUnpaddedId = rawFixture(String.raw`
global $wpdb;
$term=get_term_by('slug','tio2-a','site_scope');
$wpdb->insert($wpdb->posts,['post_author'=>1,'post_date'=>current_time('mysql'),'post_date_gmt'=>current_time('mysql',true),'post_content'=>'<p><strong>SYNTHETIC TEST CONTENT.</strong> Proven faulty branch route.</p>','post_title'=>'Faulty unpadded route','post_status'=>'publish','post_name'=>'tio2-a--test-content--long-tail-1','post_modified'=>current_time('mysql'),'post_modified_gmt'=>current_time('mysql',true),'post_parent'=>0,'guid'=>'','post_type'=>'page','comment_count'=>0]);
$id=(int)$wpdb->insert_id;
add_post_meta($id,'public_path','/test-content/long-tail-1');
add_post_meta($id,'_tio2_seed_internal_slug','tio2-a--test-content--long-tail-1');
$wpdb->insert($wpdb->term_relationships,['object_id'=>$id,'term_taxonomy_id'=>(int)$term->term_taxonomy_id,'term_order'=>0]);
echo $id;
`)

    const seed = powershell(seedScript, ['-ScalePages', '500'])
    expect(seed.status, `${seed.stdout}\n${seed.stderr}`).toBe(0)
    expect(seed.stdout).toContain('"pages_superseded":1')
    const successfulState = snapshotManagedState()
    for (const rootBefore of rootsBeforeSuccessfulMigration) {
      expect(successfulState.find(
        (entry) => (entry as {id: number}).id === rootBefore.id,
      )).toMatchObject({
        id: rootBefore.id,
        status: 'draft',
        slug: rootBefore.slug,
        content: rootBefore.content,
        path: rootBefore.path,
        marker: rootBefore.marker,
        scopes: [],
      })
    }
    const corrected = successfulState.find(
      (entry) => (entry as {id: number}).id === faultyUnpaddedId,
    ) as {
      id: number
      status: string
      slug: string
      content: string
      path: string
      scopes: string[]
      superseded: string
    }
    expect(corrected).toMatchObject({
      id: faultyUnpaddedId,
      status: 'draft',
      slug: 'tio2-a--test-content--long-tail-1',
      content: '<p><strong>SYNTHETIC TEST CONTENT.</strong> Proven faulty branch route.</p>',
      path: '/test-content/long-tail-1',
      scopes: ['tio2-a'],
    })
    expect(JSON.parse(corrected.superseded)).toEqual({
      status: 'publish',
      slug: 'tio2-a--test-content--long-tail-1',
      publicPath: '/test-content/long-tail-1',
      siteScopes: ['tio2-a'],
    })
    const audit = powershell(auditScript, ['-ExpectedPerSite', '505'])
    expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0)
    deleteFixture(faultyUnpaddedId)
  }, 600_000)
})
