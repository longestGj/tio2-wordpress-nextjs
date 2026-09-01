<?php

if (! function_exists('tio2_validate_about_page_v01_contract')) {
    throw new RuntimeException('ABOUT-001 plugin functions are unavailable.');
}

$ids = get_posts([
    'post_type' => 'tio2_about_page', 'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => 'tio2-my-about', 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
]);
if (1 !== count($ids)) throw new RuntimeException('Expected exactly one ABOUT-001 record.');
$post_id = (int) $ids[0];
$original_status = (string) get_post_status($post_id);
$original_contract = (string) get_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, true);

try {
    $validation = tio2_validate_about_page_v01_contract($post_id);
    if (true !== $validation) throw new RuntimeException('The approved ABOUT-001 contract did not validate.');

    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    try {
        tio2_resolve_malaysia_about_page_record_json();
        throw new RuntimeException('Missing published ABOUT-001 unexpectedly resolved.');
    } catch (\GraphQL\Error\UserError $error) {
        if (! str_contains($error->getMessage(), 'missing')) throw $error;
    }
    wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);

    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, '{}');
    if (! is_wp_error(tio2_validate_about_page_v01_contract($post_id))) {
        throw new RuntimeException('A modified ABOUT-001 contract unexpectedly validated.');
    }
} finally {
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, $original_contract);
    wp_set_object_terms($post_id, ['tio2-my'], 'site_scope', false);
    wp_update_post(['ID' => $post_id, 'post_status' => $original_status]);
    clean_post_cache($post_id);
}

if (true !== tio2_validate_about_page_v01_contract($post_id)) {
    throw new RuntimeException('ABOUT-001 fixture restoration failed.');
}

echo wp_json_encode([
    'status' => 'passed', 'pageId' => 'ABOUT-001', 'siteScope' => 'tio2-my',
    'missingRecordBehavior' => 'GraphQL error', 'crossScopeFallback' => false,
]) . PHP_EOL;
