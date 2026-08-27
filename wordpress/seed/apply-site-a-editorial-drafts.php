<?php

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_SITE_A_EDITORIAL_PRODUCT_IDS = [
    'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410', 'TP-C120', 'TP-I100', 'TP-H100',
    'TP-P200', 'TP-P110', 'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100', 'TP-PA110',
    'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110', 'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
];

const TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY = [
    'applications-hub' => ['/applications', 'hub', null],
    'coatings' => ['/applications/coatings', 'category', 'applications-hub'],
    'plastics' => ['/applications/plastics', 'category', 'applications-hub'],
    'printing-inks' => ['/applications/printing-inks', 'category', 'applications-hub'],
    'decorative-paper' => ['/applications/decorative-paper', 'category', 'applications-hub'],
    'solar-film' => ['/applications/solar-film', 'category', 'applications-hub'],
    'high-purity' => ['/applications/high-purity', 'category', 'applications-hub'],
    'water-based-paint' => ['/applications/titanium-dioxide-for-water-based-paint', 'detail', 'coatings'],
    'masterbatch' => ['/applications/titanium-dioxide-for-masterbatch', 'detail', 'plastics'],
    'polycarbonate' => ['/applications/titanium-dioxide-for-polycarbonate', 'detail', 'plastics'],
    'printing-ink' => ['/applications/titanium-dioxide-for-printing-ink', 'detail', 'printing-inks'],
    'photovoltaic-white-film' => ['/applications/titanium-dioxide-for-photovoltaic-white-film', 'detail', 'solar-film'],
    'mlcc-electronic-ceramics' => ['/applications/high-purity-titanium-dioxide-for-mlcc', 'detail', 'high-purity'],
    'outdoor-pvc' => ['/applications/titanium-dioxide-for-outdoor-pvc', 'detail', 'plastics'],
    'film-masterbatch' => ['/applications/titanium-dioxide-for-film-masterbatch', 'detail', 'plastics'],
    'soft-pvc-solar-backsheet' => ['/applications/titanium-dioxide-for-soft-pvc-solar-backsheet', 'detail', 'plastics'],
    'lcp-high-temperature-plastics' => ['/applications/titanium-dioxide-for-lcp', 'detail', 'plastics'],
    'uv-resistant-engineering-plastics' => ['/applications/uv-resistant-titanium-dioxide-engineering-plastics', 'detail', 'plastics'],
    'decorative-paper-detail' => ['/applications/titanium-dioxide-for-decorative-paper', 'detail', 'decorative-paper'],
    'laminated-decorative-paper' => ['/applications/titanium-dioxide-for-laminated-decorative-paper', 'detail', 'decorative-paper'],
    'electrophoretic-coating' => ['/applications/titanium-dioxide-for-electrophoretic-coating', 'detail', 'coatings'],
    'high-pvc-flat-paint' => ['/applications/titanium-dioxide-for-high-pvc-paint', 'detail', 'coatings'],
    'automotive-coatings' => ['/applications/titanium-dioxide-for-automotive-coatings', 'detail', 'coatings'],
    'waterborne-automotive-coatings' => ['/applications/titanium-dioxide-for-waterborne-automotive-coatings', 'detail', 'coatings'],
    'marine-aerospace-protective' => ['/applications/titanium-dioxide-for-protective-coatings', 'detail', 'coatings'],
    'powder-coil-coatings' => ['/applications/titanium-dioxide-for-powder-coil-coatings', 'detail', 'coatings'],
    'universal-multi-application' => ['/applications/multi-purpose-titanium-dioxide', 'detail', 'applications-hub'],
    'functional-materials' => ['/applications/high-purity-titanium-dioxide-functional-materials', 'detail', 'high-purity'],
];

const TIO2_SITE_A_EDITORIAL_RESOURCE_INVENTORY = [
    'resources-hub' => ['/resources', 'hub'],
    'article-01' => ['/resources/rutile-vs-anatase-titanium-dioxide', 'article'],
    'article-02' => ['/resources/chloride-vs-sulfate-titanium-dioxide', 'article'],
    'article-03' => ['/resources/tio2-content-vs-performance', 'article'],
    'article-04' => ['/resources/titanium-dioxide-oil-absorption', 'article'],
    'article-05' => ['/resources/cbu-titanium-dioxide-meaning', 'article'],
    'article-06' => ['/resources/titanium-dioxide-surface-treatment', 'article'],
    'article-07' => ['/resources/evaluate-titanium-dioxide-alternative', 'article'],
    'article-08' => ['/resources/reduce-tio2-cost-high-pvc-paint', 'article'],
    'article-09' => ['/resources/titanium-dioxide-polycarbonate-yellowing', 'article'],
    'article-10' => ['/resources/titanium-dioxide-outdoor-durability', 'article'],
];

const TIO2_SITE_A_EDITORIAL_APPLICATION_FIELDS = [
    'application_id', 'application_level', 'family', 'parent_application', 'meta_title',
    'meta_description', 'eyebrow', 'headline', 'direct_answer', 'application_context', 'buyer_problem',
    'selection_factors', 'powder_data_limits', 'validation_plan', 'customer_inputs', 'body_sections',
    'faq_items', 'child_applications', 'related_applications', 'related_resources', 'related_products',
    'ctas', 'technical_disclaimer',
];

const TIO2_SITE_A_EDITORIAL_RESOURCE_FIELDS = [
    'resource_id', 'resource_kind', 'cluster', 'meta_title', 'meta_description', 'eyebrow',
    'headline', 'direct_answer', 'key_takeaways', 'sections', 'comparison_table', 'practical_implications',
    'common_mistakes', 'evaluation_method', 'faq_items', 'child_resources', 'related_applications',
    'related_resources', 'related_products', 'ctas', 'technical_disclaimer',
];

/** @param mixed $value */
function tio2_site_a_editorial_canonicalize($value)
{
    if (! is_array($value)) {
        return $value;
    }
    if (array_is_list($value)) {
        return array_map('tio2_site_a_editorial_canonicalize', array_values($value));
    }
    ksort($value, SORT_STRING);
    foreach ($value as $key => $item) {
        $value[$key] = tio2_site_a_editorial_canonicalize($item);
    }
    return $value;
}

/** @param mixed $value */
function tio2_site_a_editorial_sha256($value): string
{
    return hash('sha256', (string) wp_json_encode(tio2_site_a_editorial_canonicalize($value)));
}

