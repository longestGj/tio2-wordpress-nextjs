import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const exporterPath = fileURLToPath(
  new URL('../../../wordpress/seed/export-site-a-editorial-audit.php', import.meta.url),
)

function runControlledAudit() {
  return spawnSync('docker', [
    'compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--no-deps', '--entrypoint', 'php', 'wpcli',
    '-r', String.raw`
define('ABSPATH', __DIR__);
function wp_json_encode($value) { return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES); }
function get_post_types($arguments = [], $output = 'names') { return ['post'=>'post','page'=>'page','attachment'=>'attachment','revision'=>'revision','nav_menu_item'=>'nav_menu_item','custom_css'=>'custom_css','customize_changeset'=>'customize_changeset','oembed_cache'=>'oembed_cache','user_request'=>'user_request','wp_block'=>'wp_block','wp_template'=>'wp_template','wp_template_part'=>'wp_template_part','wp_global_styles'=>'wp_global_styles','wp_navigation'=>'wp_navigation','wp_font_family'=>'wp_font_family','wp_font_face'=>'wp_font_face','acf-field'=>'acf-field','acf-field-group'=>'acf-field-group','acf-post-type'=>'acf-post-type','acf-taxonomy'=>'acf-taxonomy','tio2_product'=>'tio2_product','tio2_grade'=>'tio2_grade','tio2_application'=>'tio2_application','tio2_document'=>'tio2_document','tio2_faq'=>'tio2_faq','tio2_homepage'=>'tio2_homepage','hidden_search_content'=>'hidden_search_content']; }
function get_posts($arguments) { $GLOBALS['audit_candidate_queries'][] = $arguments; return []; }
require $argv[1];
$GLOBALS['audit_candidate_queries'] = [];
tio2_site_a_editorial_audit_wp_candidates();
$expected_collision_types = ['attachment','hidden_search_content','nav_menu_item','page','post','tio2_application','tio2_document','tio2_faq','tio2_grade','tio2_homepage','tio2_product','wp_block','wp_font_face','wp_font_family','wp_global_styles','wp_navigation','wp_template','wp_template_part'];
if (3 !== count($GLOBALS['audit_candidate_queries']) || $expected_collision_types !== $GLOBALS['audit_candidate_queries'][1]['post_type'] || $expected_collision_types !== $GLOBALS['audit_candidate_queries'][2]['post_type']) throw new RuntimeException('Audit identity enumeration omitted a search-hidden registered content owner.');
$applications = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
$resources = json_decode(file_get_contents($argv[3]), true, 512, JSON_THROW_ON_ERROR);
$product_ids = ['TP-P100','TP-P300','TP-S100','TP-C200','TP-C410','TP-C120','TP-I100','TP-H100','TP-P200','TP-P110','TP-P320','TP-P120','TP-P310','TP-P330','TP-PA100','TP-PA110','TP-PA120','TP-C050','TP-C100','TP-C110','TP-I200','TP-C300','TP-C310','TP-C400','TP-U100'];
$products = ['version' => '0.1', 'siteId' => 'tio2-a', 'products' => array_map(static fn(string $id): array => ['productId' => $id], $product_ids)];
$hashes = ['applications' => hash('sha256', json_encode($applications, JSON_THROW_ON_ERROR)), 'resources' => hash('sha256', json_encode($resources, JSON_THROW_ON_ERROR)), 'products' => hash('sha256', json_encode($products, JSON_THROW_ON_ERROR))];
$records = tio2_site_a_editorial_expected_records('DeferredProductRelations', $applications, $resources, $products);
$record_map = [];
foreach ($records as $record) $record_map[$record['entityType'] . ':' . $record['id']] = $record;
$candidates = [];
$records_by_post_id = [];
$post_id = 1000;
foreach ($records as $record) {
    ++$post_id;
    $candidates[] = ['postId' => $post_id, 'postType' => $record['postType'], 'scopes' => ['tio2-a'], 'applicationId' => 'application' === $record['entityType'] ? $record['id'] : '', 'resourceId' => 'resource' === $record['entityType'] ? $record['id'] : ''];
    $records_by_post_id[$post_id] = $record;
}
$unrelated_site_b = ['postId' => 2000, 'postType' => 'tio2_application', 'scopes' => ['tio2-b'], 'applicationId' => 'site-b-unrelated', 'resourceId' => ''];
$read_calls = [];
$reader = static function(int $candidate_post_id, string $type) use (&$read_calls, $records_by_post_id): array { $read_calls[] = $candidate_post_id; if (2000 === $candidate_post_id) throw new RuntimeException('Audit read unrelated Site B content.'); return $records_by_post_id[$candidate_post_id]; };
$selected = tio2_site_a_editorial_audit_read_wp_records(static fn(): array => array_merge($candidates, [$unrelated_site_b]), $reader);
if (39 !== count($selected) || 39 !== count($read_calls) || in_array(2000, $read_calls, true)) throw new RuntimeException('Audit did not enumerate exactly the managed Site A population without reading unrelated Site B content.');

function expect_population_failure(array $population, callable $reader, string $needle): void { try { tio2_site_a_editorial_audit_read_wp_records(static fn(): array => $population, $reader); } catch (RuntimeException $error) { if (str_contains($error->getMessage(), $needle)) return; throw $error; } throw new RuntimeException('Expected population failure containing ' . $needle); }
$extra_site_a = $candidates; $extra_site_a[] = ['postId' => 2001, 'postType' => 'tio2_application', 'scopes' => ['tio2-a'], 'applicationId' => 'unknown-site-a', 'resourceId' => ''];
expect_population_failure($extra_site_a, $reader, 'unexpected exact Site A');
$malformed_site_a = $candidates; $malformed_site_a[] = ['postId' => 2002, 'postType' => 'tio2_document', 'scopes' => ['tio2-a'], 'applicationId' => '', 'resourceId' => ''];
expect_population_failure($malformed_site_a, $reader, 'malformed exact Site A');
$duplicate_site_a = $candidates; $duplicate_site_a[] = array_merge($candidates[0], ['postId' => 2003]);
expect_population_failure($duplicate_site_a, $reader, 'duplicate');
$cross_site_expected = array_merge($candidates, [['postId' => 2004, 'postType' => 'tio2_application', 'scopes' => ['tio2-b'], 'applicationId' => 'applications-hub', 'resourceId' => '']]);
expect_population_failure($cross_site_expected, $reader, 'cross-site duplicate');
$report = tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $records, 'sha256:site-b', 'sha256:site-b');
if (39 !== $report['recordCount'] || 28 !== $report['applicationCount'] || 11 !== $report['resourceCount'] || 39 !== count($report['deferredProductEdges']) || 39 !== count($report['records'])) throw new RuntimeException('Clean audit summary cardinality failed.');
foreach (['applicationSha256','resourceSha256','readbackSha256','deferredProductEdgesSha256','siteBInvariantSha256'] as $key) if (1 !== preg_match('/^sha256:[a-f0-9]{64}$/D', $report[$key])) throw new RuntimeException('Audit hash missing: ' . $key);
foreach ($report['records'] as $record) if (1 !== preg_match('/^sha256:[a-f0-9]{64}$/D', $record['recordSha256'])) throw new RuntimeException('Per-record hash missing.');
function audit_keys($value): array { if (!is_array($value)) return []; $keys = array_is_list($value) ? [] : array_keys($value); foreach ($value as $item) $keys = array_merge($keys, audit_keys($item)); return $keys; }
$all_keys = array_map('strtolower', audit_keys($report));
foreach (['postid','capability','evidence','sourcepath','tdsurl','attachment','manufacturer','legal'] as $private_key) if (in_array($private_key, $all_keys, true)) throw new RuntimeException('Audit leaked forbidden key: ' . $private_key);

function expect_audit_failure(callable $callback, string $needle): void { try { $callback(); } catch (RuntimeException $error) { if (str_contains($error->getMessage(), $needle)) return; throw $error; } throw new RuntimeException('Expected audit failure containing ' . $needle); }
$published = $records; $published[0]['status'] = 'publish';
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $published, 'sha256:site-b', 'sha256:site-b'), 'status');
$cross_site = $records; $cross_site[0]['scopes'] = ['tio2-b'];
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $cross_site, 'sha256:site-b', 'sha256:site-b'), 'scope');
$wrong_path = $records; $wrong_path[0]['path'] = '/applications/wrong';
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $wrong_path, 'sha256:site-b', 'sha256:site-b'), 'manifest mismatch');
$extra = $records; $extra[] = $records[0]; $extra[39]['id'] = 'unexpected-record';
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $extra, 'sha256:site-b', 'sha256:site-b'), 'unexpected');
$duplicate = $records; $duplicate[] = $records[0];
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $duplicate, 'sha256:site-b', 'sha256:site-b'), 'duplicate');
$unexpected_edge = $records; $unexpected_edge[0]['meta']['related_products'] = ['TP-P100'];
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $unexpected_edge, 'sha256:site-b', 'sha256:site-b'), 'manifest mismatch');
expect_audit_failure(static fn() => tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $records, 'sha256:before', 'sha256:after'), 'Site B');

$strict_records = tio2_site_a_editorial_expected_records('Strict', $applications, $resources, $products);
$strict_report = tio2_site_a_editorial_audit_build('Strict', $applications, $resources, $products, $hashes, $strict_records, 'sha256:site-b', 'sha256:site-b');
if ([] !== $strict_report['deferredProductEdges'] || $strict_report['readbackSha256'] === $report['readbackSha256']) throw new RuntimeException('Strict audit did not require resolved Product relations.');
$repeat = tio2_site_a_editorial_audit_build('DeferredProductRelations', $applications, $resources, $products, $hashes, $records, 'sha256:site-b', 'sha256:site-b');
if ($repeat['readbackSha256'] !== $report['readbackSha256'] || $repeat['deferredProductEdgesSha256'] !== $report['deferredProductEdgesSha256']) throw new RuntimeException('Audit hashes were not deterministic.');
echo json_encode(['records' => $report['recordCount'], 'deferredEdges' => count($report['deferredProductEdges']), 'readbackSha256' => $report['readbackSha256'], 'strictDeferredEdges' => count($strict_report['deferredProductEdges']), 'rejections' => 7], JSON_THROW_ON_ERROR);
`,
    '/workspace/wordpress/seed/export-site-a-editorial-audit.php',
    '/workspace/tests/fixtures/editorial/site-a-applications.synthetic.json',
    '/workspace/tests/fixtures/editorial/site-a-resources.synthetic.json',
  ], {encoding: 'utf8', timeout: 30_000})
}

describe('controlled WordPress Site A editorial normalized audit boundary', () => {
  it('hashes exact 28+11 readback and rejects every non-deferred mismatch', () => {
    expect(existsSync(exporterPath), 'editorial audit exporter is missing').toBe(true)

    const result = runControlledAudit()
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(JSON.parse(result.stdout)).toEqual({
      records: 39,
      deferredEdges: 39,
      readbackSha256: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
      strictDeferredEdges: 0,
      rejections: 7,
    })
  })
})
