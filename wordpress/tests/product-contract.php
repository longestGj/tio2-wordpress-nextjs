<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_product_contract_test_post_ids'] = [];
$GLOBALS['tio2_product_contract_test_term_ids'] = [];
$GLOBALS['tio2_product_contract_test_option_values'] = [];
$GLOBALS['tio2_product_contract_test_errors'] = [];

function tio2_product_contract_test_fail(string $message): void
{
    tio2_product_contract_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_product_contract_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_product_contract_test_errors'][] = $message;
    }
}

function tio2_product_contract_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_product_contract_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id) instanceof WP_Post) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_product_contract_test_post_ids'] = [];

    foreach ($GLOBALS['tio2_product_contract_test_term_ids'] ?? [] as $term_id) {
        if (term_exists((int) $term_id, 'product_family')) {
            wp_delete_term((int) $term_id, 'product_family');
        }
    }
    $GLOBALS['tio2_product_contract_test_term_ids'] = [];

    foreach ($GLOBALS['tio2_product_contract_test_option_values'] ?? [] as $field_name => $field_state) {
        $field_key = (string) $field_state['key'];
        $value = $field_state['value'];
        if (false === $value) {
            foreach (tio2_product_shared_field_definitions() as $field) {
                if (is_array($field) && $field_name === ($field['name'] ?? null)) {
                    tio2_product_contract_test_delete_shared_option($field);
                }
            }
            continue;
        }
        update_field($field_key, $value, 'option');
    }
    $GLOBALS['tio2_product_contract_test_option_values'] = [];
}

/**
 * @return int
 */
function tio2_product_contract_test_insert(string $suffix): int
{
    $post_id = wp_insert_post([
        'post_type' => 'tio2_product',
        'post_status' => 'draft',
        'post_title' => 'Product contract fixture ' . $suffix,
        'post_name' => 'wrong-product-slug-' . $suffix,
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_product_contract_test_fail('Could not create Product contract fixture: ' . $suffix);
    }

    $GLOBALS['tio2_product_contract_test_post_ids'][] = (int) $post_id;
    return (int) $post_id;
}

function tio2_product_contract_test_field_value(array $field, int $family_id, int $application_id): mixed
{
    $name = (string) ($field['name'] ?? '');
    $type = (string) ($field['type'] ?? '');

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
            $group[$sub_name] = ucfirst(str_replace('_', ' ', $sub_name));
        }
        return $group;
    }

    return 'wysiwyg' === $type
        ? '<p>' . ucfirst(str_replace('_', ' ', $name)) . '</p>'
        : ucfirst(str_replace('_', ' ', $name));
}

function tio2_product_contract_test_fill_valid_product(int $post_id, string $product_id, int $family_id, int $application_id): void
{
    foreach (tio2_product_field_definitions() as $field) {
        if (! is_array($field) || empty($field['required'])) {
            continue;
        }
        $value = 'product_id' === ($field['name'] ?? null)
            ? $product_id
            : tio2_product_contract_test_field_value($field, $family_id, $application_id);
        update_field((string) $field['key'], $value, $post_id);
    }
}

function tio2_product_contract_test_set_shared_settings(): void
{
    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field)) {
            continue;
        }
        $field_key = (string) $field['key'];
        $field_name = (string) $field['name'];
        if (! array_key_exists($field_name, $GLOBALS['tio2_product_contract_test_option_values'])) {
            $GLOBALS['tio2_product_contract_test_option_values'][$field_name] = [
                'key' => $field_key,
                'value' => get_field($field_name, 'option', false),
            ];
        }
        update_field(
            $field_key,
            tio2_product_contract_test_field_value($field, 0, 0),
            'option'
        );
    }
}

function tio2_product_contract_test_error_code($validation): ?string
{
    return is_wp_error($validation) ? $validation->get_error_code() : null;
}

function tio2_product_contract_test_delete_shared_option(array $field, string $parent_name = ''): void
{
    $field_name = (string) ($field['name'] ?? '');
    $option_name = $parent_name;
    if ('' !== $field_name) {
        $option_name = '' === $parent_name ? $field_name : $parent_name . '_' . $field_name;
        delete_option('options_' . $option_name);
        delete_option('_options_' . $option_name);
        if (function_exists('acf_flush_value_cache')) {
            acf_flush_value_cache('options', $option_name);
        }
    }

    foreach ($field['sub_fields'] ?? [] as $sub_field) {
        if (is_array($sub_field)) {
            tio2_product_contract_test_delete_shared_option($sub_field, $option_name ?? $parent_name);
        }
    }
}

