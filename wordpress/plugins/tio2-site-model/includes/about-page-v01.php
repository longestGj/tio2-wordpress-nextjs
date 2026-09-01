<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

const TIO2_MY_ABOUT_PAGE_CONTRACT_META = '_tio2_my_about_page_contract_json';

function tio2_register_about_page_v01_content_type(): void
{
    register_post_type('tio2_about_page', [
        'labels' => ['name' => 'TiO2 About Pages', 'singular_name' => 'TiO2 About Page'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_about_page');
}

function tio2_my_about_page_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-about-page.json';
}

/** @return string|WP_Error */
function tio2_my_about_page_approved_contract_json()
{
    $path = tio2_my_about_page_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_about_page_contract_missing', 'The approved Malaysia About page contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_about_page_v01_contract(int $post_id)
{
    if ('tio2_about_page' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_about_page_invalid_type', 'The About page record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_about_page_invalid_scope', 'The About page contract is valid only for site_scope=tio2-my.');
    }
    if ('/about' !== get_post_meta($post_id, 'public_path', true) || 'tio2-my-about' !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_my_about_page_invalid_route', 'The About page route identity is invalid.');
    }
    $approved = tio2_my_about_page_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_about_page_contract_mismatch', 'The stored Malaysia About page payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'ABOUT-001-G7-PCR-02' !== ($contract['packageId'] ?? null) ||
        'ABOUT-001' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/about/' !== ($contract['identity']['path'] ?? null) ||
        'about-page-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null)
    ) return new WP_Error('tio2_my_about_page_contract_invalid', 'The About page payload identity is invalid.');
    return true;
}

function tio2_resolve_malaysia_about_page_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_about_page', 'post_status' => 'publish', 'name' => 'tio2-my-about',
        'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids)
            ? 'The Malaysia About page record is missing.'
            : 'Multiple Malaysia About page records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_about_page_v01_contract($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia About page record failed scope or contract validation.');
    $contract_json = get_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) throw new \GraphQL\Error\UserError('The Malaysia About page record has no approved contract payload.');
    return wp_json_encode([
        'id' => 'about-page-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/about'],
        'malaysiaAboutPageContractJson' => $contract_json,
    ]);
}

function tio2_register_about_page_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaAboutPageRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_about_page_record_json',
        'description' => 'Approved, scope-bound ABOUT-001 record for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_about_page_v01_content_type');
add_action('graphql_register_types', 'tio2_register_about_page_v01_graphql_field');
