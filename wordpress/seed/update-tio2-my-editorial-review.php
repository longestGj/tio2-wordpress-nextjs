<?php

// wp eval-file wordpress/seed/update-tio2-my-editorial-review.php [Plan|Apply] RES-TRADE-EU
// Updates one task-owned local review record. It never writes the approved editorial body.
$mode=(string)($args[0]??'Plan');
$page_id=(string)($args[1]??'');
$trade_ids=['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR'];
$task_id='G8-TRADE4-APP5-20260908-01';
$history_meta='_tio2_my_editorial_review_history';
$ledger_path='/workspace/.tmp/editorial-source-reviews.json';

if (!in_array($mode,['Plan','Apply'],true) || !in_array($page_id,$trade_ids,true)) throw new RuntimeException('Use Plan or Apply with exactly one authorized Trade Page ID.');
if (wp_get_environment_type()!=='local' || get_option('tio2_editorial_task_id')!==$task_id) throw new RuntimeException('Review update requires this task-owned local CMS.');
if (!is_file($ledger_path)) throw new RuntimeException('Dated source review ledger is required.');
try {
    $ledger=json_decode((string)file_get_contents($ledger_path),true,512,JSON_THROW_ON_ERROR);
} catch (Throwable $error) {
    throw new RuntimeException('Dated source review ledger is invalid.');
}
if (!is_array($ledger) || !array_key_exists($page_id,$ledger) || !is_array($ledger[$page_id])) throw new RuntimeException('The named page has no review in the ledger.');

$json=tio2_editorial_config($page_id);
$payload=json_decode($json,true);
if (!is_array($payload) || is_wp_error(tio2_editorial_validate_payload($page_id,$json)) || !tio2_editorial_review_valid($payload,$ledger[$page_id])) throw new RuntimeException('Review is not bound to the approved page, policy and evidence manifest.');
$ids=tio2_editorial_candidates($page_id);
if (count($ids)!==1 || is_wp_error(tio2_editorial_validate_record((int)$ids[0],$page_id))) throw new RuntimeException('Named page must resolve to exactly one valid published record.');

$post_id=(int)$ids[0];
$body_before=(string)get_post_meta($post_id,TIO2_EDITORIAL_META,true);
$before_review=metadata_exists('post',$post_id,TIO2_EDITORIAL_REVIEW_META)?get_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,true):null;
$before_history=metadata_exists('post',$post_id,$history_meta)?get_post_meta($post_id,$history_meta,true):null;
if ($before_history!==null && (!is_array($before_history) || !array_is_list($before_history))) throw new RuntimeException('Existing review history is malformed.');
$incoming=$ledger[$page_id];
$json_hash=static function($value):string {
    $encoded=wp_json_encode($value,JSON_UNESCAPED_SLASHES|JSON_UNESCAPED_UNICODE);
    if (!is_string($encoded)) throw new RuntimeException('Could not hash review state.');
    return hash('sha256',$encoded);
};
$plan=[
    'mode'=>$mode,
    'taskId'=>$task_id,
    'pageId'=>$page_id,
    'postId'=>$post_id,
    'bodySha256'=>hash('sha256',$body_before),
    'beforeReviewSha256'=>$json_hash($before_review),
    'afterReviewSha256'=>$json_hash($incoming),
    'historyCount'=>is_array($before_history)?count($before_history):0,
    'changeRequired'=>$before_review!==$incoming,
    'status'=>$incoming['status']??null,
    'eventStatus'=>$incoming['eventStatus']??null,
    'nextReviewDue'=>$incoming['nextReviewDue']??null,
];
if ($mode==='Plan') {echo wp_json_encode($plan).PHP_EOL; return;}

if ($before_review===$incoming) {
    $readback=json_decode(tio2_editorial_resolve(null,['pageId'=>$page_id,'siteScope'=>'tio2-my']),true);
    if (!is_array($readback) || ($readback['freshnessControl']??null)!==$incoming || (string)get_post_meta($post_id,TIO2_EDITORIAL_META,true)!==$body_before) throw new RuntimeException('Idempotent review readback failed.');
    echo wp_json_encode(['mode'=>'Apply','pageId'=>$page_id,'postId'=>$post_id,'changed'=>false,'reviewSha256'=>$json_hash($incoming),'bodySha256'=>hash('sha256',$body_before)]).PHP_EOL;
    return;
}

$history=is_array($before_history)?$before_history:[];
$history[]=[
    'taskId'=>$task_id,
    'pageId'=>$page_id,
    'changedAt'=>gmdate('Y-m-d\TH:i:s\Z'),
    'beforeReview'=>$before_review,
    'afterReview'=>$incoming,
    'beforeReviewSha256'=>$json_hash($before_review),
    'afterReviewSha256'=>$json_hash($incoming),
];

try {
    if (update_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,$incoming)===false) throw new RuntimeException('Review metadata update failed.');
    if (update_post_meta($post_id,$history_meta,$history)===false) throw new RuntimeException('Review history update failed.');
    $stored_review=get_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,true);
    $stored_history=get_post_meta($post_id,$history_meta,true);
    $stored_body=(string)get_post_meta($post_id,TIO2_EDITORIAL_META,true);
    if ($stored_review!==$incoming || $stored_history!==$history || $stored_body!==$body_before || !tio2_editorial_review_valid($payload,$stored_review)) throw new RuntimeException('Review or immutable body readback failed.');
    $readback=json_decode(tio2_editorial_resolve(null,['pageId'=>$page_id,'siteScope'=>'tio2-my']),true);
    if (!is_array($readback) || ($readback['freshnessControl']??null)!==$incoming || ($readback['editorialContractJson']??null)!==$body_before) throw new RuntimeException('Resolved review readback failed.');
    echo wp_json_encode(['mode'=>'Apply','pageId'=>$page_id,'postId'=>$post_id,'changed'=>true,'historyCount'=>count($history),'reviewSha256'=>$json_hash($incoming),'bodySha256'=>hash('sha256',$body_before)]).PHP_EOL;
} catch (Throwable $error) {
    $rollback_errors=[];
    if ($before_review===null) {
        delete_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META);
    } elseif (update_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,$before_review)===false && get_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,true)!==$before_review) {
        $rollback_errors[]='review';
    }
    if ($before_history===null) {
        delete_post_meta($post_id,$history_meta);
    } elseif (update_post_meta($post_id,$history_meta,$before_history)===false && get_post_meta($post_id,$history_meta,true)!==$before_history) {
        $rollback_errors[]='history';
    }
    $review_rolled_back=$before_review===null?!metadata_exists('post',$post_id,TIO2_EDITORIAL_REVIEW_META):get_post_meta($post_id,TIO2_EDITORIAL_REVIEW_META,true)===$before_review;
    $history_rolled_back=$before_history===null?!metadata_exists('post',$post_id,$history_meta):get_post_meta($post_id,$history_meta,true)===$before_history;
    $body_unchanged=(string)get_post_meta($post_id,TIO2_EDITORIAL_META,true)===$body_before;
    if (!$review_rolled_back) $rollback_errors[]='review-readback';
    if (!$history_rolled_back) $rollback_errors[]='history-readback';
    if (!$body_unchanged) $rollback_errors[]='body-readback';
    $suffix=$rollback_errors?'; rollback failed: '.implode(',',$rollback_errors):'; rollback verified';
    throw new RuntimeException($error->getMessage().$suffix,0,$error);
}
