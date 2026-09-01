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
  $base=static function(string$page_id,string$type,string$title,string$path,string$mapping,int$order,?int$rank,string$cta):array{return['pageId'=>$page_id,'siteScope'=>'tio2-my','locale'=>'en','resourceType'=>$type,'title'=>$title,'summary'=>'FIXTURE_ONLY_APPROVED_CHILD_SUMMARY','canonicalPath'=>$path,'canonicalUrl'=>'https://tio2malaysia.com'.$path,'mappingStatus'=>$mapping,'childContentStatus'=>'APPROVED','claimStatus'=>'APPROVED','publicEligibilityStatus'=>'ELIGIBLE','routeStatus'=>'VERIFIED_PUBLIC','canonicalStatus'=>'VERIFIED','lastReviewedAt'=>'2026-09-01','featuredRank'=>$rank,'displayOrder'=>$order,'ctaLabel'=>$cta,'sourceOwner'=>'FIXTURE_ONLY_OWNER','recordReviewDate'=>'2026-09-01'];};
  $relations=[
    $base('RES-ORIGIN','PROCUREMENT_GUIDE','Non-China Titanium Dioxide Supply Guide',$origin_path,'APPROVED_PRD_V0.3',10,1,'Read the sourcing guide'),
    $base('RES-PROC','TECHNICAL_GUIDE','Chloride vs Sulfate Titanium Dioxide',$proc_path,'FIXTURE_PUBLIC_ELIGIBLE',20,null,'Read the technical guide'),
    array_merge($base('RES-TRADE-EU','TRADE_UPDATE','FIXTURE_ONLY_TRADE_UPDATE',$trade_path,'FIXTURE_PUBLIC_ELIGIBLE',30,null,'Read the trade update'),['officialSourceName'=>'FIXTURE_ONLY_OFFICIAL_SOURCE','officialSourceUrl'=>'https://example.invalid/official-source','applicableScope'=>'FIXTURE_ONLY_SCOPE','sourceDate'=>'2026-08-01','reviewDate'=>'2026-09-01','freshnessStatus'=>'CURRENT_APPROVED','publicStatusLabel'=>'FIXTURE_ONLY_STATUS','freshnessOwner'=>'FIXTURE_ONLY_ROLE','nextReviewDue'=>'2026-10-01','eventReviewTrigger'=>'FIXTURE_ONLY_EVENT_TRIGGER']),
  ];
  update_post_meta($hub_id,TIO2_MY_RESOURCE_HUB_RELATIONS_META,wp_json_encode($relations));
  $mapping=static fn(string$page_id,string$status,string$path):bool=>in_array($page_id,['RES-ORIGIN','RES-PROC','RES-TRADE-EU'],true)&&in_array($status,['APPROVED_PRD_V0.3','FIXTURE_PUBLIC_ELIGIBLE'],true);
  $cached_h4=tio2_my_resource_public_projection($relations,$mapping);
  if('H4_TRADE_ITEM'!==$cached_h4['publicState']||['RES-ORIGIN']!==array_column($cached_h4['featuredResources'],'pageId')||['RES-PROC','RES-TRADE-EU']!==array_column($cached_h4['latestResources'],'pageId')){throw new RuntimeException('H4 cache fixture projection failed: '.wp_json_encode($cached_h4));}
  $GLOBALS['tio2_webhook_queue']=[];
  tio2_capture_post_meta_before_mutation(null,$trade_id,TIO2_MY_ROUTE_RELEASE_STATE_META,'REVOKED');
  $queued=$GLOBALS['tio2_webhook_queue'][$trade_id]??null;
  if(!is_array($queued)||['tio2-my']!==$queued['siteIds']||!in_array('/resources',$queued['paths'],true)||!in_array(untrailingslashit($trade_path),$queued['paths'],true)){throw new RuntimeException('Exact H5 dependency invalidation was not queued.');}
  update_post_meta($trade_id,TIO2_MY_ROUTE_RELEASE_STATE_META,'REVOKED');
  $recomputed=tio2_my_resource_public_projection($relations,$mapping);
  if('H3_MULTIPLE_PUBLIC_RESOURCES'!==$recomputed['publicState']||['RES-ORIGIN']!==array_column($recomputed['featuredResources'],'pageId')||['RES-PROC']!==array_column($recomputed['latestResources'],'pageId')){throw new RuntimeException('H5 steady-state recomputation failed.');}
  $serialized=wp_json_encode($recomputed);
  foreach(['RES-TRADE-EU','FIXTURE_ONLY_OFFICIAL_SOURCE','FIXTURE_ONLY_STATUS','2026-08-01']as$removed){if(str_contains((string)$serialized,$removed)){throw new RuntimeException('H5 stale atom survived: '.$removed);}}
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
