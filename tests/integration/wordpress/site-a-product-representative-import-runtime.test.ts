import {spawnSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {delimiter, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const repositoryRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const wrapperPath = join(
  repositoryRoot,
  'scripts/apply-local-site-a-product-representatives.ps1',
)
const importerPath = join(
  repositoryRoot,
  'wordpress/seed/apply-site-a-product-representatives.php',
)
const fixturePath = join(
  repositoryRoot,
  'tests/fixtures/products/site-a-products.approved-representatives.json',
)
const containerImporterPath =
  '/workspace/wordpress/seed/apply-site-a-product-representatives.php'
const containerFixturePath =
  '/workspace/tests/fixtures/products/site-a-products.approved-representatives.json'
const seedDirectory = join(repositoryRoot, 'wordpress/seed')

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function runtimeFiles(): string[] {
  return readdirSync(seedDirectory)
    .filter((name) => name.startsWith('.runtime-site-a-product-representatives-'))
    .sort()
}

function makeFakeDocker(directory: string): string {
  const logPath = join(directory, 'docker-calls.jsonl')
  const fakePath = join(directory, 'fake-docker.mjs')
  writeFileSync(
    fakePath,
    String.raw`import {createHash} from 'node:crypto'
import {appendFileSync, readFileSync} from 'node:fs'
import {basename, join} from 'node:path'

const root = process.env.TIO2_TEST_REPOSITORY_ROOT
const log = process.env.TIO2_TEST_DOCKER_LOG
const capabilityArgument = process.argv.at(-1)
const capabilityPath = join(root, 'wordpress', 'seed', basename(capabilityArgument))
const capability = JSON.parse(readFileSync(capabilityPath, 'utf8'))
const fixturePath = join(root, 'wordpress', 'seed', basename(capability.fixturePath))
const actualHash = createHash('sha256').update(readFileSync(fixturePath)).digest('hex')
appendFileSync(log, JSON.stringify({args: process.argv.slice(2), capability, capabilityPath, fixturePath, actualHash}) + '\n')
if (process.env.TIO2_TEST_DOCKER_FAIL === '1') process.exit(17)
process.stdout.write('TIO2_SITE_A_PRODUCT_REPRESENTATIVE_RESULT ' + JSON.stringify({mode: capability.mode, fixtureSha256: actualHash, actions: []}) + '\n')
`,
  )
  writeFileSync(join(directory, 'docker.cmd'), '@node "%~dp0\\fake-docker.mjs" %*\r\n')
  return logPath
}

function runWrapper(
  mode: 'Plan' | 'Apply',
  fixture: string,
  fakeDirectory: string,
  logPath: string,
  fail = false,
) {
  return spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      wrapperPath,
      '-Mode',
      mode,
      '-FixturePath',
      fixture,
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        PATH: `${fakeDirectory}${delimiter}${process.env.PATH ?? ''}`,
        TIO2_TEST_REPOSITORY_ROOT: repositoryRoot,
        TIO2_TEST_DOCKER_LOG: logPath,
        ...(fail ? {TIO2_TEST_DOCKER_FAIL: '1'} : {}),
      },
    },
  )
}

