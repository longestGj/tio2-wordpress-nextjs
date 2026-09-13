<?php
// SYNTHETIC TEST ONLY: disposable WordPress/InnoDB and read-only proof mount.
if (($argv[1] ?? '') === 'proofs') {
    $input = json_decode(stream_get_contents(STDIN), true, 512, JSON_THROW_ON_ERROR);
    file_put_contents('/approvals/synthetic-events.json', json_encode($input['proof']));
    file_put_contents('/approvals/fixture.json', json_encode($input));
    exit;
}
$mode = $args[0];
define('TIO2_CONTENT_APPROVAL_ROOT', '/approvals');
define('TIO2_CONTENT_WRITER_UID', 33);
define('TIO2_CONTENT_ENVIRONMENT_ID', $args[1]);
$fixture = json_decode(file_get_contents('/approvals/fixture.json'), true);
function events_json($value) { return wp_json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
function events_apply($fixture) {
    return tio2_apply_approved_content('synthetic-events', 'update-published', [
        ['pageId'=>'APP-000','content'=>events_json($fixture['changedApp'])],
        ['pageId'=>'HOME-001','content'=>events_json($fixture['changedHome'])],
    ]);
}
function events_snapshots() {
    $home=(int)get_option('synthetic_events_home'); $app=(int)get_option('synthetic_events_app');
    clean_post_cache($home); clean_post_cache($app);
    return [get_post_meta($home,TIO2_MY_HOMEPAGE_CONTRACT_META,true),get_post_meta($app,TIO2_MY_APPLICATION_HUB_CONTRACT_META,true)];
}
global $wpdb;
if ($mode === 'setup') {
    if (!term_exists('tio2-my','site_scope')) wp_insert_term('tio2-my','site_scope',['slug'=>'tio2-my']);
    foreach (['home'=>['tio2_homepage','tio2-my--homepage',TIO2_MY_HOMEPAGE_CONTRACT_META,'home'],
              'app'=>['tio2_application_hub','tio2-my-applications',TIO2_MY_APPLICATION_HUB_CONTRACT_META,'app']] as $key=>$def) {
        $id=wp_insert_post(['post_type'=>$def[0],'post_status'=>'draft','post_title'=>'SYNTHETIC EVENTS '.$key]);
        update_option('synthetic_events_'.$key,$id);
        $wpdb->update($wpdb->posts,['post_name'=>$def[1]],['ID'=>$id]);
        wp_set_object_terms($id,['tio2-my'],'site_scope');
        foreach ([$def[2]=>events_json($fixture[$def[3]]),'homepage_schema_version'=>'homepage-v0.4-malaysia',
                  'public_path'=>$key==='home'?'/':'/applications'] as $meta=>$value) {
            $wpdb->insert($wpdb->postmeta,['post_id'=>$id,'meta_key'=>$meta,'meta_value'=>$value]);
        }
        $wpdb->update($wpdb->posts,['post_status'=>'publish'],['ID'=>$id]); clean_post_cache($id);
    }
    echo '{}'; return;
}
$calls=[]; $writeCount=0; $during=0;
$capture=static function($pre,$request,$url) use (&$calls,&$mode) {
    $payload=json_decode($request['body'],true);
    $calls[]=['url'=>$url,'payload'=>$payload,'signed'=>hash_equals(hash_hmac('sha256',$request['body'],'synthetic-events-secret'),$request['headers']['x-tio2-signature'])];
    if ($mode==='commit' || $mode==='retry-fail') return ['response'=>['code'=>503,'message'=>'Synthetic failure'],'headers'=>[],'body'=>'{"ok":false}'];
    if ($mode==='bad-ack') return ['response'=>['code'=>200,'message'=>'OK'],'headers'=>[],
        'body'=>events_json(['ok'=>true,'eventId'=>$payload['eventId'],'revalidatedTags'=>[],
            'revalidatedPaths'=>[],'contentRelease'=>['releaseId'=>'wrong','contentSha256'=>str_repeat('0',64)]])];
    return ['response'=>['code'=>200,'message'=>'OK'],'headers'=>[],
        'body'=>events_json(['ok'=>true,'eventId'=>$payload['eventId'],'revalidatedTags'=>['content:tio2-my'],
            'revalidatedPaths'=>$payload['paths'],'contentRelease'=>$payload['contentRelease']])];
};
add_filter('pre_http_request',$capture,10,3);
$count=static function() use (&$writeCount) {$writeCount++;};
add_action('updated_post_meta',$count,5);
if ($mode === 'rollback') {
    $before=events_snapshots();
    $throw=static function() { throw new RuntimeException('SYNTHETIC rollback'); };
    add_action('updated_post_meta',$throw,90);
    $result=events_apply($fixture); remove_action('updated_post_meta',$throw,90);
    echo events_json(['rejected'=>is_wp_error($result),'unchanged'=>events_snapshots()===$before,'calls'=>$calls]); return;
}
if ($mode === 'storage-fail') {
    $before=events_snapshots(); $suppress=$wpdb->suppress_errors(true);
    $reject=static function($query) {return str_contains($query,'tio2_content_event_') && str_starts_with($query,'INSERT INTO')
        ? 'INSERT INTO synthetic_missing_receipt_table (id) VALUES (1)' : $query;};
    add_filter('query',$reject); $result=events_apply($fixture); remove_filter('query',$reject);
    $wpdb->suppress_errors($suppress);
    echo events_json(['error'=>is_wp_error($result)?$result->get_error_code():null,'unchanged'=>events_snapshots()===$before,
        'calls'=>$calls,'writeCount'=>$writeCount]); return;
}
if ($mode === 'commit') {
    $other=[99999=>['contentId'=>99999,'siteIds'=>['tio2-a'],'paths'=>['/'],'entityIds'=>[], 'sitePaths'=>['tio2-a'=>['/']]]];
    $GLOBALS['tio2_webhook_queue']=$other;
    $flush=static function() use (&$during) {tio2_flush_webhook_queue(); $during=count($GLOBALS['tio2_webhook_queue']);};
    add_action('updated_post_meta',$flush,90);
    $result=events_apply($fixture); remove_action('updated_post_meta',$flush,90);
    echo events_json(['receipt'=>$result,'calls'=>$calls,'duringQueueCount'=>$during,
        'otherQueuePreserved'=>$GLOBALS['tio2_webhook_queue']===$other,'writeCount'=>$writeCount,
        'contentMatches'=>events_snapshots()===[events_json($fixture['changedHome']),events_json($fixture['changedApp'])]]); return;
}
if (in_array($mode,['retry','retry-fail','bad-ack','stale','noactor','tamper'],true)) {
    if ($mode === 'tamper') {
        $key='tio2_content_event_'.$args[2]; $original=get_option($key); $altered=$original;
        $altered['payload']['entityIds']=[123456]; update_option($key,$altered,false);
    }
    if ($mode === 'stale') {
        // Synthetic clock ageing, not a public override of production time.
        $key='tio2_content_event_'.$args[2]; $stored=get_option($key);
        $stored['payload']['modified']=gmdate('c',time()-360);
        $stored['attempts'][count($stored['attempts'])-1]['modified']=$stored['payload']['modified'];
        update_option($key,$stored,false);
    }
    if ($mode === 'noactor') wp_set_current_user(0);
    $before=events_snapshots(); $result=tio2_retry_approved_content_events($args[2]);
    if ($mode === 'tamper') update_option($key,$original,false);
    echo events_json(['receipt'=>is_wp_error($result)?$result->get_error_code():$result,
        'calls'=>$calls,'contentUnchanged'=>events_snapshots()===$before,'writeCount'=>$writeCount]); return;
}
