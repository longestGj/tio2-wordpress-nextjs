<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_application_resource_publication_allowed(WP_Post $post): bool
{
    if (! in_array($post->post_type, ['tio2_application', 'tio2_document'], true)) {
        return true;
    }

    return ! in_array('tio2-a', tio2_application_resource_site_scopes((int) $post->ID), true);
}

/**
 * @param array<string, mixed> $postarr
 */
function tio2_application_resource_candidate_is_exact_site_a(int $post_id, array $postarr): bool
{
    if ($post_id > 0 && in_array('tio2-a', tio2_application_resource_site_scopes($post_id), true)) {
        return true;
    }

    $tax_input = $postarr['tax_input']['site_scope'] ?? null;
    if (! is_array($tax_input)) {
        return false;
    }
    $slugs = [];
    foreach ($tax_input as $term) {
        if (is_numeric($term)) {
            $resolved = get_term((int) $term, 'site_scope');
            if ($resolved instanceof WP_Term) {
                $slugs[] = $resolved->slug;
            }
        } elseif (is_string($term)) {
            $slugs[] = $term;
        }
    }
    $slugs = array_values(array_unique($slugs));
    sort($slugs, SORT_STRING);
    return in_array('tio2-a', $slugs, true);
}

/**
 * @param array<string, mixed> $data
 * @param array<string, mixed> $postarr
 * @param array<string, mixed> $unsanitized_postarr
 * @return array<string, mixed>
 */
function tio2_guard_application_resource_publication(
    array $data,
    array $postarr,
    array $unsanitized_postarr = [],
    bool $update = false
): array {
    if (
        ! in_array($data['post_type'] ?? null, ['tio2_application', 'tio2_document'], true) ||
        ! in_array($data['post_status'] ?? null, ['publish', 'future'], true)
    ) {
        return $data;
    }

    $post_id = isset($postarr['ID']) ? (int) $postarr['ID'] : 0;
    if (tio2_application_resource_candidate_is_exact_site_a($post_id, $postarr)) {
        $data['post_status'] = 'draft';
    }
    return $data;
}

function tio2_backstop_application_resource_publication(int $post_id, WP_Post $post, bool $update): void
{
    static $enforcing = false;
    if (
        $enforcing ||
        ! in_array($post->post_type, ['tio2_application', 'tio2_document'], true) ||
        ! in_array($post->post_status, ['publish', 'future'], true) ||
        tio2_application_resource_publication_allowed($post)
    ) {
        return;
    }

    $enforcing = true;
    try {
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    } finally {
        $enforcing = false;
    }
}

/**
 * Coerce a previously public shared-CPT record when exact Site A ownership is
 * assigned after the post row has been inserted.
 *
 * @param int[]|string[] $terms
 * @param int[]          $term_taxonomy_ids
 * @param int[]          $old_term_taxonomy_ids
 */
function tio2_backstop_application_resource_scope_publication(
    int $post_id,
    array $terms,
    array $term_taxonomy_ids,
    string $taxonomy,
    bool $append,
    array $old_term_taxonomy_ids
): void {
    if (
        'site_scope' !== $taxonomy ||
        ! in_array('tio2-a', tio2_application_resource_site_scopes($post_id), true)
    ) {
        return;
    }
    $post = get_post($post_id);
    if ($post instanceof WP_Post) {
        tio2_backstop_application_resource_publication($post_id, $post, true);
    }
}

/**
 * Hook: graphql_pre_model_data_is_private.
 *
 * Keep exact-Site-A Application and Technical Resource drafts private until
 * their public routes are separately approved. Authenticated and Site B
 * schema behavior remains owned by WordPress and WPGraphQL.
 *
 * @param bool|null $is_private
 * @param mixed     $data
 * @return bool|null
 */
function tio2_application_resource_graphql_visibility($is_private, string $model_name, $data)
{
    if (
        0 === get_current_user_id() &&
        'PostObject' === $model_name &&
        $data instanceof WP_Post &&
        in_array($data->post_type, ['tio2_application', 'tio2_document'], true) &&
        tio2_application_resource_is_exact_site_a((int) $data->ID)
    ) {
        return true;
    }

    return $is_private;
}
