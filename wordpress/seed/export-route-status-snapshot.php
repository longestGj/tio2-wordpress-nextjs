<?php

if (! defined('ABSPATH')) {
    exit(1);
}

const TIO2_ROOT_ONLY_SNAPSHOT_SCHEMA = 'root-only-retirement-v0.1';
const TIO2_ROOT_ONLY_INVENTORY_VERSION = 'root-only-v0.1';
const TIO2_ROOT_ONLY_PAGE_COUNT_PER_SITE = 504;
const TIO2_ROOT_ONLY_BATCH_LIMIT = 256;

function tio2_root_only_fail(string $message): never
{
    throw new RuntimeException($message);
}

/**
 * @param mixed $value
 * @return mixed
 */
function tio2_root_only_canonicalize($value)
{
    if (! is_array($value)) {
        return $value;
    }
    if (! array_is_list($value)) {
        ksort($value, SORT_STRING);
    }
    foreach ($value as $key => $item) {
        $value[$key] = tio2_root_only_canonicalize($item);
    }
    return $value;
}

/**
 * @param mixed $value
 */
function tio2_root_only_sha256($value): string
{
    $json = wp_json_encode(
        tio2_root_only_canonicalize($value),
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
    return 'sha256:' . hash('sha256', (string) $json);
}

/**
 * Content values are hashed for preflight and post-transition preservation,
 * but are never embedded in the snapshot or written during restore.
 */
function tio2_root_only_content_checksum(int $post_id): string
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post) {
        tio2_root_only_fail("Missing record while checksumming ID {$post_id}.");
    }

    $meta = get_post_meta($post_id);
    unset($meta['_edit_lock'], $meta['_edit_last']);
    ksort($meta, SORT_STRING);
    foreach ($meta as &$values) {
        if (is_array($values)) {
            sort($values, SORT_STRING);
        }
    }
    unset($values);

    $attachments = get_children([
        'post_parent' => $post_id,
        'post_type' => 'attachment',
        'post_status' => 'any',
        'fields' => 'ids',
        'orderby' => 'ID',
        'order' => 'ASC',
    ]);

    return tio2_root_only_sha256([
        'title' => $post->post_title,
        'content' => $post->post_content,
        'excerpt' => $post->post_excerpt,
        'parent' => (int) $post->post_parent,
        'menuOrder' => (int) $post->menu_order,
        'mimeType' => $post->post_mime_type,
        'meta' => $meta,
        'attachmentIds' => array_values(array_map('intval', $attachments)),
    ]);
}

/**
 * @return list<string>
 */
function tio2_root_only_site_scopes(int $post_id): array
{
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes)) {
        tio2_root_only_fail("Could not read site ownership for ID {$post_id}: {$scopes->get_error_message()}");
    }
    $scopes = array_values(array_unique(array_map('strval', $scopes)));
    sort($scopes, SORT_STRING);
    return $scopes;
}

function tio2_root_only_expected_slug(string $site_id, string $public_path): string
{
    if ('/' === $public_path || ! tio2_is_valid_public_path($public_path)) {
        tio2_root_only_fail("Invalid non-root Page path for {$site_id}: {$public_path}");
    }
    return $site_id . '--' . str_replace('/', '--', substr($public_path, 1));
}

/**
 * @param array<string, mixed> $identity
 */
function tio2_root_only_identity_checksum(array $identity): string
{
    return tio2_root_only_sha256($identity);
}

/**
 * @return array{state: string, pages: list<array<string, mixed>>, product: array<string, mixed>, homepages: list<array<string, mixed>>, retainedCorpus: list<array<string, mixed>>, retainedRecords: int}
 */
