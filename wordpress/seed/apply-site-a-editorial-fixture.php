<?php

if (! defined('WP_CLI') || ! WP_CLI) {
    throw new RuntimeException('The Site A editorial fixture updater requires WP-CLI.');
}
if ('1' !== getenv('TIO2_LOCAL_EDITORIAL_FIXTURE')) {
    WP_CLI::error('The Site A editorial fixture updater is available only through the local wrapper.');
}
if (! function_exists('update_field') || ! function_exists('tio2_homepage_v02_field_definitions')) {
    WP_CLI::error('The Site A editorial fixture updater requires the active Site Model and ACF.');
}

/**
 * @param mixed $value
 * @return mixed
 */
function tio2_local_editorial_normalize_field(string $field_name, $value)
{
    if (in_array($field_name, ['hero_image', 'og_image'], true)) {
        return false === $value || null === $value || '' === $value ? 0 : (int) $value;
    }
    return $value;
}

/**
 * @return array<string, mixed>
 */
function tio2_local_editorial_identity(int $post_id): array
{
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        throw new RuntimeException($scopes->get_error_message());
    }
    sort($scopes, SORT_STRING);
    return [
        'id' => $post_id,
        'type' => (string) get_post_type($post_id),
        'status' => (string) get_post_status($post_id),
        'slug' => (string) get_post_field('post_name', $post_id),
        'title' => (string) get_post_field('post_title', $post_id),
        'path' => '/',
        'scopes' => array_values($scopes),
        'marker' => (string) get_post_meta($post_id, '_tio2_seed_homepage_site_id', true),
    ];
}

function tio2_local_editorial_record_hash(int $post_id): string
{
    $identity = tio2_local_editorial_identity($post_id);
    $identity['content'] = (string) get_post_field('post_content', $post_id);
    $meta = get_post_meta($post_id);
    ksort($meta, SORT_STRING);
    $identity['meta'] = $meta;
    return 'sha256:' . hash('sha256', (string) wp_json_encode($identity));
}

function tio2_local_editorial_root_identity_hash(): string
{
    global $wpdb;
    $ids = array_map('intval', $wpdb->get_col(
        "SELECT DISTINCT p.ID
         FROM {$wpdb->posts} p
         LEFT JOIN {$wpdb->postmeta} pm
           ON pm.post_id = p.ID AND pm.meta_key = 'public_path'
         WHERE p.post_type = 'tio2_homepage'
            OR (p.post_type IN ('page', 'post') AND pm.meta_value = '/')
         ORDER BY p.ID ASC"
    ));
    $rows = [];
    foreach ($ids as $post_id) {
        $identity = tio2_local_editorial_identity($post_id);
        if ('tio2_homepage' !== $identity['type']) {
            $identity['path'] = (string) get_post_meta($post_id, 'public_path', true);
        }
        $rows[] = $identity;
    }
    return 'sha256:' . hash('sha256', (string) wp_json_encode($rows));
}

/**
 * @return array{site_a_id: int, site_b_id: int, site_a_identity: array<string, mixed>, site_b_hash: string, root_hash: string}
 */
function tio2_local_editorial_preflight(): array
{
    global $wpdb;
    $site_a_ids = array_map('intval', $wpdb->get_col($wpdb->prepare(
        "SELECT ID FROM {$wpdb->posts}
         WHERE post_type = 'tio2_homepage' AND post_name = %s
         ORDER BY ID ASC",
        'tio2-a--homepage'
    )));
    if (1 !== count($site_a_ids)) {
        throw new RuntimeException('Preflight requires exactly one Site A Homepage with the deterministic slug.');
    }
    $site_a_id = $site_a_ids[0];
    $site_a_identity = tio2_local_editorial_identity($site_a_id);
    if (
        'tio2_homepage' !== $site_a_identity['type'] ||
        'publish' !== $site_a_identity['status'] ||
        'tio2-a--homepage' !== $site_a_identity['slug'] ||
        '/' !== $site_a_identity['path'] ||
        ['tio2-a'] !== $site_a_identity['scopes'] ||
        'tio2-a' !== $site_a_identity['marker']
    ) {
        throw new RuntimeException('Preflight rejected the Site A Homepage identity, status, scope, or root path.');
    }
    $scoped_site_a_ids = tio2_find_homepage_ids('tio2-a');
    sort($scoped_site_a_ids, SORT_NUMERIC);
    if ([$site_a_id] !== $scoped_site_a_ids) {
        throw new RuntimeException('Preflight requires the Site A Homepage to be the unique scoped root owner.');
    }
    if ([] !== tio2_find_managed_route_post_ids('tio2-a', '/')) {
        throw new RuntimeException('Preflight rejected an additional Site A Page or Post root owner.');
    }
    $stored_path = (string) get_post_meta($site_a_id, 'public_path', true);
    if (! in_array($stored_path, ['', '/'], true)) {
        throw new RuntimeException('Preflight rejected a non-root Homepage public path marker.');
    }

    $site_b_ids = tio2_find_homepage_ids('tio2-b');
    sort($site_b_ids, SORT_NUMERIC);
    if (1 !== count($site_b_ids)) {
        throw new RuntimeException('Preflight requires exactly one frozen Site B Homepage.');
    }
    $site_b_identity = tio2_local_editorial_identity($site_b_ids[0]);
    if (
        'publish' !== $site_b_identity['status'] ||
        'tio2-b--homepage' !== $site_b_identity['slug'] ||
        ['tio2-b'] !== $site_b_identity['scopes']
    ) {
        throw new RuntimeException('Preflight rejected the frozen Site B Homepage identity.');
    }

    return [
        'site_a_id' => $site_a_id,
        'site_b_id' => $site_b_ids[0],
        'site_a_identity' => $site_a_identity,
        'site_b_hash' => tio2_local_editorial_record_hash($site_b_ids[0]),
        'root_hash' => tio2_local_editorial_root_identity_hash(),
    ];
}

