<?php
// Only the three newly approved source IDs; exact before/after and task guard.
if(wp_get_environment_type()!=='local' || get_option('tio2_editorial_task_id')!=='G8-DE-IT-SU-R706-CHEMOURS-20260908-01') throw new RuntimeException('Task-owned local CMS required.');
$ids=get_posts(['post_type'=>'tio2_rfq_page','post_status'=>'publish','name'=>'tio2-my-request-a-quote','fields'=>'ids','numberposts'=>2]);
if(count($ids)!==1 || wp_get_post_terms($ids[0],'site_scope',['fields'=>'slugs'])!==['tio2-my'] || get_post_meta($ids[0],'public_path',true)!=='/request-a-quote') throw new RuntimeException('RFQ identity mismatch.');
$before=(string)file_get_contents('/workspace/.tmp/rfq-before.json');
$after=tio2_my_rfq_page_approved_contract_json();
if(is_wp_error($after))throw new RuntimeException('RFQ contract unavailable.');
$previous=json_decode($before,true);$next=json_decode($after,true);
$previous['prefill']['approvedSourcePageIds']=array_merge($previous['prefill']['approvedSourcePageIds'],['MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU']);
if($previous!==$next)throw new RuntimeException('RFQ delta exceeds approved source IDs.');
$stored=get_post_meta($ids[0],TIO2_MY_RFQ_PAGE_CONTRACT_META,true);
if(json_decode($stored,true)!==json_decode($before,true) && $stored!==$after)throw new RuntimeException('RFQ baseline mismatch.');
if(($args[0]??'Plan')==='Apply'){
 update_post_meta($ids[0],TIO2_MY_RFQ_PAGE_CONTRACT_META,wp_slash($after));
 if(is_wp_error(tio2_validate_rfq_page_v01_contract($ids[0]))){update_post_meta($ids[0],TIO2_MY_RFQ_PAGE_CONTRACT_META,wp_slash($stored));throw new RuntimeException('RFQ update rolled back.');}
}
echo wp_json_encode(['mode'=>$args[0]??'Plan','id'=>$ids[0],'scope'=>'tio2-my','sha256'=>hash('sha256',$after)]);
