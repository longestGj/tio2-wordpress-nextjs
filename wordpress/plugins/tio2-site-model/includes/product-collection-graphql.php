<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/** @param mixed $value @return list<array<string, mixed>> */
function tio2_product_collection_rows($value): array
{
    return is_array($value) ? array_values(array_filter($value, 'is_array')) : [];
}

/** @param mixed $value @return list<int> */
function tio2_product_collection_ids($value): array
{
    if (! is_array($value)) {
        return [];
    }
    return array_values(array_filter(
        array_map(static fn ($item): int => $item instanceof WP_Post ? (int) $item->ID : (int) $item, $value),
        static fn (int $item): bool => $item > 0
    ));
}

/** @param list<array<string, mixed>> $definitions @return array<string, mixed> */
function tio2_product_collection_values(array $definitions, $object_id): array
{
    $values = [];
    foreach ($definitions as $field) {
        if (! is_array($field) || empty($field['name'])) {
            continue;
        }
        $name = (string) $field['name'];
        $values[$name] = get_field($name, $object_id, false);
    }
    return $values;
}

/** @param mixed $value */
function tio2_product_collection_string($value): string
{
    return trim(is_string($value) ? $value : (string) $value);
}

/** @param mixed $value @return list<string> */
function tio2_product_collection_items($value): array
{
    return array_map(
        static fn (array $row): string => tio2_product_collection_string($row['item'] ?? ''),
        tio2_product_collection_rows($value)
    );
}

/** @param mixed $value @return list<array{question: string, answer: string}> */
function tio2_product_collection_faqs($value): array
{
    return array_map(static fn (array $row): array => [
        'question' => tio2_product_collection_string($row['question'] ?? ''),
        'answer' => tio2_product_collection_string($row['answer'] ?? ''),
    ], tio2_product_collection_rows($value));
}

/**
 * @param mixed $value
 * @return list<array{databaseId: int, title: string, path: string}>|WP_Error
 */
function tio2_product_collection_links($value, string $post_type): array|WP_Error
{
    $links = [];
    foreach (tio2_product_collection_ids($value) as $post_id) {
        $post = get_post($post_id);
        if (! $post instanceof WP_Post || $post_type !== $post->post_type || 'publish' !== $post->post_status) {
            return new WP_Error('product_collection_link_invalid', 'Product collection links must target published Site A records.');
        }
        $link = function_exists('tio2_editorial_link_for_post')
            ? tio2_editorial_link_for_post($post, $post_type)
            : new WP_Error('product_collection_link_invalid');
        if (is_wp_error($link)) {
            return $link;
        }
        $links[] = [
            'databaseId' => $post_id,
            'title' => (string) $link['title'],
            'path' => (string) $link['path'],
        ];
    }
    return $links;
}

/** @param mixed $payload */
function tio2_product_collection_payload_is_safe(
    $payload,
    string $private_scanner = 'tio2_product_contains_private_document_location',
    string $editorial_scanner = 'tio2_editorial_contains_unsafe_value'
): bool
{
    if (! is_callable($private_scanner) || ! is_callable($editorial_scanner)) {
        return false;
    }
    if ($private_scanner($payload)) {
        return false;
    }
    return ! $editorial_scanner($payload);
}

