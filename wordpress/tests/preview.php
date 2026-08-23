<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_preview_smoke_post_ids'] = [];
$GLOBALS['tio2_preview_smoke_restore_statuses'] = [];

function tio2_preview_smoke_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }
    throw new RuntimeException($message);
}

function tio2_preview_smoke_cleanup(): void
{
    foreach ($GLOBALS['tio2_preview_smoke_restore_statuses'] ?? [] as $post_id => $status) {
        wp_update_post(['ID' => (int) $post_id, 'post_status' => (string) $status]);
    }
    $GLOBALS['tio2_webhook_queue'] = [];
    foreach ($GLOBALS['tio2_preview_smoke_post_ids'] ?? [] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
}

register_shutdown_function('tio2_preview_smoke_cleanup');

putenv('NEXTJS_PREVIEW_URL_TIO2_A=http://127.0.0.1:3001/api/preview');
putenv('NEXTJS_PREVIEW_SECRET_TIO2_A=site-a-preview-smoke-secret');
putenv('NEXTJS_PREVIEW_URL_TIO2_B=http://127.0.0.1:3002/api/preview');
putenv('NEXTJS_PREVIEW_SECRET_TIO2_B=site-b-preview-smoke-secret');

foreach (['tio2_get_preview_config', 'tio2_preview_rest_permission', 'tio2_preview_rest_response', 'tio2_filter_preview_post_link'] as $function) {
    if (! function_exists($function)) {
        tio2_preview_smoke_fail("Missing preview function: {$function}");
    }
}

$draft_id = wp_insert_post([
    'post_type' => 'page',
    'post_status' => 'draft',
    'post_title' => 'TiO2 unpublished preview smoke title',
    'post_content' => '<p>TiO2 unpublished preview smoke body.</p>',
], true);
if (is_wp_error($draft_id) || $draft_id <= 0) {
    tio2_preview_smoke_fail('Could not create preview smoke draft');
}
$GLOBALS['tio2_preview_smoke_post_ids'][] = (int) $draft_id;
update_post_meta((int) $draft_id, 'public_path', '/preview-smoke/draft');
update_post_meta((int) $draft_id, 'seo_title', 'Preview smoke SEO');
update_post_meta((int) $draft_id, 'seo_description', 'Preview smoke description');
wp_set_object_terms((int) $draft_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', (int) $draft_id);

if ('tio2-a--preview-smoke--draft' !== get_post_field('post_name', (int) $draft_id)) {
    tio2_preview_smoke_fail('Preview draft did not receive its deterministic slug');
}

do_action('rest_api_init');
$timestamp = (string) time();
$path = '/preview-smoke/draft';
$signature = hash_hmac(
    'sha256',
    $timestamp . "\n" . 'tio2-a' . "\n" . $path,
    'site-a-preview-smoke-secret'
);
$request = new WP_REST_Request('GET', '/tio2/v1/preview');
$request->set_query_params(['siteId' => 'tio2-a', 'path' => $path]);
$request->set_header('x-tio2-preview-timestamp', $timestamp);
$request->set_header('x-tio2-preview-signature', $signature);
$response = rest_do_request($request);
$data = $response->get_data();
if (
    200 !== $response->get_status() ||
    ! is_array($data) ||
    'tio2-a' !== ($data['siteId'] ?? null) ||
    $path !== ($data['path'] ?? null) ||
    'draft' !== ($data['status'] ?? null) ||
    ! str_contains((string) ($data['html'] ?? ''), 'unpublished preview smoke body') ||
    'Preview smoke SEO' !== ($data['seo']['title'] ?? null)
) {
    tio2_preview_smoke_fail('Signed WordPress preview endpoint did not return the exact draft');
}

$ambiguous_id = wp_insert_post([
    'post_type' => 'post',
    'post_status' => 'draft',
    'post_title' => 'Ambiguous legacy preview route',
    'post_name' => 'legacy-ambiguous-preview-route',
], true);
if (is_wp_error($ambiguous_id) || $ambiguous_id <= 0) {
    tio2_preview_smoke_fail('Could not create ambiguous preview fixture');
}
$GLOBALS['tio2_preview_smoke_post_ids'][] = (int) $ambiguous_id;
update_post_meta((int) $ambiguous_id, 'public_path', $path);
wp_set_object_terms((int) $ambiguous_id, ['tio2-a'], 'site_scope', false);
$ambiguous_response = rest_do_request($request);
if (404 !== $ambiguous_response->get_status()) {
    tio2_preview_smoke_fail('WordPress preview lookup did not fail closed on ambiguous route ownership');
}
wp_delete_post((int) $ambiguous_id, true);
$GLOBALS['tio2_preview_smoke_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_preview_smoke_post_ids'],
    [(int) $ambiguous_id]
));

