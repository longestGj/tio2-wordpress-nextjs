<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @param array<string, string>|null $environment
 * @return array{url: string, secret: string}|null
 */
function tio2_get_preview_config(string $site_id, ?array $environment = null): ?array
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return null;
    }

    $suffix = strtoupper(str_replace('-', '_', $site_id));
    $url_name = 'NEXTJS_PREVIEW_URL_' . $suffix;
    $secret_name = 'NEXTJS_PREVIEW_SECRET_' . $suffix;
    $url = null === $environment ? getenv($url_name) : ($environment[$url_name] ?? '');
    $secret = null === $environment ? getenv($secret_name) : ($environment[$secret_name] ?? '');
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

function tio2_preview_signature_message(string $timestamp, string $site_id, string $path): string
{
    return $timestamp . "\n" . $site_id . "\n" . $path;
}

/**
 * @return true|WP_Error
 */
function tio2_preview_rest_permission(WP_REST_Request $request)
{
    $site_id = (string) $request->get_param('siteId');
    $path = (string) $request->get_param('path');
    $timestamp = (string) $request->get_header('x-tio2-preview-timestamp');
    $signature = (string) $request->get_header('x-tio2-preview-signature');
    $config = tio2_get_preview_config($site_id);

    if (
        null === $config ||
        ! tio2_is_valid_public_path($path) ||
        1 !== preg_match('/^(?:0|[1-9][0-9]{0,12})$/', $timestamp) ||
        abs(time() - (int) $timestamp) > 300 ||
        1 !== preg_match('/^[0-9a-f]{64}$/', $signature)
    ) {
        return new WP_Error('tio2_preview_unauthorized', 'Preview authorization failed.', ['status' => 401]);
    }

    $expected = hash_hmac(
        'sha256',
        tio2_preview_signature_message($timestamp, $site_id, $path),
        $config['secret']
    );
    if (! hash_equals($expected, $signature)) {
        return new WP_Error('tio2_preview_unauthorized', 'Preview authorization failed.', ['status' => 401]);
    }

    return true;
}

/**
 * @return WP_REST_Response|WP_Error
 */
function tio2_preview_rest_response(WP_REST_Request $request)
{
    $site_id = (string) $request->get_param('siteId');
    $path = (string) $request->get_param('path');
    $internal_slug = tio2_build_internal_slug($site_id, $path);
    if (is_wp_error($internal_slug)) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    $post = get_page_by_path($internal_slug, OBJECT, ['page', 'post']);
    if (! $post instanceof WP_Post) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    $route = tio2_get_managed_post_route((int) $post->ID);
    if (
        is_wp_error($route) ||
        $route['siteId'] !== $site_id ||
        $route['publicPath'] !== $path ||
        $route['internalSlug'] !== $post->post_name
    ) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    return new WP_REST_Response([
        'id' => (string) $post->ID,
        'siteId' => $site_id,
        'path' => $path,
        'title' => get_the_title($post),
        'html' => apply_filters('the_content', $post->post_content),
        'modified' => get_post_modified_time('c', true, $post),
        'status' => $post->post_status,
        'seo' => [
            'title' => (string) get_post_meta((int) $post->ID, 'seo_title', true),
            'description' => (string) get_post_meta((int) $post->ID, 'seo_description', true),
        ],
    ], 200);
}

function tio2_register_preview_rest_route(): void
{
    register_rest_route('tio2/v1', '/preview', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => 'tio2_preview_rest_permission',
        'callback' => 'tio2_preview_rest_response',
        'args' => [
            'siteId' => ['required' => true, 'type' => 'string'],
            'path' => ['required' => true, 'type' => 'string'],
        ],
    ]);
}

function tio2_filter_preview_post_link(string $preview_link, WP_Post $post): string
{
    $route = tio2_get_managed_post_route((int) $post->ID);
    if (is_wp_error($route)) {
        return $preview_link;
    }

    $config = tio2_get_preview_config($route['siteId']);
    if (null === $config) {
        return $preview_link;
    }

    $expires = (string) (time() + 300);
    $signature = hash_hmac(
        'sha256',
        tio2_preview_signature_message($expires, $route['siteId'], $route['publicPath']),
        $config['secret']
    );

    return add_query_arg([
        'siteId' => $route['siteId'],
        'path' => $route['publicPath'],
        'expires' => $expires,
        'signature' => $signature,
    ], $config['url']);
}