function tio2_root_only_collect_live_state(): array
{
    $site_ids = ['tio2-a', 'tio2-b'];
    $page_ids = get_posts([
        'post_type' => ['page', 'post'],
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
    ]);

    $pages = [];
    $retained_corpus = [];
    $retained_records = 0;
    $route_owners = [];
    foreach ($page_ids as $raw_page_id) {
        $page_id = (int) $raw_page_id;
        $post = get_post($page_id);
        if (! $post instanceof WP_Post) {
            continue;
        }
        $path = (string) get_post_meta($page_id, 'public_path', true);
        $marker = (string) get_post_meta($page_id, '_tio2_seed_internal_slug', true);
        $superseded = (string) get_post_meta($page_id, '_tio2_seed_superseded_snapshot', true);
        $scopes = tio2_root_only_site_scopes($page_id);
        $is_managed = '' !== $marker || '' !== $path || [] !== array_intersect($site_ids, $scopes);
        if (! $is_managed) {
            continue;
        }
        $retained_records++;
        if ('trash' === $post->post_status) {
            tio2_root_only_fail("Preflight rejected pending deletes/trash for retained Page ID {$page_id}.");
        }
        if ('' !== $superseded) {
            $snapshot_data = json_decode($superseded, true);
            $snapshot_keys = is_array($snapshot_data) ? array_keys($snapshot_data) : [];
            sort($snapshot_keys, SORT_STRING);
            if (
                'draft' !== $post->post_status ||
                ['publicPath', 'siteScopes', 'slug', 'status'] !== $snapshot_keys ||
                1 !== count($scopes) ||
                ! in_array($scopes[0], $site_ids, true)
            ) {
                tio2_root_only_fail("Preflight rejected superseded retained Page state for ID {$page_id}.");
            }
            $site_id = $scopes[0];
            if (! preg_match('#^/test-content/long-tail-([1-9][0-9]?)$#', $path, $match)) {
                tio2_root_only_fail("Preflight rejected superseded retained Page path for ID {$page_id}.");
            }
            $expected_slug = $site_id . '--test-content--long-tail-' . $match[1];
            if (
                $post->post_name !== $expected_slug ||
                $marker !== $expected_slug ||
                'publish' !== ($snapshot_data['status'] ?? null) ||
                $expected_slug !== ($snapshot_data['slug'] ?? null) ||
                $path !== ($snapshot_data['publicPath'] ?? null) ||
                [$site_id] !== ($snapshot_data['siteScopes'] ?? null)
            ) {
                tio2_root_only_fail("Preflight rejected superseded retained Page identity for ID {$page_id}.");
            }
            $identity = [
                'kind' => 'superseded-page',
                'id' => $page_id,
                'postType' => 'page',
                'siteScope' => $site_id,
                'publicPath' => $path,
                'slug' => $post->post_name,
                'seedMarker' => $marker,
                'supersededSnapshot' => $snapshot_data,
            ];
            $retained_corpus[] = $identity + [
                'status' => 'draft',
                'modifiedGmt' => $post->post_modified_gmt,
                'contentChecksum' => tio2_root_only_content_checksum($page_id),
                'identityChecksum' => tio2_root_only_identity_checksum($identity),
            ];
            continue;
        }
        if ('/' === $path) {
            $previous_status = (string) get_post_meta($page_id, '_tio2_previous_root_status', true);
            $previous_scopes = json_decode(
                (string) get_post_meta($page_id, '_tio2_previous_root_site_scope', true),
                true
            );
            $site_id = is_array($previous_scopes) && 1 === count($previous_scopes)
                ? (string) $previous_scopes[0]
                : '';
            $expected_slug = $site_id . '--home';
            if (
                ! in_array($site_id, $site_ids, true) ||
                'draft' !== $post->post_status ||
                [] !== $scopes ||
                'publish' !== $previous_status ||
                [$site_id] !== $previous_scopes ||
                $expected_slug !== $post->post_name ||
                $expected_slug !== $marker
            ) {
                tio2_root_only_fail("Preflight rejected retained root backup identity for ID {$page_id}.");
            }
            $identity = [
                'kind' => 'root-backup',
                'id' => $page_id,
                'postType' => 'page',
                'siteScope' => $site_id,
                'publicPath' => '/',
                'slug' => $post->post_name,
                'seedMarker' => $marker,
                'previousStatus' => 'publish',
                'previousSiteScopes' => [$site_id],
            ];
            $retained_corpus[] = $identity + [
                'status' => 'draft',
                'modifiedGmt' => $post->post_modified_gmt,
                'contentChecksum' => tio2_root_only_content_checksum($page_id),
                'identityChecksum' => tio2_root_only_identity_checksum($identity),
            ];
            continue;
        }
        if ('' === $path && '' === $marker && [] === array_intersect($site_ids, $scopes)) {
            continue;
        }
        if (1 !== count($scopes) || ! in_array($scopes[0], $site_ids, true)) {
            tio2_root_only_fail("Preflight rejected ambiguous Page ownership for ID {$page_id}.");
        }
        $site_id = $scopes[0];
        if ('' === $path || ! tio2_is_valid_public_path($path)) {
            tio2_root_only_fail("Preflight rejected missing or malformed Page path for ID {$page_id}.");
        }
        $expected_slug = tio2_root_only_expected_slug($site_id, $path);
        if ($post->post_name !== $expected_slug || $marker !== $expected_slug) {
            tio2_root_only_fail("Preflight rejected Page identity drift for ID {$page_id}.");
        }
        $owner_key = $site_id . ':' . $path;
        if (isset($route_owners[$owner_key])) {
            tio2_root_only_fail("Preflight rejected duplicate/ambiguous route ownership for {$owner_key}.");
        }
        $route_owners[$owner_key] = $page_id;

        $identity = [
            'kind' => 'page-route',
            'id' => $page_id,
            'postType' => $post->post_type,
            'siteScope' => $site_id,
            'publicPath' => $path,
            'slug' => $post->post_name,
            'seedMarker' => $marker,
        ];
        $pages[] = $identity + [
            'status' => $post->post_status,
            'modifiedGmt' => $post->post_modified_gmt,
            'contentChecksum' => tio2_root_only_content_checksum($page_id),
            'identityChecksum' => tio2_root_only_identity_checksum($identity),
        ];
    }

    usort($pages, static function (array $left, array $right): int {
        return [$left['siteScope'], $left['publicPath'], $left['id']]
            <=> [$right['siteScope'], $right['publicPath'], $right['id']];
    });
    foreach ($site_ids as $site_id) {
        $site_pages = array_values(array_filter(
            $pages,
            static fn(array $page): bool => $site_id === $page['siteScope']
        ));
        if (TIO2_ROOT_ONLY_PAGE_COUNT_PER_SITE !== count($site_pages)) {
            tio2_root_only_fail(
                "Preflight rejected unexpected Page count for {$site_id}: expected 504, found " . count($site_pages) . '.'
            );
        }
        $site_superseded = array_values(array_filter(
            $retained_corpus,
            static fn(array $record): bool =>
                'superseded-page' === $record['kind'] && $site_id === $record['siteScope']
        ));
        if (99 !== count($site_superseded)) {
            tio2_root_only_fail(
                "Preflight rejected superseded retained Page count for {$site_id}: expected 99, found " .
                count($site_superseded) . '.'
            );
        }
    }
    $root_backups = array_values(array_filter(
        $retained_corpus,
        static fn(array $record): bool => 'root-backup' === $record['kind']
    ));
    if (2 !== count($root_backups)) {
        tio2_root_only_fail('Preflight rejected retained root backup count: expected two.');
    }
    usort($retained_corpus, static function (array $left, array $right): int {
        return [$left['kind'], $left['siteScope'], $left['publicPath'], $left['id']]
            <=> [$right['kind'], $right['siteScope'], $right['publicPath'], $right['id']];
    });

    $product_ids = get_posts([
        'post_type' => 'tio2_product',
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'meta_key' => '_tio2_seed_fixture_id',
        'meta_value' => 'test-product-reference',
        'no_found_rows' => true,
    ]);
    if (1 !== count($product_ids)) {
        tio2_root_only_fail('Preflight rejected missing or ambiguous Product fixture ownership.');
    }
    $product_id = (int) $product_ids[0];
    $product_post = get_post($product_id);
    if (! $product_post instanceof WP_Post || 'trash' === $product_post->post_status) {
        tio2_root_only_fail('Preflight rejected pending deletes/trash for the Product fixture.');
    }
    $product_path_value = get_post_meta($product_id, 'public_path', true);
    $product_path = '' === $product_path_value ? null : (string) $product_path_value;
    if (
        'tio2_product' !== $product_post->post_type ||
        'test-product-reference' !== $product_post->post_name ||
        'test-product-reference' !== get_post_meta($product_id, '_tio2_seed_fixture_id', true) ||
        null !== $product_path
    ) {
        tio2_root_only_fail('Preflight rejected Product fixture identity drift.');
    }
    $product_identity = [
        'kind' => 'product-fixture',
        'id' => $product_id,
        'postType' => 'tio2_product',
        'publicPath' => null,
        'slug' => 'test-product-reference',
        'fixtureId' => 'test-product-reference',
    ];
    $product = $product_identity + [
        'status' => $product_post->post_status,
        'siteScopes' => tio2_root_only_site_scopes($product_id),
        'modifiedGmt' => $product_post->post_modified_gmt,
        'contentChecksum' => tio2_root_only_content_checksum($product_id),
        'identityChecksum' => tio2_root_only_identity_checksum($product_identity),
    ];

    $homepage_ids = get_posts([
        'post_type' => 'tio2_homepage',
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future', 'trash'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
    ]);
    $homepages = [];
    foreach ($homepage_ids as $raw_homepage_id) {
        $homepage_id = (int) $raw_homepage_id;
        $marker = (string) get_post_meta($homepage_id, '_tio2_seed_homepage_site_id', true);
        if (! in_array($marker, $site_ids, true)) {
            continue;
        }
        $homepages[] = [
            'id' => $homepage_id,
            'siteScope' => $marker,
            'status' => (string) get_post_status($homepage_id),
            'slug' => (string) get_post_field('post_name', $homepage_id),
            'siteScopes' => tio2_root_only_site_scopes($homepage_id),
        ];
    }
    if (2 !== count($homepages)) {
        tio2_root_only_fail('Preflight rejected missing or duplicate dedicated homepage ownership.');
    }
    foreach ($homepages as $homepage) {
        if (
            'publish' !== $homepage['status'] ||
            [$homepage['siteScope']] !== $homepage['siteScopes'] ||
            $homepage['siteScope'] . '--homepage' !== $homepage['slug']
        ) {
            tio2_root_only_fail("Preflight rejected dedicated homepage identity for {$homepage['siteScope']}.");
        }
    }

    $page_statuses = array_values(array_unique(array_column($pages, 'status')));
    sort($page_statuses, SORT_STRING);
    $legacy = ['publish'] === $page_statuses
        && 'publish' === $product['status']
        && [] === $product['siteScopes'];
    $target = ['draft'] === $page_statuses
        && 'draft' === $product['status']
        && ['tio2-a'] === $product['siteScopes'];
    if (! $legacy && ! $target) {
        tio2_root_only_fail('Preflight rejected mixed/partial legacy and target state.');
    }

    return [
        'state' => $legacy ? 'legacy' : 'target',
        'pages' => $pages,
        'product' => $product,
        'homepages' => $homepages,
        'retainedCorpus' => $retained_corpus,
        'retainedRecords' => $retained_records + 1,
    ];
}

