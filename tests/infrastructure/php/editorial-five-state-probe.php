<?php
// Actual resolver/GraphQL transitions, restricted to the five task-created local records.
$task_id = 'G8-DE-IT-SU-R706-CHEMOURS-20260908-01';
if (!(defined('WP_CLI') && WP_CLI) || wp_get_environment_type() !== 'local' || get_option('tio2_editorial_task_id') !== $task_id || get_option('siteurl') !== 'http://127.0.0.1:8187') {
    throw new RuntimeException('Exact five-page task-owned local CMS required.');
}
if (!function_exists('graphql') || !function_exists('tio2_editorial_resolve')) throw new RuntimeException('Actual GraphQL/editorial runtime required.');
add_filter('pre_http_request', static fn() => new WP_Error('five_state_probe', 'Outbound HTTP disabled during task-owned CMS state probe.'), PHP_INT_MAX);

$owned = ['MARKET-EU-DE'=>18554, 'MARKET-EU-IT'=>18556, 'PRODUCT-PROC-SU'=>18558, 'RES-R706'=>18560, 'RES-CHEMOURS'=>18562];
$evidence_path = '/workspace/docs/verification/tio2-my/de-it-su-r706-chemours-20260908/cms-five-states.json';
$seed = json_decode((string)file_get_contents(dirname($evidence_path).'/cms-seed.json'), true);
if (($seed['createdIds'] ?? null) !== array_values($owned)) throw new RuntimeException('Exact task seed ownership does not match.');
global $wpdb;
foreach ([$wpdb->posts, $wpdb->postmeta, $wpdb->term_relationships] as $table) {
    $engine = $wpdb->get_var($wpdb->prepare('SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s', $table));
    if ($engine !== 'InnoDB') throw new RuntimeException('Transactional storage required for exact restoration.');
}

function five_snapshot(int $id): array {
    global $wpdb;
    return [
        'post'=>$wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->posts} WHERE ID=%d", $id), ARRAY_A),
        'meta'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->postmeta} WHERE post_id=%d ORDER BY meta_id", $id), ARRAY_A),
        'terms'=>$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->term_relationships} WHERE object_id=%d ORDER BY term_taxonomy_id", $id), ARRAY_A),
    ];
}
function five_clear(array $ids): void {
    foreach ($ids as $id) { clean_post_cache($id); wp_cache_delete($id, 'post_meta'); wp_cache_delete($id, 'site_scope_relationships'); }
}
function five_hash(array $snapshot): string { return hash('sha256', wp_json_encode($snapshot)); }
function five_graphql(string $page_id, ?string $scope='tio2-my'): array {
    $variables = ['pageId'=>$page_id];
    if ($scope !== null) $variables['siteScope'] = $scope;
    return graphql(['query'=>'query FiveProbe($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}', 'variables'=>$variables]);
}
function five_assert_valid(string $page_id, int $id): array {
    $direct = json_decode(tio2_editorial_resolve(null, ['pageId'=>$page_id, 'siteScope'=>'tio2-my']), true);
    $graphql = five_graphql($page_id);
    if (!empty($graphql['errors']) || !is_string($graphql['data']['malaysiaEditorialRecordJson'] ?? null)) throw new RuntimeException($page_id.': actual GraphQL baseline rejected.');
    $api = json_decode($graphql['data']['malaysiaEditorialRecordJson'], true);
    $approved = json_decode(tio2_editorial_config($page_id), true);
    $payload = json_decode($api['editorialContractJson'] ?? '', true);
    if ($api !== $direct || $api['id'] !== 'editorial-'.$id || $api['recordPageId'] !== $page_id || $api['status'] !== 'publish' || $api['siteScopes']['nodes'] !== [['slug'=>'tio2-my']] || $payload !== $approved || $api['publishingFields']['publicPath'] !== rtrim($approved['identity']['path'], '/')) throw new RuntimeException($page_id.': scoped payload/metadata readback mismatch.');
    return ['postId'=>$id, 'payloadSha256'=>hash('sha256', $api['editorialContractJson']), 'canonical'=>$payload['seo']['canonical'], 'scope'=>'tio2-my', 'directAndGraphqlEqual'=>true, 'freshnessRequired'=>$payload['freshness'] !== null];
}
function five_assert_rejected(string $page_id, ?string $scope='tio2-my'): array {
    $rejected = false; $args = ['pageId'=>$page_id];
    if ($scope !== null) $args['siteScope'] = $scope;
    try { tio2_editorial_resolve(null, $args); }
    catch (\GraphQL\Error\UserError $error) { $rejected = true; }
    if (!$rejected) throw new RuntimeException($page_id.': PHP resolver accepted invalid state.');
    $api = five_graphql($page_id, $scope);
    if (empty($api['errors']) || !empty($api['data']['malaysiaEditorialRecordJson'])) throw new RuntimeException($page_id.': GraphQL exposed invalid record.');
    return ['phpRejected'=>true, 'graphqlRejected'=>true, 'graphqlErrorCount'=>count($api['errors'])];
}
function five_post(int $id, array $fields): void {
    global $wpdb;
    if ($wpdb->update($wpdb->posts, $fields, ['ID'=>$id]) === false) throw new RuntimeException('Temporary post mutation failed.');
}
function five_meta(int $id, string $key, string $value): void {
    global $wpdb;
    if ($wpdb->update($wpdb->postmeta, ['meta_value'=>$value], ['post_id'=>$id, 'meta_key'=>$key]) !== 1) throw new RuntimeException('Expected one task-owned metadata row for mutation: '.$key);
}