function tio2_site_a_editorial_assert_local_wp_environment(): void
{
    $home = function_exists('get_option') ? (string) get_option('home') : '';
    $site_url = function_exists('get_option') ? (string) get_option('siteurl') : '';
    if (
        PHP_SAPI !== 'cli' ||
        ! defined('DB_NAME') || 'tio2_local' !== DB_NAME ||
        ! defined('DB_HOST') || 'db:3306' !== DB_HOST ||
        'http://localhost:8080' !== $home ||
        'http://localhost:8080' !== $site_url
    ) {
        throw new RuntimeException('This command requires the exact local WordPress environment.');
    }
}

/**
 * Return every registered type that can independently own WordPress content.
 *
 * The exclusions are limited to ACF schema rows, customization state, cache
 * rows, parent revisions, and privacy workflow requests. All other types are
 * included conservatively, including private/search-hidden and future custom
 * types, so WP_Query receives a deterministic explicit list instead of `any`.
 *
 * @return list<string>
 */
function tio2_site_a_editorial_collision_post_types(): array
{
    $excluded = array_fill_keys([
        'acf-field', 'acf-field-group', 'acf-post-type', 'acf-taxonomy',
        'custom_css', 'customize_changeset', 'oembed_cache', 'revision', 'user_request',
    ], true);
    $registered = get_post_types([], 'names');
    if (! is_array($registered)) {
        throw new RuntimeException('Could not enumerate registered editorial collision post types.');
    }
    $types = [];
    foreach (array_values($registered) as $post_type) {
        if (is_string($post_type) && '' !== $post_type && ! isset($excluded[$post_type])) {
            $types[] = $post_type;
        }
    }
    $types = array_values(array_unique($types));
    sort($types, SORT_STRING);
    if ([] === $types) {
        throw new RuntimeException('No registered editorial collision post types were available.');
    }
    return $types;
}

/** @param mixed $value */
function tio2_site_a_editorial_required_string($value, string $name): string
{
    if (! is_string($value) || '' === trim($value)) {
        throw new InvalidArgumentException("Editorial {$name} must be a non-empty string.");
    }
    return $value;
}

/** @param mixed $items @return list<string> */
function tio2_site_a_editorial_string_list($items, string $name): array
{
    if (! is_array($items) || ! array_is_list($items)) {
        throw new InvalidArgumentException("Editorial {$name} must be a list.");
    }
    return array_map(static fn ($item): string => tio2_site_a_editorial_required_string($item, $name), $items);
}

/** @param mixed $targets @return array{application: list<string>, resource: list<string>, product: list<string>} */
function tio2_site_a_editorial_targets($targets, string $name): array
{
    if (! is_array($targets) || ! array_is_list($targets)) {
        throw new InvalidArgumentException("Editorial {$name} must be a target list.");
    }
    $result = ['application' => [], 'resource' => [], 'product' => []];
    foreach ($targets as $target) {
        if (! is_array($target) || ['id', 'type'] !== (static function (array $keys): array { sort($keys, SORT_STRING); return $keys; })(array_keys($target))) {
            throw new InvalidArgumentException("Editorial {$name} contains a malformed target.");
        }
        $type = $target['type'] ?? null;
        $id = $target['id'] ?? null;
        if (! is_string($type) || ! isset($result[$type]) || ! is_string($id)) {
            throw new InvalidArgumentException("Editorial {$name} contains an unknown target.");
        }
        if ('application' === $type && ! isset(TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY[$id])) {
            throw new InvalidArgumentException("Editorial {$name} references an unknown Application {$id}.");
        }
        if ('resource' === $type && ! isset(TIO2_SITE_A_EDITORIAL_RESOURCE_INVENTORY[$id])) {
            throw new InvalidArgumentException("Editorial {$name} references an unknown Resource {$id}.");
        }
        if ('product' === $type && ! in_array($id, TIO2_SITE_A_EDITORIAL_PRODUCT_IDS, true)) {
            throw new InvalidArgumentException("Editorial {$name} references an unknown Product {$id}.");
        }
        $result[$type][] = $id;
    }
    foreach ($result as &$ids) {
        $ids = array_values(array_unique($ids));
        sort($ids, SORT_STRING);
    }
    unset($ids);
    return $result;
}

/** @param mixed $manifest @return list<array<string, mixed>> */
function tio2_site_a_editorial_manifest_records($manifest, string $kind): array
{
    if (! is_array($manifest) || '0.1' !== ($manifest['version'] ?? null) || 'tio2-a' !== ($manifest['siteId'] ?? null) || ! is_array($manifest['records'] ?? null) || ! array_is_list($manifest['records'])) {
        throw new InvalidArgumentException("The Site A {$kind} manifest root is invalid.");
    }
    $inventory = 'Application' === $kind ? TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY : TIO2_SITE_A_EDITORIAL_RESOURCE_INVENTORY;
    if (count($inventory) !== count($manifest['records'])) {
        throw new InvalidArgumentException("The Site A {$kind} manifest cardinality is invalid.");
    }
    $seen = [];
    foreach ($manifest['records'] as $record) {
        if (! is_array($record) || ! is_array($record['identity'] ?? null)) {
            throw new InvalidArgumentException("The Site A {$kind} manifest contains a malformed record.");
        }
        $identity = $record['identity'];
        $id = $identity['id'] ?? null;
        if (! is_string($id) || ! isset($inventory[$id]) || isset($seen[$id])) {
            throw new InvalidArgumentException("The Site A {$kind} manifest identity set is invalid.");
        }
        $seen[$id] = true;
        $expected = $inventory[$id];
        if (($identity['path'] ?? null) !== $expected[0] || ('Application' === $kind ? ($identity['level'] ?? null) : ($identity['kind'] ?? null)) !== $expected[1] || ('Application' === $kind && ($identity['parentId'] ?? null) !== $expected[2])) {
            throw new InvalidArgumentException("The Site A {$kind} identity {$id} has a noncanonical path or hierarchy.");
        }
        if (($identity['slug'] ?? null) !== ltrim(substr($expected[0], (int) strrpos($expected[0], '/')), '/')) {
            throw new InvalidArgumentException("The Site A {$kind} identity {$id} has a noncanonical slug.");
        }
    }
    if (array_keys($inventory) !== array_keys($seen)) {
        throw new InvalidArgumentException("The Site A {$kind} manifest order or identity set is invalid.");
    }
    return $manifest['records'];
}

