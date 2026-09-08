<?php

if (! function_exists('tio2_resolve_malaysia_document_coo_record_json')) {
    throw new RuntimeException('Run this file through the project WordPress WP-CLI container.');
}

$ids = get_posts([
    'post_type' => 'tio2_doc_tds', 'post_status' => 'publish', 'name' => 'tio2-my-document-coo',
    'fields' => 'ids', 'numberposts' => 2, 'suppress_filters' => false,
]);
if (1 !== count($ids)) throw new RuntimeException('Expected one real local DOC-COO singleton.');
$post_id = (int) $ids[0];
$original_path = get_post_meta($post_id, 'public_path', true);
$original_contract = get_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, true);
$original_status = get_post_status($post_id);
$original_slug = get_post_field('post_name', $post_id);
$original_scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);

$assert_fails = static function (callable $mutate, string $label) use ($post_id): void {
    $mutate();
    try {
        tio2_resolve_malaysia_document_coo_record_json();
        throw new RuntimeException("DOC-COO did not fail closed for {$label}.");
    } catch (\GraphQL\Error\UserError $error) {
        if (! str_contains($error->getMessage(), 'Malaysia DOC-COO')) throw $error;
    }
};

try {
    $happy = json_decode(tio2_resolve_malaysia_document_coo_record_json(), true);
    if (
        ! is_array($happy) ||
        ['tio2-my'] !== array_column($happy['siteScopes']['nodes'] ?? [], 'slug') ||
        '/documents/certificate-of-origin' !== ($happy['publishingFields']['publicPath'] ?? null) ||
        'publish' !== ($happy['status'] ?? null)
    ) throw new RuntimeException('The real DOC-COO readback identity is invalid.');

    $assert_fails(static fn () => wp_set_object_terms($post_id, [], 'site_scope', false), 'missing scope');
    wp_set_object_terms($post_id, $original_scopes, 'site_scope', false);

    $assert_fails(static fn () => update_post_meta($post_id, 'public_path', '/documents/reach'), 'wrong route');
    update_post_meta($post_id, 'public_path', $original_path);

    $assert_fails(static fn () => update_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, '{}'), 'mismatched payload');
    update_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, $original_contract);

    $assert_fails(static fn () => wp_update_post(['ID' => $post_id, 'post_status' => 'draft']), 'unpublished record');
    wp_update_post(['ID' => $post_id, 'post_status' => $original_status]);

    echo wp_json_encode([
        'status' => 'passed',
        'postId' => $post_id,
        'siteScope' => 'tio2-my',
        'publicPath' => $original_path,
        'payloadSha256' => hash('sha256', (string) $original_contract),
        'failClosedCases' => ['missing_scope', 'wrong_route', 'mismatched_payload', 'unpublished_record'],
    ]) . PHP_EOL;
} finally {
    wp_set_object_terms($post_id, is_array($original_scopes) ? $original_scopes : ['tio2-my'], 'site_scope', false);
    update_post_meta($post_id, 'public_path', $original_path);
    update_post_meta($post_id, TIO2_MY_DOCUMENT_COO_CONTRACT_META, $original_contract);
    wp_update_post(['ID' => $post_id, 'post_status' => $original_status, 'post_name' => $original_slug]);
    clean_post_cache($post_id);
}
