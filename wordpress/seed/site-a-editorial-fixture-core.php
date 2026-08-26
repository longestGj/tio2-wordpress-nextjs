<?php

/**
 * Pure orchestration and fixture-contract helpers shared by the formal seed
 * and the local-only Site A editorial updater.
 *
 * This file intentionally does not bootstrap WordPress so the state machine
 * can be exercised with an isolated adapter.
 *
 * @return list<string>
 */
function tio2_local_editorial_required_field_names(): array
{
    return [
        'homepage_schema_version',
        'hero_eyebrow',
        'hero_heading',
        'hero_summary',
        'hero_image',
        'hero_image_alt',
        'closing_heading',
        'closing_body',
        'closing_label',
        'seo_title',
        'seo_description',
        'og_image',
        'primary_topic',
        'secondary_topics',
        'header_rfq_label',
        'direct_answer_question',
        'direct_answer_lead',
        'direct_answer_body',
        'decision_questions',
        'application_briefs',
        'supply_routes',
        'evidence_items',
        'evaluation_steps',
        'geo_faqs',
        'glossary_items',
        'editorial_reviewed_at',
        'editorial_reviewed_by',
        'editorial_review_scope',
    ];
}

/**
 * @return array<string, int>
 */
function tio2_local_editorial_required_counts(): array
{
    return [
        'decision_questions' => 6,
        'application_briefs' => 5,
        'supply_routes' => 3,
        'evidence_items' => 3,
        'evaluation_steps' => 5,
        'geo_faqs' => 8,
        'glossary_items' => 4,
    ];
}

/**
 * @return array<string, list<string>>
 */
function tio2_local_editorial_required_row_shapes(): array
{
    return [
        'secondary_topics' => ['secondary_topic'],
        'decision_questions' => ['decision_number', 'decision_question', 'decision_answer'],
        'application_briefs' => [
            'application_name',
            'application_summary',
            'application_considerations',
        ],
        'supply_routes' => [
            'route_name',
            'route_meaning',
            'buyer_verification',
            'documentation_context',
            'claim_basis',
            'evidence_url',
        ],
        'evidence_items' => [
            'document_type',
            'document_title',
            'document_summary',
            'applicability',
            'revision_label',
            'evidence_url',
            'verification_status',
        ],
        'evaluation_steps' => ['method_number', 'method_title', 'method_description'],
        'geo_faqs' => ['faq_question', 'faq_answer'],
        'glossary_items' => ['term', 'definition'],
    ];
}

/**
 * @param mixed $value
 * @return mixed
 */
function tio2_local_editorial_normalize_field(string $field_name, $value)
{
    if (in_array($field_name, ['hero_image', 'og_image'], true)) {
        return false === $value || null === $value || '' === $value ? 0 : (int) $value;
    }
    return $value;
}

/**
 * @return array{rootExisted: bool, rootValue: mixed}
 */
function tio2_local_editorial_begin_enforcement_suppression(int $post_id): array
{
    $root_existed = array_key_exists('tio2_homepage_acf_save_in_progress', $GLOBALS);
    $root_value = $root_existed ? $GLOBALS['tio2_homepage_acf_save_in_progress'] : null;
    $bucket = is_array($root_value) ? $root_value : [];
    $bucket[$post_id] = true;
    $GLOBALS['tio2_homepage_acf_save_in_progress'] = $bucket;
    return [
        'rootExisted' => $root_existed,
        'rootValue' => $root_value,
    ];
}

/**
 * @param array{rootExisted: bool, rootValue: mixed} $token
 */
function tio2_local_editorial_restore_enforcement_suppression(array $token): void
{
    if (! $token['rootExisted']) {
        unset($GLOBALS['tio2_homepage_acf_save_in_progress']);
        return;
    }
    $GLOBALS['tio2_homepage_acf_save_in_progress'] = $token['rootValue'];
}

/**
 * @param array<string, mixed> $manifest
 * @return array<string, mixed>
 */
