<?php

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_SITE_A_PRODUCT_DRAFT_IDS = [
    'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410',
    'TP-C120', 'TP-I100', 'TP-H100', 'TP-P200', 'TP-P110',
    'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100',
    'TP-PA110', 'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110',
    'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
];

const TIO2_SITE_A_PRODUCT_DRAFT_FIELDS = [
    'product_id', 'meta_title', 'meta_description', 'eyebrow',
    'customer_problem_headline', 'quick_answer', 'product_type', 'process',
    'primary_application', 'positioning', 'surface_treatment', 'packaging',
    'tds_access', 'fit_when', 'discuss_first_when', 'performance_priorities',
    'recommended_applications', 'evidence_statement', 'typical_properties',
    'validation_checklist', 'faq_items', 'related_links',
];

/** @return list<string> */
function tio2_site_a_product_draft_required_keys(): array
{
    return [
        'productId', 'slug', 'path', 'title', 'family', 'metaTitle',
        'metaDescription', 'eyebrow', 'customerProblemHeadline', 'quickAnswer',
        'productType', 'primaryApplication', 'packaging', 'tdsAccess', 'fitWhen',
        'discussFirstWhen', 'performancePriorities', 'recommendedApplications',
        'evidenceStatement', 'typicalProperties', 'validationChecklist', 'faqItems',
        'relatedLinks',
    ];
}

/** @return list<string> */
function tio2_site_a_product_draft_allowed_keys(): array
{
    return array_merge(tio2_site_a_product_draft_required_keys(), [
        'process', 'positioning', 'surfaceTreatment',
    ]);
}

/** @param mixed $value */
function tio2_site_a_product_draft_has_private_location($value): bool
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
        if (tio2_site_a_product_draft_has_private_location($item)) {
            return true;
        }
    }
    return false;
}

/** @param mixed $value */
function tio2_site_a_product_draft_text($value, string $name): string
{
    if (! is_string($value) || '' === trim($value)) {
        throw new InvalidArgumentException("Product {$name} must be non-empty text.");
    }
    $value = trim($value);
    if (tio2_site_a_product_draft_has_private_location($value)) {
        throw new InvalidArgumentException("Product {$name} contains a private or remote location.");
    }
    return $value;
}

/** @param mixed $target */
function tio2_site_a_product_draft_target($target, string $type, string $name): array
{
    $keys = is_array($target) ? array_keys($target) : [];
    sort($keys, SORT_STRING);
    if (! is_array($target) ||
        ['targetKey', 'targetType'] !== $keys ||
        $type !== ($target['targetType'] ?? null)) {
        throw new InvalidArgumentException("Product {$name} has an invalid relationship target.");
    }
    $key = tio2_site_a_product_draft_text($target['targetKey'], "{$name}.targetKey");
    $is_canonical = 'product' === $type
        ? in_array($key, TIO2_SITE_A_PRODUCT_DRAFT_IDS, true)
        : 1 === preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $key);
    if (! $is_canonical) {
        throw new InvalidArgumentException("Product {$name} relationship key is not canonical.");
    }
    return ['targetType' => $type, 'targetKey' => $key];
}

/** @param mixed $items @return list<string> */
function tio2_site_a_product_draft_text_list($items, string $name, int $minimum): array
{
    if (! is_array($items) || count($items) < $minimum) {
        throw new InvalidArgumentException("Product {$name} has too few items.");
    }
    return array_map(
        static fn ($item): string => tio2_site_a_product_draft_text($item, "{$name} item"),
        array_values($items)
    );
}

