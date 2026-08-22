<?php

if (! defined('ABSPATH')) {
    exit(1);
}

if (empty($args[0]) || ! is_readable($args[0])) {
    WP_CLI::error('Seed plan path is missing or unreadable.');
}

$plan = json_decode((string) file_get_contents($args[0]), true, 512, JSON_THROW_ON_ERROR);
$required_post_types = [
    'tio2_product',
    'tio2_grade',
    'tio2_application',
    'tio2_document',
    'tio2_faq',
];

foreach ($required_post_types as $post_type) {
    if (! post_type_exists($post_type)) {
        WP_CLI::error("Missing shared content type: {$post_type}");
    }
}

if (! taxonomy_exists('site_scope')) {
    WP_CLI::error('Missing taxonomy: site_scope');
}

$summary = [
    'entities_created' => 0,
    'entities_updated' => 0,
    'pages_created' => 0,
    'pages_updated' => 0,
    'pages_trashed' => 0,
    'pages_revived' => 0,
    'entities_duplicates_deleted' => 0,
    'pages_duplicates_deleted' => 0,
];

/**
 * @param array<string, array<int, array<string, mixed>>> $candidates_by_identity
 * @param array<int, string> $identity_by_post
 * @param array<string, mixed> $candidate
 */
function tio2_seed_add_candidate(
    array &$candidates_by_identity,
    array &$identity_by_post,
    string $identity,
    array $candidate
): void
{
    $post_id = (int) $candidate['id'];
    if (isset($identity_by_post[$post_id]) && $identity_by_post[$post_id] !== $identity) {
        WP_CLI::error(
            "Managed post {$post_id} ambiguously matches {$identity_by_post[$post_id]} and {$identity}."
        );
    }

    $identity_by_post[$post_id] = $identity;
    if (! isset($candidates_by_identity[$identity])) {
        $candidates_by_identity[$identity] = [];
    }
    $candidates_by_identity[$identity][$post_id] = $candidate;
}

/**
 * Exact marker candidates are authoritative, and the lowest marked ID is
 * canonical even when trashed so trash revival preserves stable identity.
 * Legacy proven candidates fall back to published status, then lowest ID.
 *
 * @param array<int, array<string, mixed>> $candidates
 * @return array{canonical_id: int, duplicate_ids: array<int, int>}
 */
function tio2_seed_resolve_candidates(string $identity, array $candidates): array
{
    foreach ($candidates as $candidate) {
        if (! $candidate['proven']) {
            WP_CLI::error(
                "Cannot safely reconcile unproven managed collision {$identity} at post {$candidate['id']}."
            );
        }
    }

    $marked_candidates = array_values(array_filter(
        $candidates,
        static fn (array $candidate): bool => (bool) $candidate['marked']
    ));
    $canonical_pool = [] !== $marked_candidates ? $marked_candidates : array_values($candidates);
    usort($canonical_pool, static function (array $left, array $right) use ($marked_candidates): int {
        if ([] === $marked_candidates) {
            $left_published = 'publish' === $left['status'];
            $right_published = 'publish' === $right['status'];
            if ($left_published !== $right_published) {
                return $left_published ? -1 : 1;
            }
        }

        return (int) $left['id'] <=> (int) $right['id'];
    });

    $canonical_id = (int) $canonical_pool[0]['id'];
    $duplicate_ids = [];
    foreach ($candidates as $candidate) {
        if ((int) $candidate['id'] !== $canonical_id) {
            $duplicate_ids[] = (int) $candidate['id'];
        }
    }
    sort($duplicate_ids, SORT_NUMERIC);

    return [
        'canonical_id' => $canonical_id,
        'duplicate_ids' => $duplicate_ids,
    ];
}

function tio2_seed_delete_proven_duplicate(int $post_id, string $identity): void
{
    $deleted = wp_delete_post($post_id, true);
    if (! $deleted instanceof WP_Post) {
        WP_CLI::error("Failed to permanently delete proven managed duplicate {$post_id} for {$identity}.");
    }
}

/**
 * @param array<string, mixed> $operation
 */
