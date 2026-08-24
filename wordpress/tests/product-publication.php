<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_product_publication_test_post_ids'] = [];
$GLOBALS['tio2_product_publication_test_errors'] = [];

function tio2_product_publication_test_cleanup(): void
{
    global $wpdb;

    foreach ($GLOBALS['tio2_product_publication_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id)) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_product_publication_test_post_ids'] = [];

    if (! empty($GLOBALS['tio2_product_publication_test_seed_fixture_restore'])) {
        $restore = $GLOBALS['tio2_product_publication_test_seed_fixture_restore'];
        $wpdb->update(
            $wpdb->posts,
            ['post_status' => $restore['status']],
            ['ID' => $restore['id']],
            ['%s'],
            ['%d']
        );
        clean_post_cache($restore['id']);
        wp_set_object_terms($restore['id'], $restore['scopes'], 'site_scope', false);
        if (null === $restore['publicPath']) {
            delete_post_meta($restore['id'], 'public_path');
        } else {
            update_post_meta($restore['id'], 'public_path', $restore['publicPath']);
        }
        unset($GLOBALS['tio2_product_publication_test_seed_fixture_restore']);
    }
}

function tio2_product_publication_test_fail(string $message): void
{
    tio2_product_publication_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_product_publication_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        $GLOBALS['tio2_product_publication_test_errors'][] = $message;
    }
}

