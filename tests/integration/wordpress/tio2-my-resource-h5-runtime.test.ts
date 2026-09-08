import {spawnSync} from 'node:child_process'

import {describe, expect, it} from 'vitest'

const runRuntime = process.env.TIO2_MY_RESOURCE_H5_RUNTIME === '1'
const container = process.env.TIO2_WORDPRESS_CONTAINER ?? 'wordpress-wordpress-1'

describe.runIf(runRuntime)('RES-000 H5 WordPress runtime', () => {
  it('removes cached H4 atoms and queues exact Resources dependency invalidation', () => {
    const marker = `res-h5-${process.pid}`
    const php = String.raw`<?php
require '/var/www/html/wp-load.php';
global $wpdb;
$marker='${marker}';
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-my-resource-h5-runtime',30)");
if('1'!==$lock){throw new RuntimeException('Could not lock H5 runtime.');}
$hub_ids=get_posts(['post_type'=>'tio2_resource_hub','post_status'=>'publish','name'=>'tio2-my-resources','fields'=>'ids','numberposts'=>2]);
if(1!==count($hub_ids)){throw new RuntimeException('Expected one Malaysia Resource Hub.');}
$hub_id=(int)$hub_ids[0];
$original=(string)get_post_meta($hub_id,TIO2_MY_RESOURCE_HUB_RELATIONS_META,true);
$created=[];
$cleanup=static function()use(&$created,$hub_id,$original,$wpdb):void{update_post_meta($hub_id,TIO2_MY_RESOURCE_HUB_RELATIONS_META,$original);foreach($created as$id){wp_delete_post((int)$id,true);}$GLOBALS['tio2_webhook_queue']=[];$wpdb->get_var("SELECT RELEASE_LOCK('tio2-my-resource-h5-runtime')");};
register_shutdown_function($cleanup);
try{
  $create=static function(string$page_id,string$path)use(&$created,$marker,$wpdb):int{$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'FIXTURE_ONLY '.$page_id,'post_name'=>'fixture-'.wp_generate_uuid4()],true);if(is_wp_error($id)){throw new RuntimeException($id->get_error_message());}$id=(int)$id;update_post_meta($id,'_tio2_runtime_fixture',$marker);update_post_meta($id,'public_path',untrailingslashit($path));update_post_meta($id,TIO2_MY_ROUTE_PAGE_ID_META,$page_id);update_post_meta($id,TIO2_MY_ROUTE_CANONICAL_META,'https://tio2malaysia.com'.$path);update_post_meta($id,TIO2_MY_ROUTE_RELEASE_STATE_META,'LIVE_APPROVED');wp_set_object_terms($id,['tio2-my'],'site_scope',false);$wpdb->update($wpdb->posts,['post_status'=>'publish'],['ID'=>$id],['%s'],['%d']);clean_post_cache($id);$created[]=$id;return$id;};
  $origin_path='/resources/fixture-origin-${process.pid}/';$proc_path='/resources/fixture-proc-${process.pid}/';$trade_path='/resources/fixture-trade-${process.pid}/';
  $origin_id=$create('RES-ORIGIN',$origin_path);$proc_id=$create('RES-PROC',$proc_path);$trade_id=$create('RES-TRADE-EU',$trade_path);
  $contract=json_decode((string)file_get_contents(tio2_my_resource_hub_contract_path()),true);
  $relations=array_values(array_filter($contract['resourceRelations'],static fn(array $item):bool=>in_array($item['pageId'],['RES-ORIGIN','RES-PROC','RES-TRADE-EU'],true)));
  update_post_meta($hub_id,TIO2_MY_RESOURCE_HUB_RELATIONS_META,wp_json_encode($relations));
  $fixture_ids=['RES-ORIGIN'=>$origin_id,'RES-PROC'=>$proc_id,'RES-TRADE-EU'=>$trade_id];
  $ready=static fn(string$page_id,string$path):bool=>isset($fixture_ids[$page_id])&&get_post_meta($fixture_ids[$page_id],TIO2_MY_ROUTE_RELEASE_STATE_META,true)==='LIVE_APPROVED';
  $cached_h4=tio2_my_resource_public_projection($relations,null,$ready);
  $flatten=static fn(array $projection):array=>array_merge(...array_column($projection['resourceGroups'],'items'));
  if('H3_GROUPED_PUBLIC_RESOURCES'!==$cached_h4['publicState']||['RES-ORIGIN','RES-PROC','RES-TRADE-EU']!==array_column($flatten($cached_h4),'pageId')){throw new RuntimeException('Grouped cache fixture projection failed: '.wp_json_encode($cached_h4));}
  $GLOBALS['tio2_webhook_queue']=[];
  tio2_capture_post_meta_before_mutation(null,$trade_id,TIO2_MY_ROUTE_RELEASE_STATE_META,'REVOKED');
  $queued=$GLOBALS['tio2_webhook_queue'][$trade_id]??null;
  if(!is_array($queued)||['tio2-my']!==$queued['siteIds']||!in_array('/resources',$queued['paths'],true)||!in_array(untrailingslashit($trade_path),$queued['paths'],true)){throw new RuntimeException('Exact H5 dependency invalidation was not queued.');}
  update_post_meta($trade_id,TIO2_MY_ROUTE_RELEASE_STATE_META,'REVOKED');
  $recomputed=tio2_my_resource_public_projection($relations,null,$ready);
  if('H3_GROUPED_PUBLIC_RESOURCES'!==$recomputed['publicState']||['RES-ORIGIN','RES-PROC']!==array_column($flatten($recomputed),'pageId')){throw new RuntimeException('Revoked grouped steady-state recomputation failed.');}
  $serialized=wp_json_encode($recomputed);
  $trade=array_values(array_filter($relations,static fn(array $item):bool=>$item['pageId']==='RES-TRADE-EU'))[0];
  foreach(['RES-TRADE-EU',$trade['officialSourceName'],$trade['publicStatusLabel'],$trade['sourceDate']]as$removed){if(str_contains((string)$serialized,$removed)){throw new RuntimeException('Revoked stale atom survived: '.$removed);}}
  echo 'RES_000_H5_RUNTIME_PASS';
}finally{$cleanup();}
`
    const result = spawnSync('docker', ['exec', '-i', container, 'php', '/dev/stdin'], {
      input: php,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('RES_000_H5_RUNTIME_PASS')
  }, 150_000)
})