/**
 * @param array<string, mixed> $homepage
 * @return array<string, mixed>
 */
function tio2_local_editorial_fixture_fields(array $homepage): array
{
    $shared_field_names = [
        'homepage_schema_version',
        'hero_eyebrow',
        'hero_heading',
        'hero_summary',
        'hero_image',
        'hero_image_alt',
        'closing_heading',
        'closing_body',
        'closing_label',
        'seo_title',
        'seo_description',
        'og_image',
        'primary_topic',
        'secondary_topics',
    ];
    $v02_field_names = array_map(
        static fn (array $definition): string => (string) $definition['name'],
        tio2_homepage_v02_field_definitions()
    );
    $required_names = array_merge($shared_field_names, $v02_field_names);
    $actual_names = array_keys($homepage);
    sort($required_names, SORT_STRING);
    sort($actual_names, SORT_STRING);
    if ($required_names !== $actual_names) {
        throw new RuntimeException('The Site A editorial fixture contains missing or out-of-scope Homepage fields.');
    }
    if ('homepage-v0.2-editorial-geo' !== $homepage['homepage_schema_version']) {
        throw new RuntimeException('The Site A editorial fixture has the wrong schema version.');
    }
    foreach ((array) $homepage['supply_routes'] as $route) {
        if (! is_array($route) || 'synthetic_demo' !== ($route['claim_basis'] ?? null)) {
            throw new RuntimeException('Every Site A supply route must use the synthetic_demo claim basis.');
        }
    }
    foreach ((array) $homepage['evidence_items'] as $item) {
        if (! is_array($item) || 'demo' !== ($item['verification_status'] ?? null)) {
            throw new RuntimeException('Every Site A evidence item must use demo status.');
        }
    }
    $serialized = (string) wp_json_encode($homepage);
    if (1 === preg_match('/href|product_path|application_path|verified/', $serialized)) {
        throw new RuntimeException('The Site A editorial fixture contains a forbidden route or evidence claim.');
    }
    return $homepage;
}

$manifest_path = $args[0] ?? '';
$mode = $args[1] ?? '';
$failure_point = $args[2] ?? '';
if (! in_array($mode, ['plan', 'apply'], true)) {
    WP_CLI::error('Choose plan or apply mode for the Site A editorial fixture updater.');
}
if (! in_array($failure_point, ['', 'after-fields'], true)) {
    WP_CLI::error('Unknown Site A editorial fixture failure point.');
}
if ('plan' === $mode && '' !== $failure_point) {
    WP_CLI::error('Failure injection is available only in apply mode.');
}
if (! is_string($manifest_path) || ! is_readable($manifest_path)) {
    WP_CLI::error('The committed representative-content manifest is unavailable.');
}

try {
    $manifest = json_decode((string) file_get_contents($manifest_path), true, 512, JSON_THROW_ON_ERROR);
    $site_a_entries = array_values(array_filter(
        (array) ($manifest['sites'] ?? []),
        static fn ($site): bool => is_array($site) && 'tio2-a' === ($site['siteId'] ?? null)
    ));
    if (1 !== count($site_a_entries) || ! is_array($site_a_entries[0]['homepage'] ?? null)) {
        throw new RuntimeException('The committed manifest must contain exactly one Site A Homepage fixture.');
    }
    $fields = tio2_local_editorial_fixture_fields($site_a_entries[0]['homepage']);
    $preflight = tio2_local_editorial_preflight();
} catch (Throwable $error) {
    WP_CLI::error('Site A editorial fixture preflight failed: ' . $error->getMessage());
}