$snapshots = []; $baseline = []; $results = []; $restoration = []; $failure = null;
foreach ($owned as $page_id=>$id) {
    if (tio2_editorial_candidates($page_id) !== [$id] || is_wp_error(tio2_editorial_validate_record($id, $page_id))) throw new RuntimeException('Owned record identity drift: '.$page_id);
    $snapshots[$id] = five_snapshot($id);
    $baseline[$page_id] = five_assert_valid($page_id, $id);
    $seed_record = array_values(array_filter($seed['records'], static fn(array $record): bool => $record['pageId'] === $page_id))[0] ?? null;
    if (!$seed_record || $seed_record['payloadSha256'] !== $baseline[$page_id]['payloadSha256']) throw new RuntimeException('Seed payload identity drift: '.$page_id);
}
$foreign = get_term_by('slug', 'tio2-a', 'site_scope');
$local = get_term_by('slug', 'tio2-my', 'site_scope');
if (!$foreign || !$local) throw new RuntimeException('Existing scope fixtures required; no taxonomy creation permitted.');

$in_transaction = false;
try {
    if ($wpdb->query('START TRANSACTION') === false) throw new RuntimeException('Cannot start restoration transaction.');
    $in_transaction = true;
    foreach ($owned as $page_id=>$id) {
        foreach ([null, '', 'tio2-a', 'tio2-b'] as $scope) $results[] = ['pageId'=>$page_id, 'state'=>'request-scope', 'inputScope'=>$scope] + five_assert_rejected($page_id, $scope);
        $partner = $id === 18554 ? 18556 : 18554;
        $payload = json_decode(tio2_editorial_config($page_id), true);
        $cases = [
            'draft'=>static fn() => five_post($id, ['post_status'=>'draft']),
            'missing'=>static fn() => five_post($id, ['post_type'=>'five_probe_hidden']),
            'wrong-route'=>static fn() => five_meta($id, 'public_path', '/five-probe/wrong-route'),
            'wrong-slug'=>static fn() => five_post($id, ['post_name'=>'five-probe-wrong-slug']),
            'wrong-page-id'=>static fn() => five_meta($id, '_tio2_editorial_page_id', 'FIVE-PROBE-INVALID'),
            'duplicate'=>static fn() => five_meta($partner, '_tio2_editorial_page_id', $page_id),
            'wrong-scope'=>static function() use ($id, $foreign, $local): void {
                global $wpdb;
                if ($wpdb->update($wpdb->term_relationships, ['term_taxonomy_id'=>$foreign->term_taxonomy_id], ['object_id'=>$id, 'term_taxonomy_id'=>$local->term_taxonomy_id]) !== 1) throw new RuntimeException('Wrong-scope fixture failed.');
            },
            'missing-scope'=>static function() use ($id, $local): void {
                global $wpdb;
                if ($wpdb->delete($wpdb->term_relationships, ['object_id'=>$id, 'term_taxonomy_id'=>$local->term_taxonomy_id]) !== 1) throw new RuntimeException('Missing-scope fixture failed.');
            },
            'changed-body'=>static function() use ($id, $payload): void { $payload['bodyHtml'] = '<p>Unapproved replacement</p>'; five_meta($id, TIO2_EDITORIAL_META, wp_json_encode($payload)); },
            'changed-canonical'=>static function() use ($id, $payload): void { $payload['seo']['canonical'] = 'https://tio2products.com/'; five_meta($id, TIO2_EDITORIAL_META, wp_json_encode($payload)); },
        ];
        if ($payload['freshness'] !== null) {
            $review = get_post_meta($id, TIO2_EDITORIAL_REVIEW_META, true);
            foreach (['status'=>'unverified', 'eventStatus'=>'open_trigger', 'nextReviewDue'=>'2000-01-01', 'pageId'=>'OTHER-PAGE', 'evidenceArtifactSha256'=>str_repeat('0',64)] as $field=>$bad) {
                $cases['freshness-'.$field] = static function() use ($id, $review, $field, $bad): void { $review[$field] = $bad; five_meta($id, TIO2_EDITORIAL_REVIEW_META, maybe_serialize($review)); };
            }
            $cases['freshness-missing'] = static fn() => five_meta($id, TIO2_EDITORIAL_REVIEW_META, '');
            if (tio2_editorial_review_valid_at($payload, $review, new DateTimeImmutable('2026-12-06T00:00:00+08:00'))) throw new RuntimeException($page_id.': approved review remains valid after due date.');
            $results[] = ['pageId'=>$page_id, 'state'=>'freshness-clock-boundary', 'testedAt'=>'2026-12-06T00:00:00+08:00', 'validatorRejected'=>true, 'databaseClockChanged'=>false];
        } else {
            if (!tio2_editorial_review_valid_at($payload, null, new DateTimeImmutable('2026-12-06T00:00:00+08:00'))) throw new RuntimeException($page_id.': non-freshness page incorrectly blocked.');
            $results[] = ['pageId'=>$page_id, 'state'=>'freshness-not-applicable', 'approvedPayloadFreshness'=>null, 'noInventedPageReviewGate'=>true];
        }
        foreach ($cases as $state=>$mutate) {
            if ($wpdb->query('SAVEPOINT five_case') === false) throw new RuntimeException('Cannot create state savepoint.');
            try {
                $mutate(); five_clear(array_values($owned));
                $results[] = ['pageId'=>$page_id, 'state'=>$state] + five_assert_rejected($page_id);
            } finally {
                if ($wpdb->query('ROLLBACK TO SAVEPOINT five_case') === false) throw new RuntimeException('State restoration rollback failed.');
                five_clear(array_values($owned));
                foreach ([$id, $partner] as $check_id) if (five_hash(five_snapshot($check_id)) !== five_hash($snapshots[$check_id])) throw new RuntimeException('State restoration readback drift: '.$check_id);
            }
            five_assert_valid($page_id, $id);
        }
    }
} catch (Throwable $error) {
    $failure = $error->getMessage();
} finally {
    if ($in_transaction && $wpdb->query('ROLLBACK') === false) $failure = ($failure ?? '').' Final rollback failed.';
    five_clear(array_values($owned));
    foreach ($owned as $page_id=>$id) {
        $before = five_hash($snapshots[$id]); $after = five_hash(five_snapshot($id));
        try {
            $valid = five_assert_valid($page_id, $id);
            $restoration[$page_id] = ['postId'=>$id, 'beforeSha256'=>$before, 'afterSha256'=>$after, 'exactlyRestored'=>$before === $after, 'resolverAndGraphqlRestored'=>$valid['directAndGraphqlEqual']];
            if ($before !== $after) $failure = ($failure ?? '').' Full snapshot restoration mismatch: '.$page_id;
        } catch (Throwable $error) { $failure = ($failure ?? '').' Restored resolver failed: '.$page_id; }
    }
    $evidence = ['taskId'=>$task_id, 'environment'=>wp_get_environment_type(), 'siteurl'=>get_option('siteurl'), 'time'=>gmdate('c'), 'method'=>'actual PHP resolver and in-process WPGraphQL; InnoDB transaction/savepoints; outbound HTTP blocked', 'mutationScope'=>array_values($owned), 'baseline'=>$baseline, 'results'=>$results, 'restoration'=>$restoration, 'pass'=>$failure === null, 'failure'=>$failure];
    if (file_put_contents($evidence_path, wp_json_encode($evidence, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)."\n") === false) throw new RuntimeException('Cannot write probe evidence after restoration.');
}
echo wp_json_encode(['pass'=>$failure === null, 'checks'=>count($results), 'restored'=>count(array_filter($restoration, static fn(array $item): bool => $item['exactlyRestored'] && $item['resolverAndGraphqlRestored'])), 'evidence'=>$evidence_path, 'failure'=>$failure]);
if ($failure !== null) throw new RuntimeException($failure);
