<?php

if (! defined('TIO2_SITE_A_EDITORIAL_LIBRARY_CONTEXT')) {
    define('TIO2_SITE_A_EDITORIAL_LIBRARY_CONTEXT', true);
}
require_once __DIR__ . '/apply-site-a-editorial-drafts.php';

/** @param array<string, string> $hashes @return array<string, string> */
function tio2_site_a_application_page_hashes(array $hashes): array
{
    $keys = array_keys($hashes);
    sort($keys, SORT_STRING);
    if (['application', 'products'] !== $keys) {
        throw new InvalidArgumentException('The page import requires exactly Application and Product hashes.');
    }
    foreach ($hashes as $hash) {
        if (! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash)) {
            throw new InvalidArgumentException('The page import received an invalid manifest hash.');
        }
    }
    return ['application' => $hashes['application'], 'products' => $hashes['products']];
}

/**
 * Plan or apply exactly one Site A Application Draft.
 *
 * @param array<string, mixed> $page
 * @param array<string, mixed> $products
 * @param array<string, string> $hashes
 * @param array<string, callable> $operations
 * @return array<string, mixed>
 */
function tio2_site_a_application_page_draft_execute(
    string $mode,
    array $page,
    array $products,
    array $hashes,
    ?string $plan_sha256,
    array $operations
): array {
    if (! in_array($mode, ['plan', 'apply'], true)) {
        throw new InvalidArgumentException('Choose plan or apply mode for the single Application importer.');
    }
    foreach (['find', 'find_path', 'resolve_product'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Application page importer operation {$required} is required.");
        }
    }

    $manifest_hashes = tio2_site_a_application_page_hashes($hashes);
    $identity = $page['identity'] ?? null;
    if (! is_array($identity) || 'tio2-a' !== ($products['siteId'] ?? null)) {
        throw new InvalidArgumentException('The single Application page input is invalid.');
    }
    $id = $identity['id'] ?? null;
    $canonical = is_string($id) ? (TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY[$id] ?? null) : null;
    if (! is_array($canonical)
        || ($identity['path'] ?? null) !== $canonical[0]
        || ($identity['level'] ?? null) !== $canonical[1]
        || ($identity['parentId'] ?? null) !== $canonical[2]
        || ($identity['slug'] ?? null) !== ltrim(substr($canonical[0], (int) strrpos($canonical[0], '/')), '/')
    ) {
        throw new InvalidArgumentException('The single Application identity is not canonical.');
    }

    $deferred = [];
    $record = tio2_site_a_editorial_application_record(
        $page,
        'Strict',
        tio2_site_a_editorial_product_keys($products),
        $deferred
    );
    if ([] !== $deferred) {
        throw new RuntimeException('The single Application importer cannot defer Product relationships.');
    }
    foreach ($record['meta']['related_products'] as $product_id) {
        $resolved = $operations['resolve_product']($product_id);
        if (! is_array($resolved)
            || 'product' !== ($resolved['entityType'] ?? null)
            || $product_id !== ($resolved['id'] ?? null)
            || 'tio2_product' !== ($resolved['postType'] ?? null)
            || ['tio2-a'] !== ($resolved['scopes'] ?? null)
        ) {
            throw new RuntimeException("Product {$product_id} must resolve to the exact Site A Product record.");
        }
    }

    $existing = $operations['find']('application', $record['id']);
    if (is_array($existing)) {
        if ('tio2_application' !== ($existing['postType'] ?? null)
            || ['tio2-a'] !== ($existing['scopes'] ?? null)
            || $record['path'] !== ($existing['path'] ?? null)
        ) {
            throw new RuntimeException("Application {$record['id']} conflicts with a noncanonical record.");
        }
    }
    $path_owner = $operations['find_path']($record['path'], 'application', $record['id']);
    if (is_array($path_owner)
        && ('application' !== ($path_owner['entityType'] ?? null) || $record['id'] !== ($path_owner['id'] ?? null))
    ) {
        throw new RuntimeException("Canonical path {$record['path']} is owned by another record.");
    }
    $action_name = ! is_array($existing)
        ? 'create'
        : (tio2_site_a_editorial_canonicalize($existing) === tio2_site_a_editorial_canonicalize($record) ? 'no-change' : 'update');
    $action = [
        'entityType' => 'application',
        'id' => $record['id'],
        'action' => $action_name,
        'currentRecordSha256' => is_array($existing) ? tio2_site_a_editorial_sha256($existing) : null,
        'expectedRecordSha256' => tio2_site_a_editorial_sha256($record),
    ];
    $plan = [
        'version' => 1,
        'mode' => 'plan',
        'relationshipMode' => 'Strict',
        'manifestSha256' => $manifest_hashes,
        'actions' => [$action],
        'deferredProductEdges' => [],
    ];
    $plan['planSha256'] = tio2_site_a_editorial_plan_sha256($plan);
    if ('plan' === $mode) {
        return $plan;
    }
    if (! is_string($plan_sha256)
        || 1 !== preg_match('/^[a-f0-9]{64}$/D', $plan_sha256)
        || ! hash_equals($plan['planSha256'], $plan_sha256)
    ) {
        throw new InvalidArgumentException('Apply requires the exact deterministic current page Plan hash.');
    }
    foreach (['snapshot_site_b', 'assert_site_b', 'snapshot_queue', 'restore_queue', 'begin', 'commit', 'rollback', 'create_identity', 'write', 'readback'] as $required) {
        if (! isset($operations[$required]) || ! is_callable($operations[$required])) {
            throw new InvalidArgumentException("Application page importer operation {$required} is required.");
        }
    }

    $site_b_hash = $operations['snapshot_site_b']();
    $queue = $operations['snapshot_queue']();
    $transaction_started = false;
    try {
        $operations['begin']();
        $transaction_started = true;
        if ('create' === $action_name) {
            $operations['create_identity']($record);
        }
        if ('no-change' !== $action_name) {
            $operations['write']($action_name, $record);
        }
        $readback = $operations['readback']('application', $record['id']);
        if (! is_array($readback)
            || tio2_site_a_editorial_canonicalize($readback) !== tio2_site_a_editorial_canonicalize($record)
        ) {
            $difference_keys = is_array($readback)
                ? tio2_site_a_editorial_difference_keys($record, $readback)
                : ['record'];
            throw new RuntimeException(
                "Application {$record['id']} failed normalized in-transaction readback: " . implode(', ', $difference_keys) . '.'
            );
        }
        $operations['assert_site_b']($site_b_hash);
        $operations['restore_queue']($queue);
        $operations['commit']();
        $transaction_started = false;
    } catch (Throwable $error) {
        $failure = $error;
        try {
            if ($transaction_started) {
                $operations['rollback']();
            }
        } catch (Throwable $rollback_error) {
            $failure = $rollback_error;
        } finally {
            try {
                $operations['restore_queue']($queue);
            } finally {
                $operations['assert_site_b']($site_b_hash);
            }
        }
        throw $failure;
    }
    $plan['mode'] = 'apply';
    return $plan;
}

