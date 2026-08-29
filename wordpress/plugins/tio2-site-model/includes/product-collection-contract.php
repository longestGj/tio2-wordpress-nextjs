<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/** @return array<string, list<string>> */
function tio2_product_collection_membership(): array
{
    return [
        'coatings' => ['TP-C050', 'TP-C100', 'TP-C110', 'TP-C120', 'TP-C200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-C410'],
        'plastics-masterbatch' => ['TP-P100', 'TP-P110', 'TP-P120', 'TP-P200'],
        'engineering-plastics' => ['TP-P300', 'TP-P310', 'TP-P320', 'TP-P330'],
        'decorative-paper' => ['TP-PA100', 'TP-PA110', 'TP-PA120'],
        'printing-inks' => ['TP-I100', 'TP-I200'],
        'solar-film' => ['TP-S100'],
        'high-purity-functional' => ['TP-H100'],
        'universal' => ['TP-U100'],
    ];
}

/** @param mixed $value */
function tio2_product_collection_has_value($value): bool
{
    if (is_string($value)) {
        return '' !== trim(wp_strip_all_tags($value));
    }
    if (is_array($value)) {
        return [] !== $value;
    }
    return null !== $value && false !== $value;
}

/** @param array<string, mixed> $field @param mixed $value */
function tio2_product_collection_validate_field(array $field, $value, string $error_code)
{
    $name = (string) ($field['name'] ?? 'field');
    if (! empty($field['required']) && ! tio2_product_collection_has_value($value)) {
        return new WP_Error($error_code, "{$name} is required.");
    }
    if (! tio2_product_collection_has_value($value)) {
        return true;
    }
    if ('image' === ($field['type'] ?? '') && (! is_numeric($value) || (int) $value <= 0)) {
        return new WP_Error($error_code, "{$name} must be an attachment ID.");
    }
    if ('number' === ($field['type'] ?? '') && (! is_numeric($value) || (int) $value < (int) ($field['min'] ?? 0) || (string) (int) $value !== (string) $value)) {
        return new WP_Error($error_code, "{$name} must be a positive integer.");
    }
    if ('repeater' !== ($field['type'] ?? '')) {
        return true;
    }
    $rows = is_array($value) ? array_values($value) : [];
    $min = (int) ($field['min'] ?? 0);
    $max = (int) ($field['max'] ?? 0);
    if (count($rows) < $min || (0 !== $max && count($rows) > $max)) {
        return new WP_Error($error_code, "{$name} is outside its required bounds.");
    }
    foreach ($rows as $row) {
        if (! is_array($row)) {
            return new WP_Error($error_code, "{$name} contains an invalid row.");
        }
        foreach ($field['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field)) {
                continue;
            }
            $sub_name = (string) ($sub_field['name'] ?? 'field');
            $validation = tio2_product_collection_validate_field($sub_field, $row[$sub_name] ?? null, $error_code);
            if (is_wp_error($validation)) {
                return $validation;
            }
        }
    }
    return true;
}

/** @param list<array<string, mixed>> $definitions */
function tio2_product_collection_validate_definitions(array $definitions, $object_id, string $error_code)
{
    foreach ($definitions as $field) {
        $validation = tio2_product_collection_validate_field(
            $field,
            get_field((string) $field['name'], $object_id, false),
            $error_code
        );
        if (is_wp_error($validation)) {
            return $validation;
        }
    }
    return true;
}

