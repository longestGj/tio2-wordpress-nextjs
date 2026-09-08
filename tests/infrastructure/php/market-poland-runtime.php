<?php
declare(strict_types=1);
namespace GraphQL\Error { final class UserError extends \RuntimeException {} }
namespace {
define('ABSPATH', '/work/');
final class WP_Error { public function __construct(public string $code, public string $message) {} public function get_error_message(): string { return $this->message; } }
final class WP_Post { public string $post_date='2026-09-01 01:02:03'; public string $post_date_gmt='2026-09-01 01:02:03'; public string $post_modified='2026-09-07 01:02:03'; public function __construct(public int $ID, public string $post_type = 'tio2_market_page', public string $post_status = 'publish', public string $post_name = 'tio2-my-market-poland', public string $post_title = 'Existing title', public string $post_modified_gmt = '2026-09-07 01:02:03') {} }
function check($condition, string $message): void { if (!$condition) throw new \RuntimeException($message); }
function is_wp_error($v): bool { return $v instanceof WP_Error; }
function add_action(...$args): void { $GLOBALS['hooks'][$args[0]][] = $args; }
function add_filter($hook,$callback,...$rest): void { $GLOBALS['filters'][$hook][]=$callback; }
function remove_filter($hook,$callback,...$rest): void { $GLOBALS['filters'][$hook]=array_values(array_filter($GLOBALS['filters'][$hook]??[],fn($v)=>$v!==$callback)); }
function register_post_meta($type, $key, $options): void { $GLOBALS['registered_meta'] = [$type, $key, $options]; }
function register_graphql_field($type, $key, $options): void { $GLOBALS['graphql_field'] = [$type, $key, $options]; }
function wp_json_encode($v, $flags = 0): string { return json_encode($v, $flags | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
function get_post($id, $output = null) { $p = $GLOBALS['posts'][$id] ?? null; return $output === 'ARRAY_A' && $p ? (array)$p : $p; }
function get_post_type($id): string { return get_post($id)?->post_type ?? ''; }
function get_post_status($id): string { return get_post($id)?->post_status ?? ''; }
function get_post_field($key, $id): string { return get_post($id)->$key ?? ''; }
function get_post_meta($id, $key = '', $single = false) { return $GLOBALS['meta'][$id][$key] ?? ''; }
function metadata_exists($type, $id, $key): bool { return array_key_exists($key, $GLOBALS['meta'][$id] ?? []); }
function wp_get_post_terms($id, $taxonomy, $args = []): array { return $GLOBALS['scopes'][$id] ?? []; }
function get_post_stati(): array { return ['publish'=>'publish','future'=>'future','draft'=>'draft','pending'=>'pending','private'=>'private','trash'=>'trash','auto-draft'=>'auto-draft','custom'=>'custom']; }
function get_post_types(): array { return ['post', 'page', 'tio2_market_page']; }
function get_posts($args): array {
    $result = [];
    foreach ($GLOBALS['posts'] as $id => $post) {
        if (isset($args['post_type']) && $args['post_type'] !== 'any' && !in_array($post->post_type, (array)$args['post_type'], true)) continue;
        if (isset($args['post_status']) && $args['post_status'] !== 'any' && !in_array($post->post_status, (array)$args['post_status'], true)) continue;
        if (isset($args['name']) && $args['name'] !== $post->post_name) continue;
        if (isset($args['meta_key']) && get_post_meta($id, $args['meta_key'], true) !== $args['meta_value']) continue;
        $result[] = $id;
    }
    $limit = $args['numberposts'] ?? $args['posts_per_page'] ?? 5;
    return $limit < 0 ? $result : array_slice($result, 0, $limit);
}
function current_user_can(...$args): bool { return $GLOBALS['can_edit']; }
function wp_verify_nonce($nonce, $action): bool { return $nonce === 'valid' && $action === 'tio2_poland_market_save_1'; }
function wp_unslash($value) { return is_array($value) ? array_map('wp_unslash', $value) : (is_string($value) ? stripslashes($value) : $value); }
function wp_slash($value) { return is_array($value) ? array_map('wp_slash', $value) : (is_string($value) ? addslashes($value) : $value); }
function wp_is_post_revision($id): bool { return false; }
function wp_is_post_autosave($id): bool { return false; }
function update_post_meta($id, $key, $value): bool {
    if (($GLOBALS['fail'] ?? '') === $key) { $GLOBALS['fail'] = ''; return false; }
    $value = wp_unslash($value);
    if (get_post_meta($id,$key,true) === $value) return false;
    $GLOBALS['meta'][$id][$key] = $value; return true;
}
function delete_post_meta($id, $key): bool { unset($GLOBALS['meta'][$id][$key]); return true; }
function wp_get_environment_type(): string { return $GLOBALS['environment'] ?? 'local'; }
function get_term_by($field, $value, $tax) { return ($GLOBALS['missing_term'] ?? false) ? false : (object)['term_id'=>7, 'slug'=>'tio2-my']; }
function wp_set_object_terms($id, $terms, $taxonomy, $append = false) {
    if (($GLOBALS['fail'] ?? '') === 'terms') { $GLOBALS['fail']=''; return new WP_Error('terms','Term write failed'); }
    $GLOBALS['scopes'][$id] = $terms === [7] ? ['tio2-my'] : $terms; return [7];
}
function wp_insert_post($data, $error = false) {
    if (($GLOBALS['fail'] ?? '') === 'insert') { $GLOBALS['fail']=''; return new WP_Error('insert','Insert failed'); }
    $id = $data['ID'] ?? 42;
    $GLOBALS['posts'][$id] = new WP_Post($id);
    foreach ($data as $key=>$value) $GLOBALS['posts'][$id]->$key = wp_unslash($value);
    return $id;
}
function wp_update_post($data, $error = false) {
    if (($GLOBALS['fail'] ?? '') === 'publish' && ($data['post_status'] ?? '') === 'publish') { $GLOBALS['fail']=''; return new WP_Error('publish','Publish failed'); }
    if (in_array($GLOBALS['fail']??'', ['publish-zero','publish-false','publish-wrong-status'], true) && ($data['post_status']??'')==='publish') {
        $mode=$GLOBALS['fail']; $GLOBALS['fail']=''; return match($mode){'publish-zero'=>0,'publish-false'=>false,default=>$data['ID']};
    }
    $id = $data['ID']; $data['post_modified_gmt']='2026-09-07 10:00:00'; $data['post_modified']='2026-09-07 10:00:00';
    foreach($GLOBALS['filters']['wp_insert_post_data']??[] as $callback)$data=$callback($data,['ID'=>$id]);
    foreach ($data as $key=>$value) $GLOBALS['posts'][$id]->$key = wp_unslash($value); return $id;
}
function wp_delete_post($id, $force = false) { $post=get_post($id); unset($GLOBALS['posts'][$id],$GLOBALS['meta'][$id],$GLOBALS['scopes'][$id]); return $post; }
function tio2_supported_site_ids(): array { return ['tio2-a','tio2-b','tio2-my']; }
function tio2_content_type_definitions(): array { return []; }
function tio2_is_valid_public_path($path): bool { return preg_match('~^/[a-z0-9/-]*$~', $path) === 1; }

$module = '/work/wordpress/plugins/tio2-site-model/includes/market-page-poland-v01.php';
check(is_file($module), 'Poland scoped WordPress implementation is missing');
require $module;
require '/work/wordpress/plugins/tio2-site-model/includes/webhooks.php';
$action = fn($label,$href,$id) => ['label'=>$label,'href'=>$href,'targetPageId'=>$id];
$rfq=$action('Request a Quote','/request-a-quote/','CONV-RFQ');
$products=$action('Explore Products','/products/','PRODUCT-000');
$eu=$action('European Union','/markets/european-union/','MARKET-EU-001');
$body=['identity'=>['pageId'=>'MARKET-EU-PL','siteScope'=>'tio2-my','locale'=>'en','path'=>'/markets/poland/','schemaVersion'=>'market-poland-v0.1'],
 'seo'=>['title'=>'Poland title','description'=>'Poland description','canonical'=>'https://tio2malaysia.com/markets/poland/'],
 'breadcrumb'=>[$action('Home','/','HOME-001'),$action('Markets','/markets/','MARKET-000'),$eu,$action('Poland','/markets/poland/','MARKET-EU-PL')], 'modules'=>[]];
foreach ([1,1,1,3,3] as $i=>$count) $body['modules'][]=['id'=>'PL-0'.($i+1),'heading'=>'Heading '.($i+1),'paragraphs'=>array_fill(0,$count,'Editable approved text.'),'columns'=>$i===2?[['heading'=>'Coatings','paragraphs'=>['First column.']],['heading'=>'Plastics and masterbatch','paragraphs'=>['Second column.']]]:[], 'actions'=>match($i){0=>[$rfq,$products],2=>[$products],3=>[$action('Request Documents','/request-documents/','CONV-DOC'),$action('View Document Hub','/documents/','DOC-000')],4=>[$rfq,$eu],default=>[]}];
function reset_record(): void {
    $GLOBALS['posts']=[1=>new WP_Post(1)]; $GLOBALS['scopes']=[1=>['tio2-my']];
    $GLOBALS['meta']=[1=>['public_path'=>'/markets/poland',TIO2_MY_POLAND_MARKET_CONTRACT_META=>wp_json_encode($GLOBALS['body'])]];
    $GLOBALS['can_edit']=true; $GLOBALS['fail']=''; $GLOBALS['environment']='local'; $GLOBALS['missing_term']=false;
}
function reject_resolver($label): void { try { tio2_resolve_malaysia_poland_market_record_json(); } catch (\GraphQL\Error\UserError $e) { return; } throw new \RuntimeException('Resolver accepted '.$label); }
reset_record();
$result=json_decode(tio2_resolve_malaysia_poland_market_record_json(),true);
check($result['status']==='publish' && $result['siteScopes']['nodes']===[['slug'=>'tio2-my']] && $result['publishingFields']['publicPath']==='/markets/poland', 'Wrong scoped envelope');
foreach (['missing','draft','foreign','mixed','wrong-path','wrong-slug','duplicate-slug','duplicate-path','foreign-cpt-path'] as $case) {
 reset_record();
 switch($case) {
 case 'missing': $posts=[]; break; case 'draft': $posts[1]->post_status='draft'; break;
 case 'foreign': $scopes[1]=['tio2-a']; break; case 'mixed': $scopes[1]=['tio2-my','tio2-b']; break;
 case 'wrong-path': $meta[1]['public_path']='/markets/other'; break; case 'wrong-slug': $posts[1]->post_name='another'; break;
 default: $posts[2]=new WP_Post(2); $scopes[2]=['tio2-b']; $meta[2]=['public_path'=>$case==='duplicate-slug'?'/elsewhere':'/markets/poland']; if($case!=='duplicate-slug')$posts[2]->post_name='another'; if($case==='foreign-cpt-path')$posts[2]->post_type='page';
 }
 reject_resolver($case);
}
foreach (['empty','html','control','identity','unknown','sequence','paragraph-count','columns','link','breadcrumb','invalid-json'] as $case) {
 reset_record(); $bad=$body;
 switch($case){case 'empty':$bad['seo']['title']=' ';break;case 'html':$bad['modules'][0]['heading']='<b>Unsafe</b>';break;case 'control':$bad['modules'][0]['heading']="Unsafe\x00text";break;case 'identity':$bad['identity']['siteScope']='tio2-a';break;case 'unknown':$bad['modules'][0]['faq']=[];break;case 'sequence':$bad['modules'][0]['id']='PL-05';break;case 'paragraph-count':$bad['modules'][3]['paragraphs']=[];break;case 'columns':$bad['modules'][2]['columns'][0]['paragraphs']=[];break;case 'link':$bad['modules'][0]['actions'][0]['href']='https://evil.example';break;case 'breadcrumb':$bad['breadcrumb'][2]['targetPageId']='MARKET-UK-001';break;}
 $meta[1][TIO2_MY_POLAND_MARKET_CONTRACT_META]=$case==='invalid-json'?'{':wp_json_encode($bad); reject_resolver($case);
}
foreach ([" ","\t","\n","\v","\f","\r","\u{00A0}","\u{1680}","\u{2000}","\u{2001}","\u{2002}","\u{2003}","\u{2004}","\u{2005}","\u{2006}","\u{2007}","\u{2008}","\u{2009}","\u{200A}","\u{2028}","\u{2029}","\u{202F}","\u{205F}","\u{3000}","\u{FEFF}"] as $whitespace) {
 foreach ([$whitespace.'Revised text', 'Revised text'.$whitespace, $whitespace] as $text) {
  reset_record(); $bad=$body; $bad['modules'][0]['paragraphs']=[$text];
  $meta[1][TIO2_MY_POLAND_MARKET_CONTRACT_META]=wp_json_encode($bad);
  reject_resolver('ECMAScript trim whitespace '.bin2hex($whitespace));
 }
}
reset_record(); $changed=$body; $changed['modules'][0]['paragraphs']=["An editor's revised plain text."];
$meta[1][TIO2_MY_POLAND_MARKET_CONTRACT_META]=wp_json_encode($changed);
check(tio2_validate_market_page_poland_v01_contract(1)===true,'Valid editable content was pinned to config copy');
tio2_register_market_page_poland_v01_graphql_field();
check($graphql_field[1]==='malaysiaPolandMarketRecordJson' && $graphql_field[2]['resolve']==='tio2_resolve_malaysia_poland_market_record_json','GraphQL binding mismatch');
tio2_register_market_page_poland_v01_meta();
check($registered_meta[0]==='tio2_market_page' && $registered_meta[2]['show_in_rest']===false,'Meta must be protected from unvalidated REST edits');
foreach (['no-nonce','no-capability','foreign','invalid','valid'] as $case) {
 reset_record(); $before=$meta;
 $_POST=['tio2_poland_market_nonce'=>$case==='no-nonce'?'bad':'valid','tio2_poland_market_json'=>wp_slash(wp_json_encode($case==='invalid'?[]:$changed))];
 if($case==='no-capability')$can_edit=false; if($case==='foreign')$scopes[1]=['tio2-b'];
 tio2_save_market_page_poland_v01_meta(1);
 check($case==='valid' ? json_decode($meta[1][TIO2_MY_POLAND_MARKET_CONTRACT_META],true)===$changed : $before===$meta, 'Unsafe/failed admin editing: '.$case);
}
foreach ([['tio2-my'],['tio2-a'],['tio2-b'],['tio2-my','tio2-b']] as $scope) {
 reset_record(); $scopes[1]=$scope; $GLOBALS['tio2_webhook_queue']=[];
 tio2_handle_post_meta_change(7,1,TIO2_MY_POLAND_MARKET_CONTRACT_META,'changed');
 $queue=$GLOBALS['tio2_webhook_queue'];
 check($scope===['tio2-my'] ? ($queue[1]['sitePaths']??null)===['tio2-my'=>['/markets/poland']] : $queue===[], 'Webhook crossed scope or missed Poland');
}
reset_record(); $args=[]; ob_start();
// Like WP-CLI eval-file, evaluate the entrypoint after a prefix and resolve its directory.
$seed_source=preg_replace('/^<\?php/', '', file_get_contents('/work/wordpress/seed/apply-tio2-my-market-poland.php'));
$seed_source=str_replace('__DIR__', var_export('/work/wordpress/seed',true), $seed_source);
eval(';'.$seed_source);
$plan=json_decode(ob_get_clean(),true);
check($plan['mode']==='Plan' && $plan['postId']===1 && get_post_status(1)==='publish','Seed did not default to read-only Plan');
foreach (['foreign','future','trash','custom','missing-term','production'] as $case) {
 reset_record();
 if($case==='foreign')$scopes[1]=['tio2-b']; elseif($case==='missing-term')$missing_term=true; elseif($case==='production')$environment='production'; else{$posts[2]=new WP_Post(2,post_status:$case);$scopes[2]=['tio2-my'];$meta[2]=['public_path'=>'/markets/poland'];}
 $before=serialize([$posts,$meta,$scopes]); $thrown=false;
 try{tio2_seed_malaysia_poland_market('Apply');}catch(\RuntimeException $e){$thrown=true;}
 check($thrown && serialize([$posts,$meta,$scopes])===$before,'Seed precondition mutated state: '.$case);
}
foreach (['insert','terms','public_path',TIO2_MY_POLAND_MARKET_CONTRACT_META,'publish','publish-zero','publish-false','publish-wrong-status'] as $failure) {
 foreach ([false,true] as $existing) {
  if($existing && in_array($failure,['insert','public_path'],true))continue;
  reset_record(); if(!$existing){$posts=[];$meta=[];$scopes=[];}
  $posts[90]=new WP_Post(90,'page','publish','unrelated');$scopes[90]=['tio2-b'];$meta[90]=['public_path'=>'/untouched','private'=>'keep'];
  $before=serialize([$posts,$meta,$scopes]); $fail=$failure; $thrown=false;
  try{tio2_seed_malaysia_poland_market('Apply');}catch(\RuntimeException $e){$thrown=true;}
  check($thrown && serialize([$posts,$meta,$scopes])===$before, 'Seed failed to restore exact state: '.$failure.' existing='.(int)$existing);
 }
}
reset_record(); $posts=[];$meta=[];$scopes=[];
$applied=tio2_seed_malaysia_poland_market('Apply');
check($applied['postId']===42 && get_post_status(42)==='publish' && tio2_validate_market_page_poland_v01_contract(42)===true,'Valid local seed failed');
$before=serialize([$posts,$meta,$scopes]);
check(tio2_seed_malaysia_poland_market()['mode']==='Plan' && serialize([$posts,$meta,$scopes])===$before,'Plan changed existing content');
$applied=tio2_seed_malaysia_poland_market('Apply');
check($applied['postId']===42 && count($posts)===1 && get_post_status(42)==='publish','Repeated Apply created a duplicate');
echo "Poland runtime PASS: resolver, structural editing, GraphQL, admin guards, scoped webhooks, Plan/Apply preconditions and rollback\n";
}
