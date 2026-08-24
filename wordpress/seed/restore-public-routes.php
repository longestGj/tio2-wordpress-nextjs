<?php

if (! defined('ABSPATH')) {
    exit(1);
}

define('TIO2_ROOT_ONLY_LIBRARY_ONLY', true);
require_once __DIR__ . '/export-route-status-snapshot.php';

try {
    if (! defined('WP_CLI') || ! WP_CLI) {
        tio2_root_only_fail('Restore is CLI-only and unreachable from HTTP.');
    }
    $snapshot_path = (string) ($args[0] ?? '');
    if ('' === $snapshot_path) {
        tio2_root_only_fail('Restore requires an explicit snapshot path.');
    }
    $failure_after = 0;
    foreach ($args as $argument) {
        if (str_starts_with((string) $argument, 'failure-after=')) {
            $failure_after = (int) substr((string) $argument, strlen('failure-after='));
        }
    }
    if ($failure_after < 0 || $failure_after > 1009) {
        tio2_root_only_fail('Invalid restore failure injection boundary.');
    }

    $snapshot = tio2_root_only_load_snapshot($snapshot_path);
    $live = tio2_root_only_preflight($snapshot, false);
    $snapshot_checksum = (string) $snapshot['snapshotChecksum'];
    $invalidation_batches = tio2_root_only_invalidation_batches($snapshot);
    if ('legacy' === $live['state']) {
        WP_CLI::log('TIO2_ROOT_ONLY_RESULT ' . (string) wp_json_encode([
            'mode' => 'restore',
            'state' => 'legacy',
            'mutated' => 0,
            'snapshotChecksum' => $snapshot_checksum,
            'invalidationBatches' => $invalidation_batches,
            'idempotent' => true,
        ], JSON_UNESCAPED_SLASHES));
        return;
    }

    $mutated_records = [];
    try {
        tio2_root_only_without_webhook_fanout(static function () use (
            $snapshot,
            $failure_after,
            &$mutated_records
        ): void {
            tio2_root_only_with_restore_context(
                $snapshot,
                static function () use ($snapshot, $failure_after, &$mutated_records): void {
                    foreach ($snapshot['records'] as $record) {
                        $post_id = (int) $record['id'];
                        $mutated_records[] = $record;
                        if ('page-route' === $record['kind']) {
                            // Page restore changes prior status only. It never writes
                            // copy, ACF, media, path, slug, or ownership fields.
                            tio2_root_only_update_status($post_id, (string) $record['previousStatus']);
                        } elseif ('product-fixture' === $record['kind']) {
                            // Product restore changes prior status plus migration-owned
                            // original scopes only; publicPath and copy remain untouched.
                            tio2_root_only_update_scopes($post_id, $record['previousSiteScopes']);
                            tio2_root_only_update_status($post_id, 'publish');
                        } else {
                            tio2_root_only_fail('Restore encountered an unknown typed snapshot record.');
                        }
                        if ($failure_after > 0 && count($mutated_records) === $failure_after) {
                            tio2_root_only_fail('Injected restore transition failure.');
                        }
                    }
                }
            );
        });
    } catch (Throwable $mutation_error) {
        $rollback_errors = [];
        try {
            tio2_root_only_without_webhook_fanout(static function () use (
                $mutated_records,
                &$rollback_errors
            ): void {
                try {
                    foreach (array_reverse($mutated_records) as $record) {
                        $post_id = (int) $record['id'];
                        if ('page-route' === $record['kind']) {
                            tio2_root_only_update_status($post_id, 'draft');
                        } elseif ('product-fixture' === $record['kind']) {
                            tio2_root_only_update_status($post_id, 'draft');
                            tio2_root_only_update_scopes($post_id, ['tio2-a']);
                        } else {
                            tio2_root_only_fail('Restore compensation encountered an unknown typed snapshot record.');
                        }
                    }
                } catch (Throwable $rollback_error) {
                    $rollback_errors[] = $rollback_error->getMessage();
                }
            });
        } catch (Throwable $rollback_context_error) {
            $rollback_errors[] = $rollback_context_error->getMessage();
        }
        if ([] !== $rollback_errors) {
            tio2_root_only_fail(
                $mutation_error->getMessage() . '; compensating rollback FAILED: ' . implode('; ', $rollback_errors)
            );
        }
        $rolled_back = tio2_root_only_preflight($snapshot, false);
        if ('target' !== $rolled_back['state']) {
            tio2_root_only_fail($mutation_error->getMessage() . '; compensating rollback did not restore target state.');
        }
        WP_CLI::warning('TIO2_ROOT_ONLY_COMPENSATION compensating rollback complete');
        tio2_root_only_fail($mutation_error->getMessage() . '; compensating rollback complete.');
    }

    $restored = tio2_root_only_preflight($snapshot, false);
    if ('legacy' !== $restored['state']) {
        tio2_root_only_fail('Restore postflight did not reach complete prior state.');
    }
    WP_CLI::log('TIO2_ROOT_ONLY_RESULT ' . (string) wp_json_encode([
        'mode' => 'restore',
        'state' => 'legacy',
        'mutated' => count($mutated_records),
        'snapshotChecksum' => $snapshot_checksum,
        'invalidationBatches' => $invalidation_batches,
        'idempotent' => false,
    ], JSON_UNESCAPED_SLASHES));
} catch (Throwable $error) {
    WP_CLI::error($error->getMessage());
}