function tio2_local_editorial_validate_manifest(array $manifest): array
{
    $site_a_entries = array_values(array_filter(
        (array) ($manifest['sites'] ?? []),
        static fn ($site): bool => is_array($site) && 'tio2-a' === ($site['siteId'] ?? null)
    ));
    if (1 !== count($site_a_entries) || ! is_array($site_a_entries[0]['homepage'] ?? null)) {
        throw new RuntimeException('The committed manifest must contain exactly one Site A Homepage fixture.');
    }
    return tio2_local_editorial_validate_fields($site_a_entries[0]['homepage']);
}

/**
 * @param array<string, mixed> $fields
 * @return array<string, mixed>
 */
function tio2_local_editorial_validate_fields(array $fields): array
{
    $required_names = tio2_local_editorial_required_field_names();
    $actual_names = array_keys($fields);
    sort($required_names, SORT_STRING);
    sort($actual_names, SORT_STRING);
    if ($required_names !== $actual_names) {
        throw new RuntimeException('The Site A editorial fixture contains missing or out-of-scope Homepage fields.');
    }
    if ('homepage-v0.2-editorial-geo' !== $fields['homepage_schema_version']) {
        throw new RuntimeException('The Site A editorial fixture has the wrong schema version.');
    }
    foreach (tio2_local_editorial_required_counts() as $field_name => $expected_count) {
        if (! is_array($fields[$field_name]) || $expected_count !== count($fields[$field_name])) {
            throw new RuntimeException(
                "Site A editorial fixture {$field_name} must contain exactly {$expected_count} rows."
            );
        }
    }
    foreach (tio2_local_editorial_required_row_shapes() as $field_name => $expected_keys) {
        if (! is_array($fields[$field_name])) {
            throw new RuntimeException("Site A editorial fixture {$field_name} must be an array.");
        }
        sort($expected_keys, SORT_STRING);
        foreach ($fields[$field_name] as $row) {
            if (! is_array($row)) {
                throw new RuntimeException(
                    "Site A editorial fixture {$field_name} contains a non-object row."
                );
            }
            $actual_keys = array_keys($row);
            sort($actual_keys, SORT_STRING);
            if ($expected_keys !== $actual_keys) {
                throw new RuntimeException(
                    "Site A editorial fixture {$field_name} contains missing or out-of-scope row fields."
                );
            }
            foreach ($row as $row_value) {
                if (! is_string($row_value)) {
                    throw new RuntimeException(
                        "Site A editorial fixture {$field_name} row values must be strings."
                    );
                }
            }
        }
    }
    foreach ($fields['supply_routes'] as $route) {
        if (! is_array($route) || 'synthetic_demo' !== ($route['claim_basis'] ?? null)) {
            throw new RuntimeException('Every Site A supply route claim_basis must be synthetic_demo.');
        }
    }
    foreach ($fields['evidence_items'] as $item) {
        if (! is_array($item) || 'demo' !== ($item['verification_status'] ?? null)) {
            throw new RuntimeException('Every Site A evidence verification_status must be demo.');
        }
    }
    $serialized = json_encode($fields, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES);
    if (1 === preg_match(
        '~(?:https?://|ftp://|mailto:|tel:|www\.|href|product[_-]?path|application[_-]?path|/(?:products|applications)/|\bverified\b|\bcertif\w*\b|\bcapacity\b|\branking\b|\bperformance\b)~iu',
        $serialized
    )) {
        throw new RuntimeException('The Site A editorial fixture contains a forbidden link or claim.');
    }
    return $fields;
}

/**
 * @return list<string>
 */
function tio2_local_editorial_v01_meta_roots(): array
{
    return [
        'hero_primary_label',
        'hero_secondary_label',
        'hero_secondary_path',
        'metrics',
        'products_heading',
        'products_intro',
        'product_routes',
        'applications_heading',
        'applications_intro',
        'applications',
        'inquiry_heading',
        'inquiry_steps',
        'trust_heading',
        'trust_intro',
        'trust_reasons',
        'rfq_heading',
        'rfq_intro',
        'rfq_labels',
        'rfq_submit_label',
        'rfq_privacy_text',
        'rfq_success_heading',
        'rfq_success_message',
        'faq_heading',
        'faqs',
    ];
}