register_shutdown_function('tio2_product_contract_test_cleanup');

foreach ([
    'tio2_product_id_pattern',
    'tio2_product_slug_from_id',
    'tio2_product_path_from_id',
    'tio2_product_site_id',
    'tio2_validate_product_contract',
] as $function_name) {
    tio2_product_contract_test_assert(function_exists($function_name), "Missing Product contract helper: {$function_name}().");
}

if ([] !== $GLOBALS['tio2_product_contract_test_errors']) {
    tio2_product_contract_test_fail(implode("\n", $GLOBALS['tio2_product_contract_test_errors']));
}

tio2_product_contract_test_assert(
    '/^TP-[A-Z]{1,2}[0-9]{3}$/' === tio2_product_id_pattern(),
    'Product ID pattern drifted from the public identity contract.'
);
foreach (['TP-A001', 'TP-C120', 'TP-AB999'] as $product_id) {
    tio2_product_contract_test_assert(
        1 === preg_match(tio2_product_id_pattern(), $product_id),
        "Valid Product ID {$product_id} was rejected."
    );
}
foreach (['TP-A01', 'TP-ABC123', 'tp-C120', 'TP-C120 ', 'GRADE-C120'] as $product_id) {
    tio2_product_contract_test_assert(
        1 !== preg_match(tio2_product_id_pattern(), $product_id),
        "Invalid Product ID {$product_id} was accepted."
    );
}
tio2_product_contract_test_assert(
    'tp-c120' === tio2_product_slug_from_id('TP-C120') &&
        '/products/tp-c120' === tio2_product_path_from_id('TP-C120'),
    'Product identity did not derive the canonical slug and internal path.'
);

$fixture_suffix = (string) microtime(true);
$family = wp_insert_term('Product Contract Family ' . $fixture_suffix, 'product_family', ['slug' => 'product-contract-family-' . str_replace('.', '-', $fixture_suffix)]);
if (is_wp_error($family)) {
    tio2_product_contract_test_fail('Could not create Product family fixture.');
}
$GLOBALS['tio2_product_contract_test_term_ids'][] = (int) $family['term_id'];
$application_id = wp_insert_post([
    'post_type' => 'tio2_application',
    'post_status' => 'draft',
    'post_title' => 'Product contract application',
], true);
if (is_wp_error($application_id) || $application_id <= 0) {
    tio2_product_contract_test_fail('Could not create Product application fixture.');
}
$GLOBALS['tio2_product_contract_test_post_ids'][] = (int) $application_id;