/** @param array<string, mixed> $product */
function tio2_site_a_product_draft_validate_product(array $product): array
{
    $keys = array_keys($product);
    sort($keys, SORT_STRING);
    $allowed = tio2_site_a_product_draft_allowed_keys();
    sort($allowed, SORT_STRING);
    if ($keys !== $allowed && array_diff($keys, $allowed) !== [] || array_diff(tio2_site_a_product_draft_required_keys(), $keys) !== []) {
        throw new InvalidArgumentException('Product record keys do not match the approved import contract.');
    }

    $product_id = tio2_site_a_product_draft_text($product['productId'], 'productId');
    if (! in_array($product_id, TIO2_SITE_A_PRODUCT_DRAFT_IDS, true)) {
        throw new InvalidArgumentException("Product ID {$product_id} is not an approved Site A draft ID.");
    }
    $slug = strtolower($product_id);
    if ($slug !== $product['slug'] || '/products/' . $slug !== $product['path']) {
        throw new InvalidArgumentException("Product {$product_id} slug or path is not canonical.");
    }

    $family = tio2_site_a_product_draft_target($product['family'], 'productFamily', 'family');
    $recommended = [];
    foreach ($product['recommendedApplications'] as $target) {
        $recommended[] = tio2_site_a_product_draft_target($target, 'application', 'recommendedApplications');
    }
    if ([] === $recommended) {
        throw new InvalidArgumentException("Product {$product_id} requires at least one recommended application.");
    }
    $related = [];
    foreach (['applications' => 'application', 'resources' => 'resource', 'products' => 'product'] as $group => $type) {
        if (! isset($product['relatedLinks'][$group]) || ! is_array($product['relatedLinks'][$group])) {
            throw new InvalidArgumentException("Product {$product_id} related {$group} are invalid.");
        }
        $related[$group] = array_map(
            static fn ($target): array => tio2_site_a_product_draft_target($target, $type, "relatedLinks.{$group}"),
            array_values($product['relatedLinks'][$group])
        );
    }

    $priorities = array_values($product['performancePriorities']);
    if (count($priorities) < 3 || count($priorities) > 6) {
        throw new InvalidArgumentException("Product {$product_id} performance priorities are outside their approved bounds.");
    }
    foreach ($priorities as &$priority) {
        if (! is_array($priority)) {
            throw new InvalidArgumentException("Product {$product_id} has an invalid performance priority.");
        }
        $priority = [
            'title' => tio2_site_a_product_draft_text($priority['title'] ?? null, 'performancePriorities.title'),
            'explanation' => tio2_site_a_product_draft_text($priority['explanation'] ?? null, 'performancePriorities.explanation'),
        ];
    }
    unset($priority);

    $properties = array_values($product['typicalProperties']);
    if ([] === $properties) {
        throw new InvalidArgumentException("Product {$product_id} requires typical properties.");
    }
    foreach ($properties as &$property) {
        if (! is_array($property) || ! isset($property['displayOrder']) || ! is_int($property['displayOrder']) || $property['displayOrder'] < 1) {
            throw new InvalidArgumentException("Product {$product_id} has an invalid typical property.");
        }
        $property = array_filter([
            'property' => tio2_site_a_product_draft_text($property['property'] ?? null, 'typicalProperties.property'),
            'value' => tio2_site_a_product_draft_text($property['value'] ?? null, 'typicalProperties.value'),
            'unit' => tio2_site_a_product_draft_text($property['unit'] ?? null, 'typicalProperties.unit'),
            'method' => isset($property['method']) ? tio2_site_a_product_draft_text($property['method'], 'typicalProperties.method') : null,
            'note' => isset($property['note']) ? tio2_site_a_product_draft_text($property['note'], 'typicalProperties.note') : null,
            'display_order' => $property['displayOrder'],
        ], static fn ($value): bool => null !== $value);
    }
    unset($property);

    $faqs = array_values($product['faqItems']);
    if (count($faqs) < 6 || count($faqs) > 10) {
        throw new InvalidArgumentException("Product {$product_id} FAQ count is outside its approved bounds.");
    }
    foreach ($faqs as &$faq) {
        if (! is_array($faq)) {
            throw new InvalidArgumentException("Product {$product_id} has an invalid FAQ.");
        }
        $faq = [
            'question' => tio2_site_a_product_draft_text($faq['question'] ?? null, 'faqItems.question'),
            'answer' => tio2_site_a_product_draft_text($faq['answer'] ?? null, 'faqItems.answer'),
        ];
    }
    unset($faq);

    $meta = [
        'product_id' => $product_id,
        'public_path' => '/products/' . $slug,
        'meta_title' => tio2_site_a_product_draft_text($product['metaTitle'], 'metaTitle'),
        'meta_description' => tio2_site_a_product_draft_text($product['metaDescription'], 'metaDescription'),
        'eyebrow' => tio2_site_a_product_draft_text($product['eyebrow'], 'eyebrow'),
        'customer_problem_headline' => tio2_site_a_product_draft_text($product['customerProblemHeadline'], 'customerProblemHeadline'),
        'quick_answer' => tio2_site_a_product_draft_text($product['quickAnswer'], 'quickAnswer'),
        'product_type' => tio2_site_a_product_draft_text($product['productType'], 'productType'),
        'primary_application' => tio2_site_a_product_draft_text($product['primaryApplication'], 'primaryApplication'),
        'packaging' => tio2_site_a_product_draft_text($product['packaging'], 'packaging'),
        'tds_access' => tio2_site_a_product_draft_text($product['tdsAccess'], 'tdsAccess'),
        'fit_when' => tio2_site_a_product_draft_text_list($product['fitWhen'], 'fitWhen', 3),
        'discuss_first_when' => tio2_site_a_product_draft_text_list($product['discussFirstWhen'], 'discussFirstWhen', 1),
        'performance_priorities' => $priorities,
        'recommended_applications' => $recommended,
        'evidence_statement' => tio2_site_a_product_draft_text($product['evidenceStatement'], 'evidenceStatement'),
        'typical_properties' => $properties,
        'validation_checklist' => tio2_site_a_product_draft_text_list($product['validationChecklist'], 'validationChecklist', 1),
        'faq_items' => $faqs,
        'related_links' => $related,
    ];
    foreach (['process' => 'process', 'positioning' => 'positioning', 'surfaceTreatment' => 'surface_treatment'] as $input => $field) {
        if (isset($product[$input])) {
            $meta[$field] = tio2_site_a_product_draft_text($product[$input], $input);
        }
    }
    return [
        'productId' => $product_id,
        'slug' => $slug,
        'path' => '/products/' . $slug,
        'title' => tio2_site_a_product_draft_text($product['title'], 'title'),
        'status' => 'draft',
        'scopes' => ['tio2-a'],
        'family' => $family,
        'meta' => $meta,
    ];
}

