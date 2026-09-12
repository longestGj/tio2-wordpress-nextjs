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

try {
    $raw = stream_get_contents(STDIN,16*1024*1024+1);
    if (strlen($raw)>16*1024*1024) throw new RuntimeException('Package too large.');
    $object=json_decode($raw,false,512,JSON_THROW_ON_ERROR);
    $input=json_decode($raw,true,512,JSON_THROW_ON_ERROR);
    $keys=array_keys($input); sort($keys);
    if ($keys!==['contentSha256','files','records','schemaVersion','siteId'] || $input['schemaVersion']!=='d16-content-package-v1' || $input['files']!==[] || !$input['records']) throw new RuntimeException('Invalid package.');
    if (hash('sha256',d16_canonical($object->records))!==$input['contentSha256']) throw new RuntimeException('Package hash mismatch.');
    $registry=d16_content_registry($input['siteId']); $plans=[]; $before=[]; $last='';
    foreach ($input['records'] as $index=>$record) {
        $keys=array_keys($record); sort($keys);
        $page=$record['pageId']??'';
        if ($keys!==['content','pageId'] || !preg_match('/^[A-Z][A-Z0-9-]{0,95}$/D',$page) || strcmp($page,$last)<=0 || !isset($registry[$page]) || !is_object($object->records[$index]->content)) throw new RuntimeException('Unknown or duplicate page identity.');
        $last=$page; $entry=$registry[$page];
        if (!tio2_my_content_matches($record['content'],$entry['content'])) throw new RuntimeException('Content changes an immutable field.');
        $ordered=d16_content_storage_order($object->records[$index]->content,json_decode($entry['json']));
        $plans[]=[$page,$entry,json_encode($ordered,JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES)];
        $before[]=['pageId'=>$page,'content'=>json_decode($entry['json'])];
    }
    $beforeHash=hash('sha256',d16_canonical($before));
    $action=getenv('D16_CONTENT_ACTION');
    if ($action==='export') {
        $input['records']=$before; $input['contentSha256']=$beforeHash;
        echo d16_canonical(['ok'=>true,'package'=>$input]); exit;
    }
    if ($action==='validate') { echo d16_canonical(['ok'=>true,'beforeContentSha256'=>$beforeHash,'databaseUser'=>$wpdb->get_var('SELECT CURRENT_USER()')]); exit; }
    if ($action!=='import' || (string)$wpdb->get_var('SELECT @@GLOBAL.read_only')!=='1') throw new RuntimeException('Import requires fenced database.');
    if ($wpdb->query('START TRANSACTION')===false) throw new RuntimeException('Transaction unavailable.');
    $active=true;
    foreach ($plans as [$page,$entry,$json]) {
        // Direct fixed metadata update avoids ALL per-record WordPress webhooks.
        $result=$wpdb->query($wpdb->prepare("UPDATE {$wpdb->postmeta} SET meta_value=%s WHERE meta_id=%d AND post_id=%d AND meta_key=%s",$json,$entry['metaId'],$entry['postId'],$entry['metaKey']));
        if ($result===false) throw new RuntimeException('Content update failed.');
        wp_cache_delete($entry['postId'],'post_meta');
        d16_content_check_record($entry,$page);
    }
    $readback=[];
    foreach ($plans as [$page,$entry]) {
        $stored=$wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->postmeta} WHERE meta_id=%d",$entry['metaId']));
        $readback[]=['pageId'=>$page,'content'=>json_decode($stored,false,512,JSON_THROW_ON_ERROR)];
    }
    $hash=hash('sha256',d16_canonical($readback));
    if ($hash!==$input['contentSha256']) throw new RuntimeException('Readback mismatch.');
    if ($wpdb->query('COMMIT')===false) throw new RuntimeException('Commit failed.');
    $active=false;
    echo d16_canonical(['ok'=>true,'contentSha256'=>$hash]);
} catch (Throwable $error) {
    if ($active??false) $wpdb->query('ROLLBACK');
    fwrite(STDERR,"Content release rejected; window must remain fenced.\n");
    exit(1);
}
