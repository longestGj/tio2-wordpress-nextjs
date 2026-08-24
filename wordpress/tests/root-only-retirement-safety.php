<?php

if (! defined('ABSPATH')) {
    exit(1);
}

define('TIO2_ROOT_ONLY_LIBRARY_ONLY', true);
require_once dirname(__DIR__) . '/seed/export-route-status-snapshot.php';

$failures = [];
$check = static function (bool $condition, string $label) use (&$failures): void {
    if (! $condition) {
        $failures[] = $label;
    }
};
$rehash = static function (array $snapshot): array {
    unset($snapshot['snapshotChecksum']);
    $snapshot['snapshotChecksum'] = tio2_root_only_sha256($snapshot);
    return $snapshot;
};
$expect_rejected = static function (string $label, array $snapshot) use (&$failures, $rehash): void {
    $snapshot = $rehash($snapshot);
    try {
        tio2_root_only_validate_snapshot($snapshot);
        $failures[] = $label;
    } catch (Throwable $expected) {
        // Expected fail-closed validation.
    }
};
$expect_preflight_rejected = static function (string $label, array $snapshot) use (&$failures, $rehash): void {
    $snapshot = $rehash($snapshot);
    try {
        tio2_root_only_preflight($snapshot, true);
        $failures[] = $label;
    } catch (Throwable $expected) {
        // Expected fail-closed live comparison.
    }
};

$snapshot = tio2_root_only_build_snapshot();
$check(isset($snapshot['retainedCorpus']) && is_array($snapshot['retainedCorpus']), 'retained corpus is absent');

$duplicate_id = $snapshot;
$duplicate_id['records'][0] = $duplicate_id['records'][1];
$expect_rejected('duplicate ID plus omitted ID passed validation', $duplicate_id);

$duplicate_route = $snapshot;
$duplicate_route['records'][0]['siteScope'] = $duplicate_route['records'][1]['siteScope'];
$duplicate_route['records'][0]['publicPath'] = $duplicate_route['records'][1]['publicPath'];
$duplicate_route['records'][0]['slug'] = $duplicate_route['records'][1]['slug'];
$duplicate_route['records'][0]['seedMarker'] = $duplicate_route['records'][1]['seedMarker'];
$duplicate_route_identity = [
    'kind' => 'page-route',
    'id' => $duplicate_route['records'][0]['id'],
    'postType' => 'page',
    'siteScope' => $duplicate_route['records'][0]['siteScope'],
    'publicPath' => $duplicate_route['records'][0]['publicPath'],
    'slug' => $duplicate_route['records'][0]['slug'],
    'seedMarker' => $duplicate_route['records'][0]['seedMarker'],
];
$duplicate_route['records'][0]['identityChecksum'] = tio2_root_only_identity_checksum($duplicate_route_identity);
$expect_rejected('duplicate exact route plus omitted route passed validation', $duplicate_route);

$invalid_id = $snapshot;
$invalid_id['records'][0]['id'] = 0;
$expect_rejected('non-positive ID passed validation', $invalid_id);

$string_id = $snapshot;
$string_id['records'][0]['id'] = (string) $string_id['records'][0]['id'];
$expect_rejected('string ID passed validation', $string_id);

$bad_status = $snapshot;
$bad_status['records'][0]['targetStatus'] = 'trash';
$expect_rejected('noncanonical status passed validation', $bad_status);

$bad_checksum = $snapshot;
$bad_checksum['records'][0]['contentChecksum'] = 'sha256:synthetic';
$expect_rejected('noncanonical record checksum passed validation', $bad_checksum);

$bad_created_at = $snapshot;
$bad_created_at['createdAt'] = 123;
$expect_rejected('non-string createdAt passed validation', $bad_created_at);

