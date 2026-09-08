<?php
// Local-only, all-record preflight, create-only/idempotent seed. Never overwrites an existing record.
$mode=(string)($args[0]??'Plan');
if (!in_array($mode,['Plan','Apply'],true) || wp_get_environment_type()!=='local' || get_option('tio2_editorial_task_id')!=='G8-TRADE4-APP5-20260908-01') throw new RuntimeException('Seed requires this task-owned local CMS.');
$term=get_term_by('slug','tio2-my','site_scope');
if (!$term || is_wp_error($term)) throw new RuntimeException('Existing Malaysia scope is required.');
$reviews=json_decode((string)file_get_contents('/workspace/.tmp/editorial-source-reviews.json'),true);
if (!is_array($reviews)) throw new RuntimeException('Dated source review ledger required.');
$plans=[];
// This historical task remains limited to its original nine records.
foreach(['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER'] as $page_id) {
    $json=tio2_editorial_config($page_id); $payload=json_decode($json,true); $identity=tio2_editorial_identity($page_id);
    if (!$identity || is_wp_error(tio2_editorial_validate_payload($page_id,$json))) throw new RuntimeException('Invalid approved source '.$page_id);
    if (!tio2_editorial_review_valid($payload,$reviews[$page_id]??null)) throw new RuntimeException('Missing or expired source review '.$page_id);
    $ids=tio2_editorial_candidates($page_id);
    if (count($ids)>1 || (count($ids)===1 && is_wp_error(tio2_editorial_validate_record($ids[0],$page_id)))) throw new RuntimeException('Occupied invalid editorial identity '.$page_id);
    $plans[]=['pageId'=>$page_id,'existingId'=>$ids[0]??0,'identity'=>$identity,'payloadSha256'=>hash('sha256',$json)];
}
if ($mode==='Plan') {echo wp_json_encode(['mode'=>$mode,'plans'=>$plans]); return;}
$created=[]; $results=[];
try {
    foreach($plans as $plan) {
        $page_id=$plan['pageId']; $id=$plan['existingId']; $payload=json_decode(tio2_editorial_config($page_id),true);
        if (!$id) {
            $id=wp_insert_post(['post_type'=>'tio2_my_editorial','post_name'=>$plan['identity']['slug'],'post_title'=>$payload['heading'],'post_status'=>'draft'],true);
            if (is_wp_error($id)) throw new RuntimeException($id->get_error_message());
            $created[]=$id;
            wp_set_object_terms($id,[(int)$term->term_id],'site_scope');
            update_post_meta($id,'_tio2_editorial_page_id',$page_id);
            update_post_meta($id,'public_path',$plan['identity']['path']);
            update_post_meta($id,TIO2_EDITORIAL_META,wp_slash(tio2_editorial_config($page_id)));
            if ($payload['freshness']) update_post_meta($id,TIO2_EDITORIAL_REVIEW_META,$reviews[$page_id]);
            $published=wp_update_post(['ID'=>$id,'post_status'=>'publish'],true);
            if (is_wp_error($published) || is_wp_error(tio2_editorial_validate_record($id,$page_id))) throw new RuntimeException('Seed verification failed '.$page_id);
        }
        $readback=json_decode(tio2_editorial_resolve(null,['pageId'=>$page_id,'siteScope'=>'tio2-my']),true);
        $results[]=['pageId'=>$page_id,'postId'=>$id,'scope'=>'tio2-my','status'=>$readback['status'],'payloadSha256'=>hash('sha256',$readback['editorialContractJson'])];
    }
    echo wp_json_encode(['mode'=>$mode,'createdIds'=>$created,'records'=>$results]);
} catch(Throwable $error) {
    foreach(array_reverse($created) as $id) {wp_delete_post($id,true); if(get_post($id)) throw new RuntimeException('Rollback deletion failed for newly created record '.$id);}
    throw $error;
}
