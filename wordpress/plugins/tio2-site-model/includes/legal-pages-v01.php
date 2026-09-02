<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_LEGAL_PAGE_CONTRACT_META = '_tio2_my_legal_page_contract_json';

function tio2_register_legal_pages_v01_content_type(): void
{
    register_post_type('tio2_legal_page', [
        'labels' => ['name' => 'TiO2 Legal Pages', 'singular_name' => 'TiO2 Legal Page'],
        'public' => false, 'show_ui' => true, 'show_in_rest' => false,
        'show_in_graphql' => false, 'publicly_queryable' => false,
        'supports' => ['title', 'revisions'], 'has_archive' => false, 'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_legal_page');
}

function tio2_my_legal_pages_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-legal-pages.json';
}

/** @return array<string, mixed>|WP_Error */
function tio2_my_legal_pages_approved_contract()
{
    $path = tio2_my_legal_pages_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    $contract = is_string($json) ? json_decode($json, true) : null;
    return is_array($contract) ? $contract : new WP_Error('tio2_my_legal_contract_missing', 'The approved Malaysia Legal/Privacy contract is unavailable.');
}

/** @return array<string, array<string, mixed>>|WP_Error */
function tio2_my_legal_pages_by_path()
{
    $contract = tio2_my_legal_pages_approved_contract();
    if (is_wp_error($contract)) return $contract;
    $pages = [];
    foreach ($contract['pages'] ?? [] as $page) {
        if (! is_array($page) || ! is_string($page['path'] ?? null)) return new WP_Error('tio2_my_legal_contract_invalid', 'The approved Legal page collection is invalid.');
        $pages[rtrim($page['path'], '/')] = $page;
    }
    return 3 === count($pages) ? $pages : new WP_Error('tio2_my_legal_contract_cardinality', 'The approved Legal page collection must contain exactly three pages.');
}

/** @return true|WP_Error */
function tio2_validate_legal_page_v01_contract(int $post_id)
{
    if ('tio2_legal_page' !== get_post_type($post_id)) return new WP_Error('tio2_my_legal_invalid_type', 'The Legal page record type is invalid.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_legal_invalid_scope', 'The Legal page record is valid only for site_scope=tio2-my.');
    }
    $path = (string) get_post_meta($post_id, 'public_path', true);
    $approved = tio2_my_legal_pages_by_path();
    if (is_wp_error($approved) || ! isset($approved[$path])) return new WP_Error('tio2_my_legal_invalid_route', 'The Legal page route identity is invalid.');
    $stored_json = get_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, true);
    $stored = is_string($stored_json) ? json_decode($stored_json, true) : null;
    if (! is_array($stored) || wp_json_encode($stored, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !== wp_json_encode($approved[$path], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)) {
        return new WP_Error('tio2_my_legal_contract_mismatch', 'The stored Legal page payload does not match the approved contract.');
    }
    if ('no_optional_analytics' !== ($stored['releaseState'] ?? null) || 'tio2-my' !== (($approved_contract = tio2_my_legal_pages_approved_contract())['siteScope'] ?? null)) {
        return new WP_Error('tio2_my_legal_release_state', 'The Legal page release state is invalid.');
    }
    return true;
}

function tio2_resolve_malaysia_legal_pages_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_legal_page', 'post_status' => 'publish', 'fields' => 'ids',
        'numberposts' => 4, 'suppress_filters' => false,
        'tax_query' => [['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-my'], 'operator' => 'IN']],
    ]);
    if (3 !== count($ids)) throw new \GraphQL\Error\UserError('The Malaysia Legal page collection is missing, duplicated or incomplete.');
    $records = [];
    foreach ($ids as $post_id) {
        $post_id = (int) $post_id;
        $validation = tio2_validate_legal_page_v01_contract($post_id);
        if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('A Malaysia Legal page record failed scope or contract validation.');
        $path = (string) get_post_meta($post_id, 'public_path', true);
        $records[$path] = [
            'id' => 'legal-page-' . $post_id,
            'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
            'status' => get_post_status($post_id),
            'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
            'publishingFields' => ['publicPath' => $path],
            'malaysiaLegalPageContractJson' => (string) get_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, true),
        ];
    }
    $ordered = [];
    foreach (['/privacy-policy', '/ms/privacy-policy', '/cookie-policy'] as $path) {
        if (! isset($records[$path])) throw new \GraphQL\Error\UserError('The Malaysia Legal page route set is incomplete.');
        $ordered[] = $records[$path];
    }
    return wp_json_encode($ordered, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

function tio2_register_legal_pages_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaLegalPagesRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_legal_pages_record_json',
        'description' => 'Approved, scope-bound Legal/Privacy pages for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_legal_pages_v01_content_type');
add_action('graphql_register_types', 'tio2_register_legal_pages_v01_graphql_field');