/** @param mixed $manifest @return array<string, true> */
function tio2_site_a_editorial_product_keys($manifest): array
{
    if (! is_array($manifest) || '0.1' !== ($manifest['version'] ?? null) || 'tio2-a' !== ($manifest['siteId'] ?? null) || ! is_array($manifest['products'] ?? null) || ! array_is_list($manifest['products'])) {
        throw new InvalidArgumentException('The strict Site A Product manifest root is invalid.');
    }
    $keys = [];
    foreach ($manifest['products'] as $product) {
        $id = is_array($product) ? ($product['productId'] ?? null) : null;
        if (! is_string($id) || ! in_array($id, TIO2_SITE_A_EDITORIAL_PRODUCT_IDS, true) || isset($keys[$id])) {
            throw new InvalidArgumentException('The strict Site A Product manifest identity set is invalid.');
        }
        $keys[$id] = true;
    }
    if (TIO2_SITE_A_EDITORIAL_PRODUCT_IDS !== array_keys($keys)) {
        throw new InvalidArgumentException('The strict Site A Product manifest must contain the exact 25 Product IDs in canonical order.');
    }
    return $keys;
}

/** @param array<string, mixed> $record @return array<string, mixed> */
function tio2_site_a_editorial_application_record(array $record, string $relationship_mode, array $product_keys, array &$deferred): array
{
    $identity = $record['identity'];
    $id = $identity['id'];
    $children = tio2_site_a_editorial_targets($record['children'] ?? null, "Application {$id} children");
    if ([] !== $children['product'] || [] !== $children['resource']) {
        throw new InvalidArgumentException("Application {$id} children must be Applications.");
    }
    $relationships = tio2_site_a_editorial_targets($record['relationships'] ?? null, "Application {$id} relationships");
    foreach ($relationships['product'] as $product_id) {
        if (! isset($product_keys[$product_id])) {
            throw new InvalidArgumentException("Application {$id} references Product {$product_id} outside the strict Product manifest.");
        }
        if ('DeferredProductRelations' === $relationship_mode) {
            $deferred[] = ['sourceType' => 'application', 'sourceId' => $id, 'field' => 'relationships', 'targetProductId' => $product_id];
        }
    }
    $seo = $record['seo'] ?? [];
    $hero = $record['hero'] ?? [];
    $guide = $record['decisionGuide'] ?? [];
    $meta = [
        'application_id' => $id,
        'application_level' => $identity['level'],
        'family' => tio2_site_a_editorial_required_string($identity['family'] ?? null, "Application {$id} family"),
        'parent_application' => $identity['parentId'],
        'meta_title' => tio2_site_a_editorial_required_string($seo['title'] ?? null, "Application {$id} SEO title"),
        'meta_description' => tio2_site_a_editorial_required_string($seo['description'] ?? null, "Application {$id} SEO description"),
        'eyebrow' => tio2_site_a_editorial_required_string($hero['eyebrow'] ?? null, "Application {$id} eyebrow"),
        'headline' => tio2_site_a_editorial_required_string($hero['headline'] ?? null, "Application {$id} headline"),
        'direct_answer' => tio2_site_a_editorial_required_string($hero['directAnswer'] ?? null, "Application {$id} direct answer"),
        'application_context' => tio2_site_a_editorial_required_string($guide['context'] ?? null, "Application {$id} context"),
        'buyer_problem' => tio2_site_a_editorial_required_string($guide['buyerProblem'] ?? null, "Application {$id} buyer problem"),
        'selection_factors' => tio2_site_a_editorial_string_list($guide['selectionFactors'] ?? null, "Application {$id} selection factors"),
        'powder_data_limits' => tio2_site_a_editorial_required_string($guide['powderDataLimits'] ?? null, "Application {$id} powder data limits"),
        'validation_plan' => tio2_site_a_editorial_string_list($guide['validationPlan'] ?? null, "Application {$id} validation plan"),
        'customer_inputs' => tio2_site_a_editorial_string_list($guide['customerInputs'] ?? null, "Application {$id} customer inputs"),
        'body_sections' => array_map(static fn (array $section): array => ['section_id' => $section['id'], 'heading' => $section['heading'], 'html' => $section['html']], $record['bodySections'] ?? []),
        'faq_items' => array_map(static fn (array $faq): array => ['question' => $faq['question'], 'answer' => $faq['answerHtml']], $record['faqs'] ?? []),
        'child_applications' => $children['application'],
        'related_applications' => $relationships['application'],
        'related_resources' => $relationships['resource'],
        'related_products' => 'Strict' === $relationship_mode ? $relationships['product'] : [],
        'ctas' => array_values($record['ctas'] ?? []),
        'technical_disclaimer' => tio2_site_a_editorial_required_string($record['disclaimerHtml'] ?? null, "Application {$id} disclaimer"),
    ];
    return ['entityType' => 'application', 'id' => $id, 'postType' => 'tio2_application', 'slug' => $identity['slug'], 'path' => $identity['path'], 'title' => $identity['title'], 'status' => 'draft', 'scopes' => ['tio2-a'], 'meta' => $meta];
}

