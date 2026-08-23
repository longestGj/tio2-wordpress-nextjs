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