/** @param array<string, mixed> $manifest @return list<array<string, mixed>> */
function tio2_site_a_product_draft_validate_manifest(array $manifest): array
{
    if (['products', 'siteId', 'version'] !== array_keys($manifest) &&
        ['siteId', 'version', 'products'] !== array_keys($manifest)) {
        $keys = array_keys($manifest);
        sort($keys, SORT_STRING);
        if (['products', 'siteId', 'version'] !== $keys) {
            throw new InvalidArgumentException('Product manifest keys do not match the approved import contract.');
        }
    }
    if ('0.1' !== ($manifest['version'] ?? null) || 'tio2-a' !== ($manifest['siteId'] ?? null) || ! is_array($manifest['products'] ?? null) || 25 !== count($manifest['products'])) {
        throw new InvalidArgumentException('Product manifest must be the exact Site A v0.1 25-record batch.');
    }
    $records = [];
    foreach ($manifest['products'] as $product) {
        if (! is_array($product)) {
            throw new InvalidArgumentException('Product manifest contains an invalid record.');
        }
        $record = tio2_site_a_product_draft_validate_product($product);
        $records[$record['productId']] = $record;
    }
    $ids = array_keys($records);
    sort($ids, SORT_STRING);
    $expected = TIO2_SITE_A_PRODUCT_DRAFT_IDS;
    sort($expected, SORT_STRING);
    if ($ids !== $expected) {
        throw new InvalidArgumentException('Product manifest does not contain each approved Site A Product ID exactly once.');
    }
    return array_values($records);
}

