<?php
declare(strict_types=1);

namespace GraphQL\Error { class UserError extends \Exception {} }
namespace {
define('ABSPATH', __DIR__);
final class WP_Error { public function __construct(public string $code,public string $message){} }
$GLOBALS['actions']=[];$GLOBALS['post_types']=[];$GLOBALS['taxonomies']=[];$GLOBALS['graphql_fields']=[];
function add_action(string $hook,callable $callback):void{$GLOBALS['actions'][$hook][]=$callback;}
function register_post_type(string $type,array $args):void{$GLOBALS['post_types'][$type]=$args;}
function register_taxonomy_for_object_type(string $taxonomy,string $type):void{$GLOBALS['taxonomies'][]=[$taxonomy,$type];}
function register_graphql_field(string $type,string $field,array $args):void{$GLOBALS['graphql_fields'][$field]=$args;}
function is_wp_error(mixed $value):bool{return $value instanceof WP_Error;}
require dirname(__DIR__,3).'/wordpress/plugins/tio2-site-model/includes/request-sample-v01.php';
foreach($GLOBALS['actions']['init']??[] as $callback)$callback();
foreach($GLOBALS['actions']['graphql_register_types']??[] as $callback)$callback();
if(!isset($GLOBALS['post_types']['tio2_request_sample']))throw new \RuntimeException('post type missing');
if(!in_array(['site_scope','tio2_request_sample'],$GLOBALS['taxonomies'],true))throw new \RuntimeException('scope taxonomy missing');
if(($GLOBALS['graphql_fields']['malaysiaRequestSampleRecordJson']['type']['non_null']??null)!=='String')throw new \RuntimeException('non-null GraphQL field missing');
echo "request-sample-taxonomy-runtime:passed\n";
}
