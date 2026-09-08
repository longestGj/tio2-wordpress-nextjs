<?php
// Bounded mutation probe for this task's disposable local database only.
if (wp_get_environment_type()!=='local' || get_option('tio2_editorial_task_id')!=='G8-TRADE4-APP5-20260908-01') throw new RuntimeException('Task-owned local CMS required.');
$page_id=(string)($args[0]??'');$mode=(string)($args[1]??'');
if (!in_array($page_id,tio2_editorial_ids(),true)) throw new RuntimeException('Unknown Page ID.');
$file='/workspace/.tmp/editorial-state-'.$page_id.'.json';
if ($mode==='Snapshot') {
    $ids=tio2_editorial_candidates($page_id);if(count($ids)!==1) throw new RuntimeException('Expected unique record.');
    $id=$ids[0];$snapshot=['id'=>$id,'post'=>get_post($id,ARRAY_A),'scope'=>wp_get_post_terms($id,'site_scope',['fields'=>'slugs']),
        'payload'=>get_post_meta($id,TIO2_EDITORIAL_META,true),'review'=>get_post_meta($id,TIO2_EDITORIAL_REVIEW_META,true),'duplicateId'=>0];
    file_put_contents($file,wp_json_encode($snapshot));echo wp_json_encode(['pageId'=>$page_id,'mode'=>$mode,'postId'=>$id]);return;
}
if (!is_file($file)) throw new RuntimeException('Snapshot required.');
$snapshot=json_decode((string)file_get_contents($file),true);$id=(int)$snapshot['id'];
switch($mode) {
 case 'Draft':wp_update_post(['ID'=>$id,'post_status'=>'draft']);break;
 case 'Foreign':wp_set_object_terms($id,['tio2-a'],'site_scope');break;
 case 'Multi':wp_set_object_terms($id,['tio2-my','tio2-b'],'site_scope');break;
 case 'MissingScope':wp_set_object_terms($id,[],'site_scope');break;
 case 'Malformed':update_post_meta($id,TIO2_EDITORIAL_META,'{"invalid":true}');break;
 case 'Withdraw':$review=$snapshot['review'];$review['status']='withdrawn';update_post_meta($id,TIO2_EDITORIAL_REVIEW_META,$review);break;
 case 'Pending':$review=$snapshot['review'];$review['eventStatus']='event_pending';update_post_meta($id,TIO2_EDITORIAL_REVIEW_META,$review);break;
 case 'Expired':$review=$snapshot['review'];$review['nextReviewDue']='2026-09-01';update_post_meta($id,TIO2_EDITORIAL_REVIEW_META,$review);break;
 case 'Duplicate':
    $duplicate=wp_insert_post(['post_type'=>'tio2_my_editorial','post_name'=>'editorial-test-duplicate-'.strtolower($page_id),'post_status'=>'draft','post_title'=>'Disposable local duplicate'],true);
    if(is_wp_error($duplicate))throw new RuntimeException('Duplicate probe failed.');
    update_post_meta($duplicate,'public_path',tio2_editorial_identity($page_id)['path']);wp_set_object_terms($duplicate,['tio2-my'],'site_scope');
    $snapshot['duplicateId']=$duplicate;file_put_contents($file,wp_json_encode($snapshot));break;
 case 'Restore':
    if($snapshot['duplicateId']) {wp_delete_post((int)$snapshot['duplicateId'],true);if(get_post((int)$snapshot['duplicateId']))throw new RuntimeException('Duplicate not removed.');$snapshot['duplicateId']=0;file_put_contents($file,wp_json_encode($snapshot));}
    update_post_meta($id,TIO2_EDITORIAL_META,wp_slash($snapshot['payload']));update_post_meta($id,TIO2_EDITORIAL_REVIEW_META,$snapshot['review']);
    wp_set_object_terms($id,$snapshot['scope'],'site_scope');wp_update_post(['ID'=>$id,'post_status'=>$snapshot['post']['post_status']]);
    if(is_wp_error(tio2_editorial_validate_record($id,$page_id)))throw new RuntimeException('Restore verification failed.');break;
 default:throw new RuntimeException('Unsupported local probe mode.');
}
$valid=true;try {tio2_editorial_resolve(null,['pageId'=>$page_id,'siteScope'=>'tio2-my']);} catch(\GraphQL\Error\UserError $error){$valid=false;}
echo wp_json_encode(['pageId'=>$page_id,'mode'=>$mode,'postId'=>$id,'resolverValid'=>$valid,'duplicateId'=>$snapshot['duplicateId']]);
