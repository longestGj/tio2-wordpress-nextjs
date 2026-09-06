<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_RFQ_PAGE_CONTRACT_META = '_tio2_my_rfq_page_contract_json';

function tio2_register_rfq_page_v01_content_type(): void
{
    register_post_type('tio2_rfq_page', [
        'labels' => ['name' => 'TiO2 RFQ Pages', 'singular_name' => 'TiO2 RFQ Page'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_rfq_page');
}

function tio2_my_rfq_page_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-rfq-page.json';
}

/** @return string|WP_Error */
function tio2_my_rfq_page_approved_contract_json()
{
    $json = is_readable(tio2_my_rfq_page_contract_path())
        ? file_get_contents(tio2_my_rfq_page_contract_path())
        : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_rfq_contract_missing', 'The approved Malaysia RFQ contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_rfq_page_v01_contract(int $post_id)
{
    if ('tio2_rfq_page' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_rfq_invalid_type', 'The RFQ page record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_rfq_invalid_scope', 'The RFQ contract is valid only for site_scope=tio2-my.');
    }
    if (
        '/request-a-quote' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-request-a-quote' !== get_post_field('post_name', $post_id)
    ) return new WP_Error('tio2_my_rfq_invalid_route', 'The RFQ route identity is invalid.');

    $approved = tio2_my_rfq_page_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_rfq_contract_mismatch', 'The stored Malaysia RFQ payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'CONV-RFQ-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'CONV-RFQ-G7-PCR-02' !== ($contract['reviewId'] ?? null) ||
        'CONV-RFQ' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/request-a-quote/' !== ($contract['identity']['path'] ?? null) ||
        'rfq-page-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null) ||
        false !== ($contract['releaseControls']['indexingAuthorized'] ?? null) ||
        false !== ($contract['releaseControls']['remarketingEnabled'] ?? null) ||
        false !== ($contract['releaseControls']['turnstileEnabled'] ?? null) ||
        false !== ($contract['releaseControls']['recaptchaEnabled'] ?? null)
    ) return new WP_Error('tio2_my_rfq_contract_invalid', 'The RFQ payload identity or release controls are invalid.');
    return true;
}

function tio2_resolve_malaysia_rfq_page_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_rfq_page', 'post_status' => 'publish', 'name' => 'tio2-my-request-a-quote',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The Malaysia RFQ page record is missing.'
            : 'Multiple Malaysia RFQ page records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_rfq_page_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError('The Malaysia RFQ page record failed scope or contract validation.');
    }
    return wp_json_encode([
        'id' => 'rfq-page-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/request-a-quote'],
        'malaysiaRfqPageContractJson' => (string) get_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, true),
    ]);
}

function tio2_register_rfq_page_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaRfqPageRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_rfq_page_record_json',
        'description' => 'Approved, scope-bound CONV-RFQ record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_rfq_page_v01_content_type');
add_action('graphql_register_types', 'tio2_register_rfq_page_v01_graphql_field');
