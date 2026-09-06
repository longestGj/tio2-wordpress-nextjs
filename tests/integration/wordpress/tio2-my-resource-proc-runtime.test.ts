import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const runRuntime = process.env.TIO2_MY_RESOURCE_PROC_RUNTIME === "1";
const container =
  process.env.TIO2_WORDPRESS_CONTAINER ?? "wordpress-wordpress-1";

describe.runIf(runRuntime)("RES-PROC WordPress mutable-state runtime", () => {
  it("enforces Process atomicity, source revocation, Article completeness and duplicate rejection", () => {
    const php = String.raw`<?php
require '/var/www/html/wp-load.php';
global $wpdb;
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-my-resource-proc-runtime',30)");
if('1'!==$lock){throw new RuntimeException('Could not lock RES-PROC runtime.');}
$ids=get_posts(['post_type'=>'tio2_document','post_status'=>'publish','name'=>'chloride-vs-sulfate-titanium-dioxide','fields'=>'ids','numberposts'=>2,'tax_query'=>[['taxonomy'=>'site_scope','field'=>'slug','terms'=>['tio2-my'],'operator'=>'AND','include_children'=>false]]]);
if(1!==count($ids)){throw new RuntimeException('Expected one local Malaysia RES-PROC record.');}
$post_id=(int)$ids[0];
$relation_key=TIO2_MY_RESOURCE_PROC_RELATIONS_META;
$source_key=TIO2_MY_RESOURCE_PROC_SOURCES_META;
$article_key=TIO2_MY_RESOURCE_PROC_ARTICLE_METADATA_META;
$original_relations=get_post_meta($post_id,$relation_key,true);
$original_sources=get_post_meta($post_id,$source_key,true);
$had_article=metadata_exists('post',$post_id,$article_key);
$original_article=$had_article?get_post_meta($post_id,$article_key,true):null;
$cleanup=static function()use($post_id,$relation_key,$source_key,$article_key,$original_relations,$original_sources,$had_article,$original_article,$wpdb):void{
  update_post_meta($post_id,$relation_key,$original_relations);
  update_post_meta($post_id,$source_key,$original_sources);
  if($had_article){update_post_meta($post_id,$article_key,$original_article);}else{delete_post_meta($post_id,$article_key);}
  $GLOBALS['tio2_webhook_queue']=[];
  $wpdb->get_var("SELECT RELEASE_LOCK('tio2-my-resource-proc-runtime')");
};
register_shutdown_function($cleanup);
try{
  $read=static fn():array=>json_decode(tio2_resolve_malaysia_resource_proc_record_json(),true)['resourceProcPayload'];
  $relations=json_decode($original_relations,true);
  $set=static function(array&$items,string$key,bool$eligible):void{foreach($items as&$item){if($key!==$item['relationKey'])continue;$item['routeStatus']=$eligible?'VERIFIED_PUBLIC':'NOT_IMPLEMENTED';$item['canonicalStatus']=$eligible?'VERIFIED':'NOT_VERIFIED';$item['publicEligibilityStatus']=$eligible?'ELIGIBLE':'NOT_ELIGIBLE';return;}throw new RuntimeException('Missing relation '.$key);};
  $keys=static fn(array$payload):array=>array_column($payload['eligibleRelations'],'relationKey');
  if(['home','resources_parent','products_primary']!==$keys($read())){throw new RuntimeException('Default relation projection failed.');}
  $set($relations,'chloride_process',true);update_post_meta($post_id,$relation_key,wp_json_encode($relations));
  if(in_array('chloride_process',$keys($read()),true)||in_array('sulfate_process',$keys($read()),true)){throw new RuntimeException('Partial Process pair leaked.');}
  $set($relations,'sulfate_process',true);update_post_meta($post_id,$relation_key,wp_json_encode($relations));
  if(['home','resources_parent','products_primary','chloride_process','sulfate_process']!==$keys($read())){throw new RuntimeException('Eligible Process pair failed.');}

  $sources=json_decode($original_sources,true);
  foreach($sources as&$source){if('lb_blr886'===$source['sourceKey']){$source['evidenceStatus']='REVOKED';}}
  update_post_meta($post_id,$source_key,wp_json_encode($sources));
  $revoked=$read();
  if(false!==($revoked['applicationOverlap']['evidenceAvailable']??null)||str_contains(wp_json_encode($revoked),'BLR-886')){throw new RuntimeException('Revoked source content leaked.');}

  $duplicate=json_decode($original_sources,true);$duplicate[]=$duplicate[5];update_post_meta($post_id,$source_key,wp_json_encode($duplicate));
  $duplicate_rejected=false;try{$read();}catch(\GraphQL\Error\UserError$e){$duplicate_rejected=true;}
  if(!$duplicate_rejected){throw new RuntimeException('Duplicate source was not rejected.');}
  update_post_meta($post_id,$source_key,$original_sources);

  $complete=['contentStatus'=>'APPROVED','publicVisibilityStatus'=>'VISIBLE','authorName'=>'FIXTURE_ONLY_APPROVED_AUTHOR','publisherName'=>'FIXTURE_ONLY_APPROVED_PUBLISHER','publisherLogoAssetKey'=>'/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg','datePublished'=>'2026-08-01','dateModified'=>'2026-09-04','lastReviewedAt'=>'2026-09-05','maintenanceOwner'=>'FIXTURE_ONLY_APPROVED_MAINTENANCE_OWNER'];
  update_post_meta($post_id,$article_key,wp_json_encode($complete));$article=$read();
  if('ARTICLE_WITH_BREADCRUMB'!==$article['schemaMode']||'FIXTURE_ONLY_APPROVED_AUTHOR'!==$article['articleMetadata']['authorName']||isset($article['articleMetadata']['contentStatus'])){throw new RuntimeException('Complete Article metadata failed.');}
  $complete['authorName']='';update_post_meta($post_id,$article_key,wp_json_encode($complete));$incomplete=$read();
  if('BREADCRUMB_ONLY'!==$incomplete['schemaMode']||null!==$incomplete['articleMetadata']){throw new RuntimeException('Incomplete Article metadata did not fail closed.');}
  echo 'RES_PROC_RUNTIME_PASS';
}finally{$cleanup();}
`;
    const result = spawnSync(
      "docker",
      ["exec", "-i", container, "php", "/dev/stdin"],
      {
        input: php,
        encoding: "utf8",
        timeout: 120_000,
      },
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("RES_PROC_RUNTIME_PASS");
  }, 150_000);
});
