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
];

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
    $planned_fixture_ids = array_column($plan['entities'], 'id');
    $existing_entities_by_fixture = [];
    $existing_entity_ids = get_posts([
        'post_type' => $required_post_types,
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);
    foreach ($existing_entity_ids as $existing_entity_id) {
        $fixture_id = (string) get_post_meta((int) $existing_entity_id, '_tio2_seed_fixture_id', true);
        if ('' === $fixture_id) {
            $candidate_slugs = [
                (string) get_post_field('post_name', $existing_entity_id),
                (string) get_post_meta((int) $existing_entity_id, '_wp_desired_post_slug', true),
            ];
            foreach ($candidate_slugs as $candidate_slug) {
                if (in_array($candidate_slug, $planned_fixture_ids, true)) {
                    $fixture_id = $candidate_slug;
                    break;
                }
            }
        }
        if (in_array($fixture_id, $planned_fixture_ids, true)) {
            $existing_entities_by_fixture[$fixture_id] = (int) $existing_entity_id;
        }
    }

    foreach ($plan['entities'] as $entity) {
        $entity_id = tio2_seed_upsert(
            $entity,
            $entity['postType'],
            $summary,
            'entities',
            $existing_entities_by_fixture[$entity['id']] ?? null
        );

        // Shared facts are one global record referenced by both site manifests.
        // They deliberately have no site_scope term rather than being duplicated.
        $term_result = wp_set_object_terms($entity_id, [], 'site_scope', false);
        if (is_wp_error($term_result)) {
            WP_CLI::error($term_result->get_error_message());
        }
    }

    $expected_page_slugs = [];
    $existing_pages_by_slug = [];
    $existing_pages_by_site_path = [];
    $existing_page_ids = get_posts([
        'post_type' => 'page',
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);
    foreach ($existing_page_ids as $existing_page_id) {
        $existing_slug = (string) get_post_field('post_name', $existing_page_id);
        $existing_pages_by_slug[$existing_slug] = (int) $existing_page_id;
        $managed_internal_slug = (string) get_post_meta(
            (int) $existing_page_id,
            '_tio2_seed_internal_slug',
            true
        );
        if ('' !== $managed_internal_slug) {
            $existing_pages_by_slug[$managed_internal_slug] = (int) $existing_page_id;
        }
        $existing_scopes = wp_get_object_terms((int) $existing_page_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($existing_scopes)) {
            WP_CLI::error($existing_scopes->get_error_message());
        }
        if (1 === count($existing_scopes)) {
            $existing_path = (string) get_post_meta((int) $existing_page_id, 'public_path', true);
            $existing_pages_by_site_path[$existing_scopes[0] . ':' . $existing_path] = (int) $existing_page_id;
        }
    }

    foreach ($plan['pages'] as $page) {
        $expected_page_slugs[$page['internalSlug']] = true;
        $site_path_key = $page['siteId'] . ':' . $page['publicPath'];
        $existing_page_id = $existing_pages_by_slug[$page['internalSlug']]
            ?? $existing_pages_by_site_path[$site_path_key]
            ?? null;
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
