<?php

function tio2_smoke_fail($message)
{
    if (function_exists('tio2_smoke_cleanup_webhook_fixtures')) {
        tio2_smoke_cleanup_webhook_fixtures();
    }
    fwrite(STDERR, $message . "\n");
    exit(1);
}

$GLOBALS['tio2_smoke_webhook_post_ids'] = [];
$GLOBALS['tio2_smoke_webhook_term_id'] = 0;
$GLOBALS['tio2_smoke_original_webhook_url'] = getenv('NEXTJS_REVALIDATION_URL');
$GLOBALS['tio2_smoke_original_webhook_secret'] = getenv('NEXTJS_REVALIDATION_SECRET');

function tio2_smoke_cleanup_webhook_fixtures()
{
    $GLOBALS['tio2_webhook_queue'] = [];

    foreach ($GLOBALS['tio2_smoke_webhook_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id)) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_smoke_webhook_post_ids'] = [];

    $term_id = (int) ($GLOBALS['tio2_smoke_webhook_term_id'] ?? 0);
    if ($term_id > 0 && term_exists($term_id, 'site_scope')) {
        wp_delete_term($term_id, 'site_scope');
    }
    $GLOBALS['tio2_smoke_webhook_term_id'] = 0;
    $GLOBALS['tio2_webhook_queue'] = [];

    $original_url = $GLOBALS['tio2_smoke_original_webhook_url'] ?? false;
    $original_secret = $GLOBALS['tio2_smoke_original_webhook_secret'] ?? false;
    false === $original_url
        ? putenv('NEXTJS_REVALIDATION_URL')
        : putenv('NEXTJS_REVALIDATION_URL=' . $original_url);
    false === $original_secret
        ? putenv('NEXTJS_REVALIDATION_SECRET')
        : putenv('NEXTJS_REVALIDATION_SECRET=' . $original_secret);
}

function tio2_smoke_assert_acf_group($group_key, $graphql_field_name, $expected_fields, $expected_post_types)
{
    $group = acf_get_field_group($group_key);
    if (! $group) {
        tio2_smoke_fail("Missing ACF field group: {$group_key}");
    }

    if (($group['graphql_field_name'] ?? null) !== $graphql_field_name || empty($group['show_in_graphql'])) {
        tio2_smoke_fail("ACF field group is not exposed as {$graphql_field_name}: {$group_key}");
    }

    $actual_fields = [];
    foreach (acf_get_fields($group) ?: [] as $field) {
        $actual_fields[$field['name']] = $field['type'];
    }

    foreach ($expected_fields as $field_name => $field_type) {
        if (! isset($actual_fields[$field_name])) {
            tio2_smoke_fail("ACF field {$field_name} is not in group {$group_key}");
        }

        if ($actual_fields[$field_name] !== $field_type) {
            tio2_smoke_fail("ACF field {$field_name} has type {$actual_fields[$field_name]}, expected {$field_type}");
        }
    }

    $actual_field_names = array_keys($actual_fields);
    $expected_field_names = array_keys($expected_fields);
    sort($actual_field_names);
    sort($expected_field_names);
    if ($actual_field_names !== $expected_field_names) {
        tio2_smoke_fail(
            "ACF field group {$group_key} contains [" . implode(', ', $actual_field_names) .
            '], expected exactly [' . implode(', ', $expected_field_names) . ']'
        );
    }

    $actual_post_types = [];
    foreach ($group['location'] ?? [] as $rule_group) {
        if (1 !== count($rule_group)) {
            tio2_smoke_fail("ACF field group has an unexpected compound location rule: {$group_key}");
        }

        $rule = reset($rule_group);
        if ('post_type' !== ($rule['param'] ?? null) || '==' !== ($rule['operator'] ?? null)) {
            tio2_smoke_fail("ACF field group has an unexpected location rule: {$group_key}");
        }

        $actual_post_types[] = $rule['value'];
    }

    sort($actual_post_types);
    sort($expected_post_types);
    if ($actual_post_types !== $expected_post_types) {
        tio2_smoke_fail(
            "ACF field group {$group_key} locations are [" . implode(', ', $actual_post_types) .
            '], expected [' . implode(', ', $expected_post_types) . ']'
        );
    }
}

function tio2_smoke_assert_graphql_group($schema, $root_type_name, $group_field_name, $expected_nested_fields)
{
    $root_type = $schema->getType($root_type_name);
    $root_fields = $root_type->getFields();
    if (! isset($root_fields[$group_field_name])) {
        tio2_smoke_fail("Missing {$group_field_name} on GraphQL type: {$root_type_name}");
    }

    $group_type = GraphQL\Type\Definition\Type::getNamedType($root_fields[$group_field_name]->getType());
    if (! $group_type instanceof GraphQL\Type\Definition\ObjectType) {
        tio2_smoke_fail("GraphQL field {$root_type_name}.{$group_field_name} does not unwrap to an object type");
    }

    $nested_fields = $group_type->getFields();
    foreach ($expected_nested_fields as $nested_field_name) {
        if (! isset($nested_fields[$nested_field_name])) {
            tio2_smoke_fail(
                "Missing nested GraphQL field {$nested_field_name} on {$root_type_name}.{$group_field_name}"
            );
        }
    }
}

$post_types = [
    'tio2_product',
    'tio2_grade',
    'tio2_application',
    'tio2_document',
    'tio2_faq',
];

foreach ($post_types as $post_type) {
    if (! post_type_exists($post_type)) {
        fwrite(STDERR, "Missing post type: {$post_type}\n");
        exit(1);
    }

    $post_type_object = get_post_type_object($post_type);
    if (! $post_type_object->public || ! $post_type_object->show_in_rest || ! $post_type_object->show_in_graphql) {
        fwrite(STDERR, "Post type is not public in REST and GraphQL: {$post_type}\n");
        exit(1);
    }

    foreach (['title', 'editor', 'excerpt', 'thumbnail', 'revisions'] as $feature) {
        if (! post_type_supports($post_type, $feature)) {
            fwrite(STDERR, "Post type {$post_type} does not support {$feature}\n");
            exit(1);
        }
    }
}

if (! taxonomy_exists('site_scope')) {
    fwrite(STDERR, "Missing taxonomy: site_scope\n");
    exit(1);
}

$taxonomy = get_taxonomy('site_scope');
$expected_taxonomy_types = array_merge(['post', 'page'], $post_types);

if (! $taxonomy->show_in_rest || ! $taxonomy->show_in_graphql) {
    fwrite(STDERR, "site_scope is not exposed in REST and GraphQL\n");
    exit(1);
}

foreach ($expected_taxonomy_types as $post_type) {
    if (! in_array($post_type, $taxonomy->object_type, true)) {
        fwrite(STDERR, "site_scope is not registered for {$post_type}\n");
        exit(1);
    }
}

foreach (['tio2-a', 'tio2-b'] as $term_slug) {
    if (! term_exists($term_slug, 'site_scope')) {
        fwrite(STDERR, "Missing site_scope term: {$term_slug}\n");
        exit(1);
    }
}

if (! class_exists('WPGraphQL')) {
    fwrite(STDERR, "WPGraphQL is not active\n");
    exit(1);
}

$schema = WPGraphQL::get_schema();

foreach (['Tio2Product', 'Tio2Grade', 'Tio2Application', 'Tio2Document', 'Tio2Faq'] as $graphql_type) {
    if (null === $schema->getType($graphql_type)) {
        fwrite(STDERR, "Missing GraphQL object type: {$graphql_type}\n");
        exit(1);
    }
}

if (! function_exists('acf_get_field_group') || ! function_exists('acf_get_fields')) {
    fwrite(STDERR, "ACF is not active\n");
    exit(1);
}

tio2_smoke_assert_acf_group(
    'group_tio2_technical_fields',
    'technicalFields',
    [
        'technical_summary' => 'textarea',
        'evidence_source_url' => 'url',
    ],
    $post_types
);

tio2_smoke_assert_acf_group(
    'group_tio2_publishing_fields',
    'publishingFields',
    [
        'public_path' => 'text',
        'seo_title' => 'text',
        'seo_description' => 'textarea',
    ],
    ['page', 'post']
);

foreach (['Page', 'Post'] as $graphql_type) {
    tio2_smoke_assert_graphql_group(
        $schema,
        $graphql_type,
        'publishingFields',
        ['publicPath', 'seoTitle', 'seoDescription']
    );
}

foreach (['Tio2Product', 'Tio2Grade', 'Tio2Application', 'Tio2Document', 'Tio2Faq'] as $graphql_type) {
    tio2_smoke_assert_graphql_group(
        $schema,
        $graphql_type,
        'technicalFields',
        ['technicalSummary', 'evidenceSourceUrl']
    );
}

foreach (['/', '/products', '/applications/coatings'] as $path) {
    if (true !== apply_filters('acf/validate_value/name=public_path', true, $path, [], 'input')) {
        fwrite(STDERR, "Rejected valid public_path: {$path}\n");
        exit(1);
    }
}

foreach (['products', '//example.test/path', 'https://example.test/path', '/products?draft=1', '/products#details'] as $path) {
    if (true === apply_filters('acf/validate_value/name=public_path', true, $path, [], 'input')) {
        fwrite(STDERR, "Accepted invalid public_path: {$path}\n");
        exit(1);
    }
}

foreach (['tio2-a--home', 'tio2-b--applications--coatings'] as $internal_slug) {
    if ($internal_slug !== sanitize_title($internal_slug, '', 'query')) {
        fwrite(STDERR, "Internal slug was normalized during query lookup: {$internal_slug}\n");
        exit(1);
    }

    $normal_save_slug = preg_replace('~-+~', '-', $internal_slug);
    if ($normal_save_slug !== sanitize_title($internal_slug, '', 'save')) {
        fwrite(STDERR, "Internal-looking slug bypassed normal save sanitization: {$internal_slug}\n");
        exit(1);
    }
}

foreach ([
    'tio2_get_webhook_config',
    'tio2_build_webhook_payload',
    'tio2_encode_webhook_payload',
    'tio2_sign_webhook_body',
    'tio2_is_relevant_webhook_meta_key',
    'tio2_queue_webhook',
] as $webhook_function) {
    if (! function_exists($webhook_function)) {
        tio2_smoke_fail("Missing webhook function: {$webhook_function}");
    }
}

if (null !== tio2_get_webhook_config(['NEXTJS_REVALIDATION_URL' => '', 'NEXTJS_REVALIDATION_SECRET' => ''])) {
    tio2_smoke_fail('Webhook configuration accepted empty URL and secret');
}

if (null !== tio2_get_webhook_config([
    'NEXTJS_REVALIDATION_URL' => 'ftp://example.test/revalidate',
    'NEXTJS_REVALIDATION_SECRET' => 'test-secret',
])) {
    tio2_smoke_fail('Webhook configuration accepted a non-HTTP URL');
}

$test_webhook_config = tio2_get_webhook_config([
    'NEXTJS_REVALIDATION_URL' => 'http://host.docker.internal:3000/api/revalidate',
    'NEXTJS_REVALIDATION_SECRET' => 'test-secret',
]);
if (
    ! is_array($test_webhook_config) ||
    'http://host.docker.internal:3000/api/revalidate' !== $test_webhook_config['url'] ||
    'test-secret' !== $test_webhook_config['secret']
) {
    tio2_smoke_fail('Webhook configuration did not preserve the configured URL and secret');
}

$known_body = 'The quick brown fox jumps over the lazy dog';
$known_signature = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
if ($known_signature !== tio2_sign_webhook_body($known_body, 'key')) {
    tio2_smoke_fail('Webhook signature does not match the HMAC-SHA256 known vector');
}

$page_ids = get_posts([
    'post_type' => 'page',
    'post_status' => 'publish',
    'fields' => 'ids',
    'posts_per_page' => 1,
    'meta_key' => 'public_path',
    'meta_value' => '/products',
    'tax_query' => [[
        'taxonomy' => 'site_scope',
        'field' => 'slug',
        'terms' => ['tio2-a'],
    ]],
]);
if (empty($page_ids)) {
    tio2_smoke_fail('Missing seeded Site A /products page for webhook smoke');
}

$event_time = '2026-08-23T00:00:00+00:00';
$page_payload = tio2_build_webhook_payload((int) $page_ids[0], $event_time);
if (
    ! is_array($page_payload) ||
    ['eventId', 'siteIds', 'contentId', 'paths', 'entityIds', 'modified'] !== array_keys($page_payload) ||
    ['tio2-a'] !== $page_payload['siteIds'] ||
    ['/products'] !== $page_payload['paths'] ||
    [] !== $page_payload['entityIds'] ||
    (int) $page_ids[0] !== $page_payload['contentId'] ||
    $event_time !== $page_payload['modified'] ||
    ! wp_is_uuid($page_payload['eventId'], 4)
) {
    tio2_smoke_fail('Page webhook payload does not match the strict site/path contract');
}

$entity_ids = get_posts([
    'post_type' => 'tio2_product',
    'post_status' => 'publish',
    'fields' => 'ids',
    'posts_per_page' => 1,
]);
if (empty($entity_ids)) {
    tio2_smoke_fail('Missing seeded shared product for webhook smoke');
}

$entity_payload = tio2_build_webhook_payload((int) $entity_ids[0], $event_time);
if (
    ! is_array($entity_payload) ||
    ['tio2-a', 'tio2-b'] !== $entity_payload['siteIds'] ||
    [] !== $entity_payload['paths'] ||
    [(int) $entity_ids[0]] !== $entity_payload['entityIds']
) {
    tio2_smoke_fail('Unscoped shared entity payload did not target both fixed sites');
}

$encoded_page_payload = tio2_encode_webhook_payload($page_payload);
if (! is_string($encoded_page_payload) || $page_payload !== json_decode($encoded_page_payload, true)) {
    tio2_smoke_fail('Webhook payload encoding did not round-trip exactly');
}

foreach (['public_path', 'seo_title', 'seo_description', 'technical_summary', 'evidence_source_url'] as $meta_key) {
    if (! tio2_is_relevant_webhook_meta_key($meta_key)) {
        tio2_smoke_fail("Webhook ignored relevant metadata key: {$meta_key}");
    }
}
if (tio2_is_relevant_webhook_meta_key('_edit_lock')) {
    tio2_smoke_fail('Webhook accepted an irrelevant metadata key');
}

foreach ([
    'transition_post_status' => 'tio2_handle_post_transition',
    'added_post_meta' => 'tio2_handle_post_meta_change',
    'updated_post_meta' => 'tio2_handle_post_meta_change',
    'deleted_post_meta' => 'tio2_handle_deleted_post_meta',
    'set_object_terms' => 'tio2_handle_site_scope_set',
    'deleted_term_relationships' => 'tio2_handle_deleted_term_relationships',
] as $hook => $callback) {
    if (false === has_action($hook, $callback)) {
        tio2_smoke_fail("Webhook callback {$callback} is not registered on {$hook}");
    }
}

foreach ([
    'update_post_metadata' => 'tio2_capture_post_meta_before_mutation',
    'delete_post_metadata' => 'tio2_capture_post_meta_before_mutation',
] as $hook => $callback) {
    if (false === has_filter($hook, $callback)) {
        tio2_smoke_fail("Webhook callback {$callback} is not registered on {$hook}");
    }
}

$GLOBALS['tio2_webhook_queue'] = [];
tio2_queue_webhook((int) $page_ids[0]);
tio2_queue_webhook((int) $page_ids[0]);
if (1 !== count($GLOBALS['tio2_webhook_queue'])) {
    tio2_smoke_fail('Webhook queue did not coalesce duplicate post changes');
}
$GLOBALS['tio2_webhook_queue'] = [];

function tio2_smoke_assert_single_webhook(&$requests, $expected_sites, $expected_paths, $expected_entity_ids)
{
    if (1 !== count($requests)) {
        tio2_smoke_fail('Expected exactly one intercepted webhook request, received ' . count($requests));
    }

    $request = $requests[0];
    $args = $request['args'];
    if (
        'https://next.example.test/api/revalidate' !== $request['url'] ||
        'POST' !== ($args['method'] ?? null) ||
        5 !== ($args['timeout'] ?? null) ||
        0 !== ($args['redirection'] ?? null) ||
        'application/json' !== ($args['headers']['content-type'] ?? null) ||
        ! is_string($args['body'] ?? null)
    ) {
        tio2_smoke_fail('Intercepted webhook request options do not match the transport contract');
    }

    $body = $args['body'];
    $signature = $args['headers']['x-tio2-signature'] ?? null;
    if (! is_string($signature) || hash_hmac('sha256', $body, 'runtime-smoke-secret') !== $signature) {
        tio2_smoke_fail('Intercepted webhook signature does not match the exact posted body bytes');
    }

    $payload = json_decode($body, true);
    if (
        ! is_array($payload) ||
        ['eventId', 'siteIds', 'contentId', 'paths', 'entityIds', 'modified'] !== array_keys($payload) ||
        ! wp_is_uuid($payload['eventId'], 4) ||
        abs(time() - strtotime($payload['modified'])) > 5
    ) {
        tio2_smoke_fail('Intercepted webhook body is not a current strict payload');
    }

    sort($expected_sites, SORT_STRING);
    sort($expected_paths, SORT_STRING);
    sort($expected_entity_ids, SORT_NUMERIC);
    $actual_sites = $payload['siteIds'];
    $actual_paths = $payload['paths'];
    $actual_entity_ids = $payload['entityIds'];
    sort($actual_sites, SORT_STRING);
    sort($actual_paths, SORT_STRING);
    sort($actual_entity_ids, SORT_NUMERIC);
    if (
        $expected_sites !== $actual_sites ||
        $expected_paths !== $actual_paths ||
        $expected_entity_ids !== $actual_entity_ids
    ) {
        tio2_smoke_fail(
            'Intercepted webhook affected state mismatch: ' . wp_json_encode([
                'siteIds' => $actual_sites,
                'paths' => $actual_paths,
                'entityIds' => $actual_entity_ids,
            ])
        );
    }

    $requests = [];
    return $payload;
}

foreach (get_posts([
    'post_type' => ['page', 'tio2_product'],
    'post_status' => 'any',
    'posts_per_page' => -1,
    's' => 'TiO2 webhook runtime smoke fixture',
    'fields' => 'ids',
]) as $stale_post_id) {
    wp_delete_post((int) $stale_post_id, true);
}
$stale_term = term_exists('tio2-webhook-unsupported', 'site_scope');
if ($stale_term) {
    wp_delete_term((int) (is_array($stale_term) ? $stale_term['term_id'] : $stale_term), 'site_scope');
}
$GLOBALS['tio2_webhook_queue'] = [];

putenv('NEXTJS_REVALIDATION_URL=https://next.example.test/api/revalidate');
putenv('NEXTJS_REVALIDATION_SECRET=runtime-smoke-secret');
$captured_webhook_requests = [];
$webhook_transport_error = false;
$webhook_interceptor = function ($preempt, $args, $url) use (&$captured_webhook_requests, &$webhook_transport_error) {
    $captured_webhook_requests[] = ['url' => $url, 'args' => $args];
    if ($webhook_transport_error) {
        return new WP_Error('tio2_smoke_transport', 'Synthetic webhook transport failure');
    }
    return [
        'headers' => [],
        'body' => '{"ok":true}',
        'response' => ['code' => 200, 'message' => 'OK'],
        'cookies' => [],
        'filename' => null,
    ];
};
add_filter('pre_http_request', $webhook_interceptor, 10, 3);

$runtime_page_id = wp_insert_post([
    'post_type' => 'page',
    'post_status' => 'publish',
    'post_title' => 'TiO2 webhook runtime smoke fixture page',
]);
if (is_wp_error($runtime_page_id) || $runtime_page_id <= 0) {
    tio2_smoke_fail('Could not create webhook runtime page fixture');
}
$GLOBALS['tio2_smoke_webhook_post_ids'][] = (int) $runtime_page_id;
wp_set_object_terms($runtime_page_id, ['tio2-a'], 'site_scope', false);
update_post_meta($runtime_page_id, 'public_path', '/runtime-smoke/old-path');
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];

