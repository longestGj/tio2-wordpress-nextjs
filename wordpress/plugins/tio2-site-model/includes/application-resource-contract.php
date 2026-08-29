<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return list<string>
 */
function tio2_application_resource_site_scopes(int $post_id): array
{
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        return [];
    }

    $scopes = array_values(array_unique(array_map('strval', $scopes)));
    sort($scopes, SORT_STRING);
    return $scopes;
}

function tio2_application_resource_is_exact_site_a(int $post_id): bool
{
    return ['tio2-a'] === tio2_application_resource_site_scopes($post_id);
}

/**
 * @param mixed $value
 */
function tio2_editorial_field_has_value($value): bool
{
    if (is_string($value)) {
        return '' !== trim(wp_strip_all_tags($value));
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
 * @param mixed $value
 * @return list<int>
 */
function tio2_editorial_relationship_ids($value): array
{
    $values = is_array($value) ? array_values($value) : [$value];
    $ids = [];
    foreach ($values as $item) {
        $id = $item instanceof WP_Post ? (int) $item->ID : (is_numeric($item) ? (int) $item : 0);
        if ($id > 0) {
            $ids[] = $id;
        }
    }
    return array_values(array_unique($ids));
}

/**
 * @param array<string, mixed> $container
 * @param array<string, mixed> $field
 * @return mixed
 */
function tio2_editorial_nested_field_value(array $container, array $field)
{
    $name = (string) ($field['name'] ?? '');
    $key = (string) ($field['key'] ?? '');
    return $container[$name] ?? $container[$key] ?? null;
}

/**
 * @param array<string, mixed> $field
 * @param mixed                $value
 * @return list<string>
 */
function tio2_validate_editorial_field(array $field, $value, string $path): array
{
    $errors = [];
    $type = (string) ($field['type'] ?? '');
    $required = ! empty($field['required']);

    if ($required && ! tio2_editorial_field_has_value($value)) {
        return ["{$path} is required."];
    }
    if (! tio2_editorial_field_has_value($value)) {
        return [];
    }

    if (isset($field['maxlength']) && is_scalar($value)) {
        $length = function_exists('mb_strlen') ? mb_strlen((string) $value) : strlen((string) $value);
        if ($length > (int) $field['maxlength']) {
            $errors[] = "{$path} exceeds its maximum length of {$field['maxlength']}.";
        }
    }

    if ('select' === $type) {
        $choices = is_array($field['choices'] ?? null) ? $field['choices'] : [];
        if (! is_scalar($value) || ! array_key_exists((string) $value, $choices)) {
            $errors[] = "{$path} has an unsupported value.";
        }
        return $errors;
    }

    if ('relationship' === $type) {
        $ids = tio2_editorial_relationship_ids($value);
        $raw_count = is_array($value) ? count($value) : (tio2_editorial_field_has_value($value) ? 1 : 0);
        $maximum = (int) ($field['max'] ?? 0);
        if ($raw_count !== count($ids)) {
            $errors[] = "{$path} must contain only stable WordPress post IDs.";
        }
        if (0 !== $maximum && count($ids) > $maximum) {
            $errors[] = "{$path} exceeds its maximum of {$maximum} relationships.";
        }
        $expected_types = is_array($field['post_type'] ?? null) ? $field['post_type'] : [];
        foreach ($ids as $index => $target_id) {
            $target = get_post($target_id);
            if (! $target instanceof WP_Post || ! in_array($target->post_type, $expected_types, true)) {
                $errors[] = "{$path}.{$index} must reference the expected post type.";
                continue;
            }
            if (! tio2_application_resource_is_exact_site_a($target_id)) {
                $errors[] = "{$path}.{$index} must reference an exact Site A record.";
            }
        }
        return $errors;
    }

    if ('repeater' === $type) {
        $items = is_array($value) ? array_values($value) : [];
        $minimum = (int) ($field['min'] ?? 0);
        $maximum = (int) ($field['max'] ?? 0);
        if (count($items) < $minimum || (0 !== $maximum && count($items) > $maximum)) {
            $errors[] = "{$path} must contain between {$minimum} and {$maximum} items.";
        }
        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                $errors[] = "{$path}.{$index} must be a structured item.";
                continue;
            }
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                if (! is_array($sub_field)) {
                    continue;
                }
                $sub_name = (string) ($sub_field['name'] ?? 'unknown');
                $errors = array_merge(
                    $errors,
                    tio2_validate_editorial_field(
                        $sub_field,
                        tio2_editorial_nested_field_value($item, $sub_field),
                        "{$path}.{$index}.{$sub_name}"
                    )
                );
            }
        }
        return $errors;
    }

    if ('group' === $type) {
        if (! is_array($value)) {
            return ["{$path} must be a structured group."];
        }
        foreach ($field['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field)) {
                continue;
            }
            $sub_name = (string) ($sub_field['name'] ?? 'unknown');
            $errors = array_merge(
                $errors,
                tio2_validate_editorial_field(
                    $sub_field,
                    tio2_editorial_nested_field_value($value, $sub_field),
                    "{$path}.{$sub_name}"
                )
            );
        }
    }

    return $errors;
}

