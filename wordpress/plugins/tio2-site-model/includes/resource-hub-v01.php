<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_RESOURCE_HUB_CONTRACT_META = '_tio2_my_resource_hub_contract_json';
const TIO2_MY_RESOURCE_HUB_RELATIONS_META = '_tio2_my_resource_hub_relations_json';

function tio2_register_resource_hub_v01_content_type(): void
{
    register_post_type('tio2_resource_hub', [
        'labels' => [
            'name' => 'TiO2 Resource Hubs',
            'singular_name' => 'TiO2 Resource Hub',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => false,
        'show_in_graphql' => false,
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);
    register_taxonomy_for_object_type('site_scope', 'tio2_resource_hub');
}

function tio2_my_resource_hub_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-resource-hub.json';
}

/** @return string|WP_Error */
function tio2_my_resource_hub_approved_contract_json()
{
    $path = tio2_my_resource_hub_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error(
            'tio2_my_resource_hub_contract_missing',
            'The approved Malaysia Resources Hub contract is unavailable.'
        );
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_resource_hub_v01_contract(int $post_id)
{
    if ('tio2_resource_hub' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_resource_hub_invalid_type', 'The Resources Hub record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error(
            'tio2_my_resource_hub_invalid_scope',
            'The Resources Hub contract is valid only for site_scope=tio2-my.'
        );
    }
    if (
        '/resources' !== get_post_meta($post_id, 'public_path', true) ||
        'tio2-my-resources' !== get_post_field('post_name', $post_id)
    ) {
        return new WP_Error('tio2_my_resource_hub_invalid_route', 'The Resources Hub route identity is invalid.');
    }

    $approved = tio2_my_resource_hub_approved_contract_json();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, TIO2_MY_RESOURCE_HUB_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_resource_hub_contract_mismatch',
            'The stored Malaysia Resources Hub payload does not match the approved contract.'
        );
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'RES-000-G7-HANDOFF-01' !== ($contract['packageId'] ?? null) ||
        'RES-000-G7-PCR-01' !== ($contract['reviewId'] ?? null) ||
        'RES-000' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        '/resources/' !== ($contract['identity']['path'] ?? null) ||
        'resource-hub-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null) ||
        [] !== ($contract['resourceRelations'] ?? null)
    ) {
        return new WP_Error('tio2_my_resource_hub_contract_invalid', 'The Resources Hub payload identity or H0 projection is invalid.');
    }
    $relations_json = get_post_meta($post_id, TIO2_MY_RESOURCE_HUB_RELATIONS_META, true);
    $relations = is_string($relations_json) ? json_decode($relations_json, true) : null;
    if (! is_string($relations_json) || ! is_array($relations)) {
        return new WP_Error('tio2_my_resource_hub_relations_invalid', 'The Resources Hub relation storage is invalid.');
    }
    return true;
}

/** @return array<string, mixed>|null */
function tio2_my_resource_public_card(array $relation): ?array
{
    $kind = $relation['kind'] ?? null;
    if (
        'tio2-my' !== ($relation['siteScope'] ?? null) ||
        'en' !== ($relation['locale'] ?? null) ||
        'PUBLIC_ELIGIBLE' !== ($relation['mappingStatus'] ?? null) ||
        'APPROVED' !== ($relation['childContentStatus'] ?? null) ||
        'APPROVED' !== ($relation['claimStatus'] ?? null) ||
        'VERIFIED_PUBLIC' !== ($relation['routeStatus'] ?? null) ||
        'VERIFIED' !== ($relation['canonicalStatus'] ?? null) ||
        'LIVE_APPROVED' !== ($relation['releaseState'] ?? null) ||
        ! in_array($kind, ['general', 'trade'], true)
    ) {
        return null;
    }
    foreach (['pageId', 'title', 'summary', 'canonicalPath', 'canonicalUrl'] as $field) {
        if (! is_string($relation[$field] ?? null) || '' === trim($relation[$field])) return null;
    }
    $path = (string) $relation['canonicalPath'];
    if (! str_starts_with($path, '/resources/') || ! tio2_my_product_target_ready((string) $relation['pageId'], $path)) {
        return null;
    }
    $public_path = untrailingslashit($path);
    if (tio2_my_product_target_canonical($public_path) !== $relation['canonicalUrl']) return null;

    $card = [
        'pageId' => (string) $relation['pageId'],
        'title' => (string) $relation['title'],
        'summary' => (string) $relation['summary'],
        'href' => $path,
        'kind' => $kind,
    ];
    if ('trade' === $kind) {
        if (
            'CURRENT_APPROVED' !== ($relation['freshnessStatus'] ?? null) ||
            'VERIFIED' !== ($relation['officialSourceStatus'] ?? null) ||
            'APPROVED' !== ($relation['applicableScopeStatus'] ?? null)
        ) return null;
        foreach (['officialSource', 'applicableScope', 'sourceDate', 'reviewDate'] as $field) {
            if (! is_string($relation[$field] ?? null) || '' === trim($relation[$field])) return null;
        }
        $card['trade'] = [
            'officialSource' => (string) $relation['officialSource'],
            'applicableScope' => (string) $relation['applicableScope'],
            'sourceDate' => (string) $relation['sourceDate'],
            'reviewDate' => (string) $relation['reviewDate'],
        ];
    }
    return $card;
}