/**
 * @return array<string, mixed>
 */
function tio2_root_only_build_snapshot(): array
{
    $live = tio2_root_only_collect_live_state();
    $records = [];
    foreach ($live['pages'] as $page) {
        $records[] = [
            'kind' => 'page-route',
            'id' => $page['id'],
            'postType' => $page['postType'],
            'previousStatus' => 'publish',
            'targetStatus' => 'draft',
            'siteScope' => $page['siteScope'],
            'publicPath' => $page['publicPath'],
            'slug' => $page['slug'],
            'seedMarker' => $page['seedMarker'],
            'modifiedGmt' => $page['modifiedGmt'],
            'contentChecksum' => $page['contentChecksum'],
            'identityChecksum' => $page['identityChecksum'],
        ];
    }
    $product = $live['product'];
    $records[] = [
        'kind' => 'product-fixture',
        'id' => $product['id'],
        'postType' => 'tio2_product',
        'previousStatus' => 'publish',
        'targetStatus' => 'draft',
        'previousSiteScopes' => [],
        'targetSiteScopes' => ['tio2-a'],
        'publicPath' => null,
        'slug' => 'test-product-reference',
        'fixtureId' => 'test-product-reference',
        'modifiedGmt' => $product['modifiedGmt'],
        'contentChecksum' => $product['contentChecksum'],
        'identityChecksum' => $product['identityChecksum'],
    ];

    $snapshot = [
        'schemaVersion' => TIO2_ROOT_ONLY_SNAPSHOT_SCHEMA,
        'inventoryVersion' => TIO2_ROOT_ONLY_INVENTORY_VERSION,
        'createdAt' => gmdate('c'),
        'sourceState' => $live['state'],
        'records' => $records,
        'retainedCorpus' => $live['retainedCorpus'],
    ];
    $snapshot['snapshotChecksum'] = tio2_root_only_sha256($snapshot);
    return $snapshot;
}

