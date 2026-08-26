<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_product_graphql_test_errors'] = [];
$GLOBALS['tio2_product_graphql_test_post_ids'] = [];
$GLOBALS['tio2_product_graphql_test_option_values'] = [];

function tio2_product_graphql_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_product_graphql_test_errors'][] = $message;
    }
}

function tio2_product_graphql_test_delete_option_field(array $field, string $parent_name = ''): void
{
    $field_name = (string) ($field['name'] ?? '');
    $option_name = '' === $parent_name ? $field_name : $parent_name . '_' . $field_name;
    if ('' !== $option_name) {
        delete_option('options_' . $option_name);
        delete_option('_options_' . $option_name);
        if (function_exists('acf_flush_value_cache')) {
            acf_flush_value_cache('options', $option_name);
        }
    }

    foreach ($field['sub_fields'] ?? [] as $sub_field) {
        if (is_array($sub_field)) {
            tio2_product_graphql_test_delete_option_field($sub_field, $option_name);
        }
    }
}

function tio2_product_graphql_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_product_graphql_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id) instanceof WP_Post) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_product_graphql_test_post_ids'] = [];

    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field)) {
            continue;
        }
        $field_name = (string) ($field['name'] ?? '');
        if (! array_key_exists($field_name, $GLOBALS['tio2_product_graphql_test_option_values'])) {
            continue;
        }
        $previous_value = $GLOBALS['tio2_product_graphql_test_option_values'][$field_name];
        if (false === $previous_value) {
            tio2_product_graphql_test_delete_option_field($field);
            continue;
        }
        update_field((string) $field['key'], $previous_value, 'option');
    }
    $GLOBALS['tio2_product_graphql_test_option_values'] = [];
}

