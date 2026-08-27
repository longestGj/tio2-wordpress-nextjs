import {spawnSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const exporterPath = fileURLToPath(
  new URL('../../../wordpress/seed/export-site-a-product-audit.php', import.meta.url),
)
const containerExporterPath = '/workspace/wordpress/seed/export-site-a-product-audit.php'
const containerImporterPath = '/workspace/wordpress/seed/apply-site-a-product-drafts.php'
const draftWrapperPath = fileURLToPath(
  new URL('../../../scripts/apply-local-site-a-product-drafts.ps1', import.meta.url),
)
const auditWrapperPath = fileURLToPath(
  new URL('../../../scripts/audit-site-a-products.ps1', import.meta.url),
)
const manifestPath = 'D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json'
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

function runWpCliEvalFile(path: string) {
  return spawnSync('docker', [
    'compose',
    '--env-file', 'wordpress/.env',
    '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--user', '33:33',
    'wpcli', 'wp', 'eval-file', path,
  ], {encoding: 'utf8', timeout: 30_000})
}

function captureWrapperDockerArgs(wrapperPath: string, wrapperArgs: string[]) {
  const directory = mkdtempSync(join(tmpdir(), 'tio2-product-wrapper-'))
  const capturePath = join(directory, 'docker-args.jsonl')
  const captureScriptPath = join(directory, 'capture.mjs')
  writeFileSync(captureScriptPath, [
    "import {appendFileSync} from 'node:fs'",
    "appendFileSync(process.env.TIO2_DOCKER_ARG_CAPTURE, JSON.stringify(process.argv.slice(2)) + '\\n')",
  ].join('\n'))
  try {
    const quotePowerShell = (value: string) => `'${value.replaceAll("'", "''")}'`
    const command = [
      'function global:docker { & $env:TIO2_FAKE_DOCKER_NODE $env:TIO2_FAKE_DOCKER_SCRIPT $env:TIO2_DOCKER_ARG_CAPTURE @args }',
      `& ${quotePowerShell(wrapperPath)} ${wrapperArgs.map((argument) => argument.startsWith('-') ? argument : quotePowerShell(argument)).join(' ')}`,
    ].join('; ')
    const result = spawnSync('pwsh', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command,
    ], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: {
        ...process.env,
        TIO2_DOCKER_ARG_CAPTURE: capturePath,
        TIO2_FAKE_DOCKER_NODE: process.execPath,
        TIO2_FAKE_DOCKER_SCRIPT: captureScriptPath,
      },
      timeout: 30_000,
    })
    return {
      result,
      dockerArgs: existsSync(capturePath)
        ? readFileSync(capturePath, 'utf8').trim().split('\n').map((line) => JSON.parse(line) as string[])
        : [],
    }
  } finally {
    rmSync(directory, {recursive: true, force: true})
  }
}

describe('local Site A Product draft audit boundary', () => {
  it.each([
    [draftWrapperPath, ['-Mode', 'Plan', '-ManifestPath', manifestPath], containerImporterPath, '.runtime-site-a-product-drafts-capability-'],
    [auditWrapperPath, ['-ManifestPath', manifestPath], containerExporterPath, '.runtime-site-a-product-audit-capability-'],
  ])('passes one complete capability argument to WP-CLI eval-file for %s', (wrapperPath, wrapperArgs, targetPath, capabilityPrefix) => {
    const {result, dockerArgs} = captureWrapperDockerArgs(wrapperPath, wrapperArgs)
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(dockerArgs).toHaveLength(1)
    const args = dockerArgs[0]
    const evalFileIndex = args.lastIndexOf('eval-file')
    expect(args.slice(evalFileIndex + 1, evalFileIndex + 2)).toEqual([targetPath])
    expect(args.slice(evalFileIndex + 2)).toEqual([
      expect.stringMatching(new RegExp(`^/workspace/wordpress/seed/${capabilityPrefix}`)),
    ])
  })

  it.each([containerImporterPath, containerExporterPath])(
    'reaches the capability boundary through WP-CLI eval-file for %s',
    (path) => {
      const result = runWpCliEvalFile(path)
      const output = `${result.stdout}\n${result.stderr}`

      expect(result.status, output).not.toBe(0)
      expect(output).not.toContain('strict_types declaration must be the very first statement')
      expect(output).toContain('capability file is required')
    },
  )

  it('rejects every draft, scope, manifest, privacy, route, GraphQL, and Site B safety violation', () => {
    expect(existsSync(exporterPath), 'draft audit exporter is missing').toBe(true)

    const result = runControlledAudit()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({checked: 10})
  })
})
