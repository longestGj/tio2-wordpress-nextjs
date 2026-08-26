<?php

if (! defined('ABSPATH')) {
    exit(1);
}

require_once __DIR__ . '/product-option-cleanup.php';

$GLOBALS['tio2_product_preview_test_post_ids'] = [];
$GLOBALS['tio2_product_preview_test_term_ids'] = [];
$GLOBALS['tio2_product_preview_test_option_values'] = [];
$GLOBALS['tio2_product_preview_test_errors'] = [];

function tio2_product_preview_test_fail(string $message): void
{
    tio2_product_preview_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_product_preview_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_product_preview_test_errors'][] = $message;
    }
}

function tio2_product_preview_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_product_preview_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id) instanceof WP_Post) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_product_preview_test_post_ids'] = [];

    foreach ($GLOBALS['tio2_product_preview_test_term_ids'] ?? [] as $term_id) {
        if (term_exists((int) $term_id, 'product_family')) {
            wp_delete_term((int) $term_id, 'product_family');
        }
    }
    $GLOBALS['tio2_product_preview_test_term_ids'] = [];

    foreach ($GLOBALS['tio2_product_preview_test_option_values'] ?? [] as $field_name => $field_state) {
        if (false === $field_state['value']) {
            foreach (tio2_product_shared_field_definitions() as $field) {
                if (is_array($field) && $field_name === ($field['name'] ?? null)) {
                    tio2_product_test_delete_created_option_field($field);
                }
            }
            continue;
        }
        update_field((string) $field_state['key'], $field_state['value'], 'option');
    }
    $GLOBALS['tio2_product_preview_test_option_values'] = [];

    if (array_key_exists('tio2_b_product_preview_private', $GLOBALS)) {
        if (false === $GLOBALS['tio2_b_product_preview_private']) {
            delete_option('tio2_b_product_preview_private');
        } else {
            update_option('tio2_b_product_preview_private', $GLOBALS['tio2_b_product_preview_private']);
        }
        unset($GLOBALS['tio2_b_product_preview_private']);
    }
}

register_shutdown_function('tio2_product_preview_test_cleanup');

function tio2_product_preview_test_field_value(array $field, int $family_id, int $application_id): mixed
{
    $name = (string) ($field['name'] ?? '');
    $type = (string) ($field['type'] ?? '');

    if ('product_id' === $name) {
        return 'TP-Z911';
    }
    if ('taxonomy' === $type) {
        return $family_id;
    }
    if ('relationship' === $type) {
        return [$application_id];
    }
    if ('repeater' === $type) {
        $rows = [];
        $count = max(1, (int) ($field['min'] ?? 0));
        for ($index = 1; $index <= $count; ++$index) {
            $row = [];
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                if (! is_array($sub_field)) {
                    continue;
                }
                $sub_name = (string) ($sub_field['name'] ?? '');
                $row[$sub_name] = 'number' === ($sub_field['type'] ?? '')
                    ? $index
                    : ucfirst(str_replace('_', ' ', $sub_name)) . ' ' . $index;
            }
            $rows[] = $row;
        }
        return $rows;
    }
    if ('group' === $type) {
        $group = [];
        foreach ($field['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field)) {
                continue;
            }
            $sub_name = (string) ($sub_field['name'] ?? '');
            $group[$sub_name] = 'relationship' === ($sub_field['type'] ?? '')
                ? [$application_id]
                : ucfirst(str_replace('_', ' ', $sub_name));
        }
        return $group;
    }

    return 'wysiwyg' === $type
        ? '<p>' . ucfirst(str_replace('_', ' ', $name)) . '</p>'
        : ucfirst(str_replace('_', ' ', $name));
}

function tio2_product_preview_test_set_shared_settings(): void
{
    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field)) {
            continue;
        }
        $field_name = (string) $field['name'];
        if (! array_key_exists($field_name, $GLOBALS['tio2_product_preview_test_option_values'])) {
            $GLOBALS['tio2_product_preview_test_option_values'][$field_name] = [
                'key' => (string) $field['key'],
                'value' => get_field($field_name, 'option', false),
            ];
        }
        update_field(
            (string) $field['key'],
            tio2_product_preview_test_field_value($field, 0, 0),
            'option'
        );
    }
}

