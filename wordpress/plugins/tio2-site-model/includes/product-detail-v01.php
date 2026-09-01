<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_PRODUCT_DETAIL_CONTRACT_META = '_tio2_my_product_detail_contract_json';

function tio2_my_product_detail_registry_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-product-detail-identities.json';
}

/** @param mixed $value */
function tio2_my_product_detail_canonicalize_json_value(&$value): void
{
    if (! is_array($value)) {
        return;
    }
    foreach ($value as &$item) {
        tio2_my_product_detail_canonicalize_json_value($item);
    }
    unset($item);
    if (! array_is_list($value)) {
        ksort($value, SORT_STRING);
    }
}

/** @return string|WP_Error */
function tio2_my_product_detail_canonical_sha256(string $json)
{
    $decoded = json_decode($json, true);
    if (! is_array($decoded)) {
        return new WP_Error('tio2_my_product_detail_contract_json_invalid', 'The Product Detail contract JSON is invalid.');
    }
    tio2_my_product_detail_canonicalize_json_value($decoded);
    $canonical = wp_json_encode(
        $decoded,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION
    );
    if (! is_string($canonical)) {
        return new WP_Error('tio2_my_product_detail_contract_canonical_invalid', 'The Product Detail contract cannot be canonicalized.');
    }
    return strtoupper(hash('sha256', $canonical));
}

/** @return array<string, array<string, mixed>>|WP_Error */
function tio2_my_product_detail_approved_grades()
{
    static $cached = null;
    if (is_array($cached) || is_wp_error($cached)) {
        return $cached;
    }
    $registry_path = tio2_my_product_detail_registry_path();
    $registry_json = is_readable($registry_path) ? file_get_contents($registry_path) : false;
    $registry = is_string($registry_json) ? json_decode($registry_json, true) : null;
    if (
        ! is_array($registry) ||
        'sha256-json-recursive-key-sort-v1' !== ($registry['hashAlgorithm'] ?? null) ||
        'tio2-my' !== ($registry['siteScope'] ?? null) ||
        'en' !== ($registry['locale'] ?? null) ||
        'product-detail-v1' !== ($registry['templateVersion'] ?? null) ||
        ! is_array($registry['identities'] ?? null)
    ) {
        return $cached = new WP_Error('tio2_my_product_detail_registry_invalid', 'The Product Detail approval registry is invalid.');
    }
    $approved = [];
    foreach ($registry['identities'] as $identity) {
        if (! is_array($identity) || ! str_starts_with((string) ($identity['implementationState'] ?? ''), 'APPROVED_')) {
            continue;
        }
        $slug = $identity['slug'] ?? null;
        $contract_file = $identity['contractFile'] ?? null;
        $source_hash = $identity['approvedSourceSha256'] ?? null;
        $canonical_hash = $identity['approvedCanonicalSha256'] ?? null;
        if (
            ! is_string($slug) || ! preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) ||
            ! is_string($contract_file) || ! preg_match('/^tio2-my-product-detail-[a-z0-9-]+\.json$/', $contract_file) ||
            ! is_string($source_hash) || ! preg_match('/^[A-F0-9]{64}$/', $source_hash) ||
            ! is_string($canonical_hash) || ! preg_match('/^[A-F0-9]{64}$/', $canonical_hash) ||
            isset($approved[$slug])
        ) {
            return $cached = new WP_Error('tio2_my_product_detail_registry_entry_invalid', 'An approved Product Detail registry entry is invalid.');
        }
        $contract_path = dirname(__DIR__) . '/config/' . $contract_file;
        $contract_json = is_readable($contract_path) ? file_get_contents($contract_path) : false;
        $actual_hash = is_string($contract_json)
            ? tio2_my_product_detail_canonical_sha256($contract_json)
            : new WP_Error('tio2_my_product_detail_contract_missing', 'The approved Product Detail contract is unavailable.');
        if (is_wp_error($actual_hash) || ! hash_equals($canonical_hash, $actual_hash)) {
            return $cached = new WP_Error('tio2_my_product_detail_approved_hash_mismatch', 'The approved Product Detail contract hash does not match the registry.');
        }
        $contract = json_decode($contract_json, true);
        $path = $identity['path'] ?? null;
        if (
            ! is_array($contract) ||
            ! is_string($path) ||
            $slug !== ($contract['identity']['slug'] ?? null) ||
            ($identity['pageId'] ?? null) !== ($contract['identity']['pageId'] ?? null) ||
            ($identity['gradeCode'] ?? null) !== ($contract['identity']['gradeCode'] ?? null) ||
            $path !== ($contract['identity']['path'] ?? null) ||
            'tio2-my' !== ($contract['identity']['siteScope'] ?? null)
        ) {
            return $cached = new WP_Error('tio2_my_product_detail_registry_identity_mismatch', 'The Product Detail contract identity does not match the registry.');
        }
        $approved[$slug] = [
            'page_id' => (string) $identity['pageId'],
            'grade_code' => (string) $identity['gradeCode'],
            'internal_slug' => 'tio2-my-' . $slug,
            'public_path' => rtrim($path, '/'),
            'canonical' => 'https://tio2malaysia.com' . $path,
            'contract_file' => $contract_file,
            'approved_source_sha256' => $source_hash,
            'approved_canonical_sha256' => $canonical_hash,
            'contract_json' => $contract_json,
        ];
    }
    if ([] === $approved) {
        return $cached = new WP_Error('tio2_my_product_detail_registry_empty', 'No Product Detail contract is approved for preview.');
    }
    return $cached = $approved;
}

