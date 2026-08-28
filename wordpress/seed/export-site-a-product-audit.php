<?php

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_SITE_A_PRODUCT_AUDIT_IDS = [
    'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410',
    'TP-C120', 'TP-I100', 'TP-H100', 'TP-P200', 'TP-P110',
    'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100',
    'TP-PA110', 'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110',
    'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
];

const TIO2_SITE_A_PRODUCT_AUDIT_FIELDS = [
    'product_id', 'meta_title', 'meta_description', 'eyebrow',
    'customer_problem_headline', 'quick_answer', 'product_type', 'process',
    'primary_application', 'positioning', 'surface_treatment', 'packaging',
    'tds_access', 'fit_when', 'discuss_first_when', 'performance_priorities',
    'recommended_applications', 'evidence_statement', 'typical_properties',
    'validation_checklist', 'faq_items', 'related_links',
];

/** @param mixed $value */
function tio2_site_a_product_audit_contains_private_tds($value): bool
{
    if (is_string($value)) {
        return 1 === preg_match(
            '~(?:https?://|\bfile://|(?:^|[^a-z0-9])[a-z]:[\\\\/]|/documents/tds(?:/|(?=$|[\s"\'<>),.;:!?#]))|/tds(?:/|(?=$|[\s"\'<>),.;:!?#]))|\.pdf\b)~iu',
            html_entity_decode($value, ENT_QUOTES | ENT_HTML5, 'UTF-8')
        );
    }
    if (! is_array($value)) {
        return false;
    }
    foreach ($value as $item) {
        if (tio2_site_a_product_audit_contains_private_tds($item)) {
            return true;
        }
    }
    return false;
}

/** @param mixed $value @return mixed */
function tio2_site_a_product_audit_normalize($value)
{
    if (! is_array($value)) {
        return $value;
    }
    foreach ($value as $key => $item) {
        $value[$key] = tio2_site_a_product_audit_normalize($item);
    }
    if (! array_is_list($value)) {
        ksort($value, SORT_STRING);
    }
    return $value;
}

/** @param array<string, mixed> $product @return array<string, mixed> */
function tio2_site_a_product_audit_expected_record(array $product): array
{
    $product_id = (string) ($product['productId'] ?? '');
    $meta = [
        'product_id' => $product_id,
        'public_path' => (string) ($product['path'] ?? ''),
        'meta_title' => $product['metaTitle'] ?? null,
        'meta_description' => $product['metaDescription'] ?? null,
        'eyebrow' => $product['eyebrow'] ?? null,
        'customer_problem_headline' => $product['customerProblemHeadline'] ?? null,
        'quick_answer' => $product['quickAnswer'] ?? null,
        'product_type' => $product['productType'] ?? null,
        'primary_application' => $product['primaryApplication'] ?? null,
        'packaging' => $product['packaging'] ?? null,
        'tds_access' => $product['tdsAccess'] ?? null,
        'fit_when' => $product['fitWhen'] ?? [],
        'discuss_first_when' => $product['discussFirstWhen'] ?? [],
        'performance_priorities' => $product['performancePriorities'] ?? [],
        'recommended_applications' => $product['recommendedApplications'] ?? [],
        'evidence_statement' => $product['evidenceStatement'] ?? null,
        'typical_properties' => array_map(static function ($property): array {
            $normalized = [
                'property' => is_array($property) ? ($property['property'] ?? null) : null,
                'value' => is_array($property) ? ($property['value'] ?? null) : null,
                'unit' => is_array($property) ? ($property['unit'] ?? null) : null,
            ];
            if (is_array($property) && array_key_exists('method', $property)) {
                $normalized['method'] = $property['method'];
            }
            if (is_array($property) && array_key_exists('note', $property)) {
                $normalized['note'] = $property['note'];
            }
            $normalized['display_order'] = is_array($property) ? ($property['displayOrder'] ?? null) : null;
            return $normalized;
        }, is_array($product['typicalProperties'] ?? null) ? array_values($product['typicalProperties']) : []),
        'validation_checklist' => $product['validationChecklist'] ?? [],
        'faq_items' => $product['faqItems'] ?? [],
        'related_links' => $product['relatedLinks'] ?? [],
    ];
    foreach (['process' => 'process', 'positioning' => 'positioning', 'surfaceTreatment' => 'surface_treatment'] as $source => $field) {
        if (array_key_exists($source, $product)) {
            $meta[$field] = $product[$source];
        }
    }
    return [
        'productId' => $product_id,
        'slug' => (string) ($product['slug'] ?? ''),
        'path' => (string) ($product['path'] ?? ''),
        'title' => $product['title'] ?? null,
        'status' => 'draft',
        'scopes' => ['tio2-a'],
        'family' => $product['family'] ?? [],
        'meta' => $meta,
    ];
}

