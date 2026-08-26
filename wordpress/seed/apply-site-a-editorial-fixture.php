<?php

const TIO2_LOCAL_EDITORIAL_MANIFEST_PATH = '/workspace/wordpress/seed/representative-content.json';
const TIO2_LOCAL_EDITORIAL_MANIFEST_SHA256 = '85bb4ebb9cb2f593d92131e89fb7fe01d98fbe74e3683e4bac08ce60d7b57360';
const TIO2_LOCAL_EDITORIAL_CORE_PATH = '/workspace/wordpress/seed/site-a-editorial-fixture-core.php';
const TIO2_LOCAL_EDITORIAL_LOCK_NAME = 'tio2.site-a-editorial-fixture.v02';

if (! defined('WP_CLI') || ! WP_CLI) {
    throw new RuntimeException('The Site A editorial fixture updater requires WP-CLI.');
}

/**
 * This capability is an accidental-misuse guard for the local wrapper. It is
 * not a security boundary against a caller who already has local code execution.
 *
 * @return array{mode: string, failurePoint: string}
 */
function tio2_local_editorial_read_capability(array $arguments): array
{
    if (1 !== count($arguments) || ! is_string($arguments[0])) {
        throw new RuntimeException('A single local editorial capability path is required.');
    }
    $capability_path = $arguments[0];
    if (1 !== preg_match(
        '~^/workspace/wordpress/seed/\.runtime-site-a-editorial-capability-[a-f0-9]{32}\.json$~D',
        $capability_path
    ) || ! is_readable($capability_path)) {
        throw new RuntimeException('The local editorial capability path is invalid or unavailable.');
    }
    $capability = json_decode(
        (string) file_get_contents($capability_path),
        true,
        32,
        JSON_THROW_ON_ERROR
    );
    if (! is_array($capability)) {
        throw new RuntimeException('The local editorial capability payload is invalid.');
    }
    $required_keys = ['failurePoint', 'manifestSha256', 'mode', 'token', 'version'];
    $actual_keys = array_keys($capability);
    sort($actual_keys, SORT_STRING);
    if ($required_keys !== $actual_keys) {
        throw new RuntimeException('The local editorial capability shape is invalid.');
    }
    $environment_token = getenv('TIO2_LOCAL_EDITORIAL_CAPABILITY');
    if (
        1 !== $capability['version'] ||
        ! is_string($environment_token) ||
        1 !== preg_match('/^[a-f0-9]{64}$/D', $environment_token) ||
        ! is_string($capability['token']) ||
        ! hash_equals($capability['token'], $environment_token) ||
        TIO2_LOCAL_EDITORIAL_MANIFEST_SHA256 !== $capability['manifestSha256'] ||
        ! in_array($capability['mode'], ['plan', 'apply'], true) ||
        ! in_array($capability['failurePoint'], ['', 'after-fields'], true) ||
        ('plan' === $capability['mode'] && '' !== $capability['failurePoint'])
    ) {
        throw new RuntimeException('The local editorial capability contract was rejected.');
    }
    return [
        'mode' => $capability['mode'],
        'failurePoint' => $capability['failurePoint'],
    ];
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
        'content' => (string) get_post_field('post_content', $post_id),
        'path' => '/',
        'scopes' => array_values($scopes),
        'marker' => (string) get_post_meta($post_id, '_tio2_seed_homepage_site_id', true),
    ];
}

