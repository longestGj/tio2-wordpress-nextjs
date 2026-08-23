<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_register_acf_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }

    $technical_locations = [];
    foreach (array_keys(tio2_content_type_definitions()) as $post_type) {
        $technical_locations[] = [[
            'param' => 'post_type',
            'operator' => '==',
            'value' => $post_type,
        ]];
    }

    acf_add_local_field_group([
        'key' => 'group_tio2_technical_fields',
        'title' => 'TiO2 Technical Fields',
        'fields' => [
            [
                'key' => 'field_tio2_technical_summary',
                'label' => 'Technical Summary',
                'name' => 'technical_summary',
                'type' => 'textarea',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_evidence_source_url',
                'label' => 'Evidence Source URL',
                'name' => 'evidence_source_url',
                'type' => 'url',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
        ],
        'location' => $technical_locations,
        'show_in_graphql' => 1,
        'graphql_field_name' => 'technicalFields',
    ]);

    acf_add_local_field_group([
        'key' => 'group_tio2_publishing_fields',
        'title' => 'TiO2 Publishing Fields',
        'fields' => [
            [
                'key' => 'field_tio2_public_path',
                'label' => 'Public Path',
                'name' => 'public_path',
                'type' => 'text',
                'required' => 1,
                'instructions' => 'Enter a leading-slash path without a protocol, query string, or fragment.',
                'placeholder' => '/products/example',
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_seo_title',
                'label' => 'SEO Title',
                'name' => 'seo_title',
                'type' => 'text',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_seo_description',
                'label' => 'SEO Description',
                'name' => 'seo_description',
                'type' => 'textarea',
                'required' => 0,
                'rows' => 3,
                'show_in_graphql' => 1,
            ],
        ],
        'location' => [
            [[
                'param' => 'post_type',
                'operator' => '==',
                'value' => 'page',
            ]],
            [[
                'param' => 'post_type',
                'operator' => '==',
                'value' => 'post',
            ]],
        ],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'publishingFields',
    ]);
}

/**
 * @param mixed $valid
 * @param mixed $value
 * @param mixed $field
 * @param mixed $input_name
 * @return mixed
 */
function tio2_validate_public_path($valid, $value, $field, $input_name)
{
    if (true !== $valid) {
        return $valid;
    }

    if (! is_string($value) || ! tio2_is_valid_public_path($value)) {
        return 'Public path must be / or lowercase slash-separated words using letters, numbers, and single hyphens.';
    }

    $post_id = tio2_get_authoring_post_id();
    $site_id = tio2_get_authoring_site_scope($post_id);
    if (null !== $site_id) {
        $other_owners = array_values(array_filter(
            tio2_find_managed_route_post_ids($site_id, $value),
            static fn (int $owner_id): bool => $owner_id !== $post_id
        ));
        if ([] !== $other_owners) {
            return 'Another Page or Post already owns this site scope and public path.';
        }
    }

    return true;
}

function tio2_get_authoring_post_id(): int
{
    foreach (['post_ID', 'post_id'] as $key) {
        if (isset($_POST[$key]) && is_scalar($_POST[$key])) {
            $post_id = (int) wp_unslash((string) $_POST[$key]);
            if ($post_id > 0) {
                return $post_id;
            }
        }
    }

    if (function_exists('acf_get_form_data')) {
        $post_id = (int) acf_get_form_data('post_id');
        if ($post_id > 0) {
            return $post_id;
        }
    }

    return 0;
}

