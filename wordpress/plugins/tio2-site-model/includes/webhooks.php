<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_WEBHOOK_MAX_PATHS = 256;

/**
 * @param array<string, string>|null $environment
 * @return array{url: string, secret: string}|null
 */
function tio2_get_webhook_config(string $site_id, ?array $environment = null): ?array
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return null;
    }

    $suffix = strtoupper(str_replace('-', '_', $site_id));
    $url_name = 'NEXTJS_REVALIDATION_URL_' . $suffix;
    $secret_name = 'NEXTJS_REVALIDATION_SECRET_' . $suffix;
    $url = null === $environment
        ? getenv($url_name)
        : ($environment[$url_name] ?? '');
    $secret = null === $environment
        ? getenv($secret_name)
        : ($environment[$secret_name] ?? '');

    if (! is_string($url) || ! is_string($secret) || '' === $url || '' === $secret) {
        return null;
    }

    $parts = wp_parse_url($url);
    if (
        false === filter_var($url, FILTER_VALIDATE_URL) ||
        ! is_array($parts) ||
        ! in_array($parts['scheme'] ?? '', ['http', 'https'], true) ||
        empty($parts['host']) ||
        isset($parts['user']) ||
        isset($parts['pass'])
    ) {
        return null;
    }

    return ['url' => $url, 'secret' => $secret];
}

/**
 * @return list<string>
 */
function tio2_webhook_post_types(): array
{
    return array_merge(['page', 'post', 'tio2_homepage'], array_keys(tio2_content_type_definitions()));
}

function tio2_is_valid_webhook_path(string $path): bool
{
    if ('' === $path || str_starts_with($path, '//')) {
        return false;
    }

    $normalized = '/' !== $path && str_ends_with($path, '/')
        ? substr($path, 0, -1)
        : $path;
    return tio2_is_valid_public_path($normalized);
}

function tio2_normalize_webhook_path(string $path): ?string
{
    if (! tio2_is_valid_webhook_path($path)) {
        return null;
    }

    $normalized = '/' !== $path && str_ends_with($path, '/')
        ? substr($path, 0, -1)
        : $path;
    return tio2_is_valid_webhook_path($normalized) ? $normalized : null;
}

/**
 * @param list<mixed> $paths
 * @return list<string>|null
 */
function tio2_normalize_webhook_paths(array $paths): ?array
{
    $normalized = [];
    foreach ($paths as $path) {
        if (! is_string($path)) {
            return null;
        }
        $canonical = tio2_normalize_webhook_path($path);
        if (null === $canonical) {
            return null;
        }
        $normalized[$canonical] = true;
    }

    $normalized_paths = array_keys($normalized);
    if (count($normalized_paths) > TIO2_WEBHOOK_MAX_PATHS) {
        return null;
    }
    sort($normalized_paths, SORT_STRING);
    return array_values($normalized_paths);
}

/**
 * @param list<string> $term_slugs
 * @return array{siteIds: list<string>, hasTerms: bool}
 */
function tio2_site_scope_state_from_slugs(array $term_slugs): array
{
    $term_slugs = array_values(array_unique(array_map('strval', $term_slugs)));
    $site_ids = array_values(array_intersect(['tio2-a', 'tio2-b'], $term_slugs));
    sort($site_ids, SORT_STRING);

    return ['siteIds' => $site_ids, 'hasTerms' => ! empty($term_slugs)];
}

/**
 * @return array{siteIds: list<string>, hasTerms: bool}|null
 */
function tio2_get_site_scope_state(int $post_id): ?array
{
    $term_slugs = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($term_slugs)) {
        return null;
    }

    return tio2_site_scope_state_from_slugs($term_slugs);
}

/**
 * @param list<int> $term_taxonomy_ids
 * @return array{siteIds: list<string>, hasTerms: bool}
 */
