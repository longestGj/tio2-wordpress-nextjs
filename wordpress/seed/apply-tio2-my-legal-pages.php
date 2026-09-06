<?php

if (! function_exists('tio2_validate_legal_page_v01_contract')) throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
$contract = tio2_my_legal_pages_approved_contract();
if (is_wp_error($contract)) throw new RuntimeException($contract->get_error_message());
$site_id = 'tio2-my';
if (! term_exists($site_id, 'site_scope')) {
    $term = wp_insert_term($site_id, 'site_scope', ['slug' => $site_id]);
    if (is_wp_error($term)) throw new RuntimeException($term->get_error_message());
}
$created_ids = [];
foreach ($contract['pages'] as $page) {
    $path = rtrim((string) $page['path'], '/');
    $slug = 'tio2-my-' . str_replace('/', '-', trim($path, '/'));
    $ids = get_posts([
        'post_type' => 'tio2_legal_page', 'post_status' => ['draft', 'pending', 'private', 'publish'],
        'name' => $slug, 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
        'tax_query' => [['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => [$site_id], 'operator' => 'IN']],
    ]);
    if (count($ids) > 1) throw new RuntimeException('Expected no more than one same-scope Legal page record per route.');
    $same_slug_ids = get_posts(['post_type' => 'tio2_legal_page', 'post_status' => ['draft', 'pending', 'private', 'publish'], 'name' => $slug, 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false]);
    if ([] === $ids && [] !== $same_slug_ids) throw new RuntimeException('A same-slug Legal page record exists outside site_scope=tio2-my.');
    if ([] === $ids) {
        $created = wp_insert_post(['post_type' => 'tio2_legal_page', 'post_status' => 'draft', 'post_title' => $page['seo']['title'], 'post_name' => $slug], true);
        if (is_wp_error($created)) throw new RuntimeException($created->get_error_message());
        $post_id = (int) $created;
    } else {
        $post_id = (int) $ids[0];
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft', 'post_title' => $page['seo']['title']]);
    }
    $scope = wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
    if (is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
    update_post_meta($post_id, 'public_path', $path);
    update_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, wp_slash(wp_json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    clean_post_cache($post_id);
    $validation = tio2_validate_legal_page_v01_contract($post_id);
    if (is_wp_error($validation)) throw new RuntimeException($validation->get_error_message());
    wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);
    $created_ids[] = $post_id;
}
echo wp_json_encode(['status' => 'passed', 'siteScope' => $site_id, 'pageCount' => count($created_ids), 'postIds' => $created_ids]) . PHP_EOL;
