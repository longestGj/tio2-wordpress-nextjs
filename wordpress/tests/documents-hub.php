<?php

if (! function_exists('tio2_validate_documents_hub_v01_contract')) {
    throw new RuntimeException('TiO2 Site Model plugin is not active.');
}

$ids = get_posts([
    'post_type' => 'tio2_documents_hub', 'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => 'tio2-my-documents', 'fields' => 'ids', 'numberposts' => 3, 'suppress_filters' => false,
]);
if (1 !== count($ids)) throw new RuntimeException('Expected exactly one local Malaysia Documents Hub record.');
$post_id = (int) $ids[0];
if (true !== tio2_validate_documents_hub_v01_contract($post_id)) throw new RuntimeException('The valid Documents Hub record failed validation.');
$webhook_state = tio2_get_webhook_affected_state($post_id);
if (
    ! in_array('tio2_documents_hub', tio2_webhook_post_types(), true) ||
    ['/documents'] !== ($webhook_state['paths'] ?? null) ||
    ['tio2-my'] !== ($webhook_state['siteIds'] ?? null) ||
    ['/documents'] !== ($webhook_state['sitePaths']['tio2-my'] ?? null) ||
    ! tio2_is_relevant_webhook_meta_key(TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, $post_id)
) throw new RuntimeException('Documents Hub webhook routing or contract-meta relevance is invalid.');
$resolved = json_decode(tio2_resolve_malaysia_documents_hub_record_json(), true, flags: JSON_THROW_ON_ERROR);
if (
    ['tio2-my'] !== array_column($resolved['siteScopes']['nodes'] ?? [], 'slug') ||
    '/documents' !== ($resolved['publishingFields']['publicPath'] ?? null)
) throw new RuntimeException('The resolved Documents Hub projection is not scope-bound.');

$approved = (string) get_post_meta($post_id, TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, true);
update_post_meta($post_id, TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, '{}');
try {
    if (! is_wp_error(tio2_validate_documents_hub_v01_contract($post_id))) throw new RuntimeException('A contract mismatch was accepted.');
} finally {
    update_post_meta($post_id, TIO2_MY_DOCUMENTS_HUB_CONTRACT_META, $approved);
}

$other_term = term_exists('tio2-a', 'site_scope');
if (! $other_term) $other_term = wp_insert_term('tio2-a', 'site_scope', ['slug' => 'tio2-a']);
if (is_wp_error($other_term)) throw new RuntimeException($other_term->get_error_message());
wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
try {
    if (! is_wp_error(tio2_validate_documents_hub_v01_contract($post_id))) throw new RuntimeException('A cross-scope record was accepted.');
} finally {
    wp_set_object_terms($post_id, ['tio2-my'], 'site_scope', false);
}

if (true !== tio2_validate_documents_hub_v01_contract($post_id)) throw new RuntimeException('The restored Documents Hub record failed validation.');
echo wp_json_encode(['status' => 'passed', 'siteScope' => 'tio2-my', 'publicPath' => '/documents']) . PHP_EOL;