function tio2_seed_upsert(
    array $operation,
    string $post_type,
    array &$summary,
    string $summary_prefix,
    ?int $existing_id = null
): int
{
    $required_slug = $operation['slug'] ?? $operation['internalSlug'];
    $existing = $existing_id
        ? get_post($existing_id)
        : get_page_by_path($required_slug, OBJECT, $post_type);
    $post_data = [
        'post_type' => $post_type,
        'post_status' => $operation['postStatus'],
        'post_name' => $required_slug,
        'post_title' => $operation['title'],
        'post_content' => $operation['content'],
        'post_parent' => 0,
    ];

    $was_trashed = $existing instanceof WP_Post && 'trash' === $existing->post_status;
    $preserve_exact_seed_slug = static function ($sanitized, $raw_title, $context) use ($required_slug) {
        if ('save' === $context && $raw_title === $required_slug) {
            return $required_slug;
        }

        return $sanitized;
    };

    add_filter('sanitize_title', $preserve_exact_seed_slug, 10, 3);
    try {
        if ($existing instanceof WP_Post) {
            $post_data['ID'] = $existing->ID;
            $post_id = wp_update_post(wp_slash($post_data), true);
            $summary[$summary_prefix . '_updated']++;
        } else {
            $post_id = wp_insert_post(wp_slash($post_data), true);
            $summary[$summary_prefix . '_created']++;
        }
    } finally {
        remove_filter('sanitize_title', $preserve_exact_seed_slug, 10);
    }

    if (is_wp_error($post_id)) {
        WP_CLI::error($post_id->get_error_message());
    }

    foreach ($operation['meta'] as $meta_key => $meta_value) {
        update_post_meta((int) $post_id, $meta_key, $meta_value);
    }

    if ($was_trashed) {
        delete_post_meta((int) $post_id, '_wp_trash_meta_status');
        delete_post_meta((int) $post_id, '_wp_trash_meta_time');
        delete_post_meta((int) $post_id, '_wp_desired_post_slug');
        if ('pages' === $summary_prefix) {
            $summary['pages_revived']++;
        }
    }

    return (int) $post_id;
}

wp_suspend_cache_invalidation(true);
wp_defer_term_counting(true);
wp_defer_comment_counting(true);

