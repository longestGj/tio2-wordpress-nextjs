<?php
// WP-CLI eval-file prepends evaluation context; do not add strict_types here.

// wp eval-file .../apply-tio2-my-product-process-chloride.php [Plan|Apply]
function tio2_seed_malaysia_chloride_process(string $mode = 'Plan'): array
{
    if (!in_array($mode,['Plan','Apply'],true)) throw new RuntimeException('Use Plan or Apply.');
    if (!function_exists('wp_get_environment_type') || 'local' !== wp_get_environment_type() ||
        !function_exists('tio2_validate_product_process_chloride_v01_contract')) {
        throw new RuntimeException('Chloride Process seed requires the project plugin and an explicit local WordPress environment.');
    }
    $term=get_term_by('slug','tio2-my','site_scope');
    if (!$term||is_wp_error($term)) throw new RuntimeException('Existing tio2-my site_scope term is required.');
    $file=dirname(__DIR__).'/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json';
    $json=is_readable($file)?file_get_contents($file):false;
    if (true!==tio2_validate_chloride_process_payload($json)) throw new RuntimeException('Missing or invalid approved Chloride Process payload.');
    $ids=tio2_chloride_process_candidate_ids();
    if (count($ids)>1) throw new RuntimeException('Multiple Chloride Process slug/path owners exist; no records changed.');
    $id=$ids[0]??0;
    if ($id&&true!==tio2_validate_chloride_process_identity($id)) throw new RuntimeException('Existing Chloride Process owner has a foreign or incomplete identity.');
    $result=['mode'=>$mode,'operation'=>$id?'update':'create','postId'=>$id?:null,'siteScope'=>'tio2-my','pageId'=>'PRODUCT-PROC-CL',
        'publicPath'=>'/products/chloride-process-titanium-dioxide','payloadSha256'=>hash('sha256',$json),'releaseEnabled'=>false];
    if ('Plan'===$mode) return $result;
    $snapshot=$id?['post'=>['ID'=>$id,'post_status'=>get_post_status($id),'post_name'=>get_post_field('post_name',$id),'post_title'=>get_post_field('post_title',$id)],
        'scope'=>wp_get_post_terms($id,'site_scope',['fields'=>'slugs']),'meta'=>[]]:null;
    if ($snapshot!==null) foreach (['public_path',TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META] as $key) $snapshot['meta'][$key]=['exists'=>metadata_exists('post',$id,$key),'value'=>get_post_meta($id,$key,true)];
    try {
        if (!$id) {
            $created=wp_insert_post(['post_type'=>'tio2_product_hub','post_status'=>'draft','post_name'=>'tio2-my-product-process-chloride','post_title'=>'TiO2 Malaysia Chloride Process'],true);
            if (is_wp_error($created)||!is_int($created)||$created<=0) throw new RuntimeException('Chloride Process draft creation failed.');
            $id=$created;
        } else {
            $updated=wp_update_post(['ID'=>$id,'post_status'=>'draft'],true);
            if (is_wp_error($updated)||$updated!==$id) throw new RuntimeException('Chloride Process draft transition failed.');
        }
        $scope=wp_set_object_terms($id,[(int)$term->term_id],'site_scope',false);
        if (is_wp_error($scope)||['tio2-my']!==wp_get_post_terms($id,'site_scope',['fields'=>'slugs'])) throw new RuntimeException('Chloride Process scope storage failed.');
        foreach (['public_path'=>'/products/chloride-process-titanium-dioxide',TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META=>$json] as $key=>$value) {
            update_post_meta($id,$key,wp_slash($value));
            if (get_post_meta($id,$key,true)!==$value) throw new RuntimeException('Chloride Process content storage failed.');
        }
        if (true!==tio2_validate_product_process_chloride_v01_contract($id)||tio2_chloride_process_candidate_ids()!==[$id]) throw new RuntimeException('Chloride Process verification failed.');
        $published=wp_update_post(['ID'=>$id,'post_status'=>'publish'],true);
        if (is_wp_error($published)||$published!==$id||'publish'!==get_post_status($id)) throw new RuntimeException('Chloride Process local publication failed.');
        tio2_resolve_malaysia_chloride_process_record_json();
        return array_merge($result,['postId'=>$id,'status'=>'publish']);
    } catch (Throwable $failure) {
        $restored=true;
        if ($snapshot===null) {
            if ($id) {wp_delete_post($id,true);$restored=!get_post($id);}
        } else {
            foreach ($snapshot['meta'] as $key=>$entry) {
                if ($entry['exists']) update_post_meta($id,$key,wp_slash($entry['value'])); else delete_post_meta($id,$key);
                if (metadata_exists('post',$id,$key)!==$entry['exists']||($entry['exists']&&get_post_meta($id,$key,true)!==$entry['value'])) $restored=false;
            }
            $scope=wp_set_object_terms($id,$snapshot['scope'],'site_scope',false);
            $post=wp_update_post(wp_slash($snapshot['post']),true);
            if (is_wp_error($scope)||is_wp_error($post)||$post!==$id) $restored=false;
        }
        throw new RuntimeException($restored?'Chloride Process seed failed; prior content restored. '.$failure->getMessage():'Chloride Process seed failed and rollback verification failed; inspect only post '.$id.'.',0,$failure);
    }
}

echo wp_json_encode(tio2_seed_malaysia_chloride_process((string)($args[0]??'Plan'))).PHP_EOL;
