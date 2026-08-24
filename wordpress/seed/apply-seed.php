<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_seed_transaction_started'] = false;
$GLOBALS['tio2_seed_touched_post_ids'] = [];
$GLOBALS['tio2_seed_webhook_queue_before_transaction'] = [];
function tio2_seed_abort(string $message): void
{
    if (! empty($GLOBALS['tio2_seed_transaction_started'])) {
        throw new RuntimeException($message);
    }
    WP_CLI::error($message);
}

function tio2_seed_touch_post(int $post_id): void
{
    if ($post_id > 0) {
        $GLOBALS['tio2_seed_touched_post_ids'][$post_id] = true;
    }
}

function tio2_seed_clear_touched_caches(): void
{
    foreach (array_keys($GLOBALS['tio2_seed_touched_post_ids'] ?? []) as $post_id) {
        $post_id = (int) $post_id;
        clean_post_cache($post_id);
        wp_cache_delete($post_id, 'post_meta');
        $post_type = get_post_type($post_id);
        if (is_string($post_type) && '' !== $post_type) {
            clean_object_term_cache($post_id, $post_type);
        }
        if (function_exists('acf_flush_value_cache')) {
            acf_flush_value_cache($post_id);
        }
    }
}

function tio2_seed_update_post_status_exact(int $post_id, string $post_status): void
{
    global $wpdb;

    $previous_status = (string) get_post_status($post_id);
    tio2_seed_touch_post($post_id);
    if ($previous_status === $post_status) {
        return;
    }

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_status' => $post_status],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    if (false === $updated) {
        tio2_seed_abort("Failed to update post status exactly at post {$post_id}.");
    }

    clean_post_cache($post_id);
    $post = get_post($post_id);
    if ($post instanceof WP_Post) {
        wp_transition_post_status($post_status, $previous_status, $post);
    }
}

function tio2_seed_update_post_slug_exact(int $post_id, string $post_name): void
{
    global $wpdb;

    tio2_seed_touch_post($post_id);
    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_name' => $post_name],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    if (false === $updated) {
        tio2_seed_abort("Failed to update post slug exactly at post {$post_id}.");
    }
    clean_post_cache($post_id);
}

if (empty($args[0]) || ! is_readable($args[0])) {
    tio2_seed_abort('Seed plan path is missing or unreadable.');
}

$plan = json_decode((string) file_get_contents($args[0]), true, 512, JSON_THROW_ON_ERROR);
$seed_mode = (string) ($plan['seedMode'] ?? '');
if (! in_array($seed_mode, ['root-only', 'legacy-baseline'], true)) {
    tio2_seed_abort('Seed plan mode is missing or invalid.');
}
if ('legacy-baseline' === $seed_mode && ! defined('TIO2_LOCAL_FIXTURE_SEED')) {
    define('TIO2_LOCAL_FIXTURE_SEED', true);
}
$required_post_types = [
    'tio2_product',
    'tio2_grade',
    'tio2_application',
    'tio2_document',
    'tio2_faq',
];

foreach ($required_post_types as $post_type) {
    if (! post_type_exists($post_type)) {
        tio2_seed_abort("Missing optional content type: {$post_type}");
    }
}
if (! post_type_exists('tio2_homepage')) {
    tio2_seed_abort('Missing homepage content type: tio2_homepage');
}

