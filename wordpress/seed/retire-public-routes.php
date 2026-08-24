<?php

if (! defined('ABSPATH')) {
    exit(1);
}

define('TIO2_ROOT_ONLY_LIBRARY_ONLY', true);
require_once __DIR__ . '/export-route-status-snapshot.php';

try {
    if (! defined('WP_CLI') || ! WP_CLI) {
        tio2_root_only_fail('Retirement is CLI-only and unreachable from HTTP.');
    }
    $snapshot_path = (string) ($args[0] ?? '');
    if ('' === $snapshot_path) {
        tio2_root_only_fail('Retirement requires an explicit snapshot path.');
    }
    $dry_run = in_array('dry-run', $args, true);
    $failure_after = 0;
    foreach ($args as $argument) {
        if (str_starts_with((string) $argument, 'failure-after=')) {
            $failure_after = (int) substr((string) $argument, strlen('failure-after='));
        }
    }
    if ($failure_after < 0 || $failure_after > 1009) {
        tio2_root_only_fail('Invalid transition failure injection boundary.');
    }

    $snapshot = tio2_root_only_load_snapshot($snapshot_path);
    // Explicit preflight completes before the first WordPress mutation helper
    // (which uses wp_update_post and wp_set_object_terms internally).
    $live = tio2_root_only_preflight($snapshot, true);
    $snapshot_checksum = (string) $snapshot['snapshotChecksum'];
    $invalidation_batches = tio2_root_only_invalidation_batches($snapshot);

    if ($dry_run) {
        WP_CLI::log('TIO2_ROOT_ONLY_RESULT ' . (string) wp_json_encode([
            'mode' => 'dry-run',
            'state' => $live['state'],
            'mutated' => 0,
            'snapshotChecksum' => $snapshot_checksum,
            'invalidationBatches' => $invalidation_batches,
            'idempotent' => 'target' === $live['state'],
        ], JSON_UNESCAPED_SLASHES));
        return;
    }

    if ('target' === $live['state']) {
        WP_CLI::log('TIO2_ROOT_ONLY_RESULT ' . (string) wp_json_encode([
            'mode' => 'retire',
            'state' => 'target',
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
            foreach ($snapshot['records'] as $record) {
                $post_id = (int) $record['id'];
                if ('page-route' === $record['kind']) {
                    $mutated_records[] = $record;
                    tio2_root_only_update_status($post_id, 'draft');
                } elseif ('product-fixture' === $record['kind']) {
                    $mutated_records[] = $record;
                    tio2_root_only_update_status($post_id, 'draft');
                    tio2_root_only_update_scopes($post_id, ['tio2-a']);
                } else {
                    tio2_root_only_fail('Retirement encountered an unknown typed snapshot record.');
                }

                if (! hash_equals(
                    (string) $record['contentChecksum'],
                    tio2_root_only_content_checksum($post_id)
                )) {
                    tio2_root_only_fail("Retirement changed retained content for ID {$post_id}.");
                }
                if ($failure_after > 0 && count($mutated_records) === $failure_after) {
                    tio2_root_only_fail('Injected transition failure after validated mutation boundary.');
                }
            }
        });
    } catch (Throwable $mutation_error) {
        $rollback_errors = [];
        try {
            tio2_root_only_without_webhook_fanout(static function () use (
                $snapshot,
                $mutated_records,
                &$rollback_errors
            ): void {
                try {
                    tio2_root_only_with_restore_context(
                        $snapshot,
                        static function () use ($mutated_records): void {
                            foreach (array_reverse($mutated_records) as $record) {
                                $post_id = (int) $record['id'];
                                if ('page-route' === $record['kind']) {
                                    tio2_root_only_update_status($post_id, 'publish');
                                    continue;
                                } elseif ('product-fixture' === $record['kind']) {
                                    tio2_root_only_update_scopes($post_id, []);
                                    tio2_root_only_update_status($post_id, 'publish');
                                } else {
                                    tio2_root_only_fail('Retirement compensation encountered an unknown typed snapshot record.');
                                }
                            }
                        }
                    );
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
        $rolled_back = tio2_root_only_preflight($snapshot, true);
        if ('legacy' !== $rolled_back['state']) {
            tio2_root_only_fail($mutation_error->getMessage() . '; compensating rollback did not restore legacy state.');
        }
        WP_CLI::warning('TIO2_ROOT_ONLY_COMPENSATION compensating rollback complete');
        tio2_root_only_fail($mutation_error->getMessage() . '; compensating rollback complete.');
    }

    $target = tio2_root_only_preflight($snapshot, true);
    if ('target' !== $target['state']) {
        tio2_root_only_fail('Retirement postflight did not reach the complete target state.');
    }
    WP_CLI::log('TIO2_ROOT_ONLY_RESULT ' . (string) wp_json_encode([
        'mode' => 'retire',
        'state' => 'target',
        'mutated' => count($mutated_records),
        'snapshotChecksum' => $snapshot_checksum,
        'invalidationBatches' => $invalidation_batches,
        'idempotent' => false,
    ], JSON_UNESCAPED_SLASHES));
} catch (Throwable $error) {
    WP_CLI::error($error->getMessage());
}
