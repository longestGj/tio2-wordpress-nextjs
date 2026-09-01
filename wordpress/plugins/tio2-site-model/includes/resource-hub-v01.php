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

function tio2_my_resource_page_registry_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-resource-page-registry.json';
}

/** @return array<string, array<string, mixed>> */
function tio2_my_resource_page_registry(): array
{
    static $by_page_id = null;
    if (is_array($by_page_id)) return $by_page_id;
    $json = file_get_contents(tio2_my_resource_page_registry_path());
    $registry = is_string($json) ? json_decode($json, true) : null;
    if (
        ! is_array($registry) ||
        'tio2-my-resource-page-registry-v0.1' !== ($registry['schemaVersion'] ?? null) ||
        ! is_array($registry['entries'] ?? null)
    ) {
        throw new \GraphQL\Error\UserError('The controlled Malaysia Resource Page Registry is unavailable.');
    }
    $by_page_id = [];
    foreach ($registry['entries'] as $entry) {
        if (
            ! is_array($entry) ||
            ! is_string($entry['pageId'] ?? null) ||
            ! is_string($entry['canonicalPath'] ?? null) ||
            ! is_string($entry['mappingStatus'] ?? null) ||
            ! is_bool($entry['publicMappingAllowed'] ?? null) ||
            isset($by_page_id[$entry['pageId']])
        ) {
            throw new \GraphQL\Error\UserError('The controlled Malaysia Resource Page Registry is invalid.');
        }
        $by_page_id[$entry['pageId']] = $entry;
    }
    return $by_page_id;
}

function tio2_my_resource_mapping_allows_public(
    string $page_id,
    string $mapping_status,
    string $canonical_path
): bool {
    $entry = tio2_my_resource_page_registry()[$page_id] ?? null;
    return is_array($entry) &&
        true === $entry['publicMappingAllowed'] &&
        $mapping_status === $entry['mappingStatus'] &&
        $canonical_path === $entry['canonicalPath'];
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

function tio2_my_resource_nonempty_text($value): ?string
{
    return is_string($value) && '' !== $value && trim($value) === $value ? $value : null;
}

function tio2_my_resource_iso_date($value): ?string
{
    if (! is_string($value) || 1 !== preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) return null;
    $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = \DateTimeImmutable::getLastErrors();
    return false !== $date && (false === $errors || (0 === $errors['warning_count'] && 0 === $errors['error_count'])) &&
        $date->format('Y-m-d') === $value ? $value : null;
}

function tio2_my_resource_https_url($value): ?string
{
    if (! is_string($value) || trim($value) !== $value || false === filter_var($value, FILTER_VALIDATE_URL)) return null;
    $parts = wp_parse_url($value);
    return is_array($parts) && 'https' === ($parts['scheme'] ?? null) &&
        is_string($parts['host'] ?? null) && '' !== $parts['host'] &&
        ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['fragment'])
        ? $value
        : null;
}

/**
 * @param callable(string, string, string): bool|null $mapping_allows_public
 * @param callable(string, string): bool|null $target_is_ready
 * @return array<string, mixed>|null
 */
