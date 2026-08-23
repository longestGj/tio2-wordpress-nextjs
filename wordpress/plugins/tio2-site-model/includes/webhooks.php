<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @param array<string, string>|null $environment
 * @return array{url: string, secret: string}|null
 */
function tio2_get_webhook_config(?array $environment = null): ?array
{
    $url = null === $environment
        ? getenv('NEXTJS_REVALIDATION_URL')
        : ($environment['NEXTJS_REVALIDATION_URL'] ?? '');
    $secret = null === $environment
        ? getenv('NEXTJS_REVALIDATION_SECRET')
        : ($environment['NEXTJS_REVALIDATION_SECRET'] ?? '');

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
    return array_merge(['page', 'post'], array_keys(tio2_content_type_definitions()));
}

function tio2_is_valid_webhook_path(string $path): bool
{
    if (
        '' === $path ||
        strlen($path) > 200 ||
        ! str_starts_with($path, '/') ||
        str_starts_with($path, '//') ||
        false !== strpbrk($path, "?#\\%") ||
        1 === preg_match('/[\x00-\x1F\x7F]/', $path)
    ) {
        return false;
    }

    $segments = explode('/', $path);
    $last_index = count($segments) - 1;
    foreach ($segments as $index => $segment) {
        if (
            '.' === $segment ||
            '..' === $segment ||
            ($index > 0 && '' === $segment && $index < $last_index)
        ) {
            return false;
        }
    }

    return true;
}

/**
 * @return array{eventId: string, siteIds: list<string>, contentId: int, paths: list<string>, entityIds: list<int>, modified: string}|null
 */
function tio2_build_webhook_payload(int $post_id, ?string $modified = null): ?array
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || ! in_array($post->post_type, tio2_webhook_post_types(), true)) {
        return null;
    }

    $site_ids = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_ids)) {
        return null;
    }

    $site_ids = array_values(array_unique(array_intersect(
        ['tio2-a', 'tio2-b'],
        array_map('strval', $site_ids)
    )));
    sort($site_ids, SORT_STRING);

    $paths = [];
    $entity_ids = [];
    if (in_array($post->post_type, ['page', 'post'], true)) {
        $public_path = (string) get_post_meta($post_id, 'public_path', true);
        if (empty($site_ids) || ! tio2_is_valid_webhook_path($public_path)) {
            return null;
        }
        $paths[] = $public_path;
    } else {
        if (empty($site_ids)) {
            $site_ids = ['tio2-a', 'tio2-b'];
        }
        $entity_ids[] = $post_id;
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

function tio2_send_webhook(int $post_id): bool
{
    $config = tio2_get_webhook_config();
    if (null === $config) {
        return false;
    }

    $payload = tio2_build_webhook_payload($post_id);
    if (null === $payload) {
        return false;
    }

    $body = tio2_encode_webhook_payload($payload);
    if (null === $body) {
        return false;
    }

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
        return false;
    }

    $status = wp_remote_retrieve_response_code($response);
    return $status >= 200 && $status < 300;
}

function tio2_is_relevant_webhook_meta_key(string $meta_key): bool
{
    return in_array($meta_key, [
        'public_path',
        'seo_title',
        'seo_description',
        'technical_summary',
        'evidence_source_url',
    ], true);
}

function tio2_queue_webhook(int $post_id): void
{
    if (! isset($GLOBALS['tio2_webhook_queue']) || ! is_array($GLOBALS['tio2_webhook_queue'])) {
        $GLOBALS['tio2_webhook_queue'] = [];
    }

    $GLOBALS['tio2_webhook_queue'][$post_id] = true;
}

function tio2_flush_webhook_queue(): void
{
    $queued_ids = isset($GLOBALS['tio2_webhook_queue']) && is_array($GLOBALS['tio2_webhook_queue'])
        ? array_keys($GLOBALS['tio2_webhook_queue'])
        : [];
    $GLOBALS['tio2_webhook_queue'] = [];

    foreach ($queued_ids as $post_id) {
        tio2_send_webhook((int) $post_id);
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
 * @param mixed $meta_value
 */
function tio2_handle_post_meta_change(int $meta_id, int $post_id, string $meta_key, $meta_value): void
{
    if (! tio2_is_relevant_webhook_meta_key($meta_key)) {
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