/**
 * @return array<string, list<string>>
 */
function tio2_local_editorial_v01_repeater_subfields(): array
{
    return [
        'metrics' => [
            'metric_value',
            'metric_unit',
            'metric_label',
            'metric_context',
            'metric_claim_basis',
            'metric_evidence_url',
        ],
        'product_routes' => [
            'product_title',
            'product_summary',
            'product_path',
            'product_image',
            'product_image_alt',
        ],
        'applications' => [
            'application_name',
            'application_summary',
            'application_path',
            'application_image',
            'application_image_alt',
        ],
        'inquiry_steps' => ['inquiry_step_title', 'inquiry_step_description'],
        'trust_reasons' => [
            'trust_reason_title',
            'trust_reason_description',
            'trust_reason_claim_basis',
            'trust_reason_evidence_url',
        ],
        'faqs' => ['faq_question', 'faq_answer', 'faq_related_label', 'faq_related_path'],
    ];
}

/**
 * @return array<string, list<string>>
 */
function tio2_local_editorial_v01_group_subfields(): array
{
    return [
        'rfq_labels' => [
            'rfq_label_name',
            'rfq_label_company',
            'rfq_label_country_region',
            'rfq_label_work_email',
            'rfq_label_buyer_type',
            'rfq_label_interest',
            'rfq_label_expected_quantity',
            'rfq_label_destination',
            'rfq_label_message',
            'rfq_label_privacy',
            'rfq_buyer_industrial_label',
            'rfq_buyer_distributor_label',
            'rfq_buyer_other_label',
        ],
    ];
}

function tio2_local_editorial_is_v01_meta_key(string $meta_key): bool
{
    $normalized = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    if (in_array($normalized, tio2_local_editorial_v01_meta_roots(), true)) {
        return true;
    }
    foreach (tio2_local_editorial_v01_group_subfields() as $root => $subfields) {
        foreach ($subfields as $subfield) {
            if ($normalized === $root . '_' . $subfield) {
                return true;
            }
        }
    }
    foreach (tio2_local_editorial_v01_repeater_subfields() as $root => $subfields) {
        $subfield_pattern = implode('|', array_map(
            static fn (string $subfield): string => preg_quote($subfield, '~'),
            $subfields
        ));
        if (1 === preg_match(
            '~^' . preg_quote($root, '~') . '_[0-9]+_(?:' . $subfield_pattern . ')$~D',
            $normalized
        )) {
            return true;
        }
    }
    return false;
}

function tio2_local_editorial_is_managed_content_meta_key(string $meta_key): bool
{
    if ('_tio2_homepage_error' === $meta_key || tio2_local_editorial_is_v01_meta_key($meta_key)) {
        return true;
    }
    $normalized = str_starts_with($meta_key, '_') ? substr($meta_key, 1) : $meta_key;
    if (in_array($normalized, tio2_local_editorial_required_field_names(), true)) {
        return true;
    }
    foreach (tio2_local_editorial_required_row_shapes() as $root => $subfields) {
        $subfield_pattern = implode('|', array_map(
            static fn (string $subfield): string => preg_quote($subfield, '~'),
            $subfields
        ));
        if (1 === preg_match(
            '~^' . preg_quote($root, '~') . '_[0-9]+_(?:' . $subfield_pattern . ')$~D',
            $normalized
        )) {
            return true;
        }
    }
    return false;
}

/**
 * @return list<string>
 */
function tio2_local_editorial_find_v01_meta_keys(int $post_id): array
{
    global $wpdb;
    $meta_keys = $wpdb->get_col($wpdb->prepare(
        "SELECT meta_key FROM {$wpdb->postmeta} WHERE post_id = %d ORDER BY meta_id ASC",
        $post_id
    ));
    return array_values(array_filter(
        array_map('strval', $meta_keys),
        'tio2_local_editorial_is_v01_meta_key'
    ));
}

/**
 * Delete both ACF value meta and underscore-prefixed ACF reference meta,
 * including stale repeater rows beyond the currently declared row count.
 *
 * @return list<string>
 */
