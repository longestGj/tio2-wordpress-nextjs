<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_webhook_routing_post_ids'] = [];
$GLOBALS['tio2_webhook_routing_restore_meta'] = [];
$GLOBALS['tio2_webhook_routing_restore_statuses'] = [];
$GLOBALS['tio2_webhook_routing_restore_options'] = [];

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
        foreach ($meta as $key => $snapshot) {
            if ($snapshot['exists']) {
                update_post_meta((int) $post_id, (string) $key, $snapshot['value']);
            } else {
                delete_post_meta((int) $post_id, (string) $key);
            }
        }
    }
    $GLOBALS['tio2_webhook_queue'] = [];
    foreach ($GLOBALS['tio2_webhook_routing_post_ids'] ?? [] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
    foreach ($GLOBALS['tio2_webhook_routing_restore_statuses'] ?? [] as $post_id => $status) {
        tio2_webhook_routing_set_status_exact((int) $post_id, (string) $status);
    }
    foreach ($GLOBALS['tio2_webhook_routing_restore_options'] ?? [] as $option_name => $snapshot) {
        if ($snapshot['exists']) {
            update_option((string) $option_name, $snapshot['value']);
        } else {
            delete_option((string) $option_name);
        }
    }
    $GLOBALS['tio2_webhook_queue'] = [];
}

function tio2_webhook_routing_snapshot_option(string $option_name): void
{
    if (isset($GLOBALS['tio2_webhook_routing_restore_options'][$option_name])) {
        return;
    }
    $GLOBALS['tio2_webhook_routing_restore_options'][$option_name] = [
        'exists' => false !== get_option($option_name, false),
        'value' => get_option($option_name, false),
    ];
}

function tio2_webhook_routing_set_status_exact(int $post_id, string $status): void
{
    global $wpdb;

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_status' => $status],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    clean_post_cache($post_id);
    if (false === $updated || $status !== get_post_status($post_id)) {
        tio2_webhook_routing_fail("Could not set Homepage webhook fixture status {$status}");
    }
}

/**
 * @param mixed $value
 */
function tio2_webhook_routing_snapshot_meta(int $post_id, string $meta_key, $value): void
{
    if (isset($GLOBALS['tio2_webhook_routing_restore_meta'][$post_id][$meta_key])) {
        return;
    }
    $GLOBALS['tio2_webhook_routing_restore_meta'][$post_id][$meta_key] = [
        'exists' => metadata_exists('post', $post_id, $meta_key),
        'value' => $value,
    ];
}

/**
 * @param list<array{url: string, args: array<string, mixed>}> $requests
 */