function tio2_product_publication_test_insert(string $status, string $suffix): int
{
    $post_id = wp_insert_post([
        'post_type' => 'tio2_product',
        'post_status' => $status,
        'post_title' => 'TiO2 product publication fixture ' . $suffix,
        'post_name' => 'product-publication-fixture-' . $suffix,
        'post_date' => 'future' === $status ? '2036-08-24 12:00:00' : current_time('mysql'),
        'post_date_gmt' => 'future' === $status ? '2036-08-24 12:00:00' : current_time('mysql', true),
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_product_publication_test_fail('Could not create Product publication fixture: ' . $suffix);
    }
    $GLOBALS['tio2_product_publication_test_post_ids'][] = (int) $post_id;
    return (int) $post_id;
}

register_shutdown_function('tio2_product_publication_test_cleanup');

$product_type = get_post_type_object('tio2_product');
tio2_product_publication_test_assert($product_type instanceof WP_Post_Type, 'Product post type is not registered.');
if ($product_type instanceof WP_Post_Type) {
    tio2_product_publication_test_assert(false === $product_type->public, 'Product post type is WordPress-public.');
    tio2_product_publication_test_assert(false === $product_type->publicly_queryable, 'Product native singles remain queryable.');
    tio2_product_publication_test_assert(true === $product_type->exclude_from_search, 'Product remains in native search.');
    tio2_product_publication_test_assert(false === $product_type->has_archive, 'Product native archive remains enabled.');
    tio2_product_publication_test_assert(false === $product_type->rewrite, 'Product rewrite rules remain enabled.');
    tio2_product_publication_test_assert(false === $product_type->query_var, 'Product native query variable remains enabled.');
    tio2_product_publication_test_assert(true === $product_type->show_ui, 'Product is missing from Admin authoring.');
    tio2_product_publication_test_assert(true === $product_type->show_in_rest, 'Product is missing from REST authoring.');
    tio2_product_publication_test_assert(true === $product_type->show_in_graphql, 'Product is missing from the GraphQL schema.');
}

tio2_product_publication_test_assert(
    null !== WPGraphQL::get_schema()->getType('Tio2Product'),
    'Product GraphQL schema type is unavailable.'
);

foreach ([
    'tio2_product_has_approved_public_route',
    'tio2_guard_product_publication',
    'tio2_backstop_product_publication',
    'tio2_product_graphql_visibility',
    'tio2_with_legacy_product_fixture_seed_context',
    'tio2_legacy_product_fixture_seed_context_active',
] as $function_name) {
    tio2_product_publication_test_assert(function_exists($function_name), "Missing Product closure function: {$function_name}.");
}

tio2_product_publication_test_assert(
    false !== has_filter('wp_insert_post_data', 'tio2_guard_product_publication'),
    'Product publication guard is not registered before persistence.'
);
tio2_product_publication_test_assert(
    false !== has_action('wp_after_insert_post', 'tio2_backstop_product_publication'),
    'Product publication backstop is not registered.'
);
tio2_product_publication_test_assert(
    false !== has_filter('graphql_pre_model_data_is_private', 'tio2_product_graphql_visibility'),
    'Product anonymous GraphQL privacy filter is not registered.'
);

$publish_id = tio2_product_publication_test_insert('publish', 'publish');
tio2_product_publication_test_assert('draft' === get_post_status($publish_id), 'Product publish request did not end as draft.');

$future_id = tio2_product_publication_test_insert('future', 'future');
tio2_product_publication_test_assert('draft' === get_post_status($future_id), 'Product future request did not end as draft.');

$private_id = tio2_product_publication_test_insert('private', 'private');
tio2_product_publication_test_assert('private' === get_post_status($private_id), 'Product private status was not preserved.');

$pending_id = tio2_product_publication_test_insert('pending', 'pending');
tio2_product_publication_test_assert('pending' === get_post_status($pending_id), 'Product pending status was not preserved.');

$backstop_id = tio2_product_publication_test_insert('draft', 'backstop');
remove_filter('wp_insert_post_data', 'tio2_guard_product_publication', 20);
try {
    wp_update_post(['ID' => $backstop_id, 'post_status' => 'publish']);
} finally {
    add_filter('wp_insert_post_data', 'tio2_guard_product_publication', 20, 4);
}
tio2_product_publication_test_assert('draft' === get_post_status($backstop_id), 'Product publication backstop did not restore draft.');

$draft = get_post($publish_id);
if ($draft instanceof WP_Post && function_exists('tio2_product_graphql_visibility')) {
    $previous_user_id = get_current_user_id();
    wp_set_current_user(0);
    $anonymous_private = apply_filters('graphql_pre_model_data_is_private', null, 'PostObject', $draft);
    wp_set_current_user($previous_user_id);
    tio2_product_publication_test_assert(true === $anonymous_private, 'Anonymous GraphQL did not mark a Product draft private.');
}

if (function_exists('tio2_with_legacy_product_fixture_seed_context')) {
    $seed_ids = get_posts([
        'post_type' => 'tio2_product',
        'post_status' => 'any',
        'fields' => 'ids',
        'posts_per_page' => -1,
        'meta_key' => '_tio2_seed_fixture_id',
        'meta_value' => 'test-product-reference',
    ]);
    tio2_product_publication_test_assert(1 === count($seed_ids), 'Stable legacy Product fixture is missing or ambiguous.');
    if (1 === count($seed_ids)) {
        $seed_id = (int) $seed_ids[0];
        $seed_scopes = wp_get_object_terms($seed_id, 'site_scope', ['fields' => 'slugs']);
        $seed_path = get_post_meta($seed_id, 'public_path', true);
        $GLOBALS['tio2_product_publication_test_seed_fixture_restore'] = [
            'id' => $seed_id,
            'status' => (string) get_post_status($seed_id),
            'scopes' => is_wp_error($seed_scopes) ? [] : array_values($seed_scopes),
            'publicPath' => '' === $seed_path ? null : (string) $seed_path,
        ];

        $target = ['postStatus' => 'publish', 'siteScopes' => [], 'publicPath' => null];
        try {
            tio2_with_legacy_product_fixture_seed_context($seed_id, $target, static fn () => null);
            tio2_product_publication_test_assert(false, 'Legacy fixture seam opened without the explicit local-fixture constant.');
        } catch (LogicException $error) {
        }

        if (! defined('TIO2_LOCAL_FIXTURE_SEED')) {
            define('TIO2_LOCAL_FIXTURE_SEED', true);
        }

        try {
            tio2_with_legacy_product_fixture_seed_context($publish_id, $target, static fn () => null);
            tio2_product_publication_test_assert(false, 'Legacy fixture seam accepted the wrong Product ID.');
        } catch (InvalidArgumentException $error) {
        }

        foreach ([
            ['postStatus' => 'draft', 'siteScopes' => [], 'publicPath' => null],
            ['postStatus' => 'publish', 'siteScopes' => ['tio2-a'], 'publicPath' => null],
            ['postStatus' => 'publish', 'siteScopes' => [], 'publicPath' => '/products/test-product-reference'],
            ['postStatus' => 'publish', 'siteScopes' => []],
        ] as $wrong_target) {
            try {
                tio2_with_legacy_product_fixture_seed_context($seed_id, $wrong_target, static fn () => null);
                tio2_product_publication_test_assert(false, 'Legacy fixture seam accepted a non-legacy target state.');
            } catch (InvalidArgumentException $error) {
            }
        }

        $returned = tio2_with_legacy_product_fixture_seed_context(
            $seed_id,
            $target,
            static fn (): string => 'legacy-context-result'
        );
        tio2_product_publication_test_assert('legacy-context-result' === $returned, 'Legacy fixture seam did not return the callback result.');
        tio2_product_publication_test_assert(
            ! tio2_legacy_product_fixture_seed_context_active($seed_id),
            'Legacy fixture seam leaked after a successful callback.'
        );

        try {
            tio2_with_legacy_product_fixture_seed_context($seed_id, $target, static function (): void {
                throw new RuntimeException('expected fixture callback failure');
            });
            tio2_product_publication_test_assert(false, 'Legacy fixture exception did not escape the seam.');
        } catch (RuntimeException $error) {
            tio2_product_publication_test_assert(
                'expected fixture callback failure' === $error->getMessage(),
                'Legacy fixture seam changed the callback exception.'
            );
        }
        tio2_product_publication_test_assert(
            ! tio2_legacy_product_fixture_seed_context_active($seed_id),
            'Legacy fixture seam leaked after an exception.'
        );
    }
}

if ([] !== $GLOBALS['tio2_product_publication_test_errors']) {
    tio2_product_publication_test_fail(implode("\n", $GLOBALS['tio2_product_publication_test_errors']));
}
tio2_product_publication_test_cleanup();
fwrite(STDOUT, "TiO2 Product publication closure test passed\n");
