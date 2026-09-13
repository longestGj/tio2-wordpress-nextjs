<?php
declare(strict_types=1);

// Administrator-installed CLI only. Never eval/include input or seed programs.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
define('DISABLE_WP_CRON',true);
define('WP_USE_THEMES',false);
require '/var/www/html/wp-load.php';
require __DIR__.'/registry.php';

function d16_canonical($value): string {
    $sort = function ($value) use (&$sort) {
        if (is_object($value)) {
            $items=get_object_vars($value); ksort($items,SORT_STRING);
            $out=new stdClass(); foreach ($items as $key=>$item) $out->$key=$sort($item); return $out;
        }
        if (is_array($value)) {
            if (!array_is_list($value)) ksort($value,SORT_STRING);
            foreach ($value as &$item) $item=$sort($item);
        }
        return $value;
    };
    return json_encode($sort($value),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
}

// Validators may retain strict PHP identity-array order. Preserve stored object
// ordering while hashing semantic objects in canonical order across environments.
function d16_content_storage_order($candidate,$existing) {
    if (is_object($existing) && is_object($candidate)) {
        $out=new stdClass();
        foreach (get_object_vars($existing) as $key=>$value) {
            if (!property_exists($candidate,$key)) throw new RuntimeException('Missing storage field.');
            $out->$key=d16_content_storage_order($candidate->$key,$value);
        }
        if (count(get_object_vars($out))!==count(get_object_vars($candidate))) throw new RuntimeException('New storage field.');
        return $out;
    }
    if (is_array($existing) && is_array($candidate)) {
        foreach ($candidate as $key=>&$value) $value=d16_content_storage_order($value,$existing[$key]??null);
    }
    return $candidate;
}

function d16_content_database_identity(bool $fenced=false): void {
    global $wpdb;
    if ($wpdb->get_var('SELECT DATABASE()')!==getenv('D16_CONTENT_DB') ||
        $wpdb->get_var('SELECT @@hostname')!==getenv('D16_CONTENT_DB_HOSTNAME')) throw new RuntimeException('Content database identity changed.');
    if ($fenced && ((string)$wpdb->get_var('SELECT @@GLOBAL.read_only')!=='1' ||
        !in_array($wpdb->get_var('SELECT @@GLOBAL.event_scheduler'),['OFF','DISABLED'],true) ||
        explode('@',(string)$wpdb->get_var('SELECT CURRENT_USER()'))[0]!=='root')) throw new RuntimeException('Import requires enrolled administrator and database fence.');
    if ($wpdb->last_error) throw new RuntimeException('Database identity unavailable.');
}

/** Reload trusted evidence each time; package/test receipts never supply authority. */
function d16_content_approval(array $plans): void {
    $before=[]; $after=[];
    foreach ($plans as [$page,$entry,$json]) {
        if ($entry['validator']!=='d16_content_check_migrated_record') continue;
        $before[$page]=$entry['json']; $after[$page]=$json;
    }
    if (!$after) return;
    $proof=tio2_load_content_approval((string)getenv('D16_CONTENT_APPROVAL_ID'));
    $environment=defined('TIO2_CONTENT_ENVIRONMENT_ID') && is_string(TIO2_CONTENT_ENVIRONMENT_ID) ? TIO2_CONTENT_ENVIRONMENT_ID : '';
    if (is_wp_error($proof) || tio2_check_content_approval($proof,$environment,'update-published',$before,$after,time())!==true) throw new RuntimeException('Content approval unavailable or invalid.');
}

function d16_content_query(string $sql): void {
    global $wpdb;
    if ($wpdb->query($sql)===false) throw new RuntimeException('Content database query failed.');
}

try {
    d16_content_database_identity();
    $raw = stream_get_contents(STDIN,16*1024*1024+1);
    if (strlen($raw)>16*1024*1024) throw new RuntimeException('Package too large.');
    $object=json_decode($raw,false,512,JSON_THROW_ON_ERROR);
    $input=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
    $keys=array_keys($input); sort($keys);
    if ($keys!==['contentSha256','files','records','schemaVersion','siteId'] || $input['schemaVersion']!=='d16-content-package-v1' || $input['files']!==[] || !$input['records']) throw new RuntimeException('Invalid package.');
    foreach ($input['records'] as $record) {
        if (in_array($record['pageId']??null,['HOME-001','APP-000'],true)) { tio2_content_decode($raw); break; }
    }
    if (hash('sha256',d16_canonical($object->records))!==$input['contentSha256']) throw new RuntimeException('Package hash mismatch.');
    $action=getenv('D16_CONTENT_ACTION');
    if (!in_array($action,['export','validate','import'],true)) throw new RuntimeException('Unknown content action.');
    $registry=d16_content_registry($input['siteId']); $plans=[]; $before=[]; $last='';
    foreach ($input['records'] as $index=>$record) {
        $keys=array_keys($record); sort($keys);
        $page=$record['pageId']??'';
        if ($keys!==['content','pageId'] || !preg_match('/^[A-Z][A-Z0-9-]{0,95}$/D',$page) || strcmp($page,$last)<=0 || !isset($registry[$page]) || !is_object($object->records[$index]->content)) throw new RuntimeException('Unknown or duplicate page identity.');
        $last=$page; $entry=$registry[$page];
        $migrated=$entry['validator']==='d16_content_check_migrated_record';
        if (!$migrated && !tio2_my_content_matches($record['content'],$entry['content'])) throw new RuntimeException('Content changes an immutable field.');
        $ordered=$migrated ? $object->records[$index]->content : d16_content_storage_order($object->records[$index]->content,json_decode($entry['json']));
        $changed=d16_canonical($ordered)!==d16_canonical(json_decode($entry['json']));
        $plans[]=[$page,$entry,json_encode($ordered,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),$changed];
        $before[]=['pageId'=>$page,'content'=>json_decode($entry['json'])];
    }
    $beforeHash=hash('sha256',d16_canonical($before));
    if ($action==='export') {
        $input['records']=$before; $input['contentSha256']=$beforeHash;
        echo d16_canonical(['ok'=>true,'package'=>$input]); exit;
    }
    d16_content_approval($plans);
    if ($action==='validate') { echo d16_canonical(['ok'=>true,'beforeContentSha256'=>$beforeHash,'databaseUser'=>$wpdb->get_var('SELECT CURRENT_USER()')]); exit; }
    d16_content_database_identity(true);
    $transaction=$wpdb->get_row('SELECT @@session.in_transaction AS active, @@session.autocommit AS automatic',ARRAY_A);
    if (!$transaction || (int)$transaction['active']!==0 || (int)$transaction['automatic']!==1) throw new RuntimeException('Importer cannot own transaction.');
    d16_content_query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    if ($wpdb->query('START TRANSACTION')===false) throw new RuntimeException('Transaction unavailable.');
    $active=true;
    // The controller's global lock, drained sessions and read_only fence exclude
    // normal writers. Lock full target relationship/metadata ranges as well.
    foreach ($plans as [$page,$entry]) {
        $id=$entry['postId'];
        d16_content_query("SELECT ID FROM {$wpdb->posts} WHERE ID={$id} FOR UPDATE");
        d16_content_query("SELECT term_taxonomy_id FROM {$wpdb->term_relationships} FORCE INDEX (PRIMARY) WHERE object_id={$id} ORDER BY term_taxonomy_id FOR UPDATE");
        d16_content_query("SELECT meta_id FROM {$wpdb->postmeta} FORCE INDEX (post_id) WHERE post_id={$id} ORDER BY meta_id FOR UPDATE");
        clean_post_cache($id);
    }
    d16_content_database_identity(true);
    // Build a fresh registry only after acquiring locks, never use preflight identity.
    $locked=d16_content_registry($input['siteId']);
    foreach ($plans as [$page,$entry]) {
        $current=$locked[$page]??null;
        if (!$current || $current['postId']!==$entry['postId'] || $current['metaId']!==$entry['metaId'] ||
            $current['metaKey']!==$entry['metaKey'] || $current['json']!==$entry['json']) throw new RuntimeException('Content baseline or identity changed.');
    }
    d16_content_approval($plans);
    foreach ($plans as [$page,$entry,$json,$changed]) {
        if (!$changed) continue;
        // Direct fixed metadata update avoids ALL per-record WordPress webhooks.
        $result=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->postmeta} SET meta_value=%s WHERE meta_id=%d AND post_id=%d AND meta_key=%s",$json,$entry['metaId'],$entry['postId'],$entry['metaKey']));
        if ($result===false) throw new RuntimeException('Content update failed.');
        if ($wpdb->update($wpdb->posts,
            ['post_modified'=>current_time('mysql'),'post_modified_gmt'=>current_time('mysql',true)],
            ['ID'=>$entry['postId']],['%s','%s'],['%d'])===false) throw new RuntimeException('Modified timestamp update failed.');
        wp_cache_delete($entry['postId'],'post_meta');
        wp_cache_delete($entry['postId'],'posts');
        d16_content_check_record($entry,$page);
    }
    wp_cache_set_last_changed('posts');
    $readback=[];
    foreach ($plans as [$page,$entry]) {
        $stored=$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_id=%d",$entry['metaId']));
        $readback[]=['pageId'=>$page,'content'=>json_decode($stored,false,512,JSON_THROW_ON_ERROR)];
    }
    foreach ($plans as $index=>[$page,$entry,$json]) {
        if ($entry['validator']==='d16_content_check_migrated_record' &&
            tio2_content_digest(json_encode($readback[$index]['content'],JSON_THROW_ON_ERROR))!==tio2_content_digest($json)) throw new RuntimeException('Approval readback mismatch.');
    }
    $hash=hash('sha256',d16_canonical($readback));
    if ($hash!==$input['contentSha256']) throw new RuntimeException('Readback mismatch.');
    d16_content_database_identity(true);
    d16_content_approval($plans);
    if ($wpdb->query('COMMIT')===false) throw new RuntimeException('Commit failed.');
    $active=false;
    echo d16_canonical(['ok'=>true,'contentSha256'=>$hash]);
} catch (Throwable $error) {
    if ($active??false) $wpdb->query('ROLLBACK');
    fwrite(STDERR,"Content release rejected; window must remain fenced.\n");
    exit(1);
}
