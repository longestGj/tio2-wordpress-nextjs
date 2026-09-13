<?php
declare(strict_types=1);
// SYNTHETIC TEST ONLY: loaded as an isolated MU plugin or fixture CLI.
if (defined('ABSPATH')) {
    define('TIO2_CONTENT_APPROVAL_ROOT', '/approvals');
    define('TIO2_CONTENT_ENVIRONMENT_ID', 'isolated-content-import');
    define('TIO2_CONTENT_WRITER_UID', 33);
    foreach (['tio2_homepage','tio2_application_hub','tio2_market_hub'] as $type) register_post_type($type, ['public'=>false]);
    register_taxonomy('site_scope', ['tio2_homepage','tio2_application_hub','tio2_market_hub']);
    function tio2_get_homepage_site_id(int $id): string {
        $terms=wp_get_post_terms($id,'site_scope',['fields'=>'slugs']);
        return count($terms)===1 ? $terms[0] : '';
    }
    foreach (['homepage-v04','application-hub-v01','market-hub-v01'] as $name) require_once WP_PLUGIN_DIR.'/tio2-site-model/includes/'.$name.'.php';
    if (getenv('D16_CONTENT_ACTION')==='import') {
        foreach (['updated_post_meta','post_updated','transition_post_status'] as $hook) add_action($hook,function () { throw new RuntimeException('SQL importer dispatched a per-record WordPress hook.'); });
    }
    // Real SQL races controlled only by this disposable fixture, never production hooks.
    if (getenv('SYNTHETIC_IMPORT_BARRIER')) add_filter('query', function ($sql) {
        static $waiting=false;
        $at=getenv('SYNTHETIC_IMPORT_BARRIER');
        if (!$waiting && (($at==='before' && $sql === 'START TRANSACTION') || ($at==='locked' && str_starts_with($sql,'UPDATE wp_postmeta SET')))) {
            $waiting=true;
            global $wpdb;
            $wpdb->get_var("SELECT GET_LOCK('synthetic-ready',0)");
            $wpdb->get_var("SELECT GET_LOCK('synthetic-gate',30)");
        }
        return $sql;
    });
    if (getenv('SYNTHETIC_CORRUPT_READBACK')) add_filter('query', function ($sql) {
        return str_starts_with($sql,'UPDATE wp_postmeta SET') ? str_replace('Synthetic approved addition','Synthetic corrupted addition',$sql) : $sql;
    });
    return;
}
if (($argv[1]??'')==='digests') {
    define('ABSPATH',__DIR__);
    require '/opt/d16-plugin/includes/content-write-contract.php';
    $vectors=json_decode(file_get_contents('/workspace/tests/fixtures/content-write-approval-cases.json'));
    $out=[];
    foreach($vectors->digestCases as $case) {
        try { $out[]=tio2_content_digest($case->json); } catch(Throwable $error) { $out[]='reject'; }
    }
    echo json_encode($out); exit;
}
define('WP_INSTALLING',true);
define('DISABLE_WP_CRON',true);
$_SERVER['HTTP_HOST']='localhost'; $_SERVER['REQUEST_URI']='/';
require '/var/www/html/wp-load.php';
require_once '/var/www/html/wp-admin/includes/upgrade.php';
if (!is_blog_installed()) wp_install('SYNTHETIC import','test-admin','test@example.invalid',false,'','synthetic-password');
foreach ([['HOME-001','tio2_homepage','tio2-my-homepage','tio2-my-homepage.json',TIO2_MY_HOMEPAGE_CONTRACT_META],
    ['APP-000','tio2_application_hub','tio2-my-applications','tio2-my-application-hub.json',TIO2_MY_APPLICATION_HUB_CONTRACT_META],
    ['MARKET-000','tio2_market_hub','tio2-my-markets','tio2-my-market-hub.json',TIO2_MY_MARKET_HUB_CONTRACT_META]] as [$page,$type,$slug,$file,$meta]) {
    $id=wp_insert_post(['post_type'=>$type,'post_status'=>'publish','post_title'=>$page,'post_name'=>$slug]);
    wp_set_object_terms($id,['tio2-my'],'site_scope');
    update_post_meta($id,$meta,wp_slash(file_get_contents('/opt/d16-plugin/config/'.$file)));
    update_post_meta($id,'homepage_schema_version','homepage-v0.4-malaysia');
    update_post_meta($id,'public_path',$page==='APP-000'?'/applications':($page==='MARKET-000'?'/markets':'/'));
}
wp_insert_term('tio2-b','site_scope');
echo "seeded\n";
