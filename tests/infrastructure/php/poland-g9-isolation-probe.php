<?php
// Reversible, opt-in LOCAL-only damage probe. Never deletes a content record.
// Raw targeted DB writes deliberately avoid save/webhook callbacks. Public
// resolver and Next HTTP behavior are tested by poland-g9-isolation.spec.ts.
// wp eval-file wraps the script in eval; a strict_types declaration is invalid there.
if ('local' !== wp_get_environment_type()) throw new RuntimeException('Local WordPress required.');
global $wpdb;
$id = (int)($args[0] ?? 0);
$mode = (string)($args[1] ?? '');
$seed_hash = (string)($args[2] ?? '');
$owner = (string)($args[3] ?? '');
if ($id < 1 || !preg_match('/^[0-9a-f-]{36}$/D', $owner) || !in_array($mode, ['begin','missing','no-scope','wrong-scope','multiple-scopes','draft','malformed','reset','restore'], true)) {
    throw new RuntimeException('Explicit record, mode, seed hash and run owner required.');
}
$seed = file_get_contents('/workspace/wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json');
if (hash('sha256', $seed) !== $seed_hash) throw new RuntimeException('Seed baseline changed.');
$directory = '/workspace/.tmp/poland-g9-private';
if (!is_dir($directory) && !mkdir($directory, 0700, true)) throw new RuntimeException('Private backup directory unavailable.');
$backup_path = $directory.'/record-backup.json';
$lock = fopen($directory.'/probe.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) throw new RuntimeException('Concurrent probe refused.');

$read = static function () use ($wpdb, $id): array {
    $post = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->posts} WHERE ID = %d", $id), ARRAY_A);
    if (!$post || 'tio2_market_page' !== $post['post_type']) throw new RuntimeException('Exact market record required.');
    $meta = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_id", $id), ARRAY_A);
    $scopes = $wpdb->get_results($wpdb->prepare("SELECT r.* FROM {$wpdb->term_relationships} r JOIN {$wpdb->term_taxonomy} t ON t.term_taxonomy_id=r.term_taxonomy_id WHERE r.object_id=%d AND t.taxonomy='site_scope' ORDER BY r.term_taxonomy_id", $id), ARRAY_A);
    return ['post'=>$post, 'meta'=>$meta, 'scopes'=>$scopes];
};
$hash = static fn(array $value): string => hash('sha256', wp_json_encode($value));
$check = static function ($result): void {
    if (false === $result) throw new RuntimeException('Targeted database operation failed.');
};
$clean = static function () use ($id): void { clean_post_cache($id); wp_cache_delete($id, 'post_meta'); wp_cache_delete($id, 'site_scope_relationships'); };
$scope_ids = [];
foreach (['tio2-my', 'tio2-a'] as $slug) {
    $term = get_term_by('slug', $slug, 'site_scope');
    if (!$term) throw new RuntimeException('Existing scope terms required; probe never creates taxonomy terms.');
    $scope_ids[$slug] = (int)$term->term_taxonomy_id;
}
$set_scopes = static function (array $relationships) use ($wpdb, $id, $check): void {
    $check($wpdb->query($wpdb->prepare("DELETE r FROM {$wpdb->term_relationships} r JOIN {$wpdb->term_taxonomy} t ON t.term_taxonomy_id=r.term_taxonomy_id WHERE r.object_id=%d AND t.taxonomy='site_scope'", $id)));
    foreach ($relationships as $row) $check($wpdb->insert($wpdb->term_relationships, $row));
};
$restore = static function (array $snapshot) use ($wpdb, $id, $check, $set_scopes, $clean, $read, $hash): string {
    $check($wpdb->update($wpdb->posts, $snapshot['post'], ['ID'=>$id]));
    // Only two meta values can be changed; preserve every original row and ID.
    foreach ($snapshot['meta'] as $row) $check($wpdb->update($wpdb->postmeta, ['meta_value'=>$row['meta_value']], ['meta_id'=>$row['meta_id'], 'post_id'=>$id]));
    $set_scopes($snapshot['scopes']);
    $clean();
    $actual = $hash($read());
    if (!hash_equals($hash($snapshot), $actual)) throw new RuntimeException('Exact record restoration failed; keep private backup for recovery.');
    return $actual;
};

