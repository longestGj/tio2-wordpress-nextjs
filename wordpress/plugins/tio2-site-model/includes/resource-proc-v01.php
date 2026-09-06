<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_RESOURCE_PROC_CONTRACT_META = '_tio2_my_resource_proc_contract_json';
const TIO2_MY_RESOURCE_PROC_RELATIONS_META = '_tio2_my_resource_proc_relations_json';
const TIO2_MY_RESOURCE_PROC_SOURCES_META = '_tio2_my_resource_proc_sources_json';
const TIO2_MY_RESOURCE_PROC_ARTICLE_METADATA_META = '_tio2_my_resource_proc_article_metadata_json';

function tio2_my_resource_proc_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-resource-proc.json';
}

/** @return string|WP_Error */
function tio2_my_resource_proc_approved_contract_json()
{
    $path = tio2_my_resource_proc_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json || ! is_array(json_decode($json, true))) {
        return new WP_Error('tio2_my_resource_proc_contract_missing', 'The approved RES-PROC contract is unavailable.');
    }
    return $json;
}

/** @return true|WP_Error */
function tio2_validate_resource_proc_v01_contract(int $post_id)
{
    if ('tio2_document' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_resource_proc_invalid_type', 'The RES-PROC record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error('tio2_my_resource_proc_invalid_scope', 'The RES-PROC contract is valid only for site_scope=tio2-my.');
    }
    if (
        'chloride-vs-sulfate-titanium-dioxide' !== get_post_field('post_name', $post_id) ||
        '/resources/chloride-vs-sulfate-titanium-dioxide/' !== get_post_meta($post_id, 'public_path', true) ||
        'RES-PROC' !== get_post_meta($post_id, 'resource_id', true)
    ) {
        return new WP_Error('tio2_my_resource_proc_invalid_route', 'The RES-PROC route identity is invalid.');
    }
    $approved = tio2_my_resource_proc_approved_contract_json();
    if (is_wp_error($approved)) return $approved;
    $stored = get_post_meta($post_id, TIO2_MY_RESOURCE_PROC_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error('tio2_my_resource_proc_contract_mismatch', 'The stored RES-PROC payload does not match the approved contract.');
    }
    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        'RES-PROC' !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        'en' !== ($contract['identity']['locale'] ?? null) ||
        '/resources/chloride-vs-sulfate-titanium-dioxide/' !== ($contract['identity']['path'] ?? null) ||
        14 !== count($contract['moduleOrder'] ?? []) ||
        2 !== count($contract['routeDifference']['routeCards'] ?? []) ||
        4 !== count($contract['labelLimit']['canIndicate'] ?? []) ||
        6 !== count($contract['labelLimit']['cannotEstablish'] ?? []) ||
        6 !== count($contract['gradeEvidence']['rows'] ?? []) ||
        3 !== count($contract['applicationOverlap']['evidenceItems'] ?? []) ||
        5 !== count($contract['qualificationWorkflow']['steps'] ?? []) ||
        3 !== count($contract['qualificationWorkflow']['outcomes'] ?? []) ||
        4 !== count($contract['buyerQuestions']['items'] ?? []) ||
        6 !== count($contract['sources']['groups'] ?? []) ||
        7 !== count($contract['externalSources'] ?? []) ||
        2 !== count($contract['finalAction']['processActions'] ?? [])
    ) {
        return new WP_Error('tio2_my_resource_proc_contract_incomplete', 'The RES-PROC payload is incomplete or has invalid cardinality.');
    }
    foreach ($contract['buyerQuestions']['items'] as $item) {
        if (! is_array($item) || ! is_string($item['question'] ?? null) || '' === trim($item['question']) || ! is_string($item['answer'] ?? null) || '' === trim($item['answer'])) {
            return new WP_Error('tio2_my_resource_proc_questions_incomplete', 'The RES-PROC payload is incomplete or has invalid cardinality.');
        }
    }
    foreach ([TIO2_MY_RESOURCE_PROC_RELATIONS_META, TIO2_MY_RESOURCE_PROC_SOURCES_META] as $meta_key) {
        $json = get_post_meta($post_id, $meta_key, true);
        if (! is_string($json) || ! is_array(json_decode($json, true))) {
            return new WP_Error('tio2_my_resource_proc_projection_invalid', 'The RES-PROC relation or source storage is invalid.');
        }
    }
    return true;
}