/** @return list<string>|WP_Error */
function tio2_product_collection_family_filter_slugs(int $term_id): array|WP_Error
{
    $term = get_term($term_id, 'product_family');
    $filters = get_field('filters', 'product_family_' . $term_id, false);
    if (! $term instanceof WP_Term || ! is_array($filters) || ! array_is_list($filters)) {
        return new WP_Error('product_family_filter_invalid', 'Product Family filters must use controlled slug and label pairs.');
    }
    $slugs = [];
    $pairs = [];
    foreach ($filters as $index => $filter) {
        $slug = is_array($filter) ? ($filter['slug'] ?? null) : null;
        $label = is_array($filter) ? ($filter['label'] ?? null) : null;
        if (! is_string($slug) || ! is_string($label) || (tio2_product_collection_filter_choices()[$slug] ?? null) !== $label || isset($slugs[$slug])) {
            return new WP_Error('product_family_filter_invalid', 'Product Family filters must use controlled slug and label pairs.');
        }
        if ('all' === $slug && 0 !== $index) {
            return new WP_Error('product_family_filter_invalid', 'The all sentinel must be the first Product Family filter.');
        }
        $slugs[$slug] = true;
        $pairs[$slug] = $label;
    }
    if ('coatings' === $term->slug && $pairs !== tio2_product_collection_coatings_filters()) {
        return new WP_Error('product_family_filter_invalid', 'Coatings filters must match the approved controlled order and labels.');
    }
    return array_keys($slugs);
}

/** @return true|WP_Error */
function tio2_validate_products_hub_contract(string $site_id): true|WP_Error
{
    if ('tio2-a' !== $site_id || ! function_exists('get_field')) {
        return new WP_Error('products_hub_scope_invalid', 'Products Hub is defined only for Site A.');
    }
    $definitions = array_values(array_filter(
        tio2_product_hub_field_definitions(),
        static fn (array $field): bool => 'families' !== ($field['name'] ?? null)
    ));
    $validation = tio2_product_collection_validate_definitions($definitions, 'option', 'products_hub_field_missing');
    if (is_wp_error($validation)) {
        return $validation;
    }
    $rows = get_field('families', 'option', false);
    $rows = is_array($rows) ? array_values($rows) : [];
    $expected_slugs = array_keys(tio2_product_collection_membership());
    if (8 !== count($rows)) {
        return new WP_Error('products_hub_families_invalid', 'Products Hub must reference exactly eight Product Families.');
    }
    $seen = [];
    foreach ($rows as $index => $row) {
        $term_id = is_array($row) && is_numeric($row['family'] ?? null) ? (int) $row['family'] : 0;
        $term = $term_id > 0 ? get_term($term_id, 'product_family') : null;
        if (! $term instanceof WP_Term || isset($seen[$term_id]) || ($expected_slugs[$index] ?? null) !== $term->slug) {
            return new WP_Error('products_hub_families_invalid', 'Products Hub Families must be the eight canonical Families in order.');
        }
        $seen[$term_id] = true;
    }
    return true;
}

/** @return true|WP_Error */
function tio2_validate_product_family_contract(int $term_id): true|WP_Error
{
    $term = get_term($term_id, 'product_family');
    if (! $term instanceof WP_Term || ! array_key_exists($term->slug, tio2_product_collection_membership()) || ! function_exists('get_field')) {
        return new WP_Error('product_family_invalid', 'Product Family must be one of the Site A collection Families.');
    }
    $term_object_id = 'product_family_' . $term_id;
    $validation = tio2_product_collection_validate_definitions(tio2_product_family_field_definitions(), $term_object_id, 'product_family_field_missing');
    if (is_wp_error($validation)) {
        return $validation;
    }
    $filter_slugs = tio2_product_collection_family_filter_slugs($term_id);
    if (is_wp_error($filter_slugs)) {
        return $filter_slugs;
    }
    $expected_ids = tio2_product_collection_membership()[$term->slug];
    $post_ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'tax_query' => ['relation' => 'AND', ['taxonomy' => 'product_family', 'field' => 'term_id', 'terms' => [$term_id]], ['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-a']]]]);
    $actual_ids = [];
    foreach ($post_ids as $post_id) {
        $product_id = get_field('product_id', (int) $post_id, false);
        if (! is_string($product_id) || ! in_array($product_id, $expected_ids, true) || isset($actual_ids[$product_id])) {
            return new WP_Error('product_family_membership_invalid', 'Product Family contains an unknown or duplicate Product ID.');
        }
        $actual_ids[$product_id] = true;
        $path = tio2_product_canonical_path((int) $post_id);
        if (is_wp_error($path)) {
            return $path;
        }
    }
    if (count($actual_ids) !== count($expected_ids) || [] !== array_diff($expected_ids, array_keys($actual_ids))) {
        return new WP_Error('product_family_membership_invalid', 'Product Family must contain its exact canonical Product IDs.');
    }
    return true;
}

