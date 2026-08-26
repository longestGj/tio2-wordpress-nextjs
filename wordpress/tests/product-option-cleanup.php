<?php

if (! defined('ABSPATH')) {
    exit(1);
}

/**
 * Delete ACF option values created for a Product shared-settings field.
 *
 * ACF repeaters persist one option for the row count plus a pair of options
 * for every indexed sub-field. Removing only the parent leaves those rows
 * behind, so clear the known numeric row keys and their ACF references too.
 *
 * @param array<string, mixed> $field
 */
function tio2_product_test_delete_created_option_field(array $field, string $parent_name = ''): void
{
    $field_name = (string) ($field['name'] ?? '');
    $option_name = '' === $parent_name ? $field_name : $parent_name . '_' . $field_name;
    if ('' === $option_name) {
        return;
    }

    delete_option('options_' . $option_name);
    delete_option('_options_' . $option_name);

    if ('repeater' === ($field['type'] ?? '')) {
        global $wpdb;

        $indexed_row_pattern = '^(options|_options)_' . preg_quote($option_name, '/') . '_[0-9]+_';
        $indexed_option_names = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT option_name FROM {$wpdb->options} WHERE option_name REGEXP %s",
                $indexed_row_pattern
            )
        );
        foreach ($indexed_option_names as $indexed_option_name) {
            delete_option((string) $indexed_option_name);
        }
    }

    if (function_exists('acf_flush_value_cache')) {
        acf_flush_value_cache('options', $option_name);
    }

    foreach ($field['sub_fields'] ?? [] as $sub_field) {
        if (is_array($sub_field)) {
            tio2_product_test_delete_created_option_field($sub_field, $option_name);
        }
    }
}
