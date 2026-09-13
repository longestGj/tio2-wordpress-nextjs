<?php

if (
    ! defined('WP_CLI') || true !== WP_CLI ||
    wp_get_environment_type() !== 'local' ||
    getenv('D16_TIO2_MY_PRERELEASE_ROUTE_SEED') !== '1'
) {
    throw new RuntimeException('This seed requires the explicitly authorized local prerelease WP-CLI runtime.');
}

defined('TIO2_MY_ROUTE_PAGE_ID_META') || define('TIO2_MY_ROUTE_PAGE_ID_META', '_tio2_my_route_page_id');
defined('TIO2_MY_ROUTE_CANONICAL_META') || define('TIO2_MY_ROUTE_CANONICAL_META', '_tio2_my_route_canonical');
defined('TIO2_MY_ROUTE_RELEASE_STATE_META') || define('TIO2_MY_ROUTE_RELEASE_STATE_META', '_tio2_my_route_release_state');

$config_path = dirname(__DIR__) . '/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json';
$config = json_decode((string) file_get_contents($config_path), true, 512, JSON_THROW_ON_ERROR);
$approved_counts = [
    'TIO2-MY-PRERELEASE-PUBLIC-PATHS-2026-09-09-V1' => 42,
    'TIO2-MY-FULL-PUBLIC-SEO-GA4-GATE6-2026-09-13' => 58,
];
$expected_count = $approved_counts[$config['candidateId'] ?? ''] ?? null;
if (
    null === $expected_count ||
    ($config['siteScope'] ?? null) !== 'tio2-my' ||
    ($config['locale'] ?? null) !== 'en' ||
    ! is_array($config['routes'] ?? null) ||
    count($config['routes']) !== $expected_count
) {
    throw new RuntimeException('The prerelease public-path candidate identity is invalid.');
}

$plans = [];
$page_ids = [];
$paths = [];
$post_ids = [];
$native_count = 0;
$registered_post_types = array_values(array_diff(get_post_types([], 'names'), ['attachment']));

foreach ($config['routes'] as $route) {
    $page_id = is_string($route['pageId'] ?? null) ? $route['pageId'] : '';
    $path = is_string($route['path'] ?? null) ? $route['path'] : '';
    $canonical = is_string($route['canonical'] ?? null) ? $route['canonical'] : '';
    if (
        '' === $page_id || '' === $path || '' === $canonical ||
        isset($page_ids[$page_id]) || isset($paths[$path]) ||
        'https://tio2malaysia.com' . $path !== $canonical
    ) {
        throw new RuntimeException('The prerelease public-path route set is invalid or ambiguous.');
    }
    $page_ids[$page_id] = true;
    $paths[$path] = true;

    if ('CONV-THANK' === $page_id) {
        if ('/thank-you/' !== $path || 'https://tio2malaysia.com/thank-you/' !== $canonical) {
            throw new RuntimeException('The native CONV-THANK route identity is invalid.');
        }
        ++$native_count;
        continue;
    }

    if ('HOME-001' === $page_id) {
        $candidate_ids = array_values(array_filter(
            tio2_find_homepage_ids('tio2-my', false),
            static fn (int $post_id): bool =>
                'publish' === get_post_status($post_id) &&
                tio2_homepage_internal_slug('tio2-my') === get_post_field('post_name', $post_id)
        ));
    } else {
        $stored_paths = array_values(array_unique([$path, untrailingslashit($path)]));
        $candidate_ids = get_posts([
            'post_type' => $registered_post_types,
            'post_status' => 'publish',
            'fields' => 'ids',
            'posts_per_page' => -1,
            'no_found_rows' => true,
            'suppress_filters' => false,
            'meta_query' => [[
                'key' => 'public_path',
                'value' => $stored_paths,
                'compare' => 'IN',
            ]],
            'tax_query' => [[
                'taxonomy' => 'site_scope',
                'field' => 'slug',
                'terms' => ['tio2-my'],
                'operator' => 'IN',
            ]],
        ]);
        $candidate_ids = array_values(array_unique(array_map('intval', $candidate_ids)));
        $candidate_ids = array_values(array_filter($candidate_ids, static function (int $post_id) use ($stored_paths): bool {
            $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
            if (is_wp_error($scopes)) return false;
            sort($scopes, SORT_STRING);
            return ['tio2-my'] === $scopes && in_array((string) get_post_meta($post_id, 'public_path', true), $stored_paths, true);
        }));
    }
    if (1 !== count($candidate_ids)) {
        throw new RuntimeException('Expected exactly one published Malaysia record for ' . $page_id . '.');
    }
    $post_id = $candidate_ids[0];
    if (isset($post_ids[$post_id])) {
        throw new RuntimeException('One CMS record was assigned to multiple prerelease routes.');
    }
    $post_ids[$post_id] = true;
    $plans[] = ['postId' => $post_id, 'pageId' => $page_id, 'canonical' => $canonical];
}

if (1 !== $native_count || ($expected_count - 1) !== count($plans)) {
    throw new RuntimeException('The prerelease candidate must contain the approved CMS routes and one native route.');
}

global $wpdb;
$wpdb->query('START TRANSACTION');
try {
    foreach ($plans as $plan) {
        update_post_meta($plan['postId'], TIO2_MY_ROUTE_PAGE_ID_META, $plan['pageId']);
        update_post_meta($plan['postId'], TIO2_MY_ROUTE_CANONICAL_META, $plan['canonical']);
        update_post_meta($plan['postId'], TIO2_MY_ROUTE_RELEASE_STATE_META, 'LIVE_APPROVED');
        if (
            get_post_meta($plan['postId'], TIO2_MY_ROUTE_PAGE_ID_META, true) !== $plan['pageId'] ||
            get_post_meta($plan['postId'], TIO2_MY_ROUTE_CANONICAL_META, true) !== $plan['canonical'] ||
            get_post_meta($plan['postId'], TIO2_MY_ROUTE_RELEASE_STATE_META, true) !== 'LIVE_APPROVED'
        ) {
            throw new RuntimeException('Route-readiness meta verification failed.');
        }
    }
    $wpdb->query('COMMIT');
} catch (Throwable $error) {
    $wpdb->query('ROLLBACK');
    throw $error;
}

echo 'TIO2_MY_PRERELEASE_PUBLIC_PATHS_RESULT ' . wp_json_encode([
    'candidateId' => $config['candidateId'],
    'state' => 'APPLIED',
    'routeCount' => $expected_count,
], JSON_UNESCAPED_SLASHES) . PHP_EOL;
