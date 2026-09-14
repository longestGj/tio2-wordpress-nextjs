<?php

declare(strict_types=1);
require_once __DIR__.'/content-release-validation.php';
require_once __DIR__.'/home-application-read-contract.php';
require_once __DIR__.'/content-write-contract.php';

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_APPLICATION_HUB_CONTRACT_META = '_tio2_my_application_hub_contract_json';

function tio2_register_application_hub_v01_content_type(): void
{
    register_post_type('tio2_application_hub', [
        'labels' => ['name' => 'TiO2 Application Hubs', 'singular_name' => 'TiO2 Application Hub'],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_application_hub');
    register_post_meta('tio2_application_hub', TIO2_MY_APPLICATION_HUB_CONTRACT_META, [
        'type' => 'string', 'single' => true, 'show_in_rest' => false,
        'auth_callback' => static fn (): bool => current_user_can('edit_pages'),
    ]);
}

function tio2_my_application_hub_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-application-hub.json';
}

/** @return string|WP_Error */
function tio2_my_application_hub_approved_contract_json()
{
    $path = tio2_my_application_hub_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    return is_string($json) && '' !== $json
        ? $json
        : new WP_Error('tio2_my_application_hub_contract_missing', 'The approved Malaysia Application Hub contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_application_hub_v01_contract(int $post_id)
{
    if ('tio2_application_hub' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_application_hub_invalid_type', 'The Application Hub record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_application_hub_invalid_scope', 'The Application Hub contract is valid only for site_scope=tio2-my.');
    }
    if ('/applications' !== get_post_meta($post_id, 'public_path', true) || 'tio2-my-applications' !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_my_application_hub_invalid_route', 'The Application Hub route identity is invalid.');
    }
    $stored = get_post_meta($post_id, TIO2_MY_APPLICATION_HUB_CONTRACT_META, true);
    return is_string($stored) ? tio2_validate_my_content_write('APP-000', $stored, $stored)
        : new WP_Error('write_schema', 'The stored Malaysia Application Hub payload is invalid.');
}

/** @return array|WP_Error */
function tio2_validate_application_hub_v01_read_record(int $post_id)
{
    $post = get_post($post_id);
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (!$post instanceof WP_Post || $post->post_type !== 'tio2_application_hub' || $post->post_status !== 'publish' ||
        wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || $scopes !== ['tio2-my'] ||
        $post->post_name !== 'tio2-my-applications' || get_post_meta($post_id, 'public_path', true) !== '/applications') {
        return new WP_Error('tio2_my_application_hub_read_identity', 'Invalid Malaysia Application Hub read identity or status.');
    }
    $ids = get_posts(['post_type' => 'tio2_application_hub', 'post_status' => ['publish','future','draft','pending','private','auto-draft','trash'], 'fields' => 'ids', 'numberposts' => -1, 'suppress_filters' => false]);
    $owners = array_values(array_filter(array_map('intval', $ids), static function (int $id): bool {
        $candidate_scopes = wp_get_post_terms($id, 'site_scope', ['fields' => 'slugs']);
        return get_post_field('post_name', $id) === 'tio2-my-applications' ||
            (get_post_meta($id, 'public_path', true) === '/applications' && is_array($candidate_scopes) && in_array('tio2-my', $candidate_scopes, true));
    }));
    if ($owners !== [$post_id] || tio2_find_managed_route_post_ids('tio2-my', '/applications') !== []) {
        return new WP_Error('tio2_my_application_hub_read_duplicate', 'Ambiguous Malaysia Application Hub route ownership.');
    }
    $stored = get_post_meta($post_id, TIO2_MY_APPLICATION_HUB_CONTRACT_META, true);
    return tio2_my_home_application_read_content(is_string($stored) ? json_decode($stored) : null, 'APP-000');
}

/** @return array<string, bool> */
function tio2_my_application_hub_route_readiness(array $contract): array
{
    $routes = $contract['routeRegistry'] ?? null;
    if (! is_array($routes)) throw new \GraphQL\Error\UserError('The Malaysia Application Hub route registry is invalid.');
    $readiness = [];
    foreach ($routes as $route) {
        if (! is_array($route) || ! is_string($route['targetPageId'] ?? null) || ! is_string($route['href'] ?? null) || array_key_exists($route['targetPageId'], $readiness)) {
            throw new \GraphQL\Error\UserError('The Malaysia Application Hub route registry is ambiguous.');
        }
        $readiness[$route['targetPageId']] = tio2_my_product_target_ready($route['targetPageId'], $route['href']);
    }
    return $readiness;
}

function tio2_resolve_malaysia_application_hub_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_application_hub', 'post_status' => 'publish',
        'name' => 'tio2-my-applications', 'fields' => 'ids', 'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia Application Hub record is missing.' : 'Multiple Malaysia Application Hub records were found.');
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_application_hub_v01_read_record($post_id);
    if (is_wp_error($validation)) throw new \GraphQL\Error\UserError('The Malaysia Application Hub record failed scope or contract validation.');
    $contract = $validation;
    $contract_json = wp_json_encode($contract);
    if (! is_string($contract_json) || '' === $contract_json || ! is_array($contract)) {
        throw new \GraphQL\Error\UserError('The Malaysia Application Hub record has no approved contract payload.');
    }
    return wp_json_encode([
        'id' => 'application-hub-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/applications'],
        'malaysiaApplicationHubContractJson' => $contract_json,
        'routeReadiness' => tio2_my_application_hub_route_readiness($contract),
    ]);
}

function tio2_register_application_hub_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaApplicationHubRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_application_hub_record_json',
        'description' => 'Approved, scope-bound APP-000 record and route readiness for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_application_hub_v01_content_type');
add_action('graphql_register_types', 'tio2_register_application_hub_v01_graphql_field');