function tio2_site_scope_state_from_tt_ids(array $term_taxonomy_ids): array
{
    $term_slugs = [];
    foreach (array_unique(array_map('intval', $term_taxonomy_ids)) as $term_taxonomy_id) {
        $term = get_term_by('term_taxonomy_id', $term_taxonomy_id, 'site_scope');
        if ($term instanceof WP_Term) {
            $term_slugs[] = $term->slug;
        }
    }

    return tio2_site_scope_state_from_slugs($term_slugs);
}

/**
 * @param array{siteIds: list<string>, hasTerms: bool}|null $scope_state
 * @param list<string>|null $paths
 * @return array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null
 */
function tio2_get_webhook_affected_state(
    int $post_id,
    ?array $scope_state = null,
    ?array $paths = null
): ?array {
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || ! in_array($post->post_type, tio2_webhook_post_types(), true)) {
        return null;
    }

    $scope_state = $scope_state ?? tio2_get_site_scope_state($post_id);
    if (null === $scope_state) {
        return null;
    }

    $site_ids = $scope_state['siteIds'];
    $entity_ids = [];
    $site_paths = [];
    if ('tio2_homepage' === $post->post_type) {
        if (1 !== count($site_ids)) {
            return null;
        }
        $paths = ['/'];
        $site_paths[$site_ids[0]] = $paths;
    } elseif (in_array($post->post_type, ['page', 'post'], true)) {
        if (1 !== count($site_ids)) {
            return null;
        }
        $paths = tio2_normalize_webhook_paths(
            $paths ?? [(string) get_post_meta($post_id, 'public_path', true)]
        );
        if (null === $paths || empty($paths)) {
            return null;
        }
        $site_paths[$site_ids[0]] = $paths;
    } else {
        $paths = [];
        if (empty($site_ids)) {
            return null;
        }
        $entity_ids = [$post_id];
    }

    sort($site_ids, SORT_STRING);
    return [
        'contentId' => $post_id,
        'siteIds' => array_values(array_unique($site_ids)),
        'paths' => $paths,
        'entityIds' => $entity_ids,
        'sitePaths' => $site_paths,
    ];
}

/**
 * @param array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>} $left
 * @param array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null $right
 * @return array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}
 */
function tio2_merge_webhook_affected_state(array $left, ?array $right): array
{
    if (null === $right) {
        return $left;
    }

    foreach (['siteIds', 'paths', 'entityIds'] as $key) {
        $left[$key] = array_values(array_unique(array_merge($left[$key], $right[$key])));
        sort($left[$key], 'entityIds' === $key ? SORT_NUMERIC : SORT_STRING);
    }
    $left['sitePaths'] = isset($left['sitePaths']) && is_array($left['sitePaths'])
        ? $left['sitePaths']
        : [];
    foreach (($right['sitePaths'] ?? []) as $site_id => $site_paths) {
        $left['sitePaths'][$site_id] = array_values(array_unique(array_merge(
            $left['sitePaths'][$site_id] ?? [],
            $site_paths
        )));
        sort($left['sitePaths'][$site_id], SORT_STRING);
    }
    return $left;
}

/**
 * @param array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null $affected
 * @return array{eventId: string, siteIds: list<string>, contentId: int, paths: list<string>, entityIds: list<int>, modified: string}|null
 */
function tio2_build_webhook_payload(
    int $post_id,
    ?string $modified = null,
    ?array $affected = null
): ?array {
    $affected = $affected ?? tio2_get_webhook_affected_state($post_id);
    if (null === $affected) {
        return null;
    }

    $site_ids = array_values(array_unique(array_map('strval', $affected['siteIds'] ?? [])));
    $paths = tio2_normalize_webhook_paths($affected['paths'] ?? []);
    $entity_ids = array_values(array_unique(array_map('intval', $affected['entityIds'] ?? [])));
    sort($entity_ids, SORT_NUMERIC);
    if (
        1 !== count($site_ids) ||
        ! in_array($site_ids[0], ['tio2-a', 'tio2-b'], true) ||
        null === $paths ||
        count($entity_ids) > TIO2_WEBHOOK_MAX_PATHS ||
        array_filter($entity_ids, static fn (int $entity_id): bool => $entity_id <= 0)
    ) {
        return null;
    }

    return [
        'eventId' => wp_generate_uuid4(),
        'siteIds' => $site_ids,
        'contentId' => $post_id,
        'paths' => $paths,
        'entityIds' => $entity_ids,
        'modified' => $modified ?? gmdate('c'),
    ];
}

