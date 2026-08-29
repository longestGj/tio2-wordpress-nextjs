<?php

if (! defined('ABSPATH')) {
    exit(1);
}

function tio2_product_collection_contract_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        tio2_product_collection_contract_test_cleanup();
        fwrite(STDERR, $message . "\n");
        exit(1);
    }
}

function assert_same($expected, $actual, string $message): void
{
    tio2_product_collection_contract_test_assert($expected === $actual, $message);
}

foreach ([
    'tio2_validate_products_hub_contract',
    'tio2_validate_product_family_contract',
    'tio2_product_family_slug_for_post',
    'tio2_product_canonical_path',
] as $function_name) {
    tio2_product_collection_contract_test_assert(function_exists($function_name), "Missing Product collection contract function: {$function_name}().");
}

/** @var list<int> */
$GLOBALS['tio2_product_collection_contract_test_post_ids'] = [];
/** @var list<int> */
$GLOBALS['tio2_product_collection_contract_test_term_ids'] = [];
/** @var array<string, array<string, mixed>> */
$GLOBALS['tio2_product_collection_contract_test_field_restore'] = [];

function tio2_product_collection_contract_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_product_collection_contract_test_post_ids'] as $post_id) {
        wp_delete_post($post_id, true);
    }
    foreach ($GLOBALS['tio2_product_collection_contract_test_field_restore'] as $object_id => $fields) {
        foreach ($fields as $field_key => $value) {
            update_field($field_key, $value, $object_id);
        }
    }
    foreach ($GLOBALS['tio2_product_collection_contract_test_term_ids'] as $term_id) {
        wp_delete_term($term_id, 'product_family');
    }
    $GLOBALS['tio2_product_collection_contract_test_post_ids'] = [];
    $GLOBALS['tio2_product_collection_contract_test_term_ids'] = [];
    $GLOBALS['tio2_product_collection_contract_test_field_restore'] = [];
}

register_shutdown_function('tio2_product_collection_contract_test_cleanup');

function tio2_product_collection_contract_test_error_code($result): ?string
{
    return is_wp_error($result) ? $result->get_error_code() : null;
}

function tio2_product_collection_contract_test_insert_term(string $slug): int
{
    $existing = get_term_by('slug', $slug, 'product_family');
    if ($existing instanceof WP_Term) {
        return (int) $existing->term_id;
    }
    $term = wp_insert_term(ucwords(str_replace('-', ' ', $slug)), 'product_family', ['slug' => $slug]);
    if (is_wp_error($term)) {
        fwrite(STDERR, "Could not create Product family fixture {$slug}.\n");
        exit(1);
    }
    $term_id = (int) $term['term_id'];
    $GLOBALS['tio2_product_collection_contract_test_term_ids'][] = $term_id;
    return $term_id;
}

function tio2_product_collection_contract_test_remember_fields(array $definitions, string $object_id): void
{
    foreach ($definitions as $field) {
        $GLOBALS['tio2_product_collection_contract_test_field_restore'][$object_id][(string) $field['key']] = get_field((string) $field['name'], $object_id, false);
    }
}

function tio2_product_collection_contract_test_value_for_field(array $field): mixed
{
    $name = (string) ($field['name'] ?? '');
    $type = (string) ($field['type'] ?? '');
    if ('image' === $type) {
        return 1;
    }
    if ('relationship' === $type) {
        return [];
    }
    if ('repeater' === $type) {
        $rows = [];
        $count = max(1, (int) ($field['min'] ?? 0));
        for ($index = 0; $index < $count; ++$index) {
            $row = [];
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                $sub_name = (string) ($sub_field['name'] ?? '');
                $row[$sub_name] = 'slug' === $sub_name
                    ? 'application'
                    : ('label' === $sub_name ? 'Application' : ('answer' === $sub_name ? '<p>Answer</p>' : 'Copy'));
            }
            $rows[] = $row;
        }
        return $rows;
    }
    return 'wysiwyg' === $type ? '<p>Copy</p>' : ('filters' === $name ? [] : 'Copy');
}

