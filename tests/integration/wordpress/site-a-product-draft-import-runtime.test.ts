import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const importerPath = fileURLToPath(
  new URL('../../../wordpress/seed/apply-site-a-product-drafts.php', import.meta.url),
)
const containerImporterPath = '/workspace/wordpress/seed/apply-site-a-product-drafts.php'

function runControlledImporter() {
  const result = spawnSync('docker', [
    'compose',
    '--env-file', 'wordpress/.env',
    '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--no-deps',
    '--entrypoint', 'php',
    'wpcli',
    '-r', String.raw`
define('ABSPATH', __DIR__);
function wp_json_encode($value) { return json_encode($value, JSON_THROW_ON_ERROR); }
function get_posts($arguments) {
    if (!empty($GLOBALS['wp_relationship_query_mode']) && in_array($arguments['meta_key'] ?? null, ['application_id', 'resource_id'], true)) {
        return 'missing' === $GLOBALS['wp_relationship_query_mode'] ? [] : [888];
    }
    return !empty($GLOBALS['wp_adapter_collision']) ? [777] : [];
}
function wp_get_object_terms($id, $taxonomy, $arguments) {
    if (888 === $id && 'site_scope' === $taxonomy) { return $GLOBALS['wp_relationship_scopes'] ?? ['tio2-a']; }
    return 'site_scope' === $taxonomy ? ['tio2-b'] : [];
}
function is_wp_error($value) { return false; }
function get_post_meta($id, $key) { return 'public_path' === $key ? '/products/tp-p100' : ''; }
function get_field($field, $id, $format) {
    if (888 === $id && 'application_id' === $field) { return 'controlled-application'; }
    if (888 === $id && 'resource_id' === $field) { return 'controlled-resource'; }
    return 'product_id' === $field ? 'TP-P100' : null;
}
function get_post_field($field, $id) { return 'post_name' === $field ? 'tp-p100' : 'Controlled Site B collision'; }
function get_post_status($id) { return 888 === $id ? ($GLOBALS['wp_relationship_status'] ?? 'draft') : 'draft'; }
function get_post_type($id) { return 888 === $id ? ($GLOBALS['wp_relationship_post_type'] ?? 'tio2_application') : 'tio2_product'; }
require $argv[1];

$ids = ['TP-P100','TP-P300','TP-S100','TP-C200','TP-C410','TP-C120','TP-I100','TP-H100','TP-P200','TP-P110','TP-P320','TP-P120','TP-P310','TP-P330','TP-PA100','TP-PA110','TP-PA120','TP-C050','TP-C100','TP-C110','TP-I200','TP-C300','TP-C310','TP-C400','TP-U100'];
$products = [];
foreach ($ids as $index => $product_id) {
    $slug = strtolower($product_id);
    $products[] = [
        'productId' => $product_id,
        'slug' => $slug,
        'path' => '/products/' . $slug,
        'title' => 'Controlled fixture ' . $product_id,
        'family' => ['targetType' => 'productFamily', 'targetKey' => 'controlled-family'],
        'metaTitle' => 'Controlled meta title ' . $product_id,
        'metaDescription' => 'Controlled meta description ' . $product_id,
        'eyebrow' => 'Controlled eyebrow',
        'customerProblemHeadline' => 'Controlled problem headline',
        'quickAnswer' => '<p>Controlled quick answer.</p>',
        'productType' => 'Controlled product type',
        'primaryApplication' => 'Controlled application',
        'packaging' => 'Controlled packaging',
        'tdsAccess' => 'Available on request only.',
        'fitWhen' => ['one', 'two', 'three'],
        'discussFirstWhen' => ['one'],
        'performancePriorities' => [
            ['title' => 'Priority one', 'explanation' => 'Controlled explanation one.'],
            ['title' => 'Priority two', 'explanation' => 'Controlled explanation two.'],
            ['title' => 'Priority three', 'explanation' => 'Controlled explanation three.'],
        ],
        'recommendedApplications' => [['targetType' => 'application', 'targetKey' => 'controlled-application']],
        'evidenceStatement' => '<p>Controlled evidence.</p>',
        'typicalProperties' => [['property' => 'Property', 'value' => '1', 'unit' => 'unit', 'displayOrder' => 1]],
        'validationChecklist' => ['Controlled validation.'],
        'faqItems' => array_map(
            static fn (int $number): array => ['question' => 'Controlled question ' . $number . '?', 'answer' => '<p>Controlled answer.</p>'],
            range(1, 6)
        ),
        'relatedLinks' => [
            'applications' => [['targetType' => 'application', 'targetKey' => 'controlled-application']],
            'resources' => [['targetType' => 'resource', 'targetKey' => 'controlled-resource']],
            'products' => [['targetType' => 'product', 'targetKey' => 'TP-P300']],
        ],
    ];
}
$manifest = ['version' => '0.1', 'siteId' => 'tio2-a', 'products' => $products];
$hash = hash('sha256', json_encode($manifest, JSON_THROW_ON_ERROR));
$normalized_products = tio2_site_a_product_draft_validate_manifest($manifest);
$GLOBALS['wp_relationship_query_mode'] = 'resolved';
$GLOBALS['wp_relationship_scopes'] = ['tio2-a'];
$GLOBALS['wp_relationship_status'] = 'draft';
tio2_site_a_product_draft_assert_relationship_targets($normalized_products[0]);
if (['targetType' => 'application', 'targetKey' => 'controlled-application'] !== tio2_site_a_product_draft_target_from_wp_id(888, 'application')) { throw new RuntimeException('Application readback did not use its stable ID.'); }
$GLOBALS['wp_relationship_query_mode'] = 'missing';
try { tio2_site_a_product_draft_assert_relationship_targets($normalized_products[0]); throw new RuntimeException('Plan resolver accepted a missing stable target.'); } catch (RuntimeException $expected) { if (!str_contains($expected->getMessage(), 'must resolve to exactly one local record during Plan')) { throw $expected; } }
unset($GLOBALS['wp_relationship_query_mode'], $GLOBALS['wp_relationship_scopes'], $GLOBALS['wp_relationship_status'], $GLOBALS['wp_relationship_post_type']);
$store = ['products' => [], 'siteB' => ['unchanged' => true], 'deleted' => false, 'writes' => 0, 'identityCreates' => 0, 'begins' => 0, 'rollbacks' => 0, 'commits' => 0];
$snapshot = null;
$prepare_calls = 0;
$relationship_assertions = 0;
$allowed_meta = ['product_id','public_path','meta_title','meta_description','eyebrow','customer_problem_headline','quick_answer','product_type','process','primary_application','positioning','surface_treatment','packaging','tds_access','fit_when','discuss_first_when','performance_priorities','recommended_applications','evidence_statement','typical_properties','validation_checklist','faq_items','related_links'];
$operations = [
    'begin' => static function () use (&$store, &$snapshot): void { $snapshot = $store; ++$store['begins']; },
    'commit' => static function () use (&$store): void { ++$store['commits']; },
    'rollback' => static function () use (&$store, &$snapshot): void { $store = $snapshot; ++$store['rollbacks']; },
    'find' => static function (string $product_id) use (&$store): ?array { return $store['products'][$product_id] ?? null; },
    'assert_relationship_targets' => static function (array $record) use (&$relationship_assertions): void {
        ++$relationship_assertions;
        if ('application' !== $record['meta']['recommended_applications'][0]['targetType']) {
            throw new RuntimeException('Controlled relationship target was not normalized.');
        }
    },
    'prepare' => static function (array $record) use (&$prepare_calls): array { ++$prepare_calls; return $record; },
    'resolve' => static function (string $type, string $key): int { return crc32($type . ':' . $key); },
    'create_identity' => static function (array $record) use (&$store): void { $store['products'][$record['productId']] = ['productId' => $record['productId'], 'scopes' => ['tio2-a']]; ++$store['identityCreates']; },
    'write' => static function (string $action, array $record) use (&$store, $allowed_meta): void {
        if (!in_array($action, ['create', 'update'], true)) { throw new RuntimeException('Unexpected mutation action.'); }
        if ('draft' !== $record['status'] || ['tio2-a'] !== $record['scopes']) { throw new RuntimeException('Importer escaped draft-only Site A scope.'); }
        foreach (array_keys($record['meta']) as $key) { if (!in_array($key, $allowed_meta, true)) { throw new RuntimeException('Unknown meta write: ' . $key); } }
        $store['products'][$record['productId']] = $record;
        ++$store['writes'];
    },
    'snapshot_site_b' => static function () use (&$store): string { return hash('sha256', json_encode($store['siteB'], JSON_THROW_ON_ERROR)); },
    'assert_site_b' => static function (string $hash) use (&$store): void { if ($hash !== hash('sha256', json_encode($store['siteB'], JSON_THROW_ON_ERROR))) { throw new RuntimeException('Site B changed.'); } },
];

$before_plan = ['products' => $store['products'], 'siteB' => $store['siteB'], 'writes' => $store['writes']];
$plan = tio2_site_a_product_draft_execute('plan', $manifest, $hash, null, $operations);
if ($before_plan !== ['products' => $store['products'], 'siteB' => $store['siteB'], 'writes' => $store['writes']] || 0 !== $prepare_calls || 25 !== $relationship_assertions || 25 !== count($plan['actions']) || 25 !== count(array_filter($plan['actions'], static fn(array $action): bool => 'create' === $action['action']))) { throw new RuntimeException('Plan changed state, skipped relationship resolution, or did not list 25 creates.'); }
$missing_target_operations = $operations;
$missing_target_operations['assert_relationship_targets'] = static function (): void { throw new RuntimeException('Controlled missing Application target.'); };
try { tio2_site_a_product_draft_execute('plan', $manifest, $hash, null, $missing_target_operations); throw new RuntimeException('Plan accepted a missing Application target.'); } catch (RuntimeException $expected) { if ('Controlled missing Application target.' !== $expected->getMessage()) { throw $expected; } }
try { tio2_site_a_product_draft_execute('apply', $manifest, $hash, str_repeat('0', 64), $operations); throw new RuntimeException('Apply accepted a mismatched Plan hash.'); } catch (InvalidArgumentException $expected) {}
$first = tio2_site_a_product_draft_execute('apply', $manifest, $hash, $hash, $operations);
if (25 !== count($store['products']) || 25 !== $store['identityCreates'] || 25 !== count(array_filter($first['actions'], static fn(array $action): bool => 'create' === $action['action'])) || $store['deleted']) { throw new RuntimeException('Apply did not deterministically create draft Products.'); }
$writes_after_first = $store['writes'];
$second = tio2_site_a_product_draft_execute('apply', $manifest, $hash, $hash, $operations);
if ($writes_after_first !== $store['writes'] || 25 !== count(array_filter($second['actions'], static fn(array $action): bool => 'no-change' === $action['action']))) { throw new RuntimeException('Second apply was not idempotent.'); }
foreach ($store['products'] as $product_id => $record) { if ($product_id !== $record['productId'] || 'draft' !== $record['status'] || ['tio2-a'] !== $record['scopes'] || $record['slug'] !== strtolower($product_id) || $record['path'] !== '/products/' . strtolower($product_id)) { throw new RuntimeException('Canonical draft record mismatch.'); } }

$failure_store = ['products' => [], 'siteB' => ['unchanged' => true], 'rollbacks' => 0];
$failure_snapshot = null;
$failure_identity_creates = 0;
$failure_operations = [
    'begin' => static function () use (&$failure_store, &$failure_snapshot): void { $failure_snapshot = $failure_store; },
    'commit' => static function (): void { throw new RuntimeException('A failed import must not commit.'); },
    'rollback' => static function () use (&$failure_store, &$failure_snapshot): void { $failure_store = $failure_snapshot; ++$failure_store['rollbacks']; },
    'find' => static function (): ?array { return null; },
    'assert_relationship_targets' => static function (): void {},
    'create_identity' => static function (array $record) use (&$failure_store, &$failure_identity_creates): void { $failure_store['products'][$record['productId']] = ['productId' => $record['productId']]; ++$failure_identity_creates; },
    'write' => static function (string $action, array $record) use (&$failure_store): void { if ('TP-P300' === $record['productId']) { $failure_store['siteB']['unchanged'] = false; throw new RuntimeException('Injected controlled write failure.'); } $failure_store['products'][$record['productId']] = $record; },
    'snapshot_site_b' => static function () use (&$failure_store): string { return hash('sha256', json_encode($failure_store['siteB'], JSON_THROW_ON_ERROR)); },
    'assert_site_b' => static function (): void { throw new RuntimeException('Failure path must roll back before Site B assertion.'); },
];
try { tio2_site_a_product_draft_execute('apply', $manifest, $hash, $hash, $failure_operations); throw new RuntimeException('Write failure did not escape.'); } catch (RuntimeException $expected) { if ('Injected controlled write failure.' !== $expected->getMessage()) { throw $expected; } }
if ([] !== $failure_store['products'] || ['unchanged' => true] !== $failure_store['siteB'] || 1 !== $failure_store['rollbacks'] || 25 !== $failure_identity_creates) { throw new RuntimeException('Write failure did not roll back Product identities and Site B state.'); }

$collision_writes = 0;
$GLOBALS['wp_adapter_collision'] = true;
$collision_operations = [
    'begin' => static function (): void {}, 'commit' => static function (): void {}, 'rollback' => static function (): void {},
    'find' => static fn (string $product_id): ?array => tio2_site_a_product_draft_find_wp_record($product_id),
    'assert_relationship_targets' => static function (): void {},
    'write' => static function () use (&$collision_writes): void { ++$collision_writes; },
    'snapshot_site_b' => static function (): string { return 'site-b'; }, 'assert_site_b' => static function (): void {},
];
try { tio2_site_a_product_draft_execute('plan', $manifest, $hash, null, $collision_operations); throw new RuntimeException('Site B Product ID collision was accepted.'); } catch (RuntimeException $expected) { if ('Product ID collision is not scoped exactly to Site A.' !== $expected->getMessage()) { throw $expected; } }
if (0 !== $collision_writes) { throw new RuntimeException('Site B collision reached a write operation.'); }

echo json_encode(['products' => count($store['products']), 'writes' => $store['writes'], 'identityCreates' => $store['identityCreates'], 'commits' => $store['commits'], 'failureRollbacks' => $failure_store['rollbacks'], 'siteB' => $store['siteB']], JSON_THROW_ON_ERROR);
`, containerImporterPath], {encoding: 'utf8', timeout: 30_000})
  return result
}

describe('controlled WordPress Site A Product draft importer boundary', () => {
  it('plans without writes, applies deterministic draft-only upserts, and leaves Site B unchanged', () => {
    expect(existsSync(importerPath), 'draft importer is missing').toBe(true)

    const result = runControlledImporter()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      products: 25,
      writes: 25,
      identityCreates: 25,
      commits: 2,
      failureRollbacks: 1,
      siteB: {unchanged: true},
    })
  })
})
