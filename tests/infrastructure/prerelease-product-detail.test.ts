import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {expect, it} from 'vitest'

it('accepts fourteen local and production grades while preserving tuple, scope and payload guards', () => {
  const php = `<?php
define('ABSPATH','/plugin');
define('TIO2_MY_ROUTE_PAGE_ID_META','page');define('TIO2_MY_ROUTE_CANONICAL_META','canonical');define('TIO2_MY_ROUTE_RELEASE_STATE_META','state');
class WP_Error { public function __construct(public string $code, public string $text=''){} }
function is_wp_error($v){return $v instanceof WP_Error;} function add_action(){}
function wp_json_encode($v,$flags=0){return json_encode($v,$flags);}
function wp_get_environment_type(){return $GLOBALS['env'];}
function get_post_type($id){return 'tio2_grade';}
function wp_get_post_terms($id,$taxonomy,$args){return $GLOBALS['scope'];}
function get_post_meta($id,$key,$single){return $GLOBALS['meta'][$key]??null;}
function get_post_field($field,$id){return $GLOBALS['slug'];}
require '/plugin/includes/product-detail-v01.php';
$out=[];$grades=tio2_my_product_detail_approved_grades();
foreach(['local','production'] as $environment){foreach($grades as $grade){
 $GLOBALS['env']=$environment;$GLOBALS['scope']=['tio2-my'];$GLOBALS['slug']=$grade['internal_slug'];
 $GLOBALS['meta']=['page'=>$grade['page_id'],'canonical'=>$grade['canonical'],'state'=>'LIVE_APPROVED','public_path'=>$grade['public_path'],TIO2_MY_PRODUCT_DETAIL_CONTRACT_META=>$grade['contract_json']];
 $v=tio2_validate_product_detail_v01_contract(1);$out[$grade['page_id'].'-'.$environment]=is_wp_error($v)?$v->code:$v;
}}
$baseline=$GLOBALS['meta'];$baselineSlug=$GLOBALS['slug'];
foreach(['preview','production','staging','wrong_state','wrong_page','wrong_path','wrong_canonical','wrong_slug','wrong_scope','wrong_payload'] as $case){
 $GLOBALS['meta']=$baseline;$GLOBALS['env']='production';$GLOBALS['scope']=['tio2-my'];$GLOBALS['slug']=$baselineSlug;
 if($case==='preview'){$GLOBALS['meta']['state']='PREVIEW_ONLY';$GLOBALS['env']='production';}
 if(in_array($case,['production','staging'],true))$GLOBALS['env']=$case;
 if($case==='wrong_state')$GLOBALS['meta']['state']='UNKNOWN';
 if($case==='wrong_page')$GLOBALS['meta']['page']='GRADE-OTHER';
 if($case==='wrong_path')$GLOBALS['meta']['public_path']='/products/other';
 if($case==='wrong_canonical')$GLOBALS['meta']['canonical']='https://other.test/products/other/';
 if($case==='wrong_slug')$GLOBALS['slug']='other';
 if($case==='wrong_scope')$GLOBALS['scope']=['tio2-a'];
 if($case==='wrong_payload')$GLOBALS['meta'][TIO2_MY_PRODUCT_DETAIL_CONTRACT_META]='{}';
 $v=tio2_validate_product_detail_v01_contract(1);$out[$case]=is_wp_error($v)?$v->code:$v;
}
echo json_encode($out);`
  const result = spawnSync('docker', ['run', '--rm', '-i', '--mount', `type=bind,source=${resolve('wordpress/plugins/tio2-site-model')},target=/plugin,readonly`, '--entrypoint', 'php', 'wordpress:php8.3-apache', '/dev/stdin'], {input: php, encoding: 'utf8', timeout: 60_000})
  expect(result.status, result.stderr).toBe(0)
  const output = JSON.parse(result.stdout)
  const approved = Object.entries(output).filter(([key]) => key.startsWith('GRADE-'))
  expect(approved).toHaveLength(28)
  expect(approved.map(([, value]) => value)).toEqual(Array(28).fill(true))
  expect(output.preview).toBe(true)
  expect(output.production).toBe(true)
  for (const key of ['staging','wrong_state','wrong_path','wrong_canonical','wrong_slug']) expect(output[key], key).toBe('tio2_my_product_detail_invalid_route')
  expect(output.wrong_page).toBe('tio2_my_product_detail_invalid_identity')
  expect(output.wrong_scope).toBe('tio2_my_product_detail_invalid_scope')
  expect(output.wrong_payload).toBe('tio2_my_product_detail_contract_mismatch')
}, 60_000)
