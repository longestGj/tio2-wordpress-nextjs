import {registerSharedWordPressMutationLock} from '../../helpers/wordpress-test-support'


import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {createElement, type ImgHTMLAttributes} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

import {describe, expect, it, vi} from 'vitest'

import {MalaysiaApplicationHub} from '@/components/sites/tio2-my/applications/malaysia-application-hub'
import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {malaysiaProductHubSource} from '@/tests/fixtures/tio2-my-product-hub'
import applicationContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true} as const

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => createElement('img', props),
}))

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runRuntime = process.env.TIO2_MY_PRERELEASE_READINESS_RUNTIME === '1'
const composeFile = '.local-evidence/public-paths-dev/compose.yml'
const envFile = '.local-evidence/public-paths-dev/environment.local'
const project = 'd16-tio2-my-public-paths-dev'
registerSharedWordPressMutationLock(runRuntime, project)

function wp(script: string) {
  return spawnSync('docker', [
    'compose', '-p', project, '--env-file', envFile, '-f', composeFile,
    'run', '--rm', '--no-deps', '--no-TTY', 'wpcli', 'wp', 'eval', script,
  ], {cwd: repositoryRoot, encoding: 'utf8', timeout: 180_000})
}

describe.runIf(runRuntime)('TiO2 Malaysia prerelease hub readiness runtime', () => {
  it('uses the production resolvers for exact seeded routes and fails closed for tuple defects', async () => {
    expect(existsSync(envFile), `Missing WordPress env file: ${envFile}`).toBe(true)
    expect(existsSync(composeFile), `Missing Compose file: ${composeFile}`).toBe(true)
    const marker = `task5-readiness-${process.pid}`
    const php = String.raw`
global $wpdb;
$marker='${marker}';
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-my-task5-readiness',30)");
if('1'!==$lock){WP_CLI::error('Could not lock Task 5 readiness fixtures.');}
register_shutdown_function(static function()use($marker):void{global $wpdb;$ids=get_posts(['post_type'=>'page','post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($ids as$id){wp_delete_post((int)$id,true);}$wpdb->get_var("SELECT RELEASE_LOCK('tio2-my-task5-readiness')");});
$create=static function(string$path,string$page_id,string$canonical,string$state,array$scopes,string$status='publish')use($marker,$wpdb):int{$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'Task 5 readiness fixture','post_name'=>'task5-'.wp_generate_uuid4()],true);if(is_wp_error($id)){WP_CLI::error($id->get_error_message());}$id=(int)$id;update_post_meta($id,'_tio2_runtime_fixture',$marker);update_post_meta($id,'public_path',$path);update_post_meta($id,TIO2_MY_ROUTE_PAGE_ID_META,$page_id);update_post_meta($id,TIO2_MY_ROUTE_CANONICAL_META,$canonical);update_post_meta($id,TIO2_MY_ROUTE_RELEASE_STATE_META,$state);wp_set_object_terms($id,$scopes,'site_scope',false);$wpdb->update($wpdb->posts,['post_status'=>$status],['ID'=>$id],['%s'],['%d']);clean_post_cache($id);return$id;};
$drop=static function()use($marker):void{$ids=get_posts(['post_type'=>'page','post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($ids as$id){wp_delete_post((int)$id,true);}};
$assert=static function(bool$condition,string$label):void{if(!$condition){WP_CLI::error($label);}};
$product=json_decode((string)tio2_my_product_hub_approved_contract_json(),true,512,JSON_THROW_ON_ERROR);
$application=json_decode((string)tio2_my_application_hub_approved_contract_json(),true,512,JSON_THROW_ON_ERROR);
$product_ready=tio2_my_product_route_readiness($product);
$application_ready=tio2_my_application_hub_route_readiness($application);
$assert(19===count(array_filter($product_ready))&&false===($product_ready['HOME-001']??null)&&false===($product_ready['CONV-RFQ']??null),'Product exact seeded readiness map was not 14 Grades, 2 Processes and 3 support routes.');
$assert(22===count(array_filter($application_ready))&&false===($application_ready['HOME-001']??null)&&false===($application_ready['CONV-RFQ']??null),'Application exact seeded readiness map was not 5 children, 14 Grades and 3 support routes.');
$base='/__task5-readiness-${process.pid}';$canonical=static fn(string$path):string=>tio2_my_product_target_canonical($path);
$create($base.'-live','FIXTURE-LIVE',$canonical($base.'-live'),'LIVE_APPROVED',['tio2-my']);$assert(tio2_my_product_target_ready('FIXTURE-LIVE',$base.'-live/'),'Exact live tuple did not resolve.');$drop();
$create($base.'-page','WRONG-PAGE',$canonical($base.'-page'),'LIVE_APPROVED',['tio2-my']);$assert(!tio2_my_product_target_ready('FIXTURE-PAGE',$base.'-page/'),'Wrong Page ID resolved.');$drop();
$create($base.'-path','FIXTURE-PATH',$canonical($base.'-path'),'LIVE_APPROVED',['tio2-my']);$assert(!tio2_my_product_target_ready('FIXTURE-PATH',$base.'-other/'),'Wrong path resolved.');$drop();
$create($base.'-canonical','FIXTURE-CANONICAL','https://tio2malaysia.com/wrong/','LIVE_APPROVED',['tio2-my']);$assert(!tio2_my_product_target_ready('FIXTURE-CANONICAL',$base.'-canonical/'),'Wrong canonical resolved.');$drop();
$create($base.'-state','FIXTURE-STATE',$canonical($base.'-state'),'PREVIEW_ONLY',['tio2-my']);$assert(!tio2_my_product_target_ready('FIXTURE-STATE',$base.'-state/'),'Non-LIVE_APPROVED state resolved.');$drop();
$create($base.'-scope','FIXTURE-SCOPE',$canonical($base.'-scope'),'LIVE_APPROVED',['tio2-a']);$assert(!tio2_my_product_target_ready('FIXTURE-SCOPE',$base.'-scope/'),'Foreign scope resolved.');$drop();
$create($base.'-status','FIXTURE-STATUS',$canonical($base.'-status'),'LIVE_APPROVED',['tio2-my'],'draft');$assert(!tio2_my_product_target_ready('FIXTURE-STATUS',$base.'-status/'),'Draft status resolved.');$drop();
$create($base.'-duplicate','FIXTURE-DUPLICATE',$canonical($base.'-duplicate'),'LIVE_APPROVED',['tio2-my']);$create($base.'-duplicate','FIXTURE-DUPLICATE',$canonical($base.'-duplicate'),'LIVE_APPROVED',['tio2-my']);$assert(!tio2_my_product_target_ready('FIXTURE-DUPLICATE',$base.'-duplicate/'),'Ambiguous records resolved.');$drop();
$receiver=$create($base.'-receiver','CONV-FIXTURE',$canonical($base.'-receiver'),'LIVE_APPROVED',['tio2-my']);$assert(!tio2_my_product_target_ready('CONV-FIXTURE',$base.'-receiver/'),'Receiver without ready binding resolved.');update_post_meta($receiver,TIO2_MY_RECEIVER_STATE_META,'READY');update_post_meta($receiver,TIO2_MY_RECEIVER_TARGET_PAGE_ID_META,'CONV-FIXTURE');update_post_meta($receiver,TIO2_MY_RECEIVER_FORM_KEY_META,'fixture-form-v1');$assert(tio2_my_product_target_ready('CONV-FIXTURE',$base.'-receiver/'),'Exact ready receiver binding did not resolve.');$drop();
$create($base.'-application','FIXTURE-APPLICATION',$canonical($base.'-application'),'LIVE_APPROVED',['tio2-my']);$application_map=tio2_my_application_hub_route_readiness(['routeRegistry'=>[['targetPageId'=>'FIXTURE-APPLICATION','href'=>$base.'-application/']]]);$assert(true===($application_map['FIXTURE-APPLICATION']??null),'Application resolver did not delegate the exact live tuple.');$drop();
$create($base.'-application-state','FIXTURE-APPLICATION-STATE',$canonical($base.'-application-state'),'REVOKED',['tio2-my']);$application_map=tio2_my_application_hub_route_readiness(['routeRegistry'=>[['targetPageId'=>'FIXTURE-APPLICATION-STATE','href'=>$base.'-application-state/']]]);$assert(false===($application_map['FIXTURE-APPLICATION-STATE']??null),'Application resolver accepted a revoked tuple.');$drop();
$ambiguous=false;try{tio2_my_application_hub_route_readiness(['routeRegistry'=>[['targetPageId'=>'DUPLICATE','href'=>'/one/'],['targetPageId'=>'DUPLICATE','href'=>'/two/']]]);}catch(\GraphQL\Error\UserError){$ambiguous=true;}$assert($ambiguous,'Application duplicate route registry did not fail closed.');
echo wp_json_encode(['status'=>'passed','productReady'=>$product_ready,'applicationReady'=>$application_ready,'cleanup'=>'registered']).PHP_EOL;
`
    const result = wp(php)
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('"status":"passed"')
    const runtime = JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!) as {
      productReady: Record<string, boolean>
      applicationReady: Record<string, boolean>
    }
    const {MalaysiaProductHub} = await import(
      '@/components/sites/tio2-my/products/malaysia-product-hub'
    )
    const productMarkup = renderToStaticMarkup(
      createElement(MalaysiaProductHub, {productHub: toMalaysiaProductHubDto(
        malaysiaProductHubSource(runtime.productReady),
      )}),
    )
    const applicationMarkup = renderToStaticMarkup(
      createElement(MalaysiaApplicationHub, {applicationHub: toMalaysiaApplicationHubDto({
        id: 'application-hub-runtime', modifiedGmt: '2026-09-09T00:00:00', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/applications'},
        malaysiaApplicationHubContractJson: JSON.stringify(applicationContract),
        routeReadiness: runtime.applicationReady,
      })}),
    )
    const productDirectory = productMarkup.match(/data-module="grade-directory"[\s\S]*?data-module="evaluation"/u)?.[0] ?? ''

    expect(productDirectory.match(/<a[^>]+data-grade-action=/gu)).toHaveLength(14)
    expect(productMarkup.match(/<a[^>]+data-process-route=/gu)).toHaveLength(2)
    expect(productMarkup.match(/<a[^>]+data-support-action=/gu)).toHaveLength(3)
    expect(applicationMarkup.match(/href="\/applications\/titanium-dioxide-for-/gu)).toHaveLength(5)
    expect(applicationMarkup.match(/href="\/products\/(?:m-[^"]+|cr-901)\/"/gu)).toHaveLength(30)
    expect(applicationContract.support.items.every(({href}) => applicationMarkup.includes(`href="${href}"`))).toBe(true)
  }, 240_000)
})