function tio2_product_collection_contract_test_insert_product(string $product_id, int $family_id, int $order, ?string $site_scope = 'tio2-a'): int
{
    $post_id = wp_insert_post([
        'post_type' => 'tio2_product',
        'post_status' => 'draft',
        'post_title' => $product_id,
        'post_name' => strtolower($product_id),
    ], true);
    if (is_wp_error($post_id)) {
        fwrite(STDERR, "Could not create Product fixture {$product_id}.\n");
        exit(1);
    }
    $post_id = (int) $post_id;
    $GLOBALS['tio2_product_collection_contract_test_post_ids'][] = $post_id;
    if (null !== $site_scope) {
        wp_set_object_terms($post_id, [$site_scope], 'site_scope', false);
    }
    wp_set_object_terms($post_id, [$family_id], 'product_family', false);
    update_field('field_tio2_product_id', $product_id, $post_id);
    update_field('field_tio2_product_collection_family_display_order', $order, $post_id);
    update_field('field_tio2_product_collection_family_card_summary', 'Card summary', $post_id);
    update_field('field_tio2_product_collection_application_focus', 'Application focus', $post_id);
    update_field('field_tio2_product_collection_performance_focus', 'Performance focus', $post_id);
    update_field('field_tio2_product_collection_surface_treatment_positioning', 'Surface treatment positioning', $post_id);
    update_field('field_tio2_product_collection_filter_tags', ['water'], $post_id);
    return $post_id;
}

function tio2_product_collection_contract_test_fill_family(int $term_id): void
{
    $term = get_term($term_id, 'product_family');
    foreach (tio2_product_family_field_definitions() as $field) {
        $name = (string) $field['name'];
        $value = 'filters' === $name && $term instanceof WP_Term && 'coatings' === $term->slug
            ? array_map(
                static fn (string $label, string $slug): array => ['slug' => $slug, 'label' => $label],
                tio2_product_collection_coatings_filters(),
                array_keys(tio2_product_collection_coatings_filters())
            )
            : tio2_product_collection_contract_test_value_for_field($field);
        update_field((string) $field['key'], $value, 'product_family_' . $term_id);
    }
}

$families = [];
foreach (['coatings', 'plastics-masterbatch', 'engineering-plastics', 'decorative-paper', 'printing-inks', 'solar-film', 'high-purity-functional', 'universal'] as $slug) {
    $families[$slug] = tio2_product_collection_contract_test_insert_term($slug);
    tio2_product_collection_contract_test_remember_fields(tio2_product_family_field_definitions(), 'product_family_' . $families[$slug]);
    tio2_product_collection_contract_test_fill_family($families[$slug]);
}

$tp_c120_post_id = tio2_product_collection_contract_test_insert_product('TP-C120', $families['coatings'], 1);
foreach (['TP-C050', 'TP-C100', 'TP-C110', 'TP-C200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-C410'] as $index => $product_id) {
    tio2_product_collection_contract_test_insert_product($product_id, $families['coatings'], $index + 2);
}

assert_same('/products/coatings/tp-c120', tio2_product_canonical_path($tp_c120_post_id), 'TP-C120 path mismatch');
$coatings_validation = tio2_validate_product_family_contract($families['coatings']);
tio2_product_collection_contract_test_assert(true === $coatings_validation, 'Valid Coatings Family contract was rejected: ' . (is_wp_error($coatings_validation) ? $coatings_validation->get_error_code() : 'unknown'));

$hub_fields = [];
tio2_product_collection_contract_test_remember_fields(tio2_product_hub_field_definitions(), 'option');
foreach (tio2_product_hub_field_definitions() as $field) {
    $name = (string) $field['name'];
    $hub_fields[$name] = 'families' === $name
        ? array_map(static fn (int $term_id): array => ['family' => $term_id], array_values($families))
        : tio2_product_collection_contract_test_value_for_field($field);
    update_field((string) $field['key'], $hub_fields[$name], 'option');
}
tio2_product_collection_contract_test_assert(true === tio2_validate_products_hub_contract('tio2-a'), 'Complete Products Hub contract was rejected.');

update_field('field_tio2_products_hub_hero_image', false, 'option');
tio2_product_collection_contract_test_assert('products_hub_field_missing' === tio2_product_collection_contract_test_error_code(tio2_validate_products_hub_contract('tio2-a')), 'Missing Hub Hero did not fail closed.');
update_field('field_tio2_products_hub_hero_image', 1, 'option');

update_field('field_tio2_products_hub_families', array_merge(array_slice($hub_fields['families'], 0, 7), [['family' => $families['coatings']]]), 'option');
tio2_product_collection_contract_test_assert('products_hub_families_invalid' === tio2_product_collection_contract_test_error_code(tio2_validate_products_hub_contract('tio2-a')), 'Duplicate Hub Family did not fail closed.');
update_field('field_tio2_products_hub_families', array_slice($hub_fields['families'], 0, 7), 'option');
tio2_product_collection_contract_test_assert('products_hub_families_invalid' === tio2_product_collection_contract_test_error_code(tio2_validate_products_hub_contract('tio2-a')), 'Hub Family count mismatch did not fail closed.');
update_field('field_tio2_products_hub_families', $hub_fields['families'], 'option');

