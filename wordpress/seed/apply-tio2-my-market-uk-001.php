<?php
// Explicit local-only seed. Never run against staging or production.
if (!function_exists('wp_get_environment_type') || !in_array(wp_get_environment_type(), ['local', 'development'], true) ||
    !function_exists('tio2_validate_market_page_uk_v01_contract')) {
    throw new RuntimeException('UK seed requires the project plugin and a local/development WordPress environment.');
}
$slug = 'tio2-my-market-uk-001';
$json = file_get_contents(dirname(__DIR__) . '/plugins/tio2-site-model/config/tio2-my-market-uk-001.json');
if (!is_string($json) || !is_array(json_decode($json, true))) throw new RuntimeException('Missing approved UK payload.');
$ids = get_posts(['post_type'=>'tio2_market_page', 'post_status'=>['draft','pending','private','publish'], 'name'=>$slug, 'fields'=>'ids', 'numberposts'=>2, 'suppress_filters'=>false]);
if (count($ids)>1) throw new RuntimeException('Multiple UK records.');
if ($ids) {
    $scopes=wp_get_post_terms((int)$ids[0], 'site_scope', ['fields'=>'slugs']);
    if (is_wp_error($scopes) || $scopes!==['tio2-my']) throw new RuntimeException('Refusing to overwrite a foreign/unscoped UK record.');
}
$post_id=wp_insert_post(['ID'=>$ids[0]??0,'post_type'=>'tio2_market_page','post_status'=>'draft','post_name'=>$slug,'post_title'=>'TiO2 Malaysia United Kingdom Market'],true);
if (is_wp_error($post_id)) throw new RuntimeException($post_id->get_error_message());
$scope=wp_set_object_terms($post_id,['tio2-my'],'site_scope',false);
if(is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
update_post_meta($post_id,'public_path','/markets/united-kingdom');
update_post_meta($post_id,TIO2_MY_UK_MARKET_CONTRACT_META,$json);
$validation=tio2_validate_market_page_uk_v01_contract((int)$post_id);
if(is_wp_error($validation))throw new RuntimeException($validation->get_error_message());
// Storage publish enables local rendering only; all release/index flags stay false.
$published_id = wp_update_post(['ID'=>$post_id,'post_status'=>'publish'], true);
if (is_wp_error($published_id)) throw new RuntimeException($published_id->get_error_message());
if (!is_int($published_id) || $published_id <= 0 || $published_id !== (int)$post_id ||
    'publish' !== get_post_status($published_id)) {
    throw new RuntimeException('UK seed storage publish failed; no success result emitted.');
}
echo wp_json_encode(['postId'=>$post_id,'siteScope'=>'tio2-my','releaseEnabled'=>false]) . PHP_EOL;
