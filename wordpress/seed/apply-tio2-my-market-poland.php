<?php
// WP-CLI eval-file prepends evaluation context; a strict_types declaration here is incompatible.

// wp eval-file .../apply-tio2-my-market-poland.php [Plan|Apply]
// Plan is read-only. Apply is restricted to the explicit local WordPress environment.
function tio2_seed_malaysia_poland_market(string $mode = 'Plan'): array
{
    if (!in_array($mode, ['Plan','Apply'], true)) throw new RuntimeException('Use Plan or Apply.');
    if (!function_exists('wp_get_environment_type') || 'local' !== wp_get_environment_type() ||
        !function_exists('tio2_validate_market_page_poland_v01_contract')) {
        throw new RuntimeException('Poland seed requires the project plugin and an explicit local WordPress environment.');
    }
    $term = get_term_by('slug', 'tio2-my', 'site_scope');
    if (!$term || is_wp_error($term)) throw new RuntimeException('Existing tio2-my site_scope term is required; seed will not create taxonomy terms.');
    $file = dirname(__DIR__).'/plugins/tio2-site-model/config/tio2-my-market-poland.json';
    $json = is_readable($file) ? file_get_contents($file) : false;
    if (true !== tio2_validate_poland_market_payload($json)) throw new RuntimeException('Missing or invalid approved Poland seed payload.');
    $ids = tio2_poland_market_candidate_ids();
    if (count($ids) > 1) throw new RuntimeException('Multiple Poland slug/path owners exist; no records changed.');
    $id = $ids[0] ?? 0;
    if ($id && true !== tio2_validate_poland_market_identity($id)) throw new RuntimeException('Existing Poland slug/path owner has a foreign or incomplete identity; no records changed.');
    if ($id && !in_array(get_post_status($id), ['draft','pending','private','publish'], true)) throw new RuntimeException('Existing Poland record has a protected status; no records changed.');
    $result = ['mode'=>$mode,'operation'=>$id ? 'update' : 'create','postId'=>$id ?: null,'siteScope'=>'tio2-my',
        'pageId'=>'MARKET-EU-PL','publicPath'=>'/markets/poland','payloadSha256'=>hash('sha256', $json),'releaseEnabled'=>false];
    if ('Plan' === $mode) return $result;

    // Snapshot only this record; no shared settings, release flags, terms or other records are mutated.
    $snapshot = $id ? ['post'=>[
        'ID'=>$id, 'post_status'=>get_post_status($id), 'post_name'=>get_post_field('post_name', $id),
        'post_title'=>get_post_field('post_title', $id),
    ], 'scope'=>wp_get_post_terms($id, 'site_scope', ['fields'=>'slugs']), 'meta'=>[]] : null;
    if ($snapshot !== null) foreach (['post_date','post_date_gmt','post_modified','post_modified_gmt'] as $key) {
        $snapshot['post'][$key] = get_post_field($key, $id);
    }
    foreach (['public_path',TIO2_MY_POLAND_MARKET_CONTRACT_META] as $key) {
        if ($snapshot !== null) $snapshot['meta'][$key] = ['exists'=>metadata_exists('post', $id, $key),'value'=>get_post_meta($id, $key, true)];
    }
    try {
        if (!$id) {
            $inserted = wp_insert_post(['post_type'=>'tio2_market_page','post_status'=>'draft',
                'post_name'=>'tio2-my-market-poland','post_title'=>'TiO2 Malaysia Poland Market'], true);
            if (is_wp_error($inserted) || !is_int($inserted) || $inserted <= 0) throw new RuntimeException('Poland draft creation failed.');
            $id = $inserted;
        } else {
            $updated = wp_update_post(['ID'=>$id,'post_status'=>'draft'], true);
            if (is_wp_error($updated) || $updated !== $id || get_post_status($id) !== 'draft') throw new RuntimeException('Poland draft transition failed.');
        }
        $scope = wp_set_object_terms($id, [(int)$term->term_id], 'site_scope', false);
        if (is_wp_error($scope) || ['tio2-my'] !== wp_get_post_terms($id, 'site_scope', ['fields'=>'slugs'])) throw new RuntimeException('Poland scope storage failed.');
        foreach (['public_path'=>'/markets/poland',TIO2_MY_POLAND_MARKET_CONTRACT_META=>$json] as $key=>$value) {
            // WordPress reports false for a no-op update, so verify actual stored bytes.
            update_post_meta($id, $key, wp_slash($value));
            if (get_post_meta($id, $key, true) !== $value) throw new RuntimeException('Poland content storage failed.');
        }
        if (true !== tio2_validate_market_page_poland_v01_contract($id) || tio2_poland_market_candidate_ids() !== [$id]) throw new RuntimeException('Poland scoped content verification failed.');
        $published = wp_update_post(['ID'=>$id,'post_status'=>'publish'], true);
        if (is_wp_error($published) || $published !== $id || 'publish' !== get_post_status($id)) throw new RuntimeException('Poland local storage publication failed.');
        // Re-read through the same public contract before reporting success.
        tio2_resolve_malaysia_poland_market_record_json();
        return array_merge($result, ['postId'=>$id,'status'=>'publish']);
    } catch (Throwable $failure) {
        $restored = true;
        if (null === $snapshot) {
            if ($id) { wp_delete_post($id, true); $restored = !get_post($id); }
        } else {
            foreach ($snapshot['meta'] as $key=>$entry) {
                if ($entry['exists']) update_post_meta($id, $key, wp_slash($entry['value']));
                else delete_post_meta($id, $key);
                if (metadata_exists('post', $id, $key) !== $entry['exists'] || ($entry['exists'] && get_post_meta($id, $key, true) !== $entry['value'])) $restored = false;
            }
            $scope = wp_set_object_terms($id, $snapshot['scope'], 'site_scope', false);
            if (is_wp_error($scope) || wp_get_post_terms($id, 'site_scope', ['fields'=>'slugs']) !== $snapshot['scope']) $restored = false;
            // WordPress normally rewrites modified timestamps on updates. Preserve the
            // pre-write timestamps only for this record during restoration, then remove the filter.
            $preserve_dates = static function (array $data, array $postarr) use ($id, $snapshot): array {
                if ((int)($postarr['ID'] ?? 0) === $id) foreach (['post_date','post_date_gmt','post_modified','post_modified_gmt'] as $key) {
                    $data[$key] = $snapshot['post'][$key];
                }
                return $data;
            };
            add_filter('wp_insert_post_data', $preserve_dates, PHP_INT_MAX, 2);
            try { $post = wp_update_post(wp_slash($snapshot['post']), true); }
            finally { remove_filter('wp_insert_post_data', $preserve_dates, PHP_INT_MAX); }
            if (is_wp_error($post) || $post !== $id) $restored = false;
            foreach ($snapshot['post'] as $key=>$value) if ($key !== 'ID' && get_post_field($key, $id) !== $value) $restored = false;
        }
        throw new RuntimeException($restored ? 'Poland seed failed; prior content restored. '.$failure->getMessage() : 'Poland seed failed and rollback verification failed; inspect only post '.$id.'.', 0, $failure);
    }
}

echo wp_json_encode(tio2_seed_malaysia_poland_market((string)($args[0] ?? 'Plan'))).PHP_EOL;
