<?php

if (! defined('ABSPATH')) {
    exit;
}

define('TIO2_SITE_A_EDITORIAL_AUDIT_CONTEXT', true);
require_once __DIR__ . '/apply-site-a-editorial-drafts.php';

/**
 * @param list<array<string, mixed>> $actual_records
 * @param array<string, string> $manifest_hashes
 * @return array<string, mixed>
 */
function tio2_site_a_editorial_audit_build(
    string $relationship_mode,
    array $applications,
    array $resources,
    array $products,
    array $manifest_hashes,
    array $actual_records,
    string $site_b_before,
    string $site_b_after
): array {
    $hashes = tio2_site_a_editorial_validate_hashes($manifest_hashes);
    $deferred = [];
    $expected_records = tio2_site_a_editorial_expected_records($relationship_mode, $applications, $resources, $products, $deferred);
    if (! hash_equals($site_b_before, $site_b_after)) {
        throw new RuntimeException('Editorial audit detected a Site B invariant change.');
    }

    $expected = [];
    foreach ($expected_records as $record) {
        $expected[$record['entityType'] . ':' . $record['id']] = $record;
    }
    $actual = [];
    foreach ($actual_records as $record) {
        if (! is_array($record) || ! is_string($record['entityType'] ?? null) || ! is_string($record['id'] ?? null)) {
            throw new RuntimeException('Editorial audit found a malformed readback record.');
        }
        $key = $record['entityType'] . ':' . $record['id'];
        if (isset($actual[$key])) {
            throw new RuntimeException("Editorial audit found duplicate record {$key}.");
        }
        if (! isset($expected[$key])) {
            throw new RuntimeException("Editorial audit found unexpected record {$key}.");
        }
        $actual[$key] = $record;
    }
    foreach ($expected as $key => $record) {
        if (! isset($actual[$key])) {
            throw new RuntimeException("Editorial audit found missing record {$key}.");
        }
        if ('draft' !== ($actual[$key]['status'] ?? null)) {
            throw new RuntimeException("Editorial audit rejected {$key} status; only draft is allowed.");
        }
        if (['tio2-a'] !== ($actual[$key]['scopes'] ?? null)) {
            throw new RuntimeException("Editorial audit rejected {$key} scope; only exact Site A is allowed.");
        }
        if (tio2_site_a_editorial_canonicalize($record) !== tio2_site_a_editorial_canonicalize($actual[$key])) {
            throw new RuntimeException("Editorial audit found a manifest mismatch for {$key}.");
        }
    }

    ksort($actual, SORT_STRING);
    $application_records = [];
    $resource_records = [];
    $export_records = [];
    foreach ($actual as $record) {
        $normalized = tio2_site_a_editorial_canonicalize($record);
        if ('application' === $record['entityType']) {
            $application_records[] = $normalized;
        } else {
            $resource_records[] = $normalized;
        }
        $export_records[] = [
            'entityType' => $record['entityType'],
            'id' => $record['id'],
            'status' => $record['status'],
            'scopes' => $record['scopes'],
            'slug' => $record['slug'],
            'path' => $record['path'],
            'title' => $record['title'],
            'meta' => $record['meta'],
            'recordSha256' => 'sha256:' . tio2_site_a_editorial_sha256($normalized),
        ];
    }
    return [
        'version' => 1,
        'relationshipMode' => $relationship_mode,
        'manifestSha256' => $hashes,
        'recordCount' => count($export_records),
        'applicationCount' => count($application_records),
        'resourceCount' => count($resource_records),
        'deferredProductEdges' => $deferred,
        'records' => $export_records,
        'applicationSha256' => 'sha256:' . tio2_site_a_editorial_sha256($application_records),
        'resourceSha256' => 'sha256:' . tio2_site_a_editorial_sha256($resource_records),
        'readbackSha256' => 'sha256:' . tio2_site_a_editorial_sha256(array_values($actual)),
        'deferredProductEdgesSha256' => 'sha256:' . tio2_site_a_editorial_sha256($deferred),
        'siteBInvariantSha256' => 'sha256:' . tio2_site_a_editorial_sha256($site_b_before),
    ];
}