describe('local representative-content PowerShell boundary', () => {
  it('accepts only the approved resolved literal fixture and hands exact hashes through separate Plan and Apply capabilities', () => {
    expect(existsSync(wrapperPath), 'PowerShell wrapper is missing').toBe(true)
    expect(existsSync(importerPath), 'PHP importer is missing').toBe(true)

    const temporary = mkdtempSync(join(tmpdir(), 'tio2-representative-wrapper-'))
    const logPath = makeFakeDocker(temporary)
    const before = runtimeFiles()
    try {
      const plan = runWrapper('Plan', fixturePath, temporary, logPath)
      expect(plan.status, `${plan.stdout}\n${plan.stderr}`).toBe(0)
      const apply = runWrapper('Apply', fixturePath, temporary, logPath)
      expect(apply.status, `${apply.stdout}\n${apply.stderr}`).toBe(0)

      const calls = readFileSync(logPath, 'utf8')
        .trim()
        .split(/\r?\n/u)
        .map((line) => JSON.parse(line) as {
          args: string[]
          capability: Record<string, unknown>
          capabilityPath: string
          fixturePath: string
          actualHash: string
        })
      expect(calls).toHaveLength(3)
      expect(calls.map(({capability}) => capability.mode)).toEqual([
        'plan',
        'plan',
        'apply',
      ])
      const expectedHash = sha256(fixturePath)
      for (const call of calls) {
        expect(call.actualHash).toBe(expectedHash)
        expect(call.capability.fixtureSha256).toBe(expectedHash)
        expect(call.capability.fixturePath).toMatch(
          /^\/workspace\/wordpress\/seed\/\.runtime-site-a-product-representatives-[0-9a-f]{32}\.json$/u,
        )
        expect(call.args).toContain('wordpress/docker-compose.yml')
        expect(call.args).toContain('wpcli')
        expect(call.args.join(' ')).not.toMatch(/https?:\/\//iu)
      }
      expect(calls[2]?.capability.planSha256).toBe(expectedHash)
      expect(calls[0]?.fixturePath).not.toBe(calls[1]?.fixturePath)
      expect(calls[0]?.capabilityPath).not.toBe(calls[1]?.capabilityPath)
      expect(runtimeFiles()).toEqual(before)
    } finally {
      rmSync(temporary, {recursive: true, force: true})
    }
  })

  it('rejects URI, wildcard, and non-approved local paths before Docker and cleans staging after a command failure', () => {
    expect(existsSync(wrapperPath), 'PowerShell wrapper is missing').toBe(true)
    const temporary = mkdtempSync(join(tmpdir(), 'tio2-representative-safety-'))
    const logPath = makeFakeDocker(temporary)
    const copiedFixture = join(temporary, 'copied-fixture.json')
    copyFileSync(fixturePath, copiedFixture)
    const before = runtimeFiles()
    try {
      for (const unsafePath of [
        'https://example.test/fixture.json',
        join(repositoryRoot, 'tests/fixtures/products/*.json'),
        copiedFixture,
      ]) {
        const result = runWrapper('Plan', unsafePath, temporary, logPath)
        expect(result.status).not.toBe(0)
      }
      expect(existsSync(logPath)).toBe(false)

      const failed = runWrapper('Apply', fixturePath, temporary, logPath, true)
      expect(failed.status).not.toBe(0)
      expect(runtimeFiles()).toEqual(before)
    } finally {
      rmSync(temporary, {recursive: true, force: true})
    }
  })
})

function runControlledImporter() {
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      'wordpress/.env',
      '-f',
      'wordpress/docker-compose.yml',
      'run',
      '--rm',
      '--no-TTY',
      '--no-deps',
      '--entrypoint',
      'php',
      'wpcli',
      '-r',
      String.raw`
define('ABSPATH', __DIR__);
function wp_json_encode($value) { return json_encode($value, JSON_THROW_ON_ERROR); }
require $argv[1];
$fixture = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$hash = hash_file('sha256', $argv[2]);
$normalized = tio2_site_a_product_representative_validate_fixture($fixture);
if (['hub', 'coatings', 'TP-C120'] !== array_column($normalized, 'target')) { throw new RuntimeException('Normalized targets escaped the approved set.'); }
if (['41', '42'] !== tio2_site_a_product_representative_relationship_values([41, '42'])) { throw new RuntimeException('ACF relationship IDs were not normalized to raw string values.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_HUB_FIELDS !== array_keys($normalized[0]['fields'])) { throw new RuntimeException('Hub field allowlist drifted.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_FAMILY_FIELDS !== array_keys($normalized[1]['fields'])) { throw new RuntimeException('Family field allowlist drifted.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_PRODUCT_FIELDS !== array_keys($normalized[2]['fields'])) { throw new RuntimeException('Product field allowlist drifted.'); }
if ('draft' !== $normalized[2]['invariants']['status'] || '/products/coatings/tp-c120' !== $normalized[2]['invariants']['canonicalPath']) { throw new RuntimeException('TP-C120 invariants drifted.'); }

$state = ['records' => [], 'otherProducts' => ['TP-C050' => 'frozen', 'TP-U100' => 'frozen'], 'siteB' => ['frozen' => true], 'anonymousProducts' => [], 'writes' => 0, 'begins' => 0, 'commits' => 0, 'rollbacks' => 0];
$snapshot = null;
$digest = static fn ($value): string => hash('sha256', json_encode($value, JSON_THROW_ON_ERROR));
$operations = [
  'begin' => static function () use (&$state, &$snapshot): void { $snapshot = $state; ++$state['begins']; },
  'commit' => static function () use (&$state): void { ++$state['commits']; },
  'rollback' => static function () use (&$state, &$snapshot): void { $state = $snapshot; ++$state['rollbacks']; },
  'find' => static function (string $target) use (&$state): ?array { return $state['records'][$target] ?? null; },
  'write' => static function (array $record) use (&$state): void { $state['records'][$record['target']] = $record; ++$state['writes']; },
  'snapshot_other_products' => static function () use (&$state, $digest): string { return $digest($state['otherProducts']); },
  'assert_other_products' => static function (string $hash) use (&$state, $digest): void { if ($hash !== $digest($state['otherProducts'])) throw new RuntimeException('Other Product records changed.'); },
  'snapshot_site_b' => static function () use (&$state, $digest): string { return $digest($state['siteB']); },
  'assert_site_b' => static function (string $hash) use (&$state, $digest): void { if ($hash !== $digest($state['siteB'])) throw new RuntimeException('Site B changed.'); },
  'assert_anonymous_hidden' => static function () use (&$state): void { if ([] !== $state['anonymousProducts']) throw new RuntimeException('Anonymous Product leaked.'); },
];

$beforePlan = $state;
$plan = tio2_site_a_product_representative_execute('plan', $fixture, $hash, null, $operations);
if ($beforePlan['records'] !== $state['records'] || 0 !== $state['writes'] || ['hub', 'coatings', 'TP-C120'] !== array_column($plan['actions'], 'target')) { throw new RuntimeException('Plan wrote state or listed the wrong targets.'); }
if (3 !== count(array_filter($plan['actions'], static fn (array $action): bool => 'update' === $action['action']))) { throw new RuntimeException('Initial Plan did not list three updates.'); }
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, str_repeat('0', 64), $operations); throw new RuntimeException('Apply accepted the wrong Plan hash.'); } catch (InvalidArgumentException $expected) {}
$apply = tio2_site_a_product_representative_execute('apply', $fixture, $hash, $hash, $operations);
if (3 !== $state['writes'] || 3 !== count($state['records']) || 3 !== count(array_filter($apply['actions'], static fn (array $action): bool => 'update' === $action['action']))) { throw new RuntimeException('Apply did not write exactly three targets.'); }
$secondPlan = tio2_site_a_product_representative_execute('plan', $fixture, $hash, null, $operations);
if (3 !== count(array_filter($secondPlan['actions'], static fn (array $action): bool => 'no-change' === $action['action']))) { throw new RuntimeException('Second Plan was not all no-change.'); }

$failedState = ['records' => [], 'otherProducts' => ['frozen' => true], 'siteB' => ['frozen' => true], 'rollbacks' => 0];
$failedSnapshot = null;
$failedOperations = $operations;
$failedOperations['begin'] = static function () use (&$failedState, &$failedSnapshot): void { $failedSnapshot = $failedState; };
$failedOperations['commit'] = static function (): void { throw new RuntimeException('Failed Apply committed.'); };
$failedOperations['rollback'] = static function () use (&$failedState, &$failedSnapshot): void { $failedState = $failedSnapshot; ++$failedState['rollbacks']; };
$failedOperations['find'] = static function (): ?array { return null; };
$failedOperations['write'] = static function (array $record) use (&$failedState): void { if ('coatings' === $record['target']) throw new RuntimeException('Injected write failure.'); $failedState['records'][$record['target']] = $record; };
$failedOperations['snapshot_other_products'] = static fn (): string => 'other';
$failedOperations['assert_other_products'] = static function (): void {};
$failedOperations['snapshot_site_b'] = static fn (): string => 'site-b';
$failedOperations['assert_site_b'] = static function (): void {};
$failedOperations['assert_anonymous_hidden'] = static function (): void {};
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, $hash, $failedOperations); throw new RuntimeException('Injected failure did not escape.'); } catch (RuntimeException $expected) { if ('Injected write failure.' !== $expected->getMessage()) throw $expected; }
if ([] !== $failedState['records'] || ['frozen' => true] !== $failedState['otherProducts'] || ['frozen' => true] !== $failedState['siteB'] || 1 !== $failedState['rollbacks']) { throw new RuntimeException('Failed Apply did not roll back.'); }

echo json_encode(['targets' => array_column($normalized, 'target'), 'writes' => $state['writes'], 'commits' => $state['commits'], 'rollbacks' => $failedState['rollbacks'], 'otherProducts' => $state['otherProducts'], 'siteB' => $state['siteB']], JSON_THROW_ON_ERROR);
`,
      containerImporterPath,
      containerFixturePath,
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000},
  )
}

describe('controlled WordPress representative-content importer boundary', () => {
  it('loads through the real WP-CLI eval-file entrypoint before rejecting a missing capability', () => {
    expect(existsSync(importerPath), 'PHP importer is missing').toBe(true)
    const result = spawnSync(
      'docker',
      [
        'compose', '--env-file', 'wordpress/.env', '-f',
        'wordpress/docker-compose.yml', 'run', '--rm', '--no-TTY',
        'wpcli', 'wp', 'eval-file', containerImporterPath,
      ],
      {cwd: repositoryRoot, encoding: 'utf8', timeout: 30_000},
    )
    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'The local representative capability file is required.',
    )
    expect(`${result.stdout}\n${result.stderr}`).not.toContain(
      'strict_types declaration must be the very first statement',
    )
  })

  it('plans three targets, applies transactionally, reads back normalized fields, and is idempotent', () => {
    expect(existsSync(importerPath), 'PHP importer is missing').toBe(true)
    const result = runControlledImporter()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      targets: ['hub', 'coatings', 'TP-C120'],
      writes: 3,
      commits: 1,
      rollbacks: 1,
      otherProducts: {'TP-C050': 'frozen', 'TP-U100': 'frozen'},
      siteB: {frozen: true},
    })
  })
})
