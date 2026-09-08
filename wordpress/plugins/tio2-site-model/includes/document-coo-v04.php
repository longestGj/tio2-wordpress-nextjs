<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_DOCUMENT_COO_CONTRACT_META = '_tio2_my_document_coo_contract_json';

function tio2_my_document_coo_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-document-coo.json';
}

/** @return string|WP_Error */
function tio2_my_document_coo_approved_contract_json()
{
    $path = tio2_my_document_coo_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_document_coo_contract_missing', 'The approved DOC-COO contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_document_coo_v04_contract(int $post_id)
{
    if ('tio2_doc_tds' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_document_coo_invalid_type', 'The DOC-COO record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_document_coo_invalid_scope', 'DOC-COO is valid only for site_scope=tio2-my.');
    }
    if (
        '/documents/certificate-of-origin' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-document-coo' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_document_coo_invalid_route', 'The DOC-COO route identity is invalid.');
    }
    $approved = tio2_my_document_coo_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_document_coo_contract_mismatch', 'The stored DOC-COO payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    $section_ids = is_array($contract['sections'] ?? null)
        ? array_map(static fn ($section) => is_array($section) ? ($section['id'] ?? null) : null, $contract['sections'])
        : [];
    if (
        ! is_array($contract) ||
        'document-coo-public-v0.4' !== ($contract['schemaVersion'] ?? null) ||
        'DOC-COO' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        'en' !== ($contract['identity']['locale'] ?? null) ||
        '/documents/certificate-of-origin/' !== ($contract['identity']['path'] ?? null) ||
        ['coo-01', 'coo-02', 'coo-03', 'coo-04', 'coo-05', 'coo-06'] !== $section_ids
    ) {
        return new WP_Error('tio2_my_document_coo_contract_invalid', 'The DOC-COO payload identity or section order is invalid.');
    }
    return true;
}

function tio2_resolve_malaysia_document_coo_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_doc_tds', 'post_status' => 'publish', 'name' => 'tio2-my-document-coo',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia DOC-COO record is missing.' : 'Multiple Malaysia DOC-COO records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_document_coo_v04_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia DOC-COO record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_array($contract)) throw new \GraphQL\Error\UserError('The Malaysia DOC-COO payload is unavailable.');
    return wp_json_encode([
        'id' => 'document-coo-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/documents/certificate-of-origin'],
        'malaysiaDocumentCooContractJson' => wp_json_encode($contract, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
    ]);
}

function tio2_register_document_coo_v04_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaDocumentCooRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_document_coo_record_json',
        'description' => 'Approved scope-bound DOC-COO record for TiO2 Malaysia.',
    ]);
}

add_action('graphql_register_types', 'tio2_register_document_coo_v04_graphql_field');