tio2_product_contract_test_set_shared_settings();
$product_id = tio2_product_contract_test_insert('valid');
tio2_product_contract_test_fill_valid_product($product_id, 'TP-Z901', (int) $family['term_id'], (int) $application_id);
wp_set_object_terms($product_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', $product_id);
$valid_product_validation = tio2_validate_product_contract($product_id);
tio2_product_contract_test_assert(
    true === $valid_product_validation,
    'A complete Site A Product contract was rejected: ' . (
        is_wp_error($valid_product_validation) ? $valid_product_validation->get_error_message() : 'unknown'
    )
);
tio2_product_contract_test_assert(
    'tio2-a' === tio2_product_site_id($product_id) &&
        'tp-z901' === get_post_field('post_name', $product_id),
    'A complete Site A Product did not retain its Site A identity and canonical slug.'
);

update_field('field_tio2_product_id', 'TP-Z90', $product_id);
tio2_product_contract_test_assert(
    'product_id_invalid' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'An invalid Product ID did not return product_id_invalid.'
);
update_field('field_tio2_product_id', 'TP-Z901', $product_id);

$duplicate_id = tio2_product_contract_test_insert('duplicate');
tio2_product_contract_test_fill_valid_product($duplicate_id, 'TP-Z901', (int) $family['term_id'], (int) $application_id);
wp_set_object_terms($duplicate_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', $duplicate_id);
tio2_product_contract_test_assert(
    'product_id_duplicate' === tio2_product_contract_test_error_code(tio2_validate_product_contract($duplicate_id)),
    'A duplicate Product ID did not return product_id_duplicate.'
);
update_field('field_tio2_product_id', 'TP-Z902', $duplicate_id);

foreach ([['tio2-b'], [], ['tio2-a', 'tio2-b']] as $scopes) {
    wp_set_object_terms($product_id, $scopes, 'site_scope', false);
    tio2_product_contract_test_assert(
        null === tio2_product_site_id($product_id) &&
            'product_scope_invalid' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
        'A Product without exactly one Site A scope was accepted.'
    );
}
wp_set_object_terms($product_id, ['tio2-a'], 'site_scope', false);

update_field('field_tio2_product_meta_title', '', $product_id);
tio2_product_contract_test_assert(
    'product_field_missing' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A missing required Product scalar field did not return product_field_missing.'
);
update_field('field_tio2_product_meta_title', 'Meta title', $product_id);

update_field('field_tio2_product_fit_when', [['item' => 'Only one'], ['item' => 'Only two']], $product_id);
tio2_product_contract_test_assert(
    'product_list_out_of_bounds' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A Product list below its configured minimum was accepted.'
);
update_field('field_tio2_product_fit_when', [
    ['item' => 'One'], ['item' => 'Two'], ['item' => 'Three'], ['item' => 'Four'], ['item' => 'Five'], ['item' => 'Six'],
], $product_id);
tio2_product_contract_test_assert(
    'product_list_out_of_bounds' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A Product list above its configured maximum was accepted.'
);
tio2_product_contract_test_fill_valid_product($product_id, 'TP-Z901', (int) $family['term_id'], (int) $application_id);

update_field('field_tio2_product_typical_properties', [], $product_id);
tio2_product_contract_test_assert(
    'product_list_out_of_bounds' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A Product without typical properties was accepted.'
);
tio2_product_contract_test_fill_valid_product($product_id, 'TP-Z901', (int) $family['term_id'], (int) $application_id);

update_field('field_tio2_product_faq_items', array_fill(0, 5, ['question' => 'Question', 'answer' => '<p>Answer</p>']), $product_id);
tio2_product_contract_test_assert(
    'product_list_out_of_bounds' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A Product below the FAQ minimum was accepted.'
);
update_field('field_tio2_product_faq_items', array_fill(0, 11, ['question' => 'Question', 'answer' => '<p>Answer</p>']), $product_id);
tio2_product_contract_test_assert(
    'product_list_out_of_bounds' === tio2_product_contract_test_error_code(tio2_validate_product_contract($product_id)),
    'A Product above the FAQ maximum was accepted.'
);
tio2_product_contract_test_fill_valid_product($product_id, 'TP-Z901', (int) $family['term_id'], (int) $application_id);

foreach (tio2_product_shared_field_definitions() as $field) {
    if ('technical_disclaimer' === ($field['name'] ?? null)) {
        tio2_product_contract_test_delete_shared_option($field);
    }
}
$missing_shared_validation = tio2_validate_product_contract($product_id);
tio2_product_contract_test_assert(
    'product_field_missing' === tio2_product_contract_test_error_code($missing_shared_validation),
    'Missing shared Product settings did not return product_field_missing.'
);
tio2_product_contract_test_set_shared_settings();

tio2_product_contract_test_assert(
    false === tio2_product_has_approved_public_route(),
    'Product route activation regressed while adding Product contract validation.'
);
$incomplete_id = tio2_product_contract_test_insert('incomplete-publication');
wp_update_post(['ID' => $incomplete_id, 'post_status' => 'publish']);
tio2_product_contract_test_assert('draft' === get_post_status($incomplete_id), 'An incomplete Product publish transition did not become draft.');
wp_update_post([
    'ID' => $incomplete_id,
    'post_status' => 'future',
    'post_date' => '2036-08-24 12:00:00',
    'post_date_gmt' => '2036-08-24 12:00:00',
]);
tio2_product_contract_test_assert('draft' === get_post_status($incomplete_id), 'An incomplete Product future transition did not become draft.');

if ([] !== $GLOBALS['tio2_product_contract_test_errors']) {
    tio2_product_contract_test_fail(implode("\n", $GLOBALS['tio2_product_contract_test_errors']));
}

tio2_product_contract_test_cleanup();
fwrite(STDOUT, "TiO2 Product contract test passed\n");