/** @return array{relationKey:string,targetPageId:string,href:string,displayOrder:int}|null */
function tio2_my_resource_proc_public_relation(array $relation, array $approved): ?array
{
    if (
        'RES-PROC' !== ($relation['sourcePageId'] ?? null) ||
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
    if (! is_string($relation_key) || ! is_string($target_page_id) || ! is_string($target_path) || ! is_string($href) || ! is_int($display_order) || $display_order < 0) return null;
    if ($target_page_id !== ($approved['targetPageId'] ?? null) || $target_path !== ($approved['targetPath'] ?? null) || $href !== ($approved['href'] ?? null) || $display_order !== ($approved['displayOrder'] ?? null)) return null;
    $parts = wp_parse_url($href);
    if (! is_array($parts) || isset($parts['scheme']) || isset($parts['host']) || isset($parts['query']) || isset($parts['fragment']) || $target_path !== ($parts['path'] ?? null)) return null;
    return ['relationKey' => $relation_key, 'targetPageId' => $target_page_id, 'href' => $href, 'displayOrder' => $display_order];
}

function tio2_my_resource_proc_valid_article_text($value): bool
{
    return is_string($value) && '' !== $value && trim($value) === $value;
}

function tio2_my_resource_proc_valid_article_date($value): bool
{
    if (! is_string($value) || 1 !== preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $parts)) return false;
    return checkdate((int) $parts[2], (int) $parts[3], (int) $parts[1]);
}

/** @return array<string,string>|null */
function tio2_my_resource_proc_public_article_metadata(?array $metadata): ?array
{
    if (null === $metadata || 'APPROVED' !== ($metadata['contentStatus'] ?? null) || 'VISIBLE' !== ($metadata['publicVisibilityStatus'] ?? null)) return null;
    foreach (['authorName', 'publisherName', 'publisherLogoAssetKey', 'maintenanceOwner'] as $key) {
        if (! tio2_my_resource_proc_valid_article_text($metadata[$key] ?? null)) return null;
    }
    foreach (['datePublished', 'dateModified', 'lastReviewedAt'] as $key) {
        if (! tio2_my_resource_proc_valid_article_date($metadata[$key] ?? null)) return null;
    }
    if ('/tio2-my/brand/tio2-malaysia-primary-horizontal-v0.1.svg' !== $metadata['publisherLogoAssetKey']) return null;
    return [
        'authorName' => $metadata['authorName'],
        'publisherName' => $metadata['publisherName'],
        'publisherLogoAssetKey' => $metadata['publisherLogoAssetKey'],
        'datePublished' => $metadata['datePublished'],
        'dateModified' => $metadata['dateModified'],
        'lastReviewedAt' => $metadata['lastReviewedAt'],
        'maintenanceOwner' => $metadata['maintenanceOwner'],
    ];
}