function tio2_product_preview_test_insert_product(
    string $product_id,
    string $status,
    int $family_id,
    int $application_id,
    bool $complete
): int {
    $post_id = wp_insert_post([
        'post_type' => 'tio2_product',
        'post_status' => $status,
        'post_title' => 'Protected Product preview ' . $product_id,
        'post_name' => strtolower($product_id),
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_product_preview_test_fail('Could not create Product preview fixture.');
    }
    $post_id = (int) $post_id;
    $GLOBALS['tio2_product_preview_test_post_ids'][] = $post_id;

    foreach (tio2_product_field_definitions() as $field) {
        if (! is_array($field)) {
            continue;
        }
        if (! $complete && 'product_id' !== ($field['name'] ?? null)) {
            continue;
        }
        $value = 'product_id' === ($field['name'] ?? null)
            ? $product_id
            : tio2_product_preview_test_field_value($field, $family_id, $application_id);
        update_field((string) $field['key'], $value, $post_id);
    }
    wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
    clean_post_cache($post_id);

    return $post_id;
}

function tio2_product_preview_test_request(
    string $site_id,
    string $path,
    string $timestamp,
    string $signature
): WP_REST_Response {
    $request = new WP_REST_Request('GET', '/tio2/v1/preview');
    $request->set_query_params(['siteId' => $site_id, 'path' => $path]);
    $request->set_header('x-tio2-preview-timestamp', $timestamp);
    $request->set_header('x-tio2-preview-signature', $signature);
    return rest_do_request($request);
}

function tio2_product_preview_test_signature(string $secret, string $timestamp, string $site_id, string $path): string
{
    return hash_hmac('sha256', $timestamp . "\n" . $site_id . "\n" . $path, $secret);
}

function tio2_product_preview_test_set_status_exact(int $post_id, string $status): void
{
    global $wpdb;

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_status' => $status],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    if (false === $updated) {
        tio2_product_preview_test_fail("Could not set Product preview fixture status to {$status}.");
    }
    clean_post_cache($post_id);
}

/**
 * @param list<string> $site_scopes
 */
function tio2_product_preview_test_insert_relationship(
    string $post_type,
    string $status,
    string $title,
    string $slug,
    array $site_scopes,
    string $excerpt = '',
    ?string $product_id = null
): int {
    $post_id = wp_insert_post([
        'post_type' => $post_type,
        'post_status' => 'tio2_product' === $post_type ? 'draft' : $status,
        'post_title' => $title,
        'post_name' => $slug,
        'post_excerpt' => $excerpt,
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_product_preview_test_fail("Could not create {$post_type} relationship fixture.");
    }
    $post_id = (int) $post_id;
    $GLOBALS['tio2_product_preview_test_post_ids'][] = $post_id;
    wp_set_object_terms($post_id, $site_scopes, 'site_scope', false);
    if (null !== $product_id) {
        update_field('field_tio2_product_id', $product_id, $post_id);
    }
    if ('tio2_product' === $post_type && 'draft' !== $status) {
        tio2_product_preview_test_set_status_exact($post_id, $status);
    }
    clean_post_cache($post_id);

    return $post_id;
}

function tio2_product_preview_test_clear_slug(int $post_id): void
{
    global $wpdb;

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_name' => ''],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    if (false === $updated) {
        tio2_product_preview_test_fail('Could not remove a relationship canonical path.');
    }
    clean_post_cache($post_id);
}

function tio2_product_preview_test_has_raw_field_key($value): bool
{
    if (! is_array($value)) {
        return false;
    }
    foreach ($value as $key => $item) {
        if (is_string($key) && str_starts_with($key, 'field_')) {
            return true;
        }
        if (tio2_product_preview_test_has_raw_field_key($item)) {
            return true;
        }
    }
    return false;
}

