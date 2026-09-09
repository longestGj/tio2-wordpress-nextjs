import {spawnSync} from 'node:child_process'
import {resolve} from 'node:path'
import {describe,it,expect} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'
import evidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-alternatives-review-evidence.json'
import {getEditorialContract} from '@/lib/editorial/malaysia-editorial-contracts'
import {assertEditorialReview} from '@/lib/editorial/editorial-review'
import {filterReviewedTradeCards} from '@/lib/editorial/editorial-hub-freshness'
import {projectEligibleMalaysiaResources,toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {malaysiaResourceHubSource} from '@/tests/fixtures/tio2-my-resource-hub'
import {buildMalaysiaResourceHubJsonLd,buildMalaysiaResourceReleaseSitemap} from '@/lib/seo/resource-hub-jsonld'
import {getSiteConfig} from '@/sites'

const cases=evidence.pages.flatMap(entry=>['current','event_pending','withdrawn','expired'].map(state=>({
 pageId:entry.pageId,state,now:state==='expired'?'2026-12-05T16:00:00Z':'2026-09-09T12:00:00Z',
 review:{...entry.currentReview,...(state==='event_pending'?{eventStatus:'event_pending'}:state==='withdrawn'?{status:'withdrawn'}:{})},
})))
function phpProjections(){
 const data=Buffer.from(JSON.stringify(cases)).toString('base64')
 // The disposable PHP harness replaces only the outer wall-clock constructor.
 // The exact production review validator and projection functions are evaluated unchanged.
 const php=`<?php
 define('ABSPATH','/plugin');define('TIO2_EDITORIAL_META','contract');define('TIO2_EDITORIAL_REVIEW_META','review');
 function add_action(){}function wp_parse_url($u){return parse_url($u);}function is_wp_error($v){return $v===false;}
 function tio2_editorial_ids(){return ['RES-CHEMOURS','RES-R706'];}
 function tio2_editorial_candidates($id){return [$id];}
 function tio2_editorial_validate_record($id,$page){return true;}
 function get_post_meta($id,$key,$single){return $key==='contract'?file_get_contents('/plugin/config/tio2-my-editorial-'.strtolower($id).'.json'):$GLOBALS['vector']['review'];}
 $source=file_get_contents('/plugin/includes/editorial-review.php');
 $source=str_replace('__DIR__',var_export('/plugin/includes',true),$source);
 $source=str_replace("new DateTimeImmutable('now',new DateTimeZone('Asia/Kuala_Lumpur'))","new DateTimeImmutable(\\$GLOBALS['vector']['now'],new DateTimeZone('Asia/Kuala_Lumpur'))",$source);
 eval(substr($source,5));
 require '/plugin/includes/resource-hub-v01.php';
 $contract=json_decode(file_get_contents('/plugin/config/tio2-my-resource-hub.json'),true);$out=[];
 foreach(json_decode(base64_decode('${data}'),true) as $vector){
  $GLOBALS['vector']=$vector;
  $relations=array_values(array_filter($contract['resourceRelations'],fn($r)=>$r['pageId']===$vector['pageId']));
  $out[]=tio2_my_resource_public_projection($relations,null,fn($id,$path)=>true);
 }
 echo json_encode($out);`
 const result=spawnSync('docker',['run','--rm','-i','--mount',`type=bind,source=${resolve('wordpress/plugins/tio2-site-model')},target=/plugin,readonly`,'--entrypoint','php','wordpress:php8.3-apache','/dev/stdin'],{input:php,encoding:'utf8',timeout:60000})
 expect(result.status,result.stderr+String(result.error??'')).toBe(0)
 return JSON.parse(result.stdout)
}

describe('alternatives review PHP and TypeScript resource projection parity',()=>{
 it('omits each ready alternative atomically for pending, withdrawn and expired reviews',async()=>{
  const actual=phpProjections()
  for(const [index,vector] of cases.entries()){
   const relations=contract.resourceRelations.filter(item=>item.pageId===vector.pageId)
   const hub=toMalaysiaResourceHubDto({...malaysiaResourceHubSource(),resourceProjection:projectEligibleMalaysiaResources(relations)})
   const filtered=await filterReviewedTradeCards(hub,async pageId=>{
    try{assertEditorialReview(getEditorialContract(pageId),vector.review,new Date(vector.now));return true}catch{return false}
   })
   expect(actual[index],vector.pageId+' '+vector.state).toEqual({publicState:filtered.publicState,resourceGroups:filtered.resourceGroups})
   expect(filtered.publicState).toBe(vector.state==='current'?'H2_ONE_PUBLIC_RESOURCE':'H0_NO_QUALIFIED_RESOURCE')
   const ids=filtered.resourceGroups.flatMap(group=>group.items.map(item=>item.pageId))
   expect(ids).toEqual(vector.state==='current'?[vector.pageId]:[])
   const schema=buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'),filtered)
   const list=(schema['@graph'] as Record<string,unknown>[]).find(node=>node['@type']==='ItemList')
   expect(list?.numberOfItems??0).toBe(ids.length)
   expect(buildMalaysiaResourceReleaseSitemap(filtered).map(item=>item.url)).toEqual(vector.state==='current'?[relations[0].canonicalUrl]:[])
  }
 })
})
