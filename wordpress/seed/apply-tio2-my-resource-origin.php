<?php

if (! function_exists('tio2_validate_resource_origin_v01_contract')) {
    throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
}

$site_id = 'tio2-my';
$slug = 'non-china-titanium-dioxide';
$public_path = '/resources/non-china-titanium-dioxide/';
$contract_json = tio2_my_resource_origin_approved_contract_json();
if (is_wp_error($contract_json)) {
    throw new RuntimeException($contract_json->get_error_message());
}

if (! term_exists($site_id, 'site_scope')) {
    $term = wp_insert_term($site_id, 'site_scope', ['slug' => $site_id]);
    if (is_wp_error($term)) throw new RuntimeException($term->get_error_message());
}

$ids = get_posts([
    'post_type' => 'tio2_document',
    'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => $slug,
    'fields' => 'ids',
    'numberposts' => 2,
    'suppress_filters' => false,
    'tax_query' => [[
        'taxonomy' => 'site_scope',
        'field' => 'slug',
        'terms' => [$site_id],
        'operator' => 'AND',
        'include_children' => false,
    ]],
]);
if (count($ids) > 1) throw new RuntimeException('Expected no more than one local Malaysia RES-ORIGIN record.');
if ([] === $ids) {
    $created = wp_insert_post([
        'post_type' => 'tio2_document',
        'post_status' => 'draft',
        'post_title' => 'Non-China Titanium Dioxide: A Procurement Evaluation Guide',
        'post_name' => $slug,
    ], true);
    if (is_wp_error($created)) throw new RuntimeException($created->get_error_message());
    $post_id = (int) $created;
} else {
    $post_id = (int) $ids[0];
    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
}

$scope = wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
if (is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
wp_update_post(['ID' => $post_id, 'post_name' => $slug]);
update_post_meta($post_id, 'public_path', $public_path);
update_post_meta($post_id, 'resource_id', 'RES-ORIGIN');
update_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META, $contract_json);
delete_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_ARTICLE_METADATA_META);
$contract = json_decode($contract_json, true);
if (! is_array($contract) || ! is_array($contract['relations'] ?? null)) {
    throw new RuntimeException('The approved Malaysia RES-ORIGIN relations are missing.');
}
update_post_meta(
    $post_id,
    TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META,
    wp_json_encode($contract['relations'])
);
clean_post_cache($post_id);

$validation = tio2_validate_resource_origin_v01_contract($post_id);
if (is_wp_error($validation)) throw new RuntimeException($validation->get_error_message());
wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);
if ('publish' !== get_post_status($post_id)) {
    throw new RuntimeException('The Malaysia RES-ORIGIN contract could not be published locally.');
}

echo wp_json_encode([
    'status' => 'passed',
    'postId' => $post_id,
    'pageId' => 'RES-ORIGIN',
    'siteScope' => $site_id,
    'publicPath' => $public_path,
]) . PHP_EOL;