/** @param array<string, mixed> $left @param array<string, mixed> $right */
function tio2_site_a_product_draft_records_equal(array $left, array $right): bool
{
    return wp_json_encode($left) === wp_json_encode($right);
}

/**
 * The operations adapter keeps deterministic planning testable without a
 * database. The WP-CLI entry point below supplies the concrete local adapter.
 *
 * @param array<string, mixed> $manifest
 * @param array<string, callable> $operations
 * @return array{mode: string, manifestSha256: string, actions: list<array<string, mixed>>}
 */
function tio2_site_a_product_draft_execute(
    string $mode,
    array $manifest,
    string $manifest_sha256,
    ?string $plan_sha256,
    array $operations
): array {
    if (! in_array($mode, ['plan', 'apply'], true)) {
        throw new InvalidArgumentException('Choose plan or apply mode for the Site A Product draft importer.');
    }
    if (1 !== preg_match('/^[a-f0-9]{64}$/D', $manifest_sha256)) {
        throw new InvalidArgumentException('The Product manifest hash is invalid.');
    }
    if ('apply' === $mode && (! is_string($plan_sha256) || ! hash_equals($manifest_sha256, $plan_sha256))) {
        throw new InvalidArgumentException('Apply requires the exact current Plan hash.');
    }
    foreach (['begin', 'commit', 'rollback', 'find', 'assert_relationship_targets', 'write', 'snapshot_site_b', 'assert_site_b'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Product draft importer operation {$required} is required.");
        }
    }

    $records = tio2_site_a_product_draft_validate_manifest($manifest);
    $transaction_started = false;
    try {
        $operations['begin']();
        $transaction_started = true;
        $site_b_hash = $operations['snapshot_site_b']();
        $actions = [];
        foreach ($records as $record) {
            $operations['assert_relationship_targets']($record);
            $existing = $operations['find']($record['productId']);
            if (is_array($existing) && ['tio2-a'] !== ($existing['scopes'] ?? null)) {
                throw new RuntimeException('Product ID collision is not scoped exactly to Site A.');
            }
            $action = ! is_array($existing)
                ? 'create'
                : (tio2_site_a_product_draft_records_equal($existing, $record) ? 'no-change' : 'update');
            $actions[] = ['productId' => $record['productId'], 'action' => $action, 'record' => $record];
        }
        if ('plan' === $mode) {
            $operations['rollback']();
            $transaction_started = false;
            return ['mode' => 'plan', 'manifestSha256' => $manifest_sha256, 'actions' => $actions];
        }
        if (isset($operations['create_identity']) && is_callable($operations['create_identity'])) {
            foreach ($actions as $operation) {
                if ('create' === $operation['action']) {
                    $operations['create_identity']($operation['record']);
                }
            }
        }
        foreach ($actions as $operation) {
            if ('no-change' !== $operation['action']) {
                $operations['write']($operation['action'], $operation['record']);
            }
        }
        $operations['assert_site_b']($site_b_hash);
        $operations['commit']();
        $transaction_started = false;
        return ['mode' => 'apply', 'manifestSha256' => $manifest_sha256, 'actions' => $actions];
    } catch (Throwable $error) {
        if ($transaction_started) {
            $operations['rollback']();
        }
        throw $error;
    }
}

