<?php

if (! defined('ABSPATH') || ! defined('WP_CLI') || true !== WP_CLI) throw new RuntimeException('Run this probe through wp eval-file.');

defined('TIO2_MY_ROUTE_PAGE_ID_META') || define('TIO2_MY_ROUTE_PAGE_ID_META', '_tio2_my_route_page_id');
defined('TIO2_MY_ROUTE_CANONICAL_META') || define('TIO2_MY_ROUTE_CANONICAL_META', '_tio2_my_route_canonical');
defined('TIO2_MY_ROUTE_RELEASE_STATE_META') || define('TIO2_MY_ROUTE_RELEASE_STATE_META', '_tio2_my_route_release_state');

$config_path = dirname(__DIR__) . '/plugins/tio2-site-model/config/tio2-my-prerelease-public-paths.json';
$config = json_decode((string) file_get_contents($config_path), true, 512, JSON_THROW_ON_ERROR);
$routes = $config['routes'] ?? null;
if (
    ($config['candidateId'] ?? null) !== 'TIO2-MY-PRERELEASE-PUBLIC-PATHS-2026-09-09-V1' ||
    ($config['siteScope'] ?? null) !== 'tio2-my' ||
    ($config['locale'] ?? null) !== 'en' ||
    ! is_array($routes) || 42 !== count($routes)
) throw new RuntimeException('The applied public-path candidate identity is invalid.');

$cms_count = 0;
$native_count = 0;
$registered_post_types = array_values(array_diff(get_post_types([], 'names'), ['attachment']));
foreach ($routes as $route) {
    if ('CONV-THANK' === $route['pageId']) {
        if ('/thank-you/' !== $route['path'] || 'https://tio2malaysia.com/thank-you/' !== $route['canonical']) {
            throw new RuntimeException('The native Thank route identity drifted.');
        }
        ++$native_count;
        continue;
    }
    $ids = get_posts([
        'post_type' => $registered_post_types,
        'post_status' => 'publish',
        'fields' => 'ids',
        'posts_per_page' => 2,
        'no_found_rows' => true,
        'meta_key' => TIO2_MY_ROUTE_PAGE_ID_META,
        'meta_value' => $route['pageId'],
        'tax_query' => [[
            'taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-my'], 'operator' => 'IN',
        ]],
    ]);
    if (1 !== count($ids)) throw new RuntimeException('Route-readiness record missing or ambiguous: ' . $route['pageId']);
    $post_id = (int) $ids[0];
    $stored_path = (string) get_post_meta($post_id, 'public_path', true);
    if (
        untrailingslashit($stored_path) !== untrailingslashit($route['path']) ||
        get_post_meta($post_id, TIO2_MY_ROUTE_CANONICAL_META, true) !== $route['canonical'] ||
        get_post_meta($post_id, TIO2_MY_ROUTE_RELEASE_STATE_META, true) !== 'LIVE_APPROVED'
    ) throw new RuntimeException('Route-readiness record failed identity verification: ' . $route['pageId']);
    ++$cms_count;
}
if (41 !== $cms_count || 1 !== $native_count) throw new RuntimeException('The applied route counts are invalid.');

$probe_routes = array_values(array_filter($routes, static fn (array $route): bool => 'CONV-THANK' !== $route['pageId']));
$sentinel_route = $probe_routes[0];
$missing_route = $probe_routes[1];
$sentinel_id = (int) get_posts([
    'post_type' => $registered_post_types, 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => 1,
    'meta_key' => TIO2_MY_ROUTE_PAGE_ID_META, 'meta_value' => $sentinel_route['pageId'],
])[0];
$missing_id = (int) get_posts([
    'post_type' => $registered_post_types, 'post_status' => 'publish', 'fields' => 'ids', 'posts_per_page' => 1,
    'meta_key' => TIO2_MY_ROUTE_PAGE_ID_META, 'meta_value' => $missing_route['pageId'],
])[0];
$missing_status = get_post_status($missing_id);
update_post_meta($sentinel_id, TIO2_MY_ROUTE_RELEASE_STATE_META, 'PREFLIGHT_SENTINEL');
wp_update_post(['ID' => $missing_id, 'post_status' => 'draft']);
$preflight_failed = false;
putenv('D16_TIO2_MY_PRERELEASE_ROUTE_SEED=1');
try {
    (static function (): void { include dirname(__DIR__) . '/seed/apply-tio2-my-prerelease-public-paths.php'; })();
} catch (RuntimeException $error) {
    $preflight_failed = str_contains($error->getMessage(), 'Expected exactly one published Malaysia record');
} finally {
    wp_update_post(['ID' => $missing_id, 'post_status' => $missing_status]);
}
if (! $preflight_failed || 'PREFLIGHT_SENTINEL' !== get_post_meta($sentinel_id, TIO2_MY_ROUTE_RELEASE_STATE_META, true)) {
    throw new RuntimeException('Missing-route preflight did not fail before mutation.');
}
(static function (): void { include dirname(__DIR__) . '/seed/apply-tio2-my-prerelease-public-paths.php'; })();
putenv('D16_TIO2_MY_PRERELEASE_ROUTE_SEED');

echo wp_json_encode([
    'status' => 'passed',
    'candidateId' => 'TIO2-MY-PRERELEASE-PUBLIC-PATHS-2026-09-09-V1',
    'routeCount' => 42,
    'cmsRouteCount' => 41,
    'nativeRouteCount' => 1,
], JSON_UNESCAPED_SLASHES) . PHP_EOL;