/**
 * Match ACF conditional-logic groups (OR between groups, AND within a group)
 * against raw sibling field values for contract validation.
 *
 * @param array<string, mixed>       $field
 * @param list<array<string, mixed>> $definitions
 */
function tio2_editorial_field_is_active(array $field, array $definitions, int $post_id): bool
{
    $logic = $field['conditional_logic'] ?? null;
    if (! is_array($logic) || [] === $logic) {
        return true;
    }

    $names_by_key = [];
    foreach ($definitions as $definition) {
        $key = (string) ($definition['key'] ?? '');
        $name = (string) ($definition['name'] ?? '');
        if ('' !== $key && '' !== $name) {
            $names_by_key[$key] = $name;
        }
    }

    foreach ($logic as $group) {
        if (! is_array($group) || [] === $group) {
            continue;
        }
        $group_matches = true;
        foreach ($group as $rule) {
            if (! is_array($rule)) {
                $group_matches = false;
                break;
            }
            $controller_name = $names_by_key[(string) ($rule['field'] ?? '')] ?? '';
            $operator = (string) ($rule['operator'] ?? '');
            $expected = (string) ($rule['value'] ?? '');
            $actual = '' === $controller_name ? null : get_field($controller_name, $post_id, false);
            $matches = is_scalar($actual) && (string) $actual === $expected;
            if (('==' === $operator && ! $matches) || ('!=' === $operator && $matches) || ! in_array($operator, ['==', '!='], true)) {
                $group_matches = false;
                break;
            }
        }
        if ($group_matches) {
            return true;
        }
    }

    return false;
}

/**
 * @param list<array<string, mixed>> $definitions
 * @return list<string>
 */
function tio2_validate_editorial_fields(array $definitions, int $post_id): array
{
    $errors = [];
    foreach ($definitions as $field) {
        $name = (string) ($field['name'] ?? '');
        if ('' === $name || ! tio2_editorial_field_is_active($field, $definitions, $post_id)) {
            continue;
        }
        $errors = array_merge(
            $errors,
            tio2_validate_editorial_field($field, get_field($name, $post_id, false), $name)
        );
    }
    return $errors;
}

/**
 * @return list<string>
 */
function tio2_site_a_application_product_ids(): array
{
    return [
        'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410', 'TP-C120', 'TP-I100', 'TP-H100',
        'TP-P200', 'TP-P110', 'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100', 'TP-PA110',
        'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110', 'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
    ];
}

/**
 * @return list<string>
 */
