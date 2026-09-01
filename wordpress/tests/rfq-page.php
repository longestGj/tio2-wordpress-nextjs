<?php

if (! function_exists('tio2_validate_rfq_page_v01_contract')) {
    throw new RuntimeException('CONV-RFQ plugin functions are unavailable.');
}
$ids = get_posts([
    'post_type' => 'tio2_rfq_page', 'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => 'tio2-my-request-a-quote', 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
]);
if (1 !== count($ids)) throw new RuntimeException('Expected exactly one CONV-RFQ record.');
$post_id = (int) $ids[0];
$original_status = (string) get_post_status($post_id);
$original_contract = (string) get_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, true);

try {
    if (true !== tio2_validate_rfq_page_v01_contract($post_id)) throw new RuntimeException('The approved CONV-RFQ contract did not validate.');
    $resolved = json_decode(tio2_resolve_malaysia_rfq_page_record_json(), true, flags: JSON_THROW_ON_ERROR);
    if ('tio2-my' !== ($resolved['siteScopes']['nodes'][0]['slug'] ?? null)) throw new RuntimeException('CONV-RFQ scope did not resolve.');

    update_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, '{}');
    if (! is_wp_error(tio2_validate_rfq_page_v01_contract($post_id))) throw new RuntimeException('A modified CONV-RFQ contract unexpectedly validated.');
    update_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, $original_contract);

    wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
    if (! is_wp_error(tio2_validate_rfq_page_v01_contract($post_id))) throw new RuntimeException('A foreign scope unexpectedly validated.');
    wp_set_object_terms($post_id, ['tio2-my'], 'site_scope', false);

    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    try {
        tio2_resolve_malaysia_rfq_page_record_json();
        throw new RuntimeException('Missing published CONV-RFQ unexpectedly resolved.');
    } catch (\GraphQL\Error\UserError $error) {
        if (! str_contains($error->getMessage(), 'missing')) throw $error;
    }
} finally {
    update_post_meta($post_id, TIO2_MY_RFQ_PAGE_CONTRACT_META, $original_contract);
    wp_set_object_terms($post_id, ['tio2-my'], 'site_scope', false);
    wp_update_post(['ID' => $post_id, 'post_status' => $original_status]);
    clean_post_cache($post_id);
}
if (true !== tio2_validate_rfq_page_v01_contract($post_id)) throw new RuntimeException('CONV-RFQ fixture restoration failed.');
echo wp_json_encode([
    'status' => 'passed', 'pageId' => 'CONV-RFQ', 'siteScope' => 'tio2-my',
    'missingRecordBehavior' => 'GraphQL error', 'crossScopeFallback' => false,
]) . PHP_EOL;