/**
 * @param array<string, mixed> $snapshot
 */
function tio2_root_only_validate_snapshot(array $snapshot): string
{
    $required_keys = [
        'schemaVersion',
        'inventoryVersion',
        'createdAt',
        'sourceState',
        'records',
        'retainedCorpus',
        'snapshotChecksum',
    ];
    $actual_keys = array_keys($snapshot);
    sort($required_keys, SORT_STRING);
    sort($actual_keys, SORT_STRING);
    if ($required_keys !== $actual_keys) {
        tio2_root_only_fail('Snapshot checksum/typed schema rejected unexpected root keys.');
    }
    if (
        TIO2_ROOT_ONLY_SNAPSHOT_SCHEMA !== $snapshot['schemaVersion'] ||
        TIO2_ROOT_ONLY_INVENTORY_VERSION !== $snapshot['inventoryVersion'] ||
        ! is_string($snapshot['createdAt']) ||
        1 !== preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|\+00:00)$/D', $snapshot['createdAt']) ||
        ! is_string($snapshot['sourceState']) ||
        ! in_array($snapshot['sourceState'], ['legacy', 'target'], true) ||
        ! is_array($snapshot['records']) ||
        ! array_is_list($snapshot['records']) ||
        1009 !== count($snapshot['records']) ||
        ! is_array($snapshot['retainedCorpus']) ||
        ! array_is_list($snapshot['retainedCorpus']) ||
        200 !== count($snapshot['retainedCorpus']) ||
        ! is_string($snapshot['snapshotChecksum']) ||
        1 !== preg_match('/^sha256:[0-9a-f]{64}$/D', $snapshot['snapshotChecksum'])
    ) {
        tio2_root_only_fail('Snapshot checksum/typed schema validation failed.');
    }
    $expected_checksum = (string) $snapshot['snapshotChecksum'];
    $payload = $snapshot;
    unset($payload['snapshotChecksum']);
    if (! hash_equals(tio2_root_only_sha256($payload), $expected_checksum)) {
        tio2_root_only_fail('Snapshot checksum mismatch.');
    }

    $checksum_pattern = '/^sha256:[0-9a-f]{64}$/D';
    $modified_pattern = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/D';
    $page_count = ['tio2-a' => 0, 'tio2-b' => 0];
    $product_count = 0;
    $record_ids = [];
    $route_keys = [];
    foreach ($snapshot['records'] as $record) {
        if (! is_array($record) || array_is_list($record)) {
            tio2_root_only_fail('Snapshot typed record is not an object.');
        }
        $record_id = $record['id'] ?? null;
        if (! is_int($record_id) || $record_id <= 0 || isset($record_ids[$record_id])) {
            tio2_root_only_fail('Snapshot record IDs must be unique positive integers.');
        }
        $record_ids[$record_id] = true;
        if ('page-route' === ($record['kind'] ?? null)) {
            $keys = [
                'kind', 'id', 'postType', 'previousStatus', 'targetStatus', 'siteScope',
                'publicPath', 'slug', 'seedMarker', 'modifiedGmt', 'contentChecksum', 'identityChecksum',
            ];
            $record_keys = array_keys($record);
            sort($keys, SORT_STRING);
            sort($record_keys, SORT_STRING);
            if (
                $keys !== $record_keys ||
                'page' !== $record['postType'] ||
                'publish' !== $record['previousStatus'] ||
                'draft' !== $record['targetStatus'] ||
                ! is_string($record['siteScope']) ||
                ! in_array($record['siteScope'], ['tio2-a', 'tio2-b'], true) ||
                ! is_string($record['publicPath']) ||
                '/' === $record['publicPath'] ||
                ! tio2_is_valid_public_path($record['publicPath']) ||
                ! is_string($record['slug']) ||
                $record['slug'] !== tio2_root_only_expected_slug($record['siteScope'], $record['publicPath']) ||
                $record['seedMarker'] !== $record['slug'] ||
                ! is_string($record['modifiedGmt']) ||
                1 !== preg_match($modified_pattern, $record['modifiedGmt']) ||
                ! is_string($record['contentChecksum']) ||
                1 !== preg_match($checksum_pattern, $record['contentChecksum']) ||
                ! is_string($record['identityChecksum']) ||
                1 !== preg_match($checksum_pattern, $record['identityChecksum'])
            ) {
                tio2_root_only_fail('Snapshot typed Page variant is invalid.');
            }
            $identity = [
                'kind' => 'page-route',
                'id' => $record_id,
                'postType' => 'page',
                'siteScope' => $record['siteScope'],
                'publicPath' => $record['publicPath'],
                'slug' => $record['slug'],
                'seedMarker' => $record['seedMarker'],
            ];
            if (! hash_equals(tio2_root_only_identity_checksum($identity), $record['identityChecksum'])) {
                tio2_root_only_fail("Snapshot Page identity checksum mismatch for ID {$record_id}.");
            }
            $route_key = $record['siteScope'] . ':' . $record['publicPath'];
            if (isset($route_keys[$route_key])) {
                tio2_root_only_fail("Snapshot contains duplicate exact route key {$route_key}.");
            }
            $route_keys[$route_key] = true;
            $page_count[$record['siteScope']]++;
        } elseif ('product-fixture' === ($record['kind'] ?? null)) {
            $product_count++;
            $keys = [
                'kind', 'id', 'postType', 'previousStatus', 'targetStatus',
                'previousSiteScopes', 'targetSiteScopes', 'publicPath', 'slug',
                'fixtureId', 'modifiedGmt', 'contentChecksum', 'identityChecksum',
            ];
            $record_keys = array_keys($record);
            sort($keys, SORT_STRING);
            sort($record_keys, SORT_STRING);
            if (
                $keys !== $record_keys ||
                'tio2_product' !== $record['postType'] ||
                'publish' !== $record['previousStatus'] ||
                'draft' !== $record['targetStatus'] ||
                [] !== $record['previousSiteScopes'] ||
                ['tio2-a'] !== $record['targetSiteScopes'] ||
                null !== $record['publicPath'] ||
                'test-product-reference' !== $record['slug'] ||
                'test-product-reference' !== $record['fixtureId'] ||
                ! is_string($record['modifiedGmt']) ||
                1 !== preg_match($modified_pattern, $record['modifiedGmt']) ||
                ! is_string($record['contentChecksum']) ||
                1 !== preg_match($checksum_pattern, $record['contentChecksum']) ||
                ! is_string($record['identityChecksum']) ||
                1 !== preg_match($checksum_pattern, $record['identityChecksum'])
            ) {
                tio2_root_only_fail('Snapshot typed Product variant is invalid.');
            }
            $identity = [
                'kind' => 'product-fixture',
                'id' => $record_id,
                'postType' => 'tio2_product',
                'publicPath' => null,
                'slug' => 'test-product-reference',
                'fixtureId' => 'test-product-reference',
            ];
            if (! hash_equals(tio2_root_only_identity_checksum($identity), $record['identityChecksum'])) {
                tio2_root_only_fail("Snapshot Product identity checksum mismatch for ID {$record_id}.");
            }
        } else {
            tio2_root_only_fail('Snapshot contains an unknown typed record variant.');
        }
    }
    if (504 !== $page_count['tio2-a'] || 504 !== $page_count['tio2-b'] || 1 !== $product_count) {
        tio2_root_only_fail('Snapshot typed record counts are invalid.');
    }

    $retained_counts = ['tio2-a' => 0, 'tio2-b' => 0];
    $root_sites = [];
    $retained_keys = [];
    foreach ($snapshot['retainedCorpus'] as $record) {
        if (! is_array($record) || array_is_list($record)) {
            tio2_root_only_fail('Snapshot retained corpus record is not an object.');
        }
        $record_id = $record['id'] ?? null;
        if (! is_int($record_id) || $record_id <= 0 || isset($record_ids[$record_id])) {
            tio2_root_only_fail('Snapshot retained corpus IDs must be unique positive integers.');
        }
        $record_ids[$record_id] = true;
        $site_id = $record['siteScope'] ?? null;
        if (! is_string($site_id) || ! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
            tio2_root_only_fail('Snapshot retained corpus ownership is invalid.');
        }
        if (
            'page' !== ($record['postType'] ?? null) ||
            'draft' !== ($record['status'] ?? null) ||
            ! is_string($record['modifiedGmt'] ?? null) ||
            1 !== preg_match($modified_pattern, $record['modifiedGmt']) ||
            ! is_string($record['contentChecksum'] ?? null) ||
            1 !== preg_match($checksum_pattern, $record['contentChecksum']) ||
            ! is_string($record['identityChecksum'] ?? null) ||
            1 !== preg_match($checksum_pattern, $record['identityChecksum'])
        ) {
            tio2_root_only_fail('Snapshot retained corpus scalar/status/checksum fields are invalid.');
        }
        if ('superseded-page' === ($record['kind'] ?? null)) {
            $keys = [
                'kind', 'id', 'postType', 'siteScope', 'publicPath', 'slug', 'seedMarker',
                'supersededSnapshot', 'status', 'modifiedGmt', 'contentChecksum', 'identityChecksum',
            ];
            $record_keys = array_keys($record);
            sort($keys, SORT_STRING);
            sort($record_keys, SORT_STRING);
            $match = [];
            if (
                $keys !== $record_keys ||
                ! is_string($record['publicPath']) ||
                1 !== preg_match('#^/test-content/long-tail-([1-9][0-9]?)$#D', $record['publicPath'], $match)
            ) {
                tio2_root_only_fail('Snapshot superseded retained Page variant is invalid.');
            }
            $expected_slug = $site_id . '--test-content--long-tail-' . $match[1];
            $superseded = $record['supersededSnapshot'];
            if (
                $record['slug'] !== $expected_slug ||
                $record['seedMarker'] !== $expected_slug ||
                ! is_array($superseded) ||
                array_keys($superseded) !== ['status', 'slug', 'publicPath', 'siteScopes'] ||
                'publish' !== $superseded['status'] ||
                $expected_slug !== $superseded['slug'] ||
                $record['publicPath'] !== $superseded['publicPath'] ||
                [$site_id] !== $superseded['siteScopes']
            ) {
                tio2_root_only_fail('Snapshot superseded retained Page identity is invalid.');
            }
            $identity = [
                'kind' => 'superseded-page',
                'id' => $record_id,
                'postType' => 'page',
                'siteScope' => $site_id,
                'publicPath' => $record['publicPath'],
                'slug' => $record['slug'],
                'seedMarker' => $record['seedMarker'],
                'supersededSnapshot' => $superseded,
            ];
            $retained_counts[$site_id]++;
            $retained_key = $site_id . ':' . $record['publicPath'];
        } elseif ('root-backup' === ($record['kind'] ?? null)) {
            $keys = [
                'kind', 'id', 'postType', 'siteScope', 'publicPath', 'slug', 'seedMarker',
                'previousStatus', 'previousSiteScopes', 'status', 'modifiedGmt',
                'contentChecksum', 'identityChecksum',
            ];
            $record_keys = array_keys($record);
            sort($keys, SORT_STRING);
            sort($record_keys, SORT_STRING);
            $expected_slug = $site_id . '--home';
            if (
                $keys !== $record_keys ||
                '/' !== $record['publicPath'] ||
                $expected_slug !== $record['slug'] ||
                $expected_slug !== $record['seedMarker'] ||
                'publish' !== $record['previousStatus'] ||
                [$site_id] !== $record['previousSiteScopes'] ||
                isset($root_sites[$site_id])
            ) {
                tio2_root_only_fail('Snapshot retained root backup variant is invalid.');
            }
            $root_sites[$site_id] = true;
            $identity = [
                'kind' => 'root-backup',
                'id' => $record_id,
                'postType' => 'page',
                'siteScope' => $site_id,
                'publicPath' => '/',
                'slug' => $record['slug'],
                'seedMarker' => $record['seedMarker'],
                'previousStatus' => 'publish',
                'previousSiteScopes' => [$site_id],
            ];
            $retained_key = $site_id . ':/';
        } else {
            tio2_root_only_fail('Snapshot contains an unknown retained corpus variant.');
        }
        if (isset($retained_keys[$retained_key])) {
            tio2_root_only_fail("Snapshot retained corpus contains duplicate identity {$retained_key}.");
        }
        $retained_keys[$retained_key] = true;
        if (! hash_equals(tio2_root_only_identity_checksum($identity), $record['identityChecksum'])) {
            tio2_root_only_fail("Snapshot retained corpus identity checksum mismatch for ID {$record_id}.");
        }
    }
    if (
        ['tio2-a' => 99, 'tio2-b' => 99] !== $retained_counts ||
        ['tio2-a', 'tio2-b'] !== array_keys($root_sites)
    ) {
        tio2_root_only_fail('Snapshot retained corpus exact partition is invalid.');
    }
    return $expected_checksum;
}

