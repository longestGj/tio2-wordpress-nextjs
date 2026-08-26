import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const exporterPath = fileURLToPath(
  new URL('../../../wordpress/seed/export-site-a-product-audit.php', import.meta.url),
)
const containerExporterPath = '/workspace/wordpress/seed/export-site-a-product-audit.php'
function runControlledAudit() {
  const result = spawnSync('docker', [
    'compose',
    '--env-file', 'wordpress/.env',
    '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--no-deps',
    '--entrypoint', 'php',
    'wpcli',
    '-r', String.raw`
define('ABSPATH', __DIR__);
require $argv[1];
$ids = ['TP-P100','TP-P300','TP-S100','TP-C200','TP-C410','TP-C120','TP-I100','TP-H100','TP-P200','TP-P110','TP-P320','TP-P120','TP-P310','TP-P330','TP-PA100','TP-PA110','TP-PA120','TP-C050','TP-C100','TP-C110','TP-I200','TP-C300','TP-C310','TP-C400','TP-U100'];
$products = array_map(static function (string $id): array {
    $slug = strtolower($id);
    return [
        'productId' => $id, 'slug' => $slug, 'path' => '/products/' . $slug, 'title' => 'Controlled ' . $id,
        'family' => ['targetType' => 'productFamily', 'targetKey' => 'controlled-family'],
        'metaTitle' => 'Controlled title', 'metaDescription' => 'Controlled description', 'eyebrow' => 'Controlled',
        'customerProblemHeadline' => 'Controlled problem', 'quickAnswer' => '<p>Controlled quick answer.</p>', 'productType' => 'Controlled type',
        'primaryApplication' => 'Controlled application', 'packaging' => 'Controlled packaging', 'tdsAccess' => 'Available on request.',
        'fitWhen' => ['one', 'two', 'three'], 'discussFirstWhen' => ['one'],
        'performancePriorities' => [['title' => 'one', 'explanation' => 'one'], ['title' => 'two', 'explanation' => 'two'], ['title' => 'three', 'explanation' => 'three']],
        'recommendedApplications' => [['targetType' => 'application', 'targetKey' => 'controlled-application']], 'evidenceStatement' => '<p>Controlled evidence.</p>',
        'typicalProperties' => [['property' => 'Property', 'value' => '1', 'unit' => 'unit', 'displayOrder' => 1]], 'validationChecklist' => ['Controlled validation.'],
        'faqItems' => array_map(static fn (int $number): array => ['question' => 'Question ' . $number, 'answer' => '<p>Answer.</p>'], range(1, 6)),
        'relatedLinks' => ['applications' => [], 'resources' => [], 'products' => []],
    ];
}, $ids);
$manifest = ['version' => '0.1', 'siteId' => 'tio2-a', 'products' => $products];
$expected_records = array_map('tio2_site_a_product_audit_expected_record', $manifest['products']);
$expected = $expected_records[0];
function expect_failure(array $errors, string $needle): void {
    if ([] === $errors || !array_filter($errors, static fn (string $error): bool => str_contains($error, $needle))) {
        throw new RuntimeException('Expected audit failure containing ' . $needle . ': ' . json_encode($errors, JSON_THROW_ON_ERROR));
    }
}
$clean = tio2_site_a_product_audit_compare($manifest, $expected_records, [], false, 'site-b', 'site-b');
if ([] !== $clean) { throw new RuntimeException('Clean normalized audit failed: ' . json_encode($clean, JSON_THROW_ON_ERROR)); }

$missing = tio2_site_a_product_audit_compare($manifest, [], [], false, 'site-b', 'site-b');
expect_failure($missing, 'missing');
$extra_record = $expected;
$extra_record['productId'] = 'TP-Z999';
$extra = tio2_site_a_product_audit_compare($manifest, array_merge($expected_records, [$extra_record]), [], false, 'site-b', 'site-b');
expect_failure($extra, 'unexpected');
foreach (['slug' => 'wrong-slug', 'path' => '/products/wrong-slug', 'status' => 'publish', 'scopes' => ['tio2-b']] as $field => $value) {
    $wrong = $expected;
    $wrong[$field] = $value;
    $records = $expected_records;
    $records[0] = $wrong;
    expect_failure(tio2_site_a_product_audit_compare($manifest, $records, [], false, 'site-b', 'site-b'), $field);
}
$mismatch = $expected;
$mismatch['meta']['meta_title'] = 'Wrong readback';
expect_failure(tio2_site_a_product_audit_compare($manifest, array_merge([$mismatch], array_slice($expected_records, 1)), [], false, 'site-b', 'site-b'), 'manifest mismatch');
$bad_bounds = $expected;
$bad_bounds['meta']['performance_priorities'] = array_slice($bad_bounds['meta']['performance_priorities'], 0, 2);
expect_failure(tio2_site_a_product_audit_compare($manifest, array_merge([$bad_bounds], array_slice($expected_records, 1)), [], false, 'site-b', 'site-b'), 'performance_priorities');
$tds = $expected;
$tds['meta']['tds_access'] = 'D:/documents/tds/private.pdf';
expect_failure(tio2_site_a_product_audit_compare($manifest, array_merge([$tds], array_slice($expected_records, 1)), [], false, 'site-b', 'site-b'), 'private TDS');
expect_failure(tio2_site_a_product_audit_compare($manifest, $expected_records, [$expected['path']], false, 'site-b', 'site-b'), 'approved public route');
expect_failure(tio2_site_a_product_audit_compare($manifest, $expected_records, [], true, 'site-b', 'site-b'), 'anonymous GraphQL');
expect_failure(tio2_site_a_product_audit_compare($manifest, $expected_records, [], false, 'before', 'after'), 'Site B');
echo json_encode(['checked' => 10], JSON_THROW_ON_ERROR);
`, containerExporterPath], {encoding: 'utf8', timeout: 30_000})
  return result
}

describe('local Site A Product draft audit boundary', () => {
  it('rejects every draft, scope, manifest, privacy, route, GraphQL, and Site B safety violation', () => {
    expect(existsSync(exporterPath), 'draft audit exporter is missing').toBe(true)

    const result = runControlledAudit()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({checked: 10})
  })
})
