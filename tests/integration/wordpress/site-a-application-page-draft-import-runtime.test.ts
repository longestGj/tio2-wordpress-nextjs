import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const importerPath = fileURLToPath(
  new URL(
    '../../../wordpress/seed/apply-site-a-application-page-draft.php',
    import.meta.url,
  ),
)

function runControlledImporter() {
  const wordpressEnvironment =
    process.env.TIO2_TEST_WORDPRESS_ENV ?? 'wordpress/.env'
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      wordpressEnvironment,
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
define('TIO2_SITE_A_APPLICATION_PAGE_LIBRARY_CONTEXT', true);
function wp_json_encode($value) { return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES); }
require $argv[1];

$manifest = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$page = array_values(array_filter($manifest['records'], static fn(array $record): bool => 'plastics' === $record['identity']['id']))[0];
$product_ids = ['TP-P100','TP-P300','TP-S100','TP-C200','TP-C410','TP-C120','TP-I100','TP-H100','TP-P200','TP-P110','TP-P320','TP-P120','TP-P310','TP-P330','TP-PA100','TP-PA110','TP-PA120','TP-C050','TP-C100','TP-C110','TP-I200','TP-C300','TP-C310','TP-C400','TP-U100'];
$products = ['version' => '0.1', 'siteId' => 'tio2-a', 'products' => array_map(static fn(string $id): array => ['productId' => $id], $product_ids)];
$hashes = ['application' => str_repeat('a', 64), 'products' => str_repeat('b', 64)];
$deferred = [];
$expected = tio2_site_a_editorial_application_record($page, 'Strict', tio2_site_a_editorial_product_keys($products), $deferred);
$current = $expected;
$current['meta']['direct_answer'] = '<p>Old Plastics copy.</p>';
$store = ['record' => $current, 'siteB' => ['frozen' => true], 'queue' => [['before' => true]], 'writes' => 0, 'begins' => 0, 'commits' => 0, 'rollbacks' => 0];
$snapshot = null;
$operations = [
    'find' => static fn(string $type, string $id): ?array => 'application' === $type && 'plastics' === $id ? $GLOBALS['page_store']['record'] : null,
    'find_path' => static fn(string $path, string $type, string $id): ?array => ['entityType' => 'application', 'id' => 'plastics'],
    'resolve_product' => static fn(string $id): ?array => ['entityType' => 'product', 'id' => $id, 'postType' => 'tio2_product', 'scopes' => ['tio2-a']],
    'snapshot_site_b' => static fn(): string => hash('sha256', json_encode($GLOBALS['page_store']['siteB'], JSON_THROW_ON_ERROR)),
    'assert_site_b' => static function(string $hash): void { if (!hash_equals($hash, hash('sha256', json_encode($GLOBALS['page_store']['siteB'], JSON_THROW_ON_ERROR)))) throw new RuntimeException('Site B changed.'); },
    'snapshot_queue' => static fn(): array => $GLOBALS['page_store']['queue'],
    'restore_queue' => static function(array $queue): void { $GLOBALS['page_store']['queue'] = $queue; },
    'begin' => static function(): void { $GLOBALS['page_snapshot'] = $GLOBALS['page_store']; ++$GLOBALS['page_store']['begins']; },
    'commit' => static function(): void { ++$GLOBALS['page_store']['commits']; },
    'rollback' => static function(): void { $rollbacks = $GLOBALS['page_store']['rollbacks'] + 1; $GLOBALS['page_store'] = $GLOBALS['page_snapshot']; $GLOBALS['page_store']['rollbacks'] = $rollbacks; },
    'create_identity' => static function(array $record): void { throw new RuntimeException('The controlled Plastics record must already exist.'); },
    'write' => static function(string $action, array $record): void { if ('update' !== $action || 'plastics' !== $record['id']) throw new RuntimeException('The page importer attempted an out-of-scope write.'); $GLOBALS['page_store']['record'] = $record; ++$GLOBALS['page_store']['writes']; },
    'readback' => static fn(string $type, string $id): ?array => $GLOBALS['page_store']['record'],
];
$GLOBALS['page_store'] = &$store;
$GLOBALS['page_snapshot'] = &$snapshot;

$before = $store;
$plan = tio2_site_a_application_page_draft_execute('plan', $page, $products, $hashes, null, $operations);
if ($before !== $store || [['entityType' => 'application', 'id' => 'plastics', 'action' => 'update', 'currentRecordSha256' => $plan['actions'][0]['currentRecordSha256'], 'expectedRecordSha256' => $plan['actions'][0]['expectedRecordSha256']]] !== $plan['actions']) throw new RuntimeException('The page Plan was not one read-only Plastics update.');
try { tio2_site_a_application_page_draft_execute('apply', $page, $products, $hashes, str_repeat('0', 64), $operations); throw new RuntimeException('A stale page Plan hash was accepted.'); } catch (InvalidArgumentException $expected_error) {}
$applied = tio2_site_a_application_page_draft_execute('apply', $page, $products, $hashes, $plan['planSha256'], $operations);
if (1 !== $store['writes'] || 1 !== $store['begins'] || 1 !== $store['commits'] || 0 !== $store['rollbacks'] || [['before' => true]] !== $store['queue'] || $expected !== $store['record']) throw new RuntimeException('The page Apply was not one isolated Plastics transaction.');
$second = tio2_site_a_application_page_draft_execute('plan', $page, $products, $hashes, null, $operations);
if ('no-change' !== $second['actions'][0]['action']) throw new RuntimeException('The second page Plan was not no-change.');
echo json_encode(['id' => $applied['actions'][0]['id'], 'firstAction' => $plan['actions'][0]['action'], 'secondAction' => $second['actions'][0]['action'], 'writes' => $store['writes']], JSON_THROW_ON_ERROR);
`,
      '/workspace/wordpress/seed/apply-site-a-application-page-draft.php',
      '/workspace/tests/fixtures/editorial/site-a-applications.synthetic.json',
    ],
    {encoding: 'utf8', timeout: 30_000},
  )
}

describe('single Site A Application page draft importer', () => {
  it('plans and applies exactly one approved Plastics draft', () => {
    expect(existsSync(importerPath), 'single-page Application importer is missing').toBe(true)
    const result = runControlledImporter()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      id: 'plastics',
      firstAction: 'update',
      secondAction: 'no-change',
      writes: 1,
    })
  })
})