function tio2_my_resource_public_card(
    array $relation,
    ?callable $mapping_allows_public = null,
    ?callable $target_is_ready = null
): ?array {
    $page_id = tio2_my_resource_nonempty_text($relation['pageId'] ?? null);
    $mapping_status = tio2_my_resource_nonempty_text($relation['mappingStatus'] ?? null);
    $canonical_path = tio2_my_resource_nonempty_text($relation['canonicalPath'] ?? null);
    $resource_type = $relation['resourceType'] ?? null;
    if (
        null === $page_id || null === $mapping_status || null === $canonical_path ||
        ! in_array($resource_type, ['PROCUREMENT_GUIDE', 'TECHNICAL_GUIDE', 'TRADE_UPDATE'], true)
    ) return null;
    $mapping_allows_public = $mapping_allows_public ?? 'tio2_my_resource_mapping_allows_public';
    $target_is_ready = $target_is_ready ?? 'tio2_my_product_target_ready';
    if (
        'tio2-my' !== ($relation['siteScope'] ?? null) ||
        'en' !== ($relation['locale'] ?? null) ||
        ! $mapping_allows_public($page_id, $mapping_status, $canonical_path) ||
        'APPROVED' !== ($relation['childContentStatus'] ?? null) ||
        'APPROVED' !== ($relation['claimStatus'] ?? null) ||
        'ELIGIBLE' !== ($relation['publicEligibilityStatus'] ?? null) ||
        'VERIFIED_PUBLIC' !== ($relation['routeStatus'] ?? null) ||
        'VERIFIED' !== ($relation['canonicalStatus'] ?? null) ||
        ! $target_is_ready($page_id, $canonical_path)
    ) {
        return null;
    }
    $title = tio2_my_resource_nonempty_text($relation['title'] ?? null);
    $summary = tio2_my_resource_nonempty_text($relation['summary'] ?? null);
    $canonical_url = tio2_my_resource_nonempty_text($relation['canonicalUrl'] ?? null);
    $last_reviewed_at = tio2_my_resource_iso_date($relation['lastReviewedAt'] ?? null);
    $cta_label = tio2_my_resource_nonempty_text($relation['ctaLabel'] ?? null);
    $source_owner = tio2_my_resource_nonempty_text($relation['sourceOwner'] ?? null);
    $record_review_date = tio2_my_resource_iso_date($relation['recordReviewDate'] ?? null);
    if (
        null === $title || null === $summary || null === $canonical_url || null === $last_reviewed_at ||
        null === $cta_label || null === $source_owner || null === $record_review_date ||
        1 !== preg_match('#^/resources/[a-z0-9]+(?:-[a-z0-9]+)*/$#D', $canonical_path) ||
        'https://tio2malaysia.com' . $canonical_path !== $canonical_url
    ) return null;

    $card = [
        'pageId' => $page_id,
        'title' => $title,
        'summary' => $summary,
        'href' => $canonical_path,
        'resourceType' => $resource_type,
        'ctaLabel' => $cta_label,
        'lastReviewedAt' => $last_reviewed_at,
    ];
    $context_label = tio2_my_resource_nonempty_text($relation['contextLabel'] ?? null);
    if (null !== $context_label) $card['contextLabel'] = $context_label;
    if (array_key_exists('publishedAt', $relation) && null !== $relation['publishedAt']) {
        $published_at = tio2_my_resource_iso_date($relation['publishedAt']);
        if (null === $published_at) return null;
        $card['publishedAt'] = $published_at;
    }
    if ('TRADE_UPDATE' === $resource_type) {
        $official_source_name = tio2_my_resource_nonempty_text($relation['officialSourceName'] ?? null);
        $official_source_url = tio2_my_resource_https_url($relation['officialSourceUrl'] ?? null);
        $applicable_scope = tio2_my_resource_nonempty_text($relation['applicableScope'] ?? null);
        $source_date = tio2_my_resource_iso_date($relation['sourceDate'] ?? null);
        $review_date = tio2_my_resource_iso_date($relation['reviewDate'] ?? null);
        $public_status_label = tio2_my_resource_nonempty_text($relation['publicStatusLabel'] ?? null);
        $freshness_owner = tio2_my_resource_nonempty_text($relation['freshnessOwner'] ?? null);
        $next_review_due = tio2_my_resource_iso_date($relation['nextReviewDue'] ?? null);
        $event_review_trigger = tio2_my_resource_nonempty_text($relation['eventReviewTrigger'] ?? null);
        if (
            'CURRENT_APPROVED' !== ($relation['freshnessStatus'] ?? null) ||
            null === $official_source_name || null === $official_source_url || null === $applicable_scope ||
            null === $source_date || null === $review_date || null === $public_status_label ||
            null === $freshness_owner || null === $next_review_due || null === $event_review_trigger
        ) return null;
        $card['trade'] = [
            'officialSourceName' => $official_source_name,
            'officialSourceUrl' => $official_source_url,
            'applicableScope' => $applicable_scope,
            'sourceDate' => $source_date,
            'reviewDate' => $review_date,
            'publicStatusLabel' => $public_status_label,
        ];
    }
    return $card;
}

/**
 * @param callable(string, string, string): bool|null $mapping_allows_public
 * @param callable(string, string): bool|null $target_is_ready
 * @return array{publicState: string, featuredResources: array<int, array<string, mixed>>, latestResources: array<int, array<string, mixed>>}
 */
