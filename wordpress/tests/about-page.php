<?php

if (! function_exists('tio2_validate_about_page_v01_contract')) {
    throw new RuntimeException('ABOUT-001 plugin functions are unavailable.');
}

$ids = get_posts([
    'post_type' => 'tio2_about_page', 'post_status' => ['draft', 'pending', 'private', 'publish'],
    'name' => 'tio2-my-about', 'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
]);
if (1 !== count($ids)) throw new RuntimeException('Expected exactly one ABOUT-001 record.');
$post_id = (int) $ids[0];
$original_status = (string) get_post_status($post_id);
$original_contract = (string) get_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, true);
$original_evidence = (string) get_post_meta($post_id, TIO2_MY_ABOUT_PAGE_EVIDENCE_META, true);

function about_test_evidence_state(string $json, string $state, array $authorizations = []): string
{
    $evidence = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    if ([] === $authorizations && 'partial' === $state) {
        $authorizations = ['scale.annual' => 'restricted'];
    } elseif ([] === $authorizations && 'restricted' === $state) {
        $authorizations = ['location.full' => 'restricted'];
    }
    foreach ($evidence['facts'] as &$fact) {
        $key = $fact['key'];
        $fact['authorization'] = $authorizations[$key] ?? 'user_approved_public';
    }
    unset($fact);
    $evidence['evidenceState'] = $state;
    return wp_json_encode($evidence);
}

try {
    $validation = tio2_validate_about_page_v01_contract($post_id);
    if (true !== $validation) throw new RuntimeException('The approved ABOUT-001 contract did not validate.');

    foreach (['sufficient', 'partial', 'restricted'] as $state) {
        update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_EVIDENCE_META, about_test_evidence_state($original_evidence, $state));
        if (true !== tio2_validate_about_page_v01_contract($post_id)) {
            throw new RuntimeException("The ABOUT-001 {$state} evidence state did not validate.");
        }
        $resolved = json_decode(tio2_resolve_malaysia_about_page_record_json(), true, flags: JSON_THROW_ON_ERROR);
        $resolved_evidence = json_decode($resolved['malaysiaAboutPageEvidenceJson'] ?? '', true, flags: JSON_THROW_ON_ERROR);
        if ($state !== ($resolved_evidence['evidenceState'] ?? null)) {
            throw new RuntimeException("The ABOUT-001 {$state} evidence state did not resolve.");
        }
    }
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_EVIDENCE_META, $original_evidence);

    wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    try {
        tio2_resolve_malaysia_about_page_record_json();
        throw new RuntimeException('Missing published ABOUT-001 unexpectedly resolved.');
    } catch (\GraphQL\Error\UserError $error) {
        if (! str_contains($error->getMessage(), 'missing')) throw $error;
    }
    wp_update_post(['ID' => $post_id, 'post_status' => 'publish']);

    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, '{}');
    if (! is_wp_error(tio2_validate_about_page_v01_contract($post_id))) {
        throw new RuntimeException('A modified ABOUT-001 contract unexpectedly validated.');
    }
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, $original_contract);

    $invalid_evidence = json_decode($original_evidence, true, flags: JSON_THROW_ON_ERROR);
    $invalid_evidence['facts'][1]['value'] = 'Tampered location';
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_EVIDENCE_META, wp_json_encode($invalid_evidence));
    if (! is_wp_error(tio2_validate_about_page_v01_contract($post_id))) {
        throw new RuntimeException('Tampered ABOUT-001 evidence unexpectedly validated.');
    }

    foreach ([
        ['partial', ['export.port' => 'restricted']],
        ['partial', ['areas.served' => 'restricted']],
        ['partial', ['documents.support' => 'not_public']],
        ['restricted', ['organization.name' => 'not_public', 'export.port' => 'restricted', 'compliance.support' => 'not_public']],
    ] as [$state, $authorizations]) {
        $arbitrary = about_test_evidence_state($original_evidence, $state, $authorizations);
        if (true !== tio2_validate_about_page_v01_evidence($arbitrary)) {
            throw new RuntimeException("The arbitrary ABOUT-001 {$state} evidence combination did not validate.");
        }
    }
} finally {
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_CONTRACT_META, $original_contract);
    update_post_meta($post_id, TIO2_MY_ABOUT_PAGE_EVIDENCE_META, $original_evidence);
    wp_set_object_terms($post_id, ['tio2-my'], 'site_scope', false);
    wp_update_post(['ID' => $post_id, 'post_status' => $original_status]);
    clean_post_cache($post_id);
}

if (true !== tio2_validate_about_page_v01_contract($post_id)) {
    throw new RuntimeException('ABOUT-001 fixture restoration failed.');
}

echo wp_json_encode([
    'status' => 'passed', 'pageId' => 'ABOUT-001', 'siteScope' => 'tio2-my',
    'evidenceStates' => ['sufficient', 'partial', 'restricted'],
    'missingRecordBehavior' => 'GraphQL error', 'crossScopeFallback' => false,
]) . PHP_EOL;