if (! taxonomy_exists('site_scope')) {
    tio2_seed_abort('Missing taxonomy: site_scope');
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
    'homepages_created' => 0,
    'homepages_updated' => 0,
    'root_pages_drafted' => 0,
    'pages_superseded' => 0,
    'legacy_entity_contexts' => 0,
    'legacy_page_guard_contexts' => 0,
    'root_only_retained_page_drafts' => 0,
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
        tio2_seed_abort(
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
            tio2_seed_abort(
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
    tio2_seed_touch_post($post_id);
    $deleted = wp_delete_post($post_id, true);
    if (! $deleted instanceof WP_Post) {
        tio2_seed_abort("Failed to permanently delete proven managed duplicate {$post_id} for {$identity}.");
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
        tio2_seed_abort($post_id->get_error_message());
    }
    tio2_seed_touch_post((int) $post_id);

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

/**
 * Resolve an optional entity-owned legacy fixture seam by post-type convention.
 * Shared seed code does not know which entity types implement such a seam.
 *
 * @param array<string, mixed> $entity
 */
function tio2_seed_legacy_entity_context(array $entity): ?string
{
    if (empty($entity['legacyBaseline'])) {
        return null;
    }

    $post_type = (string) ($entity['postType'] ?? '');
    if (1 !== preg_match('/^tio2_([a-z0-9_]+)$/', $post_type, $match)) {
        return null;
    }

    $candidate = 'tio2_with_legacy_' . $match[1] . '_fixture_seed_context';
    return is_callable($candidate) ? $candidate : null;
}

function tio2_seed_legacy_entity_context_closed(string $context, int $post_id): bool
{
    if (
        1 !== preg_match(
            '/^tio2_with_legacy_([a-z0-9_]+)_fixture_seed_context$/',
            $context,
            $match
        )
    ) {
        return false;
    }

    $active_check = 'tio2_legacy_' . $match[1] . '_fixture_seed_context_active';
    return is_callable($active_check) && ! $active_check($post_id);
}

function tio2_seed_ordinary_invalid_publish_is_rejected(): bool
{
    $die_handler_filter = static function (): callable {
        return static function ($message): void {
            $text = is_wp_error($message) ? $message->get_error_message() : (string) $message;
            throw new RuntimeException('TIO2_SEED_PUBLICATION_REJECTION:' . $text);
        };
    };
    add_filter('wp_die_handler', $die_handler_filter);
    try {
        apply_filters(
            'wp_insert_post_data',
            ['post_type' => 'page', 'post_status' => 'publish'],
            [],
            [],
            false
        );
    } catch (RuntimeException $error) {
        return str_contains(
            $error->getMessage(),
            'TIO2_SEED_PUBLICATION_REJECTION:This Page or Post cannot be published because it must have exactly one supported site scope.'
        );
    } finally {
        remove_filter('wp_die_handler', $die_handler_filter);
    }

    return false;
}

/**
 * @param array<int, array{context: string, postId: int}> $entity_contexts
 */
function tio2_seed_assert_same_process_cleanup(string $phase, array $entity_contexts): void
{
    $entity_contexts_closed = [] !== $entity_contexts;
    foreach ($entity_contexts as $entity_context) {
        $entity_contexts_closed = $entity_contexts_closed && tio2_seed_legacy_entity_context_closed(
            $entity_context['context'],
            $entity_context['postId']
        );
    }
    $page_guard_registered = false !== has_filter(
        'wp_insert_post_data',
        'tio2_guard_managed_publication'
    );
    $ordinary_publish_rejected = $page_guard_registered &&
        tio2_seed_ordinary_invalid_publish_is_rejected();
    $result = [
        'phase' => $phase,
        'entityContextsClosed' => $entity_contexts_closed,
        'pageGuardRegistered' => $page_guard_registered,
        'ordinaryPublishRejected' => $ordinary_publish_rejected,
    ];
    WP_CLI::log('TIO2_SEED_SAME_PROCESS_CLEANUP ' . wp_json_encode($result));
    if (! $entity_contexts_closed || ! $page_guard_registered || ! $ordinary_publish_rejected) {
        throw new RuntimeException("Legacy seed same-process cleanup failed during {$phase}.");
    }
}

/**
 * The legacy 505 fixture exists only for local migration tests. Disable the
 * root-only Page/Post publication guard for one Page upsert and always restore
 * it before any subsequent operation can run.
 *
 * @return mixed
 */
function tio2_seed_with_legacy_page_guard_context(callable $callback, bool $inject_failure = false)
{
    if (
        ! defined('WP_CLI') ||
        ! WP_CLI ||
        ! defined('TIO2_LOCAL_FIXTURE_SEED') ||
        true !== TIO2_LOCAL_FIXTURE_SEED
    ) {
        throw new LogicException('Legacy Page fixture context is available only to the explicit local WP-CLI fixture seed.');
    }

    $priority = has_filter('wp_insert_post_data', 'tio2_guard_managed_publication');
    if (false === $priority || ! remove_filter('wp_insert_post_data', 'tio2_guard_managed_publication', $priority)) {
        throw new LogicException('Legacy Page fixture context could not isolate the publication guard.');
    }

    try {
        if ($inject_failure) {
            throw new RuntimeException('Injected legacy Page seed context failure.');
        }
        return $callback();
    } finally {
        add_filter('wp_insert_post_data', 'tio2_guard_managed_publication', $priority, 4);
        if ($inject_failure) {
            WP_CLI::log('TIO2_LEGACY_PAGE_GUARD_RESTORED');
        }
    }
}

wp_suspend_cache_invalidation(true);
wp_defer_term_counting(true);
wp_defer_comment_counting(true);

try {
    global $wpdb;
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
            tio2_seed_abort($existing_scopes->get_error_message());
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

    $planned_homepages_by_site = [];
    foreach ($plan['homepages'] ?? [] as $homepage) {
        $planned_homepages_by_site[(string) $homepage['siteId']] = $homepage;
    }
    $all_homepage_ids = array_map('intval', $wpdb->get_col(
        "SELECT ID FROM {$wpdb->posts} WHERE post_type = 'tio2_homepage' ORDER BY ID ASC"
    ));
    $homepage_ids_by_site = [];
    $allowed_homepage_statuses = ['publish', 'future', 'draft', 'pending', 'private', 'trash'];
    foreach ($all_homepage_ids as $candidate_id) {
        $candidate_status = (string) get_post_status($candidate_id);
        $candidate_slug = (string) get_post_field('post_name', $candidate_id);
        $candidate_marker = (string) get_post_meta($candidate_id, '_tio2_seed_homepage_site_id', true);
        $candidate_error = (string) get_post_meta($candidate_id, '_tio2_homepage_error', true);
        $candidate_scopes = wp_get_object_terms($candidate_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($candidate_scopes)) {
            tio2_seed_abort($candidate_scopes->get_error_message());
        }
        $candidate_scopes = array_values(array_unique(array_map('strval', $candidate_scopes)));
        sort($candidate_scopes, SORT_STRING);

        $is_released_duplicate = 'draft' === $candidate_status &&
            [] === $candidate_scopes &&
            '' === $candidate_marker &&
            'tio2_homepage_duplicate' === $candidate_error &&
            $candidate_slug === 'homepage-duplicate-' . $candidate_id;
        if ($is_released_duplicate) {
            continue;
        }
        if (! in_array($candidate_status, $allowed_homepage_statuses, true)) {
            tio2_seed_abort("Homepage preflight rejected invalid status at post {$candidate_id}.");
        }

        $claimed_sites = [];
        foreach ($planned_homepages_by_site as $site_id => $homepage) {
            if (
                $candidate_marker === $site_id ||
                $candidate_slug === (string) $homepage['internalSlug'] ||
                in_array($site_id, $candidate_scopes, true)
            ) {
                $claimed_sites[] = $site_id;
            }
        }
        if (1 !== count($claimed_sites)) {
            tio2_seed_abort("Homepage preflight rejected invalid identity at post {$candidate_id}.");
        }
        $site_id = $claimed_sites[0];
        $homepage = $planned_homepages_by_site[$site_id];
        if (
            $candidate_marker !== $site_id ||
            $candidate_slug !== (string) $homepage['internalSlug'] ||
            $candidate_scopes !== [$site_id]
        ) {
            tio2_seed_abort("Homepage preflight rejected incomplete identity at post {$candidate_id}.");
        }
        if (isset($homepage_ids_by_site[$site_id])) {
            tio2_seed_abort("Homepage preflight rejected duplicate identity for {$site_id}.");
        }
        $homepage_ids_by_site[$site_id] = $candidate_id;
    }

    $root_snapshots_by_site = [];
    $root_site_by_post_id = [];
    foreach ($planned_homepages_by_site as $site_id => $homepage) {
        $root_identity = $planned_page_slug_by_site_path[$site_id . ':/'] ?? '';
        $root_page_id = '' === $root_identity ? 0 : (int) ($page_canonical_ids[$root_identity] ?? 0);
        if ($root_page_id <= 0 || ! get_post($root_page_id) instanceof WP_Post) {
            tio2_seed_abort("Root preflight rejected missing root Page for {$site_id}.");
        }
        $root_site_by_post_id[$root_page_id] = $site_id;
        $root_scopes = wp_get_object_terms($root_page_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($root_scopes)) {
            tio2_seed_abort($root_scopes->get_error_message());
        }
        $root_scopes = array_values(array_unique(array_map('strval', $root_scopes)));
        sort($root_scopes, SORT_STRING);
        $rollback_status = (string) get_post_meta($root_page_id, '_tio2_previous_root_status', true);
        $rollback_scopes_json = (string) get_post_meta($root_page_id, '_tio2_previous_root_site_scope', true);
        $rollback_scopes = '' === $rollback_scopes_json ? null : json_decode($rollback_scopes_json, true);
        $rollback_metadata_empty = '' === $rollback_status && '' === $rollback_scopes_json;
        $rollback_metadata_exact = 'publish' === $rollback_status && $rollback_scopes === [$site_id];
        if (! $rollback_metadata_empty && ! $rollback_metadata_exact) {
            tio2_seed_abort("Root preflight rejected rollback metadata at post {$root_page_id}.");
        }
        $root_snapshots_by_site[$site_id] = [
            'post_id' => $root_page_id,
            'status' => (string) get_post_status($root_page_id),
            'slug' => (string) get_post_field('post_name', $root_page_id),
            'public_path' => (string) get_post_meta($root_page_id, 'public_path', true),
            'site_scopes' => array_values($root_scopes),
            'rollback_metadata_empty' => $rollback_metadata_empty,
            'rollback_metadata_exact' => $rollback_metadata_exact,
        ];
    }

    $raw_root_ids = array_map('intval', $wpdb->get_col(
        "SELECT DISTINCT p.ID
         FROM {$wpdb->posts} p
         INNER JOIN {$wpdb->postmeta} pm ON pm.post_id = p.ID
         WHERE p.post_type IN ('page', 'post')
           AND pm.meta_key = 'public_path'
           AND pm.meta_value = '/'
         ORDER BY p.ID ASC"
    ));
    foreach ($raw_root_ids as $root_candidate_id) {
        $site_id = $root_site_by_post_id[$root_candidate_id] ?? null;
        if (null === $site_id) {
            tio2_seed_abort("Root preflight rejected unknown Page/Post {$root_candidate_id}.");
        }
        $root_identity = $planned_page_slug_by_site_path[$site_id . ':/'];
        $root_scopes = wp_get_object_terms($root_candidate_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($root_scopes)) {
            tio2_seed_abort($root_scopes->get_error_message());
        }
        $root_scopes = array_values(array_unique(array_map('strval', $root_scopes)));
        sort($root_scopes, SORT_STRING);
        $root_snapshot = $root_snapshots_by_site[$site_id];
        $is_live_root = 'publish' === get_post_status($root_candidate_id) &&
            $root_scopes === [$site_id] &&
            (! empty($root_snapshot['rollback_metadata_empty']) || ! empty($root_snapshot['rollback_metadata_exact']));
        $is_migrated_backup = 'draft' === get_post_status($root_candidate_id) &&
            [] === $root_scopes &&
            ! empty($root_snapshot['rollback_metadata_exact']);
        if (
            'page' !== get_post_type($root_candidate_id) ||
            (string) get_post_field('post_name', $root_candidate_id) !== $root_identity ||
            (string) get_post_meta($root_candidate_id, '_tio2_seed_internal_slug', true) !== $root_identity ||
            (! $is_live_root && ! $is_migrated_backup)
        ) {
            tio2_seed_abort("Root preflight rejected invalid identity at post {$root_candidate_id}.");
        }
    }

    $superseded_page_ids = [];
    foreach ($existing_page_ids as $existing_page_id) {
        $marker = (string) get_post_meta((int) $existing_page_id, '_tio2_seed_internal_slug', true);
        if (isset($planned_pages_by_slug[$marker]) || ! str_contains($marker, '--test-content--long-tail-')) {
            continue;
        }
        $scopes = wp_get_object_terms((int) $existing_page_id, 'site_scope', ['fields' => 'slugs']);
        $path = (string) get_post_meta((int) $existing_page_id, 'public_path', true);
        $content = (string) get_post_field('post_content', $existing_page_id);
        $is_proven_faulty_seed = preg_match('/^(tio2-[ab])--test-content--long-tail-([1-9][0-9]{0,2})$/', $marker, $match) === 1 &&
            $path === '/test-content/long-tail-' . $match[2] &&
            $scopes === [$match[1]] &&
            str_contains($content, 'SYNTHETIC TEST CONTENT') &&
            isset($planned_pages_by_slug[$match[1] . '--test-content--long-tail-' . str_pad($match[2], 3, '0', STR_PAD_LEFT)]);
        if (! $is_proven_faulty_seed) {
            tio2_seed_abort("Cannot safely supersede unproven non-root route at post {$existing_page_id}.");
        }
        $superseded_page_ids[] = (int) $existing_page_id;
    }

    wp_suspend_cache_invalidation(false);
    $GLOBALS['tio2_seed_webhook_queue_before_transaction'] =
        isset($GLOBALS['tio2_webhook_queue']) && is_array($GLOBALS['tio2_webhook_queue'])
            ? $GLOBALS['tio2_webhook_queue']
            : [];
    $begin_result = 'begin-failure' === ($plan['failurePoint'] ?? '')
        ? false
        : $wpdb->query('START TRANSACTION');
    if (false === $begin_result) {
        $message = 'begin-failure' === ($plan['failurePoint'] ?? '')
            ? 'Injected seed transaction failure at BEGIN.'
            : 'Failed to start seed transaction.';
        throw new RuntimeException($message);
    }
    $GLOBALS['tio2_seed_transaction_started'] = true;

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

    $legacy_entity_context_checks = [];
    foreach ($plan['entities'] as $entity) {
        $existing_entity_id = $entity_canonical_ids[$entity['id']] ?? null;
        $legacy_context = tio2_seed_legacy_entity_context($entity);
        $entity_id = (int) ($existing_entity_id ?? 0);

        if (null !== $legacy_context && $entity_id <= 0) {
            $draft_entity = $entity;
            $draft_entity['postStatus'] = 'draft';
            $entity_id = tio2_seed_upsert(
                $draft_entity,
                $entity['postType'],
                $summary,
                'entities'
            );
        }

        if (null !== $legacy_context) {
            $term_result = wp_set_object_terms(
                $entity_id,
                array_values($entity['siteScopes']),
                'site_scope',
                false
            );
            if (is_wp_error($term_result)) {
                tio2_seed_abort($term_result->get_error_message());
            }

            $target = [
                'postStatus' => (string) $entity['postStatus'],
                'siteScopes' => array_values($entity['siteScopes']),
                'publicPath' => $entity['publicPath'] ?? null,
            ];
            $inject_legacy_entity_failure =
                'legacy-entity-context-failure' === ($plan['failurePoint'] ?? '') &&
                0 === $summary['legacy_entity_contexts'];
            try {
                $entity_id = $legacy_context(
                    $entity_id,
                    $target,
                    static function () use (
                        $entity,
                        &$summary,
                        $entity_id,
                        $inject_legacy_entity_failure
                    ): int {
                        if ($inject_legacy_entity_failure) {
                            throw new RuntimeException('Injected legacy entity seed context failure.');
                        }
                        return tio2_seed_upsert(
                            $entity,
                            $entity['postType'],
                            $summary,
                            'entities',
                            $entity_id
                        );
                    }
                );
            } catch (Throwable $error) {
                tio2_seed_assert_same_process_cleanup('entity-exception', [[
                    'context' => $legacy_context,
                    'postId' => $entity_id,
                ]]);
                throw $error;
            }
            $legacy_entity_context_checks[] = [
                'context' => $legacy_context,
                'postId' => $entity_id,
            ];
            $summary['legacy_entity_contexts']++;
        } else {
            $entity_id = tio2_seed_upsert(
                $entity,
                $entity['postType'],
                $summary,
                'entities',
                $existing_entity_id
            );
        }

        $term_result = wp_set_object_terms(
            $entity_id,
            array_values($entity['siteScopes']),
            'site_scope',
            false
        );
        if (is_wp_error($term_result)) {
            tio2_seed_abort($term_result->get_error_message());
        }
    }

    $expected_page_slugs = [];
    $seeded_page_ids = [];
    foreach ($plan['pages'] as $page) {
        $expected_page_slugs[$page['internalSlug']] = true;
        if ('/' === (string) $page['publicPath']) {
            $root_snapshot = $root_snapshots_by_site[(string) $page['siteId']] ?? null;
            $root_page_id = is_array($root_snapshot) ? (int) $root_snapshot['post_id'] : 0;
            if ($root_page_id <= 0) {
                tio2_seed_abort("Root preflight snapshot is missing for {$page['siteId']}.");
            }
            tio2_seed_touch_post($root_page_id);
            $seeded_page_ids[$page['siteId'] . ':/'] = $root_page_id;
            continue;
        }
        $existing_page_id = $page_canonical_ids[$page['internalSlug']] ?? null;
        if ('legacy-baseline' === $seed_mode) {
            $inject_legacy_page_failure =
                'legacy-page-context-failure' === ($plan['failurePoint'] ?? '') &&
                0 === $summary['legacy_page_guard_contexts'];
            try {
                $page_id = tio2_seed_with_legacy_page_guard_context(
                    static function () use ($page, &$summary, $existing_page_id): int {
                        return tio2_seed_upsert(
                            $page,
                            'page',
                            $summary,
                            'pages',
                            $existing_page_id
                        );
                    },
                    $inject_legacy_page_failure
                );
            } catch (Throwable $error) {
                tio2_seed_assert_same_process_cleanup(
                    'page-exception',
                    $legacy_entity_context_checks
                );
                throw $error;
            }
            $summary['legacy_page_guard_contexts']++;
        } else {
            $page_id = tio2_seed_upsert($page, 'page', $summary, 'pages', $existing_page_id);
        }
        $seeded_page_ids[$page['siteId'] . ':' . $page['publicPath']] = $page_id;
        $term_result = wp_set_object_terms($page_id, $page['siteScopes'], 'site_scope', false);
        if (is_wp_error($term_result)) {
            tio2_seed_abort($term_result->get_error_message());
        }
        if ('root-only' === $seed_mode) {
            if ('draft' !== get_post_status($page_id)) {
                throw new RuntimeException("RootOnly retained Page {$page_id} is not draft.");
            }
            $summary['root_only_retained_page_drafts']++;
        }
    }
    if ('legacy-baseline' === $seed_mode) {
        tio2_seed_assert_same_process_cleanup('success', $legacy_entity_context_checks);
    }

    foreach ($superseded_page_ids as $page_id) {
        tio2_seed_touch_post($page_id);
        $superseded_changed = false;
        $superseded_snapshot_json = (string) get_post_meta($page_id, '_tio2_seed_superseded_snapshot', true);
        if ('' === $superseded_snapshot_json) {
            $scopes = wp_get_object_terms($page_id, 'site_scope', ['fields' => 'slugs']);
            $superseded_snapshot = [
                'status' => (string) get_post_status($page_id),
                'slug' => (string) get_post_field('post_name', $page_id),
                'publicPath' => (string) get_post_meta($page_id, 'public_path', true),
                'siteScopes' => is_wp_error($scopes) ? [] : array_values($scopes),
            ];
            update_post_meta($page_id, '_tio2_seed_superseded_snapshot', wp_json_encode($superseded_snapshot));
            $superseded_changed = true;
        }
        if ('draft' !== get_post_status($page_id)) {
            tio2_seed_update_post_status_exact($page_id, 'draft');
            $superseded_changed = true;
        }
        if ($superseded_changed) {
            $summary['pages_superseded']++;
        }
    }

    if ('before-homepage-write' === ($plan['failurePoint'] ?? '')) {
        throw new RuntimeException('Injected seed failure before homepage write.');
    }

        $homepage_field_keys = [];
        foreach (tio2_homepage_field_definitions() as $field_definition) {
            $homepage_field_keys[$field_definition['name']] = $field_definition['key'];
        }
        foreach ($plan['homepages'] ?? [] as $homepage) {
            $site_id = (string) $homepage['siteId'];
            $existing_homepage_id = $homepage_ids_by_site[$site_id] ?? 0;
            $homepage_data = [
                'post_type' => 'tio2_homepage',
                'post_status' => 'draft',
                'post_title' => (string) $homepage['title'],
                'post_name' => (string) $homepage['internalSlug'],
            ];
            if ($existing_homepage_id > 0) {
                $homepage_data['ID'] = $existing_homepage_id;
                $homepage_id = wp_update_post(wp_slash($homepage_data), true);
                $summary['homepages_updated']++;
            } else {
                $homepage_id = wp_insert_post(wp_slash($homepage_data), true);
                $summary['homepages_created']++;
            }
            if (is_wp_error($homepage_id)) {
                throw new RuntimeException($homepage_id->get_error_message());
            }
            $homepage_id = (int) $homepage_id;
            tio2_seed_touch_post($homepage_id);
            update_post_meta($homepage_id, '_tio2_seed_homepage_site_id', $site_id);
            $term_result = wp_set_object_terms($homepage_id, [$site_id], 'site_scope', false);
            if (is_wp_error($term_result)) {
                throw new RuntimeException($term_result->get_error_message());
            }
            foreach ($homepage['fields'] as $field_name => $field_value) {
                if (! isset($homepage_field_keys[$field_name])) {
                    throw new RuntimeException("Unknown homepage field {$field_name}.");
                }
                update_field($homepage_field_keys[$field_name], $field_value, $homepage_id);
            }

            $root_snapshot = $root_snapshots_by_site[$site_id] ?? null;
            $root_page_id = is_array($root_snapshot) ? (int) $root_snapshot['post_id'] : 0;
            if ($root_page_id <= 0 || ! get_post($root_page_id) instanceof WP_Post) {
                throw new RuntimeException("Missing seeded root Page for {$site_id}.");
            }
            $previous_status = (string) $root_snapshot['status'];
            $previous_scopes = (array) $root_snapshot['site_scopes'];
            if (! empty($root_snapshot['rollback_metadata_empty'])) {
                update_post_meta($root_page_id, '_tio2_previous_root_status', $previous_status);
                update_post_meta(
                    $root_page_id,
                    '_tio2_previous_root_site_scope',
                    wp_json_encode(array_values($previous_scopes))
                );
            }
            $recorded_previous_status = (string) get_post_meta(
                $root_page_id,
                '_tio2_previous_root_status',
                true
            );
            $recorded_previous_scopes = json_decode(
                (string) get_post_meta($root_page_id, '_tio2_previous_root_site_scope', true),
                true
            );
            if ('root-metadata-readback-failure' === ($plan['failurePoint'] ?? '') && 'tio2-a' === $site_id) {
                $recorded_previous_status = 'injected-readback-failure';
            }
            if ('publish' !== $recorded_previous_status || $recorded_previous_scopes !== [$site_id]) {
                throw new RuntimeException("Root rollback metadata read-back rejected at post {$root_page_id}.");
            }
            tio2_seed_update_post_status_exact($root_page_id, 'draft');
            $released = wp_set_object_terms($root_page_id, [], 'site_scope', false);
            if (is_wp_error($released)) {
                throw new RuntimeException($released->get_error_message());
            }
            $summary['root_pages_drafted']++;
            do_action('tio2_seed_homepage_after_root_release', $root_page_id, $homepage_id, $site_id);
            if ('after-root-release' === ($plan['failurePoint'] ?? '')) {
                throw new RuntimeException('Injected seed failure after root release.');
            }

            $remaining_root_owners = array_values(array_filter(
                tio2_find_managed_route_post_ids($site_id, '/'),
                static fn (int $post_id): bool => $post_id !== $homepage_id
            ));
            if ([] !== $remaining_root_owners) {
                throw new RuntimeException("Site root {$site_id} still has an owner after migration release.");
            }

            tio2_seed_update_post_slug_exact($homepage_id, (string) $homepage['internalSlug']);
            tio2_enforce_homepage_contract($homepage_id);
            $validation = tio2_validate_homepage_contract($homepage_id);
            if (is_wp_error($validation)) {
                throw new RuntimeException(
                    $site_id . ' slug=' . get_post_field('post_name', $homepage_id) . ' ' .
                    $validation->get_error_code() . ': ' . $validation->get_error_message()
                );
            }
            $published = wp_update_post(['ID' => $homepage_id, 'post_status' => 'publish'], true);
            if (is_wp_error($published)) {
                throw new RuntimeException($published->get_error_message());
            }
            if ('publish' !== get_post_status($homepage_id)) {
                throw new RuntimeException("Homepage {$site_id} failed to publish.");
            }
        }
    $commit_result = 'commit-failure' === ($plan['failurePoint'] ?? '')
        ? false
        : $wpdb->query('COMMIT');
    if (false === $commit_result) {
        $message = 'commit-failure' === ($plan['failurePoint'] ?? '')
            ? 'Injected seed transaction failure at COMMIT.'
            : 'Failed to commit seed transaction.';
        throw new RuntimeException($message);
    }
    $GLOBALS['tio2_seed_transaction_started'] = false;
    tio2_seed_clear_touched_caches();
} catch (Throwable $error) {
    $rollback_failed = false;
    if (! empty($GLOBALS['tio2_seed_transaction_started'])) {
        $rollback_result = $wpdb->query('ROLLBACK');
        $rollback_failed = false === $rollback_result;
        $GLOBALS['tio2_seed_transaction_started'] = false;
        $GLOBALS['tio2_webhook_queue'] = $GLOBALS['tio2_seed_webhook_queue_before_transaction'];
        tio2_seed_clear_touched_caches();
        WP_CLI::log(
            'TIO2_SEED_ROLLBACK_QUEUE_RESTORED count=' .
            count($GLOBALS['tio2_webhook_queue']) .
            ' touched=' . count($GLOBALS['tio2_seed_touched_post_ids'])
        );
    }
    $rollback_suffix = $rollback_failed ? ' Rollback command also failed.' : '';
    WP_CLI::error('Seed transaction failed: ' . $error->getMessage() . $rollback_suffix);
} finally {
    wp_defer_comment_counting(false);
    wp_defer_term_counting(false);
    wp_suspend_cache_invalidation(false);
    tio2_seed_clear_touched_caches();
}

WP_CLI::log('TIO2_SEED_SUMMARY ' . wp_json_encode($summary));
