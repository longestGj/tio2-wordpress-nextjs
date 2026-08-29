<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_product_collection_graphql_errors'] = [];
$GLOBALS['tio2_product_collection_graphql_post_ids'] = [];
$GLOBALS['tio2_product_collection_graphql_term_ids'] = [];
$GLOBALS['tio2_product_collection_graphql_restore'] = [];
$GLOBALS['tio2_product_collection_graphql_status_restore'] = [];

function tio2_product_collection_graphql_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_product_collection_graphql_errors'][] = $message;
    }
}

function tio2_product_collection_graphql_cleanup(): void
{
    foreach ($GLOBALS['tio2_product_collection_graphql_post_ids'] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
    $GLOBALS['tio2_product_collection_graphql_post_ids'] = [];
    foreach ($GLOBALS['tio2_product_collection_graphql_restore'] as $object_id => $fields) {
        foreach ($fields as $field_key => $value) {
            update_field((string) $field_key, $value, $object_id);
        }
    }
    $GLOBALS['tio2_product_collection_graphql_restore'] = [];
    foreach ($GLOBALS['tio2_product_collection_graphql_status_restore'] as $post_id => $status) {
        tio2_product_collection_graphql_set_status((int) $post_id, (string) $status);
    }
    $GLOBALS['tio2_product_collection_graphql_status_restore'] = [];
    foreach ($GLOBALS['tio2_product_collection_graphql_term_ids'] as $term_id) {
        wp_delete_term((int) $term_id, 'product_family');
    }
    $GLOBALS['tio2_product_collection_graphql_term_ids'] = [];
}

function tio2_product_collection_graphql_fail(string $message): void
{
    tio2_product_collection_graphql_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

register_shutdown_function('tio2_product_collection_graphql_cleanup');

foreach (['tio2_resolve_products_hub', 'tio2_resolve_product_family'] as $function_name) {
    if (! function_exists($function_name)) {
        tio2_product_collection_graphql_fail("Missing Product collection GraphQL resolver: {$function_name}().");
    }
}
if (! class_exists('WPGraphQL') || ! function_exists('graphql') || ! function_exists('get_field')) {
    tio2_product_collection_graphql_fail('WPGraphQL and ACF must be active for the Product collection GraphQL test.');
}

function tio2_product_collection_graphql_remember(array $definitions, string $object_id): void
{
    foreach ($definitions as $field) {
        $GLOBALS['tio2_product_collection_graphql_restore'][$object_id][(string) $field['key']] =
            get_field((string) $field['name'], $object_id, false);
    }
}

function tio2_product_collection_graphql_value(array $field): mixed
{
    $type = (string) ($field['type'] ?? '');
    if ('image' === $type) {
        return 1;
    }
    if ('relationship' === $type) {
        return [];
    }
    if ('repeater' === $type) {
        $rows = [];
        for ($index = 0; $index < max(1, (int) ($field['min'] ?? 0)); ++$index) {
            $row = [];
            foreach ($field['sub_fields'] ?? [] as $sub_field) {
                $name = (string) ($sub_field['name'] ?? '');
                $row[$name] = 'slug' === $name
                    ? 'application'
                    : ('label' === $name ? 'Application' : ('answer' === $name ? '<p>Answer</p>' : "Copy {$index}"));
            }
            $rows[] = $row;
        }
        return $rows;
    }
    return 'wysiwyg' === $type ? '<p>Copy</p>' : 'Copy';
}

function tio2_product_collection_graphql_set_status(int $post_id, string $status): void
{
    global $wpdb;
    if (false === $wpdb->update($wpdb->posts, ['post_status' => $status], ['ID' => $post_id], ['%s'], ['%d'])) {
        tio2_product_collection_graphql_fail('Could not set Product fixture status.');
    }
    clean_post_cache($post_id);
}

$families = [];
foreach (array_keys(tio2_product_collection_membership()) as $family_slug) {
    $existing = get_term_by('slug', $family_slug, 'product_family');
    if ($existing instanceof WP_Term) {
        $family_id = (int) $existing->term_id;
    } else {
        $term = wp_insert_term(ucwords(str_replace('-', ' ', $family_slug)), 'product_family', ['slug' => $family_slug]);
        if (is_wp_error($term)) {
            tio2_product_collection_graphql_fail("Could not create {$family_slug} Family fixture.");
        }
        $family_id = (int) $term['term_id'];
        $GLOBALS['tio2_product_collection_graphql_term_ids'][] = $family_id;
    }
    $families[$family_slug] = $family_id;
    $object_id = 'product_family_' . $family_id;
    tio2_product_collection_graphql_remember(tio2_product_family_field_definitions(), $object_id);
    foreach (tio2_product_family_field_definitions() as $field) {
        update_field((string) $field['key'], tio2_product_collection_graphql_value($field), $object_id);
    }
}

$coatings_ids = [];
foreach (tio2_product_collection_membership() as $family_slug => $product_ids) {
    foreach ($product_ids as $index => $product_id) {
        $matching_posts = array_values(array_filter(get_posts([
            'post_type' => 'tio2_product', 'post_status' => 'any', 'posts_per_page' => -1,
            'tax_query' => ['relation' => 'AND',
                ['taxonomy' => 'product_family', 'field' => 'term_id', 'terms' => [$families[$family_slug]]],
                ['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-a']],
            ],
        ]), static fn ($post): bool => $post instanceof WP_Post && $product_id === get_field('product_id', $post->ID, false)));
        if (1 < count($matching_posts)) {
            tio2_product_collection_graphql_fail("Existing {$product_id} Product fixtures are ambiguous.");
        }
        if (1 === count($matching_posts)) {
            $post_id = (int) $matching_posts[0]->ID;
            tio2_product_collection_graphql_remember(tio2_product_collection_display_field_definitions(), (string) $post_id);
            $GLOBALS['tio2_product_collection_graphql_status_restore'][$post_id] = (string) $matching_posts[0]->post_status;
        } else {
            $post_id = wp_insert_post([
                'post_type' => 'tio2_product', 'post_status' => 'draft',
                'post_title' => $product_id . ' Product', 'post_name' => strtolower($product_id),
            ], true);
            if (is_wp_error($post_id) || $post_id <= 0) {
                tio2_product_collection_graphql_fail("Could not create {$product_id} Product fixture.");
            }
            $post_id = (int) $post_id;
            $GLOBALS['tio2_product_collection_graphql_post_ids'][] = $post_id;
            wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
            wp_set_object_terms($post_id, [$families[$family_slug]], 'product_family', false);
            update_field('field_tio2_product_id', $product_id, $post_id);
        }
        update_field('field_tio2_product_collection_family_display_order', $index + 1, $post_id);
        update_field('field_tio2_product_collection_family_card_summary', "{$product_id} card summary", $post_id);
        update_field('field_tio2_product_collection_application_focus', "{$product_id} application focus", $post_id);
        update_field('field_tio2_product_collection_performance_focus', "{$product_id} performance focus", $post_id);
        update_field('field_tio2_product_collection_surface_treatment_positioning', "{$product_id} treatment", $post_id);
        update_field('field_tio2_product_collection_filter_tags', ['application'], $post_id);
        tio2_product_collection_graphql_set_status($post_id, 'publish');
        if ('coatings' === $family_slug) {
            $coatings_ids[$product_id] = $post_id;
        }
    }
}

tio2_product_collection_graphql_remember(tio2_product_hub_field_definitions(), 'option');
foreach (tio2_product_hub_field_definitions() as $field) {
    $value = 'families' === ($field['name'] ?? null)
        ? array_map(static fn (int $term_id): array => ['family' => $term_id], array_values($families))
        : tio2_product_collection_graphql_value($field);
    update_field((string) $field['key'], $value, 'option');
}

$schema_fields = WPGraphQL::get_schema()->getQueryType()->getFields();
tio2_product_collection_graphql_assert(isset($schema_fields['tio2ProductsHub']), 'Missing RootQuery.tio2ProductsHub.');
tio2_product_collection_graphql_assert(isset($schema_fields['tio2ProductFamily']), 'Missing RootQuery.tio2ProductFamily.');

$hub_query = <<<'GRAPHQL'
query Hub($siteId: String!) {
  tio2ProductsHub(siteId: $siteId) {
    siteId level path familyCount productCount
    families { slug name path headline directAnswer heroImageId productCount }
  }
}
GRAPHQL;
$family_query = <<<'GRAPHQL'
query Family($siteId: String!, $slug: String!) {
  tio2ProductFamily(siteId: $siteId, slug: $slug) {
    siteId level path slug name
    filters { slug label }
    products {
      databaseId productId slug title path displayOrder familyCardSummary
      applicationFocus performanceFocus surfaceTreatmentPositioning filterTags
    }
  }
}
GRAPHQL;
$query_hub = static fn (string $site_id): array => (array) graphql([
    'query' => $hub_query, 'variables' => ['siteId' => $site_id],
]);
$query_family = static fn (string $site_id, string $slug): array => (array) graphql([
    'query' => $family_query, 'variables' => ['siteId' => $site_id, 'slug' => $slug],
]);

$hub_result = $query_hub('tio2-a');
$hub = $hub_result['data']['tio2ProductsHub'] ?? null;
$direct_hub = tio2_product_collection_hub_payload(false);
tio2_product_collection_graphql_assert(
    ! isset($hub_result['errors']) && is_array($hub),
    'Site A Hub query failed: ' . wp_json_encode($hub_result) . '; resolver=' .
        (is_wp_error($direct_hub) ? $direct_hub->get_error_code() . ':' . $direct_hub->get_error_message() : 'array')
);
if (is_array($hub)) {
    tio2_product_collection_graphql_assert(
        'tio2-a' === $hub['siteId'] && 'hub' === $hub['level'] && '/products' === $hub['path'] &&
        8 === $hub['familyCount'] && 25 === $hub['productCount'] && 8 === count($hub['families']),
        'Hub identity or exact 8/25 inventory is wrong.'
    );
    tio2_product_collection_graphql_assert(
        array_keys(tio2_product_collection_membership()) === array_column($hub['families'], 'slug') &&
        '/products/coatings' === $hub['families'][0]['path'] && 9 === $hub['families'][0]['productCount'],
        'Hub Family order, canonical paths, or counts are wrong.'
    );
}

$family_result = $query_family('tio2-a', 'coatings');
$family = $family_result['data']['tio2ProductFamily'] ?? null;
tio2_product_collection_graphql_assert(! isset($family_result['errors']) && is_array($family), 'Coatings Family query failed.');
if (is_array($family)) {
    tio2_product_collection_graphql_assert(
        'tio2-a' === $family['siteId'] && 'family' === $family['level'] &&
        '/products/coatings' === $family['path'] && 'coatings' === $family['slug'] &&
        [['slug' => 'application', 'label' => 'Application']] === $family['filters'],
        'Coatings identity or controlled Family filters are wrong.'
    );
    tio2_product_collection_graphql_assert(
        9 === count($family['products']) && range(1, 9) === array_column($family['products'], 'displayOrder') &&
        tio2_product_collection_membership()['coatings'] === array_column($family['products'], 'productId') &&
        '/products/coatings/tp-c050' === $family['products'][0]['path'] &&
        ['application'] === $family['products'][0]['filterTags'],
        'Coatings products are not the exact nine ordered, tagged canonical cards.'
    );
    $encoded = strtolower((string) wp_json_encode($family));
    foreach (['tds_url', '.pdf', 'attachment', 'download', 'supplier', 'source', 'manufacturer', 'legal', 'price', 'stock', 'moq', 'private'] as $forbidden) {
        tio2_product_collection_graphql_assert(false === strpos($encoded, $forbidden), "Family GraphQL exposed forbidden value {$forbidden}.");
    }
}

foreach ([['tio2-b', 'coatings'], ['tio2-a', 'unknown-family']] as [$site_id, $slug]) {
    $result = $query_family($site_id, $slug);
    tio2_product_collection_graphql_assert(
        ! isset($result['errors']) && null === ($result['data']['tio2ProductFamily'] ?? null),
        "Family root did not return null for {$site_id}/{$slug}."
    );
}
$site_b_hub = $query_hub('tio2-b');
tio2_product_collection_graphql_assert(
    ! isset($site_b_hub['errors']) && null === ($site_b_hub['data']['tio2ProductsHub'] ?? null),
    'Hub root leaked to Site B.'
);

tio2_product_collection_graphql_set_status($coatings_ids['TP-C120'], 'draft');
$draft_family = $query_family('tio2-a', 'coatings');
tio2_product_collection_graphql_assert(
    ! isset($draft_family['errors']) && null === ($draft_family['data']['tio2ProductFamily'] ?? null),
    'Anonymous Family GraphQL exposed a draft Product card.'
);
tio2_product_collection_graphql_set_status($coatings_ids['TP-C120'], 'publish');

if ([] !== $GLOBALS['tio2_product_collection_graphql_errors']) {
    tio2_product_collection_graphql_fail(implode("\n", $GLOBALS['tio2_product_collection_graphql_errors']));
}
tio2_product_collection_graphql_cleanup();
fwrite(STDOUT, "TiO2 Product collection GraphQL contract test passed\n");