foreach (['tio2_find_product_for_preview', 'tio2_serialize_product_preview'] as $function_name) {
    tio2_product_preview_test_assert(
        function_exists($function_name),
        "Missing protected Product preview helper: {$function_name}()."
    );
}
$product_preview_return_type = (new ReflectionFunction('tio2_serialize_product_preview'))->getReturnType();
$product_preview_return_type_names = $product_preview_return_type instanceof ReflectionUnionType
    ? array_map(static fn (ReflectionType $type): string => $type->getName(), $product_preview_return_type->getTypes())
    : [];
sort($product_preview_return_type_names, SORT_STRING);
tio2_product_preview_test_assert(
    ['WP_Error', 'array'] === $product_preview_return_type_names,
    'The Product preview serializer does not declare its array|WP_Error return contract.'
);
if ([] !== $GLOBALS['tio2_product_preview_test_errors']) {
    tio2_product_preview_test_fail(implode("\n", $GLOBALS['tio2_product_preview_test_errors']));
}

$suffix = str_replace('.', '-', (string) microtime(true));
$family = wp_insert_term(
    'Product Preview Family',
    'product_family',
    ['slug' => 'product-preview-family-' . $suffix]
);
if (is_wp_error($family)) {
    tio2_product_preview_test_fail('Could not create Product preview family fixture.');
}
$family_id = (int) $family['term_id'];
$GLOBALS['tio2_product_preview_test_term_ids'][] = $family_id;

$application_id = tio2_product_preview_test_insert_relationship(
    'tio2_application',
    'publish',
    'Eligible Product preview application',
    'product-preview-application',
    ['tio2-a'],
    '<p>Best fit for exterior coatings &amp; durable buyer trials.</p>'
);
$unpublished_application_id = tio2_product_preview_test_insert_relationship(
    'tio2_application',
    'draft',
    'Unpublished Product preview application',
    'unpublished-product-preview-application',
    ['tio2-a']
);
$cross_site_application_id = tio2_product_preview_test_insert_relationship(
    'tio2_application',
    'publish',
    'Cross-site Product preview application',
    'cross-site-product-preview-application',
    ['tio2-b']
);
$missing_path_application_id = tio2_product_preview_test_insert_relationship(
    'tio2_application',
    'publish',
    'Missing-path Product preview application',
    'missing-path-product-preview-application',
    ['tio2-a'],
    '<p>Useful when route copy is still pending.</p>'
);
tio2_product_preview_test_clear_slug($missing_path_application_id);

$document_id = tio2_product_preview_test_insert_relationship(
    'tio2_document',
    'publish',
    'Eligible Product preview resource',
    'product-preview-resource',
    ['tio2-a']
);
$unpublished_document_id = tio2_product_preview_test_insert_relationship(
    'tio2_document',
    'draft',
    'Unpublished Product preview resource',
    'unpublished-product-preview-resource',
    ['tio2-a']
);
$cross_site_document_id = tio2_product_preview_test_insert_relationship(
    'tio2_document',
    'publish',
    'Cross-site Product preview resource',
    'cross-site-product-preview-resource',
    ['tio2-b']
);
$missing_path_document_id = tio2_product_preview_test_insert_relationship(
    'tio2_document',
    'publish',
    'Missing-path Product preview resource',
    'missing-path-product-preview-resource',
    ['tio2-a']
);
tio2_product_preview_test_clear_slug($missing_path_document_id);

$related_product_id = tio2_product_preview_test_insert_relationship(
    'tio2_product',
    'publish',
    'Eligible Product preview related Product',
    'tp-z914',
    ['tio2-a'],
    '',
    'TP-Z914'
);
$unpublished_product_id = tio2_product_preview_test_insert_relationship(
    'tio2_product',
    'draft',
    'Unpublished Product preview related Product',
    'tp-z915',
    ['tio2-a'],
    '',
    'TP-Z915'
);
$cross_site_product_id = tio2_product_preview_test_insert_relationship(
    'tio2_product',
    'publish',
    'Cross-site Product preview related Product',
    'tp-z916',
    ['tio2-b'],
    '',
    'TP-Z916'
);
$missing_path_product_id = tio2_product_preview_test_insert_relationship(
    'tio2_product',
    'publish',
    'Missing-path Product preview related Product',
    'tp-z917',
    ['tio2-a'],
    '',
    'TP-Z917'
);
tio2_product_preview_test_clear_slug($missing_path_product_id);

