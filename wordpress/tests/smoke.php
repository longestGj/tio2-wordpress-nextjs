<?php

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

if (! function_exists('acf_get_field')) {
    fwrite(STDERR, "ACF is not active\n");
    exit(1);
}

foreach (['technical_summary', 'evidence_source_url', 'public_path', 'seo_title', 'seo_description'] as $field_name) {
    if (! acf_get_field($field_name)) {
        fwrite(STDERR, "Missing ACF field: {$field_name}\n");
        exit(1);
    }
}

foreach (['Page', 'Post'] as $graphql_type) {
    $fields = $schema->getType($graphql_type)->getFields();
    if (! isset($fields['publishingFields'])) {
        fwrite(STDERR, "Missing publishingFields on GraphQL type: {$graphql_type}\n");
        exit(1);
    }
}

foreach (['Tio2Product', 'Tio2Grade', 'Tio2Application', 'Tio2Document', 'Tio2Faq'] as $graphql_type) {
    $fields = $schema->getType($graphql_type)->getFields();
    if (! isset($fields['technicalFields'])) {
        fwrite(STDERR, "Missing technicalFields on GraphQL type: {$graphql_type}\n");
        exit(1);
    }
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