if (isset($snapshot['retainedCorpus']) && is_array($snapshot['retainedCorpus'])) {
    $superseded = array_values(array_filter(
        $snapshot['retainedCorpus'],
        static fn(array $record): bool => 'superseded-page' === ($record['kind'] ?? null)
    ));
    $roots = array_values(array_filter(
        $snapshot['retainedCorpus'],
        static fn(array $record): bool => 'root-backup' === ($record['kind'] ?? null)
    ));
    foreach (['tio2-a', 'tio2-b'] as $site_id) {
        $site_superseded = array_values(array_filter(
            $superseded,
            static fn(array $record): bool => $site_id === ($record['siteScope'] ?? null)
        ));
        $check(99 === count($site_superseded), "retained superseded count is not 99 for {$site_id}");
    }
    $check(2 === count($roots), 'retained root backup count is not two');

    $missing = $snapshot;
    array_pop($missing['retainedCorpus']);
    $expect_rejected('missing retained record passed validation', $missing);

    $extra = $snapshot;
    $extra['retainedCorpus'][] = $extra['retainedCorpus'][0];
    $expect_rejected('extra retained record passed validation', $extra);

    $trashed = $snapshot;
    $trashed['retainedCorpus'][0]['status'] = 'trash';
    $expect_rejected('trashed retained record passed validation', $trashed);

    $drifted = $snapshot;
    $drifted['retainedCorpus'][0]['contentChecksum'] = 'sha256:' . str_repeat('0', 64);
    $expect_preflight_rejected('retained checksum drift passed preflight', $drifted);
}

$page_priority = has_filter('wp_insert_post_data', 'tio2_guard_managed_publication');
$product_priority = has_filter('wp_insert_post_data', 'tio2_guard_product_publication');
$backstop_priority = has_action('wp_after_insert_post', 'tio2_backstop_product_publication');
$first_page = $snapshot['records'][0];
$root_backups = array_values(array_filter(
    $snapshot['retainedCorpus'] ?? [],
    static fn(array $record): bool => 'root-backup' === ($record['kind'] ?? null)
));
$unrelated_page_id = count($root_backups) >= 1
    ? (int) $root_backups[0]['id']
    : 0;
