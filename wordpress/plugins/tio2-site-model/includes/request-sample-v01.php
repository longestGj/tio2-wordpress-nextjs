<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_REQUEST_SAMPLE_CONTRACT_META = '_tio2_my_request_sample_contract_json';

function tio2_register_request_sample_v01_content_type(): void
{
    register_post_type('tio2_request_sample', [
        'labels' => ['name' => 'TiO2 Sample Request Pages', 'singular_name' => 'TiO2 Sample Request Page'],
        'public' => false, 'show_ui' => true, 'show_in_rest' => false, 'show_in_graphql' => false,
        'publicly_queryable' => false, 'supports' => ['title', 'revisions'], 'has_archive' => false, 'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_request_sample');
}

function tio2_my_request_sample_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-request-sample.json';
}

/** @return string|WP_Error */
function tio2_my_request_sample_approved_contract_json()
{
    $json = is_readable(tio2_my_request_sample_contract_path()) ? file_get_contents(tio2_my_request_sample_contract_path()) : false;
    return is_string($json) && '' !== $json ? $json : new WP_Error('tio2_my_request_sample_contract_missing', 'The approved Malaysia Sample Request contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_request_sample_v01_contract(int $post_id)
{
    if ('tio2_request_sample' !== get_post_type($post_id)) return new WP_Error('tio2_my_request_sample_invalid_type', 'The Sample Request record type is invalid.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_request_sample_invalid_scope', 'The Sample Request contract is valid only for site_scope=tio2-my.');
    }
    if ('/request-sample' !== get_post_meta($post_id, 'public_path', true) || 'tio2-my-request-sample' !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_my_request_sample_invalid_route', 'The Sample Request route identity is invalid.');
    }
    $approved = tio2_my_request_sample_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_REQUEST_SAMPLE_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) return new WP_Error('tio2_my_request_sample_contract_mismatch', 'The stored Malaysia Sample Request payload does not match the approved contract.');
    $contract = json_decode($stored, true);
    if (! is_array($contract) || 'CONV-SAMPLE-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) || 'CONV-SAMPLE-G7-PCR-01' !== ($contract['reviewId'] ?? null) || 'CONV-SAMPLE' !== ($contract['identity']['pageId'] ?? null) || 'tio2-my' !== ($contract['identity']['siteScope'] ?? null) || '/request-sample/' !== ($contract['identity']['path'] ?? null) || 'request-sample-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null) || false !== ($contract['releaseControls']['indexingAuthorized'] ?? null)) {
        return new WP_Error('tio2_my_request_sample_contract_invalid', 'The Sample Request payload identity or release controls are invalid.');
    }
    return true;
}

function tio2_resolve_malaysia_request_sample_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_request_sample', 'post_status' => 'publish', 'name' => 'tio2-my-request-sample',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
        'tax_query' => [['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-my']]],
    ]);
    if (1 !== count($ids)) throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia Sample Request record is missing.' : 'Multiple Malaysia Sample Request records were found.');
    $post_id = (int) $ids[0];
    $validation = tio2_validate_request_sample_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia Sample Request record failed scope or contract validation.');
    return wp_json_encode([
        'id' => 'request-sample-page-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id), 'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/request-sample'],
        'malaysiaRequestSampleContractJson' => (string) get_post_meta($post_id, TIO2_MY_REQUEST_SAMPLE_CONTRACT_META, true),
    ]);
}

function tio2_register_request_sample_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaRequestSampleRecordJson', [
        'type' => ['non_null' => 'String'], 'resolve' => 'tio2_resolve_malaysia_request_sample_record_json',
        'description' => 'Approved, scope-bound CONV-SAMPLE record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_request_sample_v01_content_type');
add_action('graphql_register_types', 'tio2_register_request_sample_v01_graphql_field');
