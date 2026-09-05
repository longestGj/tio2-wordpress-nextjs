<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META = '_tio2_my_resource_origin_contract_json';
const TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META = '_tio2_my_resource_origin_relations_json';

function tio2_my_resource_origin_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-resource-origin.json';
}

/** @return string|WP_Error */
function tio2_my_resource_origin_approved_contract_json()
{
    $path = tio2_my_resource_origin_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json || ! is_array(json_decode($json, true))) {
        return new WP_Error(
            'tio2_my_resource_origin_contract_missing',
            'The approved RES-ORIGIN contract is unavailable.'
        );
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_resource_origin_v01_contract(int $post_id)
{
    if ('tio2_document' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_resource_origin_invalid_type', 'The RES-ORIGIN record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error(
            'tio2_my_resource_origin_invalid_scope',
            'The RES-ORIGIN contract is valid only for site_scope=tio2-my.'
        );
    }
    if (
        'non-china-titanium-dioxide' !== get_post_field('post_name', $post_id) ||
        '/resources/non-china-titanium-dioxide/' !== get_post_meta($post_id, 'public_path', true) ||
        'RES-ORIGIN' !== get_post_meta($post_id, 'resource_id', true)
    ) {
        return new WP_Error('tio2_my_resource_origin_invalid_route', 'The RES-ORIGIN route identity is invalid.');
    }

    $approved = tio2_my_resource_origin_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_resource_origin_contract_mismatch',
            'The stored RES-ORIGIN payload does not match the approved contract.'
        );
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'RES-ORIGIN' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        'en' !== ($contract['identity']['locale'] ?? null) ||
        '/resources/non-china-titanium-dioxide/' !== ($contract['identity']['path'] ?? null) ||
        13 !== count($contract['moduleOrder'] ?? []) ||
        6 !== count($contract['hero']['qualificationPath'] ?? []) ||
        6 !== count($contract['dueDiligence']['checks'] ?? []) ||
        5 !== count($contract['technicalComparison']['steps'] ?? []) ||
        5 !== count($contract['applicationContext']['routes'] ?? []) ||
        8 !== count($contract['documentScope']['checklist'] ?? []) ||
        4 !== count($contract['destinationReview']['destinations'] ?? []) ||
        3 !== count($contract['qualificationDecision']['items'] ?? []) ||
        9 !== count($contract['buyerQuestions']['items'] ?? [])
    ) {
        return new WP_Error(
            'tio2_my_resource_origin_contract_incomplete',
            'The RES-ORIGIN payload is incomplete or has invalid cardinality.'
        );
    }
    foreach ($contract['buyerQuestions']['items'] as $item) {
        if (
            ! is_array($item) ||
            ! is_string($item['question'] ?? null) || '' === trim($item['question']) ||
            ! is_string($item['answer'] ?? null) || '' === trim($item['answer'])
        ) {
            return new WP_Error(
                'tio2_my_resource_origin_faq_incomplete',
                'The RES-ORIGIN payload is incomplete or has invalid cardinality.'
            );
        }
    }
    $relations_json = get_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META, true);
    $relations = is_string($relations_json) ? json_decode($relations_json, true) : null;
    if (! is_array($relations)) {
        return new WP_Error(
            'tio2_my_resource_origin_relations_invalid',
            'The RES-ORIGIN relation storage is invalid.'
        );
    }
    return true;
}