function tio2_local_editorial_record_hash(int $post_id): string
{
    $record = tio2_local_editorial_identity($post_id);
    $meta = get_post_meta($post_id);
    ksort($meta, SORT_STRING);
    $record['meta'] = $meta;
    return 'sha256:' . hash('sha256', (string) wp_json_encode($record));
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

function tio2_local_editorial_is_content_meta_key(string $meta_key): bool
{
    $normalized = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    foreach (tio2_local_editorial_required_field_names() as $root) {
        if ($normalized === $root || str_starts_with($normalized, $root . '_')) {
            return true;
        }
    }
    return tio2_local_editorial_is_v01_meta_key($meta_key) || '_tio2_homepage_error' === $meta_key;
}

function tio2_local_editorial_unmanaged_meta_hash(int $post_id): string
{
    $meta = get_post_meta($post_id);
    foreach (array_keys($meta) as $meta_key) {
        if (tio2_local_editorial_is_content_meta_key((string) $meta_key)) {
            unset($meta[$meta_key]);
        }
    }
    ksort($meta, SORT_STRING);
    return 'sha256:' . hash('sha256', (string) wp_json_encode($meta));
}

/**
 * This coarse lock set is intentionally local-only and short lived. Under
 * SERIALIZABLE, the Homepage and public_path range locks also prevent phantoms.
 */
function tio2_local_editorial_lock_invariants(): void
{
    global $wpdb;
    $homepage_ids = array_map('intval', $wpdb->get_col(
        "SELECT ID FROM {$wpdb->posts}
         WHERE post_type = 'tio2_homepage'
         ORDER BY ID ASC FOR UPDATE"
    ));
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not lock the Homepage identity range.');
    }
    $root_ids = array_map('intval', $wpdb->get_col(
        "SELECT p.ID
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
         WHERE p.post_type IN ('page', 'post')
           AND pm.meta_key = 'public_path' AND pm.meta_value = '/'
         ORDER BY p.ID ASC FOR UPDATE"
    ));
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not lock the Page/Post root-owner rows.');
    }
    $wpdb->get_col(
        "SELECT meta_id FROM {$wpdb->postmeta}
         WHERE meta_key = 'public_path'
         ORDER BY meta_id ASC FOR UPDATE"
    );
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not lock the public_path metadata range.');
    }
    $locked_ids = array_values(array_unique(array_merge($homepage_ids, $root_ids)));
    if ([] === $locked_ids) {
        throw new RuntimeException('Invariant locking found no Homepage or root records.');
    }
    $id_list = implode(',', $locked_ids);
    $wpdb->get_col(
        "SELECT meta_id FROM {$wpdb->postmeta}
         WHERE post_id IN ({$id_list})
         ORDER BY post_id ASC, meta_id ASC FOR UPDATE"
    );
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not lock Homepage and root-owner metadata.');
    }
    $wpdb->get_results(
        "SELECT object_id, term_taxonomy_id FROM {$wpdb->term_relationships}
         WHERE object_id IN ({$id_list})
         ORDER BY object_id ASC, term_taxonomy_id ASC FOR UPDATE",
        ARRAY_A
    );
    if ('' !== $wpdb->last_error) {
        throw new RuntimeException('Could not lock Homepage and root-owner scope relationships.');
    }
    foreach ($locked_ids as $post_id) {
        clean_post_cache($post_id);
        wp_cache_delete($post_id, 'post_meta');
        $post_type = get_post_type($post_id);
        if (is_string($post_type) && '' !== $post_type) {
            clean_object_term_cache($post_id, $post_type);
        }
        if (function_exists('acf_flush_value_cache')) {
            acf_flush_value_cache($post_id);
        }
    }
}