function tio2_get_authoring_site_scope(int $post_id): ?string
{
    $submitted = $_POST['tax_input']['site_scope'] ?? null;
    if (null !== $submitted) {
        $submitted = wp_unslash($submitted);
        $values = is_array($submitted) ? $submitted : explode(',', (string) $submitted);
        $slugs = [];
        foreach ($values as $value) {
            if (! is_scalar($value) || '' === trim((string) $value)) {
                continue;
            }
            $term = ctype_digit((string) $value)
                ? get_term((int) $value, 'site_scope')
                : get_term_by('slug', sanitize_title((string) $value), 'site_scope');
            if ($term instanceof WP_Term) {
                $slugs[] = $term->slug;
            }
        }
        $slugs = array_values(array_unique($slugs));
        return 1 === count($slugs) && in_array($slugs[0], ['tio2-a', 'tio2-b'], true)
            ? $slugs[0]
            : null;
    }

    if ($post_id <= 0) {
        return null;
    }
    $slugs = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($slugs)) {
        return null;
    }
    $slugs = array_values(array_unique(array_map('strval', $slugs)));
    return 1 === count($slugs) && in_array($slugs[0], ['tio2-a', 'tio2-b'], true)
        ? $slugs[0]
        : null;
}

function tio2_is_valid_public_path(string $path): bool
{
    return strlen($path) <= 172 &&
        1 === preg_match('~^/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$~', $path);
}

/**
 * @return string|WP_Error
 */
function tio2_build_internal_slug(string $site_id, string $public_path)
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return new WP_Error('tio2_invalid_site_scope', 'Managed content must have exactly one supported site scope.');
    }
    if (! tio2_is_valid_public_path($public_path)) {
        return new WP_Error('tio2_invalid_public_path', 'Managed content has an invalid public path.');
    }

    $path_slug = '/' === $public_path
        ? 'home'
        : str_replace('/', '--', substr($public_path, 1));
    $internal_slug = $site_id . '--' . $path_slug;

    if (strlen($internal_slug) > 180) {
        return new WP_Error('tio2_internal_slug_too_long', 'Managed content internal slug exceeds 180 characters.');
    }

    return $internal_slug;
}

/**
 * @return array{siteId: string, publicPath: string, internalSlug: string}|WP_Error
 */
function tio2_get_managed_post_route_identity(int $post_id)
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || ! in_array($post->post_type, ['page', 'post'], true)) {
        return new WP_Error('tio2_not_managed_content', 'Only WordPress Pages and Posts use managed site routing.');
    }

    $site_scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes)) {
        return $site_scopes;
    }
    $site_scopes = array_values(array_unique(array_map('strval', $site_scopes)));
    if (1 !== count($site_scopes) || ! in_array($site_scopes[0], ['tio2-a', 'tio2-b'], true)) {
        return new WP_Error('tio2_invalid_site_scope', 'Managed content must have exactly one supported site scope.');
    }

    $public_path = (string) get_post_meta($post_id, 'public_path', true);
    $internal_slug = tio2_build_internal_slug($site_scopes[0], $public_path);
    if (is_wp_error($internal_slug)) {
        return $internal_slug;
    }

    return [
        'siteId' => $site_scopes[0],
        'publicPath' => $public_path,
        'internalSlug' => $internal_slug,
    ];
}

/**
 * Drafts and trashed content reserve their route until the owner is permanently
 * deleted or assigned another route. This prevents ambiguous previews and later
 * publication collisions.
 *
 * @return list<int>
 */
function tio2_find_managed_route_post_ids(string $site_id, string $public_path): array
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true) || ! tio2_is_valid_public_path($public_path)) {
        return [];
    }

    $candidate_ids = get_posts([
        'post_type' => ['page', 'post'],
        'post_status' => ['publish', 'future', 'draft', 'pending', 'private', 'trash', 'auto-draft'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
        'meta_key' => 'public_path',
        'meta_value' => $public_path,
    ]);
    $owners = [];
    foreach ($candidate_ids as $candidate_id) {
        $identity = tio2_get_managed_post_route_identity((int) $candidate_id);
        if (
            ! is_wp_error($identity) &&
            $identity['siteId'] === $site_id &&
            $identity['publicPath'] === $public_path
        ) {
            $owners[] = (int) $candidate_id;
        }
    }

    return $owners;
}

/**
 * @return array{siteId: string, publicPath: string, internalSlug: string}|WP_Error
 */
