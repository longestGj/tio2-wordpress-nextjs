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
const args = process.argv.slice(2)
const append = (entry) => appendFileSync(log, JSON.stringify({args, ...entry}) + '\n')
if (args[0] === 'context' && args[1] === 'show') {
  append({kind: 'context-show'})
  process.stdout.write((process.env.TIO2_TEST_DOCKER_CONTEXT_NAME || 'local-test') + '\n')
  process.exit(0)
}
if (args[0] === 'context' && args[1] === 'inspect') {
  append({kind: 'context-inspect'})
  process.stdout.write(JSON.stringify(process.env.TIO2_TEST_DOCKER_ENDPOINT || 'npipe:////./pipe/dockerDesktopLinuxEngine') + '\n')
  process.exit(0)
}
const composeIndex = args.indexOf('compose')
if (composeIndex >= 0 && args.includes('config')) {
  append({kind: 'compose-config'})
  const hostIp = process.env.TIO2_TEST_DOCKER_BINDING || '127.0.0.1'
  const services = {wordpress: {ports: [{host_ip: hostIp, target: 80, published: '8080', protocol: 'tcp'}]}}
  if (process.env.TIO2_TEST_DOCKER_EMPTY_SERVICES === '1') Object.assign(services, {db: {}, wpcli: {}})
  process.stdout.write(JSON.stringify({services}) + '\n')
  process.exit(0)
}
const capabilityArgument = process.argv.at(-1)
const capabilityPath = join(root, 'wordpress', 'seed', basename(capabilityArgument))
const capability = JSON.parse(readFileSync(capabilityPath, 'utf8'))
const fixturePath = join(root, 'wordpress', 'seed', basename(capability.fixturePath))
const actualHash = createHash('sha256').update(readFileSync(fixturePath)).digest('hex')
const planSha256 = capability.mode === 'plan'
  ? createHash('sha256').update('controlled-plan:' + actualHash).digest('hex')
  : capability.planSha256