function tio2_validate_application_record(int $post_id): array
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_application' !== $post->post_type || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return ['record must be a non-revision Application post.'];
    }
    if (! function_exists('get_field')) {
        return ['record requires Advanced Custom Fields.'];
    }

    $errors = [];
    if (! tio2_application_resource_is_exact_site_a($post_id)) {
        $errors[] = 'site_scope must be exactly [tio2-a].';
    }
    $errors = array_merge($errors, tio2_validate_editorial_fields(tio2_application_field_definitions(), $post_id));

    $application_id = (string) get_field('application_id', $post_id, false);
    $level = (string) get_field('application_level', $post_id, false);
    $parent_ids = tio2_editorial_relationship_ids(get_field('parent_application', $post_id, false));
    $related_product_post_ids = tio2_editorial_relationship_ids(get_field('related_products', $post_id, false));
    $related_product_ids = [];
    foreach ($related_product_post_ids as $related_product_post_id) {
        $related_product_id = (string) get_field('product_id', $related_product_post_id, false);
        if (in_array($related_product_id, tio2_site_a_application_product_ids(), true)) {
            $related_product_ids[$related_product_id] = true;
        }
    }
    $starting_products = get_field('starting_products', $post_id, false);
    $starting_products = is_array($starting_products) ? array_values($starting_products) : [];
    $starting_product_ids = [];
    $primary_count = 0;
    foreach ($starting_products as $index => $starting_product) {
        if (! is_array($starting_product)) {
            $errors[] = "starting_products row {$index} must be an object.";
            continue;
        }
        $product_id = (string) ($starting_product['product_id'] ?? '');
        $role = (string) ($starting_product['role'] ?? '');
        if (! in_array($product_id, tio2_site_a_application_product_ids(), true)) {
            $errors[] = "starting_products row {$index} has an unknown Product ID.";
        }
        if (! isset($related_product_ids[$product_id])) {
            $errors[] = 'starting_products entries must also be present in related_products.';
        }
        if (isset($starting_product_ids[$product_id])) {
            $errors[] = 'starting_products Product IDs must be unique.';
        }
        $starting_product_ids[$product_id] = true;
        if (! in_array($role, ['primary', 'alternative', 'candidate'], true)) {
            $errors[] = "starting_products row {$index} has an unsupported role.";
        }
        if ('primary' === $role) {
            ++$primary_count;
        }
        if ('hub' === $level) {
            $errors[] = 'starting_products must be empty for the Hub.';
        }
        if ('category' === $level && 'candidate' !== $role) {
            $errors[] = 'starting_products on a Category must use the candidate role.';
        }
    }
    if ($primary_count > 1) {
        $errors[] = 'starting_products may contain at most one Primary entry.';
    }

    if ('hub' === $level) {
        if ('applications-hub' !== $application_id) {
            $errors[] = 'application_id must be applications-hub for the Hub.';
        }
        if ('applications' !== $post->post_name) {
            $errors[] = 'post_name must be applications for the Hub canonical path.';
        }
        if ([] !== $parent_ids) {
            $errors[] = 'parent_application must be empty for the Hub.';
        }
    } elseif ('category' === $level) {
        if (1 !== count($parent_ids)) {
            $errors[] = 'parent_application must contain exactly one Hub for a Category.';
        } else {
            $parent_id = $parent_ids[0];
            if (
                $parent_id === $post_id ||
                'applications-hub' !== (string) get_field('application_id', $parent_id, false) ||
                'hub' !== (string) get_field('application_level', $parent_id, false)
            ) {
                $errors[] = 'parent_application must reference the applications-hub record for a Category.';
            }
        }
    } elseif ('detail' === $level) {
        if (1 !== count($parent_ids)) {
            $errors[] = 'parent_application must contain exactly one parent for a Detail.';
        } else {
            $parent_id = $parent_ids[0];
            $parent_level = (string) get_field('application_level', $parent_id, false);
            $parent_application_id = (string) get_field('application_id', $parent_id, false);
            if ('universal-multi-application' === $application_id) {
                if ('hub' !== $parent_level || 'applications-hub' !== $parent_application_id) {
                    $errors[] = 'parent_application for universal-multi-application must reference applications-hub.';
                }
            } elseif ('category' !== $parent_level || $parent_id === $post_id) {
                $errors[] = 'parent_application for a Detail must reference a Category.';
            }
        }
    }

    if ('hub' !== $level && ('' === $post->post_name || 'applications' === $post->post_name)) {
        $errors[] = 'post_name must provide the canonical /applications/<slug> path.';
    }

    return array_values(array_unique($errors));
}