tio2_product_preview_test_set_shared_settings();
$GLOBALS['tio2_b_product_preview_private'] = get_option('tio2_b_product_preview_private', false);
update_option('tio2_b_product_preview_private', 'SITE-B-PRIVATE-PREVIEW-VALUE');

$product_id = tio2_product_preview_test_insert_product(
    'TP-Z911',
    'draft',
    $family_id,
    $application_id,
    true
);
update_field('field_tio2_product_recommended_applications', [
    $application_id,
    $unpublished_application_id,
    $cross_site_application_id,
    $document_id,
    $missing_path_application_id,
], $product_id);
update_field('field_tio2_product_related_links', [
    'applications' => [
        $application_id,
        $unpublished_application_id,
        $cross_site_application_id,
        $document_id,
        $missing_path_application_id,
    ],
    'resources' => [
        $document_id,
        $unpublished_document_id,
        $cross_site_document_id,
        $application_id,
        $missing_path_document_id,
    ],
    'products' => [
        $related_product_id,
        $unpublished_product_id,
        $cross_site_product_id,
        $document_id,
        $missing_path_product_id,
    ],
], $product_id);
update_post_meta($product_id, 'tds_url', 'https://private.example.test/tds/TP-Z911.pdf');
update_post_meta($product_id, '_tds_url', 'field_private_tds_url');

$incomplete_id = tio2_product_preview_test_insert_product(
    'TP-Z912',
    'draft',
    $family_id,
    $application_id,
    false
);

$page_path = '/products/tp-z913';
$page_slug = tio2_build_internal_slug('tio2-a', $page_path);
if (is_wp_error($page_slug)) {
    tio2_product_preview_test_fail('Could not derive non-Product preview fixture slug.');
}
$page_id = wp_insert_post([
    'post_type' => 'page',
    'post_status' => 'draft',
    'post_title' => 'Non-Product content at Product path',
    'post_name' => $page_slug,
], true);
if (is_wp_error($page_id) || $page_id <= 0) {
    tio2_product_preview_test_fail('Could not create non-Product preview fixture.');
}
$page_id = (int) $page_id;
$GLOBALS['tio2_product_preview_test_post_ids'][] = $page_id;
update_post_meta($page_id, 'public_path', $page_path);
wp_set_object_terms($page_id, ['tio2-a'], 'site_scope', false);
clean_post_cache($page_id);

tio2_product_preview_test_assert(
    $product_id === (tio2_find_product_for_preview('tio2-a', '/products/tp-z911')->ID ?? 0),
    'The resolver did not find the exact Site A Product draft.'
);
tio2_product_preview_test_assert(
    null === tio2_find_product_for_preview('tio2-b', '/products/tp-z911') &&
        null === tio2_find_product_for_preview('tio2-a', '/products/tp-z999') &&
        null === tio2_find_product_for_preview('tio2-a', $page_path),
    'The resolver accepted a wrong site, wrong path, or non-Product owner.'
);

