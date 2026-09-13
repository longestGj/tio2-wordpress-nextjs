<?php

if (! defined('ABSPATH') || ! defined('TIO2_MY_LEGAL_PAGE_CONTRACT_META')) {
    throw new RuntimeException('Run this fixture through the owned WordPress WP-CLI runtime.');
}

$changes = [
    '/privacy-policy' => [
        'h1' => 'Runtime Updated Privacy Policy',
        'seoTitle' => 'Runtime Updated Privacy SEO',
        'seoDescription' => 'Runtime published English privacy description.',
        'body' => 'Runtime published English body without a blank separator.',
    ],
    '/ms/privacy-policy' => [
        'h1' => 'Dasar Privasi Runtime Dikemas Kini',
        'seoTitle' => 'SEO Dasar Privasi Runtime',
        'seoDescription' => 'Penerangan privasi runtime yang diterbitkan.',
        'body' => 'Kandungan Bahasa Malaysia runtime yang diterbitkan tanpa pemisah kosong.',
    ],
    '/cookie-policy' => [
        'h1' => 'Runtime Updated Cookie Policy',
        'seoTitle' => 'Runtime Updated Cookie SEO',
        'seoDescription' => 'Runtime published cookie description.',
        'body' => 'Runtime published cookie body without a blank separator.',
    ],
];

$result = [];
foreach ($changes as $path => $change) {
    $ids = get_posts([
        'post_type' => 'tio2_legal_page',
        'post_status' => 'publish',
        'fields' => 'ids',
        'numberposts' => 2,
        'meta_key' => 'public_path',
        'meta_value' => $path,
        'suppress_filters' => false,
    ]);
    if (1 !== count($ids)) throw new RuntimeException('Expected one legal record for ' . $path);
    $post_id = (int) $ids[0];
    $json = get_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, true);
    $record = is_string($json) ? json_decode($json, true) : null;
    if (! is_array($record)) throw new RuntimeException('Invalid stored legal record for ' . $path);
    $record['buyerVisibleMarkdown'] = preg_replace('/^# .+$/mu', '# ' . $change['h1'], (string) $record['buyerVisibleMarkdown'], 1);
    $record['buyerVisibleMarkdown'] = preg_replace(
        '/^(## .+)$/mu',
        '$1' . "\n\n### Runtime published subsection\n" . $change['body'],
        (string) $record['buyerVisibleMarkdown'],
        1,
    );
    $record['effectiveDate'] = '2026-09-14';
    $record['seo']['title'] = $change['seoTitle'];
    $record['seo']['description'] = $change['seoDescription'];
    update_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, wp_slash(wp_json_encode($record, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)));
    clean_post_cache($post_id);
    $validation = tio2_validate_legal_page_read_contract($post_id);
    if (is_wp_error($validation)) throw new RuntimeException($validation->get_error_message());
    $result[] = ['postId' => $post_id, 'path' => $path, 'pageId' => $record['pageId']];
}

echo wp_json_encode(['status' => 'passed', 'records' => $result], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL;