/**
 * @return array<string, mixed>
 */
function tio2_root_only_load_snapshot(string $path): array
{
    if (! defined('WP_CLI') || ! WP_CLI) {
        tio2_root_only_fail('Snapshot tooling is CLI-only and unreachable from HTTP.');
    }
    if (! is_readable($path)) {
        tio2_root_only_fail("Snapshot is not readable: {$path}");
    }
    try {
        $snapshot = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    } catch (Throwable $error) {
        tio2_root_only_fail('Snapshot JSON is invalid: ' . $error->getMessage());
    }
    if (! is_array($snapshot) || array_is_list($snapshot)) {
        tio2_root_only_fail('Snapshot root must be an object.');
    }
    tio2_root_only_validate_snapshot($snapshot);
    return $snapshot;
}

/**
 * Verify exact snapshot identity. Content checksums are required during
 * retirement, while restore intentionally permits later editorial edits.
 *
 * @param array<string, mixed> $snapshot
 * @return array{state: string, pages: list<array<string, mixed>>, product: array<string, mixed>, homepages: list<array<string, mixed>>, retainedCorpus: list<array<string, mixed>>, retainedRecords: int}
 */
function tio2_root_only_preflight(array $snapshot, bool $verify_content_checksum): array
{
    tio2_root_only_validate_snapshot($snapshot);
    $live = tio2_root_only_collect_live_state();
    $live_by_id = [];
    foreach ($live['pages'] as $page) {
        $live_by_id[(int) $page['id']] = $page;
    }
    $live_by_id[(int) $live['product']['id']] = $live['product'];
    if (count($live_by_id) !== count($snapshot['records'])) {
        tio2_root_only_fail('Preflight rejected unexpected record count before mutation.');
    }
    foreach ($snapshot['records'] as $record) {
        $record_id = (int) $record['id'];
        $current = $live_by_id[$record_id] ?? null;
        if (! is_array($current)) {
            tio2_root_only_fail("Preflight rejected missing snapshot record ID {$record_id} before mutation.");
        }
        if (! hash_equals((string) $record['identityChecksum'], (string) $current['identityChecksum'])) {
            tio2_root_only_fail("Preflight rejected identity checksum drift for ID {$record_id} before mutation.");
        }
        if (
            $verify_content_checksum &&
            ! hash_equals((string) $record['contentChecksum'], (string) $current['contentChecksum'])
        ) {
            tio2_root_only_fail("Preflight rejected content checksum drift for ID {$record_id} before mutation.");
        }
    }
    $retained_by_id = [];
    foreach ($live['retainedCorpus'] as $record) {
        $retained_by_id[(int) $record['id']] = $record;
    }
    if (count($retained_by_id) !== count($snapshot['retainedCorpus'])) {
        tio2_root_only_fail('Preflight rejected missing or extra retained corpus records before mutation.');
    }
    foreach ($snapshot['retainedCorpus'] as $record) {
        $record_id = $record['id'];
        $current = $retained_by_id[$record_id] ?? null;
        if (! is_array($current)) {
            tio2_root_only_fail("Preflight rejected missing retained corpus ID {$record_id} before mutation.");
        }
        if (! hash_equals($record['identityChecksum'], $current['identityChecksum'])) {
            tio2_root_only_fail("Preflight rejected retained corpus identity drift for ID {$record_id} before mutation.");
        }
        if (! hash_equals($record['contentChecksum'], $current['contentChecksum'])) {
            tio2_root_only_fail("Preflight rejected retained corpus checksum drift for ID {$record_id} before mutation.");
        }
    }
    return $live;
}