$bad_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$bad_request->set_query_params(['siteId' => 'tio2-a', 'path' => $path]);
$bad_request->set_header('x-tio2-preview-timestamp', $timestamp);
$bad_request->set_header('x-tio2-preview-signature', str_repeat('0', 64));
$bad_response = rest_do_request($bad_request);
if (401 !== $bad_response->get_status()) {
    tio2_preview_smoke_fail('WordPress preview endpoint accepted an invalid signature');
}

$preview_link = apply_filters(
    'preview_post_link',
    'http://localhost:8080/?page_id=' . (int) $draft_id . '&preview=true',
    get_post((int) $draft_id)
);
$preview_parts = wp_parse_url($preview_link);
parse_str($preview_parts['query'] ?? '', $preview_query);
if (
    '127.0.0.1' !== ($preview_parts['host'] ?? null) ||
    3001 !== ($preview_parts['port'] ?? null) ||
    '/api/preview' !== ($preview_parts['path'] ?? null) ||
    isset($preview_query['secret']) ||
    'tio2-a' !== ($preview_query['siteId'] ?? null) ||
    $path !== ($preview_query['path'] ?? null) ||
    empty($preview_query['expires']) ||
    empty($preview_query['signature'])
) {
    tio2_preview_smoke_fail('WordPress Admin preview link did not use the signed Site A target contract');
}
$expected_link_signature = hash_hmac(
    'sha256',
    $preview_query['expires'] . "\n" . 'tio2-a' . "\n" . $path,
    'site-a-preview-smoke-secret'
);
if (! hash_equals($expected_link_signature, $preview_query['signature'])) {
    tio2_preview_smoke_fail('WordPress Admin preview link signature was invalid');
}

$homepage_ids = tio2_find_homepage_ids('tio2-a');
if (1 !== count($homepage_ids)) {
    tio2_preview_smoke_fail('Expected one Site A homepage preview source');
}
$homepage_id = (int) $homepage_ids[0];
$homepage_status = (string) get_post_status($homepage_id);
$GLOBALS['tio2_preview_smoke_restore_statuses'][$homepage_id] = $homepage_status;
wp_update_post(['ID' => $homepage_id, 'post_status' => 'draft']);

$homepage_path = '/';
$homepage_timestamp = (string) time();
$homepage_signature = hash_hmac(
    'sha256',
    $homepage_timestamp . "\n" . 'tio2-a' . "\n" . $homepage_path,
    'site-a-preview-smoke-secret'
);
$homepage_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$homepage_request->set_query_params(['siteId' => 'tio2-a', 'path' => $homepage_path]);
$homepage_request->set_header('x-tio2-preview-timestamp', $homepage_timestamp);
$homepage_request->set_header('x-tio2-preview-signature', $homepage_signature);
$homepage_response = rest_do_request($homepage_request);
$homepage_data = $homepage_response->get_data();
if (
    200 !== $homepage_response->get_status() ||
    ! is_array($homepage_data) ||
    'tio2-a' !== ($homepage_data['siteId'] ?? null) ||
    '/' !== ($homepage_data['path'] ?? null) ||
    'homepage-v0.1' !== ($homepage_data['schemaVersion'] ?? null) ||
    'draft' !== ($homepage_data['status'] ?? null) ||
    (string) get_post_meta($homepage_id, 'hero_heading', true) !==
        ($homepage_data['homepageFields']['heroHeading'] ?? null)
) {
    tio2_preview_smoke_fail('Signed homepage preview did not return the structured Site A draft');
}

$homepage_preview_link = apply_filters(
    'preview_post_link',
    'http://localhost:8080/?post_type=tio2_homepage&p=' . $homepage_id . '&preview=true',
    get_post($homepage_id)
);
$homepage_preview_parts = wp_parse_url($homepage_preview_link);
parse_str($homepage_preview_parts['query'] ?? '', $homepage_preview_query);
if (
    'tio2-a' !== ($homepage_preview_query['siteId'] ?? null) ||
    '/' !== ($homepage_preview_query['path'] ?? null)
) {
    tio2_preview_smoke_fail('Homepage Admin preview link did not retain root ownership');
}

wp_update_post(['ID' => $homepage_id, 'post_status' => $homepage_status]);
unset($GLOBALS['tio2_preview_smoke_restore_statuses'][$homepage_id]);
$GLOBALS['tio2_webhook_queue'] = [];

wp_trash_post((int) $draft_id);
$trashed_response = rest_do_request($request);
if (404 !== $trashed_response->get_status()) {
    tio2_preview_smoke_fail('WordPress preview endpoint exposed trashed content');
}

tio2_preview_smoke_cleanup();
$GLOBALS['tio2_preview_smoke_post_ids'] = [];
$GLOBALS['tio2_preview_smoke_restore_statuses'] = [];
fwrite(STDOUT, "TiO2 signed draft preview smoke test passed\n");