/** @return array<string, mixed> */
function tio2_site_a_product_draft_read_capability(array $args): array
{
    if (1 !== count($args) || ! is_string($args[0]) || ! is_readable($args[0])) {
        throw new RuntimeException('The local Product draft capability file is required.');
    }
    $capability = json_decode((string) file_get_contents($args[0]), true, 512, JSON_THROW_ON_ERROR);
    $token = getenv('TIO2_LOCAL_PRODUCT_DRAFT_CAPABILITY');
    if (! is_array($capability) ||
        1 !== ($capability['version'] ?? null) ||
        ! is_string($token) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token) ||
        ! is_string($capability['token'] ?? null) || ! hash_equals($capability['token'], $token) ||
        ! in_array($capability['mode'] ?? null, ['plan', 'apply'], true) ||
        ! is_string($capability['manifestPath'] ?? null) || ! is_readable($capability['manifestPath']) ||
        ! is_string($capability['manifestSha256'] ?? null) ||
        1 !== preg_match('/^[a-f0-9]{64}$/D', $capability['manifestSha256']) ||
        ! is_string($capability['planSha256'] ?? null) ||
        1 !== preg_match('/^[a-f0-9]{64}$/D', $capability['planSha256']) ||
        ! hash_equals($capability['manifestSha256'], hash_file('sha256', $capability['manifestPath'])) ||
        ('apply' === $capability['mode'] && ! hash_equals($capability['manifestSha256'], $capability['planSha256']))
    ) {
        throw new RuntimeException('The local Product draft capability contract was rejected.');
    }
    return $capability;
}

/** @return string */
function tio2_site_a_product_draft_site_b_hash(): string
{
    global $wpdb;
    $rows = $wpdb->get_results(
        "SELECT p.*
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
         INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
         INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
         WHERE tt.taxonomy = 'site_scope' AND t.slug = 'tio2-b'
         ORDER BY p.ID ASC",
        ARRAY_A
    );
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not snapshot the frozen Site B database rows.');
    }
    foreach ($rows as &$row) {
        $post_id = (int) $row['ID'];
        $meta = get_post_meta($post_id);
        ksort($meta, SORT_STRING);
        $taxonomies = $wpdb->get_results($wpdb->prepare(
            "SELECT tt.taxonomy AS taxonomy, t.term_id AS term_id, t.slug AS slug
             FROM {$wpdb->term_relationships} tr
             INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
             INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
             WHERE tr.object_id = %d
             ORDER BY tt.taxonomy ASC, t.term_id ASC",
            $post_id
        ), ARRAY_A);
        if ('' !== $wpdb->last_error) {
            throw new RuntimeException('Could not snapshot frozen Site B taxonomy assignments.');
        }
        $row['meta'] = $meta;
        $row['taxonomies'] = $taxonomies;
    }
    unset($row);
    return 'sha256:' . hash('sha256', (string) wp_json_encode($rows));
}

/** @param array<string, mixed> $record */
function tio2_site_a_product_draft_assert_relationship_targets(array $record): void
{
    $targets = [];
    foreach ($record['meta']['recommended_applications'] as $target) {
        $targets['application:' . $target['targetKey']] = $target;
    }
    foreach (['applications' => 'application', 'resources' => 'resource'] as $group => $type) {
        foreach ($record['meta']['related_links'][$group] as $target) {
            $targets[$type . ':' . $target['targetKey']] = $target;
        }
    }
    ksort($targets, SORT_STRING);
    foreach ($targets as $target) {
        $type = (string) $target['targetType'];
        $key = (string) $target['targetKey'];
        $post_type = ['application' => 'tio2_application', 'resource' => 'tio2_document'][$type] ?? null;
        $id_field = ['application' => 'application_id', 'resource' => 'resource_id'][$type] ?? null;
        if (null === $post_type || null === $id_field) {
            throw new RuntimeException("Unsupported Product relationship target {$type}:{$key} reached Plan resolution.");
        }
        $ids = get_posts([
            'post_type' => $post_type,
            'post_status' => 'any',
            'fields' => 'ids',
            'posts_per_page' => 2,
            'no_found_rows' => true,
            'meta_key' => $id_field,
            'meta_value' => $key,
        ]);
        if (1 !== count($ids)) {
            throw new RuntimeException("Product relationship target {$type}:{$key} must resolve to exactly one local record during Plan.");
        }
        $post_id = (int) $ids[0];
        $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($scopes)) {
            throw new RuntimeException("Could not read Site scope for Product relationship target {$type}:{$key} during Plan.");
        }
        sort($scopes, SORT_STRING);
        if ('draft' !== get_post_status($post_id) || ['tio2-a'] !== array_values($scopes)) {
            throw new RuntimeException("Product relationship target {$type}:{$key} must be one exact Site A draft during Plan.");
        }
    }
}