$serialized = tio2_serialize_product_preview(get_post($product_id));
tio2_product_preview_test_assert(is_array($serialized), 'A complete Product draft did not serialize.');
if (is_array($serialized)) {
    $expected_top_level_keys = [
        'id', 'databaseId', 'siteId', 'path', 'slug', 'title', 'modifiedGmt', 'status',
        'productFields', 'productSettingsFields',
    ];
    tio2_product_preview_test_assert(
        $expected_top_level_keys === array_keys($serialized),
        'Product preview top-level keys are incomplete or expose an unapproved record field.'
    );
    tio2_product_preview_test_assert(
        (string) $product_id === $serialized['id'] &&
            $product_id === $serialized['databaseId'] &&
            'tio2-a' === $serialized['siteId'] &&
            '/products/tp-z911' === $serialized['path'] &&
            'tp-z911' === $serialized['slug'] &&
            'Protected Product preview TP-Z911' === $serialized['title'] &&
            'draft' === $serialized['status'] &&
            is_string($serialized['modifiedGmt']) &&
            1 === preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/D', $serialized['modifiedGmt']),
        'Product preview native identity or canonical path is incorrect.'
    );
    tio2_product_preview_test_assert(
        [
            'productId', 'family', 'metaTitle', 'metaDescription', 'eyebrow',
            'customerProblemHeadline', 'quickAnswer', 'productType', 'process',
            'primaryApplication', 'positioning', 'surfaceTreatment', 'packaging',
            'tdsAccess', 'fitWhen', 'discussFirstWhen', 'performancePriorities',
            'recommendedApplications', 'evidenceStatement', 'typicalProperties',
            'validationChecklist', 'faqItems', 'relatedLinks',
        ] === array_keys($serialized['productFields']),
        'Product fields are not serialized with the stable approved scalar keys.'
    );
    tio2_product_preview_test_assert(
        [
            'inquiryFields', 'requestTdsCta', 'discussApplicationCta', 'technicalDisclaimer',
        ] === array_keys($serialized['productSettingsFields']),
        'Product settings did not use the approved shared-settings normalizer shape.'
    );
    tio2_product_preview_test_assert(
        [
            'label' => 'Label',
            'description' => 'Description',
        ] === $serialized['productSettingsFields']['requestTdsCta'] &&
            [
                'label' => 'Label',
                'description' => 'Description',
            ] === $serialized['productSettingsFields']['discussApplicationCta'],
        'Product preview CTA groups did not retain their approved shared-setting values.'
    );
    tio2_product_preview_test_assert(
        [['item' => 'Item 1'], ['item' => 'Item 2'], ['item' => 'Item 3']]
            === $serialized['productFields']['fitWhen'] &&
            1 === $serialized['productFields']['typicalProperties'][0]['displayOrder'],
        'Product repeaters/groups were not serialized into predictable scalar arrays.'
    );
    tio2_product_preview_test_assert(
        'Product Preview Family' === $serialized['productFields']['family'] &&
            [[
                'title' => 'Eligible Product preview application',
                'fit' => 'Best fit for exterior coatings & durable buyer trials.',
                'href' => '/tio2-application/product-preview-application',
            ], [
                'title' => 'Missing-path Product preview application',
                'fit' => 'Useful when route copy is still pending.',
            ]] === $serialized['productFields']['recommendedApplications'] &&
            [[
                'title' => 'Eligible Product preview application',
                'href' => '/tio2-application/product-preview-application',
            ]] === $serialized['productFields']['relatedLinks']['applications'] &&
            [[
                'title' => 'Eligible Product preview resource',
                'href' => '/tio2-document/product-preview-resource',
            ]] === $serialized['productFields']['relatedLinks']['resources'] &&
            [[
                'title' => 'Eligible Product preview related Product',
                'href' => '/products/tp-z914',
            ]] === $serialized['productFields']['relatedLinks']['products'],
        'Product family or eligible relationship display data was not expanded exactly: ' . wp_json_encode([
            'family' => $serialized['productFields']['family'],
            'recommendedApplications' => $serialized['productFields']['recommendedApplications'],
            'relatedLinks' => $serialized['productFields']['relatedLinks'],
        ])
    );
    $encoded = wp_json_encode($serialized);
    tio2_product_preview_test_assert(
        ! tio2_product_preview_test_has_raw_field_key($serialized) &&
            false === strpos($encoded, 'https://private.example.test/tds/TP-Z911.pdf') &&
            false === strpos($encoded, 'tds_url') &&
            false === strpos($encoded, 'SITE-B-PRIVATE-PREVIEW-VALUE') &&
            false === strpos($encoded, 'tio2-b'),
        'Product preview exposed raw ACF keys, a private TDS URL, or Site B settings.'
    );
}

