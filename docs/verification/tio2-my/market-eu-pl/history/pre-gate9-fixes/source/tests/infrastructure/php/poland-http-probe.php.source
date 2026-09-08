<?php
// Local HTTP integration probe: exactly one record and a verified seed baseline.
if ('local' !== wp_get_environment_type()) throw new RuntimeException('Local WordPress required.');
$id = (int)($args[0] ?? 0);
$mode = (string)($args[1] ?? '');
if (!in_array($mode, ['edit','restore'], true) || !$id || tio2_poland_market_candidate_ids() !== [$id] || true !== tio2_validate_market_page_poland_v01_contract($id)) {
    throw new RuntimeException('Exact valid Poland record and edit/restore mode required.');
}
$original = file_get_contents('/workspace/wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json');
if (hash('sha256',$original) !== ($args[2] ?? '')) throw new RuntimeException('Seed baseline changed.');
$payload = json_decode($original, true, 512, JSON_THROW_ON_ERROR);
$payload['modules'][1]['paragraphs'][0] = 'Temporary local Poland HTTP cache verification.';
$edited = wp_json_encode($payload);
$key = TIO2_MY_POLAND_MARKET_CONTRACT_META;
$current = get_post_meta($id,$key,true);
if ($mode === 'edit' ? $current !== $original : !in_array($current,[$edited,$original],true)) {
    throw new RuntimeException('Record changed outside this probe; refusing overwrite.');
}
$target = $mode === 'edit' ? $edited : $original;
update_post_meta($id,$key,wp_slash($target));
if (get_post_meta($id,$key,true) !== $target) throw new RuntimeException('Probe write verification failed.');
echo wp_json_encode(['postId'=>$id,'mode'=>$mode,'sha256'=>hash('sha256',$target)]).PHP_EOL;
