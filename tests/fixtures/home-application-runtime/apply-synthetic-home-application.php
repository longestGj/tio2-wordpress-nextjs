<?php

// Installed only in the disposable SQL importer snapshot by the rehearsal controller.
if (defined('D16_SYNTHETIC_IMPORT_FIXTURE')) {
    if (!defined('TIO2_CONTENT_ENVIRONMENT_ID') || !str_starts_with(TIO2_CONTENT_ENVIRONMENT_ID,'home-application-')) throw new RuntimeException('Not an isolated importer.');
    if (getenv('D16_CONTENT_ACTION')==='import') {
        foreach (['updated_post_meta','post_updated','transition_post_status'] as $hook) add_action($hook,static function(){throw new RuntimeException('SQL path dispatched a per-record hook.');});
        if (getenv('D16_SYNTHETIC_READBACK')==='1') add_filter('query',static function($sql){
            return str_starts_with($sql,'UPDATE wp_postmeta SET')?str_replace('Bulk Home Round 9','Bulk Corruption Round 9',$sql):$sql;
        });
    }
    return;
}

// Test-only storage mutations, restricted to the uniquely marked disposable CMS.
$mode = (string) ($args[0] ?? '');
$run_id = (string) ($args[1] ?? '');
$approval_id = (string) ($args[2] ?? '');
$callback = (string) getenv('NEXTJS_REVALIDATION_URL_TIO2_MY');
if (!str_starts_with($run_id, 'home-application-') ||
    !str_starts_with($callback, 'http://host.docker.internal:') ||
    !str_ends_with($callback, '/'.$run_id) || get_option('d16_home_application_run') !== $run_id) {
    throw new RuntimeException('Synthetic fixture requires its owned isolated CMS identity.');
}
global $wpdb;
if($mode==='bulk-registry-probe') {
    require_once '/workspace/wordpress/release/registry.php';
    $records=[];
    foreach(d16_content_validators('tio2-my') as $key=>$validator) foreach($wpdb->get_results($wpdb->prepare("SELECT post_id,meta_id,meta_value FROM {$wpdb->postmeta} WHERE meta_key=%s",$key),ARRAY_A) as $row) {
        $post=get_post((int)$row['post_id']);
        if(!$post||$post->post_status!=='publish'||wp_get_post_terms($post->ID,'site_scope',['fields'=>'slugs'])!==['tio2-my'])continue;
        $content=json_decode($row['meta_value'],true);$page=$content['identity']['pageId']??$content['pageId']??$content['page']['page_id']??null;
        try {d16_content_check_record(['postId'=>$post->ID,'metaId'=>(int)$row['meta_id'],'metaKey'=>$key,'validator'=>$validator,'content'=>$content,'json'=>$row['meta_value']],$page);$error=null;}
        catch(Throwable $failure){$error=$failure->getMessage();}
        $records[]=['pageId'=>$page,'postId'=>$post->ID,'slug'=>$post->post_name,'validator'=>$validator,'error'=>$error];
    }
    echo wp_json_encode($records);return;
}
$home_ids = tio2_find_homepage_ids('tio2-my', false);
$app_ids = get_posts(['post_type'=>'tio2_application_hub','name'=>'tio2-my-applications', 'post_status'=>'any','fields'=>'ids','numberposts'=>2]);
$saved = get_option('d16_home_application_records');
if ($mode === 'setup') {
    if (count($home_ids)!==1 || count($app_ids)!==1) throw new RuntimeException('Original records missing.');
    $saved = [];
    foreach (['home'=>(int)$home_ids[0], 'app'=>(int)$app_ids[0]] as $kind=>$id) {
        $key = $kind==='home' ? TIO2_MY_HOMEPAGE_CONTRACT_META : TIO2_MY_APPLICATION_HUB_CONTRACT_META;
        $saved[$kind] = ['id'=>$id,'key'=>$key,'base'=>get_post_meta($id,$key,true),'slug'=>get_post_field('post_name',$id)];
        update_option('d16_home_application_current_'.$id,$saved[$kind]['base'],false);
    }
    update_option('d16_home_application_records',$saved,false);
    $grade_ids = get_posts(['post_type'=>'tio2_grade','name'=>'tio2-my-m-350','post_status'=>'publish','fields'=>'ids']);
    // Synthetic test state, never a business approval or permission for another environment.
    if (count($grade_ids)===1) update_post_meta((int)$grade_ids[0],TIO2_MY_ROUTE_RELEASE_STATE_META,'LIVE_APPROVED');
    echo wp_json_encode(['status'=>'passed','records'=>$saved,'syntheticLiveApprovedGradeId'=>$grade_ids?(int)$grade_ids[0]:null]);
    return;
}
if (!is_array($saved)) throw new RuntimeException('Setup snapshot missing.');
function fixture_snapshot(array $record): array {
    global $wpdb;
    return ['json'=>(string)$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE post_id=%d AND meta_key=%s",$record['id'],$record['key'])),
        'slug'=>(string)$wpdb->get_var($wpdb->prepare("SELECT post_name FROM {$wpdb->posts} WHERE ID=%d",$record['id'])),
        'type'=>(string)$wpdb->get_var($wpdb->prepare("SELECT post_type FROM {$wpdb->posts} WHERE ID=%d",$record['id'])),
        'status'=>(string)$wpdb->get_var($wpdb->prepare("SELECT post_status FROM {$wpdb->posts} WHERE ID=%d",$record['id']))];
}
if (preg_match('/^publish-(home|app)$/',$mode,$match)) {
    $kind=$match[1]; $record=$saved[$kind]; $before=fixture_snapshot($record);
    if(!$approval_id) {
        $draft=json_decode($before['json'],true);$draft['seo']['description']='Synthetic technically valid saved draft.';
        $draft_json=wp_json_encode($draft);
        $saved_draft=wp_update_post(['ID'=>$record['id'],'post_title'=>'Synthetic valid draft '.$kind,'meta_input'=>[$record['key']=>wp_slash($draft_json)]],true);
        $actual=fixture_snapshot($record);
        if(is_wp_error($saved_draft)||$actual['json']!==$draft_json||$actual['status']!=='draft'||$actual['slug']!==$before['slug']||$actual['type']!==$before['type']) {
            throw new RuntimeException('Valid draft save failed identity/content preservation: '.wp_json_encode(['beforeSlug'=>$before['slug'],'afterSlug'=>$actual['slug'],'beforeType'=>$before['type'],'afterType'=>$actual['type'],'status'=>$actual['status'],'contentSaved'=>$actual['json']===$draft_json]));
        }
        $before=$actual;
        wp_update_post(['ID'=>$record['id'],'post_type'=>'post'],true);
        if(fixture_snapshot($record)!==$before) throw new RuntimeException('Draft type change bypassed fixed content identity.');
    }
    $rejected=wp_update_post(['ID'=>$record['id'],'post_status'=>'publish'],true);
    if (fixture_snapshot($record)!==$before || $before['status']!=='draft') throw new RuntimeException('Unapproved publication was not rejected unchanged.');
    $public_read=$kind==='home'?tio2_validate_homepage_v04_read_record($record['id']):tio2_validate_application_hub_v01_read_record($record['id']);
    if(!is_wp_error($public_read)) throw new RuntimeException('Unapproved draft was publicly readable.');
    $page=$kind==='home'?'HOME-001':'APP-000';
    if (!$approval_id) {
        echo wp_json_encode(['pageId'=>$page,'locale'=>'en','beforeSha256'=>tio2_content_digest($before['json']),'afterSha256'=>tio2_content_digest($before['json'])]); return;
    }
    $result=tio2_apply_approved_content($approval_id,'publish-draft',[['pageId'=>$page,'content'=>$before['json']]]);
    if(is_wp_error($result)) throw new RuntimeException($result->get_error_code().': '.wp_json_encode([
        'post'=>get_post($record['id']),'scopes'=>wp_get_post_terms($record['id'],'site_scope',['fields'=>'slugs']),
        'schema'=>get_post_meta($record['id'],'homepage_schema_version',false),'keys'=>array_keys(get_post_meta($record['id'])),
        'scopeRows'=>$wpdb->get_results("SELECT term_id,slug FROM {$wpdb->terms} WHERE slug='tio2-my'",ARRAY_A),
        'homepageRows'=>$wpdb->get_results("SELECT ID,post_name,post_status FROM {$wpdb->posts} WHERE post_type='tio2_homepage'",ARRAY_A)]));
    echo wp_json_encode(['draftSaved'=>true,'unapprovedPublishRejected'=>true,'unapprovedApiReturn'=>is_wp_error($rejected)?$rejected->get_error_code():$rejected,
        'unapprovedPublicReadRejected'=>true,'unapprovedJsonStatusUnchanged'=>true,'approvedPublish'=>get_post_status($record['id'])==='publish','receipt'=>$result]);return;
}
if ($mode==='retry') {
    $writes=0; add_action('updated_post_meta',static function()use(&$writes){$writes++;});
    $before=array_map('fixture_snapshot',$saved);
    $result=tio2_retry_approved_content_events($approval_id);
    $persisted=maybe_unserialize($wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",'tio2_content_event_'.$approval_id)));
    echo wp_json_encode(['receipt'=>is_wp_error($result)?['error'=>$result->get_error_code()]:$result,'metaWrites'=>$writes,'unchanged'=>$before===array_map('fixture_snapshot',$saved),
        'persistedNotificationState'=>$persisted['notificationState']??null,'persistedAttempts'=>$persisted['attempts']??[]]);return;
}
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
        $wpdb->update($wpdb->postmeta,['meta_value'=>$current],['post_id'=>$record['id'],'meta_key'=>$record['key']]);
        clean_post_cache($record['id']);
    }
    echo wp_json_encode(['status'=>'restored']); return;
}
if (preg_match('/^(prepare-)?(home|app)-round-([12])(?:-(raw|readback|tamper|dangerous))?$/',$mode,$match)) {
    $kind=$match[2]; $round=(int)$match[3]; $record=$saved[$kind]; $id=$record['id'];
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
    if (($match[4]??'')==='dangerous') $contract['seo']['title']='<script>unsafe</script>';
    $json=wp_json_encode($contract);
    $snapshot=fixture_snapshot($record);
    if ($match[1]) {
        echo wp_json_encode(['content'=>$contract,'pageId'=>$kind==='home'?'HOME-001':'APP-000','locale'=>'en',
            'beforeSha256'=>tio2_content_digest($snapshot['json']),'afterSha256'=>tio2_content_digest($json)]);return;
    }
    if (($match[4]??'')==='tamper') {$contract['seo']['title'].=' tampered';$json=wp_json_encode($contract);}
    $before=(string)get_post_field('post_modified_gmt',$id);
    $save_calls=0;
    add_action('save_post',static function()use(&$save_calls):void{$save_calls++;});
    if (($match[4]??'')==='raw') {
        $result=update_post_meta($id,$record['key'],wp_slash($json));
        echo wp_json_encode(['rejected'=>$result===false,'unchanged'=>$snapshot===fixture_snapshot($record),
            'oldSummaryCount'=>count(json_decode($snapshot['json'],true)['company']['summaries']??[]),'candidateSummaryCount'=>count($contract['company']['summaries']??[])]);return;
    }
    if (($match[4]??'')==='readback') {
        add_action('updated_post_meta',static function($meta_id,$post_id,$key)use($record){
            global $wpdb;
            if($post_id===$record['id']&&$key===$record['key']) $wpdb->update($wpdb->postmeta,['meta_value'=>'{}'],['meta_id'=>$meta_id]);
        },99,3);
    }
    $result=tio2_apply_approved_content($approval_id,'update-published',[['pageId'=>$kind==='home'?'HOME-001':'APP-000','content'=>$json]]);
    if(is_wp_error($result)) {
        echo wp_json_encode(['status'=>'rejected','error'=>$result->get_error_code(),'unchanged'=>$snapshot===fixture_snapshot($record),'savePostCalls'=>$save_calls]);return;
    }
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
    $persisted=maybe_unserialize($wpdb->get_var($wpdb->prepare("SELECT option_value FROM {$wpdb->options} WHERE option_name=%s",'tio2_content_event_'.($result['receiptId']??''))));
    echo wp_json_encode(['status'=>'passed','kind'=>$kind,'round'=>$round,'postId'=>$id,'savePostCalls'=>$save_calls,
        'postModifiedUnchanged'=>true,'heading'=>$heading,'body'=>$body,'contract'=>$contract,'receipt'=>$result,'persistedNotificationState'=>$persisted['notificationState']??null]);
    return;
}
if (preg_match('/^(home|app)-invalid-(dangerous|relation|scope|unpublished|duplicate)$/',$mode,$match)) {
    $kind=$match[1];$failure=$match[2];$record=$saved[$kind];$id=$record['id'];
    $contract=json_decode((string)get_post_meta($id,$record['key'],true),true,512,JSON_THROW_ON_ERROR);
    if ($failure==='dangerous' || $failure==='relation') {
        if ($failure==='dangerous') $contract['seo']['title']='<script>alert(1)</script>';
        elseif ($kind==='home') $contract['hero']['primaryCta']['href']='/wrong-route/';
        else $contract['applications'][0]['grades'][0]['href']='/wrong-route/';
        // Deliberate stored-corruption read defense, separate from guarded API refusals.
        $wpdb->update($wpdb->postmeta,['meta_value'=>wp_json_encode($contract)],['post_id'=>$id,'meta_key'=>$record['key']]);
        clean_post_cache($id);
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
        // Ordinary homepage term hooks reconcile a duplicate away. This case is
        // deliberately stored corruption, so install the actual conflicting row
        // after those hooks, just like the direct SQL corruptions above.
        $scope=get_term_by('slug','tio2-my','site_scope');
        if(!$scope||$wpdb->replace($wpdb->term_relationships,['object_id'=>(int)$duplicate,'term_taxonomy_id'=>(int)$scope->term_taxonomy_id],['%d','%d'])===false)throw new RuntimeException('Duplicate corruption setup failed');
        clean_object_term_cache((int)$duplicate,get_post_type((int)$duplicate));clean_post_cache((int)$duplicate);
        if(wp_get_post_terms((int)$duplicate,'site_scope',['fields'=>'slugs'])!==['tio2-my'])throw new RuntimeException('Duplicate stored scope was not installed');
    }
    $validation=$kind==='home'?tio2_validate_homepage_v04_read_record($id):tio2_validate_application_hub_v01_read_record($id);
    if (!is_wp_error($validation)) throw new RuntimeException('Negative record was accepted: '.$mode);
    echo wp_json_encode(['status'=>'rejected','mode'=>$mode,'code'=>$validation->get_error_code(),
        'homeReady'=>tio2_editorial_homepage_target_ready()]);return;
}
throw new RuntimeException('Unknown fixture operation.');
