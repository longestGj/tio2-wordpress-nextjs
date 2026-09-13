<?php
// Explicit --initialize-draft creates only a new technical draft. Otherwise args are approval ID + operation.
if (PHP_SAPI !== 'cli' || !defined('WP_CLI') || !WP_CLI || !function_exists('tio2_apply_approved_content') || !get_current_user_id()) {
    throw new RuntimeException('Run through WP-CLI with an explicit --user.');
}
$json = file_get_contents(dirname(__DIR__).'/plugins/tio2-site-model/config/tio2-my-homepage.json');
$content = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
$ids = tio2_find_homepage_ids('tio2-my', false);
if (count($ids)>1) throw new RuntimeException('Ambiguous Malaysia homepage identity.');
if (($args[0] ?? '') !== '--initialize-draft') {
    if (count($args ?? []) !== 2 || !$ids) throw new RuntimeException('Supply approval ID and operation for an existing record; initialize a new draft explicitly first.');
    // Legacy footer is retained only where already installed; new drafts never introduce it.
    $current = json_decode(get_post_meta((int)$ids[0],TIO2_MY_HOMEPAGE_CONTRACT_META,true),true);
    if (is_array($current) && array_key_exists('footer',$current)) $content['footer']=$current['footer']; else unset($content['footer']);
    $result = tio2_apply_approved_content($args[0],$args[1],[['pageId'=>'HOME-001','content'=>wp_json_encode($content)]]);
    if (is_wp_error($result)) throw new RuntimeException($result->get_error_code().': '.$result->get_error_message());
    echo wp_json_encode($result).PHP_EOL; return;
}
if ($ids) throw new RuntimeException('Draft initialization never overwrites an existing record.');
$type=get_post_type_object('tio2_homepage');
if (!$type || !current_user_can($type->cap->create_posts)) throw new RuntimeException('Missing draft creation capability.');
unset($content['footer']); $json=wp_json_encode($content);
$valid=tio2_validate_my_content_write('HOME-001',$json,null);
if (is_wp_error($valid)) throw new RuntimeException($valid->get_error_message());
if (!term_exists('tio2-my','site_scope')) { $term=wp_insert_term('tio2-my','site_scope',['slug'=>'tio2-my']); if(is_wp_error($term)) throw new RuntimeException($term->get_error_message()); }
$id=wp_insert_post(['post_type'=>'tio2_homepage','post_status'=>'draft','post_title'=>'TiO2 Malaysia Homepage','post_name'=>'tio2-my-homepage'],true);
if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
$scope=wp_set_object_terms($id,['tio2-my'],'site_scope');
if (is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
$slug=tio2_force_homepage_slug($id);
if (is_wp_error($slug)) throw new RuntimeException($slug->get_error_message());
update_field('field_tio2_home_schema_version','homepage-v0.4-malaysia',$id);
if (!update_post_meta($id,TIO2_MY_HOMEPAGE_CONTRACT_META,wp_slash($json))) throw new RuntimeException('Draft content did not persist.');
echo wp_json_encode(['status'=>'draft','postId'=>$id,'siteScope'=>'tio2-my','approval'=>'not-granted']).PHP_EOL;