/** @return array<string, mixed>|WP_Error */
function tio2_product_collection_card(WP_Post $product, bool $preview): array|WP_Error
{
    if (
        'tio2_product' !== $product->post_type ||
        ($preview
            ? ! in_array($product->post_status, ['publish', 'draft'], true)
            : 'publish' !== $product->post_status)
    ) {
        return new WP_Error('product_collection_product_status_invalid', 'Product collection records have an invalid visibility state.');
    }
    $path = tio2_product_canonical_path((int) $product->ID);
    if (is_wp_error($path)) {
        return $path;
    }
    $values = tio2_product_collection_values(tio2_product_collection_display_field_definitions(), (int) $product->ID);
    $product_id = get_field('product_id', (int) $product->ID, false);
    if (! is_string($product_id)) {
        return new WP_Error('product_collection_product_unknown', 'Product collection Product ID is invalid.');
    }
    $tags = $values['collectionFilterTags'] ?? null;
    if (! is_array($tags) || ! array_is_list($tags)) {
        return new WP_Error('product_collection_filter_invalid', 'Product collection filters must use controlled tags.');
    }
    $payload = [
        'databaseId' => (int) $product->ID,
        'productId' => $product_id,
        'slug' => (string) $product->post_name,
        'title' => tio2_product_collection_string(get_the_title($product)),
        'path' => $path,
        'displayOrder' => (int) ($values['familyDisplayOrder'] ?? 0),
        'familyCardSummary' => tio2_product_collection_string($values['familyCardSummary'] ?? ''),
        'applicationFocus' => tio2_product_collection_string($values['collectionApplicationFocus'] ?? ''),
        'performanceFocus' => tio2_product_collection_string($values['collectionPerformanceFocus'] ?? ''),
        'surfaceTreatmentPositioning' => tio2_product_collection_string($values['collectionSurfaceTreatmentPositioning'] ?? ''),
        'filterTags' => array_values(array_map('strval', $tags)),
    ];
    return tio2_product_collection_payload_is_safe($payload)
        ? $payload
        : new WP_Error('product_collection_private_value', 'Product collection card contains a forbidden value.');
}

/** @return array<string, mixed>|WP_Error */
function tio2_product_collection_family_payload(WP_Term $term, bool $preview): array|WP_Error
{
    $validation = tio2_validate_product_family_contract((int) $term->term_id);
    if (is_wp_error($validation)) {
        return $validation;
    }
    $values = tio2_product_collection_values(
        tio2_product_family_field_definitions(),
        'product_family_' . $term->term_id
    );
    $filter_rows = tio2_product_collection_rows($values['filters'] ?? null);
    $filters = array_map(static fn (array $row): array => [
        'slug' => tio2_product_collection_string($row['slug'] ?? ''),
        'label' => tio2_product_collection_string($row['label'] ?? ''),
    ], $filter_rows);

    $products = get_posts([
        'post_type' => 'tio2_product', 'post_status' => 'any', 'posts_per_page' => -1,
        'orderby' => 'ID', 'order' => 'ASC',
        'tax_query' => ['relation' => 'AND',
            ['taxonomy' => 'product_family', 'field' => 'term_id', 'terms' => [(int) $term->term_id]],
            ['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-a']],
        ],
    ]);
    $cards = [];
    foreach ($products as $product) {
        if (! $product instanceof WP_Post) {
            return new WP_Error('product_collection_invalid_post', 'Product collection member is invalid.');
        }
        $card = tio2_product_collection_card($product, $preview);
        if (is_wp_error($card)) {
            return $card;
        }
        $cards[] = $card;
    }
    usort($cards, static fn (array $left, array $right): int => $left['displayOrder'] <=> $right['displayOrder']);

    $applications = tio2_product_collection_links($values['applications'] ?? [], 'tio2_application');
    $resources = tio2_product_collection_links($values['resources'] ?? [], 'tio2_document');
    if (is_wp_error($applications) || is_wp_error($resources)) {
        return is_wp_error($applications) ? $applications : $resources;
    }
    $payload = [
        'siteId' => 'tio2-a',
        'level' => 'family',
        'path' => '/products/' . $term->slug,
        'slug' => (string) $term->slug,
        'name' => tio2_product_collection_string($term->name),
        'metaTitle' => tio2_product_collection_string($values['metaTitle'] ?? ''),
        'metaDescription' => tio2_product_collection_string($values['metaDescription'] ?? ''),
        'eyebrow' => tio2_product_collection_string($values['eyebrow'] ?? ''),
        'headline' => tio2_product_collection_string($values['headline'] ?? ''),
        'directAnswer' => tio2_product_collection_string($values['directAnswer'] ?? ''),
        'heroImageId' => (int) ($values['heroImage'] ?? 0),
        'decisionRail' => tio2_product_collection_items($values['decisionRail'] ?? []),
        'filters' => $filters,
        'comparisonIntroduction' => tio2_product_collection_string($values['comparisonIntroduction'] ?? ''),
        'comparisonCaption' => tio2_product_collection_string($values['comparisonCaption'] ?? ''),
        'selectionMethod' => tio2_product_collection_string($values['selectionMethod'] ?? ''),
        'validationSteps' => tio2_product_collection_items($values['validationSteps'] ?? []),
        'products' => $cards,
        'applications' => $applications,
        'resources' => $resources,
        'enquiry' => tio2_product_collection_string($values['enquiry'] ?? ''),
        'faqItems' => tio2_product_collection_faqs($values['faqItems'] ?? []),
        'technicalDisclaimer' => tio2_product_collection_string($values['technicalDisclaimer'] ?? ''),
    ];
    return tio2_product_collection_payload_is_safe($payload)
        ? $payload
        : new WP_Error('product_family_private_value', 'Product Family contains a forbidden value.');
}

