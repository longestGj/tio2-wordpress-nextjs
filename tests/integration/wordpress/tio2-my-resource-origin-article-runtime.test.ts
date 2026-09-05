import {spawnSync} from 'node:child_process'

import {describe, expect, it} from 'vitest'

const runRuntime = process.env.TIO2_MY_RESOURCE_ORIGIN_ARTICLE_RUNTIME === '1'
const container = process.env.TIO2_WORDPRESS_CONTAINER ?? 'wordpress-wordpress-1'

describe.runIf(runRuntime)('RES-ORIGIN WordPress Article metadata runtime', () => {
  it('projects only complete approved visible CMS metadata and preserves the page otherwise', () => {
    const php = String.raw`<?php
require '/var/www/html/wp-load.php';
global $wpdb;
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-my-resource-origin-article-runtime',30)");
if('1'!==$lock){throw new RuntimeException('Could not lock RES-ORIGIN Article runtime.');}
$ids=get_posts(['post_type'=>'tio2_document','post_status'=>'publish','name'=>'non-china-titanium-dioxide','fields'=>'ids','numberposts'=>2,'tax_query'=>[['taxonomy'=>'site_scope','field'=>'slug','terms'=>['tio2-my'],'operator'=>'AND','include_children'=>false]]]);
if(1!==count($ids)){throw new RuntimeException('Expected one local Malaysia RES-ORIGIN record.');}
$post_id=(int)$ids[0];
$key='_tio2_my_resource_origin_article_metadata_json';
$meta_relevant=tio2_is_relevant_webhook_meta_key($key,$post_id);
if(!$meta_relevant){throw new RuntimeException('Article metadata changes are not wired to RES-ORIGIN revalidation.');}
$had_original=metadata_exists('post',$post_id,$key);
$original=$had_original?get_post_meta($post_id,$key,true):null;
$cleanup=static function()use($post_id,$key,$had_original,$original,$wpdb):void{if($had_original){update_post_meta($post_id,$key,$original);}else{delete_post_meta($post_id,$key);}$GLOBALS['tio2_webhook_queue']=[];$wpdb->get_var("SELECT RELEASE_LOCK('tio2-my-resource-origin-article-runtime')");};
register_shutdown_function($cleanup);
try{
  $complete=['contentStatus'=>'APPROVED','publicVisibilityStatus'=>'VISIBLE','authorName'=>'FIXTURE_ONLY_APPROVED_AUTHOR','publisherName'=>'FIXTURE_ONLY_APPROVED_PUBLISHER','publisherLogoAssetKey'=>'/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg','datePublished'=>'2026-08-01','dateModified'=>'2026-09-04','lastReviewedAt'=>'2026-09-05','maintenanceOwner'=>'FIXTURE_ONLY_APPROVED_MAINTENANCE_OWNER'];
  update_post_meta($post_id,$key,wp_json_encode($complete));
  $visible=json_decode(tio2_resolve_malaysia_resource_origin_record_json(),true)['resourceOriginPayload']??null;
  if(!is_array($visible)||'ARTICLE_WITH_BREADCRUMB'!==($visible['schemaMode']??null)||'FIXTURE_ONLY_APPROVED_AUTHOR'!==($visible['articleMetadata']['authorName']??null)||array_key_exists('contentStatus',$visible['articleMetadata']??[])||array_key_exists('publicVisibilityStatus',$visible['articleMetadata']??[])){throw new RuntimeException('Complete approved visible Article metadata did not project publicly.');}
  foreach([
    array_merge($complete,['authorName'=>'']),
    array_merge($complete,['publicVisibilityStatus'=>'HIDDEN']),
    array_merge($complete,['publisherLogoAssetKey'=>'/tio2-my/brand/unapproved.svg']),
  ]as$metadata){
    update_post_meta($post_id,$key,wp_json_encode($metadata));
    $payload=json_decode(tio2_resolve_malaysia_resource_origin_record_json(),true)['resourceOriginPayload']??null;
    if(!is_array($payload)||'BREADCRUMB_ONLY'!==($payload['schemaMode']??null)||null!==($payload['articleMetadata']??null)){throw new RuntimeException('Incomplete or invisible Article metadata did not fail closed.');}
  }
  echo 'RES_ORIGIN_ARTICLE_RUNTIME_PASS';
}finally{$cleanup();}
`
    const result = spawnSync('docker', ['exec', '-i', container, 'php', '/dev/stdin'], {
      input: php,
      encoding: 'utf8',
      timeout: 120_000,
    })
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('RES_ORIGIN_ARTICLE_RUNTIME_PASS')
  }, 150_000)
})
