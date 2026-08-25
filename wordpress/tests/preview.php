<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_preview_smoke_post_ids'] = [];
$GLOBALS['tio2_preview_smoke_restore_statuses'] = [];
$GLOBALS['tio2_preview_smoke_restore_homepage_owners'] = [];

function tio2_preview_smoke_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }
    throw new RuntimeException($message);
}

function tio2_preview_smoke_set_status_exact(int $post_id, string $status): void
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
        tio2_preview_smoke_fail("Could not set exact preview fixture status {$status}");
    }
}

function tio2_preview_smoke_cleanup(): void
{
    $GLOBALS['tio2_webhook_queue'] = [];
    foreach ($GLOBALS['tio2_preview_smoke_post_ids'] ?? [] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
    foreach ($GLOBALS['tio2_preview_smoke_restore_homepage_owners'] ?? [] as $post_id => $owner) {
        wp_set_object_terms((int) $post_id, $owner['siteIds'], 'site_scope', false);
        wp_update_post([
            'ID' => (int) $post_id,
            'post_name' => $owner['slug'],
            'post_status' => $owner['status'],
        ]);
    }
    foreach ($GLOBALS['tio2_preview_smoke_restore_statuses'] ?? [] as $post_id => $status) {
        wp_update_post(['ID' => (int) $post_id, 'post_status' => (string) $status]);
    }
}

/**
 * @param mixed $value
 */
function tio2_preview_smoke_update_field(string $field_key, $value, int $post_id): void
{
    $field = acf_get_field($field_key);
    if (! is_array($field)) {
        tio2_preview_smoke_fail("Could not resolve ACF field {$field_key}");
    }
    if (in_array($field['type'] ?? '', ['group', 'repeater'], true) && is_array($value)) {
        $normalize_row = static function (array $row) use ($field): array {
            $normalized = [];
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                $sub_key = $sub_field['key'] ?? '';
                $sub_name = $sub_field['name'] ?? '';
                if (array_key_exists($sub_key, $row)) {
                    $normalized[$sub_name] = $row[$sub_key];
                } elseif (array_key_exists($sub_name, $row)) {
                    $normalized[$sub_name] = $row[$sub_name];
                }
            }
            return $normalized;
        };
        $value = 'group' === ($field['type'] ?? '')
            ? $normalize_row($value)
            : array_map($normalize_row, array_values($value));
    }
    update_field($field_key, $value, $post_id);
    if (function_exists('acf_flush_value_cache')) {
        acf_flush_value_cache($post_id, (string) ($field['name'] ?? ''));
    }
}