/** @return array{publicState: string, featuredResources: array<int, array<string, mixed>>, latestResources: array<int, array<string, mixed>>} */
function tio2_my_resource_public_projection(array $relations): array
{
    $eligible = [];
    $seen = [];
    foreach ($relations as $relation) {
        if (! is_array($relation)) continue;
        $card = tio2_my_resource_public_card($relation);
        if (null === $card) continue;
        $page_id = (string) $card['pageId'];
        if (isset($seen[$page_id])) {
            throw new \GraphQL\Error\UserError('The Malaysia Resources Hub relation projection is ambiguous.');
        }
        $seen[$page_id] = true;
        $rank = $relation['featuredRank'] ?? null;
        $order = $relation['displayOrder'] ?? null;
        if ((null !== $rank && (! is_int($rank) || $rank < 1 || $rank > 3)) || ! is_int($order) || $order < 0) continue;
        $eligible[] = ['card' => $card, 'rank' => $rank ?? PHP_INT_MAX, 'order' => $order];
    }
    usort($eligible, static function (array $left, array $right): int {
        return ($left['rank'] <=> $right['rank']) ?: ($left['order'] <=> $right['order']) ?:
            strcmp((string) $left['card']['pageId'], (string) $right['card']['pageId']);
    });
    $cards = array_values(array_map(static fn (array $item): array => $item['card'], $eligible));
    $featured = array_slice($cards, 0, 3);
    $latest = array_slice($cards, 3);
    $has_trade = [] !== array_filter($cards, static fn (array $card): bool => 'trade' === $card['kind']);
    $state = [] === $cards
        ? 'H0_NO_QUALIFIED_RESOURCE'
        : ($has_trade ? 'H4_TRADE_ITEM' : (1 === count($cards) ? 'H2_ONE_PUBLIC_RESOURCE' : 'H3_MULTIPLE_PUBLIC_RESOURCES'));
    return ['publicState' => $state, 'featuredResources' => $featured, 'latestResources' => $latest];
}

function tio2_resolve_malaysia_resource_hub_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_resource_hub',
        'post_status' => 'publish',
        'name' => 'tio2-my-resources',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The Malaysia Resources Hub record is missing.'
                : 'Multiple Malaysia Resources Hub records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_resource_hub_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Resources Hub record failed scope or contract validation.'
        );
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_RESOURCE_HUB_CONTRACT_META, true);
    if (! is_string($contract_json) || '' === $contract_json) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Resources Hub record has no approved contract payload.'
        );
    }
    $relations_json = get_post_meta($post_id, TIO2_MY_RESOURCE_HUB_RELATIONS_META, true);
    $relations = is_string($relations_json) ? json_decode($relations_json, true) : null;
    if (! is_array($relations)) {
        throw new \GraphQL\Error\UserError('The Malaysia Resources Hub relation storage is invalid.');
    }
    return wp_json_encode([
        'id' => 'resource-hub-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/resources'],
        'malaysiaResourceHubContractJson' => $contract_json,
        'resourceProjection' => tio2_my_resource_public_projection($relations),
    ]);
}

function tio2_register_resource_hub_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaResourceHubRecordJson', [
        'type' => ['non_null' => 'String'],
        'resolve' => 'tio2_resolve_malaysia_resource_hub_record_json',
        'description' => 'Approved, scope-bound RES-000 record and public H0 projection for TiO2 Malaysia.',
    ]);
}

add_action('init', 'tio2_register_resource_hub_v01_content_type');
add_action('graphql_register_types', 'tio2_register_resource_hub_v01_graphql_field');
