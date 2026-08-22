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

fwrite(STDOUT, "TiO2 site model smoke test passed\n");
