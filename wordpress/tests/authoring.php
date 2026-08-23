<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_authoring_smoke_post_ids'] = [];

function tio2_authoring_smoke_fail(string $message): void
{
    if (defined('WP_CLI') && WP_CLI) {
        WP_CLI::error($message);
    }

    throw new RuntimeException($message);
}

function tio2_authoring_smoke_cleanup(): void
{
    foreach ($GLOBALS['tio2_authoring_smoke_post_ids'] ?? [] as $post_id) {
        wp_delete_post((int) $post_id, true);
    }
}

function tio2_authoring_smoke_page(string $suffix, string $path, array $scopes): int
{
    $post_id = wp_insert_post([
        'post_type' => 'page',
        'post_status' => 'draft',
        'post_title' => "TiO2 authoring smoke {$suffix}",
        'post_content' => '<p>Authoring smoke content.</p>',
    ], true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_authoring_smoke_fail("Could not create authoring smoke page {$suffix}");
    }

    $GLOBALS['tio2_authoring_smoke_post_ids'][] = (int) $post_id;
    update_post_meta((int) $post_id, 'public_path', $path);
    $result = wp_set_object_terms((int) $post_id, $scopes, 'site_scope', false);
    if (is_wp_error($result)) {
        tio2_authoring_smoke_fail($result->get_error_message());
    }

    return (int) $post_id;
}

function tio2_authoring_smoke_save(int $post_id): void
{
    do_action('acf/save_post', $post_id);
    clean_post_cache($post_id);
}

register_shutdown_function('tio2_authoring_smoke_cleanup');

add_filter('pre_http_request', static function ($preempt, $args, $url) {
    return [
        'headers' => [],
        'body' => '{"ok":true}',
        'response' => ['code' => 200, 'message' => 'OK'],
        'cookies' => [],
        'filename' => null,
    ];
}, 10, 3);

if (false === has_action('acf/save_post', 'tio2_sync_managed_post_routing')) {
    tio2_authoring_smoke_fail('Managed authoring route synchronizer is not registered');
}

$valid_id = tio2_authoring_smoke_page('valid', '/authoring-smoke/valid', ['tio2-a']);
tio2_authoring_smoke_save($valid_id);
if ('tio2-a--authoring-smoke--valid' !== get_post_field('post_name', $valid_id)) {
    tio2_authoring_smoke_fail('Valid authoring save did not derive the deterministic internal slug');
}

