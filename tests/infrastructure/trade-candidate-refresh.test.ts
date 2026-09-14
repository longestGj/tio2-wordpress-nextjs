import {readFileSync} from 'node:fs'
import {execFileSync,spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {describe,it,expect} from 'vitest'
const seed='wordpress/seed/refresh-tio2-my-trade-candidate.php'
const prior=Object.fromEntries(['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR'].map(id=>[id,execFileSync('git',['show',`53da53fb:wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`],{encoding:'utf8'})]))
const oldReviews=JSON.parse(execFileSync('git',['show','53da53fb:wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'],{encoding:'utf8'})).pages
function run(scenario:string){
 const payload=Buffer.from(JSON.stringify({prior,oldReviews,scenario})).toString('base64')
 const php=`<?php
 define('ABSPATH','/workspace');define('WP_CLI',true);define('TIO2_EDITORIAL_META','contract');define('TIO2_EDITORIAL_REVIEW_META','review');
 $input=json_decode(base64_decode('${payload}'),true);$scenario=$input['scenario'];$writes=0;$records=[];
 foreach(['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR'] as $i=>$page){$records[$i+1]=['page'=>$page,'scope'=>['tio2-my'],'contract'=>$input['prior'][$page],'review'=>array_values(array_filter($input['oldReviews'],fn($r)=>$r['pageId']===$page))[0]['currentReview']];}
 function wp_get_environment_type(){return 'local';}function is_wp_error($v){return $v===false;}function wp_slash($v){return $v;}function wp_json_encode($v){return json_encode($v);}
 function tio2_editorial_config($id){return file_get_contents('/workspace/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-'.strtolower($id).'.json');}
 function tio2_editorial_identity($id){$c=json_decode(tio2_editorial_config($id),true);return ['slug'=>'tio2-my-editorial-'.strtolower($id),'path'=>rtrim($c['identity']['path'],'/')];}
 function tio2_editorial_validate_payload($id,$json){return $json===tio2_editorial_config($id);}
 function tio2_editorial_review_manifest($id){return json_decode(file_get_contents('/workspace/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'),true);}
 function review_for($id){foreach(tio2_editorial_review_manifest($id)['pages'] as $p)if($p['pageId']===$id)return $p['currentReview'];}
 function tio2_editorial_review_valid($p,$r){return $r===review_for($p['identity']['pageId']);}
 function tio2_editorial_candidates($id){global $records;return array_keys(array_filter($records,fn($r)=>$r['page']===$id));}
 function get_post_type($id){return 'tio2_my_editorial';}function get_post_status($id){return 'publish';}
 function wp_get_post_terms($id,$tax,$args){global $records;return $records[$id]['scope'];}
 function get_post_field($key,$id){global $records;return tio2_editorial_identity($records[$id]['page'])['slug'];}
 function get_post_meta($id,$key,$single){global $records;$r=$records[$id];return $key==='public_path'?tio2_editorial_identity($r['page'])['path']:($key==='_tio2_editorial_page_id'?$r['page']:$r[$key]);}
 function update_post_meta($id,$key,$value){global $records,$writes;$records[$id][$key]=$value;$writes++;return true;}
 function clean_post_cache($id){}
 function tio2_editorial_validate_record($id,$page){global $scenario,$records;if($scenario==='partial-failure'&&$id===2&&$records[$id]['contract']===tio2_editorial_config($page))return false;return $records[$id]['contract']===tio2_editorial_config($page);}
 if($scenario==='crlf')foreach($records as &$r){$r['contract']=str_replace("\\n","\\r\\n",$r['contract']);}unset($r);
 if($scenario==='scope')$records[2]['scope']=['tio2-a'];
 if($scenario==='hash')$records[2]['contract'].='changed';
 if($scenario==='review')$records[2]['review']['eventStatus']='event_pending';
 if($scenario==='duplicate')$records[5]=$records[2];
 if($scenario==='absent')$records=[];
 if($scenario==='idempotent')foreach($records as &$r){$r['contract']=tio2_editorial_config($r['page']);$r['review']=review_for($r['page']);}unset($r);
 $before=$records;$args=['Apply'];putenv('D16_TIO2_MY_PRERELEASE_TRADE_REFRESH='.($scenario==='no-optin'?'0':'1'));
 ob_start();$error=null;try{include '/workspace/${seed}';}catch(Throwable $e){$error=$e->getMessage();}ob_end_clean();
 echo json_encode(['error'=>$error,'writes'=>$writes,'restored'=>$before===$records,'records'=>$records]);`
 const result=spawnSync('docker',['run','--rm','-i','--mount',`type=bind,source=${resolve('.')},target=/workspace,readonly`,'--entrypoint','php','wordpress:php8.3-apache','/dev/stdin'],{input:php,encoding:'utf8',timeout:60000})
 expect(result.status,result.stderr+String(result.error??'')).toBe(0)
 return JSON.parse(result.stdout) as {error:string|null;writes:number;restored:boolean;records:unknown}
}
describe('bounded Trade successor refresh seed',()=>{
 it('accepts the same historical bytes with Windows line endings',()=>{const r=run('crlf');expect(r.error).toBeNull();expect(r.writes).toBe(8)})
 it('upgrades only four exact historical payloads and their review binding',()=>{const r=run('upgrade');expect(r.error).toBeNull();expect(r.writes).toBe(8);expect(r.restored).toBe(false)})
 it.each(['scope','hash','review','duplicate','no-optin'])('preflights all records before any write: %s',scenario=>{const r=run(scenario);expect(r.error).not.toBeNull();expect(r.writes).toBe(0);expect(r.restored).toBe(true)}, 60000)
 it.each(['idempotent','absent'])('does not write for %s',scenario=>{const r=run(scenario);expect(r.error).toBeNull();expect(r.writes).toBe(0);expect(r.restored).toBe(true)})
 it('restores only its own metadata after partial readback failure',()=>{const r=run('partial-failure');expect(r.error).not.toBeNull();expect(r.restored).toBe(true);expect(r.writes).toBe(8)})
 it('binds source hash and ordering before the retained create-only seed',()=>{
  const manifest=JSON.parse(readFileSync('ops/prerelease/seed-manifest.json','utf8')).seeds as {path:string;sha256:string}[]
  const index=manifest.findIndex(item=>item.path===seed)
  expect(readFileSync('.gitattributes','utf8')).toContain(seed+' text eol=lf')
  expect(index).toBeGreaterThanOrEqual(0)
  expect(manifest[index+1].path).toBe('wordpress/seed/apply-tio2-my-editorial.php')
  expect(readFileSync('ops/prerelease/bootstrap-wordpress.sh','utf8')).toContain('D16_TIO2_MY_PRERELEASE_TRADE_REFRESH=1')
 })
})