update_post_meta($runtime_page_id, 'public_path', '/runtime-smoke/new-path');
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a'],
    ['/runtime-smoke/old-path', '/runtime-smoke/new-path'],
    []
);

update_post_meta($runtime_page_id, 'public_path', '/runtime-smoke/delete-path');
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
delete_post_meta($runtime_page_id, 'public_path');
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a'],
    ['/runtime-smoke/delete-path'],
    []
);

update_post_meta($runtime_page_id, 'public_path', '/runtime-smoke/scope-path');
wp_set_object_terms($runtime_page_id, ['tio2-a'], 'site_scope', false);
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
wp_set_object_terms($runtime_page_id, ['tio2-b'], 'site_scope', false);
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a', 'tio2-b'],
    ['/runtime-smoke/scope-path'],
    []
);

$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
wp_set_object_terms($runtime_page_id, [], 'site_scope', false);
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-b'],
    ['/runtime-smoke/scope-path'],
    []
);

wp_set_object_terms($runtime_page_id, ['tio2-a'], 'site_scope', false);
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
do_action('transition_post_status', 'publish', 'draft', get_post($runtime_page_id));
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a'],
    ['/runtime-smoke/scope-path'],
    []
);

$runtime_entity_id = wp_insert_post([
    'post_type' => 'tio2_product',
    'post_status' => 'publish',
    'post_title' => 'TiO2 webhook runtime smoke fixture entity',
]);
if (is_wp_error($runtime_entity_id) || $runtime_entity_id <= 0) {
    tio2_smoke_fail('Could not create webhook runtime entity fixture');
}
$GLOBALS['tio2_smoke_webhook_post_ids'][] = (int) $runtime_entity_id;
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
do_action('transition_post_status', 'publish', 'draft', get_post($runtime_entity_id));
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a', 'tio2-b'],
    [],
    [(int) $runtime_entity_id]
);

