<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_product_has_approved_public_route(): bool
{
    return false;
}

function tio2_product_rewrite_migration_version(): string
{
    return 'product-public-surface-v0.1';
}

function tio2_maybe_migrate_product_rewrite_rules(): bool
{
    $option_name = 'tio2_product_rewrite_migration_version';
    $target_version = tio2_product_rewrite_migration_version();
    if ($target_version === get_option($option_name)) {
        return false;
    }

    flush_rewrite_rules(false);
    update_option($option_name, $target_version, false);
    return true;
}

/**
 * @param array<string, mixed> $target
 */
function tio2_is_exact_legacy_product_fixture_target(array $target): bool
{
    $keys = array_keys($target);
    sort($keys, SORT_STRING);

    return ['postStatus', 'publicPath', 'siteScopes'] === $keys
        && 'publish' === $target['postStatus']
        && [] === $target['siteScopes']
        && null === $target['publicPath'];
}

function tio2_is_stable_legacy_product_fixture(int $post_id): bool
{
    return $post_id > 0
        && 'tio2_product' === get_post_type($post_id)
        && 'test-product-reference' === get_post_field('post_name', $post_id)
        && 'test-product-reference' === get_post_meta($post_id, '_tio2_seed_fixture_id', true);
}

function tio2_legacy_product_fixture_seed_context_active(int $post_id = 0): bool
{
    $active_post_id = (int) ($GLOBALS['tio2_legacy_product_fixture_seed_post_id'] ?? 0);
    return $active_post_id > 0 && (0 === $post_id || $post_id === $active_post_id);
}

/**
 * Run the one legacy local-fixture write needed by the disposable migration
 * suite. The scope is tied to one stable fixture ID and is always restored.
 *
 * @param array<string, mixed> $target
 * @return mixed
 */
function tio2_with_legacy_product_fixture_seed_context(int $post_id, array $target, callable $callback)
{
    if (! defined('WP_CLI') || ! WP_CLI || ! defined('TIO2_LOCAL_FIXTURE_SEED') || true !== TIO2_LOCAL_FIXTURE_SEED) {
        throw new LogicException('Legacy Product fixture context is available only to the explicit local WP-CLI fixture seed.');
    }
    if (! tio2_is_stable_legacy_product_fixture($post_id)) {
        throw new InvalidArgumentException('Legacy Product fixture context requires the stable test-product-reference record.');
    }
    if (! tio2_is_exact_legacy_product_fixture_target($target)) {
        throw new InvalidArgumentException('Legacy Product fixture context requires the exact legacy publication target.');
    }

    $previous_post_id = $GLOBALS['tio2_legacy_product_fixture_seed_post_id'] ?? null;
    $GLOBALS['tio2_legacy_product_fixture_seed_post_id'] = $post_id;
    try {
        return $callback();
    } finally {
        if (null === $previous_post_id) {
            unset($GLOBALS['tio2_legacy_product_fixture_seed_post_id']);
        } else {
            $GLOBALS['tio2_legacy_product_fixture_seed_post_id'] = $previous_post_id;
        }
    }
}

function tio2_product_candidate_matches_legacy_fixture_context(int $post_id, string $post_status): bool
{
    if (
        'publish' !== $post_status ||
        ! tio2_legacy_product_fixture_seed_context_active($post_id) ||
        ! tio2_is_stable_legacy_product_fixture($post_id)
    ) {
        return false;
    }

    $site_scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes) || [] !== array_values($site_scopes)) {
        return false;
    }

    return '' === get_post_meta($post_id, 'public_path', true);
}

/**
 * @param array<string, mixed> $data
 * @param array<string, mixed> $postarr
 * @param array<string, mixed> $unsanitized_postarr
 * @return array<string, mixed>
 */
function tio2_guard_product_publication(
    array $data,
    array $postarr,
    array $unsanitized_postarr = [],
    bool $update = false
): array {
    if (
        'tio2_product' !== ($data['post_type'] ?? null) ||
        ! in_array($data['post_status'] ?? null, ['publish', 'future'], true)
    ) {
        return $data;
    }

    $post_id = isset($postarr['ID']) ? (int) $postarr['ID'] : 0;
    if (tio2_product_candidate_matches_legacy_fixture_context($post_id, (string) $data['post_status'])) {
        return $data;
    }

    $data['post_status'] = 'draft';
    return $data;
}

function tio2_backstop_product_publication(int $post_id, WP_Post $post, bool $update): void
{
    static $enforcing = false;

    if (
        $enforcing ||
        'tio2_product' !== $post->post_type ||
        ! in_array($post->post_status, ['publish', 'future'], true) ||
        tio2_product_candidate_matches_legacy_fixture_context($post_id, $post->post_status)
    ) {
        return;
    }

    $enforcing = true;
    try {
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    } finally {
        $enforcing = false;
    }
}

/**
 * Keep Product records authorable in authenticated schema workflows without
 * exposing an unapproved Product surface to anonymous GraphQL requests.
 *
 * @param bool|null $is_private
 * @param mixed     $data
 * @return bool|null
 */
function tio2_product_graphql_visibility($is_private, string $model_name, $data)
{
    if (
        0 === get_current_user_id() &&
        'PostObject' === $model_name &&
        $data instanceof WP_Post &&
        'tio2_product' === $data->post_type
    ) {
        return true;
    }

    return $is_private;
}
