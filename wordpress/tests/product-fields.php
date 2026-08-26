<?php

if (! defined('ABSPATH')) {
    exit(1);
}

function tio2_product_fields_test_fail(string $message): void
{
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_product_fields_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        tio2_product_fields_test_fail($message);
    }
}

/**
 * @param array<string, mixed> $field
 * @return list<string>
 */
function tio2_product_fields_test_names(array $field): array
{
    $names = [];
    if (isset($field['name']) && is_string($field['name'])) {
        $names[] = $field['name'];
    }
    foreach ($field['sub_fields'] ?? [] as $sub_field) {
        if (is_array($sub_field)) {
            $names = array_merge($names, tio2_product_fields_test_names($sub_field));
        }
    }
    return $names;
}

foreach ([
    'tio2_product_field_definitions',
    'tio2_product_shared_field_definitions',
    'tio2_register_product_acf_fields',
    'tio2_register_product_settings_page',
    'tio2_normalize_product_shared_settings',
] as $function_name) {
    tio2_product_fields_test_assert(function_exists($function_name), "Missing {$function_name}().");
}
tio2_product_fields_test_assert(function_exists('acf_get_field_group'), 'ACF field-group API is unavailable.');
tio2_product_fields_test_assert(function_exists('acf_get_fields'), 'ACF field API is unavailable.');

$product_group = acf_get_field_group('group_tio2_product_fields');
tio2_product_fields_test_assert(is_array($product_group), 'Missing Product ACF field group.');
tio2_product_fields_test_assert(
    ! empty($product_group['show_in_graphql']) && 'productFields' === ($product_group['graphql_field_name'] ?? null),
    'Product field group GraphQL contract is wrong.'
);

$locations = $product_group['location'] ?? [];
tio2_product_fields_test_assert(
    [[[
        'param' => 'post_type',
        'operator' => '==',
        'value' => 'tio2_product',
    ]]] === $locations,
    'Product fields must be attached only to the Product record type.'
);

$product_fields = acf_get_fields($product_group);
tio2_product_fields_test_assert(is_array($product_fields), 'Could not load Product fields.');
$expected_product_names = [
    'product_id',
    'family',
    'meta_title',
    'meta_description',
    'eyebrow',
    'customer_problem_headline',
    'quick_answer',
    'product_type',
    'process',
    'primary_application',
    'positioning',
    'surface_treatment',
    'packaging',
    'tds_access',
    'fit_when',
    'discuss_first_when',
    'performance_priorities',
    'recommended_applications',
    'evidence_statement',
    'typical_properties',
    'validation_checklist',
    'faq_items',
    'related_links',
];
tio2_product_fields_test_assert(
    $expected_product_names === array_column($product_fields, 'name'),
    'Product field names or order drifted from the approved contract.'
);
$product_fields_by_name = array_column($product_fields, null, 'name');

foreach ([
    'product_id' => 'text',
    'family' => 'taxonomy',
    'quick_answer' => 'wysiwyg',
    'fit_when' => 'repeater',
    'discuss_first_when' => 'repeater',
    'performance_priorities' => 'repeater',
    'recommended_applications' => 'relationship',
    'evidence_statement' => 'wysiwyg',
    'typical_properties' => 'repeater',
    'validation_checklist' => 'repeater',
    'faq_items' => 'repeater',
    'related_links' => 'group',
] as $name => $type) {
    tio2_product_fields_test_assert(
        $type === ($product_fields_by_name[$name]['type'] ?? null),
        "Product {$name} must be a {$type} field."
    );
}
tio2_product_fields_test_assert(
    'product_family' === ($product_fields_by_name['family']['taxonomy'] ?? null),
    'Product family must use the product-family taxonomy relationship.'
);
tio2_product_fields_test_assert(
    ['tio2_application'] === ($product_fields_by_name['recommended_applications']['post_type'] ?? null),
    'Recommended applications must use Application relationships.'
);

foreach ([
    'fit_when' => [3, 5, ['item']],
    'discuss_first_when' => [1, 5, ['item']],
    'performance_priorities' => [3, 6, ['title', 'explanation']],
    'typical_properties' => [1, 0, ['property', 'value', 'unit', 'method', 'note', 'display_order']],
    'validation_checklist' => [0, 0, ['item']],
    'faq_items' => [6, 10, ['question', 'answer']],
] as $name => [$min, $max, $sub_field_names]) {
    $field = $product_fields_by_name[$name] ?? [];
    tio2_product_fields_test_assert(
        $min === ($field['min'] ?? null) && $max === ($field['max'] ?? null),
        "Product {$name} bounds drifted."
    );
    tio2_product_fields_test_assert(
        $sub_field_names === array_column($field['sub_fields'] ?? [], 'name'),
        "Product {$name} subfields drifted."
    );
}
tio2_product_fields_test_assert(
    'number' === ($product_fields_by_name['typical_properties']['sub_fields'][5]['type'] ?? null),
    'Typical-property display order must be numeric.'
);
tio2_product_fields_test_assert(
    'wysiwyg' === ($product_fields_by_name['faq_items']['sub_fields'][1]['type'] ?? null),
    'FAQ answers must be approved rich text.'
);
$related_links = $product_fields_by_name['related_links']['sub_fields'] ?? [];
tio2_product_fields_test_assert(
    ['applications', 'resources', 'products'] === array_column($related_links, 'name'),
    'Related links must use the approved relationship groups.'
);
tio2_product_fields_test_assert(
    ['tio2_application'] === ($related_links[0]['post_type'] ?? null) &&
        ['tio2_document'] === ($related_links[1]['post_type'] ?? null) &&
        ['tio2_product'] === ($related_links[2]['post_type'] ?? null),
    'Related links must target Application, Resource, and Product records.'
);

