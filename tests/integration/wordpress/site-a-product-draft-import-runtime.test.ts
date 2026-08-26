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
$store = ['products' => [], 'siteB' => ['unchanged' => true], 'deleted' => false, 'writes' => 0, 'begins' => 0, 'rollbacks' => 0, 'commits' => 0];
$snapshot = null;
$prepare_calls = 0;
$allowed_meta = ['product_id','public_path','meta_title','meta_description','eyebrow','customer_problem_headline','quick_answer','product_type','process','primary_application','positioning','surface_treatment','packaging','tds_access','fit_when','discuss_first_when','performance_priorities','recommended_applications','evidence_statement','typical_properties','validation_checklist','faq_items','related_links'];
$operations = [
    'begin' => static function () use (&$store, &$snapshot): void { $snapshot = $store; ++$store['begins']; },
    'commit' => static function () use (&$store): void { ++$store['commits']; },
    'rollback' => static function () use (&$store, &$snapshot): void { $store = $snapshot; ++$store['rollbacks']; },
    'find' => static function (string $product_id) use (&$store): ?array { return $store['products'][$product_id] ?? null; },
    'prepare' => static function (array $record) use (&$prepare_calls): array { ++$prepare_calls; return $record; },
    'resolve' => static function (string $type, string $key): int { return crc32($type . ':' . $key); },
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
if ($before_plan !== ['products' => $store['products'], 'siteB' => $store['siteB'], 'writes' => $store['writes']] || 0 !== $prepare_calls || 25 !== count($plan['actions']) || 25 !== count(array_filter($plan['actions'], static fn(array $action): bool => 'create' === $action['action']))) { throw new RuntimeException('Plan changed state or did not list 25 creates.'); }
try { tio2_site_a_product_draft_execute('apply', $manifest, $hash, str_repeat('0', 64), $operations); throw new RuntimeException('Apply accepted a mismatched Plan hash.'); } catch (InvalidArgumentException $expected) {}
$first = tio2_site_a_product_draft_execute('apply', $manifest, $hash, $hash, $operations);
if (25 !== count($store['products']) || 25 !== count(array_filter($first['actions'], static fn(array $action): bool => 'create' === $action['action'])) || $store['deleted']) { throw new RuntimeException('Apply did not deterministically create draft Products.'); }
$writes_after_first = $store['writes'];
$second = tio2_site_a_product_draft_execute('apply', $manifest, $hash, $hash, $operations);
if ($writes_after_first !== $store['writes'] || 25 !== count(array_filter($second['actions'], static fn(array $action): bool => 'no-change' === $action['action']))) { throw new RuntimeException('Second apply was not idempotent.'); }
foreach ($store['products'] as $product_id => $record) { if ($product_id !== $record['productId'] || 'draft' !== $record['status'] || ['tio2-a'] !== $record['scopes'] || $record['slug'] !== strtolower($product_id) || $record['path'] !== '/products/' . strtolower($product_id)) { throw new RuntimeException('Canonical draft record mismatch.'); } }
echo json_encode(['products' => count($store['products']), 'writes' => $store['writes'], 'commits' => $store['commits'], 'siteB' => $store['siteB']], JSON_THROW_ON_ERROR);
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
      commits: 2,
      siteB: {unchanged: true},
    })
  })
})
