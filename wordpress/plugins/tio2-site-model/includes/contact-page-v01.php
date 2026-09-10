<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_CONTACT_PAGE_CONTRACT_META = '_tio2_my_contact_page_contract_json';

function tio2_register_contact_page_v01_content_type(): void
{
    register_post_type('tio2_contact_page', [
        'labels' => ['name' => 'TiO2 Contact Pages', 'singular_name' => 'TiO2 Contact Page'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_contact_page');
}

/** @return true|WP_Error */
function tio2_validate_contact_page_v01_contract(int $post_id)
{
    if ('tio2_contact_page' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_contact_page_type_invalid', 'The Contact page record type is invalid.');
    }
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) {
        return new WP_Error('tio2_my_contact_page_scope_invalid', 'The Contact page scope is invalid.');
    }
    if ('tio2-my-contact' !== get_post_field('post_name', $post_id) || '/contact' !== get_post_meta($post_id, 'public_path', true)) {
        return new WP_Error('tio2_my_contact_page_route_invalid', 'The Contact page route identity is invalid.');
    }
    $json = get_post_meta($post_id, TIO2_MY_CONTACT_PAGE_CONTRACT_META, true);
    $contract = is_string($json) ? json_decode($json, true) : null;
    $identity = is_array($contract) && isset($contract['identity']) && is_array($contract['identity']) ? $contract['identity'] : [];
    if (
        'CONTACT-001' !== ($identity['pageId'] ?? null) || 'tio2-my' !== ($identity['siteScope'] ?? null) ||
        'en' !== ($identity['locale'] ?? null) || '/contact/' !== ($identity['path'] ?? null) ||
        'contact-page-v0.1-malaysia' !== ($identity['contractVersion'] ?? null)
    ) return new WP_Error('tio2_my_contact_page_contract_invalid', 'The Contact page payload identity is invalid.');
    return true;
}

function tio2_resolve_malaysia_contact_page_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_contact_page', 'post_status' => 'publish', 'name' => 'tio2-my-contact',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The Malaysia Contact page record is missing.'
            : 'Multiple Malaysia Contact page records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_contact_page_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia Contact page record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_CONTACT_PAGE_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) throw new \GraphQL\Error\UserError('The Malaysia Contact page record has no approved contract payload.');
    return wp_json_encode([
        'id' => 'contact-page-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/contact'],
        'malaysiaContactPageContractJson' => $contract_json,
    ]);
}

function tio2_register_contact_page_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaContactPageRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_contact_page_record_json',
        'description' => 'Approved, scope-bound CONTACT-001 record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_contact_page_v01_content_type');
add_action('graphql_register_types', 'tio2_register_contact_page_v01_graphql_field');