function tio2_product_graphql_test_fail(string $message): void
{
    tio2_product_graphql_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

register_shutdown_function('tio2_product_graphql_test_cleanup');

if (! class_exists('WPGraphQL') || ! function_exists('graphql') || ! function_exists('get_field')) {
    tio2_product_graphql_test_fail('WPGraphQL and ACF must be active for the Product settings contract test.');
}

$schema = WPGraphQL::get_schema();
$root_query = $schema->getQueryType();
$root_fields = $root_query->getFields();
if (! isset($root_fields['tio2ProductSettings'])) {
    tio2_product_graphql_test_fail('Missing RootQuery.tio2ProductSettings.');
}

$settings_type = GraphQL\Type\Definition\Type::getNamedType(
    $root_fields['tio2ProductSettings']->getType()
);
tio2_product_graphql_test_assert(
    $settings_type instanceof GraphQL\Type\Definition\ObjectType,
    'RootQuery.tio2ProductSettings does not resolve to an object type.'
);
if ($settings_type instanceof GraphQL\Type\Definition\ObjectType) {
    $settings_fields = $settings_type->getFields();
    $settings_field_names = array_keys($settings_fields);
    sort($settings_field_names, SORT_STRING);
    tio2_product_graphql_test_assert(
        ['discussApplicationCta', 'inquiryFields', 'requestTdsCta', 'technicalDisclaimer'] ===
            $settings_field_names,
        'Tio2ProductSettings exposes fields outside the four approved shared concepts.'
    );
    tio2_product_graphql_test_assert(
        '[Tio2InquiryField!]!' === (string) $settings_fields['inquiryFields']->getType() &&
            'Tio2Cta!' === (string) $settings_fields['requestTdsCta']->getType() &&
            'Tio2Cta!' === (string) $settings_fields['discussApplicationCta']->getType() &&
            'String!' === (string) $settings_fields['technicalDisclaimer']->getType(),
        'Product settings fields do not preserve their required GraphQL shapes.'
    );
}

foreach (tio2_product_shared_field_definitions() as $field) {
    if (! is_array($field)) {
        continue;
    }
    $field_name = (string) $field['name'];
    $GLOBALS['tio2_product_graphql_test_option_values'][$field_name] = get_field(
        $field_name,
        'option',
        false
    );
}

update_field('field_tio2_product_inquiry_fields', [[
    'key' => '  application  ',
    'label' => '  Application  ',
    'guidance' => '  Tell us where the pigment will be used.  ',
]], 'option');
update_field('field_tio2_product_request_tds_cta', [
    'label' => '  Request the TDS  ',
    'description' => '  Ask for the controlled technical document.  ',
], 'option');
update_field('field_tio2_product_discuss_application_cta', [
    'label' => '  Discuss your application  ',
    'description' => '  Review fit with a technical specialist.  ',
], 'option');
update_field(
    'field_tio2_product_technical_disclaimer',
    '  <p>Typical values are not specifications.</p>  ',
    'option'
);

$settings_query = <<<'GRAPHQL'
query ProductSettings($siteId: String!) {
  tio2ProductSettings(siteId: $siteId) {
    inquiryFields { key label guidance }
    requestTdsCta { label description }
    discussApplicationCta { label description }
    technicalDisclaimer
  }
}
GRAPHQL;
$query_settings = static function (string $site_id) use ($settings_query): array {
    $result = graphql([
        'query' => $settings_query,
        'variables' => ['siteId' => $site_id],
    ]);
    return is_array($result) ? $result : [];
};

$site_a_result = $query_settings('tio2-a');
tio2_product_graphql_test_assert(
    ! isset($site_a_result['errors']),
    'Site A Product settings query returned GraphQL errors.'
);
tio2_product_graphql_test_assert(
    [
        'inquiryFields' => [[
            'key' => 'application',
            'label' => 'Application',
            'guidance' => 'Tell us where the pigment will be used.',
        ]],
        'requestTdsCta' => [
            'label' => 'Request the TDS',
            'description' => 'Ask for the controlled technical document.',
        ],
        'discussApplicationCta' => [
            'label' => 'Discuss your application',
            'description' => 'Review fit with a technical specialist.',
        ],
        'technicalDisclaimer' => '<p>Typical values are not specifications.</p>',
    ] === ($site_a_result['data']['tio2ProductSettings'] ?? null),
    'Site A Product settings did not use the approved shared-settings normalizer shape.'
);

foreach (['tio2-b', 'unknown-site'] as $rejected_site_id) {
    $result = $query_settings($rejected_site_id);
    tio2_product_graphql_test_assert(
        ! isset($result['errors']) && null === ($result['data']['tio2ProductSettings'] ?? null),
        "Product settings leaked to {$rejected_site_id}."
    );
}

$product_id = wp_insert_post([
    'post_type' => 'tio2_product',
    'post_status' => 'draft',
    'post_title' => 'Anonymous GraphQL privacy fixture',
], true);
if (is_wp_error($product_id) || $product_id <= 0) {
    tio2_product_graphql_test_fail('Could not create anonymous Product GraphQL fixture.');
}
$product_id = (int) $product_id;
$GLOBALS['tio2_product_graphql_test_post_ids'][] = $product_id;
wp_set_current_user(0);
$product_result = graphql([
    'query' => <<<'GRAPHQL'
query PrivateProduct($id: ID!) {
  tio2Product(id: $id, idType: DATABASE_ID) { databaseId }
}
GRAPHQL,
    'variables' => ['id' => (string) $product_id],
]);
tio2_product_graphql_test_assert(
    is_array($product_result) && null === ($product_result['data']['tio2Product'] ?? null),
    'An anonymous GraphQL request could resolve a draft Product node.'
);

if ([] !== $GLOBALS['tio2_product_graphql_test_errors']) {
    tio2_product_graphql_test_fail(implode("\n", $GLOBALS['tio2_product_graphql_test_errors']));
}

tio2_product_graphql_test_cleanup();
fwrite(STDOUT, "TiO2 Product GraphQL settings contract test passed\n");