wp_update_post(['ID' => $valid_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($valid_id);
if ('publish' !== get_post_status($valid_id)) {
    tio2_authoring_smoke_fail('Valid managed page was not publishable');
}

wp_update_post(['ID' => $valid_id, 'post_title' => 'Updated authoring smoke title']);
tio2_authoring_smoke_save($valid_id);
if ('tio2-a--authoring-smoke--valid' !== get_post_field('post_name', $valid_id)) {
    tio2_authoring_smoke_fail('Title edit changed the deterministic internal slug');
}

update_post_meta($valid_id, 'public_path', '/authoring-smoke/renamed');
tio2_authoring_smoke_save($valid_id);
if ('tio2-a--authoring-smoke--renamed' !== get_post_field('post_name', $valid_id)) {
    tio2_authoring_smoke_fail('Public-path edit did not rederive the internal slug');
}

wp_set_object_terms($valid_id, ['tio2-b'], 'site_scope', false);
tio2_authoring_smoke_save($valid_id);
if ('tio2-b--authoring-smoke--renamed' !== get_post_field('post_name', $valid_id)) {
    tio2_authoring_smoke_fail('Site-scope edit did not rederive the internal slug');
}

$duplicate_draft_id = tio2_authoring_smoke_page(
    'duplicate draft',
    '/authoring-smoke/renamed',
    ['tio2-b']
);
$previous_post_id = $_POST['post_ID'] ?? null;
$_POST['post_ID'] = (string) $duplicate_draft_id;
$duplicate_validation = apply_filters(
    'acf/validate_value/name=public_path',
    true,
    '/authoring-smoke/renamed',
    [],
    'acf[field_tio2_public_path]'
);
if (null === $previous_post_id) {
    unset($_POST['post_ID']);
} else {
    $_POST['post_ID'] = $previous_post_id;
}
if (! is_string($duplicate_validation) || ! str_contains($duplicate_validation, 'already owns')) {
    tio2_authoring_smoke_fail('Normal Admin validation did not reject duplicate route ownership before save');
}
tio2_authoring_smoke_save($duplicate_draft_id);
$duplicate_draft_route = tio2_get_managed_post_route($duplicate_draft_id);
if (
    ! is_wp_error($duplicate_draft_route) ||
    'tio2_duplicate_route' !== $duplicate_draft_route->get_error_code() ||
    'tio2_duplicate_route' !== get_post_meta($duplicate_draft_id, '_tio2_route_error', true)
) {
    tio2_authoring_smoke_fail('Duplicate draft route ownership was not rejected with an Admin error');
}

$duplicate_publish_id = tio2_authoring_smoke_page(
    'duplicate publish',
    '/authoring-smoke/renamed',
    ['tio2-b']
);
wp_update_post(['ID' => $duplicate_publish_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($duplicate_publish_id);
if (
    'draft' !== get_post_status($duplicate_publish_id) ||
    'tio2_duplicate_route' !== get_post_meta($duplicate_publish_id, '_tio2_route_error', true)
) {
    tio2_authoring_smoke_fail('Published duplicate route ownership was not forced to draft with an Admin error');
}

$trashed_owner_id = tio2_authoring_smoke_page(
    'trashed owner',
    '/authoring-smoke/trashed-owner',
    ['tio2-a']
);
tio2_authoring_smoke_save($trashed_owner_id);
wp_trash_post($trashed_owner_id);
$trashed_collision_id = tio2_authoring_smoke_page(
    'trashed collision',
    '/authoring-smoke/trashed-owner',
    ['tio2-a']
);
tio2_authoring_smoke_save($trashed_collision_id);
$trashed_collision_route = tio2_get_managed_post_route($trashed_collision_id);
if (! is_wp_error($trashed_collision_route) || 'tio2_duplicate_route' !== $trashed_collision_route->get_error_code()) {
    tio2_authoring_smoke_fail('A trashed route owner did not reserve its exact site and public path');
}

$required_collision_slug = 'tio2-a--authoring-smoke--slug-collision';
$preserve_collision_slug = static function ($sanitized, $raw_title, $context) use ($required_collision_slug) {
    return 'save' === $context && $raw_title === $required_collision_slug
        ? $required_collision_slug
        : $sanitized;
};
add_filter('sanitize_title', $preserve_collision_slug, 10, 3);
try {
    $slug_blocker_id = wp_insert_post([
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_name' => $required_collision_slug,
        'post_title' => 'Unmanaged slug blocker',
    ], true);
} finally {
    remove_filter('sanitize_title', $preserve_collision_slug, 10);
}
if (is_wp_error($slug_blocker_id) || $slug_blocker_id <= 0) {
    tio2_authoring_smoke_fail('Could not create exact slug collision fixture');
}
$GLOBALS['tio2_authoring_smoke_post_ids'][] = (int) $slug_blocker_id;
$slug_collision_id = tio2_authoring_smoke_page(
    'slug collision',
    '/authoring-smoke/slug-collision',
    ['tio2-a']
);
wp_update_post(['ID' => $slug_collision_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($slug_collision_id);
if (
    'draft' !== get_post_status($slug_collision_id) ||
    $required_collision_slug === get_post_field('post_name', $slug_collision_id) ||
    'tio2_slug_collision' !== get_post_meta($slug_collision_id, '_tio2_route_error', true)
) {
    tio2_authoring_smoke_fail('WordPress slug suffixing was not detected and blocked');
}

$zero_scope_id = tio2_authoring_smoke_page('zero scope', '/authoring-smoke/zero-scope', []);
wp_update_post(['ID' => $zero_scope_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($zero_scope_id);
if ('draft' !== get_post_status($zero_scope_id)) {
    tio2_authoring_smoke_fail('Published managed page with zero site scopes was not blocked');
}

$multiple_scope_id = tio2_authoring_smoke_page(
    'multiple scope',
    '/authoring-smoke/multiple-scope',
    ['tio2-a', 'tio2-b']
);
wp_update_post(['ID' => $multiple_scope_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($multiple_scope_id);
if ('draft' !== get_post_status($multiple_scope_id)) {
    tio2_authoring_smoke_fail('Published managed page with multiple site scopes was not blocked');
}

$invalid_path_id = tio2_authoring_smoke_page('invalid path', '/Authoring Smoke', ['tio2-a']);
wp_update_post(['ID' => $invalid_path_id, 'post_status' => 'publish']);
tio2_authoring_smoke_save($invalid_path_id);
if ('draft' !== get_post_status($invalid_path_id)) {
    tio2_authoring_smoke_fail('Published managed page with an invalid public path was not blocked');
}

tio2_authoring_smoke_cleanup();
$GLOBALS['tio2_authoring_smoke_post_ids'] = [];
fwrite(STDOUT, "TiO2 managed authoring smoke test passed\n");
