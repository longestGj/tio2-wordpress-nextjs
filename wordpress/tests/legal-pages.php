<?php

if (! function_exists('tio2_validate_legal_page_v01_contract')) throw new RuntimeException('TiO2 Site Model plugin is not active.');
$ids = get_posts([
    'post_type' => 'tio2_legal_page', 'post_status' => 'publish', 'fields' => 'ids', 'numberposts' => 4,
    'tax_query' => [['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-my'], 'operator' => 'IN']],
]);
if (3 !== count($ids)) throw new RuntimeException('Expected exactly three published Malaysia Legal pages.');
foreach ($ids as $id) if (true !== tio2_validate_legal_page_v01_contract((int) $id)) throw new RuntimeException('A valid Malaysia Legal page failed validation.');
$records = json_decode(tio2_resolve_malaysia_legal_pages_record_json(), true, flags: JSON_THROW_ON_ERROR);
if (3 !== count($records) || ['/privacy-policy', '/ms/privacy-policy', '/cookie-policy'] !== array_column(array_column($records, 'publishingFields'), 'publicPath')) {
    throw new RuntimeException('The resolved Malaysia Legal page route set is invalid.');
}
foreach ($ids as $id) {
    $public_path = (string) get_post_meta((int) $id, 'public_path', true);
    $webhook_state = tio2_get_webhook_affected_state((int) $id);
    if (
        ! in_array('tio2_legal_page', tio2_webhook_post_types(), true) ||
        [$public_path] !== ($webhook_state['paths'] ?? null) ||
        ['tio2-my'] !== ($webhook_state['siteIds'] ?? null) ||
        [$public_path] !== ($webhook_state['sitePaths']['tio2-my'] ?? null) ||
        ! tio2_is_relevant_webhook_meta_key(TIO2_MY_LEGAL_PAGE_CONTRACT_META, (int) $id)
    ) throw new RuntimeException('Legal page webhook routing or contract-meta relevance is invalid.');
}

$probe_id = (int) $ids[0];
$approved_json = (string) get_post_meta($probe_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, true);
update_post_meta($probe_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, '{}');
try {
    if (! is_wp_error(tio2_validate_legal_page_v01_contract($probe_id))) throw new RuntimeException('A Legal contract mismatch was accepted.');
} finally {
    update_post_meta($probe_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, wp_slash($approved_json));
}

$other_term = term_exists('tio2-a', 'site_scope');
if (! $other_term) $other_term = wp_insert_term('tio2-a', 'site_scope', ['slug' => 'tio2-a']);
if (is_wp_error($other_term)) throw new RuntimeException($other_term->get_error_message());
wp_set_object_terms($probe_id, ['tio2-a'], 'site_scope', false);
try {
    if (! is_wp_error(tio2_validate_legal_page_v01_contract($probe_id))) throw new RuntimeException('A foreign-scope Legal record was accepted.');
} finally {
    wp_set_object_terms($probe_id, ['tio2-my'], 'site_scope', false);
}

wp_update_post(['ID' => $probe_id, 'post_status' => 'draft']);
try {
    $missing_failed = false;
    try { tio2_resolve_malaysia_legal_pages_record_json(); } catch (Throwable $error) { $missing_failed = true; }
    if (! $missing_failed) throw new RuntimeException('An incomplete Legal collection was accepted.');
} finally {
    wp_update_post(['ID' => $probe_id, 'post_status' => 'publish']);
}
if (true !== tio2_validate_legal_page_v01_contract($probe_id)) throw new RuntimeException('The restored Legal record failed validation.');
echo wp_json_encode(['status' => 'passed', 'siteScope' => 'tio2-my', 'pageCount' => 3]) . PHP_EOL;
