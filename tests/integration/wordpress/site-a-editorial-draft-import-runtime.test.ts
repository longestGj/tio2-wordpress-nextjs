import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const importerPath = fileURLToPath(
  new URL('../../../wordpress/seed/apply-site-a-editorial-drafts.php', import.meta.url),
)

function runControlledImporter() {
  return spawnSync('docker', [
    'compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--no-deps', '--entrypoint', 'php', 'wpcli',
    '-r', String.raw`
define('ABSPATH', __DIR__);
function wp_json_encode($value) { return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES); }
function get_posts($arguments) { if (!empty($GLOBALS['assert_editorial_cross_type_lookup'])) { $expected = 'public_path' === ($arguments['meta_key'] ?? null) ? ['tio2_application', 'tio2_document'] : 'any'; if ($expected !== ($arguments['post_type'] ?? null)) throw new RuntimeException('Editorial identity/path lookup used the wrong collision scope.'); } return []; }
function get_post_meta($post_id) { return $GLOBALS['controlled_raw_meta'] ?? []; }
require $argv[1];

$acf_comparison = ['field_tio2_resource_comparison_table_columns' => [['label' => 'Synthetic option'], ['label' => 'Observation']], 'field_tio2_resource_comparison_table_rows' => [['cells' => [['value' => 'Option A'], ['value' => 'Record a result']]]]];
if (['columns' => ['Synthetic option', 'Observation'], 'rows' => [['Option A', 'Record a result']]] !== tio2_site_a_editorial_normalize_comparison_table($acf_comparison)) throw new RuntimeException('Unformatted ACF Group keys were not normalized.');
$GLOBALS['assert_editorial_cross_type_lookup'] = true;
tio2_site_a_editorial_find_wp_record('application', 'coatings');
tio2_site_a_editorial_find_wp_path('/applications');
$GLOBALS['assert_editorial_cross_type_lookup'] = false;
$GLOBALS['controlled_raw_meta'] = ['application_id' => ['coatings'], '_application_id' => ['field_tio2_application_id'], 'public_path' => ['/applications/coatings'], '_edit_lock' => ['controlled'], 'private_evidence_path' => ['D:/private/source']];
try { tio2_site_a_editorial_assert_wp_meta_allowlist(700, 'application'); throw new RuntimeException('Private raw metadata was accepted.'); } catch (RuntimeException $expected) { if (!str_contains($expected->getMessage(), 'unexpected metadata key')) throw $expected; }
unset($GLOBALS['controlled_raw_meta']['private_evidence_path']);
tio2_site_a_editorial_assert_wp_meta_allowlist(700, 'application');

$applications = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$resources = json_decode(file_get_contents($argv[3]), true, 512, JSON_THROW_ON_ERROR);
$product_ids = ['TP-P100','TP-P300','TP-S100','TP-C200','TP-C410','TP-C120','TP-I100','TP-H100','TP-P200','TP-P110','TP-P320','TP-P120','TP-P310','TP-P330','TP-PA100','TP-PA110','TP-PA120','TP-C050','TP-C100','TP-C110','TP-I200','TP-C300','TP-C310','TP-C400','TP-U100'];
$products = ['version' => '0.1', 'siteId' => 'tio2-a', 'products' => array_map(static fn(string $id): array => ['productId' => $id], $product_ids)];
$hashes = [
    'applications' => hash('sha256', json_encode($applications, JSON_THROW_ON_ERROR)),
    'resources' => hash('sha256', json_encode($resources, JSON_THROW_ON_ERROR)),
    'products' => hash('sha256', json_encode($products, JSON_THROW_ON_ERROR)),
];
$store = ['records' => [], 'siteB' => ['frozen' => true], 'queue' => [['before' => true]], 'begins' => 0, 'commits' => 0, 'rollbacks' => 0, 'writes' => 0, 'identities' => 0];
$transaction_snapshot = null;
$operations = [
    'find' => static fn(string $type, string $id): ?array => $GLOBALS['controlled_store']['records'][$type . ':' . $id] ?? null,
    'find_path' => static fn(string $path): ?array => null,
    'resolve_product' => static fn(string $id): ?array => ['entityType' => 'product', 'id' => $id, 'postType' => 'tio2_product', 'scopes' => ['tio2-a']],
    'snapshot_site_b' => static fn(): string => hash('sha256', json_encode($GLOBALS['controlled_store']['siteB'], JSON_THROW_ON_ERROR)),
    'assert_site_b' => static function(string $hash): void { if (!hash_equals($hash, hash('sha256', json_encode($GLOBALS['controlled_store']['siteB'], JSON_THROW_ON_ERROR)))) throw new RuntimeException('Site B changed.'); },
    'snapshot_queue' => static fn(): array => $GLOBALS['controlled_store']['queue'],
    'restore_queue' => static function(array $queue): void { $GLOBALS['controlled_store']['queue'] = $queue; },
    'begin' => static function(): void { $GLOBALS['transaction_snapshot'] = $GLOBALS['controlled_store']; ++$GLOBALS['controlled_store']['begins']; },
    'commit' => static function(): void { ++$GLOBALS['controlled_store']['commits']; },
    'rollback' => static function(): void { $rollbacks = $GLOBALS['controlled_store']['rollbacks'] + 1; $GLOBALS['controlled_store'] = $GLOBALS['transaction_snapshot']; $GLOBALS['controlled_store']['rollbacks'] = $rollbacks; },
    'create_identity' => static function(array $record): void { $GLOBALS['controlled_store']['records'][$record['entityType'] . ':' . $record['id']] = ['entityType' => $record['entityType'], 'id' => $record['id'], 'postType' => $record['postType'], 'scopes' => ['tio2-a'], 'path' => $record['path']]; ++$GLOBALS['controlled_store']['identities']; },
    'write' => static function(string $action, array $record): void { if (!in_array($action, ['create', 'update'], true) || 'draft' !== $record['status'] || ['tio2-a'] !== $record['scopes']) throw new RuntimeException('Unsafe write.'); $GLOBALS['controlled_store']['records'][$record['entityType'] . ':' . $record['id']] = $record; $GLOBALS['controlled_store']['queue'][] = ['mutated' => $record['id']]; ++$GLOBALS['controlled_store']['writes']; },
    'readback' => static fn(string $type, string $id): ?array => $GLOBALS['controlled_store']['records'][$type . ':' . $id] ?? null,
];
$GLOBALS['controlled_store'] = &$store;
$GLOBALS['transaction_snapshot'] = &$transaction_snapshot;

$before_plan = $store;
$plan = tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $operations);
if ($before_plan !== $store || 39 !== count($plan['actions']) || 39 !== count(array_filter($plan['actions'], static fn(array $a): bool => 'create' === $a['action'])) || 39 !== count($plan['deferredProductEdges'])) throw new RuntimeException('Deferred Plan was not a read-only deterministic 39-create plan.');
$expected_records = tio2_site_a_editorial_expected_records('DeferredProductRelations', $applications, $resources, $products);
$application_meta = $expected_records[0]['meta'];
$resource_meta = array_values(array_filter($expected_records, static fn(array $record): bool => 'resource' === $record['entityType']))[0]['meta'];
if (!array_key_exists('family', $application_meta) || !array_key_exists('application_context', $application_meta) || array_key_exists('application_family', $application_meta) || array_key_exists('context', $application_meta) || !array_key_exists('cluster', $resource_meta) || array_key_exists('resource_cluster', $resource_meta)) throw new RuntimeException('Normalized records do not use the installed ACF field names.');
$plan_again = tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $operations);
if ($plan['planSha256'] !== $plan_again['planSha256'] || $plan['actions'] !== $plan_again['actions'] || $plan['deferredProductEdges'] !== $plan_again['deferredProductEdges']) throw new RuntimeException('Plan was not deterministic.');
$first_edge = $plan['deferredProductEdges'][0];
$last_edge = $plan['deferredProductEdges'][38];
if (['sourceType' => 'application', 'sourceId' => 'applications-hub', 'field' => 'relationships', 'targetProductId' => 'TP-P100'] !== $first_edge || ['sourceType' => 'resource', 'sourceId' => 'resources-hub', 'field' => 'relationships', 'targetProductId' => 'TP-P100'] !== $last_edge) throw new RuntimeException('Deferred Product edge ordering changed.');
try { tio2_site_a_editorial_draft_execute('apply', 'DeferredProductRelations', $applications, $resources, $products, $hashes, str_repeat('0', 64), $operations); throw new RuntimeException('Stale Plan hash was accepted.'); } catch (InvalidArgumentException $expected) {}
$applied = tio2_site_a_editorial_draft_execute('apply', 'DeferredProductRelations', $applications, $resources, $products, $hashes, $plan['planSha256'], $operations);
if (39 !== count($store['records']) || 39 !== $store['identities'] || 39 !== $store['writes'] || 1 !== $store['begins'] || 1 !== $store['commits'] || 0 !== $store['rollbacks'] || [['before' => true]] !== $store['queue']) throw new RuntimeException('Apply did not perform one isolated draft transaction.');
$second = tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $operations);
if (39 !== count(array_filter($second['actions'], static fn(array $a): bool => 'no-change' === $a['action'])) || 39 !== count($second['deferredProductEdges'])) throw new RuntimeException('Second Plan was not exactly 39 no-change actions plus deferred edges.');

$missing_product_operations = array_merge($operations, ['resolve_product' => static fn(string $id): ?array => null]);
try { tio2_site_a_editorial_draft_execute('plan', 'Strict', $applications, $resources, $products, $hashes, null, $missing_product_operations); throw new RuntimeException('Strict mode accepted a missing Product.'); } catch (RuntimeException $expected) { if (!str_contains($expected->getMessage(), 'Product')) throw $expected; }
$strict_plan = tio2_site_a_editorial_draft_execute('plan', 'Strict', $applications, $resources, $products, $hashes, null, $operations);
if ([] !== $strict_plan['deferredProductEdges'] || $strict_plan['planSha256'] === $plan['planSha256']) throw new RuntimeException('Strict mode did not bind a distinct zero-deferred Plan.');

$collision_operations = array_merge($operations, [
    'find' => static fn(string $type, string $id): ?array => 'applications-hub' === $id ? ['entityType' => 'application', 'id' => $id, 'postType' => 'tio2_application', 'scopes' => ['tio2-b'], 'path' => '/applications'] : null,
]);
$writes_before_collision = $store['writes'];
try { tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $collision_operations); throw new RuntimeException('Site B identity collision was accepted.'); } catch (RuntimeException $expected) { if (!str_contains($expected->getMessage(), 'scoped exactly to Site A')) throw $expected; }
if ($writes_before_collision !== $store['writes']) throw new RuntimeException('Collision reached a write.');

$failure_store = ['records' => [], 'siteB' => ['frozen' => true], 'queue' => [['before' => true]], 'begins' => 0, 'commits' => 0, 'rollbacks' => 0, 'writes' => 0, 'identities' => 0];
$GLOBALS['controlled_store'] = &$failure_store;
$failure_snapshot = null;
$GLOBALS['transaction_snapshot'] = &$failure_snapshot;
$failure_operations = array_merge($operations, [
    'write' => static function(string $action, array $record): void { $GLOBALS['controlled_store']['queue'][] = ['mutated' => $record['id']]; if ('coatings' === $record['id']) { $GLOBALS['controlled_store']['siteB']['frozen'] = false; throw new RuntimeException('Injected mid-Apply failure.'); } $GLOBALS['controlled_store']['records'][$record['entityType'] . ':' . $record['id']] = $record; ++$GLOBALS['controlled_store']['writes']; },
]);
$failure_plan = tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $failure_operations);
try { tio2_site_a_editorial_draft_execute('apply', 'DeferredProductRelations', $applications, $resources, $products, $hashes, $failure_plan['planSha256'], $failure_operations); throw new RuntimeException('Injected failure was swallowed.'); } catch (RuntimeException $expected) { if ('Injected mid-Apply failure.' !== $expected->getMessage()) throw $expected; }
if ([] !== $failure_store['records'] || ['frozen' => true] !== $failure_store['siteB'] || [['before' => true]] !== $failure_store['queue'] || 1 !== $failure_store['rollbacks'] || 0 !== $failure_store['commits']) throw new RuntimeException('Failure did not roll back records, Site B, and queue state.');

$cleanup_store = ['records' => [], 'siteB' => ['frozen' => true], 'queue' => [['before' => true]], 'begins' => 0, 'commits' => 0, 'rollbacks' => 0, 'writes' => 0, 'identities' => 0];
$GLOBALS['controlled_store'] = &$cleanup_store;
$cleanup_flags = ['queueRestored' => false, 'siteBAsserted' => false];
$cleanup_operations = array_merge($operations, [
    'rollback' => static function(): void { throw new RuntimeException('Injected rollback failure.'); },
    'write' => static function(): void { throw new RuntimeException('Injected write before rollback failure.'); },
    'restore_queue' => static function(array $queue) use (&$cleanup_flags): void { $cleanup_flags['queueRestored'] = true; $GLOBALS['controlled_store']['queue'] = $queue; },
    'assert_site_b' => static function(string $hash) use (&$cleanup_flags): void { $cleanup_flags['siteBAsserted'] = true; },
]);
$cleanup_plan = tio2_site_a_editorial_draft_execute('plan', 'DeferredProductRelations', $applications, $resources, $products, $hashes, null, $cleanup_operations);
try { tio2_site_a_editorial_draft_execute('apply', 'DeferredProductRelations', $applications, $resources, $products, $hashes, $cleanup_plan['planSha256'], $cleanup_operations); throw new RuntimeException('Rollback failure was swallowed.'); } catch (RuntimeException $expected) { if ('Injected rollback failure.' !== $expected->getMessage()) throw $expected; }
if (!$cleanup_flags['queueRestored'] || !$cleanup_flags['siteBAsserted']) throw new RuntimeException('Rollback failure skipped queue restoration or Site B assertion.');

echo json_encode(['planSha256' => $plan['planSha256'], 'deferredEdges' => count($plan['deferredProductEdges']), 'records' => count($store['records']), 'secondPlanNoChange' => count(array_filter($second['actions'], static fn(array $a): bool => 'no-change' === $a['action'])), 'rollbackCount' => $failure_store['rollbacks']], JSON_THROW_ON_ERROR);
`,
    '/workspace/wordpress/seed/apply-site-a-editorial-drafts.php',
    '/workspace/tests/fixtures/editorial/site-a-applications.synthetic.json',
    '/workspace/tests/fixtures/editorial/site-a-resources.synthetic.json',
  ], {encoding: 'utf8', timeout: 30_000})
}

describe('controlled WordPress Site A editorial draft importer boundary', () => {
  it('binds deterministic plans and atomically imports exactly 28+11 deferred drafts', () => {
    expect(existsSync(importerPath), 'editorial draft importer is missing').toBe(true)

    const result = runControlledImporter()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      planSha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
      deferredEdges: 39,
      records: 39,
      secondPlanNoChange: 39,
      rollbackCount: 1,
    })
  })
})