/** @return string|WP_Error */
function tio2_my_product_detail_approved_contract_json(string $slug)
{
    $approved = tio2_my_product_detail_approved_grades();
    if (is_wp_error($approved)) {
        return $approved;
    }
    $identity = $approved[$slug] ?? null;
    return is_array($identity) && is_string($identity['contract_json'] ?? null)
        ? $identity['contract_json']
        : new WP_Error('tio2_my_product_detail_contract_missing', 'The approved Malaysia Product Detail contract is unavailable.');
}

/** @return true|WP_Error */
function tio2_validate_product_detail_v01_contract(int $post_id)
{
    if ('tio2_grade' !== get_post_type($post_id)) {
        return new WP_Error('tio2_my_product_detail_invalid_type', 'The Product Detail record type is invalid.');
    }
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_unique(array_map('strval', $scopes)))) {
        return new WP_Error(
            'tio2_my_product_detail_invalid_scope',
            'The Product Detail contract is valid only for site_scope=tio2-my.'
        );
    }
    $page_id = get_post_meta($post_id, TIO2_MY_ROUTE_PAGE_ID_META, true);
    $approved_grades = tio2_my_product_detail_approved_grades();
    if (is_wp_error($approved_grades)) {
        return $approved_grades;
    }
    $matches = array_filter(
        $approved_grades,
        static fn (array $candidate): bool => $candidate['page_id'] === $page_id
    );
    if (1 !== count($matches)) {
        return new WP_Error('tio2_my_product_detail_invalid_identity', 'The Product Detail identity is not authorized.');
    }
    $slug = (string) array_key_first($matches);
    $identity = $matches[$slug];
    if (
        $identity['public_path'] !== get_post_meta($post_id, 'public_path', true) ||
        $identity['internal_slug'] !== get_post_field('post_name', $post_id) ||
        $identity['canonical'] !== get_post_meta($post_id, TIO2_MY_ROUTE_CANONICAL_META, true) ||
        'PREVIEW_ONLY' !== get_post_meta($post_id, TIO2_MY_ROUTE_RELEASE_STATE_META, true)
    ) {
        return new WP_Error('tio2_my_product_detail_invalid_route', 'The Product Detail route identity is invalid.');
    }

    $stored = get_post_meta($post_id, TIO2_MY_PRODUCT_DETAIL_CONTRACT_META, true);
    $stored_hash = is_string($stored)
        ? tio2_my_product_detail_canonical_sha256($stored)
        : new WP_Error('tio2_my_product_detail_contract_missing', 'The stored Product Detail contract is unavailable.');
    if (is_wp_error($stored_hash) || ! hash_equals($identity['approved_canonical_sha256'], $stored_hash)) {
        return new WP_Error(
            'tio2_my_product_detail_contract_mismatch',
            'The stored Malaysia Product Detail payload does not match the approved canonical hash.'
        );
    }

    $contract = json_decode($stored, true);
    if (
        ! is_array($contract) ||
        $identity['page_id'] !== ($contract['identity']['pageId'] ?? null) ||
        'tio2-my' !== ($contract['identity']['siteScope'] ?? null) ||
        $slug !== ($contract['identity']['slug'] ?? null) ||
        $identity['grade_code'] !== ($contract['identity']['gradeCode'] ?? null) ||
        $identity['public_path'] . '/' !== ($contract['identity']['path'] ?? null) ||
        'product-detail-v0.1-malaysia' !== ($contract['identity']['schemaVersion'] ?? null) ||
        'approved_for_preview' !== ($contract['identity']['recordState'] ?? null)
    ) {
        return new WP_Error('tio2_my_product_detail_contract_invalid', 'The Product Detail payload identity is invalid.');
    }
    return true;
}

