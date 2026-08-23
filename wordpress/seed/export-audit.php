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
    'post_type' => ['page', 'post'],
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
        'postType' => (string) get_post_type($page_id),
        'slug' => $slug,
        'status' => (string) get_post_status($page_id),
        'publicPath' => (string) get_post_meta((int) $page_id, 'public_path', true),
        'siteScopes' => array_values($scopes),
        'uriResolvable' => null,
        'uriResolutionSource' => null,
        'seoTitle' => (string) get_post_meta((int) $page_id, 'seo_title', true),
        'seoDescription' => (string) get_post_meta((int) $page_id, 'seo_description', true),
        'previousRootStatus' => (string) get_post_meta((int) $page_id, '_tio2_previous_root_status', true),
        'previousRootSiteScopes' => json_decode(
            (string) get_post_meta((int) $page_id, '_tio2_previous_root_site_scope', true),
            true
        ) ?: [],
        'seedMarker' => $managed_internal_slug,
        'supersededSeedSnapshot' => (string) get_post_meta(
            (int) $page_id,
            '_tio2_seed_superseded_snapshot',
            true
        ),
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
        $graphql_field = 'post' === $pages[$page_index]['postType'] ? 'post' : 'page';
        $aliases[] = $alias . ': ' . $graphql_field . '(id: ' . wp_json_encode($uri) . ', idType: URI) { databaseId }';
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

$homepages = [];
global $wpdb;
$homepage_ids = array_map('intval', $wpdb->get_col(
    "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'tio2_homepage' ORDER BY ID ASC"
));
foreach ($homepage_ids as $homepage_id) {
    $homepage_scopes = wp_get_object_terms((int) $homepage_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($homepage_scopes)) {
        WP_CLI::error($homepage_scopes->get_error_message());
    }
    $homepage_scopes = array_values(array_unique(array_map('strval', $homepage_scopes)));
    $site_id = 1 === count($homepage_scopes) && in_array($homepage_scopes[0], $site_ids, true)
        ? $homepage_scopes[0]
        : null;
    $homepages[] = [
        'id' => (int) $homepage_id,
        'siteId' => $site_id,
        'slug' => (string) get_post_field('post_name', $homepage_id),
        'status' => (string) get_post_status($homepage_id),
        'publicPath' => '/',
        'schemaVersion' => (string) get_field('homepage_schema_version', $homepage_id, false),
        'seedMarker' => (string) get_post_meta((int) $homepage_id, '_tio2_seed_homepage_site_id', true),
        'siteScopes' => $homepage_scopes,
        'error' => (string) get_post_meta((int) $homepage_id, '_tio2_homepage_error', true),
        'uriResolvable' => false,
        'uriResolutionSource' => 'wpgraphql',
    ];
}

foreach (array_chunk(array_keys($homepages), 100) as $homepage_indexes) {
    $aliases = [];
    $alias_to_index = [];
    foreach ($homepage_indexes as $homepage_index) {
        $alias = 'homepage' . $homepage_index;
        $aliases[] = $alias . ': tio2Homepage(id: ' .
            wp_json_encode($homepages[$homepage_index]['slug']) .
            ', idType: SLUG) { databaseId }';
        $alias_to_index[$alias] = $homepage_index;
    }
    if ([] === $aliases) {
        continue;
    }
    $result = graphql(['query' => 'query HomepageSeedAudit { ' . implode(' ', $aliases) . ' }']);
    if (! empty($result['errors']) || ! isset($result['data']) || ! is_array($result['data'])) {
        WP_CLI::error('WPGraphQL homepage audit query failed: ' . wp_json_encode($result['errors'] ?? []));
    }
    foreach ($alias_to_index as $alias => $homepage_index) {
        $resolved_id = $result['data'][$alias]['databaseId'] ?? null;
        $homepages[$homepage_index]['uriResolvable'] =
            (int) $resolved_id === $homepages[$homepage_index]['id'];
    }
}

$routes = $pages;
$public_urls = [];
foreach ($routes as $route) {
    if ('publish' === $route['status']) {
        $public_urls[] = [
            'siteId' => $route['siteScopes'][0] ?? null,
            'path' => $route['publicPath'],
            'ownerType' => $route['postType'],
            'ownerId' => $route['id'],
            'slug' => $route['slug'],
            'siteScopes' => $route['siteScopes'],
            'uriResolvable' => $route['uriResolvable'],
            'uriResolutionSource' => $route['uriResolutionSource'],
        ];
    }
}
foreach ($homepages as $homepage) {
    if ('publish' === $homepage['status']) {
        $public_urls[] = [
            'siteId' => $homepage['siteId'],
            'path' => '/',
            'ownerType' => 'homepage',
            'ownerId' => $homepage['id'],
            'slug' => $homepage['slug'],
            'siteScopes' => $homepage['siteScopes'],
            'uriResolvable' => $homepage['uriResolvable'],
            'uriResolutionSource' => $homepage['uriResolutionSource'],
        ];
    }
}

$snapshot = [
    'routes' => $routes,
    'homepages' => $homepages,
    'publicUrls' => $public_urls,
    'sharedFixtures' => $shared_fixtures,
];

WP_CLI::log('TIO2_AUDIT_JSON_BEGIN');
WP_CLI::log((string) wp_json_encode($snapshot));
WP_CLI::log('TIO2_AUDIT_JSON_END');
