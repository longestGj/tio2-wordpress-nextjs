<?php

// Fixed reviewed read-only probe: no caller-supplied script, paths or PHP input.
function tio2_read_only_editorial_preview_probe(string $site_id,string $path):array{
  $config=tio2_get_preview_config($site_id);
  if(!is_array($config)){throw new RuntimeException('Missing local preview config.');}
  $timestamp=(string)time();
  $request=new WP_REST_Request('GET','/tio2/v1/preview');
  $request->set_param('siteId',$site_id);
  $request->set_param('path',$path);
  $request->set_header('x-tio2-preview-timestamp',$timestamp);
  $request->set_header('x-tio2-preview-signature',hash_hmac('sha256',tio2_preview_signature_message($timestamp,$site_id,$path),$config['secret']));
  $response=rest_do_request($request);
  $response=apply_filters('rest_post_dispatch',$response,rest_get_server(),$request);
  return ['status'=>$response->get_status(),'headers'=>$response->get_headers(),'data'=>$response->get_data()];
}
$paths=['/applications','/applications/coatings','/applications/titanium-dioxide-for-water-based-paint','/resources','/resources/titanium-dioxide-surface-treatment'];
$targets=[];foreach($paths as $path){$targets[$path]=tio2_read_only_editorial_preview_probe('tio2-a',$path);}
$closed=[tio2_read_only_editorial_preview_probe('tio2-b','/applications'),tio2_read_only_editorial_preview_probe('tio2-a','/resources/not-approved')];
echo 'TIO2_SITE_A_EDITORIAL_PHASE1_PREVIEW '.wp_json_encode(['targets'=>$targets,'closed'=>$closed]);
