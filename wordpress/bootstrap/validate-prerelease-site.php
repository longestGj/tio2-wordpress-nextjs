<?php

if (! defined('ABSPATH')) {
    throw new RuntimeException('Run this validator through WP-CLI.');
}

$term = get_term_by('slug', 'tio2-my', 'site_scope');
if (! $term instanceof WP_Term) {
    throw new RuntimeException('The tio2-my site_scope term is missing.');
}

$recordsJson = (string) get_option('d16_prerelease_seed_records', '{}');
$seedRecords = json_decode($recordsJson, true);
if (! is_array($seedRecords) || [] === $seedRecords) {
    throw new RuntimeException('The prerelease seed record ledger is missing.');
}

$expectedIds = [];
foreach ($seedRecords as $seedPath => $record) {
    if (! is_string($seedPath) || ! is_array($record) || ! preg_match('/^[a-f0-9]{64}$/', (string) ($record['sha256'] ?? ''))) {
        throw new RuntimeException('The prerelease seed record ledger is invalid.');
    }
    foreach ((array) ($record['postIds'] ?? []) as $postId) {
        $expectedIds[] = (int) $postId;
    }
}
$expectedIds = array_values(array_unique(array_filter($expectedIds)));
sort($expectedIds, SORT_NUMERIC);
if ([] === $expectedIds) {
    throw new RuntimeException('No seeded Page IDs were recorded.');
}

$statuses = ['publish', 'draft'];
$identities = [];
$statusCounts = ['publish' => 0, 'draft' => 0];
foreach ($expectedIds as $postId) {
    $post = get_post($postId);
    if (! $post instanceof WP_Post || ! in_array($post->post_status, $statuses, true)) {
        throw new RuntimeException('A seeded Page ID does not resolve to one published or draft record: ' . $postId);
    }
    $scopes = wp_get_post_terms($postId, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) {
        throw new RuntimeException('A seeded record has the wrong site scope: ' . $postId);
    }
    $identity = $post->post_type . '|' . $post->post_name;
    $identities[$identity][] = $postId;
    $statusCounts[$post->post_status]++;
}

$duplicateIdentities = array_filter($identities, static fn(array $ids): bool => count($ids) !== 1);
if ([] !== $duplicateIdentities) {
    throw new RuntimeException('Duplicate seeded identities exist: ' . implode(', ', array_keys($duplicateIdentities)));
}

echo wp_json_encode([
    'schemaVersion' => 1,
    'siteScope' => 'tio2-my',
    'status' => 'passed',
    'counts' => [
        'seedFiles' => count($seedRecords),
        'seededRecords' => count($expectedIds),
        'published' => $statusCounts['publish'],
        'draft' => $statusCounts['draft'],
    ],
    'duplicateIdentities' => [],
]) . PHP_EOL;
