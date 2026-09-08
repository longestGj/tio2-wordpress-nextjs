<?php
if (!function_exists('tio2_editorial_resolve')) throw new RuntimeException('Editorial CMS model missing.');
$extracted=tio2_editorial_internal_paths(['bodyHtml'=>'<a href="/products/">Products</a><a href="#local">Local</a><a href="https://example.com">Source</a><a href="//foreign.example">Foreign</a><a href="/request-sample/?x=1">Query</a>']);
if ($extracted!==['/products/']) throw new RuntimeException('Editorial internal-target extraction is not exact.');
if (tio2_editorial_unavailable_internal_paths('APP-COAT',['bodyHtml'=>'<a href="/not-ready/">Target</a>'])!==[]) throw new RuntimeException('Non-authorized link suppression expanded beyond APP-INK/PAPER.');
$results=[];
foreach (['', 'tio2-a', 'tio2-b', 'invalid'] as $scope) {
    try { tio2_editorial_resolve(null, ['siteScope'=>$scope,'pageId'=>'APP-COAT']); throw new RuntimeException('Scope leaked.'); }
    catch (\GraphQL\Error\UserError $error) { $results[]=['scope'=>$scope,'rejected'=>true]; }
}
try { tio2_editorial_resolve(null, ['siteScope'=>'tio2-my','pageId'=>'UNKNOWN']); throw new RuntimeException('Unknown identity leaked.'); }
catch (\GraphQL\Error\UserError $error) { $results[]=['pageId'=>'UNKNOWN','rejected'=>true]; }
foreach(tio2_editorial_ids() as $page_id) {
    $json=tio2_editorial_config($page_id);
    if (is_wp_error(tio2_editorial_validate_payload($page_id,$json))) throw new RuntimeException('Approved payload rejected: '.$page_id);
    $changed=json_decode($json,true); $changed['bodyHtml']='<p>Unapproved replacement</p>';
    if (!is_wp_error(tio2_editorial_validate_payload($page_id,wp_json_encode($changed)))) throw new RuntimeException('Changed body accepted.');
    $results[]=['pageId'=>$page_id,'approvedPayload'=>true,'changedPayloadRejected'=>true];
}
echo wp_json_encode(['environment'=>wp_get_environment_type(),'results'=>$results]);
