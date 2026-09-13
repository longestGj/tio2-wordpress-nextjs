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
    if (! in_array($site_id, tio2_supported_site_ids(), true)) {
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
    return array_merge(['page', 'post', 'tio2_homepage', 'tio2_market_page', 'tio2_product_hub', 'tio2_application_hub', 'tio2_my_editorial', 'tio2_resource_hub', 'tio2_about_page', 'tio2_documents_hub', 'tio2_doc_tds', 'tio2_legal_page', 'tio2_request_docs', 'tio2_request_sample'], array_keys(tio2_content_type_definitions()));
}

/**
 * @param list<array<string, mixed>> $definitions
 */
function tio2_is_relevant_product_webhook_meta_key_from_definitions(string $meta_key, array $definitions): bool
{
    $meta_key = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    if ('' === $meta_key || str_starts_with($meta_key, '_')) {
        return false;
    }

    foreach ($definitions as $definition) {
        $field_name = (string) ($definition['name'] ?? '');
        if ('' === $field_name) {
            continue;
        }
        if ($field_name === $meta_key) {
            return true;
        }

        foreach ($definition['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field)) {
                continue;
            }
            $sub_field_name = (string) ($sub_field['name'] ?? '');
            if ('' === $sub_field_name) {
                continue;
            }
            if ('repeater' === ($definition['type'] ?? '')) {
                if (1 === preg_match(
                    '/^' . preg_quote($field_name, '/') . '_[0-9]+_' . preg_quote($sub_field_name, '/') . '$/',
                    $meta_key
                )) {
                    return true;
                }
                continue;
            }
            if ($field_name . '_' . $sub_field_name === $meta_key) {
                return true;
            }
        }
    }

    return false;
}

function tio2_is_relevant_product_webhook_meta_key(string $meta_key): bool
{
    return tio2_is_relevant_product_webhook_meta_key_from_definitions(
        $meta_key,
        tio2_product_field_definitions()
    );
}

function tio2_is_relevant_product_shared_webhook_meta_key(string $meta_key): bool
{
    $meta_key = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    $meta_key = str_starts_with($meta_key, 'options_') ? substr($meta_key, 8) : $meta_key;
    return tio2_is_relevant_product_webhook_meta_key_from_definitions(
        $meta_key,
        tio2_product_shared_field_definitions()
    );
}

/**
 * Match one ACF field (including nested repeater/group rows) against its
 * canonical database meta suffix.
 *
 * @param array<string, mixed> $definition
 */
function tio2_editorial_webhook_definition_matches(string $meta_key, array $definition): bool
{
    $name = (string) ($definition['name'] ?? '');
    if ('' === $name) {
        return false;
    }
    if ($meta_key === $name) {
        return true;
    }
    $type = (string) ($definition['type'] ?? '');
    $prefix = 'repeater' === $type
        ? '/^' . preg_quote($name, '/') . '_[0-9]+_(.+)$/'
        : ('group' === $type ? '/^' . preg_quote($name, '/') . '_(.+)$/' : null);
    if (null === $prefix || 1 !== preg_match($prefix, $meta_key, $matches)) {
        return false;
    }
    foreach ($definition['sub_fields'] ?? [] as $sub_field) {
        if (is_array($sub_field) && tio2_editorial_webhook_definition_matches($matches[1], $sub_field)) {
            return true;
        }
    }
    return false;
}

/** @param list<array<string, mixed>> $definitions */
function tio2_is_relevant_editorial_webhook_meta_key(string $meta_key, array $definitions): bool
{
    if (str_starts_with($meta_key, '_')) {
        $meta_key = substr($meta_key, 1);
    }
    if ('' === $meta_key || str_starts_with($meta_key, '_')) {
        return false;
    }
    foreach ($definitions as $definition) {
        if (is_array($definition) && tio2_editorial_webhook_definition_matches($meta_key, $definition)) {
            return true;
        }
    }
    return false;
}

/**
 * @return array{contentId: int, siteIds: list<string>, paths: list<string>, entityIds: list<int>, sitePaths: array<string, list<string>>}|null
 */
function tio2_get_product_settings_webhook_affected_state(): ?array
{
    $product_ids = get_posts([
        'post_type' => 'tio2_product',
        'post_status' => 'publish',
        'fields' => 'ids',
        'posts_per_page' => -1,
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
    ]);

    $affected = null;
    foreach ($product_ids as $product_id) {
        $product_state = tio2_get_webhook_affected_state((int) $product_id);
        if (null === $product_state) {
            continue;
        }
        $affected = null === $affected
            ? $product_state
            : tio2_merge_webhook_affected_state($affected, $product_state);
    }

    return $affected;
}

