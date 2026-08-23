<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_webhook_routing_post_ids'] = [];

function tio2_webhook_routing_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }
    throw new RuntimeException($message);
}

function tio2_webhook_routing_cleanup(): void
{
    foreach ($GLOBALS['tio2_webhook_routing_post_ids'] ?? [] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
}

/**
 * @param list<array{url: string, args: array<string, mixed>}> $requests
 */
function tio2_webhook_routing_assert_request(array $requests, string $site_id): void
{
    if (1 !== count($requests)) {
        tio2_webhook_routing_fail("Expected one {$site_id} webhook request, received " . count($requests));
    }

    $expected_url = 'tio2-a' === $site_id
        ? 'https://site-a.next.test/api/revalidate'
        : 'https://site-b.next.test/api/revalidate';
    $expected_secret = 'tio2-a' === $site_id
        ? 'site-a-routing-secret'
        : 'site-b-routing-secret';
    $request = $requests[0];
    $body = $request['args']['body'] ?? null;
    $signature = $request['args']['headers']['x-tio2-signature'] ?? null;
    if (
        $expected_url !== $request['url'] ||
        ! is_string($body) ||
        ! is_string($signature) ||
        hash_hmac('sha256', $body, $expected_secret) !== $signature
    ) {
        tio2_webhook_routing_fail("{$site_id} webhook URL or exact-body signature was incorrect");
    }

    $payload = json_decode($body, true);
    if (! is_array($payload) || [$site_id] !== ($payload['siteIds'] ?? null)) {
        tio2_webhook_routing_fail("{$site_id} webhook payload was not narrowed to its delivery site");
    }
}

function tio2_webhook_routing_page(string $site_id): int
{
    $post_id = wp_insert_post([
        'post_type' => 'page',
        'post_status' => 'draft',
        'post_title' => "TiO2 {$site_id} webhook routing fixture",
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_webhook_routing_fail("Could not create {$site_id} webhook page");
    }
    $GLOBALS['tio2_webhook_routing_post_ids'][] = (int) $post_id;
    update_post_meta((int) $post_id, 'public_path', "/webhook-routing/{$site_id}");
    wp_set_object_terms((int) $post_id, [$site_id], 'site_scope', false);
    wp_update_post(['ID' => (int) $post_id, 'post_status' => 'publish']);
    tio2_flush_webhook_queue();
    return (int) $post_id;
}

register_shutdown_function('tio2_webhook_routing_cleanup');

putenv('NEXTJS_REVALIDATION_URL_TIO2_A=https://site-a.next.test/api/revalidate');
putenv('NEXTJS_REVALIDATION_SECRET_TIO2_A=site-a-routing-secret');
putenv('NEXTJS_REVALIDATION_URL_TIO2_B=https://site-b.next.test/api/revalidate');
putenv('NEXTJS_REVALIDATION_SECRET_TIO2_B=site-b-routing-secret');

$captured_requests = [];
add_filter('pre_http_request', static function ($preempt, $args, $url) use (&$captured_requests) {
    $captured_requests[] = ['url' => $url, 'args' => $args];
    return [
        'headers' => [],
        'body' => '{"ok":true}',
        'response' => ['code' => 200, 'message' => 'OK'],
        'cookies' => [],
        'filename' => null,
    ];
}, 10, 3);

foreach (['tio2-a', 'tio2-b'] as $site_id) {
    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $page_id = tio2_webhook_routing_page($site_id);
    tio2_webhook_routing_assert_request($captured_requests, $site_id);

    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    wp_update_post(['ID' => $page_id, 'post_title' => "Updated {$site_id} webhook routing fixture"]);
    tio2_flush_webhook_queue();
    tio2_webhook_routing_assert_request($captured_requests, $site_id);
}

$optional_id = wp_insert_post([
    'post_type' => 'tio2_product',
    'post_status' => 'draft',
    'post_title' => 'TiO2 optional webhook routing fixture',
], true);
if (is_wp_error($optional_id) || $optional_id <= 0) {
    tio2_webhook_routing_fail('Could not create optional CPT webhook fixture');
}
$GLOBALS['tio2_webhook_routing_post_ids'][] = (int) $optional_id;

$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
wp_update_post(['ID' => (int) $optional_id, 'post_status' => 'publish']);
tio2_flush_webhook_queue();
if ([] !== $captured_requests) {
    tio2_webhook_routing_fail('Unscoped optional CPT implicitly broadcast to both sites');
}

wp_set_object_terms((int) $optional_id, ['tio2-a', 'tio2-b'], 'site_scope', false);
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
wp_update_post(['ID' => (int) $optional_id, 'post_title' => 'Updated explicit consumers']);
tio2_flush_webhook_queue();
if (2 !== count($captured_requests)) {
    tio2_webhook_routing_fail('Explicit two-consumer CPT did not produce two per-site deliveries');
}
$requests_by_url = [];
foreach ($captured_requests as $request) {
    $requests_by_url[$request['url']][] = $request;
}
tio2_webhook_routing_assert_request(
    $requests_by_url['https://site-a.next.test/api/revalidate'] ?? [],
    'tio2-a'
);
tio2_webhook_routing_assert_request(
    $requests_by_url['https://site-b.next.test/api/revalidate'] ?? [],
    'tio2-b'
);

tio2_webhook_routing_cleanup();
$GLOBALS['tio2_webhook_routing_post_ids'] = [];
fwrite(STDOUT, "TiO2 per-site webhook routing smoke test passed\n");
