<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_assert_publication_exact_keys(array $value, array $expected_keys, string $context): void
{
    $actual_keys = array_keys($value);
    sort($actual_keys, SORT_STRING);
    sort($expected_keys, SORT_STRING);
    if ($actual_keys !== $expected_keys) {
        throw new InvalidArgumentException("Unexpected public route inventory keys: {$context}.");
    }
}

function tio2_load_public_route_inventory_from_json(string $json): array
{
    try {
        $inventory = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new InvalidArgumentException('Invalid public route inventory JSON.', 0, $error);
    }

    if (! is_array($inventory) || array_is_list($inventory)) {
        throw new InvalidArgumentException('Public route inventory must be an object.');
    }
    tio2_assert_publication_exact_keys($inventory, ['version', 'sites'], 'root');
    if (
        'root-only-v0.1' !== ($inventory['version'] ?? null) ||
        ! is_array($inventory['sites']) ||
        array_is_list($inventory['sites'])
    ) {
        throw new InvalidArgumentException('Public route inventory root is invalid.');
    }
    tio2_assert_publication_exact_keys($inventory['sites'], ['tio2-a', 'tio2-b'], 'sites');

    $expected_templates = [
        'tio2-a' => 'site-a-homepage-active',
        'tio2-b' => 'site-b-homepage-v0.1-frozen',
    ];
    foreach ($expected_templates as $site_id => $expected_template) {
        $site = $inventory['sites'][$site_id];
        if (! is_array($site) || array_is_list($site)) {
            throw new InvalidArgumentException("Public route inventory site is invalid: {$site_id}.");
        }
        tio2_assert_publication_exact_keys($site, ['expectedPublicUrls', 'routes'], "site {$site_id}");
        if (! is_array($site['routes']) || ! array_is_list($site['routes'])) {
            throw new InvalidArgumentException("Public route list is invalid: {$site_id}.");
        }

        $paths = [];
        foreach ($site['routes'] as $route) {
            if (! is_array($route) || array_is_list($route)) {
                throw new InvalidArgumentException("Public route is invalid: {$site_id}.");
            }
            tio2_assert_publication_exact_keys($route, ['path', 'template'], "route {$site_id}");
            if (! is_string($route['path'])) {
                throw new InvalidArgumentException("Public route path is invalid: {$site_id}.");
            }
            if (in_array($route['path'], $paths, true)) {
                throw new InvalidArgumentException("Duplicate public route: {$site_id} {$route['path']}.");
            }
            $paths[] = $route['path'];
        }

        if (1 !== count($site['routes'])) {
            throw new InvalidArgumentException("Public route inventory must contain one root route: {$site_id}.");
        }
        if (! is_int($site['expectedPublicUrls']) || count($site['routes']) !== $site['expectedPublicUrls']) {
            throw new InvalidArgumentException("Expected public URL count mismatch: {$site_id}.");
        }

        $route = $site['routes'][0];
        if ('/' !== $route['path']) {
            throw new InvalidArgumentException("Public route path is not canonical: {$site_id}.");
        }
        if ($expected_template !== ($route['template'] ?? null)) {
            throw new InvalidArgumentException("Public route template is invalid: {$site_id}.");
        }
    }

    return $inventory;
}

function tio2_load_public_route_inventory(): array
{
    $json = file_get_contents(dirname(__DIR__) . '/config/public-routes.json');
    if (false === $json) {
        throw new RuntimeException('Could not read the public route inventory.');
    }

    return tio2_load_public_route_inventory_from_json($json);
}

function tio2_publication_route_is_approved(string $site_id, string $public_path): bool
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return false;
    }

    try {
        $inventory = tio2_load_public_route_inventory();
    } catch (Throwable $error) {
        return false;
    }

    foreach ($inventory['sites'][$site_id]['routes'] as $route) {
        if ($public_path === $route['path']) {
            return true;
        }
    }
    return false;
}

/**
 * @return true|WP_Error
 */