function tio2_my_resource_public_projection(
    array $relations,
    ?callable $mapping_allows_public = null,
    ?callable $target_is_ready = null
): array
{
    $eligible = [];
    $seen = [];
    foreach ($relations as $relation) {
        if (! is_array($relation)) continue;
        $card = tio2_my_resource_public_card($relation, $mapping_allows_public, $target_is_ready);
        if (null === $card) continue;
        $page_id = (string) $card['pageId'];
        if (isset($seen[$page_id])) {
            throw new \GraphQL\Error\UserError('The Malaysia Resources Hub relation projection is ambiguous.');
        }
        $seen[$page_id] = true;
        $rank = $relation['featuredRank'] ?? null;
        $order = $relation['displayOrder'] ?? null;
        if ((null !== $rank && (! is_int($rank) || $rank < 1 || $rank > 3)) || ! is_int($order) || $order < 0) continue;
        $eligible[] = ['card' => $card, 'rank' => $rank, 'order' => $order];
    }
    $rank_seen = [];
    foreach ($eligible as $item) {
        if (null === $item['rank']) continue;
        if (isset($rank_seen[$item['rank']])) {
            throw new \GraphQL\Error\UserError('The Malaysia Resources Hub featured ranks are ambiguous.');
        }
        $rank_seen[$item['rank']] = true;
    }
    $compare = static function (array $left, array $right): int {
        return ($left['order'] <=> $right['order']) ?:
            strcmp((string) $left['card']['pageId'], (string) $right['card']['pageId']);
    };
    if (1 === count($eligible)) {
        $featured_items = $eligible;
        $latest_items = [];
    } else {
        $featured_items = array_values(array_filter($eligible, static fn (array $item): bool => null !== $item['rank']));
        usort($featured_items, static function (array $left, array $right) use ($compare): int {
            return ($left['rank'] <=> $right['rank']) ?: $compare($left, $right);
        });
        $latest_items = array_values(array_filter($eligible, static fn (array $item): bool => null === $item['rank']));
        usort($latest_items, $compare);
    }
    $featured = array_values(array_map(static fn (array $item): array => $item['card'], $featured_items));
    $latest = array_values(array_map(static fn (array $item): array => $item['card'], $latest_items));
    $cards = array_merge($featured, $latest);
    $has_trade = [] !== array_filter($cards, static fn (array $card): bool => 'TRADE_UPDATE' === $card['resourceType']);
    $state = [] === $cards
        ? 'H0_NO_QUALIFIED_RESOURCE'
        : ($has_trade ? 'H4_TRADE_ITEM' : (1 === count($cards) ? 'H2_ONE_PUBLIC_RESOURCE' : 'H3_MULTIPLE_PUBLIC_RESOURCES'));
    return ['publicState' => $state, 'featuredResources' => $featured, 'latestResources' => $latest];
}

/** @return list<string> */
function tio2_my_resource_child_dependency_meta_keys(): array
{
    return [
        TIO2_MY_ROUTE_PAGE_ID_META,
        TIO2_MY_ROUTE_CANONICAL_META,
        TIO2_MY_ROUTE_RELEASE_STATE_META,
        'public_path',
        'resource_type',
        'mapping_status',
        'child_content_status',
        'claim_status',
        'public_eligibility_status',
        'route_status',
        'canonical_status',
        'last_reviewed_at',
        'featured_rank',
        'display_order',
        'cta_label',
        'source_owner',
        'record_review_date',
        'official_source_name',
        'official_source_url',
        'applicable_scope',
        'source_date',
        'review_date',
        'freshness_status',
        'public_status_label',
        'freshness_owner',
        'next_review_due',
        'event_review_trigger',
    ];
}

function tio2_my_resource_hub_references_child(int $post_id): bool
{
    $page_id = get_post_meta($post_id, TIO2_MY_ROUTE_PAGE_ID_META, true);
    $path = get_post_meta($post_id, 'public_path', true);
    if ((! is_string($page_id) || '' === $page_id) && (! is_string($path) || '' === $path)) return false;
    $hub_ids = get_posts([
        'post_type' => 'tio2_resource_hub',
        'post_status' => 'publish',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
    ]);
    foreach ($hub_ids as $hub_id) {
        $scopes = wp_get_post_terms((int) $hub_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) continue;
        $json = get_post_meta((int) $hub_id, TIO2_MY_RESOURCE_HUB_RELATIONS_META, true);
        $relations = is_string($json) ? json_decode($json, true) : null;
        if (! is_array($relations)) continue;
        foreach ($relations as $relation) {
            if (! is_array($relation) || 'tio2-my' !== ($relation['siteScope'] ?? null)) continue;
            if (
                (is_string($page_id) && '' !== $page_id && $page_id === ($relation['pageId'] ?? null)) ||
                (is_string($path) && '' !== $path && $path === untrailingslashit((string) ($relation['canonicalPath'] ?? '')))
            ) return true;
        }
    }
    return false;
}

/**
 * @param array{siteIds: list<string>, hasTerms: bool} $scope_state
 * @return list<string>
 */
function tio2_my_resource_dependency_paths(int $post_id, array $scope_state): array
{
    return ['tio2-my'] === $scope_state['siteIds'] && tio2_my_resource_hub_references_child($post_id)
        ? ['/resources']
        : [];
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
