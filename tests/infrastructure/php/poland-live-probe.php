<?php
// Explicit local-only, one-record probe. wp eval-file passes the approved record ID.
if ('local' !== wp_get_environment_type()) throw new RuntimeException('Local WordPress required.');
$id = (int)($args[0] ?? 0);
if (!$id || tio2_poland_market_candidate_ids() !== [$id] || true !== tio2_validate_market_page_poland_v01_contract($id) || 'publish' !== get_post_status($id)) {
    throw new RuntimeException('Probe requires the exact, valid, published Poland record.');
}
$key = TIO2_MY_POLAND_MARKET_CONTRACT_META;
$original = get_post_meta($id, $key, true);
$expected_hash = (string)($args[1] ?? '');
if (hash('sha256', $original) !== $expected_hash) throw new RuntimeException('Content changed since the approved probe baseline.');
function poland_probe_graphql(): array {
    $result = graphql(['query'=>'query PolandProbe { malaysiaPolandMarketRecordJson }']);
    if (!empty($result['errors']) || empty($result['data']['malaysiaPolandMarketRecordJson'])) throw new RuntimeException('Live GraphQL probe failed.');
    return json_decode($result['data']['malaysiaPolandMarketRecordJson'], true, 512, JSON_THROW_ON_ERROR);
}
$before = poland_probe_graphql();
try {
    $changed = json_decode($original, true, 512, JSON_THROW_ON_ERROR);
    $changed['modules'][1]['paragraphs'][0] = 'Temporary local Poland editorial verification.';
    $changed_json = wp_json_encode($changed);
    if (true !== tio2_validate_poland_market_payload($changed_json)) throw new RuntimeException('Invalid probe content.');
    update_post_meta($id, $key, wp_slash($changed_json));
    $edited = poland_probe_graphql();
} finally {
    update_post_meta($id, $key, wp_slash($original));
    if (get_post_meta($id, $key, true) !== $original) throw new RuntimeException('Poland probe restoration failed; inspect only post '.$id.'.');
}
$restored = poland_probe_graphql();
echo wp_json_encode(['postId'=>$id,'before'=>$before,'edited'=>$edited,'restored'=>$restored,'restoredSha256'=>hash('sha256',get_post_meta($id,$key,true))]).PHP_EOL;