try {
    if ('begin' === $mode) {
        if (file_exists($backup_path)) throw new RuntimeException('Existing active/stale backup refused; inspect and recover its recorded owner first.');
        if (tio2_poland_market_candidate_ids() !== [$id] || 'publish' !== get_post_status($id) || true !== tio2_validate_market_page_poland_v01_contract($id) || get_post_meta($id, TIO2_MY_POLAND_MARKET_CONTRACT_META, true) !== $seed) {
            throw new RuntimeException('Exact unique published approved Poland baseline required.');
        }
        $snapshot = $read();
        $backup = ['postId'=>$id, 'owner'=>$owner, 'seedSha256'=>$seed_hash, 'createdAt'=>gmdate('c'), 'snapshot'=>$snapshot, 'snapshotSha256'=>$hash($snapshot)];
        $file = fopen($backup_path, 'x');
        if (!$file) throw new RuntimeException('Exclusive backup creation refused.');
        chmod($backup_path, 0600);
        $serialized = wp_json_encode($backup);
        $written = fwrite($file, $serialized);
        fflush($file); fclose($file);
        if ($written !== strlen($serialized)) throw new RuntimeException('Incomplete backup; no mutation performed.');
    } else {
        if (!file_exists($backup_path)) throw new RuntimeException('Owned backup required before mutation or restoration.');
        $backup = json_decode(file_get_contents($backup_path), true, 512, JSON_THROW_ON_ERROR);
        if ($backup['postId'] !== $id || $backup['owner'] !== $owner || $backup['seedSha256'] !== $seed_hash || !hash_equals($backup['snapshotSha256'], $hash($backup['snapshot']))) throw new RuntimeException('Backup identity or integrity mismatch.');
        $snapshot = $backup['snapshot'];
        if (in_array($mode, ['reset','restore'], true)) {
            $restore($snapshot);
            if ('restore' === $mode && !unlink($backup_path)) throw new RuntimeException('Restored but backup cleanup failed.');
        } else {
            if ($hash($read()) !== $backup['snapshotSha256']) throw new RuntimeException('Record not at baseline; reset before next state.');
            try {
                if ('missing' === $mode) {
                    $check($wpdb->update($wpdb->posts, ['post_name'=>'poland-g9-hidden-'.$id], ['ID'=>$id]));
                    $check($wpdb->update($wpdb->postmeta, ['meta_value'=>'/poland-g9-hidden-'.$id], ['post_id'=>$id, 'meta_key'=>'public_path']));
                } elseif ('draft' === $mode) {
                    $check($wpdb->update($wpdb->posts, ['post_status'=>'draft'], ['ID'=>$id]));
                } elseif ('malformed' === $mode) {
                    $check($wpdb->update($wpdb->postmeta, ['meta_value'=>'{"invalid":'], ['post_id'=>$id, 'meta_key'=>TIO2_MY_POLAND_MARKET_CONTRACT_META]));
                } else {
                    $slugs = 'no-scope' === $mode ? [] : ('wrong-scope' === $mode ? ['tio2-a'] : ['tio2-my','tio2-a']);
                    $rows = [];
                    foreach ($slugs as $slug) $rows[] = ['object_id'=>$id, 'term_taxonomy_id'=>$scope_ids[$slug], 'term_order'=>0];
                    $set_scopes($rows);
                }
                $clean();
                if ($hash($read()) === $backup['snapshotSha256']) throw new RuntimeException('Requested damage state did not change the target.');
            } catch (Throwable $error) {
                $restore($snapshot); // Keep backup for the outer test's finally restoration.
                throw $error;
            }
        }
    }
    $current = $read();
    echo wp_json_encode(['postId'=>$id, 'mode'=>$mode, 'snapshotSha256'=>$hash($current), 'baselineSnapshotSha256'=>$backup['snapshotSha256'], 'contractSha256'=>hash('sha256', (string)get_post_meta($id, TIO2_MY_POLAND_MARKET_CONTRACT_META, true)), 'candidateIds'=>tio2_poland_market_candidate_ids(), 'status'=>$current['post']['post_status'], 'slug'=>$current['post']['post_name'], 'publicPath'=>get_post_meta($id, 'public_path', true), 'scopes'=>wp_get_post_terms($id, 'site_scope', ['fields'=>'slugs']), 'modifiedGmt'=>$current['post']['post_modified_gmt']]).PHP_EOL;
} finally {
    flock($lock, LOCK_UN); fclose($lock);
}