$probe_marker_key = '_tio2_root_only_safety_probe';
$probe_marker_value = 'unrelated-product-v0.1';
$find_product_probe_ids = static function () use ($probe_marker_key, $probe_marker_value): array {
    return array_map('intval', get_posts([
        'post_type' => 'tio2_product',
        'post_status' => array_values(get_post_stati()),
        'posts_per_page' => -1,
        'fields' => 'ids',
        'meta_key' => $probe_marker_key,
        'meta_value' => $probe_marker_value,
    ]));
};
foreach ($find_product_probe_ids() as $stale_probe_id) {
    wp_delete_post($stale_probe_id, true);
}
$check([] === $find_product_probe_ids(), 'stale unrelated Product safety probe could not be removed');
$unrelated_product_result = wp_insert_post([
    'post_type' => 'tio2_product',
    'post_status' => 'draft',
    'post_name' => 'root-only-retirement-safety-unrelated-product',
    'post_title' => 'Root-only retirement safety unrelated Product',
    'meta_input' => [$probe_marker_key => $probe_marker_value],
], true);
$unrelated_product_id = is_wp_error($unrelated_product_result) ? 0 : (int) $unrelated_product_result;
try {
    $check($unrelated_page_id > 0 && get_post($unrelated_page_id) instanceof WP_Post, 'real unrelated Page ID is missing');
    $check($unrelated_product_id > 0 && get_post($unrelated_product_id) instanceof WP_Post, 'real unrelated Product attack ID is missing');
    $check('tio2_product' === get_post_type($unrelated_product_id), 'unrelated Product probe is not a persisted tio2_product');
    $check(
        $probe_marker_value === get_post_meta($unrelated_product_id, $probe_marker_key, true),
        'unrelated Product probe does not carry the stable test marker'
    );
    $check('draft' === get_post_status($unrelated_product_id), 'unrelated Product probe did not start as draft');
    $initial_unrelated_product_scopes = wp_get_object_terms($unrelated_product_id, 'site_scope', ['fields' => 'slugs']);
    $check(
        ! is_wp_error($initial_unrelated_product_scopes) && [] === array_values($initial_unrelated_product_scopes),
        'unrelated Product probe did not start with empty site scopes'
    );
    $inside_installed = false;
    $future_rejected = false;
    $product_future_rejected = false;
    $unrelated_page_rejected = false;
    $unrelated_product_publish_rejected = false;
    $unrelated_product_future_rejected = false;
    $unrelated_product_not_allowlisted = false;
    $unrelated_backstop_enforced = ['publish' => false, 'future' => false];
    $tuples_checksum_bound = false;
    $die_handler = static function (): callable {
        return static function ($message): never {
            $text = is_wp_error($message) ? $message->get_error_message() : (string) $message;
            throw new RuntimeException($text);
        };
    };
    add_filter('wp_die_handler', $die_handler, PHP_INT_MAX);
    try {
        tio2_root_only_with_restore_context(
            $snapshot,
            static function () use (
                &$inside_installed,
                &$future_rejected,
                &$product_future_rejected,
                &$unrelated_page_rejected,
                &$unrelated_product_publish_rejected,
                &$unrelated_product_future_rejected,
                &$unrelated_product_not_allowlisted,
                &$unrelated_backstop_enforced,
                &$tuples_checksum_bound,
                $page_priority,
                $product_priority,
                $backstop_priority,
                $first_page,
                $snapshot,
                $unrelated_page_id,
                $unrelated_product_id
            ): void {
            $inside_installed =
                $page_priority === has_filter('wp_insert_post_data', 'tio2_guard_managed_publication') &&
                $product_priority === has_filter('wp_insert_post_data', 'tio2_guard_product_publication') &&
                $backstop_priority === has_action('wp_after_insert_post', 'tio2_backstop_product_publication');
            $context = $GLOBALS['tio2_root_only_restore_context'] ?? [];
            $tuples_checksum_bound = is_array($context) && array_reduce(
                $context['allowlist'] ?? [],
                static fn(bool $valid, array $tuple): bool =>
                    $valid && ($context['snapshotChecksum'] ?? null) === ($tuple['snapshotChecksum'] ?? null),
                true
            );
            try {
                tio2_guard_managed_publication(
                    ['post_type' => 'page', 'post_status' => 'future'],
                    ['ID' => (int) $first_page['id']],
                    [],
                    true
                );
            } catch (Throwable $expected) {
                $future_rejected = true;
            }
            try {
                tio2_guard_managed_publication(
                    ['post_type' => 'page', 'post_status' => 'publish'],
                    ['ID' => $unrelated_page_id],
                    [],
                    true
                );
            } catch (Throwable $expected) {
                $unrelated_page_rejected = true;
            }
            $product_records = array_values(array_filter(
                $snapshot['records'] ?? [],
                static fn(array $record): bool => 'product-fixture' === ($record['kind'] ?? null)
            ));
            if (1 === count($product_records)) {
                $product_data = tio2_guard_product_publication(
                    ['post_type' => 'tio2_product', 'post_status' => 'future'],
                    ['ID' => (int) $product_records[0]['id']],
                    [],
                    true
                );
                $product_future_rejected = 'draft' === ($product_data['post_status'] ?? null);
            }
            $unrelated_product_not_allowlisted =
                ! tio2_root_only_restore_candidate_allowed($unrelated_product_id, 'tio2_product', 'publish') &&
                ! tio2_root_only_restore_candidate_allowed($unrelated_product_id, 'tio2_product', 'future');
            $unrelated_product_publish_data = tio2_guard_product_publication(
                ['post_type' => 'tio2_product', 'post_status' => 'publish'],
                ['ID' => $unrelated_product_id],
                [],
                true
            );
            $unrelated_product_publish_rejected = 'draft' === ($unrelated_product_publish_data['post_status'] ?? null);
            $unrelated_product_future_data = tio2_guard_product_publication(
                ['post_type' => 'tio2_product', 'post_status' => 'future'],
                ['ID' => $unrelated_product_id],
                [],
                true
            );
            $unrelated_product_future_rejected = 'draft' === ($unrelated_product_future_data['post_status'] ?? null);

            $force_unauthorized_status = static function (
                array $data,
                array $postarr,
                array $unsanitized_postarr
            ) use ($unrelated_product_id): array {
                $requested_status = (string) ($unsanitized_postarr['post_status'] ?? '');
                if (
                    $unrelated_product_id === (int) ($postarr['ID'] ?? 0) &&
                    'tio2_product' === ($data['post_type'] ?? null) &&
                    in_array($requested_status, ['publish', 'future'], true)
                ) {
                    $data['post_status'] = $requested_status;
                }
                return $data;
            };
            $observe_unauthorized_persistence = static function (int $post_id, WP_Post $post) use (
                $unrelated_product_id,
                &$unrelated_backstop_enforced
            ): void {
                if (
                    $unrelated_product_id === $post_id &&
                    'tio2_product' === $post->post_type &&
                    in_array($post->post_status, ['publish', 'future'], true)
                ) {
                    $unrelated_backstop_enforced[$post->post_status] = true;
                }
            };
            add_filter('wp_insert_post_data', $force_unauthorized_status, PHP_INT_MAX, 4);
            add_action('wp_after_insert_post', $observe_unauthorized_persistence, 19, 3);
            try {
                foreach (['publish', 'future'] as $unauthorized_status) {
                    $update_result = wp_update_post([
                        'ID' => $unrelated_product_id,
                        'post_status' => $unauthorized_status,
                    ], true);
                    if (is_wp_error($update_result) || 'draft' !== get_post_status($unrelated_product_id)) {
                        $unrelated_backstop_enforced[$unauthorized_status] = false;
                    }
                }
            } finally {
                remove_filter('wp_insert_post_data', $force_unauthorized_status, PHP_INT_MAX);
                remove_action('wp_after_insert_post', $observe_unauthorized_persistence, 19);
            }
            }
        );
    } finally {
        remove_filter('wp_die_handler', $die_handler, PHP_INT_MAX);
    }
    $check($inside_installed, 'publication guards were removed inside restore context');
    $check($future_rejected, 'non-allowlisted Page tuple was accepted inside restore context');
    $check($product_future_rejected, 'non-allowlisted Product tuple was accepted inside restore context');
    $check($unrelated_page_rejected, 'real unrelated Page ID was accepted inside restore context');
    $check($unrelated_product_not_allowlisted, 'persisted unrelated Product ID entered the restore allowlist');
    $check($unrelated_product_publish_rejected, 'persisted unrelated Product publish tuple was accepted');
    $check($unrelated_product_future_rejected, 'persisted unrelated Product future tuple was accepted');
    $check(
        $unrelated_backstop_enforced['publish'] && $unrelated_backstop_enforced['future'],
        'Product backstop did not draft both persisted unrelated Product publication states'
    );
    $check($tuples_checksum_bound, 'restore allowlist tuples were not bound to the validated snapshot checksum');
    $check(! isset($GLOBALS['tio2_root_only_restore_context']), 'restore allowlist leaked after success');
    $check($page_priority === has_filter('wp_insert_post_data', 'tio2_guard_managed_publication'), 'Page guard changed after success');
    $check($product_priority === has_filter('wp_insert_post_data', 'tio2_guard_product_publication'), 'Product guard changed after success');
    $check($backstop_priority === has_action('wp_after_insert_post', 'tio2_backstop_product_publication'), 'Product backstop changed after success');

    try {
        tio2_root_only_with_restore_context($snapshot, static function (): void {
            throw new RuntimeException('injected restore context exception');
        });
    } catch (RuntimeException $expected) {
        $check('injected restore context exception' === $expected->getMessage(), 'restore context changed callback exception');
    }
    $check(! isset($GLOBALS['tio2_root_only_restore_context']), 'restore allowlist leaked after exception');
    $check($page_priority === has_filter('wp_insert_post_data', 'tio2_guard_managed_publication'), 'Page guard changed after exception');
    $check($product_priority === has_filter('wp_insert_post_data', 'tio2_guard_product_publication'), 'Product guard changed after exception');
    $check($backstop_priority === has_action('wp_after_insert_post', 'tio2_backstop_product_publication'), 'Product backstop changed after exception');

    $final_unrelated_product_scopes = wp_get_object_terms($unrelated_product_id, 'site_scope', ['fields' => 'slugs']);
    $check('tio2_product' === get_post_type($unrelated_product_id), 'unrelated Product probe changed post type');
    $check('draft' === get_post_status($unrelated_product_id), 'unauthorized unrelated Product status persisted');
    $check(
        ! is_wp_error($final_unrelated_product_scopes) && [] === array_values($final_unrelated_product_scopes),
        'unauthorized unrelated Product scopes persisted'
    );
} finally {
    if ($unrelated_product_id > 0) {
        wp_clear_scheduled_hook('publish_future_post', [$unrelated_product_id]);
        $deleted_probe = wp_delete_post($unrelated_product_id, true);
        $check($deleted_probe instanceof WP_Post, 'unrelated Product safety probe cleanup failed');
        $check(
            false === wp_next_scheduled('publish_future_post', [$unrelated_product_id]),
            'unrelated Product safety probe left a future-publication event'
        );
    }
    foreach ($find_product_probe_ids() as $residual_probe_id) {
        wp_delete_post($residual_probe_id, true);
    }
    $check([] === $find_product_probe_ids(), 'unrelated Product safety probe left persistent residue');
}

if ([] !== $failures) {
    throw new RuntimeException('Root-only retirement safety failures: ' . implode('; ', $failures));
}

WP_CLI::success('Root-only retirement schema, retained corpus, and scoped restore safety passed');