/**
 * @param array<string, mixed> $snapshot
 * @return list<array{siteId: string, paths: list<string>, tags: list<string>}>
 */
function tio2_root_only_invalidation_batches(array $snapshot): array
{
    $paths_by_site = ['tio2-a' => [], 'tio2-b' => []];
    foreach ($snapshot['records'] as $record) {
        if ('page-route' !== $record['kind']) {
            continue;
        }
        $paths_by_site[$record['siteScope']][] = $record['publicPath'];
    }
    $batches = [];
    foreach ($paths_by_site as $site_id => $paths) {
        $paths = array_values(array_unique($paths));
        sort($paths, SORT_STRING);
        foreach (array_chunk($paths, TIO2_ROOT_ONLY_BATCH_LIMIT) as $chunk) {
            $batches[] = [
                'siteId' => $site_id,
                'paths' => array_values($chunk),
                'tags' => ["content-list:{$site_id}", "sitemap:{$site_id}"],
            ];
        }
    }
    return $batches;
}

/**
 * Suppress per-record webhook fanout. The caller returns bounded local
 * owner invalidation batches; it performs no HTTP or remote cache action.
 *
 * @return mixed
 */
function tio2_root_only_without_webhook_fanout(callable $callback)
{
    $hooks = [
        ['transition_post_status', 'tio2_handle_post_transition', 10, 3],
        ['set_object_terms', 'tio2_handle_site_scope_set', 10, 6],
        ['deleted_term_relationships', 'tio2_handle_deleted_term_relationships', 10, 3],
    ];
    $removed = [];
    foreach ($hooks as $hook) {
        if (false !== has_action($hook[0], $hook[1]) && remove_action($hook[0], $hook[1], $hook[2])) {
            $removed[] = $hook;
        }
    }
    $previous_queue = $GLOBALS['tio2_webhook_queue'] ?? null;
    $GLOBALS['tio2_webhook_queue'] = [];
    try {
        return $callback();
    } finally {
        $GLOBALS['tio2_webhook_queue'] = is_array($previous_queue) ? $previous_queue : [];
        foreach ($removed as $hook) {
            add_action($hook[0], $hook[1], $hook[2], $hook[3]);
        }
    }
}

