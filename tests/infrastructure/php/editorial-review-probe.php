<?php
declare(strict_types=1);

$root=dirname(__DIR__,3);
$implementation=$root.'/wordpress/plugins/tio2-site-model/includes/editorial-review.php';
if (!is_file($implementation)) {
    fwrite(STDERR,"editorial-review.php is missing\n");
    exit(1);
}
if (!defined('ABSPATH')) define('ABSPATH',$root.'/wordpress/');
require_once $implementation;

$manifest=json_decode((string)file_get_contents($root.'/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'),true);
$now=new DateTimeImmutable('2026-09-08T12:00:00Z');
$beforeBoundary=new DateTimeImmutable('2026-10-07T15:59:59Z');
$afterBoundary=new DateTimeImmutable('2026-10-07T16:00:00Z');
$cases=[];

foreach ($manifest['pages']??[] as $page) {
    $page_id=(string)$page['pageId'];
    $suffix=strtolower($page_id);
    $payload=json_decode((string)file_get_contents($root.'/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-'.$suffix.'.json'),true);
    $review=$page['currentReview'];
    $cases['valid-'.$page_id]=tio2_editorial_review_valid_at($payload,$review,$now)===true;
}

$page=$manifest['pages'][0];
$payload=json_decode((string)file_get_contents($root.'/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-eu.json'),true);
$review=$page['currentReview'];
$mutations=[
    'unverified'=>array_replace($review,['status'=>'unverified']),
    'withdrawn'=>array_replace($review,['status'=>'withdrawn']),
    'event-pending'=>array_replace($review,['eventStatus'=>'event_pending']),
    'old-date'=>array_replace($review,['evidenceDate'=>'2026-01-01']),
    'invalid-date'=>array_replace($review,['evidenceDate'=>'2026-02-31']),
    'future-date'=>array_replace($review,['evidenceDate'=>'2026-09-09']),
    'future-timestamp'=>array_replace($review,['checkedAt'=>'2026-09-09T08:35:21+08:00']),
    'altered-artifact-sha'=>array_replace($review,['evidenceArtifactSha256'=>str_repeat('A',64)]),
    'altered-package-sha'=>array_replace($review,['packageSha256'=>str_repeat('0',64)]),
    'open-key'=>array_replace($review,['unexpected'=>true]),
];
foreach ($mutations as $name=>$candidate) $cases[$name]=tio2_editorial_review_valid_at($payload,$candidate,$now)===false;
$cases['before-kl-midnight']=tio2_editorial_review_valid_at($payload,$review,$beforeBoundary)===true;
$cases['after-kl-midnight']=tio2_editorial_review_valid_at($payload,$review,$afterBoundary)===false;
$application=$payload;
$application['freshness']=null;
$cases['undated-application']=tio2_editorial_review_valid_at($application,null,$now)===true;

$success=!in_array(false,$cases,true);
echo json_encode(['success'=>$success,'cases'=>$cases],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
exit($success?0:1);