append({kind: 'import', capability, capabilityPath, fixturePath, actualHash})
if (process.env.TIO2_TEST_DOCKER_FAIL === '1') process.exit(17)
process.stdout.write('TIO2_SITE_A_PRODUCT_REPRESENTATIVE_RESULT ' + JSON.stringify({mode: capability.mode, fixtureSha256: actualHash, planSha256, actions: []}) + '\n')
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
  environment: Record<string, string | undefined> = {},
) {
  const baseEnvironment = {...process.env}
  for (const name of [
    'DOCKER_HOST',
    'DOCKER_CONTEXT',
    'DOCKER_TLS_VERIFY',
    'DOCKER_CERT_PATH',
    'DOCKER_CONFIG',
  ]) {
    delete baseEnvironment[name]
  }
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
        ...baseEnvironment,
        PATH: `${fakeDirectory}${delimiter}${process.env.PATH ?? ''}`,
        TIO2_TEST_REPOSITORY_ROOT: repositoryRoot,
        TIO2_TEST_DOCKER_LOG: logPath,
        ...(fail ? {TIO2_TEST_DOCKER_FAIL: '1'} : {}),
        ...environment,
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
          kind: string
          args: string[]
          capability: Record<string, unknown>
          capabilityPath: string
          fixturePath: string
          actualHash: string
        })
        .filter(({kind}) => kind === 'import')
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
        expect(call.args.slice(0, 2)).toEqual(['--context', 'local-test'])
        expect(call.args).toContain('wordpress/docker-compose.yml')
        expect(call.args).toContain('wpcli')
        expect(call.args.join(' ')).not.toMatch(/https?:\/\//iu)
      }
      expect(calls[2]?.capability.planSha256).toMatch(/^[a-f0-9]{64}$/u)
      expect(calls[2]?.capability.planSha256).not.toBe(expectedHash)
      expect(calls[0]?.fixturePath).not.toBe(calls[1]?.fixturePath)
      expect(calls[0]?.capabilityPath).not.toBe(calls[1]?.capabilityPath)
      expect(runtimeFiles()).toEqual(before)
    } finally {
      rmSync(temporary, {recursive: true, force: true})
    }
  }, 15_000)

  it('rejects Docker environment overrides, remote current contexts, and non-loopback rendered bindings before import', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'tio2-representative-docker-'))
    const logPath = makeFakeDocker(temporary)
    try {
      for (const environment of [
        {DOCKER_HOST: 'tcp://remote.example.test:2376'},
        {DOCKER_CONTEXT: 'remote-context'},
        {
          TIO2_TEST_DOCKER_CONTEXT_NAME: 'remote-current',
          TIO2_TEST_DOCKER_ENDPOINT: 'ssh://operator@remote.example.test',
        },
        {TIO2_TEST_DOCKER_BINDING: '0.0.0.0'},
      ]) {
        rmSync(logPath, {force: true})
        const result = runWrapper('Plan', fixturePath, temporary, logPath, false, environment)
        expect(result.status, `${result.stdout}\n${result.stderr}`).not.toBe(0)
        if (existsSync(logPath)) {
          const calls = readFileSync(logPath, 'utf8')
            .trim()
            .split(/\r?\n/u)
            .filter(Boolean)
            .map((line) => JSON.parse(line) as {kind: string})
          expect(calls.some(({kind}) => kind === 'import')).toBe(false)
        }
      }
    } finally {
      rmSync(temporary, {recursive: true, force: true})
    }
  })

  it('accepts rendered Compose services that do not publish ports', () => {
    const temporary = mkdtempSync(join(tmpdir(), 'tio2-representative-compose-'))
    const logPath = makeFakeDocker(temporary)
    try {
      const result = runWrapper('Plan', fixturePath, temporary, logPath, false, {
        TIO2_TEST_DOCKER_EMPTY_SERVICES: '1',
      })
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    } finally {
      rmSync(temporary, {recursive: true, force: true})
    }
  }, 10_000)

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
  }, 60_000)
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
$storageShapes = ['metaTitle' => [], 'faqItems' => ['question', 'answer']];
if (tio2_site_a_product_representative_is_target_storage_key('options_metaTitle_site_b', $storageShapes, true) || ! tio2_site_a_product_representative_is_target_storage_key('options_faqItems_0_answer', $storageShapes, true)) { throw new RuntimeException('ACF target storage matching was not exact.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_HUB_FIELDS !== array_keys($normalized[0]['fields'])) { throw new RuntimeException('Hub field allowlist drifted.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_FAMILY_FIELDS !== array_keys($normalized[1]['fields'])) { throw new RuntimeException('Family field allowlist drifted.'); }
if (TIO2_SITE_A_PRODUCT_REPRESENTATIVE_PRODUCT_FIELDS !== array_keys($normalized[2]['fields'])) { throw new RuntimeException('Product field allowlist drifted.'); }
if ('draft' !== $normalized[2]['invariants']['status'] || '/products/coatings/tp-c120' !== $normalized[2]['invariants']['canonicalPath']) { throw new RuntimeException('TP-C120 invariants drifted.'); }

$state = ['records' => [], 'otherProducts' => ['TP-C050' => 'frozen', 'TP-U100' => 'frozen'], 'siteB' => ['frozen' => true], 'sharedStorage' => ['options' => ['site-b-product-copy' => 'frozen'], 'termmeta' => ['site-b-coatings-copy' => 'frozen']], 'sharedCoatings' => false, 'anonymousProducts' => [], 'writes' => 0, 'begins' => 0, 'commits' => 0, 'rollbacks' => 0];
$snapshot = null;
$digest = static fn ($value): string => hash('sha256', json_encode($value, JSON_THROW_ON_ERROR));
$operations = [
  'begin' => static function () use (&$state, &$snapshot): void { $snapshot = $state; ++$state['begins']; },
  'commit' => static function () use (&$state): void { ++$state['commits']; },
  'rollback' => static function () use (&$state, &$snapshot): void { $state = $snapshot; ++$state['rollbacks']; },
  'assert_site_a_targets' => static function () use (&$state): void { if ($state['sharedCoatings']) throw new RuntimeException('Coatings is shared outside Site A.'); },
  'find' => static function (string $target) use (&$state): ?array { return $state['records'][$target] ?? null; },
  'write' => static function (array $record) use (&$state): void { $state['records'][$record['target']] = $record; ++$state['writes']; },
  'snapshot_other_products' => static function () use (&$state, $digest): string { return $digest($state['otherProducts']); },
  'assert_other_products' => static function (string $hash) use (&$state, $digest): void { if ($hash !== $digest($state['otherProducts'])) throw new RuntimeException('Other Product records changed.'); },
  'snapshot_site_b' => static function () use (&$state, $digest): string { return $digest($state['siteB']); },
  'assert_site_b' => static function (string $hash) use (&$state, $digest): void { if ($hash !== $digest($state['siteB'])) throw new RuntimeException('Site B changed.'); },
  'snapshot_shared_storage' => static function () use (&$state, $digest): string { return $digest($state['sharedStorage']); },
  'assert_shared_storage' => static function (string $hash) use (&$state, $digest): void { if ($hash !== $digest($state['sharedStorage'])) throw new RuntimeException('Shared Site B option or term meta changed.'); },
  'assert_anonymous_hidden' => static function () use (&$state): void { if ([] !== $state['anonymousProducts']) throw new RuntimeException('Anonymous Product leaked.'); },
];

$beforePlan = $state;
$plan = tio2_site_a_product_representative_execute('plan', $fixture, $hash, null, $operations);
if ($beforePlan['records'] !== $state['records'] || 0 !== $state['writes'] || ['hub', 'coatings', 'TP-C120'] !== array_column($plan['actions'], 'target')) { throw new RuntimeException('Plan wrote state or listed the wrong targets.'); }
if (3 !== count(array_filter($plan['actions'], static fn (array $action): bool => 'update' === $action['action']))) { throw new RuntimeException('Initial Plan did not list three updates.'); }
if (! is_string($plan['planSha256'] ?? null) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $plan['planSha256']) || $hash === $plan['planSha256']) { throw new RuntimeException('Plan did not return a state-bound digest distinct from the fixture hash.'); }
$planDigest = $plan['planSha256'];
$state['records']['hub'] = ['concurrent' => 'change-after-plan'];
$staleState = $state;
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, $planDigest, $operations); throw new RuntimeException('Apply accepted a stale target-state digest.'); } catch (InvalidArgumentException $expected) {}
if ($staleState['records'] !== $state['records'] || $staleState['writes'] !== $state['writes'] || $staleState['commits'] !== $state['commits'] || $staleState['rollbacks'] + 1 !== $state['rollbacks']) { throw new RuntimeException('Stale Plan rejection wrote target state or did not roll back.'); }
$state = $beforePlan;
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, str_repeat('0', 64), $operations); throw new RuntimeException('Apply accepted the wrong Plan hash.'); } catch (InvalidArgumentException $expected) {}
$apply = tio2_site_a_product_representative_execute('apply', $fixture, $hash, $planDigest, $operations);
if (3 !== $state['writes'] || 3 !== count($state['records']) || 3 !== count(array_filter($apply['actions'], static fn (array $action): bool => 'update' === $action['action']))) { throw new RuntimeException('Apply did not write exactly three targets.'); }
$secondPlan = tio2_site_a_product_representative_execute('plan', $fixture, $hash, null, $operations);
if (3 !== count(array_filter($secondPlan['actions'], static fn (array $action): bool => 'no-change' === $action['action']))) { throw new RuntimeException('Second Plan was not all no-change.'); }

