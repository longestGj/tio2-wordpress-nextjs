<?php

function tio2_smoke_fail($message)
{
    fwrite(STDERR, $message . "\n");
    exit(1);
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
    'deleted_post_meta' => 'tio2_handle_post_meta_change',
] as $hook => $callback) {
    if (false === has_action($hook, $callback)) {
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

fwrite(STDOUT, "TiO2 site model smoke test passed\n");