$incomplete = tio2_serialize_product_preview(get_post($incomplete_id));
tio2_product_preview_test_assert(
    is_wp_error($incomplete) && 'tio2_preview_product_incomplete' === $incomplete->get_error_code(),
    'An incomplete Product did not return the specific preview contract error.'
);

putenv('NEXTJS_PREVIEW_URL_TIO2_A=http://127.0.0.1:3001/api/preview');
putenv('NEXTJS_PREVIEW_SECRET_TIO2_A=product-preview-site-a-secret');
putenv('NEXTJS_PREVIEW_URL_TIO2_B=http://127.0.0.1:3002/api/preview');
putenv('NEXTJS_PREVIEW_SECRET_TIO2_B=product-preview-site-b-secret');
do_action('rest_api_init');

$timestamp = (string) time();
$canonical_path = '/products/tp-z911';
$valid_signature = tio2_product_preview_test_signature(
    'product-preview-site-a-secret',
    $timestamp,
    'tio2-a',
    $canonical_path
);
$valid_response = tio2_product_preview_test_request('tio2-a', $canonical_path, $timestamp, $valid_signature);
$valid_data = $valid_response->get_data();
tio2_product_preview_test_assert(
    200 === $valid_response->get_status() &&
        is_array($valid_data) &&
        $canonical_path === ($valid_data['path'] ?? null) &&
        'TP-Z911' === ($valid_data['productFields']['productId'] ?? null),
    'A valid signed Site A Product draft request did not return the protected payload.'
);

$native_preview_link = 'http://localhost:8080/?post_type=tio2_product&p=' . $product_id . '&preview=true';
foreach (['publish', 'future', 'pending', 'private'] as $non_draft_status) {
    tio2_product_preview_test_set_status_exact($product_id, $non_draft_status);
    $non_draft_serialized = tio2_serialize_product_preview(get_post($product_id));
    $non_draft_response = tio2_product_preview_test_request(
        'tio2-a',
        $canonical_path,
        $timestamp,
        $valid_signature
    );
    tio2_product_preview_test_assert(
        null === tio2_find_product_for_preview('tio2-a', $canonical_path) &&
            is_wp_error($non_draft_serialized) &&
            'tio2_preview_not_found' === $non_draft_serialized->get_error_code() &&
            404 === $non_draft_response->get_status() &&
            'tio2_preview_not_found' === ($non_draft_response->get_data()['code'] ?? null) &&
            $native_preview_link === apply_filters(
                'preview_post_link',
                $native_preview_link,
                get_post($product_id)
            ),
        "A complete {$non_draft_status} Product remained previewable."
    );
}
tio2_product_preview_test_set_status_exact($product_id, 'draft');

$invalid_signature_response = tio2_product_preview_test_request(
    'tio2-a',
    $canonical_path,
    $timestamp,
    str_repeat('0', 64)
);
tio2_product_preview_test_assert(
    401 === $invalid_signature_response->get_status() &&
        'tio2_preview_unauthorized' === ($invalid_signature_response->get_data()['code'] ?? null),
    'The Product preview endpoint accepted an invalid signature.'
);

$expired_timestamp = (string) (time() - 301);
$expired_response = tio2_product_preview_test_request(
    'tio2-a',
    $canonical_path,
    $expired_timestamp,
    tio2_product_preview_test_signature(
        'product-preview-site-a-secret',
        $expired_timestamp,
        'tio2-a',
        $canonical_path
    )
);
tio2_product_preview_test_assert(
    401 === $expired_response->get_status() &&
        'tio2_preview_unauthorized' === ($expired_response->get_data()['code'] ?? null),
    'The Product preview endpoint accepted an expired signature.'
);