$sharedState = ['records' => [], 'sharedCoatings' => true, 'writes' => 0, 'rollbacks' => 0];
$sharedSnapshot = null;
$sharedOperations = $operations;
$sharedOperations['begin'] = static function () use (&$sharedState, &$sharedSnapshot): void { $sharedSnapshot = $sharedState; };
$sharedOperations['rollback'] = static function () use (&$sharedState, &$sharedSnapshot): void { $sharedState = $sharedSnapshot; ++$sharedState['rollbacks']; };
$sharedOperations['commit'] = static function (): void { throw new RuntimeException('Shared target committed.'); };
$sharedOperations['assert_site_a_targets'] = static function () use (&$sharedState): void { if ($sharedState['sharedCoatings']) throw new RuntimeException('Coatings is shared outside Site A.'); };
$sharedOperations['find'] = static fn (): ?array => null;
$sharedOperations['write'] = static function () use (&$sharedState): void { ++$sharedState['writes']; };
$sharedOperations['snapshot_other_products'] = static fn (): string => 'other';
$sharedOperations['snapshot_site_b'] = static fn (): string => 'site-b';
$sharedOperations['snapshot_shared_storage'] = static fn (): string => 'shared';
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, $planDigest, $sharedOperations); throw new RuntimeException('Apply accepted a shared Coatings target.'); } catch (RuntimeException $expected) { if ('Coatings is shared outside Site A.' !== $expected->getMessage()) throw $expected; }
if (0 !== $sharedState['writes'] || 1 !== $sharedState['rollbacks']) { throw new RuntimeException('Shared target rejection wrote state or did not roll back.'); }