/** @param array<string, mixed> $record */
function tio2_site_a_product_draft_prepare_wp_record(array $record): array
{
    $resolve_target = static function (array $target): int {
        $type = $target['targetType'];
        $key = $target['targetKey'];
        if ('productFamily' === $type) {
            $term = get_term_by('slug', $key, 'product_family');
            if (false === $term) {
                $created = wp_insert_term($key, 'product_family', ['slug' => $key]);
                if (is_wp_error($created)) {
                    throw new RuntimeException($created->get_error_message());
                }
                return (int) $created['term_id'];
            }
            return (int) $term->term_id;
        }
        $post_type = ['application' => 'tio2_application', 'resource' => 'tio2_document', 'product' => 'tio2_product'][$type] ?? null;
        $id_field = ['application' => 'application_id', 'resource' => 'resource_id', 'product' => 'product_id'][$type] ?? null;
        if (null === $post_type || null === $id_field) {
            throw new RuntimeException('Unknown Product relationship target type.');
        }
        $query = [
            'post_type' => $post_type,
            'post_status' => 'any',
            'fields' => 'ids',
            'posts_per_page' => 2,
            'no_found_rows' => true,
            'meta_key' => $id_field,
            'meta_value' => 'product' === $type ? strtoupper($key) : $key,
        ];
        $ids = get_posts($query);
        if (1 !== count($ids)) {
            throw new RuntimeException("Relationship target {$type}:{$key} must resolve to exactly one local record.");
        }
        return (int) $ids[0];
    };
    $record['family'] = $resolve_target($record['family']);
    $record['meta']['recommended_applications'] = array_map($resolve_target, $record['meta']['recommended_applications']);
    foreach (['applications', 'resources', 'products'] as $group) {
        $record['meta']['related_links'][$group] = array_map($resolve_target, $record['meta']['related_links'][$group]);
    }
    foreach (['fit_when', 'discuss_first_when', 'validation_checklist'] as $field) {
        $record['meta'][$field] = array_map(
            static fn (string $item): array => ['item' => $item],
            $record['meta'][$field]
        );
    }
    return $record;
}

/** @return array{targetType: string, targetKey: string} */
function tio2_site_a_product_draft_target_from_wp_id(int $id, string $type): array
{
    if ($id <= 0) {
        throw new RuntimeException('Product relationship contains an invalid local ID.');
    }
    if ('product' === $type) {
        $key = get_field('product_id', $id, false);
        if (! is_string($key) || ! in_array($key, TIO2_SITE_A_PRODUCT_DRAFT_IDS, true)) {
            throw new RuntimeException('Product relationship target has no approved Product ID.');
        }
        return ['targetType' => 'product', 'targetKey' => $key];
    }
    $expected_type = ['application' => 'tio2_application', 'resource' => 'tio2_document'][$type] ?? null;
    if (null === $expected_type || $expected_type !== get_post_type($id)) {
        throw new RuntimeException('Product relationship target has the wrong local content type.');
    }
    $id_field = 'application' === $type ? 'application_id' : 'resource_id';
    $key = (string) get_field($id_field, $id, false);
    if (1 !== preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $key)) {
        throw new RuntimeException('Product relationship target has a non-canonical local slug.');
    }
    return ['targetType' => $type, 'targetKey' => $key];
}

/** @param mixed $value @return list<array{targetType: string, targetKey: string}> */
function tio2_site_a_product_draft_targets_from_wp_value($value, string $type): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_map(
        static fn ($id): array => tio2_site_a_product_draft_target_from_wp_id((int) $id, $type),
        array_values($value)
    );
}