/** @param array<string, mixed> $record @return array<string, mixed> */
function tio2_site_a_editorial_resource_record(array $record, string $relationship_mode, array $product_keys, array &$deferred): array
{
    $identity = $record['identity'];
    $id = $identity['id'];
    $children = tio2_site_a_editorial_targets($record['children'] ?? null, "Resource {$id} children");
    if ([] !== $children['product'] || [] !== $children['application']) {
        throw new InvalidArgumentException("Resource {$id} children must be Resources.");
    }
    $relationships = tio2_site_a_editorial_targets($record['relationships'] ?? null, "Resource {$id} relationships");
    foreach ($relationships['product'] as $product_id) {
        if (! isset($product_keys[$product_id])) {
            throw new InvalidArgumentException("Resource {$id} references Product {$product_id} outside the strict Product manifest.");
        }
        if ('DeferredProductRelations' === $relationship_mode) {
            $deferred[] = ['sourceType' => 'resource', 'sourceId' => $id, 'field' => 'relationships', 'targetProductId' => $product_id];
        }
    }
    $seo = $record['seo'] ?? [];
    $hero = $record['hero'] ?? [];
    $table = $record['comparisonTable'] ?? null;
    $meta = [
        'resource_id' => $id,
        'resource_kind' => $identity['kind'],
        'cluster' => tio2_site_a_editorial_required_string($identity['cluster'] ?? null, "Resource {$id} cluster"),
        'meta_title' => tio2_site_a_editorial_required_string($seo['title'] ?? null, "Resource {$id} SEO title"),
        'meta_description' => tio2_site_a_editorial_required_string($seo['description'] ?? null, "Resource {$id} SEO description"),
        'eyebrow' => tio2_site_a_editorial_required_string($hero['eyebrow'] ?? null, "Resource {$id} eyebrow"),
        'headline' => tio2_site_a_editorial_required_string($hero['headline'] ?? null, "Resource {$id} headline"),
        'direct_answer' => tio2_site_a_editorial_required_string($hero['directAnswer'] ?? null, "Resource {$id} direct answer"),
        'key_takeaways' => tio2_site_a_editorial_string_list($record['keyTakeaways'] ?? null, "Resource {$id} key takeaways"),
        'sections' => array_map(static fn (array $section): array => ['section_id' => $section['id'], 'heading' => $section['heading'], 'html' => $section['html']], $record['sections'] ?? []),
        'comparison_table' => null === $table ? null : ['columns' => array_values($table['columns']), 'rows' => array_values($table['rows'])],
        'practical_implications' => tio2_site_a_editorial_string_list($record['practicalImplications'] ?? null, "Resource {$id} practical implications"),
        'common_mistakes' => tio2_site_a_editorial_string_list($record['commonMistakes'] ?? null, "Resource {$id} common mistakes"),
        'evaluation_method' => tio2_site_a_editorial_string_list($record['evaluationMethod'] ?? null, "Resource {$id} evaluation method"),
        'faq_items' => array_map(static fn (array $faq): array => ['question' => $faq['question'], 'answer' => $faq['answerHtml']], $record['faqs'] ?? []),
        'child_resources' => $children['resource'],
        'related_applications' => $relationships['application'],
        'related_resources' => $relationships['resource'],
        'related_products' => 'Strict' === $relationship_mode ? $relationships['product'] : [],
        'ctas' => array_values($record['ctas'] ?? []),
        'technical_disclaimer' => tio2_site_a_editorial_required_string($record['disclaimerHtml'] ?? null, "Resource {$id} disclaimer"),
    ];
    return ['entityType' => 'resource', 'id' => $id, 'postType' => 'tio2_document', 'slug' => $identity['slug'], 'path' => $identity['path'], 'title' => $identity['title'], 'status' => 'draft', 'scopes' => ['tio2-a'], 'meta' => $meta];
}

/** @return list<array<string, mixed>> */
function tio2_site_a_editorial_expected_records(string $relationship_mode, array $applications, array $resources, array $products, ?array &$deferred_edges = null): array
{
    if (! in_array($relationship_mode, ['Strict', 'DeferredProductRelations'], true)) {
        throw new InvalidArgumentException('Choose Strict or DeferredProductRelations for editorial relationships.');
    }
    $application_records = tio2_site_a_editorial_manifest_records($applications, 'Application');
    $resource_records = tio2_site_a_editorial_manifest_records($resources, 'Resource');
    $product_keys = tio2_site_a_editorial_product_keys($products);
    $deferred = [];
    $records = [];
    foreach ($application_records as $record) {
        $records[] = tio2_site_a_editorial_application_record($record, $relationship_mode, $product_keys, $deferred);
    }
    foreach ($resource_records as $record) {
        $records[] = tio2_site_a_editorial_resource_record($record, $relationship_mode, $product_keys, $deferred);
    }
    usort($records, static fn (array $left, array $right): int => [$left['entityType'], $left['id']] <=> [$right['entityType'], $right['id']]);
    usort($deferred, static fn (array $left, array $right): int => [$left['sourceType'], $left['sourceId'], $left['field'], $left['targetProductId']] <=> [$right['sourceType'], $right['sourceId'], $right['field'], $right['targetProductId']]);
    $deferred_edges = $deferred;
    return $records;
}

/** @param array<string, string> $manifest_hashes */
function tio2_site_a_editorial_validate_hashes(array $manifest_hashes): array
{
    if (['applications', 'products', 'resources'] !== (static function (array $keys): array { sort($keys, SORT_STRING); return $keys; })(array_keys($manifest_hashes))) {
        throw new InvalidArgumentException('Editorial import requires exactly three manifest hashes.');
    }
    foreach ($manifest_hashes as $hash) {
        if (! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash)) {
            throw new InvalidArgumentException('Editorial import received an invalid manifest hash.');
        }
    }
    return ['applications' => $manifest_hashes['applications'], 'resources' => $manifest_hashes['resources'], 'products' => $manifest_hashes['products']];
}

/** @param array<string, mixed> $plan */
function tio2_site_a_editorial_plan_sha256(array $plan): string
{
    unset($plan['planSha256'], $plan['mode']);
    return tio2_site_a_editorial_sha256($plan);
}

/** @return list<string> */
function tio2_site_a_editorial_difference_keys(array $expected, array $actual): array
{
    $differences = [];
    foreach (array_values(array_unique(array_merge(array_keys($expected), array_keys($actual)))) as $key) {
        if ('meta' === $key && is_array($expected[$key] ?? null) && is_array($actual[$key] ?? null)) {
            foreach (array_values(array_unique(array_merge(array_keys($expected[$key]), array_keys($actual[$key])))) as $meta_key) {
                if (tio2_site_a_editorial_canonicalize($expected[$key][$meta_key] ?? null) !== tio2_site_a_editorial_canonicalize($actual[$key][$meta_key] ?? null)) {
                    $differences[] = 'meta.' . $meta_key;
                }
            }
        } elseif (tio2_site_a_editorial_canonicalize($expected[$key] ?? null) !== tio2_site_a_editorial_canonicalize($actual[$key] ?? null)) {
            $differences[] = (string) $key;
        }
    }
    sort($differences, SORT_STRING);
    return $differences;
}