/**
 * @param array<string, mixed> $payload
 */
function tio2_encode_webhook_payload(array $payload): ?string
{
    $encoded = wp_json_encode($payload, JSON_UNESCAPED_SLASHES);
    return is_string($encoded) ? $encoded : null;
}

function tio2_sign_webhook_body(string $body, string $secret): string
{
    return hash_hmac('sha256', $body, $secret);
}

/**
 * @param array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null $affected
 */
function tio2_send_webhook(int $post_id, ?array $affected = null): bool
{
    $affected = $affected ?? tio2_get_webhook_affected_state($post_id);
    if (null === $affected || empty($affected['siteIds'])) {
        return false;
    }

    $attempted = false;
    $all_succeeded = true;
    foreach ($affected['siteIds'] as $site_id) {
        $config = tio2_get_webhook_config($site_id);
        if (null === $config) {
            $all_succeeded = false;
            continue;
        }

        $site_affected = $affected;
        $site_affected['siteIds'] = [$site_id];
        if (isset($affected['sitePaths'][$site_id])) {
            $site_affected['paths'] = $affected['sitePaths'][$site_id];
        }
        $payload = tio2_build_webhook_payload($post_id, null, $site_affected);
        $body = null === $payload ? null : tio2_encode_webhook_payload($payload);
        if (null === $body) {
            $all_succeeded = false;
            continue;
        }

        $attempted = true;
        $response = wp_remote_post($config['url'], [
            'timeout' => 5,
            'redirection' => 0,
            'headers' => [
                'content-type' => 'application/json',
                'x-tio2-signature' => tio2_sign_webhook_body($body, $config['secret']),
            ],
            'body' => $body,
        ]);

        if (is_wp_error($response)) {
            $all_succeeded = false;
            continue;
        }

        $status = wp_remote_retrieve_response_code($response);
        if ($status < 200 || $status >= 300) {
            $all_succeeded = false;
        }
    }

    return $attempted && $all_succeeded;
}

function tio2_is_relevant_webhook_meta_key(string $meta_key, ?int $post_id = null): bool
{
    if (in_array($meta_key, [
        'public_path',
        'seo_title',
        'seo_description',
        'technical_summary',
        'evidence_source_url',
    ], true)) {
        return true;
    }

    $post = null === $post_id ? null : get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_homepage' !== $post->post_type) {
        return false;
    }

    $homepage_key = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    if (
        'homepage-v0.2-editorial-geo' === get_field('homepage_schema_version', $post->ID, false) &&
        in_array($homepage_key, tio2_homepage_v02_meta_keys(), true)
    ) {
        return true;
    }

    foreach ([
        'homepage_',
        'hero_',
        'metric_',
        'metrics',
        'products_',
        'product_',
        'applications_',
        'applications',
        'application_',
        'inquiry_',
        'trust_',
        'rfq_',
        'faq_',
        'faqs',
        'closing_',
        'og_',
        'primary_',
        'secondary_',
    ] as $prefix) {
        if (str_starts_with($homepage_key, $prefix)) {
            return true;
        }
    }

    return false;
}

/**
 * @param array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null $affected
 */
function tio2_queue_webhook(int $post_id, ?array $affected = null): void
{
    $affected = $affected ?? tio2_get_webhook_affected_state($post_id);
    if (null === $affected) {
        return;
    }

    if (! isset($GLOBALS['tio2_webhook_queue']) || ! is_array($GLOBALS['tio2_webhook_queue'])) {
        $GLOBALS['tio2_webhook_queue'] = [];
    }

    $existing = $GLOBALS['tio2_webhook_queue'][$post_id] ?? null;
    if (! is_array($existing)) {
        $GLOBALS['tio2_webhook_queue'][$post_id] = $affected;
    }
}

