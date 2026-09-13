<?php
// Explicit --initialize-draft creates only a new technical draft. Otherwise args are approval ID + operation.
if (PHP_SAPI !== 'cli' || !defined('WP_CLI') || !WP_CLI || !function_exists('tio2_apply_approved_content') || !get_current_user_id()) {
    throw new RuntimeException('Run through WP-CLI with an explicit --user.');
}
$json=file_get_contents(dirname(__DIR__).'/plugins/tio2-site-model/config/tio2-my-application-hub.json');
if (($args[0] ?? '') !== '--initialize-draft') {
    if (count($args ?? []) !== 2) throw new RuntimeException('Supply approval ID and operation, or explicitly initialize a new draft.');
    $result=tio2_apply_approved_content($args[0],$args[1],[['pageId'=>'APP-000','content'=>$json]]);
    if (is_wp_error($result)) throw new RuntimeException($result->get_error_code().': '.$result->get_error_message());
    echo wp_json_encode($result).PHP_EOL; return;
}
$ids=get_posts(['post_type'=>'tio2_application_hub','post_status'=>'any','name'=>'tio2-my-applications','fields'=>'ids','numberposts'=>2]);
if ($ids) throw new RuntimeException('Draft initialization never overwrites an existing record.');
$type=get_post_type_object('tio2_application_hub');
if (!$type || !current_user_can($type->cap->create_posts)) throw new RuntimeException('Missing draft creation capability.');
$valid=tio2_validate_my_content_write('APP-000',$json,null);
if (is_wp_error($valid)) throw new RuntimeException($valid->get_error_message());
if (!term_exists('tio2-my','site_scope')) { $term=wp_insert_term('tio2-my','site_scope',['slug'=>'tio2-my']); if(is_wp_error($term)) throw new RuntimeException($term->get_error_message()); }
$id=wp_insert_post(['post_type'=>'tio2_application_hub','post_status'=>'draft','post_title'=>'TiO2 Malaysia Applications','post_name'=>'tio2-my-applications'],true);
if(is_wp_error($id)) throw new RuntimeException($id->get_error_message());
$scope=wp_set_object_terms($id,['tio2-my'],'site_scope');
if(is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
update_post_meta($id,'public_path','/applications');
if(!update_post_meta($id,TIO2_MY_APPLICATION_HUB_CONTRACT_META,wp_slash($json))) throw new RuntimeException('Draft content did not persist.');
echo wp_json_encode(['status'=>'draft','postId'=>$id,'siteScope'=>'tio2-my','approval'=>'not-granted']).PHP_EOL;