/** @return array<string, bool> */
function tio2_my_product_detail_route_readiness(array $contract): array
{
    if (! function_exists('tio2_my_product_target_ready')) {
        throw new \GraphQL\Error\UserError('The Malaysia scoped route resolver is unavailable.');
    }
    $routes = $contract['routeRegistry'] ?? null;
    if (! is_array($routes)) {
        throw new \GraphQL\Error\UserError('The Product Detail route registry is invalid.');
    }
    $readiness = [];
    foreach ($routes as $route) {
        if (
            ! is_array($route) ||
            ! is_string($route['targetPageId'] ?? null) ||
            ! is_string($route['href'] ?? null) ||
            array_key_exists($route['targetPageId'], $readiness)
        ) {
            throw new \GraphQL\Error\UserError('The Product Detail route registry is ambiguous.');
        }
        $is_required_parent = 'required' === ($route['behavior'] ?? null) &&
            in_array($route['targetPageId'], ['HOME-001', 'PRODUCT-000'], true);
        $readiness[$route['targetPageId']] = $is_required_parent
            ? tio2_my_product_detail_required_parent_available($route['targetPageId'], $route['href'])
            : tio2_my_product_target_ready($route['targetPageId'], $route['href']);
    }
    return $readiness;
}

/**
 * Gate 8 preview composition needs its already-implemented parent pages.
 * This does not return LIVE_APPROVED and must never unlock a contextual action.
 */