/** @param array<string, mixed> $record @return list<string> */
function tio2_site_a_product_audit_section_errors(array $record): array
{
    $id = (string) ($record['productId'] ?? '(unknown)');
    $meta = is_array($record['meta'] ?? null) ? $record['meta'] : [];
    $errors = [];
    $bounds = [
        'fit_when' => [3, PHP_INT_MAX],
        'discuss_first_when' => [1, PHP_INT_MAX],
        'performance_priorities' => [3, 6],
        'typical_properties' => [1, PHP_INT_MAX],
        'validation_checklist' => [1, PHP_INT_MAX],
        'faq_items' => [6, 10],
    ];
    foreach ($bounds as $field => [$minimum, $maximum]) {
        $count = is_array($meta[$field] ?? null) ? count($meta[$field]) : 0;
        if ($count < $minimum || $count > $maximum) {
            $errors[] = "{$id} {$field} is outside approved section bounds.";
        }
    }
    return $errors;
}

/**
 * @param array<string, mixed> $manifest
 * @param list<array<string, mixed>> $records
 * @param list<string> $approved_routes
 * @return list<string>
 */
function tio2_site_a_product_audit_compare(
    array $manifest,
    array $records,
    array $approved_routes,
    bool $anonymous_visible,
    string $site_b_hash_before,
    string $site_b_hash_after
): array {
    $errors = [];
    if ('0.1' !== ($manifest['version'] ?? null) || 'tio2-a' !== ($manifest['siteId'] ?? null) || ! is_array($manifest['products'] ?? null)) {
        return ['Manifest does not identify the approved Site A v0.1 batch.'];
    }
    $expected = [];
    foreach ($manifest['products'] as $product) {
        if (! is_array($product)) {
            $errors[] = 'Manifest contains an invalid Product record.';
            continue;
        }
        $record = tio2_site_a_product_audit_expected_record($product);
        $expected[(string) $record['productId']] = $record;
        if (tio2_site_a_product_audit_contains_private_tds($product)) {
            $errors[] = "{$record['productId']} manifest contains a private TDS path or URL.";
        }
    }
    $expected_ids = array_keys($expected);
    sort($expected_ids, SORT_STRING);
    $approved_ids = TIO2_SITE_A_PRODUCT_AUDIT_IDS;
    sort($approved_ids, SORT_STRING);
    if (25 !== count($expected) || $expected_ids !== $approved_ids) {
        $errors[] = 'Manifest IDs do not equal the 25 approved Site A Product IDs.';
    }

    $actual = [];
    foreach ($records as $record) {
        $id = is_array($record) ? (string) ($record['productId'] ?? '') : '';
        if ('' === $id || isset($actual[$id])) {
            $errors[] = 'Product readback contains a missing or duplicate Product ID.';
            continue;
        }
        $actual[$id] = $record;
    }
    $actual_ids = array_keys($actual);
    sort($actual_ids, SORT_STRING);
    foreach (array_diff($expected_ids, $actual_ids) as $id) {
        $errors[] = "{$id} is missing from the Site A Product readback.";
    }
    foreach (array_diff($actual_ids, $expected_ids) as $id) {
        $errors[] = "{$id} is an unexpected Site A Product readback record.";
    }
    foreach ($actual as $id => $record) {
        if (! is_array($record)) {
            $errors[] = "{$id} readback is invalid.";
            continue;
        }
        if (($record['slug'] ?? null) !== strtolower($id)) {
            $errors[] = "{$id} slug is not canonical.";
        }
        if (($record['path'] ?? null) !== '/products/' . strtolower($id)) {
            $errors[] = "{$id} path is not canonical.";
        }
        if (($record['status'] ?? null) !== 'draft') {
            $errors[] = "{$id} status is not draft.";
        }
        if (($record['scopes'] ?? null) !== ['tio2-a']) {
            $errors[] = "{$id} scopes are not exactly Site A.";
        }
        $errors = array_merge($errors, tio2_site_a_product_audit_section_errors($record));
        if (tio2_site_a_product_audit_contains_private_tds($record)) {
            $errors[] = "{$id} readback contains a private TDS path or URL.";
        }
        if (isset($expected[$id]) && tio2_site_a_product_audit_normalize($record) !== tio2_site_a_product_audit_normalize($expected[$id])) {
            $errors[] = "{$id} manifest mismatch after normalized readback.";
        }
    }
    foreach ($approved_routes as $route) {
        if (in_array($route, array_map(static fn (array $record): string => (string) $record['path'], $expected), true)) {
            $errors[] = "{$route} is present in the approved public route inventory.";
        }
    }
    if ($anonymous_visible) {
        $errors[] = 'A draft Product is visible through anonymous GraphQL.';
    }
    if (! hash_equals($site_b_hash_before, $site_b_hash_after)) {
        $errors[] = 'Site B changed during the read-only audit.';
    }
    return array_values(array_unique($errors));
}