/** @param array<string, callable> $operations @return array<string, mixed> */
function tio2_site_a_editorial_build_plan(string $relationship_mode, array $applications, array $resources, array $products, array $manifest_hashes, array $operations): array
{
    foreach (['find', 'find_path', 'resolve_product'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Editorial importer operation {$required} is required.");
        }
    }
    $hashes = tio2_site_a_editorial_validate_hashes($manifest_hashes);
    $deferred = [];
    $records = tio2_site_a_editorial_expected_records($relationship_mode, $applications, $resources, $products, $deferred);
    if ('Strict' === $relationship_mode) {
        $product_ids = [];
        foreach ($records as $record) {
            $product_ids = array_merge($product_ids, $record['meta']['related_products']);
        }
        $product_ids = array_values(array_unique($product_ids));
        sort($product_ids, SORT_STRING);
        foreach ($product_ids as $product_id) {
            $resolved = $operations['resolve_product']($product_id);
            if (! is_array($resolved) || 'product' !== ($resolved['entityType'] ?? null) || $product_id !== ($resolved['id'] ?? null) || 'tio2_product' !== ($resolved['postType'] ?? null) || ['tio2-a'] !== ($resolved['scopes'] ?? null)) {
                throw new RuntimeException("Product {$product_id} must resolve to the exact Site A Product record in Strict mode.");
            }
        }
    }
    $actions = [];
    foreach ($records as $record) {
        $existing = $operations['find']($record['entityType'], $record['id']);
        if (is_array($existing)) {
            if ($record['postType'] !== ($existing['postType'] ?? null)) {
                throw new RuntimeException("Editorial ID {$record['id']} collision has the wrong post type.");
            }
            if (['tio2-a'] !== ($existing['scopes'] ?? null)) {
                throw new RuntimeException("Editorial ID {$record['id']} collision is not scoped exactly to Site A.");
            }
            if ($record['path'] !== ($existing['path'] ?? null)) {
                throw new RuntimeException("Editorial ID {$record['id']} collision has a noncanonical path.");
            }
        }
        $path_owner = $operations['find_path']($record['path'], $record['entityType'], $record['id']);
        if (is_array($path_owner) && ($record['entityType'] !== ($path_owner['entityType'] ?? null) || $record['id'] !== ($path_owner['id'] ?? null))) {
            throw new RuntimeException("Canonical path {$record['path']} is owned by another record.");
        }
        $action = ! is_array($existing) ? 'create' : (tio2_site_a_editorial_canonicalize($existing) === tio2_site_a_editorial_canonicalize($record) ? 'no-change' : 'update');
        $actions[] = [
            'entityType' => $record['entityType'],
            'id' => $record['id'],
            'action' => $action,
            'currentRecordSha256' => is_array($existing) ? tio2_site_a_editorial_sha256($existing) : null,
            'expectedRecordSha256' => tio2_site_a_editorial_sha256($record),
        ];
    }
    $plan = ['version' => 1, 'mode' => 'plan', 'relationshipMode' => $relationship_mode, 'manifestSha256' => $hashes, 'actions' => $actions, 'deferredProductEdges' => $deferred];
    $plan['planSha256'] = tio2_site_a_editorial_plan_sha256($plan);
    $plan['_records'] = $records;
    return $plan;
}

/** @param array<string, callable> $operations @return array<string, mixed> */
function tio2_site_a_editorial_draft_execute(string $mode, string $relationship_mode, array $applications, array $resources, array $products, array $manifest_hashes, ?string $plan_sha256, array $operations): array
{
    if (! in_array($mode, ['plan', 'apply'], true)) {
        throw new InvalidArgumentException('Choose plan or apply mode for the Site A editorial draft importer.');
    }
    $plan = tio2_site_a_editorial_build_plan($relationship_mode, $applications, $resources, $products, $manifest_hashes, $operations);
    $records = $plan['_records'];
    unset($plan['_records']);
    if ('plan' === $mode) {
        return $plan;
    }
    if (! is_string($plan_sha256) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $plan_sha256) || ! hash_equals($plan['planSha256'], $plan_sha256)) {
        throw new InvalidArgumentException('Apply requires the exact deterministic current Plan result hash.');
    }
    foreach (['snapshot_site_b', 'assert_site_b', 'snapshot_queue', 'restore_queue', 'begin', 'commit', 'rollback', 'create_identity', 'write', 'readback'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Editorial importer operation {$required} is required.");
        }
    }
    $site_b_hash = $operations['snapshot_site_b']();
    $queue = $operations['snapshot_queue']();
    $transaction_started = false;
    try {
        $operations['begin']();
        $transaction_started = true;
        foreach ($plan['actions'] as $index => $action) {
            if ('create' === $action['action']) {
                $operations['create_identity']($records[$index]);
            }
        }
        foreach ($plan['actions'] as $index => $action) {
            if ('no-change' !== $action['action']) {
                $operations['write']($action['action'], $records[$index]);
            }
        }
        foreach ($records as $record) {
            $readback = $operations['readback']($record['entityType'], $record['id']);
            if (! is_array($readback) || tio2_site_a_editorial_canonicalize($readback) !== tio2_site_a_editorial_canonicalize($record)) {
                $difference_keys = is_array($readback) ? tio2_site_a_editorial_difference_keys($record, $readback) : ['record'];
                throw new RuntimeException("Editorial {$record['entityType']} {$record['id']} failed normalized in-transaction readback: " . implode(', ', $difference_keys) . '.');
            }
        }
        $operations['assert_site_b']($site_b_hash);
        $operations['restore_queue']($queue);
        $operations['commit']();
        $transaction_started = false;
    } catch (Throwable $error) {
        $failure = $error;
        try {
            if ($transaction_started) {
                $operations['rollback']();
            }
        } catch (Throwable $rollback_error) {
            $failure = $rollback_error;
        } finally {
            try {
                $operations['restore_queue']($queue);
            } finally {
                $operations['assert_site_b']($site_b_hash);
            }
        }
        throw $failure;
    }
    $plan['mode'] = 'apply';
    return $plan;
}

/** @return array<string, mixed> */
function tio2_site_a_editorial_read_capability(array $args): array
{
    if (1 !== count($args) || ! is_string($args[0]) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-editorial-draft-capability-[a-f0-9]{32}\.json$~D', $args[0]) || ! is_readable($args[0])) {
        throw new RuntimeException('The local editorial draft capability file is required.');
    }
    $capability = json_decode((string) file_get_contents($args[0]), true, 64, JSON_THROW_ON_ERROR);
    $keys = is_array($capability) ? array_keys($capability) : [];
    sort($keys, SORT_STRING);
    $required = ['applicationsPath', 'applicationsSha256', 'mode', 'planSha256', 'productsPath', 'productsSha256', 'relationshipMode', 'resourcesPath', 'resourcesSha256', 'token', 'version'];
    $token = getenv('TIO2_LOCAL_EDITORIAL_DRAFT_CAPABILITY');
    if (! is_array($capability) || $required !== $keys || 1 !== $capability['version'] || ! is_string($token) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token) || ! hash_equals($token, $capability['token']) || ! in_array($capability['mode'], ['plan', 'apply'], true) || ! in_array($capability['relationshipMode'], ['Strict', 'DeferredProductRelations'], true)) {
        throw new RuntimeException('The local editorial draft capability contract was rejected.');
    }
    foreach (['applications', 'resources', 'products'] as $kind) {
        $path = $capability[$kind . 'Path'];
        $hash = $capability[$kind . 'Sha256'];
        if (! is_string($path) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-editorial-' . $kind . '-[a-f0-9]{32}\.json$~D', $path) || ! is_readable($path) || ! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash) || ! hash_equals($hash, (string) hash_file('sha256', $path))) {
            throw new RuntimeException("The staged editorial {$kind} snapshot was rejected.");
        }
    }
    if ('plan' === $capability['mode'] ? null !== $capability['planSha256'] : (! is_string($capability['planSha256']) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $capability['planSha256']))) {
        throw new RuntimeException('The editorial Plan hash capability value was rejected.');
    }
    return $capability;
}