update_field('field_tio2_product_collection_filter_tags', ['uncontrolled-filter'], $tp_c120_post_id);
tio2_product_collection_contract_test_assert('product_collection_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'Uncontrolled Product filter tag did not fail closed.');
update_field('field_tio2_product_collection_filter_tags', ['water'], $tp_c120_post_id);

update_field('field_tio2_product_collection_filter_tags', ['performance'], $tp_c120_post_id);
tio2_product_collection_contract_test_assert('product_collection_filter_unavailable' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'A globally valid but Family-unconfigured Product filter tag did not fail closed.');
update_field('field_tio2_product_collection_filter_tags', ['all'], $tp_c120_post_id);
tio2_product_collection_contract_test_assert('product_collection_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'The Family-only all sentinel was accepted as a Product filter tag.');
update_field('field_tio2_product_collection_filter_tags', 'uncontrolled-filter', $tp_c120_post_id);
tio2_product_collection_contract_test_assert('product_collection_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'A scalar Product filter tag did not fail closed.');
update_field('field_tio2_product_collection_filter_tags', ['water' => 'water'], $tp_c120_post_id);
tio2_product_collection_contract_test_assert('product_collection_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'A malformed Product filter tag list did not fail closed.');
update_field('field_tio2_product_collection_filter_tags', ['water'], $tp_c120_post_id);

$coatings_filters = array_map(
    static fn (string $label, string $slug): array => ['slug' => $slug, 'label' => $label],
    tio2_product_collection_coatings_filters(),
    array_keys(tio2_product_collection_coatings_filters())
);
update_field('field_tio2_product_family_filters', array_reverse($coatings_filters), 'product_family_' . $families['coatings']);
tio2_product_collection_contract_test_assert('product_family_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_validate_product_family_contract($families['coatings'])), 'Reordered Coatings filters did not fail closed.');
update_field('field_tio2_product_family_filters', array_slice($coatings_filters, 1), 'product_family_' . $families['coatings']);
tio2_product_collection_contract_test_assert('product_family_filter_invalid' === tio2_product_collection_contract_test_error_code(tio2_validate_product_family_contract($families['coatings'])), 'Coatings filters without the all sentinel did not fail closed.');
update_field('field_tio2_product_family_filters', $coatings_filters, 'product_family_' . $families['coatings']);

$site_b_product_id = tio2_product_collection_contract_test_insert_product('TP-C050', $families['coatings'], 20, 'tio2-b');
$unscoped_product_id = tio2_product_collection_contract_test_insert_product('TP-C200', $families['coatings'], 1, null);
tio2_product_collection_contract_test_assert(true === tio2_validate_product_family_contract($families['coatings']), 'A Site B or unscoped Product polluted the Site A Family member contract.');
assert_same('/products/coatings/tp-c120', tio2_product_canonical_path($tp_c120_post_id), 'A Site B or unscoped Product polluted Site A Family display order.');

$unknown_post_id = tio2_product_collection_contract_test_insert_product('TP-Z999', $families['coatings'], 10);
tio2_product_collection_contract_test_assert('product_collection_product_unknown' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($unknown_post_id)), 'Unknown Product did not fail closed.');
wp_delete_post($unknown_post_id, true);

update_field('field_tio2_product_collection_family_display_order', 1, $GLOBALS['tio2_product_collection_contract_test_post_ids'][1]);
tio2_product_collection_contract_test_assert('product_collection_display_order_duplicate' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'Duplicate Product display order did not fail closed.');
update_field('field_tio2_product_collection_family_display_order', 2, $GLOBALS['tio2_product_collection_contract_test_post_ids'][1]);

wp_set_object_terms($tp_c120_post_id, [$families['universal']], 'product_family', false);
tio2_product_collection_contract_test_assert('product_collection_family_mismatch' === tio2_product_collection_contract_test_error_code(tio2_product_canonical_path($tp_c120_post_id)), 'Wrong-family Product did not fail closed.');
wp_set_object_terms($tp_c120_post_id, [$families['coatings']], 'product_family', false);

update_field('field_tio2_product_family_comparison_introduction', '', 'product_family_' . $families['coatings']);
tio2_product_collection_contract_test_assert('product_family_field_missing' === tio2_product_collection_contract_test_error_code(tio2_validate_product_family_contract($families['coatings'])), 'Missing Family comparison copy did not fail closed.');
update_field('field_tio2_product_family_comparison_introduction', 'Copy', 'product_family_' . $families['coatings']);

tio2_product_collection_contract_test_assert(true === tio2_validate_product_family_contract($families['coatings']), 'Valid Coatings with exact nine IDs was rejected.');
tio2_product_collection_contract_test_cleanup();
fwrite(STDOUT, "TiO2 Product collection contract test passed\n");