/** @return array<string, mixed> */
function tio2_site_a_application_page_capability(array $args): array
{
    if (1 !== count($args)
        || ! is_string($args[0])
        || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-application-page-capability-[a-f0-9]{32}\.json$~D', $args[0])
        || ! is_readable($args[0])
    ) {
        throw new RuntimeException('The single Application page capability file is required.');
    }
    $capability = json_decode((string) file_get_contents($args[0]), true, 64, JSON_THROW_ON_ERROR);
    $keys = is_array($capability) ? array_keys($capability) : [];
    sort($keys, SORT_STRING);
    $required = ['applicationPath', 'applicationSha256', 'mode', 'planSha256', 'productsPath', 'productsSha256', 'token', 'version'];
    $token = getenv('TIO2_LOCAL_APPLICATION_PAGE_CAPABILITY');
    if (! is_array($capability)
        || $required !== $keys
        || 1 !== $capability['version']
        || ! is_string($token)
        || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token)
        || ! hash_equals($token, $capability['token'])
        || ! in_array($capability['mode'], ['plan', 'apply'], true)
    ) {
        throw new RuntimeException('The single Application page capability contract was rejected.');
    }
    foreach (['application', 'products'] as $kind) {
        $path = $capability[$kind . 'Path'];
        $hash = $capability[$kind . 'Sha256'];
        if (! is_string($path)
            || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-application-page-' . $kind . '-[a-f0-9]{32}\.json$~D', $path)
            || ! is_readable($path)
            || ! is_string($hash)
            || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash)
            || ! hash_equals($hash, (string) hash_file('sha256', $path))
        ) {
            throw new RuntimeException("The single Application page staged {$kind} snapshot was rejected.");
        }
    }
    if ('plan' === $capability['mode']
        ? null !== $capability['planSha256']
        : (! is_string($capability['planSha256']) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $capability['planSha256']))
    ) {
        throw new RuntimeException('The single Application page Plan hash was rejected.');
    }
    return $capability;
}

if (defined('WP_CLI')
    && WP_CLI
    && ! defined('TIO2_SITE_A_APPLICATION_PAGE_LIBRARY_CONTEXT')
) {
    try {
        tio2_site_a_editorial_assert_local_wp_environment();
        $capability = tio2_site_a_application_page_capability($args);
        if (! current_user_can('manage_options')
            || ! function_exists('update_field')
            || ! function_exists('tio2_application_field_definitions')
        ) {
            throw new RuntimeException('Single Application page import requires an authenticated local administrator, ACF, and the Site Model.');
        }
        $page = json_decode((string) file_get_contents($capability['applicationPath']), true, 512, JSON_THROW_ON_ERROR);
        $products = json_decode((string) file_get_contents($capability['productsPath']), true, 512, JSON_THROW_ON_ERROR);
        global $wpdb;
        $lock_name = 'tio2-site-a-application-page-draft';
        if (1 !== (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock_name))) {
            throw new RuntimeException('Could not acquire the single Application page import lock.');
        }
        try {
            $result = tio2_site_a_application_page_draft_execute(
                $capability['mode'],
                $page,
                $products,
                ['application' => $capability['applicationSha256'], 'products' => $capability['productsSha256']],
                $capability['planSha256'],
                tio2_site_a_editorial_wp_operations()
            );
        } finally {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock_name));
        }
        WP_CLI::log('TIO2_SITE_A_APPLICATION_PAGE_RESULT ' . wp_json_encode($result));
    } catch (Throwable $error) {
        WP_CLI::error('Site A single Application page import failed: ' . $error->getMessage());
    }
}