/**
 * The restore authorization exists only inside this WP-CLI process and only
 * for exact snapshot-bound record tuples. Publication guards stay installed.
 *
 * @param array<string, mixed> $snapshot
 * @return mixed
 */
function tio2_root_only_with_restore_context(array $snapshot, callable $callback)
{
    if (! defined('WP_CLI') || ! WP_CLI) {
        tio2_root_only_fail('Verified restore context is CLI-only and unreachable from HTTP.');
    }
    $snapshot_checksum = tio2_root_only_validate_snapshot($snapshot);
    if (1 !== preg_match('/^sha256:[0-9a-f]{64}$/D', $snapshot_checksum)) {
        tio2_root_only_fail('Verified restore context requires a matching snapshot checksum.');
    }
    if (isset($GLOBALS['tio2_root_only_restore_context'])) {
        tio2_root_only_fail('Verified restore context cannot be nested.');
    }
    $allowlist = [];
    foreach ($snapshot['records'] as $record) {
        $tuple = [
            'id' => $record['id'],
            'postType' => $record['postType'],
            'status' => $record['previousStatus'],
            'snapshotChecksum' => $snapshot_checksum,
        ];
        if ('product-fixture' === $record['kind']) {
            $tuple['siteScopes'] = $record['previousSiteScopes'];
        }
        $allowlist[$record['id'] . ':' . $record['postType'] . ':' . $record['previousStatus']] = $tuple;
    }
    $GLOBALS['tio2_root_only_restore_context'] = [
        'snapshotChecksum' => $snapshot_checksum,
        'allowlist' => $allowlist,
    ];
    try {
        return $callback($snapshot_checksum);
    } finally {
        unset($GLOBALS['tio2_root_only_restore_context']);
    }
}

function tio2_root_only_restore_context_active(): bool
{
    $context = $GLOBALS['tio2_root_only_restore_context'] ?? null;
    return
        is_array($context) &&
        isset($context['snapshotChecksum'], $context['allowlist']) &&
        is_string($context['snapshotChecksum']) &&
        1 === preg_match('/^sha256:[0-9a-f]{64}$/D', $context['snapshotChecksum']) &&
        is_array($context['allowlist']);
}

function tio2_root_only_restore_candidate_allowed(int $post_id, string $post_type, string $status): bool
{
    if (! tio2_root_only_restore_context_active()) {
        return false;
    }
    $context = $GLOBALS['tio2_root_only_restore_context'];
    $key = $post_id . ':' . $post_type . ':' . $status;
    $tuple = $context['allowlist'][$key] ?? null;
    if (
        ! is_array($tuple) ||
        $post_id !== ($tuple['id'] ?? null) ||
        $post_type !== ($tuple['postType'] ?? null) ||
        $status !== ($tuple['status'] ?? null) ||
        $context['snapshotChecksum'] !== ($tuple['snapshotChecksum'] ?? null)
    ) {
        return false;
    }
    if ('tio2_product' === $post_type) {
        return ($tuple['siteScopes'] ?? null) === tio2_root_only_site_scopes($post_id);
    }
    return in_array($post_type, ['page', 'post'], true);
}