/** @return array<string, mixed> */
function tio2_site_a_editorial_audit_read_capability(array $args): array
{
    if (1 !== count($args) || ! is_string($args[0]) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-editorial-audit-capability-[a-f0-9]{32}\.json$~D', $args[0]) || ! is_readable($args[0])) {
        throw new RuntimeException('The local editorial audit capability file is required.');
    }
    $capability = json_decode((string) file_get_contents($args[0]), true, 64, JSON_THROW_ON_ERROR);
    $keys = is_array($capability) ? array_keys($capability) : [];
    sort($keys, SORT_STRING);
    $required = ['applicationsPath', 'applicationsSha256', 'productsPath', 'productsSha256', 'relationshipMode', 'resourcesPath', 'resourcesSha256', 'token', 'version'];
    $token = getenv('TIO2_LOCAL_EDITORIAL_AUDIT_CAPABILITY');
    if (! is_array($capability) || $required !== $keys || 1 !== $capability['version'] || ! is_string($token) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token) || ! hash_equals($token, $capability['token']) || ! in_array($capability['relationshipMode'], ['Strict', 'DeferredProductRelations'], true)) {
        throw new RuntimeException('The local editorial audit capability contract was rejected.');
    }
    foreach (['applications', 'resources', 'products'] as $kind) {
        $path = $capability[$kind . 'Path'];
        $hash = $capability[$kind . 'Sha256'];
        if (! is_string($path) || 1 !== preg_match('~^/workspace/wordpress/seed/\.runtime-site-a-editorial-audit-' . $kind . '-[a-f0-9]{32}\.json$~D', $path) || ! is_readable($path) || ! is_string($hash) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $hash) || ! hash_equals($hash, (string) hash_file('sha256', $path))) {
            throw new RuntimeException("The staged editorial audit {$kind} snapshot was rejected.");
        }
    }
    return $capability;
}

/** @return list<array<string, mixed>> */
function tio2_site_a_editorial_audit_read_wp_records(?callable $find = null): array
{
    $find ??= static fn (string $type, string $id): ?array => tio2_site_a_editorial_find_wp_record($type, $id);
    $records = [];
    foreach (['application' => TIO2_SITE_A_EDITORIAL_APPLICATION_INVENTORY, 'resource' => TIO2_SITE_A_EDITORIAL_RESOURCE_INVENTORY] as $entity_type => $inventory) {
        foreach (array_keys($inventory) as $id) {
            $record = $find($entity_type, $id);
            if (is_array($record)) {
                $records[] = $record;
            }
        }
    }
    return $records;
}

if (defined('WP_CLI') && WP_CLI) {
    try {
        $capability = tio2_site_a_editorial_audit_read_capability($args);
        if (! current_user_can('manage_options') || ! function_exists('get_field')) {
            throw new RuntimeException('Local editorial audit requires an authenticated administrator, ACF, and the Site Model.');
        }
        $applications = json_decode((string) file_get_contents($capability['applicationsPath']), true, 512, JSON_THROW_ON_ERROR);
        $resources = json_decode((string) file_get_contents($capability['resourcesPath']), true, 512, JSON_THROW_ON_ERROR);
        $products = json_decode((string) file_get_contents($capability['productsPath']), true, 512, JSON_THROW_ON_ERROR);
        $site_b_before = tio2_site_a_editorial_site_b_hash();
        $records = tio2_site_a_editorial_audit_read_wp_records();
        $site_b_after = tio2_site_a_editorial_site_b_hash();
        $report = tio2_site_a_editorial_audit_build($capability['relationshipMode'], $applications, $resources, $products, ['applications' => $capability['applicationsSha256'], 'resources' => $capability['resourcesSha256'], 'products' => $capability['productsSha256']], $records, $site_b_before, $site_b_after);
        WP_CLI::log('TIO2_SITE_A_EDITORIAL_AUDIT_RESULT ' . wp_json_encode($report));
    } catch (Throwable $error) {
        WP_CLI::error('Site A editorial audit failed: ' . $error->getMessage());
    }
}
