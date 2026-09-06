import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.TIO2_MY_READINESS_RUNTIME === '1'
const envFile = process.env.TIO2_WORDPRESS_ENV_FILE ?? 'wordpress/.env'

function wp(script: string) {
  return spawnSync('docker', [
    'compose', '--env-file', envFile, '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli', 'wp', 'eval', script,
  ], {cwd: repositoryRoot, encoding: 'utf8', timeout: 180_000})
}

describe.runIf(runLiveWordPress)('TiO2 Malaysia target readiness runtime', () => {
  it('fails closed for identity, release, ambiguity, scope and receiver defects', () => {
    expect(existsSync(envFile), `Missing WordPress env file: ${envFile}`).toBe(true)
    const marker = `tio2-my-readiness-${process.pid}`
    const php = String.raw`
global $wpdb;
$marker='${marker}';
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-my-product-readiness-runtime',30)");
if('1'!==$lock){WP_CLI::error('Could not lock Malaysia readiness fixtures.');}
register_shutdown_function(static function()use($marker):void{global $wpdb;$ids=get_posts(['post_type'=>'page','post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($ids as$id){wp_delete_post((int)$id,true);}$wpdb->get_var("SELECT RELEASE_LOCK('tio2-my-product-readiness-runtime')");});
$created=[];
$create=static function(string$path,string$page_id,string$state,array$scopes,?string$receiver_state=null,?string$form_key=null)use($marker,&$created,$wpdb):int{$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'Readiness fixture','post_name'=>'readiness-'.wp_generate_uuid4()],true);if(is_wp_error($id)){WP_CLI::error($id->get_error_message());}$id=(int)$id;update_post_meta($id,'_tio2_runtime_fixture',$marker);update_post_meta($id,'public_path',$path);update_post_meta($id,TIO2_MY_ROUTE_PAGE_ID_META,$page_id);update_post_meta($id,TIO2_MY_ROUTE_CANONICAL_META,tio2_my_product_target_canonical($path));update_post_meta($id,TIO2_MY_ROUTE_RELEASE_STATE_META,$state);if(null!==$receiver_state){update_post_meta($id,TIO2_MY_RECEIVER_STATE_META,$receiver_state);update_post_meta($id,TIO2_MY_RECEIVER_TARGET_PAGE_ID_META,$page_id);}if(null!==$form_key){update_post_meta($id,TIO2_MY_RECEIVER_FORM_KEY_META,$form_key);}wp_set_object_terms($id,$scopes,'site_scope',false);$wpdb->update($wpdb->posts,['post_status'=>'publish'],['ID'=>$id],['%s'],['%d']);clean_post_cache($id);$created[]=$id;return$id;};
$drop=static function()use(&$created):void{foreach($created as$id){wp_delete_post((int)$id,true);}$created=[];};
$expect=static function(bool$expected,string$page_id,string$path,string$label):void{$actual=tio2_my_product_target_ready($page_id,$path);if($actual!==$expected){WP_CLI::error($label.' expected '.($expected?'true':'false').' but received '.($actual?'true':'false'));}};
$base='/__readiness-${process.pid}';
$create($base.'-wrong','WRONG-PAGE','LIVE_APPROVED',['tio2-my']);$expect(false,'MARKET-EU-001',$base.'-wrong/','wrong Page ID');$drop();
$create($base.'-preview','MARKET-EU-001','PREVIEW_ONLY',['tio2-my']);$expect(false,'MARKET-EU-001',$base.'-preview/','preview only');$drop();
$create($base.'-not-ready','MARKET-EU-001','NOT_READY',['tio2-my']);$expect(false,'MARKET-EU-001',$base.'-not-ready/','not ready');$drop();
$id=$create($base.'-canonical','MARKET-EU-001','LIVE_APPROVED',['tio2-my']);update_post_meta($id,TIO2_MY_ROUTE_CANONICAL_META,'https://tio2malaysia.com/wrong/');$expect(false,'MARKET-EU-001',$base.'-canonical/','canonical mismatch');$drop();
$id=$create($base.'-draft','MARKET-EU-001','LIVE_APPROVED',['tio2-my']);$wpdb->update($wpdb->posts,['post_status'=>'draft'],['ID'=>$id],['%s'],['%d']);clean_post_cache($id);$expect(false,'MARKET-EU-001',$base.'-draft/','storage draft');$drop();
$create($base.'-duplicate','MARKET-EU-001','LIVE_APPROVED',['tio2-my']);$create($base.'-duplicate','MARKET-EU-001','LIVE_APPROVED',['tio2-my']);$expect(false,'MARKET-EU-001',$base.'-duplicate/','duplicate');$drop();
$create($base.'-scope','MARKET-EU-001','LIVE_APPROVED',['tio2-a']);$expect(false,'MARKET-EU-001',$base.'-scope/','cross scope');$drop();
$create($base.'-receiver','CONV-SAMPLE','LIVE_APPROVED',['tio2-my'],'NOT_READY',null);$expect(false,'CONV-SAMPLE',$base.'-receiver/','receiver not ready');$drop();
$create($base.'-receiver-form','CONV-SAMPLE','LIVE_APPROVED',['tio2-my'],'READY',null);$expect(false,'CONV-SAMPLE',$base.'-receiver-form/','receiver form missing');$drop();
$create($base.'-receiver-blank','CONV-SAMPLE','LIVE_APPROVED',['tio2-my'],'READY','   ');$expect(false,'CONV-SAMPLE',$base.'-receiver-blank/','receiver form blank');$drop();
$create($base.'-live','MARKET-EU-001','LIVE_APPROVED',['tio2-my']);$expect(true,'MARKET-EU-001',$base.'-live/','live approved route');$drop();
$create($base.'-receiver-live','CONV-SAMPLE','LIVE_APPROVED',['tio2-my'],'READY','sample-form-v1');$expect(true,'CONV-SAMPLE',$base.'-receiver-live/','live approved receiver');$drop();
echo 'TIO2_MY_READINESS_RUNTIME_PASS';
`
    const result = wp(php)
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('TIO2_MY_READINESS_RUNTIME_PASS')
  }, 240_000)
})