function tio2_site_a_editorial_site_b_hash(): string
{
    global $wpdb;
    $rows = $wpdb->get_results("SELECT p.* FROM {$wpdb->posts} p INNER JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id WHERE tt.taxonomy = 'site_scope' AND t.slug = 'tio2-b' ORDER BY p.ID ASC", ARRAY_A);
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not snapshot frozen Site B rows.');
    }
    foreach ($rows as &$row) {
        $id = (int) $row['ID'];
        $meta = get_post_meta($id);
        ksort($meta, SORT_STRING);
        $row['meta'] = $meta;
        $row['taxonomies'] = $wpdb->get_results($wpdb->prepare("SELECT tt.taxonomy, t.term_id, t.slug FROM {$wpdb->term_relationships} tr INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id WHERE tr.object_id = %d ORDER BY tt.taxonomy ASC, t.term_id ASC", $id), ARRAY_A);
    }
    unset($row);
    return 'sha256:' . tio2_site_a_editorial_sha256($rows);
}

/** @return array<string, mixed>|null */
function tio2_site_a_editorial_find_wp_record(string $entity_type, string $id): ?array
{
    $id_field = 'application' === $entity_type ? 'application_id' : 'resource_id';
    $ids = get_posts(['post_type' => tio2_site_a_editorial_collision_post_types(), 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => $id_field, 'meta_value' => $id]);
    if ([] === $ids) {
        return null;
    }
    if (1 !== count($ids)) {
        throw new RuntimeException("Editorial ID {$id} is ambiguous.");
    }
    return tio2_site_a_editorial_read_wp_record((int) $ids[0], $entity_type);
}

/** @param array<string, mixed> $owner */
function tio2_site_a_editorial_is_route_shell(string $path, array $owner): bool
{
    if ('/applications' !== $path || 'page' !== ($owner['postType'] ?? null) || 'publish' !== ($owner['status'] ?? null) || '' !== ($owner['applicationId'] ?? null) || '' !== ($owner['resourceId'] ?? null)) {
        return false;
    }
    $allowed = [
        ['slug' => 'tio2-a--applications', 'title' => 'Site A Synthetic Test Applications', 'scopes' => ['tio2-a']],
        ['slug' => 'tio2-b--applications', 'title' => 'Site B Synthetic Test Applications', 'scopes' => ['tio2-b']],
    ];
    foreach ($allowed as $shell) {
        if ($shell['slug'] === ($owner['slug'] ?? null) && $shell['title'] === ($owner['title'] ?? null) && $shell['scopes'] === ($owner['scopes'] ?? null)) {
            return true;
        }
    }
    return false;
}

/** @return array<string, mixed>|null */
function tio2_site_a_editorial_find_wp_path(string $path, string $expected_entity_type, string $expected_id): ?array
{
    $ids = get_posts(['post_type' => tio2_site_a_editorial_collision_post_types(), 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'no_found_rows' => true, 'meta_key' => 'public_path', 'meta_value' => $path]);
    $managed_owner = null;
    foreach ($ids as $raw_post_id) {
        $post_id = (int) $raw_post_id;
        $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($scopes)) {
            throw new RuntimeException($scopes->get_error_message());
        }
        sort($scopes, SORT_STRING);
        $owner = [
            'postType' => (string) get_post_type($post_id),
            'status' => (string) get_post_status($post_id),
            'slug' => (string) get_post_field('post_name', $post_id),
            'title' => (string) get_post_field('post_title', $post_id),
            'applicationId' => (string) get_post_meta($post_id, 'application_id', true),
            'resourceId' => (string) get_post_meta($post_id, 'resource_id', true),
            'scopes' => array_values($scopes),
        ];
        $owner_entity_type = ['tio2_application' => 'application', 'tio2_document' => 'resource'][$owner['postType']] ?? null;
        $owner_id = 'application' === $owner_entity_type ? $owner['applicationId'] : ('resource' === $owner_entity_type ? $owner['resourceId'] : null);
        $opposite_id = 'application' === $owner_entity_type ? $owner['resourceId'] : $owner['applicationId'];
        if ($expected_entity_type === $owner_entity_type && $expected_id === $owner_id && '' === $opposite_id && ['tio2-a'] === $owner['scopes']) {
            if (null !== $managed_owner) {
                throw new RuntimeException("Canonical path {$path} has duplicate managed owners.");
            }
            $managed_owner = ['entityType' => $owner_entity_type, 'id' => $owner_id];
            continue;
        }
        if (tio2_site_a_editorial_is_route_shell($path, $owner)) {
            continue;
        }
        throw new RuntimeException("Canonical path {$path} is owned by another record.");
    }
    return $managed_owner;
}

/** @return array<string, mixed>|null */
function tio2_site_a_editorial_resolve_wp_product(string $product_id): ?array
{
    $ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => 'product_id', 'meta_value' => $product_id]);
    if (1 !== count($ids)) {
        return null;
    }
    $scopes = wp_get_object_terms((int) $ids[0], 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        throw new RuntimeException($scopes->get_error_message());
    }
    sort($scopes, SORT_STRING);
    return ['entityType' => 'product', 'id' => (string) get_field('product_id', (int) $ids[0], false), 'postType' => (string) get_post_type((int) $ids[0]), 'scopes' => array_values($scopes)];
}

