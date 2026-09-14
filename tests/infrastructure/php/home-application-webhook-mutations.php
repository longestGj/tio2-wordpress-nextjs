<?php
declare(strict_types=1);

// Run the real queue, payload and signing functions; replace only WP storage and HTTP.
define('ABSPATH', __DIR__);
define('TIO2_MY_HOMEPAGE_CONTRACT_META', '_tio2_my_homepage_contract_json');
define('TIO2_MY_APPLICATION_HUB_CONTRACT_META', '_tio2_my_application_hub_contract_json');
final class WP_Post {
    public int $ID = 42;
    public string $post_type = 'tio2_homepage';
    public string $post_status = 'publish';
}
function get_post(int $id): WP_Post { return $GLOBALS['post']; }
function get_post_status(int $id): string { return $GLOBALS['post']->post_status; }
function wp_get_post_terms(int $id, string $taxonomy, array $options): array { return $GLOBALS['scopes']; }
function get_post_meta(int $id, string $key, bool $single = true): mixed { return $GLOBALS['meta'][$key] ?? ''; }
function get_field(string $key, int $id, bool $format = true): string { return ''; }
function wp_is_post_revision(int $id): bool { return false; }
function wp_is_post_autosave(int $id): bool { return false; }
function is_wp_error(mixed $value): bool { return false; }
function tio2_supported_site_ids(): array { return ['tio2-a', 'tio2-b', 'tio2-my']; }
function tio2_content_type_definitions(): array { return []; }
function tio2_is_valid_public_path(string $path): bool { return in_array($path, ['/', '/applications'], true); }
function wp_generate_uuid4(): string { return '550e8400-e29b-41d4-a716-446655440000'; }
function wp_parse_url(string $url): array|false { return parse_url($url); }
function wp_json_encode(mixed $value, int $flags = 0): string|false { return json_encode($value, $flags); }
function wp_remote_post(string $url, array $options): array {
    $GLOBALS['deliveries'][] = ['url' => $url, 'options' => $options];
    return ['response' => ['code' => 200]];
}
function wp_remote_retrieve_response_code(array $response): int { return $response['response']['code']; }
require '/workspace/wordpress/plugins/tio2-site-model/includes/webhooks.php';

foreach (['tio2-a', 'tio2-b', 'tio2-my'] as $site_id) {
    $suffix = strtoupper(str_replace('-', '_', $site_id));
    $url = 'http://127.0.0.1:3015/' . $site_id . '/api/revalidate';
    if ('tio2-my' === $site_id) $url = 'http://127.0.0.1:3015/api/revalidate';
    putenv('NEXTJS_REVALIDATION_URL_' . $suffix . '=' . $url);
    putenv('NEXTJS_REVALIDATION_SECRET_' . $suffix . '=webhook-' . $site_id . '-secret');
}

/** @return list<array<string, mixed>> */
function run_case(string $type, array $scopes, string $event, ?string $key = null): array {
    $post = new WP_Post();
    $post->post_type = $type;
    $post->post_status = 'publish';
    $GLOBALS['post'] = $post;
    $GLOBALS['scopes'] = $scopes;
    $GLOBALS['meta'] = ['public_path' => 'tio2_application_hub' === $type ? '/applications' : '/'];
    $GLOBALS['deliveries'] = [];
    $GLOBALS['tio2_webhook_queue'] = [];
    if (in_array($event, ['publish', 'update', 'withdraw'], true)) {
        $old = 'publish' === $event ? 'draft' : 'publish';
        $new = 'withdraw' === $event ? 'draft' : 'publish';
        $post->post_status = $new;
        tio2_handle_post_transition($new, $old, $post);
    } elseif ('meta-before' === $event) {
        tio2_capture_post_meta_before_mutation(null, 42, (string) $key, '{"updated":true}');
    } elseif ('meta-after' === $event) {
        tio2_handle_post_meta_change(7, 42, (string) $key, '{"updated":true}');
    } else {
        throw new RuntimeException('Unknown event');
    }
    tio2_flush_webhook_queue();
    $captured = [];
    foreach ($GLOBALS['deliveries'] as $delivery) {
        $body = $delivery['options']['body'];
        $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        $site_id = $payload['siteIds'][0];
        $captured[] = [
            'url' => $delivery['url'], 'siteIds' => $payload['siteIds'],
            'paths' => $payload['paths'], 'contentId' => $payload['contentId'],
            'entityIds' => $payload['entityIds'],
            'signed' => hash_equals(hash_hmac('sha256', $body, 'webhook-' . $site_id . '-secret'), $delivery['options']['headers']['x-tio2-signature']),
        ];
    }
    return $captured;
}

$home_key = TIO2_MY_HOMEPAGE_CONTRACT_META;
$application_key = TIO2_MY_APPLICATION_HUB_CONTRACT_META;
$results = [];
foreach (['publish', 'update', 'withdraw'] as $event) {
    $results['home-' . $event] = run_case('tio2_homepage', ['tio2-my'], $event);
    $results['application-' . $event] = run_case('tio2_application_hub', ['tio2-my'], $event);
}
foreach (['meta-before', 'meta-after'] as $event) {
    $results['home-' . $event] = run_case('tio2_homepage', ['tio2-my'], $event, $home_key);
    $results['application-' . $event] = run_case('tio2_application_hub', ['tio2-my'], $event, $application_key);
}
$results['application-site-a'] = run_case('tio2_application_hub', ['tio2-a'], 'publish');
$results['application-site-b'] = run_case('tio2_application_hub', ['tio2-b'], 'meta-after', $application_key);
$results['application-mixed-scope'] = run_case('tio2_application_hub', ['tio2-a', 'tio2-my'], 'publish');
$results['home-wrong-meta'] = run_case('tio2_homepage', ['tio2-my'], 'meta-after', $application_key);
$results['application-wrong-meta'] = run_case('tio2_application_hub', ['tio2-my'], 'meta-after', $home_key);
$results['home-unrelated-meta'] = run_case('tio2_homepage', ['tio2-my'], 'meta-after', '_unrelated_contract');
$results['application-unrelated-meta'] = run_case('tio2_application_hub', ['tio2-my'], 'meta-after', '_unrelated_contract');
$results['home-my-meta-on-a'] = run_case('tio2_homepage', ['tio2-a'], 'meta-after', $home_key);
$results['home-my-meta-on-b'] = run_case('tio2_homepage', ['tio2-b'], 'meta-after', $home_key);
foreach (['tio2-a', 'tio2-b'] as $site_id) {
    $results['home-' . $site_id . '-publish'] = run_case('tio2_homepage', [$site_id], 'publish');
}
echo json_encode($results, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