function tio2_my_product_detail_required_parent_available(string $target_page_id, string $href): bool
{
    if ('HOME-001' === $target_page_id && '/' === $href) {
        $ids = function_exists('tio2_find_homepage_ids')
            ? array_values(array_filter(
                tio2_find_homepage_ids('tio2-my', false),
                static fn (int $post_id): bool => 'publish' === get_post_status($post_id)
            ))
            : [];
        if (1 !== count($ids) || is_wp_error(tio2_validate_homepage_contract((int) $ids[0]))) {
            return false;
        }
        $stored = get_post_meta((int) $ids[0], '_tio2_my_homepage_contract_json', true);
        $parent = is_string($stored) ? json_decode($stored, true) : null;
        return is_array($parent) &&
            'HOME-001' === ($parent['identity']['pageId'] ?? null) &&
            '/' === ($parent['identity']['path'] ?? null);
    }
    if ('PRODUCT-000' !== $target_page_id || '/products/' !== $href) {
        return false;
    }
    $ids = get_posts([
        'post_type' => 'tio2_product_hub',
        'post_status' => 'publish',
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
        'meta_query' => [[
            'key' => 'public_path',
            'value' => '/products',
            'compare' => '=',
        ]],
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => ['tio2-my'],
        ]],
    ]);
    if (1 !== count($ids) || is_wp_error(tio2_validate_product_hub_v01_contract((int) $ids[0]))) {
        return false;
    }
    $stored = get_post_meta((int) $ids[0], TIO2_MY_PRODUCT_HUB_CONTRACT_META, true);
    $parent = is_string($stored) ? json_decode($stored, true) : null;
    return is_array($parent) &&
        'PRODUCT-000' === ($parent['identity']['pageId'] ?? null) &&
        '/products/' === ($parent['identity']['path'] ?? null);
}

/** @return array<string, mixed> */
function tio2_my_product_detail_public_projection(array $contract, array $readiness): array
{
    $grade_code = (string) ($contract['identity']['gradeCode'] ?? 'Product Detail');
    if (! ($readiness['HOME-001'] ?? false) || ! ($readiness['PRODUCT-000'] ?? false)) {
        throw new \GraphQL\Error\UserError($grade_code . ' required parent routes are unavailable.');
    }

    $verified = static fn (string $key): bool =>
        'verified' === ($contract['moduleStatus'][$key] ?? null);
    if (! $verified('hero') || ! $verified('positioning') || ! $verified('applications') ||
        ! $verified('evaluation') || ! $verified('technical')) {
        throw new \GraphQL\Error\UserError($grade_code . ' minimum public projection is incomplete.');
    }

    $hero = $contract['hero'];
    $hero['actions'] = array_values(array_filter(
        $hero['actions'],
        static fn (array $action): bool => true === ($readiness[$action['targetPageId']] ?? false)
    ));

    $positioning = $contract['positioning'];
    if (isset($positioning['contextualLink']) && ! ($readiness[$positioning['contextualLink']['targetPageId']] ?? false)) {
        unset($positioning['contextualLink']);
    }

    $applications = $contract['applications'];
    $applications['items'] = array_map(
        static function (array $item) use ($readiness): array {
            if (isset($item['targetPageId']) && ! ($readiness[$item['targetPageId']] ?? false)) {
                unset($item['targetPageId'], $item['href']);
            }
            if (isset($item['relatedTargets']) && is_array($item['relatedTargets'])) {
                $item['relatedTargets'] = array_values(array_filter(
                    $item['relatedTargets'],
                    static fn (array $target): bool => true === ($readiness[$target['targetPageId']] ?? false)
                ));
                if ([] === $item['relatedTargets']) {
                    unset($item['relatedTargets']);
                }
            }
            return $item;
        },
        $applications['items']
    );

    $technical = $contract['technical'];
    if (isset($technical['action']) && ! ($readiness[$technical['action']['targetPageId']] ?? false)) {
        unset($technical['action']);
    }

    $modules = [
        'hero' => $hero,
        'positioning' => $positioning,
        'applications' => $applications,
        'evaluation' => $contract['evaluation'],
        'technical' => $technical,
    ];

    if ($verified('documents') && isset($contract['documents']) && ($readiness[$contract['documents']['targetPageId']] ?? false)) {
        $modules['documents'] = $contract['documents'];
    }

    if ($verified('markets') && isset($contract['markets'])) {
        $markets = $contract['markets'];
        $markets['items'] = array_values(array_filter(
            $markets['items'],
            static fn (array $item): bool => true === ($readiness[$item['targetPageId']] ?? false)
        ));
        if ([] !== $markets['items']) {
            $modules['markets'] = $markets;
        }
    }

    if ($verified('relatedGrades') && isset($contract['relatedGrades'])) {
        $related = $contract['relatedGrades'];
        $related['items'] = array_values(array_filter(
            $related['items'],
            static fn (array $item): bool => true === ($readiness[$item['targetPageId']] ?? false)
        ));
        if (! ($readiness[$related['allTargetPageId']] ?? false)) {
            unset($related['allTargetPageId'], $related['allLabel'], $related['allHref']);
        }
        if (count($related['items']) >= 2) {
            $modules['relatedGrades'] = $related;
        }
    }

    if ($verified('sample') && isset($contract['sample']) && ($readiness[$contract['sample']['targetPageId']] ?? false)) {
        $modules['sample'] = $contract['sample'];
    }

    return [
        'reviewId' => $contract['reviewId'],
        'identity' => $contract['identity'],
        'releaseControls' => $contract['releaseControls'],
        'seo' => $contract['seo'],
        'globalChromeRef' => $contract['globalChromeRef'],
        'breadcrumb' => $contract['breadcrumb'],
        'modules' => $modules,
    ];
}