function tio2_preview_smoke_set_v02_homepage_fields(int $post_id): void
{
    $fields = [
        'field_tio2_home_schema_version' => 'homepage-v0.2-editorial-geo',
        'field_tio2_home_hero_eyebrow' => 'Titanium dioxide sourcing context',
        'field_tio2_home_hero_heading' => 'Evaluate a titanium dioxide supply route',
        'field_tio2_home_hero_summary' => 'A synthetic local editorial fixture for Preview contract testing.',
        'field_tio2_home_hero_image' => 0,
        'field_tio2_home_hero_image_alt' => '',
        'field_tio2_home_closing_heading' => 'Clarify the sourcing context',
        'field_tio2_home_closing_body' => 'Prepare the application context and evidence questions for a separately authorized follow-up.',
        'field_tio2_home_closing_label' => 'Prepare an inquiry',
        'field_tio2_home_seo_title' => 'Titanium dioxide sourcing evaluation',
        'field_tio2_home_seo_description' => 'Review a synthetic editorial framework for evaluating titanium dioxide supply routes.',
        'field_tio2_home_og_image' => 0,
        'field_tio2_home_primary_topic' => 'titanium dioxide sourcing evaluation',
        'field_tio2_home_secondary_topics' => [['secondary_topic' => 'supply route comparison']],
        'field_tio2_geo_header_rfq_label' => 'Prepare an inquiry',
        'field_tio2_geo_direct_answer_question' => 'What should a buyer clarify before sourcing titanium dioxide?',
        'field_tio2_geo_direct_answer_lead' => 'Start with application context, evidence boundaries, and supply-route ownership.',
        'field_tio2_geo_direct_answer_body' => 'This synthetic demo organizes questions for local editorial review and does not assert production performance.',
        'field_tio2_geo_decision_questions' => [
            ['decision_number' => '01', 'decision_question' => 'Which application context is being evaluated?', 'decision_answer' => 'Record the intended context before comparing documents or routes.'],
            ['decision_number' => '02', 'decision_question' => 'Which properties matter?', 'decision_answer' => 'List the requirements before comparing supply routes.'],
            ['decision_number' => '03', 'decision_question' => 'Who owns the route?', 'decision_answer' => 'Confirm the producer and documentation owner.'],
            ['decision_number' => '04', 'decision_question' => 'Which evidence applies?', 'decision_answer' => 'Check the stated scope of each document.'],
            ['decision_number' => '05', 'decision_question' => 'What needs review?', 'decision_answer' => 'Record unresolved questions for editorial review.'],
            ['decision_number' => '06', 'decision_question' => 'What is the next step?', 'decision_answer' => 'Use a separately authorized follow-up when appropriate.'],
        ],
        'field_tio2_geo_application_briefs' => [[
            'application_name' => 'Coatings context',
            'application_summary' => 'A synthetic application brief for Preview contract testing.',
            'application_considerations' => 'Confirm requirements with appropriate technical documentation.',
        ]],
        'field_tio2_geo_supply_routes' => [[
            'route_name' => 'Synthetic comparison route',
            'route_meaning' => 'A demo-only route description.',
            'buyer_verification' => 'Ask who owns production and supporting documents.',
            'documentation_context' => 'Review documents within their stated applicability.',
            'claim_basis' => 'synthetic_demo',
            'evidence_url' => '',
        ]],
        'field_tio2_geo_evidence_items' => [],
        'field_tio2_geo_evaluation_steps' => [[
            'method_number' => '01',
            'method_title' => 'Frame the question',
            'method_description' => 'Record the application and evidence context before comparing routes.',
        ]],
        'field_tio2_geo_faqs' => [
            ['faq_question' => 'Is this a production claim?', 'faq_answer' => 'No. It is synthetic demo content.'],
            ['faq_question' => 'Does this send an inquiry?', 'faq_answer' => 'No. No submission behavior is introduced.'],
            ['faq_question' => 'Should source context be checked?', 'faq_answer' => 'Yes. Review applicability and evidence boundaries.'],
        ],
        'field_tio2_geo_glossary_items' => [],
        'field_tio2_geo_editorial_reviewed_at' => '2026-08-26T00:00:00.000Z',
        'field_tio2_geo_editorial_reviewed_by' => 'Synthetic local editorial review',
        'field_tio2_geo_editorial_review_scope' => 'Local experimental content only',
    ];
    foreach ($fields as $field_key => $value) {
        tio2_preview_smoke_update_field($field_key, $value, $post_id);
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

foreach (['publish', 'future', 'draft', 'pending', 'private'] as $previewable_status) {
    tio2_preview_smoke_set_status_exact((int) $draft_id, $previewable_status);
    $previewable_response = rest_do_request($request);
    $previewable_data = $previewable_response->get_data();
    if (
        200 !== $previewable_response->get_status() ||
        ! is_array($previewable_data) ||
        $previewable_status !== ($previewable_data['status'] ?? null) ||
        (string) $draft_id !== ($previewable_data['id'] ?? null)
    ) {
        tio2_preview_smoke_fail(sprintf(
            'Signed non-root Page preview rejected %s content (HTTP %d, stored status %s, slug %s)',
            $previewable_status,
            $previewable_response->get_status(),
            (string) get_post_status((int) $draft_id),
            (string) get_post_field('post_name', (int) $draft_id)
        ));
    }
}
tio2_preview_smoke_set_status_exact((int) $draft_id, 'draft');

$cross_site_timestamp = (string) time();
$cross_site_signature = hash_hmac(
    'sha256',
    $cross_site_timestamp . "\n" . 'tio2-b' . "\n" . $path,
    'site-b-preview-smoke-secret'
);
$cross_site_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$cross_site_request->set_query_params(['siteId' => 'tio2-b', 'path' => $path]);
$cross_site_request->set_header('x-tio2-preview-timestamp', $cross_site_timestamp);
$cross_site_request->set_header('x-tio2-preview-signature', $cross_site_signature);
if (404 !== rest_do_request($cross_site_request)->get_status()) {
    tio2_preview_smoke_fail('Signed non-root preview crossed site ownership');
}

$post_path = '/preview-smoke/post';
$post_id = wp_insert_post([
    'post_type' => 'post',
    'post_status' => 'draft',
    'post_title' => 'TiO2 non-root Post preview smoke title',
    'post_content' => '<p>TiO2 non-root Post preview smoke body.</p>',
], true);
if (is_wp_error($post_id) || $post_id <= 0) {
    tio2_preview_smoke_fail('Could not create non-root Post preview smoke fixture');
}
$GLOBALS['tio2_preview_smoke_post_ids'][] = (int) $post_id;
update_post_meta((int) $post_id, 'public_path', $post_path);
wp_set_object_terms((int) $post_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', (int) $post_id);

$post_timestamp = (string) time();
$post_signature = hash_hmac(
    'sha256',
    $post_timestamp . "\n" . 'tio2-a' . "\n" . $post_path,
    'site-a-preview-smoke-secret'
);
$post_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$post_request->set_query_params(['siteId' => 'tio2-a', 'path' => $post_path]);
$post_request->set_header('x-tio2-preview-timestamp', $post_timestamp);
$post_request->set_header('x-tio2-preview-signature', $post_signature);
foreach (['publish', 'future', 'draft', 'pending', 'private'] as $previewable_status) {
    tio2_preview_smoke_set_status_exact((int) $post_id, $previewable_status);
    $post_response = rest_do_request($post_request);
    $post_data = $post_response->get_data();
    if (
        200 !== $post_response->get_status() ||
        ! is_array($post_data) ||
        $previewable_status !== ($post_data['status'] ?? null) ||
        (string) $post_id !== ($post_data['id'] ?? null)
    ) {
        tio2_preview_smoke_fail("Signed non-root Post preview rejected {$previewable_status} content");
    }
}
wp_trash_post((int) $post_id);
if (404 !== rest_do_request($post_request)->get_status()) {
    tio2_preview_smoke_fail('Signed non-root Post preview exposed trashed content');
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

$expired_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$expired_timestamp = (string) (time() - 301);
$expired_request->set_query_params(['siteId' => 'tio2-a', 'path' => $path]);
$expired_request->set_header('x-tio2-preview-timestamp', $expired_timestamp);
$expired_request->set_header(
    'x-tio2-preview-signature',
    hash_hmac(
        'sha256',
        $expired_timestamp . "\n" . 'tio2-a' . "\n" . $path,
        'site-a-preview-smoke-secret'
    )
);
if (401 !== rest_do_request($expired_request)->get_status()) {
    tio2_preview_smoke_fail('WordPress preview endpoint accepted an expired signature');
}

$wrong_path_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$wrong_path_request->set_query_params(['siteId' => 'tio2-a', 'path' => '/preview-smoke/other']);
$wrong_path_request->set_header('x-tio2-preview-timestamp', $timestamp);
$wrong_path_request->set_header('x-tio2-preview-signature', $signature);
if (401 !== rest_do_request($wrong_path_request)->get_status()) {
    tio2_preview_smoke_fail('WordPress preview signature was replayable for another exact path');
}

foreach (['preview-smoke/draft', '//attacker.test/draft', '/preview-smoke/%2e%2e/admin'] as $malformed_path) {
    $malformed_timestamp = (string) time();
    $malformed_request = new WP_REST_Request('GET', '/tio2/v1/preview');
    $malformed_request->set_query_params(['siteId' => 'tio2-a', 'path' => $malformed_path]);
    $malformed_request->set_header('x-tio2-preview-timestamp', $malformed_timestamp);
    $malformed_request->set_header(
        'x-tio2-preview-signature',
        hash_hmac(
            'sha256',
            $malformed_timestamp . "\n" . 'tio2-a' . "\n" . $malformed_path,
            'site-a-preview-smoke-secret'
        )
    );
    if (401 !== rest_do_request($malformed_request)->get_status()) {
        tio2_preview_smoke_fail("WordPress preview accepted malformed path {$malformed_path}");
    }
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

$product_id = wp_insert_post([
    'post_type' => 'tio2_product',
    'post_status' => 'draft',
    'post_title' => 'Unsupported Product preview fixture',
], true);
if (is_wp_error($product_id) || $product_id <= 0) {
    tio2_preview_smoke_fail('Could not create unsupported Product preview fixture');
}
$product_id = (int) $product_id;
$GLOBALS['tio2_preview_smoke_post_ids'][] = $product_id;
$product_path = '/products/unsupported-preview-fixture';
update_post_meta($product_id, 'public_path', $product_path);
wp_set_object_terms($product_id, ['tio2-a'], 'site_scope', false);
$product_timestamp = (string) time();
$product_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$product_request->set_query_params(['siteId' => 'tio2-a', 'path' => $product_path]);
$product_request->set_header('x-tio2-preview-timestamp', $product_timestamp);
$product_request->set_header(
    'x-tio2-preview-signature',
    hash_hmac(
        'sha256',
        $product_timestamp . "\n" . 'tio2-a' . "\n" . $product_path,
        'site-a-preview-smoke-secret'
    )
);
if (404 !== rest_do_request($product_request)->get_status()) {
    tio2_preview_smoke_fail('WordPress preview exposed Product without an approved runtime');
}
$native_product_preview_link = 'http://localhost:8080/?post_type=tio2_product&p=' . $product_id . '&preview=true';
if (
    $native_product_preview_link !== apply_filters(
        'preview_post_link',
        $native_product_preview_link,
        get_post($product_id)
    )
) {
    tio2_preview_smoke_fail('WordPress rewrote Product into the Next.js Preview runtime');
}

$existing_site_a_homepage_ids = tio2_find_homepage_ids('tio2-a');
if (1 !== count($existing_site_a_homepage_ids)) {
    tio2_preview_smoke_fail('Expected one Site A homepage preview source');
}
$existing_site_a_homepage_id = (int) $existing_site_a_homepage_ids[0];
$existing_site_a_terms = wp_get_object_terms($existing_site_a_homepage_id, 'site_scope', ['fields' => 'slugs']);
if (is_wp_error($existing_site_a_terms)) {
    tio2_preview_smoke_fail('Could not snapshot the existing Site A homepage owner');
}
$GLOBALS['tio2_preview_smoke_restore_homepage_owners'][$existing_site_a_homepage_id] = [
    'siteIds' => array_values($existing_site_a_terms),
    'slug' => (string) get_post_field('post_name', $existing_site_a_homepage_id),
    'status' => (string) get_post_status($existing_site_a_homepage_id),
];
wp_set_object_terms($existing_site_a_homepage_id, [], 'site_scope', false);
wp_update_post([
    'ID' => $existing_site_a_homepage_id,
    'post_name' => 'preview-smoke-site-a-homepage-backup-' . $existing_site_a_homepage_id,
]);

$homepage_id = wp_insert_post([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => 'Site A v0.2 preview fixture',
], true);
if (is_wp_error($homepage_id) || $homepage_id <= 0) {
    tio2_preview_smoke_fail('Could not create the Site A v0.2 Preview fixture');
}
$homepage_id = (int) $homepage_id;
$GLOBALS['tio2_preview_smoke_post_ids'][] = $homepage_id;
wp_set_object_terms($homepage_id, ['tio2-a'], 'site_scope', false);
wp_update_post(['ID' => $homepage_id, 'post_name' => 'tio2-a--homepage']);
tio2_preview_smoke_set_v02_homepage_fields($homepage_id);
clean_post_cache($homepage_id);

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
    'homepage-v0.2-editorial-geo' !== ($homepage_data['schemaVersion'] ?? null) ||
    'draft' !== ($homepage_data['status'] ?? null) ||
    'Evaluate a titanium dioxide supply route' !== ($homepage_data['homepageFields']['heroHeading'] ?? null) ||
    'Clarify the sourcing context' !== ($homepage_data['homepageFields']['closingHeading'] ?? null) ||
    'Titanium dioxide sourcing evaluation' !== ($homepage_data['homepageFields']['seoTitle'] ?? null) ||
    'What should a buyer clarify before sourcing titanium dioxide?' !==
        ($homepage_data['editorialGeoFields']['directAnswerQuestion'] ?? null) ||
    'Start with application context, evidence boundaries, and supply-route ownership.' !==
        ($homepage_data['editorialGeoFields']['directAnswerLead'] ?? null) ||
    'This synthetic demo organizes questions for local editorial review and does not assert production performance.' !==
        ($homepage_data['editorialGeoFields']['directAnswerBody'] ?? null) ||
    '01' !== ($homepage_data['editorialGeoFields']['decisionQuestions'][0]['decisionNumber'] ?? null) ||
    '06' !== ($homepage_data['editorialGeoFields']['decisionQuestions'][5]['decisionNumber'] ?? null) ||
    6 !== count($homepage_data['editorialGeoFields']['decisionQuestions'] ?? []) ||
    3 > count($homepage_data['editorialGeoFields']['geoFaqs'] ?? []) ||
    'Is this a production claim?' !== ($homepage_data['editorialGeoFields']['geoFaqs'][0]['faqQuestion'] ?? null) ||
    '2026-08-26T00:00:00.000Z' !== ($homepage_data['editorialGeoFields']['editorialReviewedAt'] ?? null)
) {
    tio2_preview_smoke_fail('Signed homepage preview did not return the v0.2 Site A draft contract');
}

$site_b_homepage_ids = tio2_find_homepage_ids('tio2-b');
if (1 !== count($site_b_homepage_ids)) {
    tio2_preview_smoke_fail('Expected one frozen Site B homepage preview source');
}
$site_b_homepage_id = (int) $site_b_homepage_ids[0];
$site_b_homepage_status = (string) get_post_status($site_b_homepage_id);
$GLOBALS['tio2_preview_smoke_restore_statuses'][$site_b_homepage_id] = $site_b_homepage_status;
tio2_preview_smoke_set_status_exact($site_b_homepage_id, 'draft');
$site_b_request = new WP_REST_Request('GET', '/tio2/v1/preview');
$site_b_request->set_query_params(['siteId' => 'tio2-b', 'path' => '/']);
$site_b_request->set_header('x-tio2-preview-timestamp', $homepage_timestamp);
$site_b_request->set_header('x-tio2-preview-signature', $homepage_signature);
if (401 !== rest_do_request($site_b_request)->get_status()) {
    tio2_preview_smoke_fail('A Site A signature retrieved Site B Preview content');
}
$site_b_signature = hash_hmac(
    'sha256',
    $homepage_timestamp . "\n" . 'tio2-b' . "\n/",
    'site-b-preview-smoke-secret'
);
$site_b_request->set_header('x-tio2-preview-signature', $site_b_signature);
$site_b_response = rest_do_request($site_b_request);
$site_b_data = $site_b_response->get_data();
if (
    200 !== $site_b_response->get_status() ||
    ! is_array($site_b_data) ||
    'tio2-b' !== ($site_b_data['siteId'] ?? null) ||
    '/' !== ($site_b_data['path'] ?? null) ||
    'homepage-v0.1' !== ($site_b_data['schemaVersion'] ?? null) ||
    'draft' !== ($site_b_data['status'] ?? null)
) {
    tio2_preview_smoke_fail('Signed Site B Preview did not retain the frozen v0.1 contract');
}

$duplicate_preview_title = 'Direct duplicate homepage preview owner';
$duplicate_preview_content = 'This incomplete draft must remain recoverable without owning root preview.';
$duplicate_preview_id = wp_insert_post([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => $duplicate_preview_title,
    'post_content' => $duplicate_preview_content,
], true);
if (is_wp_error($duplicate_preview_id) || $duplicate_preview_id <= 0) {
    tio2_preview_smoke_fail('Could not create the direct homepage preview duplicate fixture');
}
$duplicate_preview_id = (int) $duplicate_preview_id;
$GLOBALS['tio2_preview_smoke_post_ids'][] = $duplicate_preview_id;
wp_set_object_terms($duplicate_preview_id, ['tio2-a'], 'site_scope', false);
clean_post_cache($duplicate_preview_id);
$reconciled_homepage_response = rest_do_request($homepage_request);
$reconciled_homepage_data = $reconciled_homepage_response->get_data();
if (
    [$homepage_id] !== tio2_find_homepage_ids('tio2-a') ||
    null !== tio2_get_homepage_site_id($duplicate_preview_id) ||
    'tio2-a--homepage' === get_post_field('post_name', $duplicate_preview_id) ||
    'draft' !== get_post_status($duplicate_preview_id) ||
    $duplicate_preview_title !== get_post_field('post_title', $duplicate_preview_id) ||
    $duplicate_preview_content !== get_post_field('post_content', $duplicate_preview_id) ||
    200 !== $reconciled_homepage_response->get_status() ||
    ! is_array($reconciled_homepage_data) ||
    (string) $homepage_id !== ($reconciled_homepage_data['id'] ?? null)
) {
    tio2_preview_smoke_fail('Direct draft site_scope mutation left ambiguous root preview ownership');
}
wp_delete_post($duplicate_preview_id, true);
$GLOBALS['tio2_preview_smoke_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_preview_smoke_post_ids'],
    [$duplicate_preview_id]
));

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

foreach (['publish', 'future', 'pending', 'private'] as $non_draft_status) {
    tio2_preview_smoke_set_status_exact($homepage_id, $non_draft_status);
    $non_draft_response = rest_do_request($homepage_request);
    if (404 !== $non_draft_response->get_status()) {
        tio2_preview_smoke_fail("Signed homepage preview exposed {$non_draft_status} content");
    }
}
tio2_preview_smoke_set_status_exact($homepage_id, 'draft');

$GLOBALS['tio2_webhook_queue'] = [];

wp_trash_post((int) $draft_id);
$trashed_response = rest_do_request($request);
if (404 !== $trashed_response->get_status()) {
    tio2_preview_smoke_fail('WordPress preview endpoint exposed trashed content');
}

tio2_preview_smoke_cleanup();
$GLOBALS['tio2_preview_smoke_post_ids'] = [];
$GLOBALS['tio2_preview_smoke_restore_statuses'] = [];
$GLOBALS['tio2_preview_smoke_restore_homepage_owners'] = [];
fwrite(STDOUT, "TiO2 signed draft preview smoke test passed\n");
