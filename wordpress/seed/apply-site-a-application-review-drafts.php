<?php

if (! defined('ABSPATH')) {
    exit;
}

define('TIO2_SITE_A_EDITORIAL_LIBRARY_CONTEXT', true);
require_once __DIR__ . '/apply-site-a-editorial-drafts.php';

const TIO2_SITE_A_APPLICATION_REVIEW_IDS = [
    'applications-hub',
    'coatings',
    'water-based-paint',
];

/** @param mixed $manifest @return list<array<string, mixed>> */
function tio2_site_a_application_review_records($manifest): array
{
    if (! is_array($manifest) || '0.1' !== ($manifest['version'] ?? null) || 'tio2-a' !== ($manifest['siteId'] ?? null) || ! is_array($manifest['records'] ?? null) || ! array_is_list($manifest['records'])) {
        throw new InvalidArgumentException('Application review manifest root is invalid.');
    }
    $records = [];
    foreach ($manifest['records'] as $record) {
        $id = is_array($record) ? ($record['identity']['id'] ?? null) : null;
        if (! is_string($id) || ! in_array($id, TIO2_SITE_A_APPLICATION_REVIEW_IDS, true) || isset($records[$id])) {
            throw new InvalidArgumentException('Application review manifest must contain the exact approved identity set.');
        }
        $expected = TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY[$id] ?? null;
        $identity = $record['identity'] ?? null;
        $expected_slug = is_array($expected) ? basename($expected[0]) : null;
        if (! is_array($expected) || ! is_array($identity) || $expected[1] !== ($identity['level'] ?? null) || $expected[2] !== ($identity['parentId'] ?? null) || $expected_slug !== ($identity['slug'] ?? null) || $expected[0] !== ($identity['path'] ?? null)) {
            throw new InvalidArgumentException("Application review identity {$id} is not canonical.");
        }
        $records[$id] = $record;
    }
    if (TIO2_SITE_A_APPLICATION_REVIEW_IDS !== array_keys($records)) {
        throw new InvalidArgumentException('Application review manifest must contain the exact approved identity set in canonical order.');
    }
    return array_values($records);
}

