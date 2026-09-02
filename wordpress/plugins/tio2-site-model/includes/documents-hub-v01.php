<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_DOCUMENTS_HUB_CONTRACT_META = '_tio2_my_documents_hub_contract_json';

function tio2_register_documents_hub_v01_content_type(): void
{
    register_post_type('tio2_documents_hub', [
        'labels' => ['name' => 'TiO2 Documents Hubs', 'singular_name' => 'TiO2 Documents Hub'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_documents_hub');
}

function tio2_my_documents_hub_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-documents-hub.json';
}

/** @return string|WP_Error */
function tio2_my_documents_hub_approved_contract_json()
{
    $path = tio2_my_documents_hub_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_documents_hub_contract_missing', 'The approved Malaysia Documents Hub contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_documents_hub_v01_contract(int $post_id)
{
    if ('tio2_documents_hub' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_documents_hub_invalid_type', 'The Documents Hub record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_documents_hub_invalid_scope', 'The Documents Hub contract is valid only for site_scope=tio2-my.');
    }
    if ('/documents' !== get_post_meta($post_id, 'public_path', true) || 'tio2-my-documents' !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_my_documents_hub_invalid_route', 'The Documents Hub route identity is invalid.');
    }
    $approved = tio2_my_documents_hub_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_documents_hub_contract_mismatch', 'The stored Malaysia Documents Hub payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'DOC-000-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'DOC-000' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/documents/' !== ($contract['identity']['path'] ?? null) ||
        'documents-hub-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) return new WP_Error('tio2_my_documents_hub_contract_invalid', 'The Documents Hub payload identity is invalid.');
    return true;
}

function tio2_resolve_malaysia_documents_hub_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_documents_hub', 'post_status' => 'publish', 'name' => 'tio2-my-documents',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
        'tax_query' => [[
            'taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-my'], 'operator' => 'IN',
        ]],
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The Malaysia Documents Hub record is missing.'
            : 'Multiple Malaysia Documents Hub records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_documents_hub_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia Documents Hub record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) throw new \GraphQL\Error\UserError('The Malaysia Documents Hub record has no approved contract payload.');
    return wp_json_encode([
        'id' => 'documents-hub-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/documents'],
        'malaysiaDocumentsHubContractJson' => $contract_json,
    ]);
}

function tio2_register_documents_hub_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaDocumentsHubRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_documents_hub_record_json',
        'description' => 'Approved, scope-bound DOC-000 record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_documents_hub_v01_content_type');
add_action('graphql_register_types', 'tio2_register_documents_hub_v01_graphql_field');
