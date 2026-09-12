<?php
define('WP_INSTALLING',true);
$_SERVER['HTTP_HOST']='localhost';
$_SERVER['REQUEST_URI']='/';
require '/var/www/html/wp-load.php';
require_once '/var/www/html/wp-admin/includes/upgrade.php';
if (!is_blog_installed()) wp_install('Isolated content release','test-admin','test@example.invalid',false,'','isolated-only-password');
update_option('siteurl','http://localhost');
update_option('home','http://localhost');
foreach (['tio2-my','other'] as $scope) {
    if (!term_exists($scope,'site_scope')) wp_insert_term($scope,'site_scope');
    $id=wp_insert_post(['post_type'=>'tio2_homepage','post_status'=>'publish','post_title'=>$scope,'post_name'=>$scope.'-homepage']);
    wp_set_object_terms($id,[$scope],'site_scope');
    update_post_meta($id,TIO2_MY_HOMEPAGE_CONTRACT_META,wp_slash(file_get_contents('/opt/d16-plugin/config/tio2-my-homepage.json')));
}
echo "seeded\n";
