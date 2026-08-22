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
$manifest_path = '/workspace/wordpress/seed/representative-content.json';
if (! is_readable($manifest_path)) {
    WP_CLI::error('Representative seed manifest is unavailable to the audit exporter.');
}
$manifest = json_decode((string) file_get_contents($manifest_path), true, 512, JSON_THROW_ON_ERROR);
$expected_fixtures = [];
foreach ($manifest['sharedEntities'] as $entity) {
    $expected_fixtures[$entity['id']] = $entity['postType'];
}

if (! function_exists('graphql') || ! class_exists('WPGraphQL')) {
    WP_CLI::error('WPGraphQL is unavailable to the audit exporter.');
}

$pages = [];
$page_ids = get_posts([
    'post_type' => 'page',
    'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
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

    $managed_internal_slug = (string) get_post_meta((int) $page_id, '_tio2_seed_internal_slug', true);
    $uses_seed_slug = str_starts_with($slug, 'tio2-a--') || str_starts_with($slug, 'tio2-b--');
    $uses_seed_marker = str_starts_with($managed_internal_slug, 'tio2-a--') ||
        str_starts_with($managed_internal_slug, 'tio2-b--');
    $uses_site_scope = count(array_intersect($site_ids, $scopes)) > 0;
    if (! $uses_seed_slug && ! $uses_seed_marker && ! $uses_site_scope) {
        continue;
    }

    $pages[] = [
        'id' => (int) $page_id,
        'slug' => $slug,
        'status' => (string) get_post_status($page_id),
        'publicPath' => (string) get_post_meta((int) $page_id, 'public_path', true),
        'siteScopes' => array_values($scopes),
        'uriResolvable' => null,
        'uriResolutionSource' => null,
        'seoTitle' => (string) get_post_meta((int) $page_id, 'seo_title', true),
        'seoDescription' => (string) get_post_meta((int) $page_id, 'seo_description', true),
    ];
}

foreach (array_chunk(array_keys($pages), 100) as $page_indexes) {
    $aliases = [];
    $alias_to_index = [];
    foreach ($page_indexes as $page_index) {
        if ('publish' !== $pages[$page_index]['status']) {
            continue;
        }
        $alias = 'page' . $page_index;
        $uri = '/' . $pages[$page_index]['slug'] . '/';
        $aliases[] = $alias . ': page(id: ' . wp_json_encode($uri) . ', idType: URI) { databaseId }';
        $alias_to_index[$alias] = $page_index;
    }
    if ([] === $aliases) {
        continue;
    }

    $result = graphql(['query' => 'query SeedAudit { ' . implode(' ', $aliases) . ' }']);
    if (! empty($result['errors'])) {
        WP_CLI::error('WPGraphQL audit query failed: ' . wp_json_encode($result['errors']));
    }
    if (! isset($result['data']) || ! is_array($result['data'])) {
        WP_CLI::error('WPGraphQL audit query returned no data.');
    }

    foreach ($alias_to_index as $alias => $page_index) {
        $resolved_id = $result['data'][$alias]['databaseId'] ?? null;
        $pages[$page_index]['uriResolvable'] = (int) $resolved_id === $pages[$page_index]['id'];
        $pages[$page_index]['uriResolutionSource'] = 'wpgraphql';
    }
}

$shared_fixtures = [];
$shared_entity_ids = get_posts([
    'post_type' => $post_types,
    'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
    'posts_per_page' => -1,
    'fields' => 'ids',
    'no_found_rows' => true,
    'orderby' => 'ID',
    'order' => 'ASC',
]);
foreach ($shared_entity_ids as $entity_id) {
    $fixture_id = (string) get_post_meta((int) $entity_id, '_tio2_seed_fixture_id', true);
    if ('' === $fixture_id) {
        $candidate_slugs = [
            (string) get_post_field('post_name', $entity_id),
            (string) get_post_meta((int) $entity_id, '_wp_desired_post_slug', true),
        ];
        foreach ($candidate_slugs as $candidate_slug) {
            if (isset($expected_fixtures[$candidate_slug])) {
                $fixture_id = $candidate_slug;
                break;
            }
        }
    }
    if (! isset($expected_fixtures[$fixture_id])) {
        continue;
    }

    $scopes = wp_get_object_terms((int) $entity_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        WP_CLI::error($scopes->get_error_message());
    }
    $shared_fixtures[] = [
        'id' => (int) $entity_id,
        'fixtureId' => $fixture_id,
        'slug' => (string) get_post_field('post_name', $entity_id),
        'status' => (string) get_post_status($entity_id),
        'postType' => (string) get_post_type($entity_id),
        'siteScopes' => array_values($scopes),
    ];
}

$snapshot = [
    'pages' => $pages,
    'sharedFixtures' => $shared_fixtures,
];

WP_CLI::log('TIO2_AUDIT_JSON_BEGIN');
WP_CLI::log((string) wp_json_encode($snapshot));
WP_CLI::log('TIO2_AUDIT_JSON_END');
