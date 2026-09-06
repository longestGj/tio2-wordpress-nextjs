<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_DOCUMENT_TDS_CONTRACT_META = '_tio2_my_document_tds_contract_json';

function tio2_register_document_tds_v01_content_type(): void
{
    register_post_type('tio2_doc_tds', [
        'labels' => ['name' => 'TiO2 Document Decision Pages', 'singular_name' => 'TiO2 Document Decision Page'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_doc_tds');
}

function tio2_my_document_tds_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-document-tds.json';
}

/** @return string|WP_Error */
function tio2_my_document_tds_approved_contract_json()
{
    $path = tio2_my_document_tds_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_document_tds_contract_missing', 'The approved DOC-TDS contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_document_tds_v01_contract(int $post_id)
{
    if ('tio2_doc_tds' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_document_tds_invalid_type', 'The DOC-TDS record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_document_tds_invalid_scope', 'DOC-TDS is valid only for site_scope=tio2-my.');
    }
    if (
        '/documents/tds-sds-coa' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-document-tds-sds-coa' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_document_tds_invalid_route', 'The DOC-TDS route identity is invalid.');
    }
    $approved = tio2_my_document_tds_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_DOCUMENT_TDS_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_document_tds_contract_mismatch', 'The stored DOC-TDS payload does not match Gate 7.');
    }
    $contract = json_decode($stored, true);
    $module_ids = is_array($contract['modules'] ?? null)
        ? array_map(static fn ($module) => is_array($module) ? ($module['id'] ?? null) : null, $contract['modules'])
        : [];
    if (
        ! is_array($contract) ||
        '0.1' !== ($contract['schema_version'] ?? null) ||
        'DOC-TDS-G7-HANDOFF-01' !== ($contract['package_id'] ?? null) ||
        'tio2-my' !== ($contract['page']['site_scope'] ?? null) ||
        'DOC-TDS' !== ($contract['page']['page_id'] ?? null) ||
        '/documents/tds-sds-coa/' !== ($contract['page']['route'] ?? null) ||
        ['hero', 'direct_answer', 'document_choice', 'product_grade', 'comparison', 'request_checklist', 'request_process', 'buyer_questions', 'related_paths', 'final_cta'] !== $module_ids
    ) {
        return new WP_Error('tio2_my_document_tds_contract_invalid', 'The DOC-TDS payload identity or module order is invalid.');
    }
    return true;
}

function tio2_my_document_tds_target_ready(string $page_id, string $href): bool
{
    $parsed = wp_parse_url($href);
    if (! is_array($parsed) || isset($parsed['scheme']) || isset($parsed['host']) || ! is_string($parsed['path'] ?? null)) {
        throw new \GraphQL\Error\UserError('A DOC-TDS target path is invalid.');
    }
    $public_path = '/' === $parsed['path'] ? '/' : untrailingslashit($parsed['path']);
    $ids = get_posts([
        'post_type' => [
            'page', 'post', 'tio2_documents_hub', 'tio2_request_docs', 'tio2_doc_tds', 'tio2_document',
            'tio2_market_page',
        ],
        'post_status' => ['draft', 'pending', 'private', 'publish', 'future'],
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
        'meta_query' => [['key' => 'public_path', 'value' => $public_path, 'compare' => '=']],
    ]);
    if (1 !== count($ids)) return false;
    $post_id = (int) $ids[0];
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    $ready = ! is_wp_error($scopes) &&
        ['tio2-my'] === array_values(array_unique(array_map('strval', $scopes))) &&
        'publish' === get_post_status($post_id) &&
        $page_id === get_post_meta($post_id, TIO2_MY_ROUTE_PAGE_ID_META, true) &&
        $public_path === get_post_meta($post_id, 'public_path', true) &&
        tio2_my_product_target_canonical($public_path) === get_post_meta($post_id, TIO2_MY_ROUTE_CANONICAL_META, true) &&
        'LIVE_APPROVED' === get_post_meta($post_id, TIO2_MY_ROUTE_RELEASE_STATE_META, true);
    if (! $ready || 'CONV-DOC' !== $page_id) return $ready;
    $form_key = get_post_meta($post_id, TIO2_MY_RECEIVER_FORM_KEY_META, true);
    return 'READY' === get_post_meta($post_id, TIO2_MY_RECEIVER_STATE_META, true) &&
        'CONV-DOC' === get_post_meta($post_id, TIO2_MY_RECEIVER_TARGET_PAGE_ID_META, true) &&
        is_string($form_key) && '' !== trim($form_key);
}

/** @return array<string, bool> */
function tio2_my_document_tds_route_readiness(array $contract): array
{
    $targets = [
        'CONV-DOC' => (string) ($contract['request_contract']['receiver_route'] ?? ''),
        'DOC-000' => (string) ($contract['request_contract']['secondary_route'] ?? ''),
    ];
    foreach (($contract['modules'][8]['items'] ?? []) as $item) {
        if (is_array($item) && is_string($item['page_id'] ?? null) && is_string($item['route'] ?? null)) {
            $targets[$item['page_id']] = $item['route'];
        }
    }
    if (array_keys($targets) !== ['CONV-DOC', 'DOC-000', 'DOC-REACH', 'DOC-COO']) {
        throw new \GraphQL\Error\UserError('The DOC-TDS route registry is invalid.');
    }
    $result = [];
    foreach ($targets as $page_id => $href) $result[$page_id] = tio2_my_document_tds_target_ready($page_id, $href);
    return $result;
}

function tio2_resolve_malaysia_document_tds_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_doc_tds', 'post_status' => 'publish',
        'name' => 'tio2-my-document-tds-sds-coa', 'fields' => 'ids', 'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia DOC-TDS record is missing.' : 'Multiple Malaysia DOC-TDS records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_document_tds_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia DOC-TDS record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_DOCUMENT_TDS_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_string($contract_json) || ! is_array($contract)) throw new \GraphQL\Error\UserError('The Malaysia DOC-TDS payload is unavailable.');
    return wp_json_encode([
        'id' => 'document-tds-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/documents/tds-sds-coa'],
        'malaysiaDocumentTdsContractJson' => $contract_json,
        'routeReadiness' => tio2_my_document_tds_route_readiness($contract),
    ]);
}

function tio2_register_document_tds_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaDocumentTdsRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_document_tds_record_json',
        'description' => 'Approved scope-bound DOC-TDS record and scoped route readiness for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_document_tds_v01_content_type');
add_action('graphql_register_types', 'tio2_register_document_tds_v01_graphql_field');