/** @param array<string, callable> $operations @return array<string, mixed> */
function tio2_site_a_application_review_build_plan(array $applications, array $products, array $manifest_hashes, array $operations): array
{
    foreach (['find', 'find_path', 'resolve_product'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Application review operation {$required} is required.");
        }
    }
    $hash_keys = array_keys($manifest_hashes);
    sort($hash_keys, SORT_STRING);
    if (['applications', 'products'] !== $hash_keys) {
        throw new InvalidArgumentException('Application review requires exactly two manifest hashes.');
    }
    foreach ($manifest_hashes as $hash) {
        if (! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash)) {
            throw new InvalidArgumentException('Application review received an invalid manifest hash.');
        }
    }

    $source_records = tio2_site_a_application_review_records($applications);
    $product_keys = tio2_site_a_editorial_product_keys($products);
    $deferred = [];
    $records = [];
    foreach ($source_records as $source) {
        $records[] = tio2_site_a_editorial_application_record($source, 'Strict', $product_keys, $deferred);
    }
    if ([] !== $deferred) {
        throw new RuntimeException('Application review cannot defer Product relationships.');
    }

    $actions = [];
    foreach ($records as $record) {
        foreach ($record['meta']['related_products'] as $product_id) {
            $product = $operations['resolve_product']($product_id);
            if (! is_array($product) || 'product' !== ($product['entityType'] ?? null) || $product_id !== ($product['id'] ?? null) || 'tio2_product' !== ($product['postType'] ?? null) || ['tio2-a'] !== ($product['scopes'] ?? null)) {
                throw new RuntimeException("Product {$product_id} must resolve to the exact Site A Product record.");
            }
        }
        foreach ([
            'application' => array_values(array_filter(array_merge(
                null === $record['meta']['parent_application'] ? [] : [$record['meta']['parent_application']],
                $record['meta']['child_applications'],
                $record['meta']['related_applications']
            ), static fn ($id): bool => ! in_array($id, TIO2_SITE_A_APPLICATION_REVIEW_IDS, true))),
            'resource' => $record['meta']['related_resources'],
        ] as $type => $ids) {
            foreach (array_unique($ids) as $id) {
                $target = $operations['find']($type, $id);
                $post_type = 'application' === $type ? 'tio2_application' : 'tio2_document';
                if (! is_array($target) || $type !== ($target['entityType'] ?? null) || $id !== ($target['id'] ?? null) || $post_type !== ($target['postType'] ?? null) || ['tio2-a'] !== ($target['scopes'] ?? null) || 'draft' !== ($target['status'] ?? null)) {
                    throw new RuntimeException("Application review relationship target {$type}:{$id} must resolve to one exact Site A draft.");
                }
            }
        }

        $existing = $operations['find']('application', $record['id']);
        if (is_array($existing) && ('tio2_application' !== ($existing['postType'] ?? null) || ['tio2-a'] !== ($existing['scopes'] ?? null) || $record['path'] !== ($existing['path'] ?? null))) {
            throw new RuntimeException("Application review ID {$record['id']} collides with a noncanonical record.");
        }
        $path_owner = $operations['find_path']($record['path'], 'application', $record['id']);
        if (is_array($path_owner) && ('application' !== ($path_owner['entityType'] ?? null) || $record['id'] !== ($path_owner['id'] ?? null))) {
            throw new RuntimeException("Application review path {$record['path']} is owned by another record.");
        }
        $action = ! is_array($existing) ? 'create' : (tio2_site_a_editorial_canonicalize($existing) === tio2_site_a_editorial_canonicalize($record) ? 'no-change' : 'update');
        $actions[] = [
            'entityType' => 'application',
            'id' => $record['id'],
            'action' => $action,
            'currentRecordSha256' => is_array($existing) ? tio2_site_a_editorial_sha256($existing) : null,
            'expectedRecordSha256' => tio2_site_a_editorial_sha256($record),
        ];
    }
    $plan = ['version' => 1, 'mode' => 'plan', 'manifestSha256' => $manifest_hashes, 'actions' => $actions];
    $plan['planSha256'] = tio2_site_a_editorial_sha256($plan);
    $plan['_records'] = $records;
    return $plan;
}

/** @param array<string, callable> $operations @return array<string, mixed> */
function tio2_site_a_application_review_execute(string $mode, array $applications, array $products, array $manifest_hashes, ?string $plan_sha256, array $operations): array
{
    if (! in_array($mode, ['plan', 'apply'], true)) {
        throw new InvalidArgumentException('Choose plan or apply mode for Application review drafts.');
    }
    $plan = tio2_site_a_application_review_build_plan($applications, $products, $manifest_hashes, $operations);
    $records = $plan['_records'];
    unset($plan['_records']);
    if ('plan' === $mode) {
        return $plan;
    }
    if (! is_string($plan_sha256) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $plan_sha256) || ! hash_equals($plan['planSha256'], $plan_sha256)) {
        throw new InvalidArgumentException('Application review Apply requires the exact current Plan hash.');
    }
    foreach (['snapshot_site_b', 'assert_site_b', 'snapshot_queue', 'restore_queue', 'begin', 'commit', 'rollback', 'create_identity', 'write', 'readback'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Application review operation {$required} is required.");
        }
    }
    $site_b_hash = $operations['snapshot_site_b']();
    $queue = $operations['snapshot_queue']();
    $transaction_started = false;
    try {
        $operations['begin']();
        $transaction_started = true;
        foreach ($plan['actions'] as $index => $action) {
            if ('create' === $action['action']) {
                $operations['create_identity']($records[$index]);
            }
        }
        foreach ($plan['actions'] as $index => $action) {
            if ('no-change' !== $action['action']) {
                $operations['write']($action['action'], $records[$index]);
            }
        }
        foreach ($records as $record) {
            $readback = $operations['readback']('application', $record['id']);
            if (! is_array($readback) || tio2_site_a_editorial_canonicalize($readback) !== tio2_site_a_editorial_canonicalize($record)) {
                throw new RuntimeException("Application review readback failed for {$record['id']}.");
            }
        }
        $operations['assert_site_b']($site_b_hash);
        $operations['restore_queue']($queue);
        $operations['commit']();
        $transaction_started = false;
    } catch (Throwable $error) {
        try {
            if ($transaction_started) {
                $operations['rollback']();
            }
        } finally {
            try {
                $operations['restore_queue']($queue);
            } finally {
                $operations['assert_site_b']($site_b_hash);
            }
        }
        throw $error;
    }
    $plan['mode'] = 'apply';
    return $plan;
}

