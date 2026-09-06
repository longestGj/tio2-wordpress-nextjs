<?php

if (! function_exists('tio2_validate_market_page_v01_contract')) {
    throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
}

$site_id = 'tio2-my';
$internal_slug = 'tio2-my-market-eu-001';
$public_path = '/markets/european-union';
$contract_path = dirname(__DIR__) . '/plugins/tio2-site-model/config/tio2-my-market-eu-001.json';
$contract_json = is_readable($contract_path) ? file_get_contents($contract_path) : false;
if (! is_string($contract_json) || '' === $contract_json || ! is_array(json_decode($contract_json, true))) {
    throw new RuntimeException('The approved Malaysia EU Market contract is missing or invalid.');
}

if (! term_exists($site_id, 'site_scope')) {
    $term = wp_insert_term($site_id, 'site_scope', ['slug' => $site_id]);
    if (is_wp_error($term)) {
        throw new RuntimeException($term->get_error_message());
    }
}

$ids = get_posts([
    'post_type' => 'tio2_market_page',
    'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => $internal_slug,
    'fields' => 'ids',
    'numberposts' => 2,
    'suppress_filters' => false,
]);
if (count($ids) > 1) {
    throw new RuntimeException('Expected no more than one local TiO2 Malaysia EU Market record.');
}
if ([] === $ids) {
    $created = wp_insert_post([
        'post_type' => 'tio2_market_page',
        'post_status' => 'draft',
        'post_title' => 'TiO2 Malaysia European Union Market',
        'post_name' => $internal_slug,
    ], true);
    if (is_wp_error($created)) {
        throw new RuntimeException($created->get_error_message());
    }
    $post_id = (int) $created;
} else {
    $post_id = (int) $ids[0];
    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
}

$scope = wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
if (is_wp_error($scope)) {
    throw new RuntimeException($scope->get_error_message());
}
wp_update_post(['ID' => $post_id, 'post_name' => $internal_slug]);
update_post_meta($post_id, 'public_path', $public_path);
update_post_meta($post_id, TIO2_MY_EU_MARKET_CONTRACT_META, $contract_json);
clean_post_cache($post_id);

$validation = tio2_validate_market_page_v01_contract($post_id);
if (is_wp_error($validation)) {
    throw new RuntimeException($validation->get_error_message());
}
wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);
if ('publish' !== get_post_status($post_id)) {
    throw new RuntimeException('The Malaysia EU Market contract could not be published locally.');
}

echo wp_json_encode([
    'status' => 'passed',
    'postId' => $post_id,
    'siteScope' => $site_id,
    'internalSlug' => $internal_slug,
    'publicPath' => $public_path,
    'schemaVersion' => 'market-page-v0.1-malaysia',
]) . PHP_EOL;
