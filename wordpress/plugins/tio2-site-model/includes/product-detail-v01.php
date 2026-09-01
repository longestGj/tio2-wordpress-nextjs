<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_MY_PRODUCT_DETAIL_CONTRACT_META = '_tio2_my_product_detail_contract_json';

/** @return array<string, array<string, string>> */
function tio2_my_product_detail_approved_grades(): array
{
    return [
        'm-350' => [
            'page_id' => 'GRADE-M350',
            'grade_code' => 'M-350',
            'internal_slug' => 'tio2-my-m-350',
            'public_path' => '/products/m-350',
            'canonical' => 'https://tio2malaysia.com/products/m-350/',
            'contract_file' => 'tio2-my-product-detail-m350.json',
        ],
        'm-510' => [
            'page_id' => 'GRADE-M510',
            'grade_code' => 'M-510',
            'internal_slug' => 'tio2-my-m-510',
            'public_path' => '/products/m-510',
            'canonical' => 'https://tio2malaysia.com/products/m-510/',
            'contract_file' => 'tio2-my-product-detail-m510.json',
        ],
    ];
}

function tio2_my_product_detail_contract_path(string $slug = 'm-350'): string
{
    $identity = tio2_my_product_detail_approved_grades()[$slug] ?? null;
    if (! is_array($identity)) {
        return '';
    }
    return dirname(__DIR__) . '/config/' . $identity['contract_file'];
}

/** @return string|WP_Error */
function tio2_my_product_detail_approved_contract_json(string $slug = 'm-350')
{
    $path = tio2_my_product_detail_contract_path($slug);
    $json = is_readable($path) ? file_get_contents($path) : false;
    if (! is_string($json) || '' === $json) {
        return new WP_Error(
            'tio2_my_product_detail_contract_missing',
            'The approved Malaysia Product Detail contract is unavailable.'
        );
    }
    return $json;
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
    $matches = array_filter(
        tio2_my_product_detail_approved_grades(),
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

    $approved = tio2_my_product_detail_approved_contract_json($slug);
    if (is_wp_error($approved)) {
        return $approved;
    }
    $stored = get_post_meta($post_id, TIO2_MY_PRODUCT_DETAIL_CONTRACT_META, true);
    if (! is_string($stored) || ! hash_equals($approved, $stored)) {
        return new WP_Error(
            'tio2_my_product_detail_contract_mismatch',
            'The stored Malaysia Product Detail payload does not match the approved contract.'
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
    $identity = is_string($slug) ? (tio2_my_product_detail_approved_grades()[$slug] ?? null) : null;
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
