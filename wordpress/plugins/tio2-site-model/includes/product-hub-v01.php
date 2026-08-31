<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_PRODUCT_HUB_CONTRACT_META = '_tio2_my_product_hub_contract_json';

function tio2_register_product_hub_v01_content_type(): void
{
    register_post_type('tio2_product_hub', [
        'labels' => [
            'name' => 'TiO2 Product Hubs',
            'singular_name' => 'TiO2 Product Hub',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_product_hub');
}

function tio2_my_product_hub_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-product-hub.json';
}

/** @return string|WP_Error */
function tio2_my_product_hub_approved_contract_json()
{
    $path = tio2_my_product_hub_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error(
            'tio2_my_product_hub_contract_missing',
            'The approved Malaysia Product Hub contract is unavailable.'
        );
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_product_hub_v01_contract(int $post_id)
{
    if ('tio2_product_hub' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_product_hub_invalid_type', 'The Product Hub record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error(
            'tio2_my_product_hub_invalid_scope',
            'The Product Hub contract is valid only for site_scope=tio2-my.'
        );
    }
    if (
        '/products' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-products' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_product_hub_invalid_route', 'The Product Hub route identity is invalid.');
    }

    $approved = tio2_my_product_hub_approved_contract_json();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, TIO2_MY_PRODUCT_HUB_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_product_hub_contract_mismatch',
            'The stored Malaysia Product Hub payload does not match the approved contract.'
        );
    }

    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'PRODUCT-000-G7-PCR-04' !== ($contract['reviewId'] ?? null) ||
        'PRODUCT-000' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/products/' !== ($contract['identity']['path'] ?? null) ||
        'product-hub-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) {
        return new WP_Error('tio2_my_product_hub_contract_invalid', 'The Product Hub payload identity is invalid.');
    }
    return true;
}

/**
 * Resolve a target only from a single published Malaysia-owned CMS record.
 * Missing records are an expected false readiness state; ambiguity is an error.
 */
function tio2_my_product_target_ready(string $target_page_id, string $href): bool
{
    if ('HOME-001' === $target_page_id && '/' === $href) {
        $homepage_ids = function_exists('tio2_find_homepage_ids')
            ? array_values(array_filter(
                tio2_find_homepage_ids('tio2-my', false),
                static fn (int $post_id): bool => 'publish' === get_post_status($post_id)
            ))
            : [];
        if (count($homepage_ids) > 1) {
            throw new \GraphQL\Error\UserError(
                'The Malaysia route readiness target HOME-001 is ambiguous.'
            );
        }
        return 1 === count($homepage_ids) &&
            ! is_wp_error(tio2_validate_homepage_contract((int) $homepage_ids[0]));
    }

    $path = wp_parse_url($href, PHP_URL_PATH);
    if (! is_string($path) || '' === $path || '/' !== $path[0]) {
        throw new \GraphQL\Error\UserError('A Malaysia Product Hub target path is invalid.');
    }
    $public_path = '/' === $path ? '/' : untrailingslashit($path);
    $ids = get_posts([
        'post_type' => [
            'page', 'post', 'tio2_homepage', 'tio2_market_hub', 'tio2_grade',
            'tio2_product', 'tio2_application', 'tio2_document',
        ],
        'post_status' => 'publish',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
        'meta_query' => [[
            'key' => 'public_path',
            'value' => $public_path,
            'compare' => '=',
        ]],
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => ['tio2-my'],
        ]],
    ]);
    if (count($ids) > 1) {
        throw new \GraphQL\Error\UserError(
            sprintf('The Malaysia route readiness target %s is ambiguous.', $target_page_id)
        );
    }
    if ([] === $ids) {
        return false;
    }
    $scopes = wp_get_post_terms((int) $ids[0], 'site_scope', ['fields' => 'slugs']);
    return ! is_wp_error($scopes) &&
        ['tio2-my'] === array_values(array_unique(array_map('strval', $scopes))) &&
        $public_path === get_post_meta((int) $ids[0], 'public_path', true);
}

/** @return array<string, bool> */
function tio2_my_product_route_readiness(array $contract): array
{
    $routes = $contract['routeRegistry'] ?? null;
    if (! is_array($routes)) {
        throw new \GraphQL\Error\UserError('The Malaysia Product Hub route registry is invalid.');
    }
    $readiness = [];
    foreach ($routes as $route) {
        if (
            ! is_array($route) ||
            ! is_string($route['targetPageId'] ?? null) ||
            ! is_string($route['href'] ?? null) ||
            array_key_exists($route['targetPageId'], $readiness)
        ) {
            throw new \GraphQL\Error\UserError('The Malaysia Product Hub route registry is ambiguous.');
        }
        $readiness[$route['targetPageId']] = tio2_my_product_target_ready(
            $route['targetPageId'],
            $route['href']
        );
    }
    return $readiness;
}

function tio2_resolve_malaysia_product_hub_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_product_hub',
        'post_status' => 'publish',
        'name' => 'tio2-my-products',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The Malaysia Product Hub record is missing.'
                : 'Multiple Malaysia Product Hub records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_product_hub_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Product Hub record failed scope or contract validation.'
        );
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_PRODUCT_HUB_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_string($contract_json) || '' === $contract_json || ! is_array($contract)) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Product Hub record has no approved contract payload.'
        );
    }
    return wp_json_encode([
        'id' => 'product-hub-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/products'],
        'malaysiaProductHubContractJson' => $contract_json,
        'routeReadiness' => tio2_my_product_route_readiness($contract),
    ]);
}

function tio2_register_product_hub_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaProductHubRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_product_hub_record_json',
        'description' => 'Approved, scope-bound PRODUCT-000 record and route readiness for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_product_hub_v01_content_type');
add_action('graphql_register_types', 'tio2_register_product_hub_v01_graphql_field');