/**
 * @return list<string>
 */
function tio2_validate_resource_record(int $post_id): array
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_document' !== $post->post_type || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return ['record must be a non-revision Technical Resource post.'];
    }
    if (! function_exists('get_field')) {
        return ['record requires Advanced Custom Fields.'];
    }

    $errors = [];
    if (! tio2_application_resource_is_exact_site_a($post_id)) {
        $errors[] = 'site_scope must be exactly [tio2-a].';
    }
    $errors = array_merge($errors, tio2_validate_editorial_fields(tio2_resource_field_definitions(), $post_id));

    $resource_id = (string) get_field('resource_id', $post_id, false);
    $kind = (string) get_field('resource_kind', $post_id, false);
    if ('hub' === $kind) {
        if ('resources-hub' !== $resource_id) {
            $errors[] = 'resource_id must be resources-hub for the Resource Hub.';
        }
        if ('resources' !== $post->post_name) {
            $errors[] = 'post_name must be resources for the Resource Hub canonical path.';
        }
    } else {
        $allowed_non_hub_kinds = ['article', 'guide', 'comparison', 'testing-method', 'case-study'];
        if (! in_array($kind, $allowed_non_hub_kinds, true)) {
            $errors[] = 'resource_kind must be a supported non-Hub kind.';
        }
        $canonical_path = '/resources/' . $post->post_name;
        if ('' === $post->post_name || 'resources' === $post->post_name || $canonical_path !== untrailingslashit($canonical_path)) {
            $errors[] = 'post_name must provide the canonical /resources/<slug> path.';
        }
    }

    return array_values(array_unique($errors));
}

function tio2_application_resource_contract_notice_key(int $post_id): string
{
    return 'tio2_application_resource_contract_error_' . $post_id;
}

/**
 * @param mixed $post_id
 */
function tio2_save_application_resource_contract_feedback($post_id): void
{
    if (! is_numeric($post_id) || (int) $post_id <= 0) {
        return;
    }
    $post_id = (int) $post_id;
    if (
        wp_is_post_revision($post_id) ||
        wp_is_post_autosave($post_id) ||
        ! in_array('tio2-a', tio2_application_resource_site_scopes($post_id), true)
    ) {
        return;
    }

    $post_type = get_post_type($post_id);
    if (! in_array($post_type, ['tio2_application', 'tio2_document'], true)) {
        return;
    }
    $errors = 'tio2_application' === $post_type
        ? tio2_validate_application_record($post_id)
        : tio2_validate_resource_record($post_id);

    if ([] !== $errors) {
        set_transient(
            tio2_application_resource_contract_notice_key($post_id),
            ['message' => implode(' ', $errors)],
            MINUTE_IN_SECONDS
        );
        return;
    }
    delete_transient(tio2_application_resource_contract_notice_key($post_id));
}

function tio2_application_resource_contract_admin_notice(): void
{
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id <= 0 || ! in_array(get_post_type($post_id), ['tio2_application', 'tio2_document'], true)) {
        return;
    }
    $notice = get_transient(tio2_application_resource_contract_notice_key($post_id));
    if (! is_array($notice) || ! is_string($notice['message'] ?? null)) {
        return;
    }

    printf('<div class="notice notice-warning"><p>%s</p></div>', esc_html($notice['message']));
    delete_transient(tio2_application_resource_contract_notice_key($post_id));
}
