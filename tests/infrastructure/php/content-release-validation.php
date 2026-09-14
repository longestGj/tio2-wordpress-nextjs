<?php
declare(strict_types=1);
define('ABSPATH',__DIR__);
final class WP_Error {function __construct(public string $code,public string $message){}}
function is_wp_error($v):bool{return $v instanceof WP_Error;}
function add_action(...$args):void{}
function wp_json_encode($v,$flags=0):string{return json_encode($v,$flags);}
function get_post_type($id):string{return 'tio2_request_sample';}
function wp_get_post_terms(...$args):array{return $GLOBALS['scope'];}
function get_post_field($field,$id):string{return 'tio2-my-request-sample';}
function get_post_meta($id,$key,$single){return $key==='public_path'?'/request-sample':$GLOBALS['sample'];}
$base=dirname(__DIR__,3).'/wordpress/plugins/tio2-site-model';
require $base.'/includes/content-release-validation.php';
require $base.'/includes/request-sample-v01.php';
require $base.'/includes/editorial-v01.php';
function check(bool $ok,string $message):void {if(!$ok)throw new RuntimeException($message);}
function changed(array $value,string $path,string $text):array {$parts=explode('.',$path);$node=&$value;foreach($parts as $key)$node=&$node[$key];$node=$text;return $value;}
$policies=json_decode(file_get_contents($base.'/includes/content-release-paths.json'),true);$count=0;$paths=0;
foreach(glob($base.'/config/tio2-my-*.json') as $file){
 if(str_contains($file,'evidence'))continue;
 $root=json_decode(file_get_contents($file),true);
 foreach($root['pages']??[$root] as $contract){
  $id=$contract['identity']['pageId']??$contract['page']['page_id']??$contract['pageId']??'';
  // HOME/APP use the ordinary-write schema, exercised by content-write-approval.php.
  if(in_array($id,['HOME-001','APP-000'],true))continue;
  if(!isset($policies[$id]))continue;
  check(tio2_my_content_matches($contract,$contract),'baseline '.$id);$count++;
  foreach($policies[$id] as $path){
   if(in_array($path,['bodyHtml','buyerVisibleMarkdown'],true))continue;
   check(tio2_my_content_matches(changed($contract,$path,'Updated buyer guidance.'),$contract),'text '.$id.' '.$path);
   check(!tio2_my_content_matches(changed($contract,$path,'<script>alert(1)</script>'),$contract),'unsafe '.$id.' '.$path);$paths++;
  }
  check(!tio2_my_content_matches($contract+['privateEvidence'=>'secret'],$contract),'extra field '.$id);
  $cross=$contract;$cross['identity']['siteScope']='tio2-a';check(!tio2_my_content_matches($cross,$contract),'scope '.$id);
  if(isset($contract['bodyHtml'])){
   $edit=$contract;$edit['bodyHtml']=preg_replace('/(<p[^>]*>)([^<]+)/u','$1Updated buyer guidance. $2',$edit['bodyHtml'],1);
   check(tio2_editorial_validate_payload($id,json_encode($edit))===true,'editorial paragraph '.$id);
   $edit['bodyHtml']=str_replace('href="','href="javascript:',$edit['bodyHtml']);
   check(is_wp_error(tio2_editorial_validate_payload($id,json_encode($edit))),'editorial URL '.$id);
  }
  if(isset($contract['buyerVisibleMarkdown'])){
   $edit=$contract;$edit['buyerVisibleMarkdown']=preg_replace('/(\n## [^\n]+\n\n)/u','$1Updated buyer guidance. ',$edit['buyerVisibleMarkdown'],1);
   check(tio2_my_content_matches($edit,$contract),'legal paragraph '.$id);
   $edit['buyerVisibleMarkdown'].=' [unsafe](javascript:alert)';check(!tio2_my_content_matches($edit,$contract),'legal URL '.$id);
  }
 }
}
$sample_fixture=json_decode(file_get_contents($base.'/config/tio2-my-request-sample.json'),true);
$GLOBALS['scope']=['tio2-my'];$GLOBALS['sample']=json_encode(changed($sample_fixture,'hero.body','Updated buyer guidance.'));
check(tio2_validate_request_sample_v01_contract(1)===true,'sample record accepts text');
$GLOBALS['scope']=['tio2-a'];check(is_wp_error(tio2_validate_request_sample_v01_contract(1)),'sample cross scope rejected');
$GLOBALS['scope']=['tio2-my'];$GLOBALS['sample']=json_encode(changed($sample_fixture,'hero.body','<script>secret</script>'));
check(is_wp_error(tio2_validate_request_sample_v01_contract(1)),'sample unsafe text rejected');
echo "PASS {$count} page policies, {$paths} text paths; editorial and Sample actual validators\n";
