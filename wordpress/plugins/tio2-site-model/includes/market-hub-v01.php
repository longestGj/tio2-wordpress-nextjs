<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_MARKET_HUB_CONTRACT_META = '_tio2_my_market_hub_contract_json';

function tio2_register_market_hub_v01_content_type(): void
{
    register_post_type('tio2_market_hub', [
        'labels' => [
            'name' => 'TiO2 Market Hubs',
            'singular_name' => 'TiO2 Market Hub',
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
    register_taxonomy_for_object_type('site_scope', 'tio2_market_hub');
}

function tio2_my_market_hub_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-market-hub.json';
}

/** @return string|WP_Error */
function tio2_my_market_hub_approved_contract_json()
{
    $path = tio2_my_market_hub_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error(
            'tio2_my_market_hub_contract_missing',
            'The approved Malaysia Markets Hub contract is unavailable.'
        );
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_market_hub_v01_contract(int $post_id)
{
    if ('tio2_market_hub' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_market_hub_invalid_type', 'The Markets Hub record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error(
            'tio2_my_market_hub_invalid_scope',
            'The Markets Hub contract is valid only for site_scope=tio2-my.'
        );
    }
    if (
        '/markets' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-markets' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_market_hub_invalid_route', 'The Markets Hub route identity is invalid.');
    }

    $approved = tio2_my_market_hub_approved_contract_json();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, TIO2_MY_MARKET_HUB_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_market_hub_contract_mismatch',
            'The stored Malaysia Markets Hub payload does not match the approved contract.'
        );
    }

    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'MARKET-000-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'MARKET-000' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/markets/' !== ($contract['identity']['path'] ?? null) ||
        'market-hub-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) {
        return new WP_Error('tio2_my_market_hub_contract_invalid', 'The Markets Hub payload identity is invalid.');
    }
    return true;
}

function tio2_resolve_malaysia_market_hub_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_market_hub',
        'post_status' => 'publish',
        'name' => 'tio2-my-markets',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The Malaysia Markets Hub record is missing.'
                : 'Multiple Malaysia Markets Hub records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_market_hub_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Markets Hub record failed scope or contract validation.'
        );
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_MARKET_HUB_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Markets Hub record has no approved contract payload.'
        );
    }
    return wp_json_encode([
        'id' => 'market-hub-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/markets'],
        'malaysiaMarketHubContractJson' => $contract_json,
    ]);
}

function tio2_register_market_hub_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaMarketHubRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_market_hub_record_json',
        'description' => 'Approved, scope-bound MARKET-000 record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_market_hub_v01_content_type');
add_action('graphql_register_types', 'tio2_register_market_hub_v01_graphql_field');
