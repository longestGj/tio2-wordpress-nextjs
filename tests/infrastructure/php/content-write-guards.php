<?php
// SYNTHETIC TEST ONLY: real WordPress APIs and owned disposable InnoDB database.
if (($argv[1] ?? '') === 'proofs') {
    $input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    foreach ($input['proofs'] as $proof) file_put_contents('/approvals/'.$proof['approvalId'].'.json', json_encode($proof));
    file_put_contents('/approvals/fixtures.json', json_encode($input));
    file_put_contents('/approvals/request.json', json_encode([['pageId'=>'HOME-001','content'=>json_encode($input['changed'])]]));
    exit;
}
$mode = $args[0];
define('TIO2_CONTENT_APPROVAL_ROOT', '/approvals');
define('TIO2_CONTENT_WRITER_UID', 33);
define('TIO2_CONTENT_ENVIRONMENT_ID', $args[1]);
global $fixture;
$fixture = json_decode(file_get_contents('/approvals/fixtures.json'), true);
function guards_json($value) { return wp_json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function guards_home() { return (int) get_option('synthetic_guard_home'); }
function guards_snapshot($id) { clean_post_cache($id); return [get_post_meta($id, TIO2_MY_HOMEPAGE_CONTRACT_META, true),get_post_status($id)]; }
function guards_apply($proof = 'synthetic-home') { global $fixture; return tio2_apply_approved_content($proof,'update-published',[['pageId'=>'HOME-001','content'=>guards_json($fixture['changed'])]]); }
global $wpdb;
if ($mode === 'cli' || $mode === 'cli-noactor') {
    if($mode==='cli-noactor') wp_set_current_user(0);
    $args=['synthetic-home','update-published','/approvals/request.json'];
    require '/workspace/wordpress/approved-write.php'; return;
}
if ($mode === 'seeds') {
    $out=[];
    foreach (['homepage'=>'home','application-hub'=>'app'] as $seed=>$key) {
        $args=['--initialize-draft']; ob_start(); include '/workspace/wordpress/seed/apply-tio2-my-'.$seed.'.php'; $created=json_decode(ob_get_clean(),true);
        $seed_id=$created['postId']; update_option('synthetic_guard_'.$key,$seed_id);
        $out[$key.'Draft']=get_post_status($seed_id)==='draft';
        if($key==='home') $out['noNewFooter']=!property_exists(json_decode(get_post_meta($seed_id,TIO2_MY_HOMEPAGE_CONTRACT_META,true)),'footer');
        $before=get_post_meta($seed_id); $args=[]; $rejected=false;
        try { include '/workspace/wordpress/seed/apply-tio2-my-'.$seed.'.php'; } catch(Throwable $error) { $rejected=true; }
        $out[$key.'RejectedBeforeMutation']=$rejected&&get_post_meta($seed_id)===$before&&get_post_status($seed_id)==='draft';
    }
    echo guards_json($out); return;
}
if ($mode === 'setup') {
    update_option('synthetic_race_ready',0);
    foreach (['tio2-my','tio2-a','tio2-b'] as $scope) if (!term_exists($scope,'site_scope')) wp_insert_term($scope,'site_scope',['slug'=>$scope]);
    foreach (['a'=>['post','tio2-a'],'b'=>['post','tio2-b'],'other'=>['tio2_faq','tio2-my']] as $key=>$identity) {
        $other=(int)get_option('synthetic_guard_'.$key);
        if(!$other) { $other=wp_insert_post(['post_type'=>$identity[0],'post_status'=>'draft','post_title'=>'Synthetic independent '.$key]); update_option('synthetic_guard_'.$key,$other); wp_set_object_terms($other,[$identity[1]],'site_scope'); }
        update_post_meta($other,'synthetic_independent','before');
    }
    foreach (['home'=>['tio2_homepage','tio2-my--homepage',TIO2_MY_HOMEPAGE_CONTRACT_META], 'app'=>['tio2_application_hub','tio2-my-applications',TIO2_MY_APPLICATION_HUB_CONTRACT_META]] as $key=>$def) {
        $id=(int)get_option('synthetic_guard_'.$key);
        if (!$id) { $id=wp_insert_post(['post_type'=>$def[0],'post_status'=>'draft','post_title'=>'Synthetic test '.$key]); update_option('synthetic_guard_'.$key,$id); }
        // Historical installed baseline; SQL is test setup only, never an approval path.
        $wpdb->update($wpdb->posts,['post_status'=>'draft','post_name'=>$def[1]],['ID'=>$id]); clean_post_cache($id);
        wp_set_object_terms($id,['tio2-my'],'site_scope');
        foreach ([$def[2]=>guards_json($fixture[$key]), 'homepage_schema_version'=>'homepage-v0.4-malaysia','public_path'=>$key==='home'?'/':'/applications'] as $meta=>$value) {
            $wpdb->delete($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta]); $wpdb->insert($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta,'meta_value'=>$value]);
        }
        $wpdb->update($wpdb->posts,['post_status'=>'publish','post_name'=>$def[1]],['ID'=>$id]); clean_post_cache($id);
    }
    $GLOBALS['tio2_webhook_queue']=[]; echo '{}'; return;
}
$id=guards_home(); $meta=TIO2_MY_HOMEPAGE_CONTRACT_META; $baseline=guards_snapshot($id);
if ($mode === 'ordinary-save') {
    $GLOBALS['tio2_webhook_queue']=[];
    $title=get_post_field('post_title',$id);
    $candidate=wp_slash(guards_json($fixture['changed']));
    $r=wp_update_post(['ID'=>$id,'post_title'=>'Rejected title','meta_input'=>[$meta=>$candidate]],true);
    $out['apiRejected']=is_wp_error($r)&&$r->get_error_code()==='empty_content';
    $r=wp_update_post(['ID'=>$id,'post_title'=>'Rejected title','meta_input'=>[$meta=>$candidate]]);
    $out['defaultRejected']=$r===0;
    $controller=new WP_REST_Posts_Controller('tio2_homepage');
    $request=new WP_REST_Request('PUT','/wp/v2/tio2_homepage/'.$id);
    $request->set_param('id',$id); $request->set_param('title','Rejected REST title'); $request->set_param('meta',[$meta=>guards_json($fixture['changed'])]);
    $r=$controller->update_item($request);
    $out['restRejected']=is_wp_error($r)&&$r->get_error_code()==='approval_required'&&$r->get_error_data()['status']===403;
    $request->set_param('meta',[$meta=>'{}']); $r=$controller->update_item($request);
    $out['restSchemaRejected']=is_wp_error($r)&&$r->get_error_code()==='write_schema'&&$r->get_error_data()['status']===400;
    $out['unchanged']=guards_snapshot($id)===$baseline&&get_post_field('post_title',$id)===$title;
    $out['noEvents']=$GLOBALS['tio2_webhook_queue']===[];
    $GLOBALS['tio2_webhook_queue']=[];
    wp_update_post(['ID'=>$id,'meta_input'=>[$meta=>wp_slash($baseline[0])]],true);
    $out['noOpNoEvents']=$GLOBALS['tio2_webhook_queue']===[];
    // Already-published update: the event must come from real metadata hooks,
    // not a draft->publish transition masking a lost metadata notification.
    $r=guards_apply();
    $out['approvedMetaEvent']=!is_wp_error($r)&&$r['committed']&&isset($r['events'][$id]);
    wp_update_post(['ID'=>$id,'post_status'=>'draft'],true);
    $out['withdrawEvent']=get_post_status($id)==='draft'&&isset($GLOBALS['tio2_webhook_queue'][$id]);
    $GLOBALS['tio2_webhook_queue']=[];
    $r=wp_update_post(['ID'=>$id,'meta_input'=>[$meta=>wp_slash($baseline[0])]],true);
    $out['draftSaveAccepted']=$r===$id&&get_post_meta($id,$meta,true)===$baseline[0];
    echo guards_json($out); return;
}
if ($mode === 'self-review') {
    $pointer=get_post_meta($id,'_homepage_schema_version',true);
    update_post_meta($id,'_homepage_schema_version','field_unapproved_pointer');
    $out['acfReferenceProtected']=get_post_meta($id,'_homepage_schema_version',true)===$pointer&&guards_snapshot($id)===$baseline;
    $wpdb->update($wpdb->postmeta,['meta_value'=>$pointer],['post_id'=>$id,'meta_key'=>'_homepage_schema_version']);
    clean_post_cache($id); acf_flush_value_cache($id);
    wp_update_post(['ID'=>$id,'post_status'=>'draft']); $GLOBALS['tio2_webhook_queue']=[];
    $records=[['pageId'=>'HOME-001','content'=>json_encode($fixture['home'],JSON_PRETTY_PRINT)]];
    $before_cache=wp_suspend_cache_addition();
    $r=tio2_apply_approved_content('synthetic-noop-draft','publish-draft',$records);
    $out['noopDraftPublished']=!is_wp_error($r)&&$r['committed']&&get_post_status($id)==='publish';
    $out['noopMetaPreserved']=get_post_meta($id,$meta,true)===$baseline[0];
    $wpdb->update($wpdb->posts,['post_status'=>'publish'],['ID'=>$id]); clean_post_cache($id); $GLOBALS['tio2_webhook_queue']=[];
    $r=tio2_apply_approved_content('synthetic-noop-update','update-published',$records);
    $out['noopUpdateNoEvent']=!is_wp_error($r)&&$r['changedPages']===[]&&$r['notificationState']==='not-needed'&&$GLOBALS['tio2_webhook_queue']===[];
    $out['cacheStateRestored']=wp_suspend_cache_addition()===$before_cache;
    echo guards_json($out); return;
}
if ($mode === 'rejected') {
    $GLOBALS['tio2_webhook_queue']=[];
    $out['seedPublishedUnchanged']=true;
    foreach(['homepage','application-hub'] as $seed) {
        $args=[]; $rejected=false;
        try {include '/workspace/wordpress/seed/apply-tio2-my-'.$seed.'.php';} catch(Throwable $error) {$rejected=true;}
        $out['seedPublishedUnchanged']=$out['seedPublishedUnchanged']&&$rejected&&guards_snapshot($id)===$baseline;
    }
    $scalar=$fixture['home']; $scalar['hero']['heading']='Unapproved synthetic heading';
    update_post_meta($id,$meta,wp_slash(guards_json($scalar))); $out['scalarUnchanged']=guards_snapshot($id)===$baseline;
    update_post_meta($id,$meta,wp_slash(guards_json($fixture['changed']))); $out['shapeUnchanged']=guards_snapshot($id)===$baseline;
    delete_post_meta($id,$meta); $out['deleteUnchanged']=guards_snapshot($id)===$baseline;
    add_post_meta($id,$meta,wp_slash($baseline[0])); $out['duplicateUnchanged']=count(get_post_meta($id,$meta))===1;
    $out['noEvent']=empty($GLOBALS['tio2_webhook_queue']);
    $mid=(int)$wpdb->get_var($wpdb->prepare("SELECT meta_id FROM {$wpdb->postmeta} WHERE post_id=%d AND meta_key=%s LIMIT 1",$id,$meta));
    update_metadata_by_mid('post',$mid,'{}'); delete_metadata_by_mid('post',$mid);
    $out['byIdBlocked']=guards_snapshot($id)===$baseline;
    // Reset historical state solely so old behavior can be characterized in RED.
    $wpdb->delete($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta]); $wpdb->insert($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta,'meta_value'=>$baseline[0]]); clean_post_cache($id);
    wp_update_post(['ID'=>$id,'post_status'=>'draft']);
    update_post_meta($id,$meta,wp_slash(guards_json($fixture['changed']))); $out['draftValid']=get_post_meta($id,$meta,true)===guards_json($fixture['changed']);
    $draft=get_post_meta($id,$meta,true); update_post_meta($id,$meta,'{"bad":true}'); $out['draftInvalidBlocked']=get_post_meta($id,$meta,true)===$draft;
    wp_update_post(['ID'=>$id,'post_status'=>'publish']); $out['republishBlocked']=get_post_status($id)==='draft';
    $out['abUnchanged']=true;
    foreach (['tio2-a','tio2-b'] as $scope) {
        $other=wp_insert_post(['post_type'=>'tio2_application_hub','post_status'=>'draft','post_title'=>'Synthetic '.$scope]); wp_set_object_terms($other,[$scope],'site_scope');
        update_post_meta($other,TIO2_MY_APPLICATION_HUB_CONTRACT_META,'unchanged legacy behavior');
        $out['abUnchanged']=$out['abUnchanged']&&get_post_meta($other,TIO2_MY_APPLICATION_HUB_CONTRACT_META,true)==='unchanged legacy behavior';
    }
    wp_update_post(['ID'=>$id,'post_status'=>'future','post_date'=>gmdate('Y-m-d H:i:s',time()+600)]);
    $out['futureBlocked']=get_post_status($id)==='draft';
    $wpdb->update($wpdb->posts,['post_status'=>'future','post_date_gmt'=>gmdate('Y-m-d H:i:s',time()-600)],['ID'=>$id]); clean_post_cache($id);
    do_action('publish_future_post',$id); $out['legacyCronBlocked']=get_post_status($id)==='future';
} elseif ($mode === 'approved' || $mode === 'race') {
    if ($mode==='race') {
        $wpdb->query("UPDATE {$wpdb->options} SET option_value=CAST(option_value AS UNSIGNED)+1 WHERE option_name='synthetic_race_ready'");
        $deadline=microtime(true)+15;
        while((int)$wpdb->get_var("SELECT option_value FROM {$wpdb->options} WHERE option_name='synthetic_race_ready'")<2) {
            if(microtime(true)>$deadline) throw new RuntimeException('Synthetic race barrier timed out'); usleep(10000);
        }
        add_action('updated_post_meta',static function() {usleep(300000);},90);
    }
    $result=guards_apply();
    if ($mode==='race') { echo guards_json(is_wp_error($result)?['error'=>$result->get_error_code()]:['committed'=>$result['committed']]); return; }
    $out=['committed'=>!is_wp_error($result)&&$result['committed'], 'changed'=>guards_snapshot($id)[0]===guards_json($fixture['changed']),
        'published'=>get_post_status($id)==='publish','queueHeld'=>empty($GLOBALS['tio2_webhook_queue']),
        'contextCleared'=>!Tio2_Approved_Content_Write::active(),'secondRejected'=>is_wp_error(guards_apply())];
    if (is_wp_error($result)) {
        $proof=json_decode(file_get_contents('/approvals/synthetic-home.json'),true);
        $out['diagnostic']=[$result->get_error_code(),tio2_content_digest($baseline[0]),$proof['records'][0]['beforeSha256'],tio2_content_digest(guards_json($fixture['changed'])),$proof['records'][0]['afterSha256']];
    }
} elseif ($mode === 'failures') {
    wp_using_ext_object_cache(true); $r=guards_apply(); wp_using_ext_object_cache(false);
    $out['persistentCacheRejected']=is_wp_error($r)&&guards_snapshot($id)===$baseline;
    wp_set_current_user(0); $out['denied']=is_wp_error(guards_apply())&&guards_snapshot($id)===$baseline; wp_set_current_user(1);
    $corrupt=static function($mid,$pid,$key) use($wpdb,$id,$meta) { if($pid===$id&&$key===$meta) $wpdb->update($wpdb->postmeta,['meta_value'=>'{}'],['post_id'=>$id,'meta_key'=>$meta]); };
    add_action('updated_post_meta',$corrupt,90,3); $r=guards_apply(); remove_action('updated_post_meta',$corrupt,90);
    $out['readbackRollback']=is_wp_error($r)&&guards_snapshot($id)===$baseline;
    $late_actor=static function() {wp_set_current_user(0);}; add_action('updated_post_meta',$late_actor,90);
    $r=guards_apply(); remove_action('updated_post_meta',$late_actor,90); wp_set_current_user(1);
    $out['lateCapabilityRejected']=is_wp_error($r)&&guards_snapshot($id)===$baseline;
    $throw=static function() { throw new RuntimeException('Synthetic hook failure'); }; add_action('updated_post_meta',$throw,90);
    $r=guards_apply(); remove_action('updated_post_meta',$throw,90); $out['exceptionRollback']=is_wp_error($r)&&guards_snapshot($id)===$baseline;
    $out['noEvents']=empty($GLOBALS['tio2_webhook_queue']); $out['contextCleared']=!Tio2_Approved_Content_Write::active();
    $wpdb->insert($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta,'meta_value'=>$baseline[0]]); $mid=$wpdb->insert_id;
    $out['duplicateRejected']=is_wp_error(guards_apply()); $wpdb->delete($wpdb->postmeta,['meta_id'=>$mid]); clean_post_cache($id);
    $wpdb->query('START TRANSACTION'); $r=guards_apply(); $out['outerTransactionRejected']=is_wp_error($r)&&(int)$wpdb->get_var('SELECT @@in_transaction')===1; $wpdb->query('ROLLBACK');
}
if ($mode === 'expire-proof') {
    $reached=false;
    $expire=static function($mid,$pid,$key) use(&$reached,$id,$meta) {if($pid===$id&&$key===$meta) {$reached=true;sleep(12);}};
    add_action('updated_post_meta',$expire,90,3); $r=guards_apply('synthetic-expiring'); remove_action('updated_post_meta',$expire,90);
    $out=['reachedWrite'=>$reached,'expired'=>is_wp_error($r)&&$r->get_error_code()==='approval_expired','unchanged'=>guards_snapshot($id)===$baseline];
} elseif ($mode === 'hold-locks') {
    $lock_queries=[];
    $capture=static function($sql) use(&$lock_queries) { if(str_contains($sql,'FOR UPDATE')) $lock_queries[]=$sql; return $sql; };
    add_filter('query',$capture);
    $hold=static function($mid,$pid,$key) use($wpdb,$id,$meta) {
        if($pid!==$id||$key!==$meta) return;
        $wpdb->get_var("SELECT GET_LOCK('d16-guards-held',0)");
        try {
            $deadline=microtime(true)+15;
            while(!$wpdb->get_var("SELECT IS_USED_LOCK('d16-guards-release')")) {
                if(microtime(true)>$deadline) throw new RuntimeException('Synthetic lock hold timed out'); usleep(10000);
            }
        } finally { $wpdb->get_var("SELECT RELEASE_LOCK('d16-guards-held')"); }
    };
    add_action('updated_post_meta',$hold,90,3);
    $r=tio2_apply_approved_content('synthetic-bulk','update-published',[['pageId'=>'APP-000','content'=>guards_json($fixture['changedApp'])],['pageId'=>'HOME-001','content'=>guards_json($fixture['changed'])]]);
    remove_action('updated_post_meta',$hold,90); remove_filter('query',$capture);
    $out=['committed'=>!is_wp_error($r)&&$r['committed']];
    $out['lockPlans']=array_map(static function($sql) use($wpdb) {return ['sql'=>$sql,'plan'=>$wpdb->get_results('EXPLAIN '.$sql,ARRAY_A)];},$lock_queries);
    $out['coreVersion']=get_bloginfo('version'); $out['databaseVersion']=$wpdb->db_version();
} elseif ($mode === 'independent-writes') {
    $deadline=microtime(true)+15;
    while(!$wpdb->get_var("SELECT IS_USED_LOCK('d16-guards-held')")) {if(microtime(true)>$deadline) throw new RuntimeException('Synthetic holder missing'); usleep(10000);}
    $out['independentDuringHold']=true;
    foreach(['a','b','other'] as $key) {
        $other=(int)get_option('synthetic_guard_'.$key);
        $ok=update_post_meta($other,'synthetic_independent','after');
        if($key!=='other') $ok=$ok&&(bool)wp_update_post(['ID'=>$other,'post_title'=>'Independent update '.$key]);
        $out['independentDuringHold']=$out['independentDuringHold']&&$ok&&(bool)$wpdb->get_var("SELECT IS_USED_LOCK('d16-guards-held')");
    }
    $my=(int)$wpdb->get_var("SELECT tt.term_taxonomy_id FROM {$wpdb->term_taxonomy} tt JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE t.slug='tio2-my' AND tt.taxonomy='site_scope'");
    $a=(int)get_option('synthetic_guard_a'); $other=(int)get_option('synthetic_guard_other');
    $wpdb->query('SET SESSION innodb_lock_wait_timeout=1'); $suppressed=$wpdb->suppress_errors(true);
    $out['identityRacesBlocked']=[];
    foreach([
        "INSERT INTO {$wpdb->term_relationships} (object_id,term_taxonomy_id) VALUES ({$a},{$my})",
        "DELETE FROM {$wpdb->term_relationships} WHERE object_id={$id} AND term_taxonomy_id={$my}",
        "UPDATE {$wpdb->term_relationships} SET object_id={$a} WHERE object_id={$id} AND term_taxonomy_id={$my}",
        "UPDATE {$wpdb->posts} SET post_type='tio2_homepage' WHERE ID={$other}",
    ] as $sql) {
        $wpdb->query('START TRANSACTION'); $result=$wpdb->query($sql); $out['identityRacesBlocked'][]=$result===false&&str_contains($wpdb->last_error,'Lock wait timeout'); $wpdb->query('ROLLBACK');
    }
    $app_id=(int)get_option('synthetic_guard_app');
    $a_scope=(int)$wpdb->get_var("SELECT tt.term_taxonomy_id FROM {$wpdb->term_taxonomy} tt JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE t.slug='tio2-a' AND tt.taxonomy='site_scope'");
    // Actual autocommit append: before the fix this escapes the MY-only index range.
    $append=$wpdb->insert($wpdb->term_relationships,['object_id'=>$app_id,'term_taxonomy_id'=>$a_scope]);
    $out['targetAppendBlocked']=$append===false&&str_contains($wpdb->last_error,'Lock wait timeout');
    $out['appScopes']=wp_get_post_terms($app_id,'site_scope',['fields'=>'slugs']);
    $wpdb->suppress_errors($suppressed);
    $wpdb->get_var("SELECT GET_LOCK('d16-guards-release',0)"); usleep(500000); $wpdb->get_var("SELECT RELEASE_LOCK('d16-guards-release')");
} elseif ($mode === 'boundaries') {
    $app_id=(int)get_option('synthetic_guard_app'); $app_meta=TIO2_MY_APPLICATION_HUB_CONTRACT_META; $app_before=get_post_meta($app_id,$app_meta,true);
    $records=[['pageId'=>'HOME-001','content'=>guards_json($fixture['changed'])],['pageId'=>'APP-000','content'=>guards_json($fixture['changedApp'])]];
    $corrupt=static function($mid,$pid,$key) use($wpdb,$id,$meta) {if($pid===$id&&$key===$meta) $wpdb->update($wpdb->postmeta,['meta_value'=>'{}'],['post_id'=>$id,'meta_key'=>$meta]);};
    add_action('updated_post_meta',$corrupt,90,3); $r=tio2_apply_approved_content('synthetic-bulk','update-published',$records); remove_action('updated_post_meta',$corrupt,90);
    clean_post_cache($app_id); $out['bulkRollback']=is_wp_error($r)&&guards_snapshot($id)===$baseline&&get_post_meta($app_id,$app_meta,true)===$app_before;
    $other_queue=[123456=>['contentId'=>123456,'siteIds'=>['tio2-a'],'paths'=>['/'],'entityIds'=>[123456],'sitePaths'=>['tio2-a'=>['/']]]];
    $GLOBALS['tio2_webhook_queue']=$other_queue;
    $nested=null; $borrowed=null;
    $nest=static function($mid,$pid,$key) use(&$nested,&$borrowed,$id,$meta) { if($pid===$id&&$key===$meta) {
        $nested=guards_apply(); $borrowed=update_post_meta($id,$meta,'{}'); tio2_flush_webhook_queue();
    }};
    add_action('updated_post_meta',$nest,90,3); $r=tio2_apply_approved_content('synthetic-bulk','update-published',$records); remove_action('updated_post_meta',$nest,90);
    $out['bulkCommitted']=!is_wp_error($r)&&$r['committed']&&$r['changedPages']===['APP-000','HOME-001'];
    $out['nestedRejected']=is_wp_error($nested)&&$nested->get_error_code()==='write_nested'&&$borrowed===false;
    $out['otherQueuePreserved']=$GLOBALS['tio2_webhook_queue']===$other_queue;
    $out['eventsFailedWithoutEndpoint']=!is_wp_error($r)&&$r['notificationState']==='failed'&&count($r['events'])===2&&isset($r['receiptId']);
    $GLOBALS['tio2_webhook_queue']=[];
} elseif ($mode === 'publish-draft') {
    wp_update_post(['ID'=>$id,'post_status'=>'draft']); $GLOBALS['tio2_webhook_queue']=[];
    $r=tio2_apply_approved_content('synthetic-draft','publish-draft',[['pageId'=>'HOME-001','content'=>guards_json($fixture['changed'])]]);
    $out=['committed'=>!is_wp_error($r)&&$r['committed'],'published'=>get_post_status($id)==='publish','changed'=>guards_snapshot($id)[0]===guards_json($fixture['changed'])];
}
echo guards_json($out);