$failedState = ['records' => [], 'otherProducts' => ['frozen' => true], 'siteB' => ['frozen' => true], 'sharedStorage' => ['options' => ['site-b-product-copy' => 'frozen'], 'termmeta' => ['site-b-coatings-copy' => 'frozen']], 'writes' => 0, 'rollbacks' => 0];
$failedSnapshot = null;
$failedOperations = $operations;
$failedOperations['begin'] = static function () use (&$failedState, &$failedSnapshot): void { $failedSnapshot = $failedState; };
$failedOperations['commit'] = static function (): void { throw new RuntimeException('Failed Apply committed.'); };
$failedOperations['rollback'] = static function () use (&$failedState, &$failedSnapshot): void { $failedState = $failedSnapshot; ++$failedState['rollbacks']; };
$failedOperations['assert_site_a_targets'] = static function (): void {};
$failedOperations['find'] = static function (string $target) use (&$failedState): ?array { return $failedState['records'][$target] ?? null; };
$failedOperations['write'] = static function (array $record) use (&$failedState): void { $failedState['records'][$record['target']] = $record; ++$failedState['writes']; if ('coatings' === $record['target']) { $failedState['sharedStorage']['options']['site-b-product-copy'] = 'changed'; $failedState['sharedStorage']['termmeta']['site-b-coatings-copy'] = 'changed'; } };
$failedOperations['snapshot_other_products'] = static fn (): string => 'other';
$failedOperations['assert_other_products'] = static function (): void {};
$failedOperations['snapshot_site_b'] = static fn (): string => 'site-b';
$failedOperations['assert_site_b'] = static function (): void {};
$failedOperations['snapshot_shared_storage'] = static function () use (&$failedState, $digest): string { return $digest($failedState['sharedStorage']); };
$failedOperations['assert_shared_storage'] = static function (string $before) use (&$failedState, $digest): void { if ($before !== $digest($failedState['sharedStorage'])) throw new RuntimeException('Shared Site B option or term meta changed.'); };
$failedOperations['assert_anonymous_hidden'] = static function (): void {};
try { tio2_site_a_product_representative_execute('apply', $fixture, $hash, $planDigest, $failedOperations); throw new RuntimeException('Apply accepted a shared-storage mutation.'); } catch (RuntimeException $expected) { if ('Shared Site B option or term meta changed.' !== $expected->getMessage()) throw $expected; }
if ([] !== $failedState['records'] || ['frozen' => true] !== $failedState['otherProducts'] || ['frozen' => true] !== $failedState['siteB'] || ['site-b-product-copy' => 'frozen'] !== $failedState['sharedStorage']['options'] || ['site-b-coatings-copy' => 'frozen'] !== $failedState['sharedStorage']['termmeta'] || 1 !== $failedState['rollbacks']) { throw new RuntimeException('Shared-storage failure did not roll back.'); }

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
  }, 45_000)

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
