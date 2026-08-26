<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_product_id_pattern(): string
{
    return '/^TP-[A-Z]{1,2}[0-9]{3}$/';
}

function tio2_product_slug_from_id(string $product_id): string
{
    return strtolower($product_id);
}

function tio2_product_path_from_id(string $product_id): string
{
    return '/products/' . tio2_product_slug_from_id($product_id);
}

function tio2_product_site_id(int $post_id): ?string
{
    $site_scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes)) {
        return null;
    }

    $site_scopes = array_values(array_unique(array_map('strval', $site_scopes)));
    return ['tio2-a'] === $site_scopes ? 'tio2-a' : null;
}

function tio2_product_contract_has_value($value): bool
{
    if (is_string($value)) {
        return '' !== trim($value);
    }
    if (is_array($value)) {
        return [] !== $value;
    }
    if (is_int($value) || is_float($value)) {
        return 0 !== $value;
    }

    return null !== $value && false !== $value;
}

/**
 * @param array<string, mixed> $container
 * @param array<string, mixed> $field
 */
function tio2_product_contract_nested_field_value(array $container, array $field)
{
    $field_name = (string) ($field['name'] ?? '');
    $field_key = (string) ($field['key'] ?? '');

    return $container[$field_name] ?? $container[$field_key] ?? null;
}

/**
 * @param array<string, mixed> $field
 * @return true|WP_Error
 */
function tio2_validate_product_field_definition(array $field, $value)
{
    $field_name = (string) ($field['name'] ?? 'unknown');
    $field_type = (string) ($field['type'] ?? '');

    if ('repeater' === $field_type) {
        $items = is_array($value) ? array_values($value) : [];
        $count = count($items);
        $minimum = (int) ($field['min'] ?? 0);
        $maximum = (int) ($field['max'] ?? 0);
        if ($count < $minimum || (0 !== $maximum && $count > $maximum)) {
            return new WP_Error(
                'product_list_out_of_bounds',
                "Product field {$field_name} is outside its configured list bounds.",
                ['field' => $field_name]
            );
        }

        foreach ($items as $item) {
            if (! is_array($item)) {
                return new WP_Error(
                    'product_field_missing',
                    "Product field {$field_name} contains an invalid list item.",
                    ['field' => $field_name]
                );
            }
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                if (! is_array($sub_field) || empty($sub_field['required'])) {
                    continue;
                }
                $sub_field_name = (string) ($sub_field['name'] ?? 'unknown');
                if (! tio2_product_contract_has_value(tio2_product_contract_nested_field_value($item, $sub_field))) {
                    return new WP_Error(
                        'product_field_missing',
                        "Product field {$field_name}.{$sub_field_name} is required.",
                        ['field' => $field_name, 'subfield' => $sub_field_name]
                    );
                }
            }
        }

        return true;
    }

    if (! empty($field['required']) && ! tio2_product_contract_has_value($value)) {
        return new WP_Error(
            'product_field_missing',
            "Product field {$field_name} is required.",
            ['field' => $field_name]
        );
    }

    if ('group' === $field_type && is_array($value)) {
        foreach ($field['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field) || empty($sub_field['required'])) {
                continue;
            }
            $sub_field_name = (string) ($sub_field['name'] ?? 'unknown');
            if (! tio2_product_contract_has_value(tio2_product_contract_nested_field_value($value, $sub_field))) {
                return new WP_Error(
                    'product_field_missing',
                    "Product field {$field_name}.{$sub_field_name} is required.",
                    ['field' => $field_name, 'subfield' => $sub_field_name]
                );
            }
        }
    }

    return true;
}

/**
 * @param list<array<string, mixed>> $definitions
 * @return true|WP_Error
 */
function tio2_validate_product_field_definitions(array $definitions, $post_id): mixed
{
    foreach ($definitions as $field) {
        if (! is_array($field)) {
            continue;
        }
        $field_name = (string) ($field['name'] ?? '');
        if ('' === $field_name) {
            continue;
        }
        $value = get_field($field_name, $post_id, false);
        $validation = tio2_validate_product_field_definition($field, $value);
        if (is_wp_error($validation)) {
            return $validation;
        }
    }

    return true;
}

/**
 * @return true|WP_Error
 */
function tio2_validate_product_contract(int $post_id)
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_product' !== $post->post_type || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return new WP_Error('product_invalid_post', 'Product validation requires a Product content record.');
    }
    if (! function_exists('get_field')) {
        return new WP_Error('product_field_missing', 'Product validation requires Advanced Custom Fields.');
    }

    $product_id = get_field('product_id', $post_id, false);
    if (! is_string($product_id) || 1 !== preg_match(tio2_product_id_pattern(), $product_id)) {
        return new WP_Error('product_id_invalid', 'Product ID must match the canonical Product ID pattern.');
    }
    if (tio2_product_site_id($post_id) !== 'tio2-a') {
        return new WP_Error('product_scope_invalid', 'Product records require exactly one Site A scope.');
    }
    if (tio2_product_slug_from_id($product_id) !== $post->post_name) {
        return new WP_Error('product_slug_invalid', 'Product slug must be the lowercase Product ID.');
    }

    $duplicate_ids = get_posts([
        'post_type' => 'tio2_product',
        'post_status' => 'any',
        'fields' => 'ids',
        'posts_per_page' => 2,
        'post__not_in' => [$post_id],
        'meta_key' => 'product_id',
        'meta_value' => $product_id,
        'no_found_rows' => true,
    ]);
    if ([] !== $duplicate_ids) {
        return new WP_Error('product_id_duplicate', 'Another Product already uses this Product ID.');
    }

    $product_fields_validation = tio2_validate_product_field_definitions(tio2_product_field_definitions(), $post_id);
    if (is_wp_error($product_fields_validation)) {
        return $product_fields_validation;
    }

    return tio2_validate_product_field_definitions(tio2_product_shared_field_definitions(), 'option');
}

function tio2_product_contract_notice_key(int $post_id): string
{
    return 'tio2_product_contract_error_' . $post_id;
}

function tio2_save_product_contract_feedback(int $post_id): void
{
    static $normalizing = false;

    if ($normalizing || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || 'tio2_product' !== get_post_type($post_id)) {
        return;
    }
    if (! function_exists('get_field')) {
        return;
    }

    $product_id = get_field('product_id', $post_id, false);
    if (is_string($product_id) && 1 === preg_match(tio2_product_id_pattern(), $product_id)) {
        $canonical_slug = tio2_product_slug_from_id($product_id);
        if ($canonical_slug !== get_post_field('post_name', $post_id)) {
            $normalizing = true;
            try {
                wp_update_post(['ID' => $post_id, 'post_name' => $canonical_slug]);
            } finally {
                $normalizing = false;
            }
        }
    }

    $validation = tio2_validate_product_contract($post_id);
    if (is_wp_error($validation)) {
        set_transient(
            tio2_product_contract_notice_key($post_id),
            ['code' => $validation->get_error_code(), 'message' => $validation->get_error_message()],
            MINUTE_IN_SECONDS
        );
        return;
    }

    delete_transient(tio2_product_contract_notice_key($post_id));
}

function tio2_product_contract_admin_notice(): void
{
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id <= 0 || 'tio2_product' !== get_post_type($post_id)) {
        return;
    }

    $notice = get_transient(tio2_product_contract_notice_key($post_id));
    if (! is_array($notice) || ! isset($notice['message']) || ! is_string($notice['message'])) {
        return;
    }

    printf('<div class="notice notice-warning"><p>%s</p></div>', esc_html($notice['message']));
    delete_transient(tio2_product_contract_notice_key($post_id));
}