function tio2_validate_managed_publication_candidate(
    string $post_type,
    string $post_status,
    ?string $site_id,
    ?string $public_path,
    int $post_id
) {
    if (! in_array($post_type, ['page', 'post'], true) || ! in_array($post_status, ['publish', 'future'], true)) {
        return true;
    }
    if (null === $site_id || ! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return new WP_Error(
            'tio2_publication_invalid_site_scope',
            'This Page or Post cannot be published because it must have exactly one supported site scope.'
        );
    }
    if (null === $public_path || ! tio2_is_valid_public_path($public_path)) {
        return new WP_Error(
            'tio2_publication_invalid_public_path',
            'This Page or Post cannot be published because its public path is not normalized.'
        );
    }
    if ('/' === $public_path) {
        return new WP_Error(
            'tio2_publication_homepage_reserved',
            'The site root can be published only by its dedicated TiO2 Homepage record.'
        );
    }

    $owners = tio2_find_managed_route_post_ids($site_id, $public_path);
    $expected_owners = $post_id > 0 ? [$post_id] : [];
    if ($owners !== $expected_owners) {
        return new WP_Error(
            'tio2_publication_duplicate_route',
            'This Page or Post cannot be published because its site scope and public path do not have exactly one owner.'
        );
    }

    try {
        $inventory = tio2_load_public_route_inventory();
    } catch (Throwable $error) {
        return new WP_Error(
            'tio2_publication_inventory_invalid',
            'This Page or Post cannot be published because the public route inventory is unavailable.'
        );
    }
    foreach ($inventory['sites'][$site_id]['routes'] as $route) {
        if ($public_path === $route['path']) {
            return true;
        }
    }

    return new WP_Error(
        'tio2_publication_route_not_approved',
        'This Page or Post cannot be published because its exact site path is absent from the approved public route inventory.'
    );
}

/**
 * @param mixed $submitted
 */
function tio2_publication_resolve_submitted_site_scope($submitted): ?string
{
    if (is_array($submitted) && array_key_exists('site_scope', $submitted)) {
        $submitted = $submitted['site_scope'];
    }
    $values = is_array($submitted) ? $submitted : explode(',', (string) $submitted);
    $slugs = [];
    foreach ($values as $value) {
        if (! is_scalar($value)) {
            return null;
        }
        $raw_value = trim((string) $value);
        if ('' === $raw_value) {
            continue;
        }
        if (ctype_digit($raw_value)) {
            $term = get_term((int) $raw_value, 'site_scope');
        } else {
            $normalized_slug = sanitize_title($raw_value);
            if ($normalized_slug !== $raw_value) {
                return null;
            }
            $term = get_term_by('slug', $normalized_slug, 'site_scope');
        }
        if (! $term instanceof WP_Term || ! in_array($term->slug, ['tio2-a', 'tio2-b'], true)) {
            return null;
        }
        $slugs[] = $term->slug;
    }
    $slugs = array_values(array_unique($slugs));
    return 1 === count($slugs) && in_array($slugs[0], ['tio2-a', 'tio2-b'], true)
        ? $slugs[0]
        : null;
}

/**
 * @return array{siteId: ?string, publicPath: ?string}
 */