/** @return string|WP_Error */
function tio2_product_family_slug_for_post(int $post_id): string|WP_Error
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_product' !== $post->post_type || tio2_product_site_id($post_id) !== 'tio2-a') {
        return new WP_Error('product_collection_invalid_post', 'Product collection membership requires a Site A Product.');
    }
    $terms = wp_get_object_terms($post_id, 'product_family');
    if (is_wp_error($terms) || 1 !== count($terms) || ! $terms[0] instanceof WP_Term || ! array_key_exists($terms[0]->slug, tio2_product_collection_membership())) {
        return new WP_Error('product_collection_family_invalid', 'Product must have exactly one canonical Product Family.');
    }
    $family_slug = $terms[0]->slug;
    $product_id = get_field('product_id', $post_id, false);
    $known_ids = array_merge(...array_values(tio2_product_collection_membership()));
    if (! is_string($product_id) || ! in_array($product_id, $known_ids, true)) {
        return new WP_Error('product_collection_product_unknown', 'Product ID is not in the Site A Product collection.');
    }
    if (! in_array($product_id, tio2_product_collection_membership()[$family_slug], true)) {
        return new WP_Error('product_collection_family_mismatch', 'Product ID does not belong to its Product Family.');
    }
    return $family_slug;
}

/** @return string|WP_Error */
function tio2_product_canonical_path(int $post_id): string|WP_Error
{
    $family_slug = tio2_product_family_slug_for_post($post_id);
    if (is_wp_error($family_slug)) {
        return $family_slug;
    }
    $validation = tio2_product_collection_validate_definitions(tio2_product_collection_display_field_definitions(), $post_id, 'product_collection_field_missing');
    if (is_wp_error($validation)) {
        return $validation;
    }
    $tags = get_field('collectionFilterTags', $post_id, false);
    if (! is_array($tags) || ! array_is_list($tags)) {
        return new WP_Error('product_collection_filter_invalid', 'Product collection filters must use a list of controlled tags.');
    }
    $family_term = get_term_by('slug', $family_slug, 'product_family');
    $configured_tags = $family_term instanceof WP_Term
        ? tio2_product_collection_family_filter_slugs((int) $family_term->term_id)
        : new WP_Error('product_collection_filter_invalid', 'Product collection filters require a canonical Product Family.');
    if (is_wp_error($configured_tags)) {
        return new WP_Error('product_collection_filter_invalid', 'Product collection filters require a valid Product Family configuration.');
    }
    foreach ($tags as $tag) {
        if (! is_string($tag) || ! array_key_exists($tag, tio2_product_collection_product_filter_tag_choices())) {
            return new WP_Error('product_collection_filter_invalid', 'Product collection filters must use controlled tags.');
        }
        if (! in_array($tag, $configured_tags, true)) {
            return new WP_Error('product_collection_filter_unavailable', 'Product collection filters must be configured for the Product Family.');
        }
    }
    $order = (int) get_field('familyDisplayOrder', $post_id, false);
    $family_post_ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'tax_query' => ['relation' => 'AND', ['taxonomy' => 'product_family', 'field' => 'slug', 'terms' => [$family_slug]], ['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-a']]]]);
    foreach ($family_post_ids as $family_post_id) {
        if ((int) $family_post_id !== $post_id && $order === (int) get_field('familyDisplayOrder', (int) $family_post_id, false)) {
            return new WP_Error('product_collection_display_order_duplicate', 'Family Display Order must be unique within a Product Family.');
        }
    }
    $product_id = (string) get_field('product_id', $post_id, false);
    return '/products/' . $family_slug . '/' . strtolower($product_id);
}
