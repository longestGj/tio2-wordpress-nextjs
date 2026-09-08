<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

function tio2_editorial_review_manifest(string $page_id=''): ?array {
    $filename=in_array($page_id,['RES-R706','RES-CHEMOURS'],true)?'tio2-my-alternatives-review-evidence.json':'tio2-my-editorial-review-evidence.json';
    $path=dirname(__DIR__).'/config/'.$filename;
    if (!is_file($path)) return null;
    try {
        $decoded=json_decode((string)file_get_contents($path),true,512,JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        return null;
    }
    $manifest=is_array($decoded)?$decoded:null;
    return $manifest;
}

function tio2_editorial_review_record($value): bool {
    return is_array($value) && !array_is_list($value);
}

function tio2_editorial_review_exact_keys(array $value,array $expected): bool {
    $actual=array_keys($value);
    sort($actual,SORT_STRING);
    sort($expected,SORT_STRING);
    return $actual===$expected;
}

function tio2_editorial_review_date($value): ?DateTimeImmutable {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D',$value)) return null;
    $date=DateTimeImmutable::createFromFormat('!Y-m-d',$value,new DateTimeZone('UTC'));
    $errors=DateTimeImmutable::getLastErrors();
    if (!$date || ($errors!==false && ($errors['warning_count']!==0 || $errors['error_count']!==0)) || $date->format('Y-m-d')!==$value) return null;
    return $date;
}

function tio2_editorial_review_instant($value): ?DateTimeImmutable {
    if (!is_string($value) || !preg_match('/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/D',$value,$parts)) return null;
    if (!tio2_editorial_review_date($parts[1]) || (int)$parts[2]>23 || (int)$parts[3]>59 || (int)$parts[4]>59) return null;
    if ($parts[5]!=='Z' && ((int)$parts[7]>14 || (int)$parts[8]>59 || ((int)$parts[7]===14 && (int)$parts[8]!==0))) return null;
    try {
        return new DateTimeImmutable($value);
    } catch (Throwable $error) {
        return null;
    }
}

function tio2_editorial_review_page(array $payload): ?array {
    $manifest=tio2_editorial_review_manifest((string)($payload['identity']['pageId']??''));
    $artifact_keys=['checkedAt','evidenceDate','outcome','path','sha256','timeZone'];
    $page_keys=['currentReview','packageSha256','pageId','policy','siteScope'];
    $policy_keys=['approvedNextReviewDue','baselineDate','eventTypes','maximumIntervalDays','policyId','timeZone'];
    $review_keys=['checkedAt','eventStatus','evidenceArtifactSha256','evidenceDate','nextReviewDue','outcome','packageSha256','pageId','policyId','schemaVersion','siteScope','status','timeZone'];
    if (!tio2_editorial_review_record($manifest) || !tio2_editorial_review_exact_keys($manifest,['evidenceArtifact','pages','schemaVersion','siteScope']) || ($manifest['schemaVersion']??null)!=='tio2-my-editorial-review-evidence-v0.1' || ($manifest['siteScope']??null)!=='tio2-my' || !isset($manifest['pages']) || !array_is_list($manifest['pages'])) return null;
    $artifact=$manifest['evidenceArtifact']??null;
    if (!tio2_editorial_review_record($artifact) || !tio2_editorial_review_exact_keys($artifact,$artifact_keys) || !is_string($artifact['path']) || $artifact['path']==='' || !is_string($artifact['sha256']) || !preg_match('/^[a-f0-9]{64}$/Di',$artifact['sha256']) || !tio2_editorial_review_date($artifact['evidenceDate']) || !tio2_editorial_review_instant($artifact['checkedAt']) || $artifact['timeZone']!=='Asia/Kuala_Lumpur' || $artifact['outcome']!=='NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK') return null;
    $page_id=$payload['identity']['pageId']??null;
    if (!is_string($page_id)) return null;
    $matches=array_values(array_filter($manifest['pages'],static fn($candidate):bool => is_array($candidate) && ($candidate['pageId']??null)===$page_id));
    if (count($matches)!==1) return null;
    $page=$matches[0];
    if (!tio2_editorial_review_record($page) || !tio2_editorial_review_exact_keys($page,$page_keys) || $page['siteScope']!=='tio2-my' || !is_string($page['packageSha256']) || !preg_match('/^[a-f0-9]{64}$/Di',$page['packageSha256'])) return null;
    $policy=$page['policy'];
    if (!tio2_editorial_review_record($policy) || !tio2_editorial_review_exact_keys($policy,$policy_keys) || !is_string($policy['policyId']) || $policy['policyId']==='' || !tio2_editorial_review_date($policy['baselineDate']) || !tio2_editorial_review_date($policy['approvedNextReviewDue']) || !is_int($policy['maximumIntervalDays']) || $policy['maximumIntervalDays']<=0 || $policy['timeZone']!=='Asia/Kuala_Lumpur' || !is_array($policy['eventTypes']) || !array_is_list($policy['eventTypes']) || count($policy['eventTypes'])===0) return null;
    foreach ($policy['eventTypes'] as $event_type) if (!is_string($event_type) || $event_type==='') return null;
    $trusted=$page['currentReview'];
    if (!tio2_editorial_review_record($trusted) || !tio2_editorial_review_exact_keys($trusted,$review_keys) || ($trusted['schemaVersion']??null)!=='editorial-review-v0.1') return null;
    if ($page['pageId']!==($trusted['pageId']??null) || $page['siteScope']!==($trusted['siteScope']??null) || $page['packageSha256']!==($trusted['packageSha256']??null) || $policy['policyId']!==($trusted['policyId']??null)) return null;
    if ($artifact['sha256']!==($trusted['evidenceArtifactSha256']??null) || $artifact['evidenceDate']!==($trusted['evidenceDate']??null) || $artifact['checkedAt']!==($trusted['checkedAt']??null) || $artifact['timeZone']!==($trusted['timeZone']??null) || $artifact['outcome']!==($trusted['outcome']??null)) return null;
    return $page;
}

function tio2_editorial_review_valid_at(array $payload,$review,DateTimeImmutable $now): bool {
    if (!array_key_exists('freshness',$payload)) return false;
    if ($payload['freshness']===null) return true;
    if (!tio2_editorial_review_record($payload['freshness']) || !tio2_editorial_review_record($review)) return false;
    $trusted=tio2_editorial_review_page($payload);
    if (!$trusted) return false;
    $keys=['checkedAt','eventStatus','evidenceArtifactSha256','evidenceDate','nextReviewDue','outcome','packageSha256','pageId','policyId','schemaVersion','siteScope','status','timeZone'];
    if (!tio2_editorial_review_exact_keys($review,$keys)) return false;
    foreach ($keys as $key) if (($review[$key]??null)!==($trusted['currentReview'][$key]??null)) return false;
    if (($payload['identity']['siteScope']??null)!==$trusted['siteScope'] || ($payload['source']['packageSha256']??null)!==$trusted['packageSha256']) return false;
    $freshness=$payload['freshness'];
    $baseline=tio2_editorial_review_date($trusted['policy']['baselineDate']);
    $approved_due=tio2_editorial_review_date($trusted['policy']['approvedNextReviewDue']);
    if (!$baseline || !$approved_due || !tio2_editorial_review_date($freshness['lastReviewed']??null) || !tio2_editorial_review_date($freshness['nextReviewDue']??null) || ($freshness['lastReviewed']??null)!==$trusted['policy']['baselineDate'] || ($freshness['nextReviewDue']??null)!==$trusted['policy']['approvedNextReviewDue']) return false;
    $evidence_date=tio2_editorial_review_date($review['evidenceDate']??null);
    $next_due=tio2_editorial_review_date($review['nextReviewDue']??null);
    $checked_at=tio2_editorial_review_instant($review['checkedAt']??null);
    if (!$evidence_date || !$next_due || !$checked_at || ($review['status']??null)!=='verified' || ($review['eventStatus']??null)!=='no_open_trigger') return false;
    try {
        $zone=new DateTimeZone($trusted['policy']['timeZone']);
    } catch (Throwable $error) {
        return false;
    }
    $today=$now->setTimezone($zone)->format('Y-m-d');
    $evidence=$evidence_date->format('Y-m-d');
    if ($evidence<$baseline->format('Y-m-d') || $evidence>$today || $checked_at>$now || $checked_at->setTimezone($zone)->format('Y-m-d')!==$evidence) return false;
    $interval_due=$evidence_date->modify('+'.$trusted['policy']['maximumIntervalDays'].' days')->format('Y-m-d');
    $approved=$approved_due->format('Y-m-d');
    $expected_due=$interval_due<$approved?$interval_due:$approved;
    $due=$next_due->format('Y-m-d');
    return $due===$expected_due && $due>=$evidence && $due>=$today;
}

function tio2_editorial_review_valid(array $payload,$review): bool {
    try {
        $now=new DateTimeImmutable('now',new DateTimeZone('Asia/Kuala_Lumpur'));
    } catch (Throwable $error) {
        return false;
    }
    return tio2_editorial_review_valid_at($payload,$review,$now);
}
