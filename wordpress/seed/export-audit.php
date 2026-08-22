<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$site_ids = ['tio2-a', 'tio2-b'];
$post_types = [
    'tio2_product',
    'tio2_grade',
    'tio2_application',
    'tio2_document',
    'tio2_faq',
];
$pages = [];
$page_ids = get_posts([
    'post_type' => 'page',
    'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
    'posts_per_page' => -1,
    'fields' => 'ids',
    'no_found_rows' => true,
    'orderby' => 'ID',
    'order' => 'ASC',
]);

foreach ($page_ids as $page_id) {
    $slug = (string) get_post_field('post_name', $page_id);
    $scopes = wp_get_object_terms((int) $page_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        WP_CLI::error($scopes->get_error_message());
    }

    $uses_seed_slug = str_starts_with($slug, 'tio2-a--') || str_starts_with($slug, 'tio2-b--');
    $uses_site_scope = count(array_intersect($site_ids, $scopes)) > 0;
    if (! $uses_seed_slug && ! $uses_site_scope) {
        continue;
    }

    $resolved_page = get_page_by_path($slug, OBJECT, 'page');
    $pages[] = [
        'id' => (int) $page_id,
        'slug' => $slug,
        'status' => (string) get_post_status($page_id),
        'publicPath' => (string) get_post_meta((int) $page_id, 'public_path', true),
        'siteScopes' => array_values($scopes),
        'uriResolvable' => $resolved_page instanceof WP_Post && (int) $resolved_page->ID === (int) $page_id,
    ];
}

$shared_entity_counts = [];
foreach ($post_types as $post_type) {
    $counts = wp_count_posts($post_type);
    $shared_entity_counts[$post_type] = isset($counts->publish) ? (int) $counts->publish : 0;
}

$snapshot = [
    'pages' => $pages,
    'sharedEntityCounts' => $shared_entity_counts,
];

WP_CLI::log('TIO2_AUDIT_JSON_BEGIN');
WP_CLI::log((string) wp_json_encode($snapshot));
WP_CLI::log('TIO2_AUDIT_JSON_END');