/** @return array<string, mixed> */
function tio2_site_a_application_review_capability(array $args): array
{
    if (1 !== count($args) || ! is_string($args[0]) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-application-review-capability-[a-f0-9]{32}\.json$~D', $args[0]) || ! is_readable($args[0])) {
        throw new RuntimeException('Application review capability file is required.');
    }
    $capability = json_decode((string) file_get_contents($args[0]), true, 64, JSON_THROW_ON_ERROR);
    $keys = is_array($capability) ? array_keys($capability) : [];
    sort($keys, SORT_STRING);
    $required = ['applicationsPath', 'applicationsSha256', 'mode', 'planSha256', 'productsPath', 'productsSha256', 'token', 'version'];
    $token = getenv('TIO2_LOCAL_APPLICATION_REVIEW_CAPABILITY');
    if (! is_array($capability) || $required !== $keys || 1 !== $capability['version'] || ! is_string($token) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token) || ! hash_equals($token, $capability['token']) || ! in_array($capability['mode'], ['plan', 'apply'], true)) {
        throw new RuntimeException('Application review capability contract was rejected.');
    }
    foreach (['applications', 'products'] as $kind) {
        $path = $capability[$kind . 'Path'];
        $hash = $capability[$kind . 'Sha256'];
        if (! is_string($path) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-application-review-' . $kind . '-[a-f0-9]{32}\.json$~D', $path) || ! is_readable($path) || ! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash) || ! hash_equals($hash, (string) hash_file('sha256', $path))) {
            throw new RuntimeException("Application review staged {$kind} snapshot was rejected.");
        }
    }
    if ('plan' === $capability['mode'] ? null !== $capability['planSha256'] : (! is_string($capability['planSha256']) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $capability['planSha256']))) {
        throw new RuntimeException('Application review Plan hash capability was rejected.');
    }
    return $capability;
}

if (defined('WP_CLI') && WP_CLI) {
    try {
        tio2_site_a_editorial_assert_local_wp_environment();
        $capability = tio2_site_a_application_review_capability($args);
        if (! current_user_can('manage_options') || ! function_exists('update_field') || ! function_exists('tio2_application_field_definitions')) {
            throw new RuntimeException('Application review import requires an authenticated local administrator, ACF, and the Site Model.');
        }
        $applications = json_decode((string) file_get_contents($capability['applicationsPath']), true, 512, JSON_THROW_ON_ERROR);
        $products = json_decode((string) file_get_contents($capability['productsPath']), true, 512, JSON_THROW_ON_ERROR);
        global $wpdb;
        $lock_name = 'tio2-site-a-application-review-drafts';
        if (1 !== (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock_name))) {
            throw new RuntimeException('Could not acquire the Application review import lock.');
        }
        try {
            $result = tio2_site_a_application_review_execute(
                $capability['mode'],
                $applications,
                $products,
                ['applications' => $capability['applicationsSha256'], 'products' => $capability['productsSha256']],
                $capability['planSha256'],
                tio2_site_a_editorial_wp_operations()
            );
        } finally {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock_name));
        }
        WP_CLI::log('TIO2_SITE_A_APPLICATION_REVIEW_RESULT ' . wp_json_encode($result));
    } catch (Throwable $error) {
        WP_CLI::error('Site A Application review import failed: ' . $error->getMessage());
    }
}
