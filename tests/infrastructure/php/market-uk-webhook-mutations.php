<?php
declare(strict_types=1);

// Execute the real mutation, queue, payload and signing code; replace only WP I/O.
define('ABSPATH', __DIR__);
define('TIO2_MY_EU_MARKET_CONTRACT_META', '_tio2_my_eu_market_contract_json');
define('TIO2_MY_UK_MARKET_CONTRACT_META', '_tio2_my_uk_market_contract_json');
final class WP_Post {
    public int $ID = 42;
    public string $post_type = 'tio2_market_page';
    public string $post_status = 'publish';
}
function get_post(int $id): WP_Post { return $GLOBALS['post']; }
function get_post_status(int $id): string { return $GLOBALS['post']->post_status; }
function wp_get_post_terms(...$args): array { return $GLOBALS['scopes']; }
function get_post_meta(int $id, string $key, bool $single = true): mixed { return $GLOBALS['meta'][$key] ?? ''; }
function is_wp_error(mixed $value): bool { return false; }
function tio2_supported_site_ids(): array { return ['tio2-a', 'tio2-b', 'tio2-my']; }
function tio2_content_type_definitions(): array { return []; }
function tio2_is_valid_public_path(string $path): bool { return in_array($path, ['/markets/united-kingdom', '/markets/european-union'], true); }
function wp_generate_uuid4(): string { return '550e8400-e29b-41d4-a716-446655440000'; }
function wp_parse_url(string $url): array|false { return parse_url($url); }
function wp_json_encode(mixed $value, int $flags = 0): string|false { return json_encode($value, $flags); }
function wp_remote_post(string $url, array $options): array {
    $GLOBALS['deliveries'][] = ['url' => $url, 'options' => $options];
    return ['response' => ['code' => 200]];
}
function wp_remote_retrieve_response_code(array $response): int { return $response['response']['code']; }
require '/work/wordpress/plugins/tio2-site-model/includes/webhooks.php';
putenv('NEXTJS_REVALIDATION_URL_TIO2_MY=http://127.0.0.1:3015/api/revalidate');
putenv('NEXTJS_REVALIDATION_SECRET_TIO2_MY=mutation-test-secret');

$cases = 0;
foreach ([
    [TIO2_MY_UK_MARKET_CONTRACT_META, '/markets/united-kingdom'],
    [TIO2_MY_EU_MARKET_CONTRACT_META, '/markets/european-union'],
] as [$key, $path]) {
    foreach (['updated', 'deleted'] as $mutation) {
        // Each registered pre/post entry point must work independently.
        foreach (['before', 'after'] as $phase) {
            foreach (['valid', 'site-a', 'site-b', 'mixed', 'unrelated'] as $scenario) {
                $post = new WP_Post();
                $scopes = match ($scenario) {
                    'site-a' => ['tio2-a'], 'site-b' => ['tio2-b'],
                    'mixed' => ['tio2-my', 'tio2-a'], default => ['tio2-my'],
                };
                $meta = ['public_path' => $path, $key => '{"old":true}'];
                $deliveries = [];
                $GLOBALS['tio2_webhook_queue'] = [];
                $mutatedKey = $scenario === 'unrelated' ? '_unrelated_meta' : $key;
                if ($phase === 'before') {
                    $check = tio2_capture_post_meta_before_mutation(null, 42, $mutatedKey, '{"new":true}');
                    if ($check !== null) throw new RuntimeException('Mutation filter short-circuited WP storage');
                }
                if ($mutation === 'deleted') unset($meta[$mutatedKey]);
                else $meta[$mutatedKey] = '{"new":true}';
                if ($phase === 'after') {
                    if ($mutation === 'deleted') tio2_handle_deleted_post_meta([7], 42, $mutatedKey, '{"old":true}');
                    else tio2_handle_post_meta_change(7, 42, $mutatedKey, '{"new":true}');
                }
                tio2_flush_webhook_queue();
                $label = "$key $mutation $phase $scenario";
                if ($scenario !== 'valid') {
                    if ($deliveries !== [] || $GLOBALS['tio2_webhook_queue'] !== []) throw new RuntimeException('Forbidden invalidation: ' . $label);
                } else {
                    if (count($deliveries) !== 1) throw new RuntimeException('Missing scoped invalidation: ' . $label);
                    $delivery = $deliveries[0];
                    $payload = json_decode($delivery['options']['body'], true, 512, JSON_THROW_ON_ERROR);
                    if ($delivery['url'] !== 'http://127.0.0.1:3015/api/revalidate' ||
                        $payload['siteIds'] !== ['tio2-my'] || $payload['paths'] !== [$path] ||
                        $payload['contentId'] !== 42 || $payload['entityIds'] !== [42] ||
                        $delivery['options']['headers']['x-tio2-signature'] !== hash_hmac('sha256', $delivery['options']['body'], 'mutation-test-secret')) {
                        throw new RuntimeException('Wrong scoped payload/signature: ' . $label);
                    }
                }
                $cases++;
            }
        }
    }
}
echo "Market webhook mutations: $cases cases PASS (EU/UK update/delete, pre/post, scope and unrelated-meta isolation; no network)\n";
