<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_webhook_routing_post_ids'] = [];
$GLOBALS['tio2_webhook_routing_restore_meta'] = [];

function tio2_webhook_routing_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }
    throw new RuntimeException($message);
}

function tio2_webhook_routing_cleanup(): void
{
    foreach ($GLOBALS['tio2_webhook_routing_restore_meta'] ?? [] as $post_id => $meta) {
        update_post_meta((int) $post_id, (string) $meta['key'], (string) $meta['value']);
    }
    $GLOBALS['tio2_webhook_queue'] = [];
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

function tio2_webhook_routing_publish_legacy_page(int $post_id, string $site_id): void
{
    global $wpdb;

    $post = get_post($post_id);
    $path = (string) get_post_meta($post_id, 'public_path', true);
    if (
        ! $post instanceof WP_Post ||
        'page' !== $post->post_type ||
        'draft' !== $post->post_status ||
        ! in_array($post_id, $GLOBALS['tio2_webhook_routing_post_ids'], true) ||
        "/webhook-routing/{$site_id}" !== $path ||
        tio2_publication_route_is_approved($site_id, $path)
    ) {
        tio2_webhook_routing_fail('Legacy webhook fixture escaped its bounded draft/site/path contract');
    }

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_status' => 'publish'],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    clean_post_cache($post_id);
    $published = get_post($post_id);
    if (1 !== $updated || ! $published instanceof WP_Post || 'publish' !== $published->post_status) {
        tio2_webhook_routing_fail('Could not create bounded legacy published webhook fixture');
    }
    do_action('transition_post_status', 'publish', 'draft', $published);
}

function tio2_webhook_routing_update_legacy_title(int $post_id, string $post_title): void
{
    global $wpdb;

    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        'page' !== $post->post_type ||
        'publish' !== $post->post_status ||
        ! in_array($post_id, $GLOBALS['tio2_webhook_routing_post_ids'], true) ||
        1 !== preg_match('~^/webhook-routing/tio2-(?:a|b)$~', (string) get_post_meta($post_id, 'public_path', true))
    ) {
        tio2_webhook_routing_fail('Legacy webhook title update escaped its bounded fixture contract');
    }

    $updated = $wpdb->update(
        $wpdb->posts,
        [
            'post_title' => $post_title,
            'post_modified' => current_time('mysql'),
            'post_modified_gmt' => current_time('mysql', true),
        ],
        ['ID' => $post_id],
        ['%s', '%s', '%s'],
        ['%d']
    );
    clean_post_cache($post_id);
    $updated_post = get_post($post_id);
    if (1 !== $updated || ! $updated_post instanceof WP_Post || $post_title !== $updated_post->post_title) {
        tio2_webhook_routing_fail('Could not update bounded legacy webhook fixture title');
    }
    do_action('transition_post_status', 'publish', 'publish', $updated_post);
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
    tio2_webhook_routing_publish_legacy_page((int) $post_id, $site_id);
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
    tio2_webhook_routing_update_legacy_title(
        $page_id,
        "Updated {$site_id} webhook routing fixture"
    );
    tio2_flush_webhook_queue();
    tio2_webhook_routing_assert_request($captured_requests, $site_id);
}

$paired_page_id = tio2_webhook_routing_page('tio2-a');
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta((int) $paired_page_id, 'public_path', '/webhook-routing/tio2-b-new');
wp_set_object_terms((int) $paired_page_id, ['tio2-b'], 'site_scope', false);
tio2_flush_webhook_queue();
$paired_payloads = [];
foreach ($captured_requests as $request) {
    $payload = json_decode((string) ($request['args']['body'] ?? ''), true);
    if (is_array($payload) && 1 === count($payload['siteIds'] ?? [])) {
        $paired_payloads[$payload['siteIds'][0]] = $payload['paths'] ?? null;
    }
}
if (
    [
        'tio2-a' => ['/webhook-routing/tio2-a'],
        'tio2-b' => ['/webhook-routing/tio2-b-new'],
    ] !== $paired_payloads
) {
    tio2_webhook_routing_fail('Webhook queue lost the exact site/path pairing across an ownership move');
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

$homepage_ids = tio2_find_homepage_ids('tio2-a');
if (1 !== count($homepage_ids)) {
    tio2_webhook_routing_fail('Expected one Site A homepage webhook source');
}
$homepage_id = (int) $homepage_ids[0];
$homepage_old_state = tio2_get_webhook_affected_state($homepage_id, [
    'siteIds' => ['tio2-a'],
    'hasTerms' => true,
]);
$homepage_new_state = tio2_get_webhook_affected_state($homepage_id, [
    'siteIds' => ['tio2-b'],
    'hasTerms' => true,
]);
if (! is_array($homepage_old_state)) {
    tio2_webhook_routing_fail('Could not capture old homepage webhook ownership');
}
$homepage_moved_state = tio2_merge_webhook_affected_state(
    $homepage_old_state,
    $homepage_new_state
);
if (
    ['tio2-a', 'tio2-b'] !== $homepage_moved_state['siteIds'] ||
    ['/'] !== ($homepage_moved_state['sitePaths']['tio2-a'] ?? null) ||
    ['/'] !== ($homepage_moved_state['sitePaths']['tio2-b'] ?? null)
) {
    tio2_webhook_routing_fail('Homepage webhook did not retain old and new ownership snapshots');
}
$homepage_heading = (string) get_post_meta($homepage_id, 'hero_heading', true);
$GLOBALS['tio2_webhook_routing_restore_meta'][$homepage_id] = [
    'key' => 'hero_heading',
    'value' => $homepage_heading,
];
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta($homepage_id, 'hero_heading', $homepage_heading . ' webhook smoke');
tio2_flush_webhook_queue();
tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');
$homepage_payload = json_decode((string) ($captured_requests[0]['args']['body'] ?? ''), true);
if (
    ! is_array($homepage_payload) ||
    ['/'] !== ($homepage_payload['paths'] ?? null) ||
    [] !== ($homepage_payload['entityIds'] ?? null) ||
    false !== array_search('https://site-b.next.test/api/revalidate', array_column($captured_requests, 'url'), true)
) {
    tio2_webhook_routing_fail('Homepage webhook did not target only the owning Site A root');
}
update_post_meta($homepage_id, 'hero_heading', $homepage_heading);
unset($GLOBALS['tio2_webhook_routing_restore_meta'][$homepage_id]);
$GLOBALS['tio2_webhook_queue'] = [];

tio2_webhook_routing_cleanup();
$GLOBALS['tio2_webhook_routing_post_ids'] = [];
$GLOBALS['tio2_webhook_routing_restore_meta'] = [];
fwrite(STDOUT, "TiO2 per-site webhook routing smoke test passed\n");