/** @return array<string, mixed>|WP_Error */
function tio2_product_collection_hub_payload(bool $preview): array|WP_Error
{
    $validation = tio2_validate_products_hub_contract('tio2-a');
    if (is_wp_error($validation)) {
        return $validation;
    }
    $values = tio2_product_collection_values(tio2_product_hub_field_definitions(), 'option');
    $family_summaries = [];
    $product_count = 0;
    foreach (tio2_product_collection_rows($values['families'] ?? null) as $row) {
        $term = get_term((int) ($row['family'] ?? 0), 'product_family');
        if (! $term instanceof WP_Term) {
            return new WP_Error('products_hub_families_invalid', 'Products Hub Family is invalid.');
        }
        $family = tio2_product_collection_family_payload($term, $preview);
        if (is_wp_error($family)) {
            return $family;
        }
        $family_count = count($family['products']);
        $product_count += $family_count;
        $family_summaries[] = [
            'slug' => $family['slug'], 'name' => $family['name'], 'path' => $family['path'],
            'headline' => $family['headline'], 'directAnswer' => $family['directAnswer'],
            'heroImageId' => $family['heroImageId'], 'productCount' => $family_count,
        ];
    }
    $resources = tio2_product_collection_links($values['resources'] ?? [], 'tio2_document');
    if (is_wp_error($resources)) {
        return $resources;
    }
    $payload = [
        'siteId' => 'tio2-a',
        'level' => 'hub',
        'path' => '/products',
        'metaTitle' => tio2_product_collection_string($values['metaTitle'] ?? ''),
        'metaDescription' => tio2_product_collection_string($values['metaDescription'] ?? ''),
        'eyebrow' => tio2_product_collection_string($values['eyebrow'] ?? ''),
        'headline' => tio2_product_collection_string($values['headline'] ?? ''),
        'directAnswer' => tio2_product_collection_string($values['directAnswer'] ?? ''),
        'heroImageId' => (int) ($values['heroImage'] ?? 0),
        'decisionRail' => tio2_product_collection_items($values['decisionRail'] ?? []),
        'familyCount' => count($family_summaries),
        'productCount' => $product_count,
        'families' => $family_summaries,
        'knownGradeHeading' => tio2_product_collection_string($values['knownGradeHeading'] ?? ''),
        'knownGradeHelp' => tio2_product_collection_string($values['knownGradeHelp'] ?? ''),
        'decisionPath' => tio2_product_collection_string($values['decisionPath'] ?? ''),
        'applicationBoundary' => tio2_product_collection_string($values['applicationBoundary'] ?? ''),
        'resources' => $resources,
        'enquiry' => tio2_product_collection_string($values['enquiry'] ?? ''),
        'faqItems' => tio2_product_collection_faqs($values['faqItems'] ?? []),
        'technicalDisclaimer' => tio2_product_collection_string($values['technicalDisclaimer'] ?? ''),
    ];
    return tio2_product_collection_payload_is_safe($payload)
        ? $payload
        : new WP_Error('products_hub_private_value', 'Products Hub contains a forbidden value.');
}

/** @param mixed $source @param array<string, mixed> $args @return array<string, mixed>|null */
function tio2_resolve_products_hub($source, array $args): ?array
{
    if ('tio2-a' !== ($args['siteId'] ?? null)) {
        return null;
    }
    $payload = tio2_product_collection_hub_payload(false);
    return is_wp_error($payload) ? null : $payload;
}