function tio2_publication_resolve_candidate_route(int $post_id, array $postarr): array
{
    $site_id = null;
    $has_submitted_scope = false;
    foreach ([$postarr, $_POST] as $source) {
        if (isset($source['tax_input']) && is_array($source['tax_input']) && array_key_exists('site_scope', $source['tax_input'])) {
            $has_submitted_scope = true;
            $site_id = tio2_publication_resolve_submitted_site_scope(
                wp_unslash($source['tax_input']['site_scope'])
            );
            break;
        }
        if (array_key_exists('site_scope', $source)) {
            $has_submitted_scope = true;
            $site_id = tio2_publication_resolve_submitted_site_scope(wp_unslash($source['site_scope']));
            break;
        }
    }
    if (! $has_submitted_scope && $post_id > 0) {
        $slugs = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
        if (! is_wp_error($slugs)) {
            $slugs = array_values(array_unique(array_map('strval', $slugs)));
            $site_id = 1 === count($slugs) && in_array($slugs[0], ['tio2-a', 'tio2-b'], true)
                ? $slugs[0]
                : null;
        }
    }

    $public_path = null;
    $has_submitted_path = false;
    foreach ([$postarr, $_POST] as $source) {
        if (isset($source['meta_input']) && is_array($source['meta_input']) && array_key_exists('public_path', $source['meta_input'])) {
            $has_submitted_path = true;
            $value = wp_unslash($source['meta_input']['public_path']);
            $public_path = is_string($value) ? $value : null;
            break;
        }
        if (isset($source['acf']) && is_array($source['acf'])) {
            foreach (['field_tio2_public_path', 'public_path'] as $field_key) {
                if (array_key_exists($field_key, $source['acf'])) {
                    $has_submitted_path = true;
                    $value = wp_unslash($source['acf'][$field_key]);
                    $public_path = is_string($value) ? $value : null;
                    break 2;
                }
            }
        }
    }
    if (! $has_submitted_path && $post_id > 0) {
        $value = get_post_meta($post_id, 'public_path', true);
        $public_path = is_string($value) ? $value : null;
    }

    return ['siteId' => $site_id, 'publicPath' => $public_path];
}

/**
 * @param array<string, mixed> $data
 * @param array<string, mixed> $postarr
 * @param array<string, mixed> $unsanitized_postarr
 * @return array<string, mixed>
 */
function tio2_guard_managed_publication(
    array $data,
    array $postarr,
    array $unsanitized_postarr = [],
    bool $update = false
): array {
    $post_type = isset($data['post_type']) ? (string) wp_unslash($data['post_type']) : '';
    $post_status = isset($data['post_status']) ? (string) wp_unslash($data['post_status']) : '';
    if (! in_array($post_type, ['page', 'post'], true) || ! in_array($post_status, ['publish', 'future'], true)) {
        return $data;
    }

    $post_id = isset($postarr['ID']) ? (int) $postarr['ID'] : 0;
    if (function_exists('tio2_root_only_restore_context_active') && tio2_root_only_restore_context_active()) {
        if (tio2_root_only_restore_candidate_allowed($post_id, $post_type, $post_status)) {
            return $data;
        }
        wp_die(
            new WP_Error(
                'tio2_root_only_restore_tuple_rejected',
                'Publication is outside the checksum-bound root-only restore allowlist.'
            ),
            'Publication blocked',
            ['response' => 409, 'back_link' => true, 'code' => 'tio2_root_only_restore_tuple_rejected']
        );
    }
    $route = tio2_publication_resolve_candidate_route($post_id, $unsanitized_postarr + $postarr);
    $validation = tio2_validate_managed_publication_candidate(
        $post_type,
        $post_status,
        $route['siteId'],
        $route['publicPath'],
        $post_id
    );
    if (is_wp_error($validation)) {
        wp_die($validation, 'Publication blocked', [
            'response' => 409,
            'back_link' => true,
            'code' => $validation->get_error_code(),
        ]);
    }

    return $data;
}

/**
 * @param mixed $prepared_post
 * @return mixed
 */
function tio2_guard_managed_rest_publication($prepared_post, WP_REST_Request $request)
{
    if (is_wp_error($prepared_post) || ! is_object($prepared_post)) {
        return $prepared_post;
    }
    $post_type = (string) ($prepared_post->post_type ?? '');
    $post_status = (string) ($prepared_post->post_status ?? '');
    if (! in_array($post_type, ['page', 'post'], true) || ! in_array($post_status, ['publish', 'future'], true)) {
        return $prepared_post;
    }

    $post_id = (int) $request->get_param('id');
    $request_values = $request->get_params();
    $route = tio2_publication_resolve_candidate_route($post_id, is_array($request_values) ? $request_values : []);
    $validation = tio2_validate_managed_publication_candidate(
        $post_type,
        $post_status,
        $route['siteId'],
        $route['publicPath'],
        $post_id
    );
    if (is_wp_error($validation)) {
        $validation->add_data(['status' => 409]);
        return $validation;
    }
    return $prepared_post;
}