function tio2_get_managed_post_route(int $post_id)
{
    $identity = tio2_get_managed_post_route_identity($post_id);
    if (is_wp_error($identity)) {
        return $identity;
    }
    $owners = tio2_find_managed_route_post_ids($identity['siteId'], $identity['publicPath']);
    if (1 !== count($owners) || $owners[0] !== $post_id) {
        return new WP_Error(
            'tio2_duplicate_route',
            'Another Page or Post already owns this site scope and public path.'
        );
    }

    return $identity;
}

function tio2_record_route_error(int $post_id, WP_Error $error): void
{
    update_post_meta($post_id, '_tio2_route_error', $error->get_error_code());
    $status = get_post_status($post_id);
    if (in_array($status, ['publish', 'future', 'pending', 'private'], true)) {
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    }
}

function tio2_managed_route_admin_notice(): void
{
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id <= 0) {
        return;
    }
    $error_code = (string) get_post_meta($post_id, '_tio2_route_error', true);
    $messages = [
        'tio2_duplicate_route' => 'This content is a draft because another Page or Post owns the same site scope and public path.',
        'tio2_slug_collision' => 'This content is a draft because WordPress could not preserve its deterministic internal slug.',
        'tio2_invalid_site_scope' => 'This content is a draft because it must have exactly one supported site scope.',
        'tio2_invalid_public_path' => 'This content is a draft because its public path is invalid.',
    ];
    if (! isset($messages[$error_code])) {
        return;
    }
    echo '<div class="notice notice-error"><p>' . esc_html($messages[$error_code]) . '</p></div>';
}

/**
 * Enforce the final WordPress Admin/ACF save state after terms and fields exist.
 * Invalid managed content may remain a draft, but cannot remain published.
 *
 * @param int|string $post_id
 */
function tio2_sync_managed_post_routing($post_id): void
{
    $post_id = (int) $post_id;
    if ($post_id <= 0 || ! empty($GLOBALS['tio2_syncing_managed_post_routing'])) {
        return;
    }

    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        ! in_array($post->post_type, ['page', 'post'], true) ||
        wp_is_post_revision($post_id) ||
        wp_is_post_autosave($post_id)
    ) {
        return;
    }

    $route = tio2_get_managed_post_route($post_id);
    $GLOBALS['tio2_syncing_managed_post_routing'] = true;
    try {
        if (is_wp_error($route)) {
            tio2_record_route_error($post_id, $route);
            return;
        }

        if ($route['internalSlug'] === $post->post_name) {
            delete_post_meta($post_id, '_tio2_route_error');
            return;
        }

        $required_slug = $route['internalSlug'];
        $preserve_required_slug = static function ($sanitized, $raw_title, $context) use ($required_slug) {
            return 'save' === $context && $raw_title === $required_slug
                ? $required_slug
                : $sanitized;
        };
        add_filter('sanitize_title', $preserve_required_slug, 10, 3);
        try {
            $update_result = wp_update_post(['ID' => $post_id, 'post_name' => $required_slug], true);
        } finally {
            remove_filter('sanitize_title', $preserve_required_slug, 10);
        }
        clean_post_cache($post_id);
        if (is_wp_error($update_result) || $required_slug !== get_post_field('post_name', $post_id)) {
            tio2_record_route_error(
                $post_id,
                new WP_Error('tio2_slug_collision', 'WordPress could not preserve the deterministic internal slug.')
            );
            return;
        }
        delete_post_meta($post_id, '_tio2_route_error');
    } finally {
        $GLOBALS['tio2_syncing_managed_post_routing'] = false;
    }
}

function tio2_preserve_internal_slug(string $sanitized, string $raw_title, string $context): string
{
    $internal_slug_pattern = '~^tio2-(?:a|b)--(?:home|[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)*)$~';

    if (
        'query' === $context &&
        strlen($raw_title) <= 180 &&
        1 === preg_match($internal_slug_pattern, $raw_title)
    ) {
        return $raw_title;
    }

    return $sanitized;
}