function tio2_webhook_routing_assert_request(array $requests, string $site_id): void
{
    if (1 !== count($requests)) {
        tio2_webhook_routing_fail(
            "Expected one {$site_id} webhook request during " . ($GLOBALS['tio2_webhook_routing_context'] ?? 'an unknown assertion') . ', received ' . count($requests)
        );
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

/**
 * @param list<array<string, mixed>> $definitions
 * @return list<string>
 */
function tio2_webhook_routing_product_meta_keys(array $definitions): array
{
    $meta_keys = [];
    foreach ($definitions as $definition) {
        $field_name = (string) ($definition['name'] ?? '');
        if ('' === $field_name) {
            continue;
        }
        $meta_keys[] = $field_name;
        foreach ($definition['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field) || '' === ($sub_field['name'] ?? '')) {
                continue;
            }
            $prefix = 'repeater' === ($definition['type'] ?? '')
                ? $field_name . '_0_'
                : $field_name . '_';
            $meta_keys[] = $prefix . $sub_field['name'];
        }
    }

    return array_values(array_unique($meta_keys));
}

function tio2_webhook_routing_product(string $site_id, string $product_id): int
{
    $post_id = wp_insert_post([
        'post_type' => 'tio2_product',
        'post_status' => 'draft',
        'post_title' => "TiO2 {$site_id} Product webhook routing fixture",
        'post_name' => tio2_product_slug_from_id($product_id),
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_webhook_routing_fail("Could not create {$site_id} Product webhook fixture");
    }

    $GLOBALS['tio2_webhook_routing_post_ids'][] = (int) $post_id;
    update_post_meta((int) $post_id, 'product_id', $product_id);
    wp_set_object_terms((int) $post_id, [$site_id], 'site_scope', false);
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
    $GLOBALS['tio2_webhook_routing_context'] = "initial {$site_id} Page publish";
    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $page_id = tio2_webhook_routing_page($site_id);
    tio2_webhook_routing_assert_request($captured_requests, $site_id);

    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $GLOBALS['tio2_webhook_routing_context'] = "updated {$site_id} Page title";
    tio2_webhook_routing_update_legacy_title(
        $page_id,
        "Updated {$site_id} webhook routing fixture"
    );
    tio2_flush_webhook_queue();
    tio2_webhook_routing_assert_request($captured_requests, $site_id);
}

foreach (tio2_webhook_routing_product_meta_keys(tio2_product_field_definitions()) as $meta_key) {
    foreach ([$meta_key, '_' . $meta_key] as $acf_meta_key) {
        if (! tio2_is_relevant_webhook_meta_key($acf_meta_key)) {
            tio2_webhook_routing_fail("Product field {$acf_meta_key} was not relevant to revalidation");
        }
    }
}
foreach (tio2_webhook_routing_product_meta_keys(tio2_product_shared_field_definitions()) as $meta_key) {
    foreach ([$meta_key, '_' . $meta_key, 'options_' . $meta_key, '_options_' . $meta_key] as $acf_meta_key) {
        if (! tio2_is_relevant_webhook_meta_key($acf_meta_key)) {
            tio2_webhook_routing_fail("Shared Product setting {$acf_meta_key} was not relevant to revalidation");
        }
    }
}

$product_meta_isolation_page_id = tio2_webhook_routing_page('tio2-a');
if (tio2_is_relevant_webhook_meta_key('product_id', $product_meta_isolation_page_id)) {
    tio2_webhook_routing_fail('Product-only meta became relevant to an existing Page webhook');
}

$site_a_product_id = tio2_webhook_routing_product('tio2-a', 'TP-W123');
$site_a_product_state = tio2_get_webhook_affected_state($site_a_product_id);
if (
    ! is_array($site_a_product_state) ||
    [$site_a_product_id] !== ($site_a_product_state['entityIds'] ?? null) ||
    ['/products/tp-w123'] !== ($site_a_product_state['paths'] ?? null) ||
    ['/products/tp-w123'] !== ($site_a_product_state['sitePaths']['tio2-a'] ?? null)
) {
    tio2_webhook_routing_fail('Site A Product webhook state did not contain its canonical route and entity ID');
}
$site_a_product_payload = tio2_build_webhook_payload(
    $site_a_product_id,
    '2026-08-26T00:00:00+00:00',
    $site_a_product_state
);
if (
    ! is_array($site_a_product_payload) ||
    ['/products/tp-w123'] !== ($site_a_product_payload['paths'] ?? null) ||
    [$site_a_product_id] !== ($site_a_product_payload['entityIds'] ?? null)
) {
    tio2_webhook_routing_fail('Site A Product webhook payload did not retain its canonical route and entity ID');
}

$site_b_product_id = tio2_webhook_routing_product('tio2-b', 'TP-W124');
if (null !== tio2_get_webhook_affected_state($site_b_product_id)) {
    tio2_webhook_routing_fail('Site B Product generated a Site A revalidation webhook state');
}

$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta($site_a_product_id, 'quick_answer', 'Draft Product webhook suppression fixture.');
tio2_flush_webhook_queue();
if ([] !== $captured_requests) {
    tio2_webhook_routing_fail('Draft Product meta edit emitted a public revalidation request');
}

tio2_webhook_routing_set_status_exact($site_a_product_id, 'publish');
foreach (['technical_disclaimer', '_technical_disclaimer'] as $unrelated_option_name) {
    tio2_webhook_routing_snapshot_option($unrelated_option_name);
    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $GLOBALS['tio2_webhook_routing_context'] = "unrelated option collision {$unrelated_option_name}";
    update_option($unrelated_option_name, 'Unrelated option mutation ' . microtime(true));
    tio2_flush_webhook_queue();
    if ([] !== $captured_requests) {
        tio2_webhook_routing_fail("Unrelated option {$unrelated_option_name} emitted a Product revalidation request");
    }
}
foreach ([
    'options_inquiry_fields_0_guidance',
    'options_request_tds_cta_description',
    'options_discuss_application_cta_description',
    'options_technical_disclaimer',
] as $option_name) {
    tio2_webhook_routing_snapshot_option($option_name);
    if (false === get_option($option_name, false)) {
        add_option($option_name, 'Shared Product setting baseline.');
        $GLOBALS['tio2_webhook_queue'] = [];
    }
    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $GLOBALS['tio2_webhook_routing_context'] = "shared Product setting {$option_name}";
    update_option($option_name, 'Shared Product setting mutation ' . microtime(true));
    tio2_flush_webhook_queue();
    tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');
    $payload = json_decode((string) ($captured_requests[0]['args']['body'] ?? ''), true);
    if (
        ! is_array($payload) ||
        ! in_array('/products/tp-w123', $payload['paths'] ?? [], true) ||
        ! in_array($site_a_product_id, $payload['entityIds'] ?? [], true) ||
        false !== array_search('https://site-b.next.test/api/revalidate', array_column($captured_requests, 'url'), true)
    ) {
        tio2_webhook_routing_fail("Shared Product setting {$option_name} did not invalidate Site A Product caches only");
    }
}

$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
$GLOBALS['tio2_webhook_routing_context'] = 'batched shared Product settings save';
foreach ([
    'options_inquiry_fields_0_guidance',
    'options_request_tds_cta_description',
    'options_discuss_application_cta_description',
    'options_technical_disclaimer',
] as $index => $option_name) {
    update_option($option_name, "Batched shared Product setting {$index} " . microtime(true));
}
tio2_flush_webhook_queue();
tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');

$added_deleted_option = 'options_technical_disclaimer';
tio2_webhook_routing_snapshot_option($added_deleted_option);
delete_option($added_deleted_option);
$GLOBALS['tio2_webhook_queue'] = [];
$captured_requests = [];
add_option($added_deleted_option, 'Added shared Product disclaimer.');
tio2_flush_webhook_queue();
$GLOBALS['tio2_webhook_routing_context'] = 'added shared Product setting';
tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');

$GLOBALS['tio2_webhook_queue'] = [];
$captured_requests = [];
delete_option($added_deleted_option);
tio2_flush_webhook_queue();
$GLOBALS['tio2_webhook_routing_context'] = 'deleted shared Product setting';
tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');

foreach (['page', 'post', 'tio2_homepage'] as $post_type) {
    if (! in_array($post_type, tio2_webhook_post_types(), true)) {
        tio2_webhook_routing_fail("Existing {$post_type} webhook routing support regressed");
    }
}
if (1 !== count(array_keys(tio2_webhook_post_types(), 'tio2_product', true))) {
    tio2_webhook_routing_fail('Product webhook routing registered the Product post type more than once');
}

$bounded_page_id = tio2_webhook_routing_page('tio2-a');
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
$normalized_affected = [
    'contentId' => $bounded_page_id,
    'siteIds' => ['tio2-a'],
    'paths' => ['/products/', '/products', '/applications/'],
    'entityIds' => [],
    'sitePaths' => [
        'tio2-a' => ['/products/', '/products', '/applications/'],
    ],
];
$normalized_payload = tio2_build_webhook_payload(
    $bounded_page_id,
    '2026-08-24T00:00:00+00:00',
    $normalized_affected
);
if (
    ! is_array($normalized_payload) ||
    ['/applications', '/products'] !== ($normalized_payload['paths'] ?? null)
) {
    tio2_webhook_routing_fail('Webhook payload did not normalize and deduplicate exact paths');
}

$bounded_paths = array_map(
    static fn (int $index): string => "/batch/path-{$index}",
    range(0, 255)
);
$bounded_affected = [
    'contentId' => $bounded_page_id,
    'siteIds' => ['tio2-a'],
    'paths' => $bounded_paths,
    'entityIds' => [],
    'sitePaths' => ['tio2-a' => $bounded_paths],
];
$bounded_payload = tio2_build_webhook_payload(
    $bounded_page_id,
    '2026-08-24T00:00:00+00:00',
    $bounded_affected
);
if (! is_array($bounded_payload) || 256 !== count($bounded_payload['paths'] ?? [])) {
    tio2_webhook_routing_fail('Webhook payload rejected 256 normalized unique paths');
}

$overflow_paths = array_merge($bounded_paths, ['/batch/path-256']);
$overflow_affected = [
    'contentId' => $bounded_page_id,
    'siteIds' => ['tio2-a'],
    'paths' => $overflow_paths,
    'entityIds' => [],
    'sitePaths' => ['tio2-a' => $overflow_paths],
];
if (
    null !== tio2_build_webhook_payload(
        $bounded_page_id,
        '2026-08-24T00:00:00+00:00',
        $overflow_affected
    ) ||
    tio2_send_webhook($bounded_page_id, $overflow_affected) ||
    [] !== $captured_requests
) {
    tio2_webhook_routing_fail('Webhook delivered more than 256 normalized unique paths');
}

$malformed_affected = $bounded_affected;
foreach (['https://other-site.test/products', '/Products', '/bad path', '/double--hyphen'] as $malformed_path) {
    $malformed_affected['paths'] = ['/products', $malformed_path];
    $malformed_affected['sitePaths'] = ['tio2-a' => $malformed_affected['paths']];
    if (null !== tio2_build_webhook_payload($bounded_page_id, null, $malformed_affected)) {
        tio2_webhook_routing_fail("Webhook payload retained malformed path {$malformed_path}");
    }
}

$mixed_site_affected = $bounded_affected;
$mixed_site_affected['siteIds'] = ['tio2-a', 'tio2-b'];
if (null !== tio2_build_webhook_payload($bounded_page_id, null, $mixed_site_affected)) {
    tio2_webhook_routing_fail('Webhook payload accepted an ambiguous mixed-site batch');
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

$shared_entity_type = get_post_type_object('tio2_grade');
if (
    ! $shared_entity_type instanceof WP_Post_Type ||
    ! $shared_entity_type->public ||
    ! $shared_entity_type->publicly_queryable ||
    ! in_array('tio2_grade', tio2_webhook_post_types(), true)
) {
    tio2_webhook_routing_fail('Grade is not a legitimate publishable shared webhook entity');
}

$optional_id = wp_insert_post([
    'post_type' => 'tio2_grade',
    'post_status' => 'draft',
    'post_title' => 'TiO2 grade webhook routing fixture',
], true);
if (is_wp_error($optional_id) || $optional_id <= 0) {
    tio2_webhook_routing_fail('Could not create Grade webhook fixture');
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
$homepage_status = (string) get_post_status($homepage_id);
$GLOBALS['tio2_webhook_routing_restore_statuses'][$homepage_id] = $homepage_status;
tio2_webhook_routing_snapshot_meta(
    $homepage_id,
    'homepage_schema_version',
    get_post_meta($homepage_id, 'homepage_schema_version', true)
);
update_post_meta($homepage_id, 'homepage_schema_version', 'homepage-v0.2-editorial-geo');
tio2_webhook_routing_set_status_exact($homepage_id, 'publish');
foreach ([
    'direct_answer_body',
    '_direct_answer_body',
    'decision_questions_0_decision_answer',
    '_supply_routes_0_route_name',
    'evidence_items_0_verification_status',
    '_geo_faqs_0_faq_answer',
] as $meta_key) {
    if (! tio2_is_relevant_webhook_meta_key($meta_key, $homepage_id)) {
        tio2_webhook_routing_fail("v0.2 nested Homepage meta {$meta_key} was not relevant to revalidation");
    }
}
$site_b_homepage_ids = tio2_find_homepage_ids('tio2-b');
if (1 !== count($site_b_homepage_ids)) {
    tio2_webhook_routing_fail('Expected one frozen Site B homepage webhook source');
}
$site_b_homepage_id = (int) $site_b_homepage_ids[0];
$site_b_homepage_status = (string) get_post_status($site_b_homepage_id);
$GLOBALS['tio2_webhook_routing_restore_statuses'][$site_b_homepage_id] = $site_b_homepage_status;
tio2_webhook_routing_set_status_exact($site_b_homepage_id, 'publish');
foreach (['direct_answer_body', '_direct_answer_body', '__direct_answer_body'] as $meta_key) {
    if (tio2_is_relevant_webhook_meta_key($meta_key, $site_b_homepage_id)) {
        tio2_webhook_routing_fail("Frozen Site B v0.1 meta {$meta_key} was relevant to revalidation");
    }
}
if (tio2_is_relevant_webhook_meta_key('__direct_answer_body', $homepage_id)) {
    tio2_webhook_routing_fail('A double-underscore Site A meta key was accepted as an ACF reference');
}
tio2_webhook_routing_snapshot_meta(
    $site_b_homepage_id,
    'direct_answer_body',
    get_post_meta($site_b_homepage_id, 'direct_answer_body', true)
);
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta($site_b_homepage_id, 'direct_answer_body', 'Frozen Site B webhook regression fixture.');
tio2_flush_webhook_queue();
if ([] !== $captured_requests) {
    tio2_webhook_routing_fail('Frozen Site B v0.1 editorial meta queued a revalidation request');
}
update_post_meta(
    $site_b_homepage_id,
    'direct_answer_body',
    $GLOBALS['tio2_webhook_routing_restore_meta'][$site_b_homepage_id]['direct_answer_body']['value']
);
$GLOBALS['tio2_webhook_queue'] = [];
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
tio2_webhook_routing_snapshot_meta($homepage_id, 'hero_heading', $homepage_heading);
$captured_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta($homepage_id, 'hero_heading', $homepage_heading . ' webhook smoke');
tio2_flush_webhook_queue();
$GLOBALS['tio2_webhook_routing_context'] = 'legacy Site A Homepage heading';
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
$GLOBALS['tio2_webhook_queue'] = [];
tio2_webhook_routing_set_status_exact($homepage_id, 'publish');

$v02_mutations = [
    'direct_answer_body' => 'Synthetic editorial direct answer webhook mutation.',
    'supply_routes' => [[
        'route_name' => 'Webhook route',
        'route_meaning' => 'Synthetic route update.',
        'buyer_verification' => 'Confirm ownership.',
        'documentation_context' => 'Review scope.',
        'claim_basis' => 'synthetic_demo',
        'evidence_url' => '',
    ]],
    'evidence_items' => [[
        'document_type' => 'Webhook evidence',
        'document_title' => 'Synthetic evidence update',
        'document_summary' => 'A webhook routing fixture.',
        'applicability' => 'Local test only',
        'revision_label' => 'demo',
        'evidence_url' => '',
        'verification_status' => 'demo',
    ]],
    'geo_faqs' => [[
        'faq_question' => 'Does this refresh only Site A?',
        'faq_answer' => 'Yes. The fixture asserts Site A root delivery only.',
    ]],
    'editorial_reviewed_at' => '2026-08-26T00:00:00.000Z',
];
foreach ($v02_mutations as $meta_key => $value) {
    tio2_webhook_routing_snapshot_meta(
        $homepage_id,
        $meta_key,
        get_post_meta($homepage_id, $meta_key, true)
    );
    $captured_requests = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    $GLOBALS['tio2_webhook_routing_context'] = "v0.2 {$meta_key} Homepage mutation";
    tio2_webhook_routing_set_status_exact($homepage_id, 'publish');
    update_post_meta($homepage_id, $meta_key, $value);
    tio2_flush_webhook_queue();
    tio2_webhook_routing_assert_request($captured_requests, 'tio2-a');
    $payload = json_decode((string) ($captured_requests[0]['args']['body'] ?? ''), true);
    if (
        ! is_array($payload) ||
        ['tio2-a'] !== ($payload['siteIds'] ?? null) ||
        ['/'] !== ($payload['paths'] ?? null) ||
        false !== array_search('https://site-b.next.test/api/revalidate', array_column($captured_requests, 'url'), true)
    ) {
        tio2_webhook_routing_fail("v0.2 Homepage meta {$meta_key} crossed Site A ownership");
    }
    update_post_meta($homepage_id, $meta_key, $GLOBALS['tio2_webhook_routing_restore_meta'][$homepage_id][$meta_key]['value']);
}

tio2_webhook_routing_cleanup();
$GLOBALS['tio2_webhook_routing_post_ids'] = [];
$GLOBALS['tio2_webhook_routing_restore_meta'] = [];
$GLOBALS['tio2_webhook_routing_restore_statuses'] = [];
fwrite(STDOUT, "TiO2 per-site webhook routing smoke test passed\n");
