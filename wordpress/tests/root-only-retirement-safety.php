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
$inside_installed = false;
$future_rejected = false;
$product_future_rejected = false;
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
            &$tuples_checksum_bound,
            $page_priority,
            $product_priority,
            $backstop_priority,
            $first_page,
            $snapshot
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
        }
    );
} finally {
    remove_filter('wp_die_handler', $die_handler, PHP_INT_MAX);
}
$check($inside_installed, 'publication guards were removed inside restore context');
$check($future_rejected, 'non-allowlisted Page tuple was accepted inside restore context');
$check($product_future_rejected, 'non-allowlisted Product tuple was accepted inside restore context');
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

if ([] !== $failures) {
    throw new RuntimeException('Root-only retirement safety failures: ' . implode('; ', $failures));
}

WP_CLI::success('Root-only retirement schema, retained corpus, and scoped restore safety passed');