function tio2_root_only_update_status(int $post_id, string $status): void
{
    $original_slug = (string) get_post_field('post_name', $post_id);
    $preserve_exact_slug = static function (
        string $sanitized,
        string $raw_title,
        string $context
    ) use ($original_slug): string {
        return $raw_title === $original_slug ? $original_slug : $sanitized;
    };
    add_filter('sanitize_title', $preserve_exact_slug, PHP_INT_MAX, 3);
    try {
        $result = wp_update_post([
            'ID' => $post_id,
            'post_status' => $status,
            'post_name' => $original_slug,
        ], true);
    } finally {
        remove_filter('sanitize_title', $preserve_exact_slug, PHP_INT_MAX);
    }
    if (
        is_wp_error($result) ||
        $post_id !== (int) $result ||
        $status !== get_post_status($post_id) ||
        $original_slug !== get_post_field('post_name', $post_id)
    ) {
        $message = is_wp_error($result) ? $result->get_error_message() : 'status read-back mismatch';
        tio2_root_only_fail("WordPress API status transition failed for ID {$post_id}: {$message}");
    }
}

/**
 * @param list<string> $site_scopes
 */
function tio2_root_only_update_scopes(int $post_id, array $site_scopes): void
{
    $result = wp_set_object_terms($post_id, $site_scopes, 'site_scope', false);
    if (is_wp_error($result) || $site_scopes !== tio2_root_only_site_scopes($post_id)) {
        $message = is_wp_error($result) ? $result->get_error_message() : 'scope read-back mismatch';
        tio2_root_only_fail("WordPress API scope transition failed for ID {$post_id}: {$message}");
    }
}

/**
 * Attempt compensation for every changed record and collect all failures.
 *
 * @param array<string, mixed>       $snapshot
 * @param list<array<string, mixed>> $mutated_records
 * @return list<string>
 */
function tio2_root_only_compensate_records(
    array $snapshot,
    array $mutated_records,
    string $source_state,
    int $failure_at,
    string $operation_label
): array {
    $errors = [];
    $attempt = static function () use (
        $mutated_records,
        $source_state,
        $failure_at,
        $operation_label,
        &$errors
    ): void {
        $attempt_number = 0;
        foreach (array_reverse($mutated_records) as $record) {
            $attempt_number++;
            $post_id = $record['id'];
            try {
                if ($failure_at > 0 && $failure_at === $attempt_number) {
                    tio2_root_only_fail(
                        "Injected {$operation_label} rollback operation failure at ID {$post_id}."
                    );
                }
                if ('legacy' === $source_state) {
                    if ('page-route' === $record['kind']) {
                        tio2_root_only_update_status($post_id, $record['previousStatus']);
                    } elseif ('product-fixture' === $record['kind']) {
                        tio2_root_only_update_scopes($post_id, $record['previousSiteScopes']);
                        tio2_root_only_update_status($post_id, $record['previousStatus']);
                    } else {
                        tio2_root_only_fail('Legacy compensation encountered an unknown typed snapshot record.');
                    }
                } elseif ('target' === $source_state) {
                    if ('page-route' === $record['kind']) {
                        tio2_root_only_update_status($post_id, $record['targetStatus']);
                    } elseif ('product-fixture' === $record['kind']) {
                        tio2_root_only_update_status($post_id, $record['targetStatus']);
                        tio2_root_only_update_scopes($post_id, $record['targetSiteScopes']);
                    } else {
                        tio2_root_only_fail('Target compensation encountered an unknown typed snapshot record.');
                    }
                } else {
                    tio2_root_only_fail('Compensation source state is invalid.');
                }
            } catch (Throwable $error) {
                $errors[] = "ID {$post_id}: {$error->getMessage()}";
            }
        }
    };

    try {
        tio2_root_only_without_webhook_fanout(static function () use (
            $snapshot,
            $source_state,
            $attempt
        ): void {
            if ('legacy' === $source_state) {
                tio2_root_only_with_restore_context($snapshot, $attempt);
                return;
            }
            $attempt();
        });
    } catch (Throwable $context_error) {
        $errors[] = 'compensation context: ' . $context_error->getMessage();
    }
    return $errors;
}

/**
 * @param array<string, mixed> $snapshot
 */
function tio2_root_only_restore_product_legacy(array $snapshot, int $post_id): void
{
    tio2_root_only_with_restore_context($snapshot, static function () use ($post_id): void {
        tio2_root_only_update_scopes($post_id, []);
        tio2_root_only_update_status($post_id, 'publish');
    });
}

if (! defined('TIO2_ROOT_ONLY_LIBRARY_ONLY')) {
    try {
        if (! defined('WP_CLI') || ! WP_CLI) {
            tio2_root_only_fail('Snapshot export is CLI-only and unreachable from HTTP.');
        }
        $snapshot = tio2_root_only_build_snapshot();
        WP_CLI::log('TIO2_ROOT_ONLY_SNAPSHOT_BEGIN');
        WP_CLI::log((string) wp_json_encode($snapshot, JSON_UNESCAPED_SLASHES));
        WP_CLI::log('TIO2_ROOT_ONLY_SNAPSHOT_END');
    } catch (Throwable $error) {
        WP_CLI::error($error->getMessage());
    }
}
