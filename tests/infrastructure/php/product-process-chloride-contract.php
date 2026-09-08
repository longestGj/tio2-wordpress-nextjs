<?php
define('ABSPATH', '/tmp/');
class WP_Error { public function __construct(public string $code, public string $message) {} }
function add_action(...$args): void {}
function is_wp_error($value): bool { return $value instanceof WP_Error; }
require '/work/wordpress/plugins/tio2-site-model/includes/product-process-chloride-v01.php';
$json = file_get_contents('/work/wordpress/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json');
if (true !== tio2_validate_chloride_process_payload($json)) throw new RuntimeException('Approved payload rejected.');
$payload = json_decode($json, true);
$reordered = $payload; $reordered['grades'] = array_reverse($reordered['grades']);
if (true !== tio2_validate_chloride_process_payload(json_encode($reordered, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))) throw new RuntimeException('Valid transport permutation rejected.');
$mutations = [
    function ($p) { array_pop($p['grades']); return $p; },
    function ($p) { $p['grades'][7]=$p['grades'][0]; return $p; },
    function ($p) { $p['grades'][0]['registeredPageId']='GRADE-M2377'; return $p; },
    function ($p) { $p['grades'][0]['gradeNameOrModelCode']='M-510'; return $p; },
    function ($p) { $p['grades'][0]['cleanUrl']='/products/m-510/'; return $p; },
    function ($p) { $p['grades'][0]['summary']='Best grade.'; return $p; },
    function ($p) { $p['grades'][0]['position']=2; return $p; },
    function ($p) { $p['identity']['siteScope']='tio2-a'; return $p; },
    function ($p) { $p['modules'][0]['heading']='<script>'; return $p; },
];
foreach ($mutations as $mutate) {
    if (true === tio2_validate_chloride_process_payload(json_encode($mutate($payload), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))) {
        throw new RuntimeException('Unsafe mutation accepted.');
    }
}
echo "Chloride Process PHP contract PASS\n";