function tio2_resolve_malaysia_product_detail_record_json($root, array $args): string
{
    $slug = $args['slug'] ?? null;
    $approved_grades = tio2_my_product_detail_approved_grades();
    if (is_wp_error($approved_grades)) {
        throw new \GraphQL\Error\UserError('The Malaysia Product Detail approval registry failed validation.');
    }
    $identity = is_string($slug) ? ($approved_grades[$slug] ?? null) : null;
    if (! is_array($identity)) {
        throw new \GraphQL\Error\UserError('The requested Malaysia Product Detail is not authorized.');
    }
    $ids = get_posts([
        'post_type' => 'tio2_grade',
        'post_status' => 'publish',
        'name' => $identity['internal_slug'],
        'fields' => 'ids',
        'numberposts' => 2,
        'suppress_filters' => false,
        'meta_query' => [[
            'key' => 'public_path',
            'value' => $identity['public_path'],
            'compare' => '=',
        ]],
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => ['tio2-my'],
        ]],
    ]);
    if (1 !== count($ids)) {
        throw new \GraphQL\Error\UserError(
            0 === count($ids)
                ? 'The requested Malaysia Product Detail record is missing.'
                : 'Multiple Malaysia Product Detail records were found.'
        );
    }
    $post_id = (int) $ids[0];
    $validation = tio2_validate_product_detail_v01_contract($post_id);
    if (is_wp_error($validation)) {
        throw new \GraphQL\Error\UserError(
            'The Malaysia Product Detail record failed scope or contract validation.'
        );
    }
    $contract_json = get_post_meta($post_id, TIO2_MY_PRODUCT_DETAIL_CONTRACT_META, true);
    $contract = is_string($contract_json) ? json_decode($contract_json, true) : null;
    if (! is_array($contract)) {
        throw new \GraphQL\Error\UserError('The Malaysia Product Detail record has no approved contract payload.');
    }
    $projection = tio2_my_product_detail_public_projection(
        $contract,
        tio2_my_product_detail_route_readiness($contract)
    );
    return wp_json_encode([
        'id' => 'product-detail-' . $post_id,
        'modifiedGmt' => str_replace(' ', 'T', (string) get_post_field('post_modified_gmt', $post_id)),
        'status' => get_post_status($post_id),
        'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
        'publishingFields' => ['publicPath' => $identity['public_path']],
        'publicProjection' => $projection,
    ]);
}

function tio2_register_product_detail_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaProductDetailRecordJson', [
        'type' => ['non_null' => 'String'],
        'args' => [
            'slug' => ['type' => ['non_null' => 'String']],
        ],
        'resolve' => 'tio2_resolve_malaysia_product_detail_record_json',
        'description' => 'Approved scope-bound Grade public projection for TiO2 Malaysia.',
    ]);
}

add_action('graphql_register_types', 'tio2_register_product_detail_v01_graphql_field');
