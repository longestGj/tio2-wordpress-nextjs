import {spawnSync} from 'node:child_process'
import {copyFileSync, existsSync, rmSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

const productManifestPath = 'D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json'

function runReversibleAdapterTest() {
  return spawnSync('docker', [
    'compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', 'wpcli', 'wp', 'eval', String.raw`
define('TIO2_SITE_A_EDITORIAL_LIBRARY_CONTEXT', true);
require '/workspace/wordpress/seed/export-site-a-editorial-audit.php';
tio2_site_a_editorial_assert_local_wp_environment();
$applications = json_decode(file_get_contents('/workspace/tests/fixtures/editorial/site-a-applications.synthetic.json'), true, 512, JSON_THROW_ON_ERROR);
$resources = json_decode(file_get_contents('/workspace/tests/fixtures/editorial/site-a-resources.synthetic.json'), true, 512, JSON_THROW_ON_ERROR);
$products = json_decode(file_get_contents('/workspace/wordpress/seed/.runtime-task8-products.json'), true, 512, JSON_THROW_ON_ERROR);
$records = tio2_site_a_editorial_expected_records('DeferredProductRelations', $applications, $resources, $products);
$baseline_records = tio2_site_a_editorial_audit_read_wp_records();
$baseline_readback = tio2_site_a_editorial_sha256($baseline_records);
$baseline_site_b = tio2_site_a_editorial_site_b_hash();
$baseline_queue = $GLOBALS['tio2_webhook_queue'] ?? [];
$operations = tio2_site_a_editorial_wp_operations();
$record = array_values(array_filter($records, static fn(array $candidate): bool => 'application' === $candidate['entityType'] && 'coatings' === $candidate['id']))[0];
$record['id'] = 'task8-adapter-rollback';
$record['slug'] = 'task8-adapter-rollback';
$record['path'] = '/applications/task8-adapter-rollback';
$record['title'] = 'Task 8 reversible adapter record';
$record['meta']['application_id'] = $record['id'];
$transaction_started = false;
try {
    $operations['begin']();
    $transaction_started = true;
    $operations['create_identity']($record);
    $operations['write']('create', $record);
    $readback = $operations['readback']('application', $record['id']);
    if (!is_array($readback) || tio2_site_a_editorial_canonicalize($record) !== tio2_site_a_editorial_canonicalize($readback)) throw new RuntimeException('The production adapter normalized readback did not match its real ACF/taxonomy write.');
    $operations['rollback']();
    $transaction_started = false;
    $operations['restore_queue']($baseline_queue);
} finally {
    if ($transaction_started) $operations['rollback']();
}
if (null !== tio2_site_a_editorial_find_wp_record('application', $record['id']) || !hash_equals($baseline_readback, tio2_site_a_editorial_sha256(tio2_site_a_editorial_audit_read_wp_records()))) throw new RuntimeException('The successful write/readback adapter fixture did not roll back cleanly.');
$evidence = ['filterReached' => false, 'identity' => '', 'family' => '', 'parent' => '', 'scopes' => []];
$filter = static function($value, $post_id, $field) use (&$evidence) {
    $evidence = [
        'filterReached' => true,
        'identity' => (string) get_post_meta((int) $post_id, 'application_id', true),
        'family' => (string) get_post_meta((int) $post_id, 'family', true),
        'parent' => (string) get_post_meta((int) $post_id, 'parent_application', true),
        'scopes' => wp_get_object_terms((int) $post_id, 'site_scope', ['fields' => 'slugs']),
    ];
    throw new RuntimeException('Injected live adapter mid-write failure.');
};
$transaction_started = false;
add_filter('acf/update_value/name=buyer_problem', $filter, 999, 3);
try {
    $operations['begin']();
    $transaction_started = true;
    $operations['create_identity']($record);
    $operations['write']('create', $record);
    throw new RuntimeException('Injected ACF failure was not reached.');
} catch (Throwable $error) {
    if ('Injected live adapter mid-write failure.' !== $error->getMessage()) throw $error;
    $operations['rollback']();
    $transaction_started = false;
    $operations['restore_queue']($baseline_queue);
    $operations['assert_site_b']($baseline_site_b);
} finally {
    remove_filter('acf/update_value/name=buyer_problem', $filter, 999);
    if ($transaction_started) $operations['rollback']();
}
if (!$evidence['filterReached'] || $record['id'] !== $evidence['identity'] || '' === $evidence['family'] || '' === $evidence['parent'] || ['tio2-a'] !== $evidence['scopes']) throw new RuntimeException('The live adapter did not reach real identity, ACF, relationship, and taxonomy effects before failure.');
if (null !== tio2_site_a_editorial_find_wp_record('application', $record['id'])) throw new RuntimeException('The injected live adapter record survived rollback.');
if ([] !== get_posts(['post_type' => 'any', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'no_found_rows' => true, 'meta_key' => 'public_path', 'meta_value' => $record['path']])) throw new RuntimeException('The injected live adapter path survived rollback.');
if ($baseline_queue !== ($GLOBALS['tio2_webhook_queue'] ?? [])) throw new RuntimeException('The live adapter queue was not restored.');
if (!hash_equals($baseline_site_b, tio2_site_a_editorial_site_b_hash())) throw new RuntimeException('The live adapter changed Site B.');
if (!hash_equals($baseline_readback, tio2_site_a_editorial_sha256(tio2_site_a_editorial_audit_read_wp_records()))) throw new RuntimeException('The existing 39 authorized drafts changed after rollback.');

$extra = $record;
$extra['id'] = 'task8-audit-extra';
$extra['slug'] = 'task8-audit-extra';
$extra['path'] = '/applications/task8-audit-extra';
$extra['meta']['application_id'] = $extra['id'];
$transaction_started = false;
try {
    $operations['begin']();
    $transaction_started = true;
    $operations['create_identity']($extra);
    try { tio2_site_a_editorial_audit_read_wp_records(); throw new RuntimeException('Real extra Site A record was invisible to the audit adapter.'); } catch (RuntimeException $error) { if (!str_contains($error->getMessage(), 'unexpected exact Site A')) throw $error; }
    $operations['rollback']();
    $transaction_started = false;
} finally {
    if ($transaction_started) $operations['rollback']();
    $operations['restore_queue']($baseline_queue);
}
if (null !== tio2_site_a_editorial_find_wp_record('application', $extra['id']) || !hash_equals($baseline_readback, tio2_site_a_editorial_sha256(tio2_site_a_editorial_audit_read_wp_records())) || !hash_equals($baseline_site_b, tio2_site_a_editorial_site_b_hash())) throw new RuntimeException('The live extra-record audit fixture did not roll back cleanly.');

$hidden_product_id = 'TASK8-SEARCH-HIDDEN-COLLISION';
$transaction_started = false;
try {
    $operations['begin']();
    $transaction_started = true;
    $hidden_product_post_id = wp_insert_post(['post_type' => 'tio2_product', 'post_status' => 'draft', 'post_name' => 'task8-search-hidden-collision', 'post_title' => 'Task 8 search-hidden collision'], true);
    if (is_wp_error($hidden_product_post_id)) throw new RuntimeException($hidden_product_post_id->get_error_message());
    update_post_meta((int) $hidden_product_post_id, 'product_id', $hidden_product_id);
    update_post_meta((int) $hidden_product_post_id, 'public_path', '/applications/coatings');
    update_post_meta((int) $hidden_product_post_id, 'application_id', 'coatings');
    $hidden_product_scope = wp_set_object_terms((int) $hidden_product_post_id, ['tio2-a'], 'site_scope', false);
    if (is_wp_error($hidden_product_scope)) throw new RuntimeException($hidden_product_scope->get_error_message());
    $path_rejection = null;
    try { tio2_site_a_editorial_find_wp_path('/applications/coatings', 'application', 'coatings'); } catch (RuntimeException $error) { $path_rejection = $error->getMessage(); }
    if (!is_string($path_rejection) || !str_contains($path_rejection, 'owned by another record')) throw new RuntimeException('The search-hidden Product canonical path owner was invisible.');
    $audit_rejection = null;
    try { tio2_site_a_editorial_audit_read_wp_records(); } catch (RuntimeException $error) { $audit_rejection = $error->getMessage(); }
    if (!is_string($audit_rejection) || !str_contains($audit_rejection, 'malformed exact Site A')) throw new RuntimeException('The search-hidden Product editorial stable ID was invisible.');
    $operations['rollback']();
    $transaction_started = false;
    $operations['restore_queue']($baseline_queue);
} finally {
    if ($transaction_started) $operations['rollback']();
}
$hidden_product_ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => -1, 'no_found_rows' => true, 'meta_key' => 'product_id', 'meta_value' => $hidden_product_id]);
if ([] !== $hidden_product_ids || !hash_equals($baseline_readback, tio2_site_a_editorial_sha256(tio2_site_a_editorial_audit_read_wp_records())) || !hash_equals($baseline_site_b, tio2_site_a_editorial_site_b_hash())) throw new RuntimeException('The search-hidden Product collision fixture did not roll back cleanly.');
echo wp_json_encode(['records' => count($baseline_records), 'siteB' => $baseline_site_b, 'readback' => 'sha256:' . $baseline_readback, 'midWriteRollback' => true, 'extraAuditRejected' => true, 'hiddenProductCollisionRejected' => true]);
`,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {...process.env},
    timeout: 60_000,
  })
}

describe('local WordPress Site A editorial production adapters', () => {
  it.skipIf(!existsSync('wordpress/.env') || !existsSync(productManifestPath))('rolls back real identity, ACF, taxonomy, relationship, queue, and audit-extra effects', () => {
    const runtimeProductPath = 'wordpress/seed/.runtime-task8-products.json'
    copyFileSync(productManifestPath, runtimeProductPath)
    try {
      const result = runReversibleAdapterTest()
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
      const marker = result.stdout.split(/\r?\n/u).find((line) => line.startsWith('{"records"'))
      expect(marker, result.stdout).toBeDefined()
      expect(JSON.parse(marker!)).toEqual({
        records: 39,
        siteB: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        readback: expect.stringMatching(/^sha256:[a-f0-9]{64}$/u),
        midWriteRollback: true,
        extraAuditRejected: true,
        hiddenProductCollisionRejected: true,
      })
    } finally {
      rmSync(runtimeProductPath, {force: true})
    }
  }, 30_000)
})