try {
    $planned_entities_by_id = [];
    foreach ($plan['entities'] as $entity) {
        $planned_entities_by_id[$entity['id']] = $entity;
    }
    $entity_candidates = [];
    $entity_identity_by_post = [];
    $existing_entity_ids = get_posts([
        'post_type' => $required_post_types,
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);
    foreach ($existing_entity_ids as $existing_entity_id) {
        $marker = (string) get_post_meta((int) $existing_entity_id, '_tio2_seed_fixture_id', true);
        $fixture_id = isset($planned_entities_by_id[$marker]) ? $marker : '';
        $marked = '' !== $fixture_id;
        if (! $marked) {
            $candidate_slugs = [
                (string) get_post_field('post_name', $existing_entity_id),
                (string) get_post_meta((int) $existing_entity_id, '_wp_desired_post_slug', true),
            ];
            foreach ($candidate_slugs as $candidate_slug) {
                if (isset($planned_entities_by_id[$candidate_slug])) {
                    $fixture_id = $candidate_slug;
                    break;
                }
            }
        }
        if ('' === $fixture_id) {
            continue;
        }

        $expected_post_type = $planned_entities_by_id[$fixture_id]['postType'];
        $content = (string) get_post_field('post_content', $existing_entity_id);
        $proven = $expected_post_type === get_post_type($existing_entity_id) &&
            ($marked || str_contains($content, 'SYNTHETIC TEST CONTENT')) &&
            ('' === $marker || $marker === $fixture_id);
        tio2_seed_add_candidate(
            $entity_candidates,
            $entity_identity_by_post,
            $fixture_id,
            [
                'id' => (int) $existing_entity_id,
                'status' => (string) get_post_status($existing_entity_id),
                'marked' => $marked,
                'proven' => $proven,
            ]
        );
    }

    $entity_canonical_ids = [];
    $entity_duplicate_ids = [];
    foreach ($entity_candidates as $fixture_id => $candidates) {
        $resolution = tio2_seed_resolve_candidates($fixture_id, $candidates);
        $entity_canonical_ids[$fixture_id] = $resolution['canonical_id'];
        $entity_duplicate_ids[$fixture_id] = $resolution['duplicate_ids'];
    }

    $planned_pages_by_slug = [];
    $planned_page_slug_by_site_path = [];
    foreach ($plan['pages'] as $page) {
        $planned_pages_by_slug[$page['internalSlug']] = $page;
        $planned_page_slug_by_site_path[$page['siteId'] . ':' . $page['publicPath']] = $page['internalSlug'];
    }

    $page_candidates = [];
    $page_identity_by_post = [];
    $existing_page_ids = get_posts([
        'post_type' => 'page',
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);
    foreach ($existing_page_ids as $existing_page_id) {
        $existing_slug = (string) get_post_field('post_name', $existing_page_id);
        $desired_trash_slug = (string) get_post_meta(
            (int) $existing_page_id,
            '_wp_desired_post_slug',
            true
        );
        $marker = (string) get_post_meta(
            (int) $existing_page_id,
            '_tio2_seed_internal_slug',
            true
        );
        $existing_scopes = wp_get_object_terms((int) $existing_page_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($existing_scopes)) {
            WP_CLI::error($existing_scopes->get_error_message());
        }
        $public_path = (string) get_post_meta((int) $existing_page_id, 'public_path', true);
        $site_path_key = 1 === count($existing_scopes)
            ? $existing_scopes[0] . ':' . $public_path
            : '';

        $identity = isset($planned_pages_by_slug[$marker]) ? $marker : '';
        $marked = '' !== $identity;
        if (! $marked) {
            foreach ([$existing_slug, $desired_trash_slug] as $candidate_slug) {
                if (isset($planned_pages_by_slug[$candidate_slug])) {
                    $identity = $candidate_slug;
                    break;
                }
            }
        }
        if ('' === $identity && isset($planned_page_slug_by_site_path[$site_path_key])) {
            $identity = $planned_page_slug_by_site_path[$site_path_key];
        }
        if ('' === $identity) {
            continue;
        }

        $planned_page = $planned_pages_by_slug[$identity];
        $expected_scopes = $planned_page['siteScopes'];
        $normalized_slug = sanitize_title($identity, '', 'save');
        $legacy_slug_matches = in_array(
            $existing_slug,
            [$identity, $normalized_slug, $identity . '__trashed', $normalized_slug . '__trashed'],
            true
        ) || $desired_trash_slug === $identity;
        $content = (string) get_post_field('post_content', $existing_page_id);
        $legacy_proven = $legacy_slug_matches &&
            $public_path === $planned_page['publicPath'] &&
            $existing_scopes === $expected_scopes &&
            str_contains($content, 'SYNTHETIC TEST CONTENT');
        $proven = $marked || ('' === $marker && $legacy_proven);
        tio2_seed_add_candidate(
            $page_candidates,
            $page_identity_by_post,
            $identity,
            [
                'id' => (int) $existing_page_id,
                'status' => (string) get_post_status($existing_page_id),
                'marked' => $marked,
                'proven' => $proven,
            ]
        );
    }

    $page_canonical_ids = [];
    $page_duplicate_ids = [];
    foreach ($page_candidates as $internal_slug => $candidates) {
        $resolution = tio2_seed_resolve_candidates($internal_slug, $candidates);
        $page_canonical_ids[$internal_slug] = $resolution['canonical_id'];
        $page_duplicate_ids[$internal_slug] = $resolution['duplicate_ids'];
    }

    // All identities have been preflighted. Only proven extras are now removed,
    // before canonical upserts need to reclaim their exact WordPress slug.
    foreach ($entity_duplicate_ids as $fixture_id => $duplicate_ids) {
        foreach ($duplicate_ids as $duplicate_id) {
            tio2_seed_delete_proven_duplicate($duplicate_id, $fixture_id);
            $summary['entities_duplicates_deleted']++;
        }
    }
    foreach ($page_duplicate_ids as $internal_slug => $duplicate_ids) {
        foreach ($duplicate_ids as $duplicate_id) {
            tio2_seed_delete_proven_duplicate($duplicate_id, $internal_slug);
            $summary['pages_duplicates_deleted']++;
        }
    }

    foreach ($plan['entities'] as $entity) {
        $entity_id = tio2_seed_upsert(
            $entity,
            $entity['postType'],
            $summary,
            'entities',
            $entity_canonical_ids[$entity['id']] ?? null
        );

        // Shared facts are one global record referenced by both site manifests.
        // They deliberately have no site_scope term rather than being duplicated.
        $term_result = wp_set_object_terms($entity_id, [], 'site_scope', false);
        if (is_wp_error($term_result)) {
            WP_CLI::error($term_result->get_error_message());
        }
    }

    $expected_page_slugs = [];
    foreach ($plan['pages'] as $page) {
        $expected_page_slugs[$page['internalSlug']] = true;
        $existing_page_id = $page_canonical_ids[$page['internalSlug']] ?? null;
        $page_id = tio2_seed_upsert($page, 'page', $summary, 'pages', $existing_page_id);
        $term_result = wp_set_object_terms($page_id, $page['siteScopes'], 'site_scope', false);
        if (is_wp_error($term_result)) {
            WP_CLI::error($term_result->get_error_message());
        }
    }

    $managed_prefixes = $plan['managedScaleSlugPrefixes'];
    $managed_page_ids = get_posts([
        'post_type' => 'page',
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
    ]);

    foreach ($managed_page_ids as $page_id) {
        $page_slug = (string) get_post_field('post_name', $page_id);
        $is_managed_scale_page = false;
        foreach ($managed_prefixes as $prefix) {
            if (str_starts_with($page_slug, $prefix)) {
                $is_managed_scale_page = true;
                break;
            }
        }

        if ($is_managed_scale_page && ! isset($expected_page_slugs[$page_slug])) {
            if (wp_trash_post((int) $page_id)) {
                $summary['pages_trashed']++;
            }
        }
    }
} finally {
    wp_defer_comment_counting(false);
    wp_defer_term_counting(false);
    wp_suspend_cache_invalidation(false);
    clean_post_cache(0);
}

WP_CLI::log('TIO2_SEED_SUMMARY ' . wp_json_encode($summary));