$all_product_names = [];
foreach ($product_fields as $field) {
    $all_product_names = array_merge($all_product_names, tio2_product_fields_test_names($field));
}
foreach (['source_model', 'last_reviewed', 'reviewer', 'manufacturer', 'legal_entity', 'tds_url', 'download_url'] as $forbidden_name) {
    tio2_product_fields_test_assert(
        ! in_array($forbidden_name, $all_product_names, true),
        "Forbidden Product field {$forbidden_name} was registered."
    );
}

$administrator = get_user_by('login', 'tio2-local-editor');
tio2_product_fields_test_assert($administrator instanceof WP_User, 'Missing local administrator fixture.');
wp_set_current_user((int) $administrator->ID);
do_action('admin_menu');
$settings_page = null;
foreach (($GLOBALS['submenu']['options-general.php'] ?? []) as $menu_item) {
    if ('tio2-product-settings' === ($menu_item[2] ?? null)) {
        $settings_page = $menu_item;
        break;
    }
}
tio2_product_fields_test_assert(is_array($settings_page), 'Missing Product settings options page.');
tio2_product_fields_test_assert(
    'manage_options' === ($settings_page[1] ?? null),
    'Product settings must be restricted to administrators.'
);

$shared_group = acf_get_field_group('group_tio2_product_settings_fields');
tio2_product_fields_test_assert(is_array($shared_group), 'Missing Product settings field group.');
tio2_product_fields_test_assert(
    ! empty($shared_group['show_in_graphql']) && 'productSettingsFields' === ($shared_group['graphql_field_name'] ?? null),
    'Product settings GraphQL contract is wrong.'
);
tio2_product_fields_test_assert(
    [[[
        'param' => 'options_page',
        'operator' => '==',
        'value' => 'tio2-product-settings',
    ]]] === ($shared_group['location'] ?? []),
    'Product settings fields must be restricted to the Site A Product settings page.'
);
$shared_fields = acf_get_fields($shared_group);
tio2_product_fields_test_assert(is_array($shared_fields), 'Could not load Product settings fields.');
tio2_product_fields_test_assert(
    ['inquiry_fields', 'request_tds_cta', 'discuss_application_cta', 'technical_disclaimer'] === array_column($shared_fields, 'name'),
    'Product shared field names or order drifted from the approved contract.'
);
tio2_product_fields_test_assert(
    'repeater' === ($shared_fields[0]['type'] ?? null) &&
        ['key', 'label', 'guidance'] === array_column($shared_fields[0]['sub_fields'] ?? [], 'name'),
    'Inquiry fields must be a structured repeater.'
);
tio2_product_fields_test_assert(
    'group' === ($shared_fields[1]['type'] ?? null) &&
        ['label', 'description'] === array_column($shared_fields[1]['sub_fields'] ?? [], 'name') &&
        'group' === ($shared_fields[2]['type'] ?? null) &&
        ['label', 'description'] === array_column($shared_fields[2]['sub_fields'] ?? [], 'name') &&
        'wysiwyg' === ($shared_fields[3]['type'] ?? null),
    'CTA and technical-disclaimer field shapes drifted.'
);

$normalized_settings = tio2_normalize_product_shared_settings([
    'inquiry_fields' => [['key' => 'grade', 'label' => 'Grade', 'guidance' => 'Share the grade ID.']],
    'request_tds_cta' => ['label' => 'Request TDS', 'description' => 'Ask for the technical data sheet.'],
    'discuss_application_cta' => ['label' => 'Discuss your application', 'description' => 'Tell us about the use case.'],
    'technical_disclaimer' => '<p>Typical properties require evaluation.</p>',
]);
tio2_product_fields_test_assert(
    [
        'inquiryFields' => [['key' => 'grade', 'label' => 'Grade', 'guidance' => 'Share the grade ID.']],
        'requestTdsCta' => ['label' => 'Request TDS', 'description' => 'Ask for the technical data sheet.'],
        'discussApplicationCta' => ['label' => 'Discuss your application', 'description' => 'Tell us about the use case.'],
        'technicalDisclaimer' => '<p>Typical properties require evaluation.</p>',
    ] === $normalized_settings,
    'Shared Product settings did not normalize to the stable public shape.'
);

fwrite(STDOUT, "TiO2 Product field contract passed\n");
