<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_DOCUMENT_REACH_CONTRACT_META = '_tio2_my_document_reach_contract_json';

function tio2_my_document_reach_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-document-reach.json';
}

/** @return string|WP_Error */
function tio2_my_document_reach_approved_contract_json()
{
    $path = tio2_my_document_reach_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_document_reach_contract_missing', 'The approved DOC-REACH contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_document_reach_v01_contract(int $post_id)
{
    if ('tio2_doc_tds' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_document_reach_invalid_type', 'The DOC-REACH record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_document_reach_invalid_scope', 'DOC-REACH is valid only for site_scope=tio2-my.');
    }
    if ('/documents/reach' !== get_post_meta($post_id, 'public_path', true) || 'tio2-my-document-reach' !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_my_document_reach_invalid_route', 'The DOC-REACH route identity is invalid.');
    }
    $approved = tio2_my_document_reach_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_DOCUMENT_REACH_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_document_reach_contract_mismatch', 'The stored DOC-REACH payload does not match Gate 7.');
    }
    $contract = json_decode($stored, true);
    $module_ids = is_array($contract['modules'] ?? null)
        ? array_map(static fn ($module) => is_array($module) ? ($module['id'] ?? null) : null, $contract['modules'])
        : [];
    if (
        ! is_array($contract) || '0.1' !== ($contract['schema_version'] ?? null) ||
        'DOC-REACH-G7-HANDOFF-01' !== ($contract['package_id'] ?? null) ||
        'tio2-my' !== ($contract['page']['site_scope'] ?? null) || 'DOC-REACH' !== ($contract['page']['page_id'] ?? null) ||
        '/documents/reach/' !== ($contract['page']['route'] ?? null) ||
        ['hero', 'direct_answer', 'substance_vs_coverage', 'legal_actor', 'regulatory_scope', 'verification_checklist', 'official_sources', 'request_process', 'buyer_questions', 'related_paths', 'final_cta'] !== $module_ids
    ) return new WP_Error('tio2_my_document_reach_contract_invalid', 'The DOC-REACH payload identity or module order is invalid.');
    return true;
}

/** @return array<string, bool> */
function tio2_my_document_reach_route_readiness(array $contract): array
{
    $targets = [
        'CONV-DOC' => (string) ($contract['request_contract']['receiver_route'] ?? ''),
        'DOC-000' => (string) ($contract['request_contract']['secondary_route'] ?? ''),
    ];
    foreach (($contract['modules'][9]['items'] ?? []) as $item) {
        if (is_array($item) && is_string($item['page_id'] ?? null) && is_string($item['route'] ?? null)) {
            $targets[$item['page_id']] = $item['route'];
        }
    }
    if (array_keys($targets) !== ['CONV-DOC', 'DOC-000', 'MARKET-EU-001']) {
        throw new \GraphQL\Error\UserError('The DOC-REACH route registry is invalid.');
    }
    $result = [];
    foreach ($targets as $page_id => $href) $result[$page_id] = tio2_my_document_tds_target_ready($page_id, $href);
    return $result;
}

function tio2_resolve_malaysia_document_reach_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_doc_tds', 'post_status' => 'publish', 'name' => 'tio2-my-document-reach',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia DOC-REACH record is missing.' : 'Multiple Malaysia DOC-REACH records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_document_reach_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia DOC-REACH record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_DOCUMENT_REACH_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_string($contract_json) || ! is_array($contract)) throw new \GraphQL\Error\UserError('The Malaysia DOC-REACH payload is unavailable.');
    return wp_json_encode([
        'id' => 'document-reach-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/documents/reach'],
        'malaysiaDocumentReachContractJson' => $contract_json,
        'routeReadiness' => tio2_my_document_reach_route_readiness($contract),
    ]);
}

function tio2_register_document_reach_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaDocumentReachRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_document_reach_record_json',
        'description' => 'Approved scope-bound DOC-REACH record and scoped route readiness for TiO2 Malaysia.',
    ]);
}

add_action('graphql_register_types', 'tio2_register_document_reach_v01_graphql_field');