function tio2_flush_webhook_queue(): void
{
    $queued = isset($GLOBALS['tio2_webhook_queue']) && is_array($GLOBALS['tio2_webhook_queue'])
        ? $GLOBALS['tio2_webhook_queue']
        : [];
    $GLOBALS['tio2_webhook_queue'] = [];

    foreach ($queued as $post_id => $affected) {
        if (! is_array($affected)) {
            continue;
        }
        $affected = tio2_merge_webhook_affected_state(
            $affected,
            tio2_get_webhook_affected_state((int) $post_id)
        );
        tio2_send_webhook((int) $post_id, $affected);
    }
}

function tio2_handle_post_transition(string $new_status, string $old_status, WP_Post $post): void
{
    if (
        ! in_array($post->post_type, tio2_webhook_post_types(), true) ||
        ('publish' !== $new_status && 'publish' !== $old_status) ||
        wp_is_post_revision($post->ID) ||
        wp_is_post_autosave($post->ID)
    ) {
        return;
    }

    tio2_queue_webhook((int) $post->ID);
}

/**
 * @param mixed $check
 * @param mixed $meta_value
 * @return mixed
 */
function tio2_capture_post_meta_before_mutation(
    $check,
    int $post_id,
    string $meta_key,
    $meta_value,
    $extra = null
) {
    if (
        null === $check &&
        'publish' === get_post_status($post_id) &&
        tio2_is_relevant_webhook_meta_key($meta_key, $post_id)
    ) {
        tio2_queue_webhook($post_id);
    }

    return $check;
}

/**
 * @param mixed $meta_value
 */
function tio2_handle_post_meta_change($meta_id, int $post_id, string $meta_key, $meta_value): void
{
    if (! tio2_is_relevant_webhook_meta_key($meta_key, $post_id)) {
        return;
    }

    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        'publish' !== $post->post_status ||
        ! in_array($post->post_type, tio2_webhook_post_types(), true)
    ) {
        return;
    }

    tio2_queue_webhook($post_id);
}

/**
 * @param list<int> $meta_ids
 * @param mixed $meta_value
 */
function tio2_handle_deleted_post_meta(array $meta_ids, int $post_id, string $meta_key, $meta_value): void
{
    tio2_handle_post_meta_change($meta_ids, $post_id, $meta_key, $meta_value);
}

/**
 * @param mixed $terms
 * @param list<int> $term_taxonomy_ids
 * @param list<int> $old_term_taxonomy_ids
 */
function tio2_handle_site_scope_set(
    int $post_id,
    $terms,
    array $term_taxonomy_ids,
    string $taxonomy,
    bool $append,
    array $old_term_taxonomy_ids
): void {
    if ('site_scope' !== $taxonomy || 'publish' !== get_post_status($post_id)) {
        return;
    }

    tio2_queue_webhook(
        $post_id,
        tio2_get_webhook_affected_state(
            $post_id,
            tio2_site_scope_state_from_tt_ids($old_term_taxonomy_ids)
        )
    );
    tio2_queue_webhook($post_id);
}

/**
 * @param list<int> $term_taxonomy_ids
 */
function tio2_handle_deleted_term_relationships(
    int $post_id,
    array $term_taxonomy_ids,
    string $taxonomy
): void {
    if ('site_scope' !== $taxonomy || 'publish' !== get_post_status($post_id)) {
        return;
    }

    $removed_scope_state = tio2_site_scope_state_from_tt_ids($term_taxonomy_ids);
    $removed_state = tio2_get_webhook_affected_state(
        $post_id,
        $removed_scope_state
    );
    if (null !== $removed_state) {
        tio2_queue_webhook($post_id, $removed_state);
    }

    $current_scope_state = tio2_get_site_scope_state($post_id);
    if (null === $current_scope_state) {
        return;
    }

    $current_state = tio2_get_webhook_affected_state($post_id, $current_scope_state);
    if (null !== $current_state) {
        tio2_queue_webhook($post_id, $current_state);
    }
}