/** @return array{relationKey: string, targetPageId: string, href: string, displayOrder: int}|null */
function tio2_my_resource_origin_public_relation(array $relation, array $approved): ?array
{
    if (
        'RES-ORIGIN' !== ($relation['sourcePageId'] ?? null) ||
        'tio2-my' !== ($relation['sourceSiteScope'] ?? null) ||
        'tio2-my' !== ($relation['targetSiteScope'] ?? null) ||
        'APPROVED' !== ($relation['contentStatus'] ?? null) ||
        'VERIFIED_PUBLIC' !== ($relation['routeStatus'] ?? null) ||
        'VERIFIED' !== ($relation['canonicalStatus'] ?? null) ||
        'ELIGIBLE' !== ($relation['publicEligibilityStatus'] ?? null)
    ) return null;
    $relation_key = $relation['relationKey'] ?? null;
    $target_page_id = $relation['targetPageId'] ?? null;
    $target_path = $relation['targetPath'] ?? null;
    $href = $relation['href'] ?? null;
    $display_order = $relation['displayOrder'] ?? null;
    if (
        ! is_string($relation_key) || '' === $relation_key ||
        ! is_string($target_page_id) || '' === $target_page_id ||
        ! is_string($target_path) || ! str_starts_with($target_path, '/') ||
        ! is_string($href) || ! str_starts_with($href, '/') ||
        ! is_int($display_order) || $display_order < 0
    ) return null;
    if (
        $target_page_id !== ($approved['targetPageId'] ?? null) ||
        $target_path !== ($approved['targetPath'] ?? null) ||
        $href !== ($approved['href'] ?? null) ||
        $display_order !== ($approved['displayOrder'] ?? null)
    ) return null;
    $parts = wp_parse_url($href);
    if (
        ! is_array($parts) || isset($parts['scheme']) || isset($parts['host']) || isset($parts['fragment']) ||
        $target_path !== ($parts['path'] ?? null)
    ) return null;
    $query = $parts['query'] ?? '';
    if (
        ('rfq_secondary' === $relation_key && 'source_page=RES-ORIGIN&interest=alternative-origin-sourcing' !== $query) ||
        ('rfq_secondary' !== $relation_key && '' !== $query)
    ) return null;
    return [
        'relationKey' => $relation_key,
        'targetPageId' => $target_page_id,
        'href' => $href,
        'displayOrder' => $display_order,
    ];
}

/** @return array<string, mixed> */
function tio2_my_resource_origin_public_projection(array $contract, array $relations): array
{
    $approved_by_key = [];
    foreach (($contract['relations'] ?? []) as $approved) {
        if (is_array($approved) && is_string($approved['relationKey'] ?? null)) {
            $approved_by_key[$approved['relationKey']] = $approved;
        }
    }
    unset($contract['internal'], $contract['releaseControls'], $contract['relations']);
    if (is_array($contract['seo'] ?? null)) unset($contract['seo']['primaryKeyword']);
    $eligible = [];
    $seen = [];
    foreach ($relations as $relation) {
        if (! is_array($relation)) continue;
        $relation_key = $relation['relationKey'] ?? null;
        $approved = is_string($relation_key) ? ($approved_by_key[$relation_key] ?? null) : null;
        $public = is_array($approved) ? tio2_my_resource_origin_public_relation($relation, $approved) : null;
        if (null === $public) continue;
        if (isset($seen[$public['relationKey']])) {
            throw new \GraphQL\Error\UserError('The RES-ORIGIN relation projection is ambiguous.');
        }
        $seen[$public['relationKey']] = true;
        $eligible[] = $public;
    }
    usort($eligible, static function (array $left, array $right): int {
        return ($left['displayOrder'] <=> $right['displayOrder']) ?:
            strcmp((string) $left['relationKey'], (string) $right['relationKey']);
    });
    $contract['eligibleRelations'] = $eligible;
    $contract['schemaMode'] = 'BREADCRUMB_ONLY';
    return $contract;
}

function tio2_resolve_malaysia_resource_origin_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_document',
        'post_status' => 'publish',
        'name' => 'non-china-titanium-dioxide',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => ['tio2-my'],
            'operator' => 'AND',
            'include_children' => false,
        ]],
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The Malaysia RES-ORIGIN record is missing.'
                : 'Multiple Malaysia RES-ORIGIN records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_resource_origin_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError('The Malaysia RES-ORIGIN record failed scope or contract validation.');
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_array($contract)) {
        throw new \GraphQL\Error\UserError('The Malaysia RES-ORIGIN record has no approved contract payload.');
    }
    $relations_json = get_post_meta($post_id, TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META, true);
    $relations = is_string($relations_json) ? json_decode($relations_json, true) : null;
    if (! is_array($relations)) {
        throw new \GraphQL\Error\UserError('The Malaysia RES-ORIGIN relation storage is invalid.');
    }
    return wp_json_encode([
        'id' => 'resource-origin-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/resources/non-china-titanium-dioxide/'],
        'resourceOriginPayload' => tio2_my_resource_origin_public_projection($contract, $relations),
    ]);
}

function tio2_register_resource_origin_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaResourceOriginRecordJson', [
        'type' => ['non_null' => 'String'],
        'description' => 'Exact-scope TiO2 Malaysia RES-ORIGIN record.',
        'resolve' => static fn (): string => tio2_resolve_malaysia_resource_origin_record_json(),
    ]);
}

add_action('graphql_register_types', 'tio2_register_resource_origin_v01_graphql_field');
