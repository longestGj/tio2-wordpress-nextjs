<?php
declare(strict_types=1);
define('ABSPATH', __DIR__);
final class WP_Error { public function __construct(public string $code, public string $message = '') {} }
function is_wp_error($value): bool { return $value instanceof WP_Error; }
$plugin = dirname(__DIR__, 3) . '/wordpress/plugins/tio2-site-model';
require_once $plugin . '/includes/content-release-validation.php';
$home = json_decode(file_get_contents($plugin . '/config/tio2-my-homepage.json'), true, 512, JSON_THROW_ON_ERROR);
$app = json_decode(file_get_contents($plugin . '/config/tio2-my-application-hub.json'), true, 512, JSON_THROW_ON_ERROR);
$changed_home = $home; $changed_home['company']['summaries'][] = ['title' => 'Additional summary', 'description' => 'Synthetic technical test.'];
$changed_app = $app; $changed_app['evaluation']['items'][] = ['title' => 'Additional evaluation', 'body' => 'Synthetic technical test.'];
if (in_array('--legacy-red', $argv, true)) {
    echo json_encode(['home' => tio2_my_content_matches($changed_home, $home, 'HOME-001'), 'application' => tio2_my_content_matches($changed_app, $app, 'APP-000')]);
    exit;
}
require_once $plugin . '/includes/content-write-contract.php';
require_once $plugin . '/includes/content-write-approval.php';
function result($value) { return is_wp_error($value) ? $value->code : ($value === true || is_array($value)); }
function encoded($value): string { return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE); }
$input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
if (($argv[1] ?? '') === '--revoke') {
    unlink('/approvals/trusted/synthetic-001.json'); echo '{}'; exit;
}
if (($argv[1] ?? '') === '--setup') {
    // Synthetic evidence only. All changes are inside this disposable Docker volume.
    foreach (['trusted', 'writer-owned', 'writable-parent', 'writable-parent/nested'] as $dir) mkdir('/approvals/' . $dir, 0755);
    $proof = $input['proof'];
    foreach (['trusted', 'writer-owned', 'writable-parent/nested'] as $dir) file_put_contents('/approvals/' . $dir . '/synthetic-001.json', encoded($proof));
    file_put_contents('/approvals/trusted/writable.json', encoded($proof)); chmod('/approvals/trusted/writable.json', 0666);
    file_put_contents('/approvals/trusted/duplicates.json', '{"approvalId":"duplicates","approvalId":"synthetic-001"}');
    file_put_contents('/approvals/trusted/oversized.json', str_repeat(' ', 65537));
    file_put_contents('/approvals/trusted/wrong-id.json', encoded($proof));
    file_put_contents('/approvals/trusted/writer-owned-file.json', encoded($proof)); chown('/approvals/trusted/writer-owned-file.json', 33);
    symlink('/approvals/trusted/synthetic-001.json', '/approvals/trusted/symlink.json');
    symlink('/approvals/trusted', '/approvals/linked-root');
    chmod('/approvals/writable-parent', 0777); chown('/approvals/writer-owned', 33);
    echo '{}'; exit;
}
if (($argv[1] ?? '') === '--load') {
    if (($argv[4] ?? '') !== 'missing-root') define('TIO2_CONTENT_APPROVAL_ROOT', '/approvals/' . $argv[2]);
    if (($argv[4] ?? '') !== 'missing-writer') define('TIO2_CONTENT_WRITER_UID', ($argv[4] ?? '') === 'root-writer' ? 0 : 33);
    echo encoded(['result' => result(tio2_load_content_approval($argv[3])), 'euid' => posix_geteuid()]); exit;
}
$vectors = json_decode(file_get_contents(dirname(__DIR__, 2) . '/fixtures/content-write-approval-cases.json'), false, 512, JSON_THROW_ON_ERROR);
$results = ['changes' => ['home' => tio2_validate_my_content_write('HOME-001', encoded($changed_home), encoded($home)) === true,
    'application' => tio2_validate_my_content_write('APP-000', encoded($changed_app), encoded($app)) === true], 'writes' => [], 'digests' => [], 'approvals' => []];