function tio2_site_a_editorial_target_wp_id(string $type, string $id): int
{
    $post_type = ['application' => 'tio2_application', 'resource' => 'tio2_document', 'product' => 'tio2_product'][$type] ?? null;
    $id_field = ['application' => 'application_id', 'resource' => 'resource_id', 'product' => 'product_id'][$type] ?? null;
    if (null === $post_type || null === $id_field) {
        throw new RuntimeException('Unknown editorial relationship type.');
    }
    $ids = get_posts(['post_type' => $post_type, 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => $id_field, 'meta_value' => $id]);
    if (1 !== count($ids)) {
        throw new RuntimeException("Editorial relationship {$type}:{$id} must resolve to one existing record; placeholders are forbidden.");
    }
    $scopes = wp_get_object_terms((int) $ids[0], 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        throw new RuntimeException($scopes->get_error_message());
    }
    sort($scopes, SORT_STRING);
    if (['tio2-a'] !== array_values($scopes)) {
        throw new RuntimeException("Editorial relationship {$type}:{$id} is not scoped exactly to Site A.");
    }
    return (int) $ids[0];
}

/** @param mixed $value @return list<string> */
function tio2_site_a_editorial_wp_text_list($value, string $key = 'item'): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_map(static fn ($row): string => is_array($row) ? (string) ($row[$key] ?? '') : '', array_values($value));
}

/** @param mixed $value @return array{columns: list<string>, rows: list<list<string>>}|null */
function tio2_site_a_editorial_normalize_comparison_table($value): ?array
{
    if (! is_array($value) || [] === $value) {
        return null;
    }
    $columns = $value['columns'] ?? $value['field_tio2_resource_comparison_table_columns'] ?? [];
    $rows = $value['rows'] ?? $value['field_tio2_resource_comparison_table_rows'] ?? [];
    return [
        'columns' => tio2_site_a_editorial_wp_text_list($columns, 'label'),
        'rows' => array_map(
            static fn ($row): array => tio2_site_a_editorial_wp_text_list(
                is_array($row) ? ($row['cells'] ?? $row['field_tio2_resource_comparison_table_rows_cells'] ?? []) : [],
                'value'
            ),
            array_values(is_array($rows) ? $rows : [])
        ),
    ];
}

/** @param mixed $value @return list<string> */
function tio2_site_a_editorial_wp_targets($value, string $type): array
{
    if (! is_array($value)) {
        return [];
    }
    $field = ['application' => 'application_id', 'resource' => 'resource_id', 'product' => 'product_id'][$type];
    $ids = array_map(static fn ($post_id): string => (string) get_field($field, (int) $post_id, false), array_values($value));
    sort($ids, SORT_STRING);
    return $ids;
}

function tio2_site_a_editorial_assert_wp_meta_allowlist(int $post_id, string $entity_type): void
{
    $fields = 'application' === $entity_type
        ? TIO2_SITE_A_EDITORIAL_APPLICATION_FIELDS
        : array_merge(TIO2_SITE_A_EDITORIAL_RESOURCE_FIELDS, ['comparison_table_columns', 'comparison_table_rows']);
    $allowed = ['public_path' => true, '_edit_lock' => true, '_edit_last' => true, '_wp_old_slug' => true];
    foreach ($fields as $field) {
        $allowed[$field] = true;
        $allowed['_' . $field] = true;
    }
    foreach (array_keys(get_post_meta($post_id)) as $meta_key) {
        if (! isset($allowed[$meta_key])) {
            throw new RuntimeException("Editorial {$entity_type} record contains unexpected metadata key {$meta_key}.");
        }
    }
}

/** @return array<string, mixed> */
function tio2_site_a_editorial_read_wp_record(int $post_id, string $entity_type): array
{
    $is_application = 'application' === $entity_type;
    tio2_site_a_editorial_assert_wp_meta_allowlist($post_id, $entity_type);
    $fields = $is_application ? TIO2_SITE_A_EDITORIAL_APPLICATION_FIELDS : TIO2_SITE_A_EDITORIAL_RESOURCE_FIELDS;
    $id_field = $is_application ? 'application_id' : 'resource_id';
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        throw new RuntimeException($scopes->get_error_message());
    }
    sort($scopes, SORT_STRING);
    $meta = [];
    foreach ($fields as $field) {
        $value = get_field($field, $post_id, false);
        if (in_array($field, ['selection_factors', 'validation_plan', 'customer_inputs', 'key_takeaways', 'practical_implications', 'common_mistakes', 'evaluation_method'], true)) {
            $value = tio2_site_a_editorial_wp_text_list($value);
        } elseif (in_array($field, ['parent_application', 'child_applications', 'related_applications'], true)) {
            $targets = tio2_site_a_editorial_wp_targets(null === $value || '' === $value ? [] : (is_array($value) ? $value : [$value]), 'application');
            $value = 'parent_application' === $field ? ($targets[0] ?? null) : $targets;
        } elseif (in_array($field, ['child_resources', 'related_resources'], true)) {
            $value = tio2_site_a_editorial_wp_targets($value, 'resource');
        } elseif ('related_products' === $field) {
            $value = tio2_site_a_editorial_wp_targets($value, 'product');
        } elseif ('comparison_table' === $field) {
            $value = tio2_site_a_editorial_normalize_comparison_table($value);
        }
        $meta[$field] = $value;
    }
    return ['entityType' => $entity_type, 'id' => (string) get_field($id_field, $post_id, false), 'postType' => (string) get_post_type($post_id), 'slug' => (string) get_post_field('post_name', $post_id), 'path' => (string) get_post_meta($post_id, 'public_path', true), 'title' => (string) get_post_field('post_title', $post_id), 'status' => (string) get_post_status($post_id), 'scopes' => array_values($scopes), 'meta' => $meta];
}