/** @param mixed $source @param array<string, mixed> $args @return array<string, mixed>|null */
function tio2_resolve_product_family($source, array $args): ?array
{
    if ('tio2-a' !== ($args['siteId'] ?? null) || ! is_string($args['slug'] ?? null)) {
        return null;
    }
    $term = get_term_by('slug', $args['slug'], 'product_family');
    if (! $term instanceof WP_Term || ! array_key_exists($term->slug, tio2_product_collection_membership())) {
        return null;
    }
    $payload = tio2_product_collection_family_payload($term, false);
    return is_wp_error($payload) ? null : $payload;
}

function tio2_register_product_collection_graphql_types(): void
{
    $string = ['type' => ['non_null' => 'String']];
    $integer = ['type' => ['non_null' => 'Int']];
    $strings = ['type' => ['non_null' => ['list_of' => ['non_null' => 'String']]]];
    register_graphql_object_type('Tio2ProductCollectionFilter', ['fields' => ['slug' => $string, 'label' => $string]]);
    register_graphql_object_type('Tio2ProductCollectionFaq', ['fields' => ['question' => $string, 'answer' => $string]]);
    register_graphql_object_type('Tio2ProductCollectionLink', ['fields' => ['databaseId' => $integer, 'title' => $string, 'path' => $string]]);
    register_graphql_object_type('Tio2ProductCollectionCard', ['fields' => [
        'databaseId' => $integer, 'productId' => $string, 'slug' => $string, 'title' => $string,
        'path' => $string, 'displayOrder' => $integer, 'familyCardSummary' => $string,
        'applicationFocus' => $string, 'performanceFocus' => $string,
        'surfaceTreatmentPositioning' => $string, 'filterTags' => $strings,
    ]]);
    register_graphql_object_type('Tio2ProductFamilySummary', ['fields' => [
        'slug' => $string, 'name' => $string, 'path' => $string, 'headline' => $string,
        'directAnswer' => $string, 'heroImageId' => $integer, 'productCount' => $integer,
    ]]);
    register_graphql_object_type('Tio2ProductsHubPage', ['fields' => [
        'siteId' => $string, 'level' => $string, 'path' => $string,
        'metaTitle' => $string, 'metaDescription' => $string, 'eyebrow' => $string,
        'headline' => $string, 'directAnswer' => $string, 'heroImageId' => $integer,
        'decisionRail' => $strings, 'familyCount' => $integer, 'productCount' => $integer,
        'families' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductFamilySummary']]]],
        'knownGradeHeading' => $string, 'knownGradeHelp' => $string, 'decisionPath' => $string,
        'applicationBoundary' => $string,
        'resources' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionLink']]]],
        'enquiry' => $string,
        'faqItems' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionFaq']]]],
        'technicalDisclaimer' => $string,
    ]]);
    register_graphql_object_type('Tio2ProductFamilyPage', ['fields' => [
        'siteId' => $string, 'level' => $string, 'path' => $string, 'slug' => $string, 'name' => $string,
        'metaTitle' => $string, 'metaDescription' => $string, 'eyebrow' => $string,
        'headline' => $string, 'directAnswer' => $string, 'heroImageId' => $integer,
        'decisionRail' => $strings,
        'filters' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionFilter']]]],
        'comparisonIntroduction' => $string, 'comparisonCaption' => $string,
        'selectionMethod' => $string, 'validationSteps' => $strings,
        'products' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionCard']]]],
        'applications' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionLink']]]],
        'resources' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionLink']]]],
        'enquiry' => $string,
        'faqItems' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2ProductCollectionFaq']]]],
        'technicalDisclaimer' => $string,
    ]]);
    register_graphql_field('RootQuery', 'tio2ProductsHub', [
        'type' => 'Tio2ProductsHubPage',
        'args' => ['siteId' => ['type' => ['non_null' => 'String']]],
        'resolve' => 'tio2_resolve_products_hub',
    ]);
    register_graphql_field('RootQuery', 'tio2ProductFamily', [
        'type' => 'Tio2ProductFamilyPage',
        'args' => [
            'siteId' => ['type' => ['non_null' => 'String']],
            'slug' => ['type' => ['non_null' => 'String']],
        ],
        'resolve' => 'tio2_resolve_product_family',
    ]);
}

add_action('graphql_register_types', 'tio2_register_product_collection_graphql_types');