$counts = [];
foreach (['decision_questions', 'application_briefs', 'supply_routes', 'evidence_items', 'evaluation_steps', 'geo_faqs', 'glossary_items'] as $field_name) {
    $counts[$field_name] = count((array) $fields[$field_name]);
}

if ('plan' === $mode) {
    WP_CLI::log('TIO2_SITE_A_EDITORIAL_RESULT ' . wp_json_encode([
        'mode' => 'plan',
        'targetId' => $preflight['site_a_id'],
        'targetSlug' => 'tio2-a--homepage',
        'targetPath' => '/',
        'targetScope' => 'tio2-a',
        'fieldCount' => count($fields),
        'counts' => $counts,
        'siteBHash' => $preflight['site_b_hash'],
        'rootIdentityHash' => $preflight['root_hash'],
    ]));
    return;
}

$field_definitions = array_merge(
    tio2_homepage_field_definitions(),
    tio2_homepage_v02_field_definitions()
);
$field_keys = [];
foreach ($field_definitions as $field_definition) {
    $field_keys[$field_definition['name']] = $field_definition['key'];
}

global $wpdb;
$transaction_started = false;
$queue_before = $GLOBALS['tio2_webhook_queue'] ?? [];
try {
    if (false === $wpdb->query('START TRANSACTION')) {
        throw new RuntimeException('Could not start the local editorial fixture transaction.');
    }
    $transaction_started = true;
    foreach ($fields as $field_name => $field_value) {
        if (! isset($field_keys[$field_name])) {
            throw new RuntimeException("Missing ACF key for Homepage field {$field_name}.");
        }
        update_field($field_keys[$field_name], $field_value, $preflight['site_a_id']);
    }
    clean_post_cache($preflight['site_a_id']);
    if ('after-fields' === $failure_point) {
        throw new RuntimeException('Injected failure after Site A editorial fields.');
    }

    $validation = tio2_validate_homepage_contract($preflight['site_a_id']);
    if (is_wp_error($validation)) {
        throw new RuntimeException($validation->get_error_code() . ': ' . $validation->get_error_message());
    }
    foreach ($fields as $field_name => $expected_value) {
        $actual_value = get_field($field_name, $preflight['site_a_id'], false);
        if (
            wp_json_encode(tio2_local_editorial_normalize_field($field_name, $actual_value)) !==
            wp_json_encode(tio2_local_editorial_normalize_field($field_name, $expected_value))
        ) {
            throw new RuntimeException("Read-back rejected Homepage field {$field_name}.");
        }
    }
    if ($preflight['site_a_identity'] !== tio2_local_editorial_identity($preflight['site_a_id'])) {
        throw new RuntimeException('Read-back rejected the Site A Homepage identity.');
    }
    if ($preflight['site_b_hash'] !== tio2_local_editorial_record_hash($preflight['site_b_id'])) {
        throw new RuntimeException('Read-back detected a frozen Site B change.');
    }
    if ($preflight['root_hash'] !== tio2_local_editorial_root_identity_hash()) {
        throw new RuntimeException('Read-back detected a root ownership change.');
    }
    if (false === $wpdb->query('COMMIT')) {
        throw new RuntimeException('Could not commit the local editorial fixture transaction.');
    }
    $transaction_started = false;
    $GLOBALS['tio2_webhook_queue'] = $queue_before;
    clean_post_cache($preflight['site_a_id']);
} catch (Throwable $error) {
    $rollback_failed = false;
    if ($transaction_started) {
        $rollback_failed = false === $wpdb->query('ROLLBACK');
    }
    $GLOBALS['tio2_webhook_queue'] = $queue_before;
    clean_post_cache($preflight['site_a_id']);
    WP_CLI::warning('Site A editorial fixture transaction rolled back.');
    WP_CLI::error(
        'Site A editorial fixture apply failed: ' . $error->getMessage() .
        ($rollback_failed ? ' Rollback command also failed.' : '')
    );
}

WP_CLI::log('TIO2_SITE_A_EDITORIAL_RESULT ' . wp_json_encode([
    'mode' => 'apply',
    'targetId' => $preflight['site_a_id'],
    'schemaVersion' => 'homepage-v0.2-editorial-geo',
    'fieldCount' => count($fields),
    'counts' => $counts,
    'siteBHash' => $preflight['site_b_hash'],
    'rootIdentityHash' => $preflight['root_hash'],
]));
