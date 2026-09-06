<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_EU_MARKET_CONTRACT_META = '_tio2_my_eu_market_contract_json';

function tio2_register_market_page_v01_content_type(): void
{
    register_post_type('tio2_market_page', [
        'labels' => [
            'name' => 'TiO2 Market Pages',
            'singular_name' => 'TiO2 Market Page',
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
    register_taxonomy_for_object_type('site_scope', 'tio2_market_page');
}

function tio2_my_eu_market_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-market-eu-001.json';
}

/** @return string|WP_Error */
function tio2_my_eu_market_approved_contract_json()
{
    $path = tio2_my_eu_market_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error('tio2_my_eu_market_contract_missing', 'The approved Malaysia EU Market contract is unavailable.');
    }
    return $json;
}

/** @param array<string,mixed> $contract @return array<string,mixed> */
function tio2_my_eu_market_immutable_contract(array $contract): array
{
    unset($contract['releaseControls']);
    if (isset($contract['trade']) && is_array($contract['trade'])) {
        unset($contract['trade']['evidence']);
    }
    if (isset($contract['importRoles']) && is_array($contract['importRoles'])) {
        unset($contract['importRoles']['source']);
    }
    return $contract;
}

/** @param array<string,mixed> $contract */
function tio2_my_eu_market_runtime_fields_are_valid(array $contract): bool
{
    $release = $contract['releaseControls'] ?? null;
    $evidence = $contract['trade']['evidence'] ?? null;
    if (! is_array($release)) {
        return false;
    }
    $release_keys = array_keys($release);
    $expected_release_keys = [
        'originHold', 'tradeFreshness', 'relatedRoutesReady', 'conversionRuntimeReady',
        'runtimeAcceptanceReady', 'releaseEnabled', 'indexingAuthorized', 'sitemapAuthorized',
    ];
    sort($release_keys);
    sort($expected_release_keys);
    if ($release_keys !== $expected_release_keys || ! is_string($release['originHold']) || ! is_string($release['tradeFreshness'])) {
        return false;
    }
    foreach (['relatedRoutesReady', 'conversionRuntimeReady', 'runtimeAcceptanceReady', 'releaseEnabled', 'indexingAuthorized', 'sitemapAuthorized'] as $key) {
        if (! is_bool($release[$key])) {
            return false;
        }
    }
    if (null !== $evidence) {
        if (! is_array($evidence)) {
            return false;
        }
        foreach ($evidence as $value) {
            if (! is_scalar($value) && null !== $value) {
                return false;
            }
        }
    }
    $import_source = $contract['importRoles']['source'] ?? null;
    if (null === $import_source) {
        return true;
    }
    if (! is_array($import_source)) {
        return false;
    }
    foreach ($import_source as $value) {
        if (! is_scalar($value) && null !== $value) {
            return false;
        }
    }
    return true;
}

/** @return true|WP_Error */
function tio2_validate_market_page_v01_contract(int $post_id)
{
    if ('tio2_market_page' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_eu_market_invalid_type', 'The EU Market record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_eu_market_invalid_scope', 'The EU Market contract is valid only for site_scope=tio2-my.');
    }
    if (
        '/markets/european-union' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-market-eu-001' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_eu_market_invalid_route', 'The EU Market route identity is invalid.');
    }

    $approved = tio2_my_eu_market_approved_contract_json();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, TIO2_MY_EU_MARKET_CONTRACT_META, true);
    if (! is_string($stored)) {
        return new WP_Error('tio2_my_eu_market_contract_mismatch', 'The stored EU Market Buyer Clean payload or runtime controls are invalid.');
    }
    $contract = json_decode($stored, true);
    $approved_contract = json_decode($approved, true);
    if (
        ! is_array($contract) || ! is_array($approved_contract) ||
        wp_json_encode(tio2_my_eu_market_immutable_contract($contract)) !== wp_json_encode(tio2_my_eu_market_immutable_contract($approved_contract)) ||
        ! tio2_my_eu_market_runtime_fields_are_valid($contract)
    ) {
        return new WP_Error('tio2_my_eu_market_contract_mismatch', 'The stored EU Market Buyer Clean payload or runtime controls are invalid.');
    }
    if (
        'MARKET-EU-001-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'MARKET-EU-001' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/markets/european-union/' !== ($contract['identity']['path'] ?? null) ||
        'market-page-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) {
        return new WP_Error('tio2_my_eu_market_contract_invalid', 'The EU Market payload identity is invalid.');
    }
    return true;
}

function tio2_resolve_malaysia_eu_market_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_market_page',
        'post_status' => 'publish',
        'name' => 'tio2-my-market-eu-001',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The Malaysia EU Market record is missing.'
                : 'Multiple Malaysia EU Market records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_market_page_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError('The Malaysia EU Market record failed scope or contract validation.');
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_EU_MARKET_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) {
        throw new \GraphQL\Error\UserError('The Malaysia EU Market record has no approved contract payload.');
    }
    return wp_json_encode([
        'id' => 'market-eu-001-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/markets/european-union'],
        'malaysiaEuMarketContractJson' => $contract_json,
    ]);
}

function tio2_register_market_page_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaEuMarketRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_eu_market_record_json',
        'description' => 'Approved, scope-bound MARKET-EU-001 record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_market_page_v01_content_type');
add_action('graphql_register_types', 'tio2_register_market_page_v01_graphql_field');
