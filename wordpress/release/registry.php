<?php
declare(strict_types=1);

/** Installed code owns the metadata allowlist, never the uploaded package. */
function d16_content_validators(string $site): array {
    if ($site !== 'tio2-my') throw new RuntimeException('Content schema not installed for this site.');
    return [
        '_tio2_my_homepage_contract_json'=>'tio2_validate_homepage_v04_contract',
        '_tio2_my_market_hub_contract_json'=>'tio2_validate_market_hub_v01_contract',
        '_tio2_my_eu_market_contract_json'=>'tio2_validate_market_page_v01_contract',
        '_tio2_my_uk_market_contract_json'=>'tio2_validate_market_page_uk_v01_contract',
        '_tio2_my_poland_market_contract_json'=>'tio2_validate_market_page_poland_v01_contract',
        '_tio2_my_brazil_en_market_contract_json'=>'tio2_validate_market_page_brazil_en_v01_contract',
        '_tio2_my_brazil_pt_market_contract_json'=>'tio2_validate_market_page_brazil_pt_v02_contract',
        '_tio2_my_country_market_contract_json'=>'tio2_validate_country_market_v01_contract',
        '_tio2_my_editorial_contract'=>'tio2_editorial_validate_record',
        '_tio2_my_product_hub_contract_json'=>'tio2_validate_product_hub_v01_contract',
        '_tio2_my_application_hub_contract_json'=>'tio2_validate_application_hub_v01_contract',
        '_tio2_my_product_detail_contract_json'=>'tio2_validate_product_detail_v01_contract',
        '_tio2_my_chloride_process_contract_json'=>'tio2_validate_product_process_chloride_v01_contract',
        '_tio2_my_documents_hub_contract_json'=>'tio2_validate_documents_hub_v01_contract',
        '_tio2_my_document_tds_contract_json'=>'tio2_validate_document_tds_v01_contract',
        '_tio2_my_document_coo_contract_json'=>'tio2_validate_document_coo_v04_contract',
        '_tio2_my_document_reach_contract_json'=>'tio2_validate_document_reach_v01_contract',
        '_tio2_my_about_page_contract_json'=>'tio2_validate_about_page_v01_contract',
        '_tio2_my_contact_page_contract_json'=>'tio2_validate_contact_page_v01_contract',
        '_tio2_my_legal_page_contract_json'=>'tio2_validate_legal_page_v01_contract',
        '_tio2_my_request_documents_contract_json'=>'tio2_validate_request_documents_v01_contract',
        '_tio2_my_request_sample_contract_json'=>'tio2_validate_request_sample_v01_contract',
        '_tio2_my_rfq_page_contract_json'=>'tio2_validate_rfq_page_v01_contract',
        '_tio2_my_resource_hub_contract_json'=>'tio2_validate_resource_hub_v01_contract',
        '_tio2_my_resource_proc_contract_json'=>'tio2_validate_resource_proc_v01_contract',
        '_tio2_my_resource_origin_contract_json'=>'tio2_validate_resource_origin_v01_contract',
    ];
}

function d16_content_check_record(array $entry, string $page): void {
    $validator = $entry['validator'];
    if (!is_callable($validator)) throw new RuntimeException('Installed content validator missing.');
    $result = in_array($validator,['tio2_validate_country_market_v01_contract','tio2_editorial_validate_record'],true)
        ? $validator($entry['postId'],$page) : $validator($entry['postId']);
    if ($result !== true) throw new RuntimeException('Existing content identity or contract invalid.');
}

/** Stable business identity from validated existing records, no local IDs in input. */
function d16_content_registry(string $site): array {
    global $wpdb;
    $registry = [];
    foreach (d16_content_validators($site) as $meta=>$validator) {
        $rows = $wpdb->get_results($wpdb->prepare("SELECT post_id,meta_id,meta_value FROM {$wpdb->postmeta} WHERE meta_key=%s",$meta),ARRAY_A);
        foreach ($rows as $row) {
            $post = get_post((int)$row['post_id']);
            if (!$post || $post->post_status !== 'publish') continue;
            $scopes = wp_get_post_terms($post->ID,'site_scope',['fields'=>'slugs']);
            if ($scopes !== [$site]) continue;
            $content = json_decode($row['meta_value'],true,512,JSON_THROW_ON_ERROR);
            $page = $content['identity']['pageId'] ?? $content['pageId'] ?? $content['page']['page_id'] ?? null;
            if (!is_string($page) || isset($registry[$page])) throw new RuntimeException('Ambiguous content identity.');
            $entry = ['postId'=>$post->ID,'metaId'=>(int)$row['meta_id'],'metaKey'=>$meta,'validator'=>$validator,'content'=>$content,'json'=>$row['meta_value']];
            d16_content_check_record($entry,$page);
            $registry[$page] = $entry;
        }
    }
    return $registry;
}