/**
 * @param mixed $old_value
 * @param mixed $value
 */
function tio2_handle_product_option_change(
    string $option_name,
    $old_value = null,
    $value = null
): void {
    if (
        ! str_starts_with($option_name, 'options_') &&
        ! str_starts_with($option_name, '_options_')
    ) {
        return;
    }
    if (! tio2_is_relevant_product_shared_webhook_meta_key($option_name)) {
        return;
    }

    $affected = tio2_get_product_settings_webhook_affected_state();
    if (null === $affected) {
        return;
    }
    tio2_queue_webhook($affected['contentId'], $affected);
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
    $site_ids = array_values(array_intersect(tio2_supported_site_ids(), $term_slugs));
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
    } elseif ('tio2_product' === $post->post_type) {
        if (['tio2-a'] !== $site_ids || ! function_exists('get_field')) {
            return null;
        }
        $product_id = get_field('product_id', $post_id, false);
        if (! is_string($product_id) || 1 !== preg_match(tio2_product_id_pattern(), $product_id)) {
            return null;
        }
        $paths = tio2_normalize_webhook_paths([tio2_product_path_from_id($product_id)]);
        if (null === $paths) {
            return null;
        }
        $entity_ids = [$post_id];
        $site_paths['tio2-a'] = $paths;
    } elseif (
        'tio2_document' === $post->post_type &&
        ['tio2-my'] === $site_ids &&
        'RES-ORIGIN' === get_post_meta($post_id, 'resource_id', true)
    ) {
        if (
            'non-china-titanium-dioxide' !== $post->post_name ||
            '/resources/non-china-titanium-dioxide/' !== get_post_meta($post_id, 'public_path', true)
        ) {
            return null;
        }
        $paths = ['/resources/non-china-titanium-dioxide'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif (
        'tio2_document' === $post->post_type &&
        ['tio2-my'] === $site_ids &&
        'RES-PROC' === get_post_meta($post_id, 'resource_id', true)
    ) {
        if (
            'chloride-vs-sulfate-titanium-dioxide' !== $post->post_name ||
            '/resources/chloride-vs-sulfate-titanium-dioxide/' !== get_post_meta($post_id, 'public_path', true)
        ) {
            return null;
        }
        $paths = ['/resources/chloride-vs-sulfate-titanium-dioxide'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif (in_array($post->post_type, ['tio2_application', 'tio2_document'], true)) {
        if (['tio2-a'] !== $site_ids || ! function_exists('get_field')) {
            return null;
        }
        $fields = 'tio2_application' === $post->post_type
            ? tio2_serialize_application_fields($post)
            : tio2_serialize_resource_fields($post);
        if (is_wp_error($fields)) {
            return null;
        }

        $source_id = 'tio2_application' === $post->post_type
            ? (string) $fields['applicationId']
            : (string) $fields['resourceId'];
        $identities = 'tio2_application' === $post->post_type
            ? tio2_site_a_application_identities()
            : tio2_site_a_resource_identities();
        if (! isset($identities[$source_id])) {
            return null;
        }
        $paths = [$identities[$source_id]['path']];
        $entity_ids = [$post_id];

        $relationships = 'tio2_application' === $post->post_type
            ? [
                ['parent_application', 'tio2_application'],
                ['child_applications', 'tio2_application'],
                ['related_applications', 'tio2_application'],
                ['related_resources', 'tio2_document'],
                ['related_products', 'tio2_product'],
            ]
            : [
                ['child_resources', 'tio2_document'],
                ['related_applications', 'tio2_application'],
                ['related_resources', 'tio2_document'],
                ['related_products', 'tio2_product'],
            ];
        foreach ($relationships as [$field_name, $expected_post_type]) {
            foreach (tio2_editorial_relationship_ids(get_field($field_name, $post_id, false)) as $target_id) {
                $target = get_post($target_id);
                if (! $target instanceof WP_Post) {
                    return null;
                }
                $link = tio2_editorial_link_for_post($target, $expected_post_type);
                if (is_wp_error($link)) {
                    return null;
                }
                $paths[] = $link['path'];
                $entity_ids[] = $target_id;
            }
        }
        $paths = tio2_normalize_webhook_paths($paths);
        if (null === $paths || [] === $paths) {
            return null;
        }
        $entity_ids = array_values(array_unique($entity_ids));
        sort($entity_ids, SORT_NUMERIC);
        $site_paths['tio2-a'] = $paths;
    } elseif ('tio2_product_hub' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $product_path = (string) get_post_meta($post_id, 'public_path', true);
        if (! in_array($product_path, ['/products', '/products/chloride-process-titanium-dioxide'], true)) return null;
        $paths = [$product_path];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_application_hub' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/applications'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_my_editorial' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $page_id = (string) get_post_meta($post_id, '_tio2_editorial_page_id', true);
        $identity = tio2_editorial_identity($page_id);
        if (!$identity) return null;
        $paths = [$identity['path']];
        if (str_starts_with($page_id,'RES-TRADE-')) $paths[]='/resources';
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_market_page' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $path = (string) get_post_meta($post_id, 'public_path', true);
        if (! in_array($path, [
            '/markets/european-union', '/markets/united-kingdom', '/markets/poland', '/markets/spain',
            '/markets/india', '/markets/netherlands', '/markets/belgium',
            '/markets/brazil', '/pt-br/markets/brazil',
        ], true)) return null;
        $paths = [$path];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_resource_hub' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/resources'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_about_page' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/about'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_documents_hub' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/documents'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_doc_tds' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $document_path = get_post_meta($post_id, 'public_path', true);
        if (! in_array($document_path, ['/documents/tds-sds-coa', '/documents/reach', '/documents/certificate-of-origin'], true)) return null;
        $paths = [$document_path];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_request_docs' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/request-documents'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_request_sample' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $paths = ['/request-sample'];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
    } elseif ('tio2_legal_page' === $post->post_type) {
        if (['tio2-my'] !== $site_ids) return null;
        $path = (string) get_post_meta($post_id, 'public_path', true);
        if (! in_array($path, ['/privacy-policy', '/ms/privacy-policy', '/cookie-policy'], true)) return null;
        $paths = [$path];
        $entity_ids = [$post_id];
        $site_paths['tio2-my'] = $paths;
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

    if (function_exists('tio2_my_resource_dependency_paths')) {
        $dependency_paths = tio2_my_resource_dependency_paths($post_id, $scope_state);
        if ([] !== $dependency_paths) {
            $paths = tio2_normalize_webhook_paths(array_merge($paths, $dependency_paths));
            if (null === $paths) return null;
            $site_paths['tio2-my'] = array_values(array_unique(array_merge(
                $site_paths['tio2-my'] ?? [],
                $dependency_paths
            )));
            sort($site_paths['tio2-my'], SORT_STRING);
        }
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
        ! in_array($site_ids[0], tio2_supported_site_ids(), true) ||
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
    if (class_exists('Tio2_Approved_Content_Write') && Tio2_Approved_Content_Write::defer_event($post_id, $affected)) return false;
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

/** Only the approved write service calls this while it owns an InnoDB transaction. */
function tio2_prepare_approved_content_events(array $receipt, array $events): array
{
    if (($receipt['siteId'] ?? null) !== 'tio2-my' || ($receipt['committed'] ?? null) !== true ||
        ($receipt['notificationState'] ?? null) !== 'pending' || !$events || count($events) > 2 ||
        !defined('TIO2_CONTENT_ENVIRONMENT_ID') || !is_string(TIO2_CONTENT_ENVIRONMENT_ID) || TIO2_CONTENT_ENVIRONMENT_ID === '') {
        throw new RuntimeException('write_receipt');
    }
    $paths = []; $entity_ids = []; $post_ids = [];
    $registry = tio2_content_write_registry();
    foreach ($events as $post_id => $affected) {
        $id = filter_var($post_id, FILTER_VALIDATE_INT);
        if (!$id || !is_array($affected) || ($affected['contentId'] ?? null) !== $id ||
            ($affected['siteIds'] ?? null) !== ['tio2-my'] ||
            !isset($affected['sitePaths']['tio2-my']) || !is_array($affected['sitePaths']['tio2-my'])) {
            throw new RuntimeException('write_receipt');
        }
        $page = tio2_content_write_page_for_post($id);
        if ($page === null || !in_array($page,$receipt['changedPages'],true) ||
            ($affected['sitePaths']['tio2-my'] ?? null) !== [$registry[$page]['path']]) throw new RuntimeException('write_receipt');
        $post_ids[$page]=$id;
        $paths[]=$registry[$page]['path'];
        foreach (($affected['entityIds'] ?? []) as $entity_id) $entity_ids[]=$entity_id;
    }
    if (count($post_ids) !== count($receipt['changedPages']) || count($post_ids) > 2) throw new RuntimeException('write_receipt');
    sort($paths,SORT_STRING); $entity_ids=array_values(array_unique($entity_ids)); sort($entity_ids,SORT_NUMERIC);
    $receipt_id=wp_generate_uuid4();
    $first_id=min(array_values($post_ids));
    $payload=tio2_build_webhook_payload($first_id,null,['contentId'=>$first_id,'siteIds'=>['tio2-my'],
        'paths'=>$paths,'entityIds'=>$entity_ids,'sitePaths'=>['tio2-my'=>$paths]]);
    if ($payload === null) throw new RuntimeException('write_receipt');
    $payload['contentRelease']=['releaseId'=>'approved-'.$receipt_id,
        'contentSha256'=>hash('sha256',wp_json_encode($receipt['afterDigests'],JSON_UNESCAPED_SLASHES))];
    $body=tio2_encode_webhook_payload($payload);
    if ($body === null || strlen($body)>64*1024) throw new RuntimeException('write_receipt');
    $receipt['receiptId']=$receipt_id;
    $stored=['version'=>1,'environmentId'=>TIO2_CONTENT_ENVIRONMENT_ID,'receipt'=>$receipt,
        'postIds'=>$post_ids,'payload'=>$payload,'attempts'=>[['eventId'=>$payload['eventId'],'modified'=>$payload['modified']]],
        'notificationState'=>'pending','notificationResults'=>[]];
    if (!add_option('tio2_content_event_'.$receipt_id,$stored,'',false)) throw new RuntimeException('write_receipt');
    return $receipt;
}

/** These receipts are server-owned; no URL, event body or target comes from a retry caller. */
function tio2_load_approved_content_event_receipt(string $receipt_id)
{
    if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D',$receipt_id) ||
        !defined('TIO2_CONTENT_ENVIRONMENT_ID') || !is_string(TIO2_CONTENT_ENVIRONMENT_ID) || TIO2_CONTENT_ENVIRONMENT_ID === '' ||
        wp_using_ext_object_cache()) return new WP_Error('event_receipt','Notification receipt is unavailable.');
    $stored=get_option('tio2_content_event_'.$receipt_id);
    if (!is_array($stored) || ($stored['version'] ?? null)!==1 || ($stored['environmentId'] ?? null)!==TIO2_CONTENT_ENVIRONMENT_ID ||
        ($stored['receipt']['receiptId'] ?? null)!==$receipt_id || ($stored['receipt']['siteId'] ?? null)!=='tio2-my' ||
        ($stored['receipt']['committed'] ?? null)!==true || !in_array($stored['notificationState'] ?? null,['pending','failed','sent'],true) ||
        !is_array($stored['postIds'] ?? null) || count($stored['postIds'])<1 || count($stored['postIds'])>2 ||
        !is_array($stored['payload'] ?? null) || ($stored['payload']['contentRelease']['releaseId'] ?? null)!=='approved-'.$receipt_id ||
        ($stored['payload']['siteIds'] ?? null)!==['tio2-my'] || !is_array($stored['attempts'] ?? null) || count($stored['attempts'])<1 || count($stored['attempts'])>16) {
        return new WP_Error('event_receipt','Notification receipt is invalid.');
    }
    $registry=tio2_content_write_registry(); $paths=[]; $expected_entities=[];
    $pages=array_keys($stored['postIds']); sort($pages,SORT_STRING);
    $after_digests=$stored['receipt']['afterDigests'] ?? null;
    $before_digests=$stored['receipt']['beforeDigests'] ?? null;
    $operation_pages=is_array($after_digests) ? array_keys($after_digests) : []; sort($operation_pages,SORT_STRING);
    if (($stored['receipt']['changedPages'] ?? null)!==$pages ||
        ($stored['receipt']['notificationState'] ?? null)!==$stored['notificationState'] ||
        !in_array($stored['receipt']['operation'] ?? null,['update-published','publish-draft'],true) ||
        !preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/D',(string)($stored['receipt']['approvalId'] ?? '')) ||
        !is_array($after_digests) || !is_array($before_digests) ||
        count($operation_pages)<count($pages) || count($operation_pages)>2 ||
        array_keys($after_digests)!==$operation_pages ||
        array_keys($before_digests)!==$operation_pages ||
        array_diff($pages,$operation_pages)) return new WP_Error('event_receipt','Notification identity is invalid.');
    foreach ($operation_pages as $page) {
        if (!isset($registry[$page])) return new WP_Error('event_receipt','Notification page is invalid.');
        foreach ([$before_digests[$page],$after_digests[$page]] as $digest) {
            if (!is_string($digest) || !preg_match('/^[a-f0-9]{64}$/D',$digest)) return new WP_Error('event_receipt','Notification digest is invalid.');
        }
    }
    foreach ($stored['postIds'] as $page=>$id) {
        $post=is_int($id) && $id>0 ? get_post($id) : null;
        $scopes=$post ? wp_get_post_terms($id,'site_scope',['fields'=>'slugs']) : null;
        if (!isset($registry[$page]) || !$post instanceof WP_Post ||
            $post->post_type!==$registry[$page]['type'] || $post->post_name!==$registry[$page]['slug'] ||
            $scopes!==['tio2-my'] ||
            !current_user_can('edit_post',$id)) return new WP_Error('event_permission','Notification target is unavailable.');
        $type=get_post_type_object(get_post_type($id));
        if (!$type || !current_user_can($type->cap->publish_posts)) return new WP_Error('event_permission','Cannot refresh this content.');
        $paths[]=$registry[$page]['path'];
        if ($page==='APP-000') $expected_entities[]=$id;
    }
    sort($paths,SORT_STRING);
    if (($stored['payload']['paths'] ?? null)!==$paths ||
        ($stored['payload']['entityIds'] ?? null)!==$expected_entities ||
        ($stored['payload']['contentId'] ?? null)!==min(array_values($stored['postIds'])) ||
        ($stored['payload']['contentRelease']['contentSha256'] ?? null)!==hash('sha256',wp_json_encode($stored['receipt']['afterDigests'],JSON_UNESCAPED_SLASHES)) ||
        !is_string($stored['payload']['eventId'] ?? null) ||
        !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/D',$stored['payload']['eventId']) ||
        !is_string($stored['payload']['modified'] ?? null) || strtotime($stored['payload']['modified'])===false ||
        ($stored['attempts'][count($stored['attempts'])-1]['eventId'] ?? null)!==($stored['payload']['eventId'] ?? null) ||
        ($stored['attempts'][count($stored['attempts'])-1]['modified'] ?? null)!==($stored['payload']['modified'] ?? null)) {
        return new WP_Error('event_receipt','Notification target is invalid.');
    }
    return $stored;
}

function tio2_save_approved_content_event_receipt(string $receipt_id,array $stored): bool
{
    $key='tio2_content_event_'.$receipt_id;
    return update_option($key,$stored,false) && get_option($key)===$stored;
}

/** A 2xx is not enough: require the receiver's authenticated JSON acknowledgement. */
function tio2_deliver_approved_content_event(array $payload): array
{
    $config=tio2_get_webhook_config('tio2-my');
    $body=tio2_encode_webhook_payload($payload);
    if ($config===null || $body===null || strlen($body)>64*1024) return ['state'=>'failed','reason'=>'configuration'];
    $response=wp_remote_post($config['url'],['timeout'=>5,'redirection'=>0,'headers'=>[
        'content-type'=>'application/json','x-tio2-signature'=>tio2_sign_webhook_body($body,$config['secret'])], 'body'=>$body]);
    if (is_wp_error($response)) return ['state'=>'failed','reason'=>'transport'];
    $status=wp_remote_retrieve_response_code($response);
    $ack=json_decode(wp_remote_retrieve_body($response),true);
    if ($status>=200 && $status<300 && is_array($ack) && ($ack['ok'] ?? null)===true &&
        ($ack['eventId'] ?? null)===$payload['eventId'] && ($ack['contentRelease'] ?? null)===$payload['contentRelease'] &&
        is_array($ack['revalidatedTags'] ?? null) &&
        is_array($ack['revalidatedPaths'] ?? null)) return ['state'=>'sent','httpStatus'=>$status,'eventId'=>$payload['eventId'],
            'revalidatedTags'=>$ack['revalidatedTags'],'revalidatedPaths'=>$ack['revalidatedPaths']];
    return ['state'=>'failed','httpStatus'=>$status,'reason'=>$status===409?'replay-conflict':'unacknowledged'];
}

function tio2_notify_approved_content_event(string $receipt_id,bool $retry=false)
{
    global $wpdb;
    $lock='d16-content-event-'.hash('sha256',$receipt_id);
    if ((int)$wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s,0)',$lock))!==1) return new WP_Error('event_busy','Notification receipt is busy.');
    try {
        $stored=tio2_load_approved_content_event_receipt($receipt_id);
        if (is_wp_error($stored)) return $stored;
        if ($stored['notificationState']==='sent') return $stored['receipt']+['notificationResults'=>$stored['notificationResults']];
        $payload=$stored['payload'];
        if (abs(time()-strtotime($payload['modified']))>300) {
            if (count($stored['attempts'])>=16) return new WP_Error('event_attempts','Notification retry limit reached.');
            $payload['eventId']=wp_generate_uuid4(); $payload['modified']=gmdate('c');
            $stored['payload']=$payload;
            $stored['attempts'][]=['eventId'=>$payload['eventId'],'modified'=>$payload['modified']];
            if (!tio2_save_approved_content_event_receipt($receipt_id,$stored)) return new WP_Error('event_storage','Cannot persist retry identity.');
        }
        $outcome=tio2_deliver_approved_content_event($payload);
        $stored['notificationState']=$outcome['state'];
        $stored['notificationResults'][]=$outcome;
        if (count($stored['notificationResults'])>16) array_shift($stored['notificationResults']);
        $receipt=$stored['receipt']; $receipt['notificationState']=$outcome['state'];
        $receipt['notificationResults']=$stored['notificationResults'];
        $receipt['eventId']=$payload['eventId'];
        $receipt['retryMayDuplicateInvalidation']=count($stored['attempts'])>1;
        $stored['receipt']=$receipt;
        if (!tio2_save_approved_content_event_receipt($receipt_id,$stored)) {
            $receipt['notificationState']='failed'; $receipt['notificationPersistenceUncertain']=true;
        }
        return $receipt;
    } finally {
        $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)',$lock));
    }
}

function tio2_release_approved_content_events(array $receipt,array $events): array
{
    $result=tio2_notify_approved_content_event($receipt['receiptId']);
    if (is_wp_error($result)) { $receipt['notificationState']='failed'; $receipt['notificationError']=$result->get_error_code(); return $receipt; }
    return $result;
}

/** Retry only the committed notification from its opaque, stored receipt ID. */
function tio2_retry_approved_content_events(string $receipt_id)
{
    if (!is_user_logged_in()) return new WP_Error('event_permission','An actual WordPress actor is required.');
    return tio2_notify_approved_content_event($receipt_id,true);
}

function tio2_is_relevant_webhook_meta_key(string $meta_key, ?int $post_id = null): bool
{
    if (in_array($meta_key, ['_tio2_my_editorial_contract', '_tio2_my_editorial_review', '_tio2_editorial_page_id'], true)) return true;
    if (in_array($meta_key, [
        'public_path',
        'seo_title',
        'seo_description',
        'technical_summary',
        'evidence_source_url',
    ], true)) {
        return true;
    }

    if (null === $post_id && (
        tio2_is_relevant_product_webhook_meta_key($meta_key) ||
        tio2_is_relevant_product_shared_webhook_meta_key($meta_key) ||
        tio2_is_relevant_editorial_webhook_meta_key($meta_key, tio2_application_field_definitions()) ||
        tio2_is_relevant_editorial_webhook_meta_key($meta_key, tio2_resource_field_definitions())
    )) {
        return true;
    }

    $post = null === $post_id ? null : get_post($post_id);
    if (
        $post instanceof WP_Post &&
        'tio2_homepage' === $post->post_type &&
        TIO2_MY_HOMEPAGE_CONTRACT_META === $meta_key &&
        ['tio2-my'] === (tio2_get_site_scope_state($post_id)['siteIds'] ?? [])
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_application_hub' === $post->post_type &&
        TIO2_MY_APPLICATION_HUB_CONTRACT_META === $meta_key &&
        ['tio2-my'] === (tio2_get_site_scope_state($post_id)['siteIds'] ?? [])
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_product_hub' === $post->post_type &&
        (
            (defined('TIO2_MY_PRODUCT_HUB_CONTRACT_META') && TIO2_MY_PRODUCT_HUB_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META') && TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META === $meta_key)
        )
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_market_page' === $post->post_type &&
        (
            (defined('TIO2_MY_EU_MARKET_CONTRACT_META') && TIO2_MY_EU_MARKET_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_UK_MARKET_CONTRACT_META') && TIO2_MY_UK_MARKET_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_POLAND_MARKET_CONTRACT_META') && TIO2_MY_POLAND_MARKET_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_COUNTRY_MARKET_CONTRACT_META') && TIO2_MY_COUNTRY_MARKET_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META') && TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META === $meta_key) ||
            (defined('TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META') && TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META === $meta_key)
        )
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        function_exists('tio2_my_resource_child_dependency_meta_keys') &&
        in_array($meta_key, tio2_my_resource_child_dependency_meta_keys(), true) &&
        tio2_my_resource_hub_references_child($post_id)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_resource_hub' === $post->post_type &&
        in_array($meta_key, [TIO2_MY_RESOURCE_HUB_CONTRACT_META, TIO2_MY_RESOURCE_HUB_RELATIONS_META], true)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_about_page' === $post->post_type &&
        in_array($meta_key, [TIO2_MY_ABOUT_PAGE_CONTRACT_META, TIO2_MY_ABOUT_PAGE_EVIDENCE_META], true)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_documents_hub' === $post->post_type &&
        TIO2_MY_DOCUMENTS_HUB_CONTRACT_META === $meta_key
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_doc_tds' === $post->post_type &&
        in_array($meta_key, [TIO2_MY_DOCUMENT_TDS_CONTRACT_META, TIO2_MY_DOCUMENT_REACH_CONTRACT_META, TIO2_MY_DOCUMENT_COO_CONTRACT_META], true)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_request_docs' === $post->post_type &&
        TIO2_MY_REQUEST_DOCUMENTS_CONTRACT_META === $meta_key
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_request_sample' === $post->post_type &&
        TIO2_MY_REQUEST_SAMPLE_CONTRACT_META === $meta_key
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_legal_page' === $post->post_type &&
        TIO2_MY_LEGAL_PAGE_CONTRACT_META === $meta_key
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_product' === $post->post_type &&
        tio2_is_relevant_product_webhook_meta_key($meta_key)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_document' === $post->post_type &&
        'RES-ORIGIN' === get_post_meta($post_id, 'resource_id', true) &&
        in_array($meta_key, [
            TIO2_MY_RESOURCE_ORIGIN_CONTRACT_META,
            TIO2_MY_RESOURCE_ORIGIN_RELATIONS_META,
            TIO2_MY_RESOURCE_ORIGIN_ARTICLE_METADATA_META,
        ], true)
    ) {
        return true;
    }
    if (
        $post instanceof WP_Post &&
        'tio2_document' === $post->post_type &&
        'RES-PROC' === get_post_meta($post_id, 'resource_id', true) &&
        in_array($meta_key, [
            TIO2_MY_RESOURCE_PROC_CONTRACT_META,
            TIO2_MY_RESOURCE_PROC_RELATIONS_META,
            TIO2_MY_RESOURCE_PROC_SOURCES_META,
            TIO2_MY_RESOURCE_PROC_ARTICLE_METADATA_META,
        ], true)
    ) {
        return true;
    }
    if ($post instanceof WP_Post && 'tio2_application' === $post->post_type) {
        return tio2_is_relevant_editorial_webhook_meta_key($meta_key, tio2_application_field_definitions());
    }
    if ($post instanceof WP_Post && 'tio2_document' === $post->post_type) {
        return tio2_is_relevant_editorial_webhook_meta_key($meta_key, tio2_resource_field_definitions());
    }
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
    if (class_exists('Tio2_Approved_Content_Write') && Tio2_Approved_Content_Write::defer_event($post_id, $affected)) return;
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
    if (class_exists('Tio2_Approved_Content_Write') && Tio2_Approved_Content_Write::active()) return;
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
    // MY contract changes have their own metadata events. Core also emits this
    // hook for unchanged saves; those are not publication transitions.
    if ($new_status === $old_status && function_exists('tio2_content_write_page_for_post') &&
        tio2_content_write_page_for_post((int)$post->ID) !== null) return;
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