/** @param array<string, mixed> $record */
function tio2_site_a_editorial_write_wp_record(string $action, array $record): void
{
    $existing = tio2_site_a_editorial_find_wp_record($record['entityType'], $record['id']);
    if (! is_array($existing)) {
        throw new RuntimeException("Editorial identity {$record['id']} was not created.");
    }
    $id_field = 'application' === $record['entityType'] ? 'application_id' : 'resource_id';
    $ids = get_posts(['post_type' => $record['postType'], 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => $id_field, 'meta_value' => $record['id']]);
    $post_id = (int) $ids[0];
    $updated = wp_update_post(['ID' => $post_id, 'post_type' => $record['postType'], 'post_status' => 'draft', 'post_name' => $record['slug'], 'post_title' => $record['title']], true);
    if (is_wp_error($updated)) {
        throw new RuntimeException($updated->get_error_message());
    }
    $scope = wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
    if (is_wp_error($scope)) {
        throw new RuntimeException($scope->get_error_message());
    }
    update_post_meta($post_id, 'public_path', $record['path']);
    $definitions = 'application' === $record['entityType'] ? tio2_application_field_definitions() : tio2_resource_field_definitions();
    $keys = [];
    foreach ($definitions as $definition) {
        $keys[$definition['name']] = $definition['key'];
    }
    $relationship_types = [
        'parent_application' => 'application', 'child_applications' => 'application', 'related_applications' => 'application',
        'child_resources' => 'resource', 'related_resources' => 'resource', 'related_products' => 'product',
    ];
    foreach ($record['meta'] as $field => $value) {
        if (! isset($keys[$field])) {
            throw new RuntimeException("Unknown editorial ACF field {$field}.");
        }
        if (isset($relationship_types[$field])) {
            $values = null === $value ? [] : (is_array($value) ? $value : [$value]);
            $resolved = array_map(static fn (string $target): int => tio2_site_a_editorial_target_wp_id($relationship_types[$field], $target), $values);
            $value = 'parent_application' === $field ? ($resolved[0] ?? null) : $resolved;
        } elseif (in_array($field, ['selection_factors', 'validation_plan', 'customer_inputs', 'key_takeaways', 'practical_implications', 'common_mistakes', 'evaluation_method'], true)) {
            $value = array_map(static fn (string $item): array => ['item' => $item], $value);
        } elseif ('comparison_table' === $field && is_array($value)) {
            $value = ['columns' => array_map(static fn (string $label): array => ['label' => $label], $value['columns']), 'rows' => array_map(static fn (array $row): array => ['cells' => array_map(static fn (string $cell): array => ['value' => $cell], $row)], $value['rows'])];
        }
        update_field($keys[$field], $value, $post_id);
    }
    clean_post_cache($post_id);
    wp_cache_delete($post_id, 'post_meta');
    if (function_exists('acf_flush_value_cache')) {
        acf_flush_value_cache($post_id);
    }
}

/** @return array<string, callable> */
function tio2_site_a_editorial_wp_operations(): array
{
    global $wpdb;
    return [
        'find' => static fn (string $type, string $id): ?array => tio2_site_a_editorial_find_wp_record($type, $id),
        'find_path' => static fn (string $path, string $type, string $id): ?array => tio2_site_a_editorial_find_wp_path($path, $type, $id),
        'resolve_product' => static fn (string $id): ?array => tio2_site_a_editorial_resolve_wp_product($id),
        'snapshot_site_b' => static fn (): string => tio2_site_a_editorial_site_b_hash(),
        'assert_site_b' => static function (string $hash): void { if (! hash_equals($hash, tio2_site_a_editorial_site_b_hash())) throw new RuntimeException('Readback detected a frozen Site B change.'); },
        'snapshot_queue' => static fn (): array => isset($GLOBALS['tio2_webhook_queue']) && is_array($GLOBALS['tio2_webhook_queue']) ? $GLOBALS['tio2_webhook_queue'] : [],
        'restore_queue' => static function (array $queue): void { $GLOBALS['tio2_webhook_queue'] = $queue; },
        'begin' => static function () use ($wpdb): void { if (false === $wpdb->query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE') || false === $wpdb->query('START TRANSACTION')) throw new RuntimeException('Could not start the local editorial draft transaction.'); },
        'commit' => static function () use ($wpdb): void { if (false === $wpdb->query('COMMIT')) throw new RuntimeException('Could not COMMIT the local editorial draft transaction.'); },
        'rollback' => static function () use ($wpdb): void {
            if (false === $wpdb->query('ROLLBACK')) throw new RuntimeException('Could not ROLLBACK the local editorial draft transaction.');
            wp_cache_flush();
        },
        'create_identity' => static function (array $record): void {
            $created = wp_insert_post(['post_type' => $record['postType'], 'post_status' => 'draft', 'post_name' => $record['slug'], 'post_title' => $record['title']], true);
            if (is_wp_error($created)) throw new RuntimeException($created->get_error_message());
            $id_field = 'application' === $record['entityType'] ? 'application_id' : 'resource_id';
            update_post_meta((int) $created, $id_field, $record['id']);
            update_post_meta((int) $created, 'public_path', $record['path']);
            $scope = wp_set_object_terms((int) $created, ['tio2-a'], 'site_scope', false);
            if (is_wp_error($scope)) throw new RuntimeException($scope->get_error_message());
        },
        'write' => static fn (string $action, array $record) => tio2_site_a_editorial_write_wp_record($action, $record),
        'readback' => static fn (string $type, string $id): ?array => tio2_site_a_editorial_find_wp_record($type, $id),
    ];
}

if (defined('WP_CLI') && WP_CLI && ! defined('TIO2_SITE_A_EDITORIAL_AUDIT_CONTEXT') && ! defined('TIO2_SITE_A_EDITORIAL_LIBRARY_CONTEXT')) {
    try {
        tio2_site_a_editorial_assert_local_wp_environment();
        $capability = tio2_site_a_editorial_read_capability($args);
        if (! current_user_can('manage_options') || ! function_exists('update_field') || ! function_exists('tio2_application_field_definitions') || ! function_exists('tio2_resource_field_definitions')) {
            throw new RuntimeException('Local editorial draft import requires an authenticated administrator, ACF, and the Site Model.');
        }
        $applications = json_decode((string) file_get_contents($capability['applicationsPath']), true, 512, JSON_THROW_ON_ERROR);
        $resources = json_decode((string) file_get_contents($capability['resourcesPath']), true, 512, JSON_THROW_ON_ERROR);
        $products = json_decode((string) file_get_contents($capability['productsPath']), true, 512, JSON_THROW_ON_ERROR);
        global $wpdb;
        $lock_name = 'tio2-site-a-editorial-draft-import-v01';
        if (1 !== (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock_name))) {
            throw new RuntimeException('Could not acquire the local editorial draft import lock.');
        }
        try {
            $operations = tio2_site_a_editorial_wp_operations();
            $result = tio2_site_a_editorial_draft_execute($capability['mode'], $capability['relationshipMode'], $applications, $resources, $products, ['applications' => $capability['applicationsSha256'], 'resources' => $capability['resourcesSha256'], 'products' => $capability['productsSha256']], $capability['planSha256'], $operations);
        } finally {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock_name));
        }
        WP_CLI::log('TIO2_SITE_A_EDITORIAL_DRAFT_RESULT ' . wp_json_encode($result));
    } catch (Throwable $error) {
        WP_CLI::error('Site A editorial draft import failed: ' . $error->getMessage());
    }
}
