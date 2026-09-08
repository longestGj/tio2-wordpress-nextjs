<?php
// WP-CLI eval-file prepends evaluation context; do not add strict_types here.

// wp eval-file .../apply-tio2-my-market-brazil-pt.php [Plan|Apply]
function tio2_seed_malaysia_brazil_pt_market(string $mode = 'Plan'): array
{
    if (!in_array($mode, ['Plan','Apply'], true)) throw new RuntimeException('Use Plan or Apply.');
    if (!function_exists('wp_get_environment_type') || 'local' !== wp_get_environment_type() ||
        !function_exists('tio2_validate_market_page_brazil_pt_v02_contract')) {
        throw new RuntimeException('Brazil Portuguese seed requires the project plugin and an explicit local WordPress environment.');
    }
    $term = get_term_by('slug', 'tio2-my', 'site_scope');
    if (!$term || is_wp_error($term)) throw new RuntimeException('Existing tio2-my site_scope term is required.');
    $file = dirname(__DIR__).'/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json';
    $json = is_readable($file) ? file_get_contents($file) : false;
    if (true !== tio2_validate_brazil_pt_market_payload($json)) throw new RuntimeException('Missing or invalid approved Brazil Portuguese payload.');
    $ids = tio2_brazil_pt_market_candidate_ids();
    if (count($ids) > 1) throw new RuntimeException('Multiple Brazil Portuguese slug/path owners exist; no records changed.');
    $id = $ids[0] ?? 0;
    if ($id && true !== tio2_validate_brazil_pt_market_identity($id)) throw new RuntimeException('Existing Brazil Portuguese owner has a foreign or incomplete identity.');
    $result = ['mode'=>$mode,'operation'=>$id?'update':'create','postId'=>$id?:null,'siteScope'=>'tio2-my',
        'pageId'=>'MARKET-BR-PT','publicPath'=>'/pt-br/markets/brazil','payloadSha256'=>hash('sha256', $json),'releaseEnabled'=>false];
    if ('Plan' === $mode) return $result;

    $snapshot = $id ? ['post'=>['ID'=>$id,'post_status'=>get_post_status($id),'post_name'=>get_post_field('post_name',$id),
        'post_title'=>get_post_field('post_title',$id)],'scope'=>wp_get_post_terms($id,'site_scope',['fields'=>'slugs']),'meta'=>[]] : null;
    if ($snapshot !== null) foreach (['public_path',TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META] as $key) {
        $snapshot['meta'][$key] = ['exists'=>metadata_exists('post',$id,$key),'value'=>get_post_meta($id,$key,true)];
    }
    try {
        if (!$id) {
            $created = wp_insert_post(['post_type'=>'tio2_market_page','post_status'=>'draft','post_name'=>'tio2-my-market-brazil-pt','post_title'=>'TiO2 Malaysia Brazil Portuguese Market'], true);
            if (is_wp_error($created) || !is_int($created) || $created <= 0) throw new RuntimeException('Brazil Portuguese draft creation failed.');
            $id = $created;
        } else {
            $updated = wp_update_post(['ID'=>$id,'post_status'=>'draft'], true);
            if (is_wp_error($updated) || $updated !== $id) throw new RuntimeException('Brazil Portuguese draft transition failed.');
        }
        $scope = wp_set_object_terms($id, [(int)$term->term_id], 'site_scope', false);
        if (is_wp_error($scope) || ['tio2-my'] !== wp_get_post_terms($id,'site_scope',['fields'=>'slugs'])) throw new RuntimeException('Brazil Portuguese scope storage failed.');
        foreach (['public_path'=>'/pt-br/markets/brazil',TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META=>$json] as $key=>$value) {
            update_post_meta($id,$key,wp_slash($value));
            if (get_post_meta($id,$key,true) !== $value) throw new RuntimeException('Brazil Portuguese content storage failed.');
        }
        if (true !== tio2_validate_market_page_brazil_pt_v02_contract($id) || tio2_brazil_pt_market_candidate_ids() !== [$id]) throw new RuntimeException('Brazil Portuguese verification failed.');
        $published = wp_update_post(['ID'=>$id,'post_status'=>'publish'], true);
        if (is_wp_error($published) || $published !== $id || 'publish' !== get_post_status($id)) throw new RuntimeException('Brazil Portuguese local publication failed.');
        tio2_resolve_malaysia_brazil_pt_market_record_json();
        return array_merge($result, ['postId'=>$id,'status'=>'publish']);
    } catch (Throwable $failure) {
        $restored = true;
        if ($snapshot === null) {
            if ($id) { wp_delete_post($id, true); $restored = !get_post($id); }
        } else {
            foreach ($snapshot['meta'] as $key=>$entry) {
                if ($entry['exists']) update_post_meta($id,$key,wp_slash($entry['value'])); else delete_post_meta($id,$key);
                if (metadata_exists('post',$id,$key) !== $entry['exists'] || ($entry['exists'] && get_post_meta($id,$key,true) !== $entry['value'])) $restored = false;
            }
            $scope = wp_set_object_terms($id,$snapshot['scope'],'site_scope',false);
            $post = wp_update_post(wp_slash($snapshot['post']), true);
            if (is_wp_error($scope) || is_wp_error($post) || $post !== $id) $restored = false;
        }
        throw new RuntimeException($restored ? 'Brazil Portuguese seed failed; prior content restored. '.$failure->getMessage() : 'Brazil Portuguese seed failed and rollback verification failed; inspect only post '.$id.'.', 0, $failure);
    }
}

echo wp_json_encode(tio2_seed_malaysia_brazil_pt_market((string)($args[0] ?? 'Plan'))).PHP_EOL;
