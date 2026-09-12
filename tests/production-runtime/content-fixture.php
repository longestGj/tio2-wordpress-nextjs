<?php
// Isolated rehearsal fixture: real WordPress APIs + production HOME validator.
if (!defined('DISABLE_WP_CRON')) define('DISABLE_WP_CRON',true);
register_taxonomy('site_scope',['tio2_homepage'],['public'=>true]);
register_post_type('tio2_homepage',['public'=>true]);
function tio2_get_homepage_site_id(int $id): string {
    $terms=wp_get_post_terms($id,'site_scope',['fields'=>'slugs']);
    return count($terms)===1 ? $terms[0] : '';
}
require '/opt/d16-plugin/includes/homepage-v04.php';
add_action('rest_api_init',function () {
    register_rest_route('content-test/v1','/page',['methods'=>'GET','permission_callback'=>'__return_true','callback'=>function () {
        if (file_exists('/tmp/d16-maintenance') && ($_SERVER['HTTP_X_D16_VERIFY']??'')!=='isolated-test') return new WP_Error('maintenance','Maintenance',['status'=>503]);
        $ids=get_posts(['post_type'=>'tio2_homepage','numberposts'=>-1,'fields'=>'ids']);
        foreach ($ids as $id) if (tio2_get_homepage_site_id($id)==='tio2-my') {
            $content=json_decode(get_post_meta($id,TIO2_MY_HOMEPAGE_CONTRACT_META,true));
            return ['content'=>$content,'status'=>get_post_status($id),'seo'=>$content->seo??null,'sitemap'=>['/']];
        }
        return new WP_Error('missing','Missing',['status'=>404]);
    }]);
});