$unsupported_term = wp_insert_term(
    'TiO2 webhook unsupported scope',
    'site_scope',
    ['slug' => 'tio2-webhook-unsupported']
);
if (is_wp_error($unsupported_term)) {
    tio2_smoke_fail('Could not create unsupported site_scope fixture');
}
$GLOBALS['tio2_smoke_webhook_term_id'] = (int) $unsupported_term['term_id'];
wp_set_object_terms($runtime_entity_id, [(int) $unsupported_term['term_id']], 'site_scope', false);
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
do_action('transition_post_status', 'publish', 'draft', get_post($runtime_entity_id));
tio2_flush_webhook_queue();
if (! empty($captured_webhook_requests)) {
    tio2_smoke_fail('Shared entity with unsupported-only site_scope terms was treated as globally unscoped');
}

$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
wp_set_object_terms($runtime_entity_id, [], 'site_scope', false);
tio2_flush_webhook_queue();
tio2_smoke_assert_single_webhook(
    $captured_webhook_requests,
    ['tio2-a', 'tio2-b'],
    [],
    [(int) $runtime_entity_id]
);

$webhook_transport_error = true;
$GLOBALS['tio2_webhook_queue'] = [];
$captured_webhook_requests = [];
do_action('transition_post_status', 'publish', 'draft', get_post($runtime_page_id));
tio2_flush_webhook_queue();
if (1 !== count($captured_webhook_requests) || ! empty($GLOBALS['tio2_webhook_queue'])) {
    tio2_smoke_fail('Webhook transport errors were not contained while clearing the queue');
}
$webhook_transport_error = false;

wp_update_post(['ID' => $runtime_page_id, 'post_status' => 'draft']);
tio2_flush_webhook_queue();
$captured_webhook_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];
update_post_meta($runtime_page_id, 'public_path', '/runtime-smoke/draft-path');
wp_set_object_terms($runtime_page_id, ['tio2-b'], 'site_scope', false);
tio2_flush_webhook_queue();
if (! empty($captured_webhook_requests)) {
    tio2_smoke_fail('Draft metadata or term changes produced a public revalidation webhook');
}
wp_update_post(['ID' => $runtime_page_id, 'post_status' => 'publish']);
tio2_flush_webhook_queue();
$captured_webhook_requests = [];
$GLOBALS['tio2_webhook_queue'] = [];

remove_filter('pre_http_request', $webhook_interceptor, 10);
tio2_smoke_cleanup_webhook_fixtures();

fwrite(STDOUT, "TiO2 site model smoke test passed\n");
