<?php

if (
    ! function_exists('tio2_find_homepage_ids') ||
    ! function_exists('tio2_validate_homepage_contract') ||
    ! function_exists('update_field')
) {
    throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
}

$site_id = 'tio2-my';
$internal_slug = 'tio2-my--homepage';
$contract_path = dirname(__DIR__) . '/plugins/tio2-site-model/config/tio2-my-homepage.json';
$contract_json = is_readable($contract_path) ? file_get_contents($contract_path) : false;
if (! is_string($contract_json) || '' === $contract_json || ! is_array(json_decode($contract_json, true))) {
    throw new RuntimeException('The approved Malaysia Homepage contract is missing or invalid.');
}

if (! term_exists($site_id, 'site_scope')) {
    $term = wp_insert_term($site_id, 'site_scope', ['slug' => $site_id]);
    if (is_wp_error($term)) {
        throw new RuntimeException($term->get_error_message());
    }
}

$ids = tio2_find_homepage_ids($site_id, false);
if (count($ids) > 1) {
    throw new RuntimeException('Expected no more than one local TiO2 Malaysia homepage record.');
}
if ([] === $ids) {
    $created = wp_insert_post([
        'post_type' => 'tio2_homepage',
        'post_status' => 'draft',
        'post_title' => 'TiO2 Malaysia Homepage',
        'post_name' => 'tio2-my-homepage',
    ], true);
    if (is_wp_error($created)) {
        throw new RuntimeException($created->get_error_message());
    }
    $post_id = (int) $created;
    $scope = wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
    if (is_wp_error($scope)) {
        throw new RuntimeException($scope->get_error_message());
    }
} else {
    $post_id = (int) $ids[0];
    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
}

$slug_result = tio2_force_homepage_slug($post_id);
if (is_wp_error($slug_result) || $internal_slug !== get_post_field('post_name', $post_id)) {
    throw new RuntimeException('The Malaysia Homepage internal slug could not be secured.');
}

$GLOBALS['tio2_homepage_acf_save_in_progress'][$post_id] = true;
try {
    update_field('field_tio2_home_schema_version', 'homepage-v0.4-malaysia', $post_id);
    update_post_meta($post_id, '_tio2_my_homepage_contract_json', $contract_json);
} finally {
    unset($GLOBALS['tio2_homepage_acf_save_in_progress'][$post_id]);
}

clean_post_cache($post_id);
$validation = tio2_validate_homepage_contract($post_id);
if (is_wp_error($validation)) {
    throw new RuntimeException($validation->get_error_message());
}
wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);
if ('publish' !== get_post_status($post_id)) {
    throw new RuntimeException('The Malaysia Homepage contract could not be published locally.');
}

echo wp_json_encode([
    'status' => 'passed',
    'postId' => $post_id,
    'siteScope' => $site_id,
    'internalSlug' => $internal_slug,
    'schemaVersion' => 'homepage-v0.4-malaysia',
]) . PHP_EOL;
