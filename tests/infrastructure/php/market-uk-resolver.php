<?php
declare(strict_types=1);
namespace GraphQL\Error { final class UserError extends \RuntimeException {} }
namespace {
define('ABSPATH', __DIR__);
final class WP_Error { public function __construct(public string $code, public string $message) {} }
function is_wp_error($v): bool { return $v instanceof WP_Error; }
function add_action(): void {}
function wp_json_encode($v): string { return json_encode($v, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE); }
function get_post_type(): string { return 'tio2_market_page'; }
function get_post_status(): string { return 'publish'; }
function get_post_field($key): string { return $key === 'post_name' ? 'tio2-my-market-uk-001' : '2026-09-05 01:02:03'; }
$mode='valid';
$contract=file_get_contents('/work/wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json');
function get_post_meta($id,$key) { global $mode,$contract; return $key==='public_path' ? ($mode==='wrong-path'?'/markets/european-union':'/markets/united-kingdom') : ($mode==='invalid-payload'?'{}':$contract); }
function get_posts($args): array {
  global $mode;
  if ($args['name'] !== 'tio2-my-market-uk-001' || $args['numberposts'] !== 2 || $args['post_status'] !== 'publish') throw new \RuntimeException('Unscoped UK singleton query');
  return $mode==='missing'?[]:($mode==='multiple'?[1,2]:[1]);
}
function wp_get_post_terms(): array { global $mode; return match($mode) {'foreign'=>['tio2-a'],'mixed'=>['tio2-my','tio2-b'],'no-scope'=>[],default=>['tio2-my']}; }
function tio2_my_product_target_ready($id,$href): bool { if (!str_starts_with($href,'/') || str_starts_with($href,'//')) throw new \RuntimeException('Invalid relation'); return false; }
function register_graphql_field($root,$name,$args): void { if($root!=='RootQuery'||$name!=='malaysiaUkMarketRecordJson'||$args['type']!==['non_null'=>'String'])throw new \RuntimeException('Wrong GraphQL contract'); }
require '/work/wordpress/plugins/tio2-site-model/includes/market-page-uk-v01.php';
tio2_register_market_page_uk_v01_graphql_field();
foreach(['missing','multiple','foreign','mixed','no-scope','wrong-path','invalid-payload'] as $case){
  $mode=$case;
  try{tio2_resolve_malaysia_uk_market_record_json();throw new \RuntimeException('Expected fail closed: '.$case);}catch(\GraphQL\Error\UserError $e){}
}
$mode='valid';$result=json_decode(tio2_resolve_malaysia_uk_market_record_json(),true);
if($result['siteScopes']['nodes']!==[['slug'=>'tio2-my']]||count($result['routeReadiness'])!==20||array_filter($result['routeReadiness']))throw new \RuntimeException('Invalid scoped output');
echo "UK resolver: 7 negative cases, valid scoped payload, 20 conservative route states and String! contract PASS\n";
}