/** @return string */
function tio2_site_a_product_audit_site_b_hash(): string
{
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT p.* FROM {$wpdb->posts} p INNER JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id WHERE tt.taxonomy = 'site_scope' AND t.slug = 'tio2-b' ORDER BY p.ID ASC",
        ARRAY_A
    );
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not snapshot frozen Site B rows for audit.');
    }
    foreach ($rows as &$row) {
        $post_id = (int) $row['ID'];
        $meta = get_post_meta($post_id);
        ksort($meta, SORT_STRING);
        $row['meta'] = $meta;
        $row['taxonomies'] = $wpdb->get_results($wpdb->prepare(
            "SELECT tt.taxonomy AS taxonomy, t.term_id AS term_id, t.slug AS slug FROM {$wpdb->term_relationships} tr INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id WHERE tr.object_id = %d ORDER BY tt.taxonomy ASC, t.term_id ASC",
            $post_id
        ), ARRAY_A);
        if ('' !== $wpdb->last_error) {
            throw new RuntimeException('Could not snapshot frozen Site B taxonomy assignments for audit.');
        }
    }
    unset($row);
    return 'sha256:' . hash('sha256', (string) wp_json_encode($rows));
}

/** @return array{targetType: string, targetKey: string} */
function tio2_site_a_product_audit_target_from_wp_id(int $id, string $type): array
{
    if ('product' === $type) {
        return ['targetType' => 'product', 'targetKey' => (string) get_field('product_id', $id, false)];
    }
    $id_field = 'application' === $type ? 'application_id' : 'resource_id';
    return ['targetType' => $type, 'targetKey' => (string) get_field($id_field, $id, false)];
}

/** @param mixed $value @return list<array{targetType: string, targetKey: string}> */
function tio2_site_a_product_audit_targets_from_wp_value($value, string $type): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_map(static fn ($id): array => tio2_site_a_product_audit_target_from_wp_id((int) $id, $type), array_values($value));
}

/** @param mixed $value @return list<string> */
function tio2_site_a_product_audit_text_list_from_wp_value($value): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_map(static fn ($row): string => is_array($row) ? (string) ($row['item'] ?? '') : '', array_values($value));
}

/** @param mixed $value @return mixed */
function tio2_site_a_product_audit_related_group_value($value, string $group)
{
    if (! is_array($value) || ! in_array($group, ['applications', 'resources', 'products'], true)) {
        return [];
    }
    $field_key = 'field_tio2_product_related_' . $group;
    return $value[$group] ?? $value[$field_key] ?? [];
}

/** @return array<string, mixed> */
function tio2_site_a_product_audit_read_wp_record(int $post_id): array
{
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    $families = wp_get_object_terms($post_id, 'product_family', ['fields' => 'ids']);
    if (is_wp_error($scopes) || is_wp_error($families)) {
        throw new RuntimeException('Could not read Product taxonomy assignments for audit.');
    }
    sort($scopes, SORT_STRING);
    $product_id = (string) get_field('product_id', $post_id, false);
    $meta = ['product_id' => $product_id, 'public_path' => (string) get_post_meta($post_id, 'public_path', true)];
    foreach (TIO2_SITE_A_PRODUCT_AUDIT_FIELDS as $field) {
        $value = get_field($field, $post_id, false);
        if ('recommended_applications' === $field) {
            $value = tio2_site_a_product_audit_targets_from_wp_value($value, 'application');
        } elseif ('related_links' === $field) {
            $value = is_array($value) ? [
                'applications' => tio2_site_a_product_audit_targets_from_wp_value(tio2_site_a_product_audit_related_group_value($value, 'applications'), 'application'),
                'resources' => tio2_site_a_product_audit_targets_from_wp_value(tio2_site_a_product_audit_related_group_value($value, 'resources'), 'resource'),
                'products' => tio2_site_a_product_audit_targets_from_wp_value(tio2_site_a_product_audit_related_group_value($value, 'products'), 'product'),
            ] : [];
        } elseif (in_array($field, ['fit_when', 'discuss_first_when', 'validation_checklist'], true)) {
            $value = tio2_site_a_product_audit_text_list_from_wp_value($value);
        }
        if (null !== $value && '' !== $value && [] !== $value) {
            $meta[$field] = $value;
        }
    }
    return [
        'productId' => $product_id,
        'slug' => (string) get_post_field('post_name', $post_id),
        'path' => (string) get_post_meta($post_id, 'public_path', true),
        'title' => (string) get_post_field('post_title', $post_id),
        'status' => (string) get_post_status($post_id),
        'scopes' => array_values($scopes),
        'family' => 1 === count($families) ? ['targetType' => 'productFamily', 'targetKey' => (string) get_term_field('slug', (int) $families[0], 'product_family')] : [],
        'meta' => $meta,
    ];
}

