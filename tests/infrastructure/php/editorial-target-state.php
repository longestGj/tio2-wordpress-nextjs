<?php
// Only the task-owned disposable local clone; called explicitly by editorial-targets.spec.ts.
if (!(defined('WP_CLI') && WP_CLI) || wp_get_environment_type() !== 'local' || get_option('tio2_editorial_task_id') !== 'G8-TRADE4-APP5-20260908-01') {
    throw new RuntimeException('Task-owned local WP CLI required.');
}
// This probe needs no webhook or other HTTP side effect: editorial delivery is uncached.
add_filter('pre_http_request', static fn() => new WP_Error('editorial_target_probe', 'Outbound HTTP disabled for this local mutation probe.'), PHP_INT_MAX);
$target=(string)($args[0]??''); $mode=(string)($args[1]??''); $run=(string)($args[2]??'');
$identities=[
    'GRADE-M350'=>['type'=>'tio2_grade','slug'=>'tio2-my-m-350','path'=>'/products/m-350','meta'=>TIO2_MY_PRODUCT_DETAIL_CONTRACT_META],
    'PRODUCT-000'=>['type'=>'tio2_product_hub','slug'=>'tio2-my-products','path'=>'/products','meta'=>TIO2_MY_PRODUCT_HUB_CONTRACT_META],
];
if (!isset($identities[$target]) || !in_array($mode,['Snapshot','Draft','Foreign','Restore'],true) || !preg_match('/^[a-f0-9-]{36}$/D',$run)) throw new RuntimeException('Unknown target, mode or run identity.');
$identity=$identities[$target];
$file='/workspace/.tmp/editorial-target-state-'.$target.'-'.$run.'.json';
function editorial_target_valid(string $target): bool {
    try {
        if ($target==='GRADE-M350') tio2_resolve_malaysia_product_detail_record_json(null,['slug'=>'m-350']);
        else tio2_resolve_malaysia_product_hub_record_json();
        return true;
    } catch (\GraphQL\Error\UserError $error) { return false; }
}
function editorial_target_scopes(int $id): array {
    $scopes=wp_get_post_terms($id,'site_scope',['fields'=>'slugs']);
    if(is_wp_error($scopes)) throw new RuntimeException('Cannot read target scope.');
    sort($scopes);return $scopes;
}
if ($mode==='Snapshot') {
    $ids=get_posts(['post_type'=>$identity['type'],'post_status'=>['publish','draft','pending','private','future','trash'],'name'=>$identity['slug'],'fields'=>'ids','numberposts'=>-1,'suppress_filters'=>false]);
    if(count($ids)!==1) throw new RuntimeException('Unique exact target required.');
    $id=(int)$ids[0];
    if(get_post_meta($id,'public_path',true)!==$identity['path'] || get_post_status($id)!=='publish' || editorial_target_scopes($id)!==['tio2-my'] || !editorial_target_valid($target)) throw new RuntimeException('Published, valid Malaysia target baseline required.');
    $post=get_post($id,ARRAY_A);
    $snapshot=['target'=>$target,'runId'=>$run,'postId'=>$id,'identity'=>$identity,'status'=>$post['post_status'],'scopes'=>editorial_target_scopes($id),'modified'=>$post['post_modified'],'modifiedGmt'=>$post['post_modified_gmt'],'payloadSha256'=>hash('sha256',(string)get_post_meta($id,$identity['meta'],true))];
    $handle=fopen($file,'x');
    if(!$handle) throw new RuntimeException('Snapshot already exists or is unwritable; preserve it for recovery.');
    $json=wp_json_encode($snapshot);
    try {if(fwrite($handle,$json)!==strlen($json)) throw new RuntimeException('Snapshot write failed.');} finally {fclose($handle);}
} else {
    if(!is_file($file)) throw new RuntimeException('Exact run snapshot required before mutation.');
    $snapshot=json_decode((string)file_get_contents($file),true);
    if(!is_array($snapshot) || ($snapshot['target']??null)!==$target || ($snapshot['runId']??null)!==$run || ($snapshot['identity']??null)!==$identity) throw new RuntimeException('Snapshot identity mismatch.');
    $id=(int)$snapshot['postId'];
    if(get_post_type($id)!==$identity['type'] || get_post_field('post_name',$id)!==$identity['slug'] || get_post_meta($id,'public_path',true)!==$identity['path'] || hash('sha256',(string)get_post_meta($id,$identity['meta'],true))!==$snapshot['payloadSha256']) throw new RuntimeException('Target identity/content drift: stop rather than overwrite.');
    if($mode!=='Restore' && (get_post_status($id)!==$snapshot['status'] || editorial_target_scopes($id)!==$snapshot['scopes'])) throw new RuntimeException('Restore the previous mutation before proceeding.');
    if($mode==='Draft') {
        $result=wp_update_post(['ID'=>$id,'post_status'=>'draft'],true);
        if(is_wp_error($result) || get_post_status($id)!=='draft') throw new RuntimeException('Draft mutation failed.');
    } elseif($mode==='Foreign') {
        $foreign=get_term_by('slug','tio2-a','site_scope');
        if(!$foreign || is_wp_error($foreign)) throw new RuntimeException('Existing foreign scope fixture required; no taxonomy creation allowed.');
        $result=wp_set_object_terms($id,[(int)$foreign->term_id],'site_scope');
        if(is_wp_error($result) || editorial_target_scopes($id)!==['tio2-a']) throw new RuntimeException('Foreign-scope mutation failed.');
    } else {
        $term=get_term_by('slug','tio2-my','site_scope');
        if(!$term || is_wp_error($term)) throw new RuntimeException('Original Malaysia scope missing.');
        $result=wp_set_object_terms($id,[(int)$term->term_id],'site_scope');
        if(is_wp_error($result)) throw new RuntimeException('Scope restoration failed.');
        $result=wp_update_post(['ID'=>$id,'post_status'=>$snapshot['status']],true);
        if(is_wp_error($result)) throw new RuntimeException('Status restoration failed.');
        global $wpdb;
        if(false===$wpdb->update($wpdb->posts,['post_modified'=>$snapshot['modified'],'post_modified_gmt'=>$snapshot['modifiedGmt']],['ID'=>$id],['%s','%s'],['%d'])) throw new RuntimeException('Modification-date restoration failed.');
        clean_post_cache($id);
        if(get_post_status($id)!==$snapshot['status'] || editorial_target_scopes($id)!==$snapshot['scopes'] || get_post_field('post_modified',$id)!==$snapshot['modified'] || get_post_field('post_modified_gmt',$id)!==$snapshot['modifiedGmt'] || !editorial_target_valid($target)) throw new RuntimeException('Exact restored target readback failed.');
    }
}
echo wp_json_encode(['target'=>$target,'mode'=>$mode,'postId'=>$id,'resolverValid'=>editorial_target_valid($target),'status'=>get_post_status($id),'scopes'=>editorial_target_scopes($id),'restored'=>$mode==='Restore']);