/**
 * @return array<string, mixed>
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
        'site_a_unmanaged_hash' => tio2_local_editorial_unmanaged_meta_hash($site_a_id),
        'site_b_hash' => tio2_local_editorial_record_hash($site_b_ids[0]),
        'root_hash' => tio2_local_editorial_root_identity_hash(),
    ];
}

function tio2_local_editorial_flush_post(int $post_id): void
{
    clean_post_cache($post_id);
    wp_cache_delete($post_id, 'post_meta');
    if (function_exists('acf_flush_value_cache')) {
        acf_flush_value_cache($post_id);
    }
}

try {
    $capability = tio2_local_editorial_read_capability($args);
    if (! is_readable(TIO2_LOCAL_EDITORIAL_CORE_PATH)) {
        throw new RuntimeException('The committed editorial fixture core is unavailable.');
    }
    require_once TIO2_LOCAL_EDITORIAL_CORE_PATH;
    if (! is_readable(TIO2_LOCAL_EDITORIAL_MANIFEST_PATH) ||
        TIO2_LOCAL_EDITORIAL_MANIFEST_SHA256 !== hash_file('sha256', TIO2_LOCAL_EDITORIAL_MANIFEST_PATH)) {
        throw new RuntimeException('The committed Site A editorial manifest hash was rejected.');
    }
    if (! function_exists('update_field') || ! function_exists('tio2_homepage_v02_field_definitions')) {
        throw new RuntimeException('The Site A editorial fixture updater requires the active Site Model and ACF.');
    }
    $manifest = json_decode(
        (string) file_get_contents(TIO2_LOCAL_EDITORIAL_MANIFEST_PATH),
        true,
        512,
        JSON_THROW_ON_ERROR
    );
    $fields = tio2_local_editorial_validate_manifest($manifest);

    $field_definitions = array_merge(
        tio2_homepage_field_definitions(),
        tio2_homepage_v02_field_definitions()
    );
    $field_keys = [];
    foreach ($field_definitions as $field_definition) {
        $field_keys[$field_definition['name']] = $field_definition['key'];
    }
    $execution_context = ['site_a_id' => 0];
    global $wpdb;
    $operations = [
        'snapshot_queue' => static fn (): array =>
            isset($GLOBALS['tio2_webhook_queue']) && is_array($GLOBALS['tio2_webhook_queue'])
                ? $GLOBALS['tio2_webhook_queue']
                : [],
        'restore_queue' => static function (array $queue): void {
            $GLOBALS['tio2_webhook_queue'] = $queue;
        },
        'acquire_lock' => static function () use ($wpdb): bool {
            return 1 === (int) $wpdb->get_var($wpdb->prepare(
                'SELECT GET_LOCK(%s, 0)',
                TIO2_LOCAL_EDITORIAL_LOCK_NAME
            ));
        },
        'release_lock' => static function () use ($wpdb): void {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', TIO2_LOCAL_EDITORIAL_LOCK_NAME));
        },
        'begin_transaction' => static function () use ($wpdb): void {
            if (false === $wpdb->query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE') ||
                false === $wpdb->query('START TRANSACTION')) {
                throw new RuntimeException('Could not start the serializable editorial fixture transaction.');
            }
        },
        'lock_invariants' => static function (): void {
            tio2_local_editorial_lock_invariants();
        },
        'preflight' => static function () use (&$execution_context): array {
            $preflight = tio2_local_editorial_preflight();
            $execution_context['site_a_id'] = $preflight['site_a_id'];
            return $preflight;
        },
        'begin_suppression' => static function () use (&$execution_context): array {
            return tio2_local_editorial_begin_enforcement_suppression(
                (int) $execution_context['site_a_id']
            );
        },
        'restore_suppression' => static function (array $token): void {
            tio2_local_editorial_restore_enforcement_suppression($token);
        },
        'write_field' => static function (string $field_name, $field_value) use (
            &$execution_context,
            $field_keys
        ): void {
            if (! isset($field_keys[$field_name])) {
                throw new RuntimeException("Missing ACF key for Homepage field {$field_name}.");
            }
            update_field($field_keys[$field_name], $field_value, (int) $execution_context['site_a_id']);
        },
        'delete_legacy' => static function () use (&$execution_context): void {
            tio2_local_editorial_delete_v01_meta((int) $execution_context['site_a_id']);
            tio2_local_editorial_flush_post((int) $execution_context['site_a_id']);
        },
        'assert_no_legacy' => static function () use (&$execution_context): void {
            if ([] !== tio2_local_editorial_find_v01_meta_keys((int) $execution_context['site_a_id'])) {
                throw new RuntimeException('Legacy Homepage v0.1 ACF meta remained after cleanup.');
            }
        },
        'enforce' => static function () use (&$execution_context): void {
            tio2_local_editorial_flush_post((int) $execution_context['site_a_id']);
            $result = tio2_enforce_homepage_contract((int) $execution_context['site_a_id']);
            if (is_wp_error($result)) {
                throw new RuntimeException($result->get_error_code() . ': ' . $result->get_error_message());
            }
        },
        'readback' => static function (array $expected) use (&$execution_context): void {
            $post_id = (int) $execution_context['site_a_id'];
            tio2_local_editorial_flush_post($post_id);
            foreach ($expected as $field_name => $expected_value) {
                $actual_value = get_field($field_name, $post_id, false);
                if (
                    wp_json_encode(tio2_local_editorial_normalize_field($field_name, $actual_value)) !==
                    wp_json_encode(tio2_local_editorial_normalize_field($field_name, $expected_value))
                ) {
                    throw new RuntimeException("Read-back rejected Homepage field {$field_name}.");
                }
            }
            if ([] !== tio2_local_editorial_find_v01_meta_keys($post_id)) {
                throw new RuntimeException('Read-back found legacy Homepage v0.1 ACF meta.');
            }
        },
        'assert_invariants' => static function (array $preflight): void {
            if ($preflight['site_a_identity'] !== tio2_local_editorial_identity($preflight['site_a_id'])) {
                throw new RuntimeException('Read-back rejected the Site A Homepage identity.');
            }
            if ($preflight['site_a_unmanaged_hash'] !==
                tio2_local_editorial_unmanaged_meta_hash($preflight['site_a_id'])) {
                throw new RuntimeException('Read-back detected a non-allowlisted Site A metadata change.');
            }
            if ($preflight['site_b_hash'] !== tio2_local_editorial_record_hash($preflight['site_b_id'])) {
                throw new RuntimeException('Read-back detected a frozen Site B change.');
            }
            if ($preflight['root_hash'] !== tio2_local_editorial_root_identity_hash()) {
                throw new RuntimeException('Read-back detected a root ownership change.');
            }
        },
        'commit' => static function () use ($wpdb): void {
            if (false === $wpdb->query('COMMIT')) {
                throw new RuntimeException('Could not commit the local editorial fixture transaction.');
            }
        },
        'rollback' => static function () use ($wpdb): void {
            if (false === $wpdb->query('ROLLBACK')) {
                throw new RuntimeException('Could not roll back the local editorial fixture transaction.');
            }
        },
    ];

    $result = tio2_local_editorial_execute(
        $capability['mode'],
        $capability['failurePoint'],
        $fields,
        $operations
    );
    $preflight = $result['preflight'];
    $counts = [];
    foreach (tio2_local_editorial_required_counts() as $field_name => $unused) {
        $counts[$field_name] = count($fields[$field_name]);
    }
    WP_CLI::log('TIO2_SITE_A_EDITORIAL_RESULT ' . wp_json_encode([
        'mode' => $result['mode'],
        'targetId' => $preflight['site_a_id'],
        'targetSlug' => 'tio2-a--homepage',
        'targetPath' => '/',
        'targetScope' => 'tio2-a',
        'schemaVersion' => $fields['homepage_schema_version'],
        'fieldCount' => count($fields),
        'counts' => $counts,
        'siteBHash' => $preflight['site_b_hash'],
        'rootIdentityHash' => $preflight['root_hash'],
    ]));
} catch (Throwable $error) {
    WP_CLI::error('Site A editorial fixture failed: ' . $error->getMessage());
}