/** @return list<array<string, mixed>> */
function tio2_site_a_product_audit_read_records(): array
{
    $ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'no_found_rows' => true]);
    $records = [];
    foreach ($ids as $post_id) {
        $record = tio2_site_a_product_audit_read_wp_record((int) $post_id);
        if (in_array($record['productId'], TIO2_SITE_A_PRODUCT_AUDIT_IDS, true) || in_array('tio2-a', $record['scopes'], true)) {
            $records[] = $record;
        }
    }
    return $records;
}

/** @return list<string> */
function tio2_site_a_product_audit_public_routes(): array
{
    $path = WP_PLUGIN_DIR . '/tio2-site-model/config/public-routes.json';
    $inventory = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    $routes = [];
    foreach (($inventory['sites'] ?? []) as $site) {
        foreach ((is_array($site) ? ($site['routes'] ?? []) : []) as $route) {
            if (is_array($route) && is_string($route['path'] ?? null)) {
                $routes[] = $route['path'];
            }
        }
    }
    return $routes;
}

/** @param list<array<string, mixed>> $records */
function tio2_site_a_product_audit_anonymous_visible(array $records): bool
{
    if (! function_exists('graphql')) {
        throw new RuntimeException('Anonymous GraphQL audit is unavailable.');
    }
    wp_set_current_user(0);
    foreach ($records as $record) {
        $ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => 'product_id', 'meta_value' => $record['productId']]);
        if (1 !== count($ids)) {
            continue;
        }
        $result = graphql(['query' => 'query PrivateProduct($id: ID!) { tio2Product(id: $id, idType: DATABASE_ID) { databaseId } }', 'variables' => ['id' => (string) $ids[0]]]);
        if (is_array($result) && null !== ($result['data']['tio2Product'] ?? null)) {
            return true;
        }
    }
    return false;
}

/** @return array<string, mixed> */
function tio2_site_a_product_audit_read_capability(array $args): array
{
    if (1 !== count($args) || ! is_readable((string) $args[0])) {
        throw new RuntimeException('The local Product audit capability file is required.');
    }
    $capability = json_decode((string) file_get_contents((string) $args[0]), true, 512, JSON_THROW_ON_ERROR);
    $token = getenv('TIO2_LOCAL_PRODUCT_AUDIT_CAPABILITY');
    if (! is_array($capability) || 1 !== ($capability['version'] ?? null) || ! is_string($token) || ! is_string($capability['token'] ?? null) || ! hash_equals($capability['token'], $token) || ! is_string($capability['manifestPath'] ?? null) || ! is_readable($capability['manifestPath']) || ! is_string($capability['manifestSha256'] ?? null) || ! hash_equals($capability['manifestSha256'], hash_file('sha256', $capability['manifestPath']))) {
        throw new RuntimeException('The local Product audit capability contract was rejected.');
    }
    return $capability;
}

if (defined('WP_CLI') && WP_CLI) {
    try {
        if (! function_exists('get_field')) {
            throw new RuntimeException('Local Product audit requires Advanced Custom Fields.');
        }
        $capability = tio2_site_a_product_audit_read_capability($args);
        $manifest = json_decode((string) file_get_contents($capability['manifestPath']), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($manifest)) {
            throw new RuntimeException('The staged Product audit manifest is invalid.');
        }
        $site_b_before = tio2_site_a_product_audit_site_b_hash();
        $records = tio2_site_a_product_audit_read_records();
        $anonymous_visible = tio2_site_a_product_audit_anonymous_visible($records);
        $site_b_after = tio2_site_a_product_audit_site_b_hash();
        $errors = tio2_site_a_product_audit_compare($manifest, $records, tio2_site_a_product_audit_public_routes(), $anonymous_visible, $site_b_before, $site_b_after);
        $payload = [
            'manifestSha256' => $capability['manifestSha256'],
            'siteBHashBefore' => $site_b_before,
            'siteBHashAfter' => $site_b_after,
            'productIds' => array_values(array_map(static fn (array $record): string => (string) $record['productId'], $records)),
            'anonymousGraphqlVisible' => $anonymous_visible,
            'errors' => $errors,
        ];
        WP_CLI::log('TIO2_SITE_A_PRODUCT_AUDIT_RESULT ' . wp_json_encode($payload));
        if ([] !== $errors) {
            WP_CLI::error('Local Site A Product draft audit failed.');
        }
    } catch (Throwable $error) {
        WP_CLI::error('Local Site A Product draft audit failed: ' . $error->getMessage());
    }
}