/** @return array<string,mixed> */
function tio2_my_resource_proc_public_projection(array $contract, array $relations, array $source_records, ?array $article_metadata = null): array
{
    $approved_relations = [];
    foreach (($contract['relations'] ?? []) as $approved) {
        if (is_array($approved) && is_string($approved['relationKey'] ?? null)) $approved_relations[$approved['relationKey']] = $approved;
    }
    $eligible = [];
    $seen = [];
    foreach ($relations as $relation) {
        if (! is_array($relation)) continue;
        $key = $relation['relationKey'] ?? null;
        $public = is_string($key) && isset($approved_relations[$key]) ? tio2_my_resource_proc_public_relation($relation, $approved_relations[$key]) : null;
        if (null === $public) continue;
        if (isset($seen[$public['relationKey']])) throw new \GraphQL\Error\UserError('The RES-PROC relation projection is ambiguous.');
        $seen[$public['relationKey']] = true;
        $eligible[] = $public;
    }
    $process_ready = isset($seen['chloride_process'], $seen['sulfate_process']);
    $eligible = array_values(array_filter($eligible, static fn (array $relation): bool => $process_ready || ! in_array($relation['relationKey'], ['chloride_process', 'sulfate_process'], true)));
    usort($eligible, static fn (array $left, array $right): int => ($left['displayOrder'] <=> $right['displayOrder']) ?: strcmp($left['relationKey'], $right['relationKey']));

    $approved_sources = [];
    foreach (($contract['externalSources'] ?? []) as $source) {
        if (is_array($source) && is_string($source['sourceKey'] ?? null)) $approved_sources[$source['sourceKey']] = $source;
    }
    $application_keys = ['lb_blr886', 'lb_lr108', 'tronox_portfolio'];
    $available = [];
    $external = [];
    $seen_sources = [];
    foreach ($source_records as $source) {
        if (! is_array($source) || ! is_string($source['sourceKey'] ?? null) || ! isset($approved_sources[$source['sourceKey']])) continue;
        $key = $source['sourceKey'];
        if (isset($seen_sources[$key])) throw new \GraphQL\Error\UserError('The RES-PROC source projection is ambiguous.');
        $seen_sources[$key] = true;
        $status = $source['evidenceStatus'] ?? null;
        $comparable = $source;
        $comparable['evidenceStatus'] = 'APPROVED';
        if ($comparable !== $approved_sources[$key] || ! in_array($status, ['APPROVED', 'REVOKED'], true) || ('REVOKED' === $status && ! in_array($key, $application_keys, true))) {
            throw new \GraphQL\Error\UserError('The RES-PROC source projection is invalid.');
        }
        if ('APPROVED' !== $status) continue;
        unset($source['evidenceStatus']);
        $available[$key] = true;
        $external[] = $source;
    }
    foreach ($approved_sources as $key => $_approved) {
        if (! array_key_exists($key, array_column($source_records, null, 'sourceKey'))) throw new \GraphQL\Error\UserError('The RES-PROC source projection is incomplete.');
    }
    $groups = array_values(array_filter($contract['sources']['groups'], static function (array $group) use ($available): bool {
        foreach (($group['sourceKeys'] ?? []) as $key) if (! isset($available[$key])) return false;
        return true;
    }));
    $application_ready = ! array_diff($application_keys, array_keys($available));
    if ($application_ready) {
        $contract['applicationOverlap']['evidenceAvailable'] = true;
    } else {
        $contract['applicationOverlap'] = [
            'eyebrow' => $contract['applicationOverlap']['eyebrow'],
            'heading' => $contract['applicationOverlap']['heading'],
            'evidenceAvailable' => false,
        ];
    }
    $contract['sources']['groups'] = $groups;
    $contract['externalSources'] = $external;
    unset($contract['internal'], $contract['releaseControls'], $contract['relations']);
    unset($contract['seo']['primaryKeyword']);
    $metadata = tio2_my_resource_proc_public_article_metadata($article_metadata);
    $contract['articleMetadata'] = $metadata;
    $contract['eligibleRelations'] = $eligible;
    $contract['schemaMode'] = null === $metadata ? 'BREADCRUMB_ONLY' : 'ARTICLE_WITH_BREADCRUMB';
    return $contract;
}

function tio2_resolve_malaysia_resource_proc_record_json(): string
{
    $ids = get_posts([
        'post_type' => 'tio2_document',
        'post_status' => 'publish',
        'name' => 'chloride-vs-sulfate-titanium-dioxide',
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
    if (1 !== count($ids)) throw new \GraphQL\Error\UserError(0 === count($ids) ? 'The Malaysia RES-PROC record is missing.' : 'Multiple Malaysia RES-PROC records were found.');
    $post_id = (int) $ids[0];
    if (is_wp_error(tio2_validate_resource_proc_v01_contract($post_id))) throw new \GraphQL\Error\UserError('The Malaysia RES-PROC record failed scope or contract validation.');
    $contract = json_decode((string) get_post_meta($post_id, TIO2_MY_RESOURCE_PROC_CONTRACT_META, true), true);
    $relations = json_decode((string) get_post_meta($post_id, TIO2_MY_RESOURCE_PROC_RELATIONS_META, true), true);
    $sources = json_decode((string) get_post_meta($post_id, TIO2_MY_RESOURCE_PROC_SOURCES_META, true), true);
    if (! is_array($contract) || ! is_array($relations) || ! is_array($sources)) throw new \GraphQL\Error\UserError('The Malaysia RES-PROC projection storage is invalid.');
    $article_json = get_post_meta($post_id, TIO2_MY_RESOURCE_PROC_ARTICLE_METADATA_META, true);
    $article = is_string($article_json) && '' !== $article_json ? json_decode($article_json, true) : null;
    return wp_json_encode([
        'id' => 'resource-proc-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => '/resources/chloride-vs-sulfate-titanium-dioxide/'],
        'resourceProcPayload' => tio2_my_resource_proc_public_projection($contract, $relations, $sources, is_array($article) ? $article : null),
    ]);
}

function tio2_register_resource_proc_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaResourceProcRecordJson', [
        'type' => ['non_null' => 'String'],
        'description' => 'Exact-scope TiO2 Malaysia RES-PROC record.',
        'resolve' => static fn (): string => tio2_resolve_malaysia_resource_proc_record_json(),
    ]);
}

add_action('graphql_register_types', 'tio2_register_resource_proc_v01_graphql_field');