$wrong_site_response = tio2_product_preview_test_request(
    'tio2-b',
    $canonical_path,
    $timestamp,
    tio2_product_preview_test_signature(
        'product-preview-site-b-secret',
        $timestamp,
        'tio2-b',
        $canonical_path
    )
);
tio2_product_preview_test_assert(
    404 === $wrong_site_response->get_status() &&
        'tio2_preview_not_found' === ($wrong_site_response->get_data()['code'] ?? null),
    'A Site B request retrieved the Site A Product preview.'
);

$wrong_path = '/products/tp-z999';
$wrong_path_response = tio2_product_preview_test_request(
    'tio2-a',
    $wrong_path,
    $timestamp,
    tio2_product_preview_test_signature(
        'product-preview-site-a-secret',
        $timestamp,
        'tio2-a',
        $wrong_path
    )
);
tio2_product_preview_test_assert(
    404 === $wrong_path_response->get_status() &&
        'tio2_preview_not_found' === ($wrong_path_response->get_data()['code'] ?? null),
    'A signed request for the wrong Product path retrieved content.'
);

$non_product_response = tio2_product_preview_test_request(
    'tio2-a',
    $page_path,
    $timestamp,
    tio2_product_preview_test_signature(
        'product-preview-site-a-secret',
        $timestamp,
        'tio2-a',
        $page_path
    )
);
tio2_product_preview_test_assert(
    404 === $non_product_response->get_status() &&
        'tio2_preview_not_found' === ($non_product_response->get_data()['code'] ?? null),
    'Non-Product content was exposed through a Product preview path.'
);

$incomplete_path = '/products/tp-z912';
$incomplete_response = tio2_product_preview_test_request(
    'tio2-a',
    $incomplete_path,
    $timestamp,
    tio2_product_preview_test_signature(
        'product-preview-site-a-secret',
        $timestamp,
        'tio2-a',
        $incomplete_path
    )
);
tio2_product_preview_test_assert(
    422 === $incomplete_response->get_status() &&
        'tio2_preview_product_incomplete' === ($incomplete_response->get_data()['code'] ?? null),
    'An incomplete Product preview returned a partial payload or a non-specific error.'
);

$signed_preview_link = apply_filters('preview_post_link', $native_preview_link, get_post($product_id));
$signed_preview_parts = wp_parse_url($signed_preview_link);
parse_str($signed_preview_parts['query'] ?? '', $signed_preview_query);
$expected_admin_signature = tio2_product_preview_test_signature(
    'product-preview-site-a-secret',
    (string) ($signed_preview_query['expires'] ?? ''),
    'tio2-a',
    $canonical_path
);
tio2_product_preview_test_assert(
    '127.0.0.1' === ($signed_preview_parts['host'] ?? null) &&
        '/api/preview' === ($signed_preview_parts['path'] ?? null) &&
        'tio2-a' === ($signed_preview_query['siteId'] ?? null) &&
        $canonical_path === ($signed_preview_query['path'] ?? null) &&
        hash_equals($expected_admin_signature, (string) ($signed_preview_query['signature'] ?? '')),
    'The Product Admin preview link was not signed against its canonical public path.'
);

if ([] !== $GLOBALS['tio2_product_preview_test_errors']) {
    tio2_product_preview_test_fail(implode("\n", $GLOBALS['tio2_product_preview_test_errors']));
}

$inquiry_fields_were_absent = false === (
    $GLOBALS['tio2_product_preview_test_option_values']['inquiry_fields']['value'] ?? null
);
tio2_product_preview_test_cleanup();
if ($inquiry_fields_were_absent) {
    foreach ([
        'options_inquiry_fields_0_key', '_options_inquiry_fields_0_key',
        'options_inquiry_fields_0_label', '_options_inquiry_fields_0_label',
        'options_inquiry_fields_0_guidance', '_options_inquiry_fields_0_guidance',
    ] as $option_name) {
        if (false === get_option($option_name, false)) {
            continue;
        }
        tio2_product_preview_test_fail('Product preview cleanup left test-created inquiry field option rows behind.');
    }
}
fwrite(STDOUT, "TiO2 protected Product preview test passed\n");