/** @param mixed $value @return list<string> */
function tio2_site_a_product_draft_text_list_from_wp_value($value): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_map(
        static fn ($row): string => is_array($row) ? (string) ($row['item'] ?? '') : '',
        array_values($value)
    );
}

/** @param array<string, mixed> $record @return array<string, mixed>|null */
function tio2_site_a_product_draft_find_wp_record(string $product_id): ?array
{
    $ids = get_posts([
        'post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids',
        'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => 'product_id',
        'meta_value' => $product_id,
    ]);
    if ([] === $ids) {
        return null;
    }
    if (1 !== count($ids)) {
        throw new RuntimeException("Product ID {$product_id} is ambiguous.");
    }
    $post_id = (int) $ids[0];
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    $families = wp_get_object_terms($post_id, 'product_family', ['fields' => 'ids']);
    if (is_wp_error($scopes) || is_wp_error($families)) {
        throw new RuntimeException('Could not read Product taxonomy assignments.');
    }
    sort($scopes, SORT_STRING);
    $meta = ['product_id' => $product_id, 'public_path' => (string) get_post_meta($post_id, 'public_path', true)];
    foreach (TIO2_SITE_A_PRODUCT_DRAFT_FIELDS as $field) {
        $value = get_field($field, $post_id, false);
        if ('recommended_applications' === $field) {
            $value = tio2_site_a_product_draft_targets_from_wp_value($value, 'application');
        } elseif ('related_links' === $field) {
            $value = is_array($value) ? [
                'applications' => tio2_site_a_product_draft_targets_from_wp_value($value['applications'] ?? [], 'application'),
                'resources' => tio2_site_a_product_draft_targets_from_wp_value($value['resources'] ?? [], 'resource'),
                'products' => tio2_site_a_product_draft_targets_from_wp_value($value['products'] ?? [], 'product'),
            ] : [];
        } elseif (in_array($field, ['fit_when', 'discuss_first_when', 'validation_checklist'], true)) {
            $value = tio2_site_a_product_draft_text_list_from_wp_value($value);
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
        'family' => 1 === count($families)
            ? ['targetType' => 'productFamily', 'targetKey' => (string) get_term_field('slug', (int) $families[0], 'product_family')]
            : [],
        'meta' => $meta,
    ];
}

/** @param array<string, mixed> $record */
function tio2_site_a_product_draft_write_wp_record(string $action, array $record): void
{
    $stored_record = tio2_site_a_product_draft_prepare_wp_record($record);
    $existing = tio2_site_a_product_draft_find_wp_record($record['productId']);
    if (null === $existing) {
        throw new RuntimeException("Product {$record['productId']} identity was not created.");
    }
    $ids = get_posts([
        'post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids',
        'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => 'product_id',
        'meta_value' => $record['productId'],
    ]);
    $post_id = (int) $ids[0];
    $result = wp_update_post([
        'ID' => $post_id, 'post_type' => 'tio2_product', 'post_status' => 'draft',
        'post_name' => $stored_record['slug'], 'post_title' => $stored_record['title'],
    ], true);
    if (is_wp_error($result)) {
        throw new RuntimeException($result->get_error_message());
    }
    $scope_result = wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
    if (is_wp_error($scope_result)) {
        throw new RuntimeException($scope_result->get_error_message());
    }
    $family_result = wp_set_object_terms($post_id, [(int) $stored_record['family']], 'product_family', false);
    if (is_wp_error($family_result)) {
        throw new RuntimeException($family_result->get_error_message());
    }
    $field_keys = [];
    foreach (tio2_product_field_definitions() as $definition) {
        $field_keys[$definition['name']] = $definition['key'];
    }
    foreach ($stored_record['meta'] as $field => $value) {
        if ('public_path' === $field) {
            update_post_meta($post_id, 'public_path', $value);
            continue;
        }
        if (! isset($field_keys[$field]) || ! in_array($field, TIO2_SITE_A_PRODUCT_DRAFT_FIELDS, true)) {
            throw new RuntimeException("Unknown Product draft meta field {$field}.");
        }
        update_field($field_keys[$field], $value, $post_id);
    }
    $readback = tio2_site_a_product_draft_find_wp_record($record['productId']);
    if (! is_array($readback) || ! tio2_site_a_product_draft_records_equal($readback, $record)) {
        throw new RuntimeException("Product {$record['productId']} read-back rejected the imported draft.");
    }
}

if (defined('WP_CLI') && WP_CLI) {
    try {
        $capability = tio2_site_a_product_draft_read_capability($args);
        if (! current_user_can('manage_options') || ! function_exists('update_field') || ! function_exists('tio2_product_field_definitions')) {
            throw new RuntimeException('Local Product draft import requires an authenticated administrator, ACF, and the Site Model.');
        }
        $manifest = json_decode((string) file_get_contents($capability['manifestPath']), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($manifest)) {
            throw new RuntimeException('The staged Product draft manifest is invalid.');
        }
        global $wpdb;
        $lock_name = 'tio2-site-a-product-draft-import';
        $lock_acquired = 1 === (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock_name));
        if (! $lock_acquired) {
            throw new RuntimeException('Could not acquire the local Product draft import lock.');
        }
        try {
            $operations = [
                'begin' => static function () use ($wpdb): void {
                    if (false === $wpdb->query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE') || false === $wpdb->query('START TRANSACTION')) {
                        throw new RuntimeException('Could not start the local Product draft transaction.');
                    }
                },
                'commit' => static function () use ($wpdb): void {
                    if (false === $wpdb->query('COMMIT')) {
                        throw new RuntimeException('Could not COMMIT the local Product draft transaction.');
                    }
                },
                'rollback' => static function () use ($wpdb): void {
                    if (false === $wpdb->query('ROLLBACK')) {
                        throw new RuntimeException('Could not ROLLBACK the local Product draft transaction.');
                    }
                },
                'find' => static fn (string $product_id): ?array => tio2_site_a_product_draft_find_wp_record($product_id),
                'assert_relationship_targets' => static function (array $record): void {
                    tio2_site_a_product_draft_assert_relationship_targets($record);
                },
                'create_identity' => static function (array $record): void {
                    $created = wp_insert_post([
                        'post_type' => 'tio2_product', 'post_status' => 'draft',
                        'post_name' => $record['slug'], 'post_title' => $record['title'],
                    ], true);
                    if (is_wp_error($created)) {
                        throw new RuntimeException($created->get_error_message());
                    }
                    update_post_meta((int) $created, 'product_id', $record['productId']);
                },
                'write' => static function (string $action, array $record): void {
                    tio2_site_a_product_draft_write_wp_record($action, $record);
                },
                'snapshot_site_b' => static fn (): string => tio2_site_a_product_draft_site_b_hash(),
                'assert_site_b' => static function (string $hash): void {
                    if (! hash_equals($hash, tio2_site_a_product_draft_site_b_hash())) {
                        throw new RuntimeException('Read-back detected a frozen Site B database change.');
                    }
                },
            ];
            $result = tio2_site_a_product_draft_execute(
                $capability['mode'],
                $manifest,
                $capability['manifestSha256'],
                $capability['planSha256'],
                $operations
            );
        } finally {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock_name));
        }
        WP_CLI::log('TIO2_SITE_A_PRODUCT_DRAFT_RESULT ' . wp_json_encode([
            'mode' => $result['mode'], 'manifestSha256' => $result['manifestSha256'],
            'actions' => array_map(static fn (array $action): array => [
                'productId' => $action['productId'], 'action' => $action['action'],
            ], $result['actions']),
        ]));
    } catch (Throwable $error) {
        WP_CLI::error('Site A Product draft import failed: ' . $error->getMessage());
    }
}
