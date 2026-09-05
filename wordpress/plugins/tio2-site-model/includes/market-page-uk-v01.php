<?php
declare(strict_types=1);
if (! defined('ABSPATH')) exit;

const TIO2_MY_UK_MARKET_CONTRACT_META = '_tio2_my_uk_market_contract_json';

/** @return true|WP_Error */
function tio2_validate_market_page_uk_v01_contract(int $post_id)
{
    if ('tio2_market_page' !== get_post_type($post_id)) return new WP_Error('uk_type', 'Invalid UK Market type.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) return new WP_Error('uk_scope', 'Invalid UK Market scope.');
    if ('/markets/united-kingdom' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-market-uk-001' !== get_post_field('post_name', $post_id)) return new WP_Error('uk_identity', 'Invalid UK Market route identity.');
    $path = dirname(__DIR__) . '/config/tio2-my-market-uk-001.json';
    $approved = is_readable($path) ? file_get_contents($path) : false;
    $stored = get_post_meta($post_id, TIO2_MY_UK_MARKET_CONTRACT_META, true);
    if (!is_string($approved) || !is_string($stored)) return new WP_Error('uk_payload', 'Missing UK payload.');
    $baseline = json_decode($approved, true);
    $payload = json_decode($stored, true);
    if (!is_array($baseline) || !is_array($payload) || wp_json_encode($baseline) !== wp_json_encode($payload) ||
        'MARKET-UK-001' !== ($payload['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($payload['identity']['siteScope'] ?? null)) return new WP_Error('uk_payload', 'Changed or invalid approved UK payload.');
    return true;
}

function tio2_resolve_malaysia_uk_market_record_json(): string
{
    // Detect duplicates/foreign records rather than silently selecting or falling back.
    $ids = get_posts(['post_type' => 'tio2_market_page', 'post_status' => 'publish',
        'name' => 'tio2-my-market-uk-001', 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false]);
    if (1 !== count($ids)) throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia UK Market record is missing.' : 'Multiple Malaysia UK Market records were found.');
    $post_id = (int) $ids[0];
    if (is_wp_error(tio2_validate_market_page_uk_v01_contract($post_id))) throw new \GraphQL\Error\UserError('The Malaysia UK Market record failed scope or contract validation.');
    $json = get_post_meta($post_id, TIO2_MY_UK_MARKET_CONTRACT_META, true);
    $contract = json_decode($json, true);
    $readiness = [];
    foreach ($contract['routeRegistry'] as $route) {
        // Existing shared LIVE_APPROVED resolver validates scope, canonical and receiver state.
        // Missing or unqualified target types remain false; never infer live from an href.
        $readiness[$route['targetPageId']] = tio2_my_product_target_ready($route['targetPageId'], $route['href']);
    }
    return wp_json_encode(['id' => 'market-uk-001-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id), 'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/markets/united-kingdom'],
        'malaysiaUkMarketContractJson' => $json, 'routeReadiness' => $readiness]);
}

function tio2_register_market_page_uk_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaUkMarketRecordJson', [
        'type' => ['non_null' => 'String'], 'resolve' => 'tio2_resolve_malaysia_uk_market_record_json',
        'description' => 'Approved, scope-bound MARKET-UK-001 record for TiO2 Malaysia.',
    ]);
}
add_action('graphql_register_types', 'tio2_register_market_page_uk_v01_graphql_field');