function tio2_local_editorial_delete_v01_meta(int $post_id): array
{
    global $wpdb;
    $meta_keys = tio2_local_editorial_find_v01_meta_keys($post_id);
    foreach ($meta_keys as $meta_key) {
        $deleted = $wpdb->delete(
            $wpdb->postmeta,
            ['post_id' => $post_id, 'meta_key' => $meta_key],
            ['%d', '%s']
        );
        if (false === $deleted) {
            throw new RuntimeException("Could not delete legacy Homepage meta {$meta_key}.");
        }
    }
    return $meta_keys;
}

/**
 * @param array<string, mixed> $fields
 * @param array<string, callable> $operations
 */
function tio2_local_editorial_apply_batch(
    array $fields,
    string $failure_point,
    array $operations,
    bool $enforce_final_contract = true
): void {
    $schema_version = $fields['homepage_schema_version'] ?? null;
    if ('homepage-v0.2-editorial-geo' !== $schema_version) {
        throw new RuntimeException('Versioned Homepage batch requires the Site A v0.2 schema.');
    }
    $non_schema_fields = $fields;
    unset($non_schema_fields['homepage_schema_version']);
    $suppression_token = $operations['begin_suppression']();
    try {
        foreach ($non_schema_fields as $field_name => $field_value) {
            $operations['write_field']($field_name, $field_value);
        }
        $operations['delete_legacy']();
        $operations['assert_no_legacy']();
        $operations['write_field']('homepage_schema_version', $schema_version);
        if ('after-fields' === $failure_point) {
            throw new RuntimeException('Injected failure after Site A editorial fields.');
        }
        if ($enforce_final_contract) {
            $operations['enforce']();
        }
        $operations['readback']($fields);
    } finally {
        $operations['restore_suppression']($suppression_token);
    }
}

/**
 * Execute the local updater under one advisory lock and one serializable
 * transaction. The adapter performs concrete database locking and readback.
 *
 * @param array<string, mixed> $fields
 * @param array<string, callable> $operations
 * @return array<string, mixed>
 */
function tio2_local_editorial_execute(
    string $mode,
    string $failure_point,
    array $fields,
    array $operations
): array {
    if (! in_array($mode, ['plan', 'apply'], true)) {
        throw new RuntimeException('Choose plan or apply mode for the Site A editorial fixture updater.');
    }
    if (! in_array($failure_point, ['', 'after-fields'], true)) {
        throw new RuntimeException('Unknown Site A editorial fixture failure point.');
    }
    if ('plan' === $mode && '' !== $failure_point) {
        throw new RuntimeException('Failure injection is available only in apply mode.');
    }

    $queue_snapshot = $operations['snapshot_queue']();
    $lock_acquired = false;
    $transaction_started = false;
    try {
        if (true !== $operations['acquire_lock']()) {
            throw new RuntimeException('Could not acquire the local editorial fixture advisory lock.');
        }
        $lock_acquired = true;
        $operations['begin_transaction']();
        $transaction_started = true;
        $operations['lock_invariants']();
        $preflight = $operations['preflight']();

        if ('plan' === $mode) {
            $operations['rollback']();
            $transaction_started = false;
            return ['mode' => 'plan', 'preflight' => $preflight];
        }

        tio2_local_editorial_apply_batch($fields, $failure_point, $operations, true);
        $operations['assert_invariants']($preflight);
        $operations['commit']();
        $transaction_started = false;
        return ['mode' => 'apply', 'preflight' => $preflight];
    } catch (Throwable $error) {
        if ($transaction_started) {
            try {
                $operations['rollback']();
            } catch (Throwable $rollback_error) {
                throw new RuntimeException(
                    $error->getMessage() . ' Rollback also failed: ' . $rollback_error->getMessage(),
                    0,
                    $error
                );
            }
        }
        throw $error;
    } finally {
        $operations['restore_queue']($queue_snapshot);
        if ($lock_acquired) {
            $operations['release_lock']();
        }
    }
}
