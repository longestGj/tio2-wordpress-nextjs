<?php

// Test-only storage mutations, restricted to the uniquely marked disposable CMS.
$mode = (string) ($args[0] ?? '');
$run_id = (string) ($args[1] ?? '');
$callback = (string) getenv('NEXTJS_REVALIDATION_URL_TIO2_MY');
if (!str_starts_with($run_id, 'home-application-') ||
    !str_starts_with($callback, 'http://host.docker.internal:') ||
    !str_ends_with($callback, '/'.$run_id) || get_option('d16_home_application_run') !== $run_id) {
    throw new RuntimeException('Synthetic fixture requires its owned isolated CMS identity.');
}
global $wpdb;
$home_ids = tio2_find_homepage_ids('tio2-my', false);
$app_ids = get_posts(['post_type'=>'tio2_application_hub','name'=>'tio2-my-applications', 'post_status'=>'any','fields'=>'ids','numberposts'=>2]);
$saved = get_option('d16_home_application_records');
if ($mode === 'setup') {
    if (count($home_ids)!==1 || count($app_ids)!==1) throw new RuntimeException('Original records missing.');
    $saved = [];
    foreach (['home'=>(int)$home_ids[0], 'app'=>(int)$app_ids[0]] as $kind=>$id) {
        $key = $kind==='home' ? TIO2_MY_HOMEPAGE_CONTRACT_META : TIO2_MY_APPLICATION_HUB_CONTRACT_META;
        $saved[$kind] = ['id'=>$id,'key'=>$key,'base'=>get_post_meta($id,$key,true),'slug'=>get_post_field('post_name',$id)];
    }
    update_option('d16_home_application_records',$saved,false);
    $grade_ids = get_posts(['post_type'=>'tio2_grade','name'=>'tio2-my-m-350','post_status'=>'publish','fields'=>'ids']);
    if (count($grade_ids)!==1) throw new RuntimeException('Original M350 dependency missing.');
    // Synthetic test state, never a business approval or permission for another environment.
    update_post_meta((int)$grade_ids[0],TIO2_MY_ROUTE_RELEASE_STATE_META,'LIVE_APPROVED');
    echo wp_json_encode(['status'=>'passed','records'=>$saved,'syntheticLiveApprovedGradeId'=>(int)$grade_ids[0]]);
    return;
}
if (!is_array($saved)) throw new RuntimeException('Setup snapshot missing.');
if ($mode === 'readiness') {
    echo wp_json_encode(['homeReady'=>tio2_editorial_homepage_target_ready(),
        'requiredHomeReady'=>tio2_editorial_internal_target_ready(['pageId'=>'HOME-001','resolver'=>'homepage'],'/'),
        'm350Ready'=>tio2_my_product_target_ready('GRADE-M350','/products/m-350/'),
        'm510Ready'=>tio2_my_product_target_ready('GRADE-M510','/products/m-510/')]);
    return;
}
if ($mode === 'restore') {
    $duplicate = get_option('d16_home_application_duplicate');
    if ($duplicate) {wp_delete_post((int)$duplicate,true); delete_option('d16_home_application_duplicate');}
    foreach ($saved as $record) {
        wp_set_object_terms($record['id'],['tio2-my'],'site_scope',false);
        $wpdb->update($wpdb->posts,['post_status'=>'publish','post_name'=>$record['slug']],['ID'=>$record['id']]);
        clean_post_cache($record['id']);
        $current = get_option('d16_home_application_current_'.$record['id'],$record['base']);
        update_post_meta($record['id'],$record['key'],wp_slash($current));
    }
    echo wp_json_encode(['status'=>'restored']); return;
}
if (preg_match('/^(home|app)-round-([12])$/',$mode,$match)) {
    $kind=$match[1]; $round=(int)$match[2]; $record=$saved[$kind]; $id=$record['id'];
    $contract=json_decode($record['base'],true,512,JSON_THROW_ON_ERROR);
    $prefix=$kind==='home'?'Home':'Applications';
    $heading='Runtime '.$prefix.' Round '.$round;
    $body='Runtime '.$prefix.' body round '.$round.'.';
    $contract['seo']['title']='Runtime '.$prefix.' SEO '.$round;
    $contract['seo']['description']='Runtime '.$prefix.' description round '.$round.'.';
    if ($kind==='home') {
        $contract['hero']['heading']=$heading; $contract['hero']['body']=$body;
        if ($round===1) $contract['company']['summaries'][]=['title'=>'Runtime extra home summary','description'=>'Runtime extra company information.'];
    } else {
        $contract['hero']['h1']=$heading; $contract['hero']['intro']=$body;
        $contract['applicationPaths']['heading']='Runtime application paths '.$round;
        if ($round===1) $contract['evaluation']['items'][]=['title'=>'Runtime extra evaluation','body'=>'Runtime extra evaluation body.'];
    }
    $before=(string)get_post_field('post_modified_gmt',$id);
    $save_calls=0;
    add_action('save_post',static function()use(&$save_calls):void{$save_calls++;});
    $json=wp_json_encode($contract);
    if (!update_post_meta($id,$record['key'],wp_slash($json))) throw new RuntimeException('Meta update did not change storage.');
    update_option('d16_home_application_current_'.$id,$json,false);
    $validation=$kind==='home'?tio2_validate_homepage_v04_read_record($id):tio2_validate_application_hub_v01_read_record($id);
    if (is_wp_error($validation) || $save_calls!==0 || $before!==get_post_field('post_modified_gmt',$id)) {
        throw new RuntimeException('Meta-only mutation/read contract failed: '.wp_json_encode([
            'readError'=>is_wp_error($validation)?$validation->get_error_code():null,
            'readMessage'=>is_wp_error($validation)?$validation->get_error_message():null,
            'postStatus'=>get_post_status($id),'writeError'=>get_post_meta($id,'_tio2_homepage_error',true),
            'savePostCalls'=>$save_calls,'modifiedBefore'=>$before,'modifiedAfter'=>get_post_field('post_modified_gmt',$id),
        ]));
    }
    echo wp_json_encode(['status'=>'passed','kind'=>$kind,'round'=>$round,'postId'=>$id,'savePostCalls'=>$save_calls,
        'postModifiedUnchanged'=>true,'heading'=>$heading,'body'=>$body,'contract'=>$contract]);
    return;
}
if (preg_match('/^(home|app)-invalid-(dangerous|relation|scope|unpublished|duplicate)$/',$mode,$match)) {
    $kind=$match[1];$failure=$match[2];$record=$saved[$kind];$id=$record['id'];
    $contract=json_decode((string)get_post_meta($id,$record['key'],true),true,512,JSON_THROW_ON_ERROR);
    if ($failure==='dangerous' || $failure==='relation') {
        if ($failure==='dangerous') $contract['seo']['title']='<script>alert(1)</script>';
        elseif ($kind==='home') $contract['hero']['primaryCta']['href']='/wrong-route/';
        else $contract['applications'][0]['grades'][0]['href']='/wrong-route/';
        update_post_meta($id,$record['key'],wp_slash(wp_json_encode($contract)));
    } elseif ($failure==='scope') {
        if (!term_exists('tio2-b','site_scope')) wp_insert_term('tio2-b','site_scope',['slug'=>'tio2-b']);
        wp_set_object_terms($id,['tio2-b'],'site_scope',false);
        // Keep the sought slug to test scope isolation instead of simply losing the lookup.
        $wpdb->update($wpdb->posts,['post_name'=>$record['slug']],['ID'=>$id]);clean_post_cache($id);
    } elseif ($failure==='unpublished') {
        $wpdb->update($wpdb->posts,['post_status'=>'draft'],['ID'=>$id]);clean_post_cache($id);
    } else {
        $duplicate=wp_insert_post(['post_type'=>$kind==='home'?'tio2_homepage':'tio2_application_hub',
            'post_status'=>'draft','post_title'=>'Owned duplicate negative test','post_name'=>'owned-duplicate'],true);
        if (is_wp_error($duplicate)) throw new RuntimeException('Duplicate setup failed');
        update_option('d16_home_application_duplicate',(int)$duplicate,false);
        wp_set_object_terms((int)$duplicate,['tio2-my'],'site_scope',false);
        update_post_meta((int)$duplicate,'public_path',$kind==='home'?'/':'/applications');
    }
    $validation=$kind==='home'?tio2_validate_homepage_v04_read_record($id):tio2_validate_application_hub_v01_read_record($id);
    if (!is_wp_error($validation)) throw new RuntimeException('Negative record was accepted: '.$mode);
    echo wp_json_encode(['status'=>'rejected','mode'=>$mode,'code'=>$validation->get_error_code(),
        'homeReady'=>tio2_editorial_homepage_target_ready()]);return;
}
throw new RuntimeException('Unknown fixture operation.');
