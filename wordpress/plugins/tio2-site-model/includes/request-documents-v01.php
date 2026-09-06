<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_REQUEST_DOCUMENTS_CONTRACT_META = '_tio2_my_request_documents_contract_json';

function tio2_register_request_documents_v01_content_type(): void
{
    register_post_type('tio2_request_docs', [
        'labels' => ['name' => 'TiO2 Request Documents Pages', 'singular_name' => 'TiO2 Request Documents Page'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_request_docs');
}

function tio2_my_request_documents_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-request-documents.json';
}

/** @return string|WP_Error */
function tio2_my_request_documents_approved_contract_json()
{
    $json = is_readable(tio2_my_request_documents_contract_path())
        ? file_get_contents(tio2_my_request_documents_contract_path())
        : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_request_documents_contract_missing', 'The approved Malaysia Request Documents contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_request_documents_v01_contract(int $post_id)
{
    if ('tio2_request_docs' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_request_documents_invalid_type', 'The Request Documents record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_request_documents_invalid_scope', 'The Request Documents contract is valid only for site_scope=tio2-my.');
    }
    if (
        '/request-documents' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-request-documents' !== get_post_field('post_name', $post_id)
    ) return new WP_Error('tio2_my_request_documents_invalid_route', 'The Request Documents route identity is invalid.');

    $approved = tio2_my_request_documents_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_REQUEST_DOCUMENTS_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_request_documents_contract_mismatch', 'The stored Malaysia Request Documents payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'CONV-DOC-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'CONV-DOC-G7-PCR-01' !== ($contract['reviewId'] ?? null) ||
        'CONV-DOC' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/request-documents/' !== ($contract['identity']['path'] ?? null) ||
        'request-documents-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null) ||
        false !== ($contract['releaseControls']['indexingAuthorized'] ?? null)
    ) return new WP_Error('tio2_my_request_documents_contract_invalid', 'The Request Documents payload identity or release controls are invalid.');
    return true;
}

function tio2_resolve_malaysia_request_documents_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_request_docs',
        'post_status' => 'publish',
        'name' => 'tio2-my-request-documents',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => ['tio2-my'],
        ]],
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The Malaysia Request Documents record is missing.'
            : 'Multiple Malaysia Request Documents records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_request_documents_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError('The Malaysia Request Documents record failed scope or contract validation.');
    }
    return wp_json_encode([
        'id' => 'request-documents-page-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/request-documents'],
        'malaysiaRequestDocumentsContractJson' => (string) get_post_meta($post_id, TIO2_MY_REQUEST_DOCUMENTS_CONTRACT_META, true),
    ]);
}

function tio2_register_request_documents_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaRequestDocumentsRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_request_documents_record_json',
        'description' => 'Approved, scope-bound CONV-DOC record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_request_documents_v01_content_type');
add_action('graphql_register_types', 'tio2_register_request_documents_v01_graphql_field');
