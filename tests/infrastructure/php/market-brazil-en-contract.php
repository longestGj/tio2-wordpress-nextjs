<?php
define('ABSPATH', '/tmp/');
class WP_Error { public function __construct(public string $code, public string $message) {} }
function add_action(...$args): void {}
function is_wp_error($value): bool { return $value instanceof WP_Error; }
require '/work/wordpress/plugins/tio2-site-model/includes/market-page-brazil-en-v01.php';
$json = file_get_contents('/work/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-en.json');
if (true !== tio2_validate_brazil_en_market_payload($json)) throw new RuntimeException('Approved payload rejected.');
$payload = json_decode($json, true);
$mutations = [
    function ($p) { $p['identity']['siteScope']='tio2-a'; return $p; },
    function ($p) { $p['modules'][0]['actions'][0]['context']['destinationCountry']='Argentina'; return $p; },
    function ($p) { $p['modules'][2]['actions'][0]['href']='/request-a-quote/'; return $p; },
    function ($p) { $p['modules'][1]['cards']=array_reverse($p['modules'][1]['cards']); return $p; },
    function ($p) { $p['modules'][0]['heading']='<script>'; return $p; },
];
foreach ($mutations as $mutate) {
    if (true === tio2_validate_brazil_en_market_payload(json_encode($mutate($payload), JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES))) {
        throw new RuntimeException('Unsafe mutation accepted.');
    }
}
echo "Brazil English PHP contract PASS\n";