foreach ($vectors->writeCases as $case) {
    $current = $case->pageId === 'HOME-001' ? $home : $app;
    $candidate = json_decode(encoded($current));
    $parts = explode('.', $case->path); $last = array_pop($parts); $node =& $candidate;
    foreach ($parts as $part) { if (is_array($node)) $node =& $node[(int) $part]; else $node =& $node->$part; }
    if (($case->operation ?? '') === 'delete') unset($node->$last);
    elseif (($case->operation ?? '') === 'resize') $node->$last = array_fill(0, $case->count, $node->$last[0]);
    else $node->$last = $case->value;
    unset($node);
    $results['writes'][] = result(tio2_validate_my_content_write($case->pageId, encoded($candidate), encoded($current)));
}
foreach ($vectors->digestCases as $case) {
    try { $results['digests'][] = tio2_content_digest($case->json); }
    catch (Throwable $error) { $results['digests'][] = 'reject'; }
}
foreach ($vectors->approvalCases as $case) {
    // SYNTHETIC materials constructed independently by the Node test, never installed in production.
    $proof = $input['proof']; $before = $input['before']; $after = $input['after'];
    if (isset($case->field)) $proof[$case->field] = $case->value;
    switch ($case->change ?? '') {
        case 'missing-page': $proof['records'] = []; break;
        case 'duplicate-page': $proof['records'][] = $proof['records'][0]; break;
        case 'wrong-locale': $proof['records'][0]['locale'] = 'ms'; break;
        case 'tampered-after': $proof['records'][0]['afterSha256'] = str_repeat('0', 64); break;
        case 'stale-before': $proof['records'][0]['beforeSha256'] = str_repeat('0', 64); break;
    }
    $results['approvals'][] = result(tio2_check_content_approval($proof, 'isolated-run-001', 'update-published', $before, $after, 2000000000));
}
$no_footer = $home; unset($no_footer['footer']);
$footer_reordered = json_decode(encoded($home)); $footer_items = get_object_vars($footer_reordered->footer); $footer_reordered->footer = (object) array_reverse($footer_items, true);
$unsorted = $input['bulkProof']; $unsorted['records'] = array_reverse($unsorted['records']);
$publish = $input['proof']; $publish['operation'] = 'publish-draft';
$max_text = $home; $max_text['hero']['heading'] = str_repeat('a', 100000);
$over_text = $max_text; $over_text['hero']['heading'] .= 'a';
$deep_json = str_repeat('[', 510) . '0' . str_repeat(']', 510);
$too_deep = str_repeat('[', 512) . '0' . str_repeat(']', 512);
try { tio2_content_digest($too_deep); $reject_depth = false; } catch (Throwable $error) { $reject_depth = true; }
$results['boundaries'] = [
    'initialFooter' => result(tio2_validate_my_content_write('HOME-001', encoded($home), null)),
    'initialWithoutFooter' => result(tio2_validate_my_content_write('HOME-001', encoded($no_footer), null)),
    'introducedFooter' => result(tio2_validate_my_content_write('HOME-001', encoded($home), encoded($no_footer))),
    'footerReordered' => result(tio2_validate_my_content_write('HOME-001', encoded($footer_reordered), encoded($home))),
    'unknownPage' => result(tio2_validate_my_content_write('OTHER', encoded($app), null)),
    'objectListDiffer' => tio2_content_digest('{}') !== tio2_content_digest('[]'),
    'fullFooterProtected' => tio2_content_digest(encoded($home)) !== tio2_content_digest(encoded($no_footer)),
    'arrayOrderProtected' => tio2_content_digest('[1,2]') !== tio2_content_digest('[2,1]'),
    'duplicateWrite' => result(tio2_validate_my_content_write('HOME-001', '{"packageId":"duplicate",' . substr(encoded($home), 1), encoded($home))),
    'bulk' => result(tio2_check_content_approval($input['bulkProof'], 'isolated-run-001', 'update-published', $input['bulkBefore'], $input['bulkAfter'], 2000000000)),
    'unsortedPages' => result(tio2_check_content_approval($unsorted, 'isolated-run-001', 'update-published', $input['bulkBefore'], $input['bulkAfter'], 2000000000)),
    'extraPage' => result(tio2_check_content_approval($input['proof'], 'isolated-run-001', 'update-published', $input['bulkBefore'], $input['bulkAfter'], 2000000000)),
    'missingBefore' => result(tio2_check_content_approval($input['proof'], 'isolated-run-001', 'update-published', [], $input['after'], 2000000000)),
    'invalidApproved' => result(tio2_check_content_approval($input['unsafeProof'], 'isolated-run-001', 'update-published', $input['before'], $input['unsafeAfter'], 2000000000)),
    'beginsNow' => result(tio2_check_content_approval($input['proof'], 'isolated-run-001', 'update-published', $input['before'], $input['after'], 1999999900)),
    'expiresNow' => result(tio2_check_content_approval($input['proof'], 'isolated-run-001', 'update-published', $input['before'], $input['after'], 2000000200)),
    'missingEnvironment' => result(tio2_check_content_approval($input['proof'], '', 'update-published', $input['before'], $input['after'], 2000000000)),
    'publishDraft' => result(tio2_check_content_approval($publish, 'isolated-run-001', 'publish-draft', $input['before'], $input['after'], 2000000000)),
    'maxText' => result(tio2_validate_my_content_write('HOME-001', encoded($max_text), encoded($home))),
    'overText' => result(tio2_validate_my_content_write('HOME-001', encoded($over_text), encoded($home))),
    'validDepth' => tio2_content_digest($deep_json) === hash('sha256', $deep_json),
    'rejectDepth' => $reject_depth,
];
echo encoded($results);
