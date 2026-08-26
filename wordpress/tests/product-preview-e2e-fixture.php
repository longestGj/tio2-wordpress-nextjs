<?php

if (! defined('WP_CLI') || ! WP_CLI) {
    throw new RuntimeException('The Product preview E2E fixture requires WP-CLI.');
}

require_once __DIR__ . '/product-option-cleanup.php';

const TIO2_PRODUCT_PREVIEW_E2E_MARKER = 'site-a-product-preview-v1';
const TIO2_PRODUCT_PREVIEW_E2E_STATE = 'tio2_product_preview_e2e_state_v1';
const TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_ID = 'TP-Z911';
const TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_SLUG = 'tp-z911';
const TIO2_PRODUCT_PREVIEW_E2E_FAMILY_SLUG = 'e2e-product-preview-family';
const TIO2_PRODUCT_PREVIEW_E2E_RESULT_PREFIX = 'TIO2_PRODUCT_PREVIEW_E2E_RESULT ';

/**
 * @return list<int>
 */
function tio2_product_preview_e2e_marked_post_ids(): array
{
    return array_map('intval', get_posts([
        'post_type' => ['tio2_product', 'tio2_application', 'tio2_document'],
        'post_status' => 'any',
        'posts_per_page' => -1,
        'fields' => 'ids',
        'meta_key' => '_tio2_e2e_fixture',
        'meta_value' => TIO2_PRODUCT_PREVIEW_E2E_MARKER,
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
    ]));
}

/**
 * @return array<string, mixed>
 */
function tio2_product_preview_e2e_shared_values(): array
{
    $values = [];
    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field) || empty($field['name'])) {
            continue;
        }
        $name = (string) $field['name'];
        $values[$name] = get_field($name, 'option', false);
    }
    ksort($values, SORT_STRING);
    return $values;
}

/**
 * @param array<string, mixed> $values
 */
function tio2_product_preview_e2e_value_hash(array $values): string
{
    return hash('sha256', (string) wp_json_encode($values));
}

function tio2_product_preview_e2e_site_b_hash(): string
{
    global $wpdb;

    $post_rows = $wpdb->get_results(
        $wpdb->prepare(
            "SELECT DISTINCT p.ID, p.post_type, p.post_status, p.post_name, p.post_title, p.post_content, p.post_excerpt
             FROM {$wpdb->posts} p
             INNER JOIN {$wpdb->term_relationships} tr ON tr.object_id = p.ID
             INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id = tr.term_taxonomy_id
             INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id
             WHERE tt.taxonomy = %s AND t.slug = %s
             ORDER BY p.ID ASC",
            'site_scope',
            'tio2-b'
        ),
        ARRAY_A
    );
    $post_rows = is_array($post_rows) ? $post_rows : [];
    $post_ids = array_map(
        static fn (array $row): int => (int) $row['ID'],
        $post_rows
    );
    $meta_rows = [];
    if ([] !== $post_ids) {
        $placeholders = implode(', ', array_fill(0, count($post_ids), '%d'));
        $query = $wpdb->prepare(
            "SELECT post_id, meta_key, meta_value
             FROM {$wpdb->postmeta}
             WHERE post_id IN ({$placeholders})
             ORDER BY post_id ASC, meta_key ASC, meta_id ASC",
            ...$post_ids
        );
        $meta_rows = $wpdb->get_results($query, ARRAY_A);
        $meta_rows = is_array($meta_rows) ? $meta_rows : [];
    }

    return hash('sha256', (string) wp_json_encode([
        'posts' => $post_rows,
        'meta' => $meta_rows,
    ]));
}

/**
 * @return array<string, mixed>
 */
function tio2_product_preview_e2e_preflight(): array
{
    $target_ids = array_map('intval', get_posts([
        'post_type' => 'tio2_product',
        'post_status' => 'any',
        'name' => TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_SLUG,
        'posts_per_page' => -1,
        'fields' => 'ids',
        'orderby' => 'ID',
        'order' => 'ASC',
        'no_found_rows' => true,
    ]));
    $family = get_term_by(
        'slug',
        TIO2_PRODUCT_PREVIEW_E2E_FAMILY_SLUG,
        'product_family'
    );
    $state_present = false !== get_option(TIO2_PRODUCT_PREVIEW_E2E_STATE, false);
    $preflight = [
        'familyCollision' => false !== $family,
        'markedPostIds' => tio2_product_preview_e2e_marked_post_ids(),
        'productSettingsHash' => tio2_product_preview_e2e_value_hash(
            tio2_product_preview_e2e_shared_values()
        ),
        'siteBHash' => tio2_product_preview_e2e_site_b_hash(),
        'statePresent' => $state_present,
        'targetProductIds' => $target_ids,
    ];
    $preflight['planHash'] = hash('sha256', (string) wp_json_encode($preflight));
    return $preflight;
}

/**
 * @param array<string, mixed> $preflight
 */
function tio2_product_preview_e2e_require_ready(array $preflight): void
{
    if (
        true === $preflight['statePresent'] ||
        true === $preflight['familyCollision'] ||
        [] !== $preflight['markedPostIds'] ||
        [] !== $preflight['targetProductIds']
    ) {
        throw new RuntimeException(
            'The Product preview E2E fixture is not clean; run the exact cleanup mode before applying.'
        );
    }
}

/**
 * @param array<string, mixed> $result
 */
function tio2_product_preview_e2e_log(array $result): void
{
    WP_CLI::log(
        TIO2_PRODUCT_PREVIEW_E2E_RESULT_PREFIX . wp_json_encode($result)
    );
}

function tio2_product_preview_e2e_insert_post(
    string $post_type,
    string $title,
    string $slug,
    string $excerpt = ''
): int {
    $post_id = wp_insert_post([
        'post_type' => $post_type,
        'post_status' => 'draft',
        'post_title' => $title,
        'post_name' => $slug,
        'post_excerpt' => $excerpt,
    ], true);
    if (is_wp_error($post_id) || (int) $post_id <= 0) {
        throw new RuntimeException("Could not create the {$post_type} E2E fixture.");
    }
    $post_id = (int) $post_id;
    update_post_meta($post_id, '_tio2_e2e_fixture', TIO2_PRODUCT_PREVIEW_E2E_MARKER);
    wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
    clean_post_cache($post_id);
    return $post_id;
}

function tio2_product_preview_e2e_publish_directly(int $post_id): void
{
    global $wpdb;

    $updated = $wpdb->update(
        $wpdb->posts,
        ['post_status' => 'publish'],
        ['ID' => $post_id],
        ['%s'],
        ['%d']
    );
    if (false === $updated) {
        throw new RuntimeException('Could not publish a relationship fixture.');
    }
    clean_post_cache($post_id);
}

/**
 * @param array<string, mixed> $values
 */
function tio2_product_preview_e2e_set_shared_values(array $values): void
{
    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field) || empty($field['name']) || empty($field['key'])) {
            continue;
        }
        $name = (string) $field['name'];
        tio2_product_test_delete_created_option_field($field);
        if (array_key_exists($name, $values) && false !== $values[$name]) {
            update_field((string) $field['key'], $values[$name], 'option');
        }
    }
}

/**
 * @param list<int> $post_ids
 */
function tio2_product_preview_e2e_delete_posts(array $post_ids): void
{
    foreach (array_reverse($post_ids) as $post_id) {
        $post = get_post($post_id);
        if (! $post instanceof WP_Post) {
            continue;
        }
        if (
            TIO2_PRODUCT_PREVIEW_E2E_MARKER !==
            get_post_meta($post_id, '_tio2_e2e_fixture', true)
        ) {
            throw new RuntimeException(
                "Refused to delete unmarked Product preview E2E post {$post_id}."
            );
        }
        wp_delete_post($post_id, true);
    }
}

/**
 * @return array<string, mixed>
 */
function tio2_product_preview_e2e_apply(array $preflight): array
{
    $shared_before = tio2_product_preview_e2e_shared_values();
    $post_ids = [];
    $family_id = 0;

    try {
        $family = wp_insert_term(
            'Synthetic Product Preview Family',
            'product_family',
            [
                'slug' => TIO2_PRODUCT_PREVIEW_E2E_FAMILY_SLUG,
                'description' => TIO2_PRODUCT_PREVIEW_E2E_MARKER,
            ]
        );
        if (is_wp_error($family)) {
            throw new RuntimeException('Could not create the Product family E2E fixture.');
        }
        $family_id = (int) $family['term_id'];

        $application_id = tio2_product_preview_e2e_insert_post(
            'tio2_application',
            'Synthetic Product Preview Application',
            'e2e-product-application',
            'Synthetic application context for protected Product preview verification.'
        );
        $post_ids[] = $application_id;
        tio2_product_preview_e2e_publish_directly($application_id);

        $resource_id = tio2_product_preview_e2e_insert_post(
            'tio2_document',
            'Synthetic Product Preview Resource',
            'e2e-product-resource'
        );
        $post_ids[] = $resource_id;
        tio2_product_preview_e2e_publish_directly($resource_id);

        $product_id = tio2_product_preview_e2e_insert_post(
            'tio2_product',
            'Synthetic Product Preview TP-Z911',
            TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_SLUG
        );
        $post_ids[] = $product_id;

        $product_values = [
            'field_tio2_product_id' => TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_ID,
            'field_tio2_product_family' => $family_id,
            'field_tio2_product_meta_title' => 'TP-Z911 Synthetic Product Preview | TIOVAR',
            'field_tio2_product_meta_description' => 'Synthetic local Product preview for verifying opacity, durability, dispersion, and application-evaluation content without publication.',
            'field_tio2_product_eyebrow' => 'Synthetic rutile titanium dioxide evaluation',
            'field_tio2_product_customer_problem_headline' => 'Compare durability, opacity, and processing consistency in one controlled preview',
            'field_tio2_product_quick_answer' => '<p><strong>TP-Z911</strong> is a synthetic rutile titanium dioxide grade used only to verify the protected Product preview runtime. It presents durability, opacity, dispersion, and processing questions without making a commercial offer. Buyers must compare the listed evaluation points in their own formulation, equipment, test methods, and end-use conditions before reaching any decision.</p>',
            'field_tio2_product_type' => 'Synthetic rutile titanium dioxide pigment',
            'field_tio2_product_process' => 'Synthetic process description',
            'field_tio2_product_primary_application' => 'Local protected-preview verification',
            'field_tio2_product_positioning' => 'Synthetic decision-support fixture',
            'field_tio2_product_surface_treatment' => 'Synthetic surface-treatment description',
            'field_tio2_product_packaging' => 'Synthetic industrial packaging context is shown only to verify the protected preview layout.',
            'field_tio2_product_tds_access' => 'The current technical data sheet is available by request after confirming the intended application.',
            'field_tio2_product_fit_when' => [
                ['item' => 'A protected draft needs full decision-template verification.'],
                ['item' => 'Responsive table and CTA behavior must be checked together.'],
                ['item' => 'The test must retain Site A ownership and request-only documents.'],
            ],
            'field_tio2_product_discuss_first_when' => [
                ['item' => 'Any statement could be mistaken for a real specification or offer.'],
                ['item' => 'A route, document, or Site B field could become publicly exposed.'],
            ],
            'field_tio2_product_performance_priorities' => [
                [
                    'title' => 'Synthetic durability review',
                    'explanation' => 'Verify that durability language remains framed as buyer-owned evaluation context.',
                ],
                [
                    'title' => 'Synthetic optical review',
                    'explanation' => 'Verify that opacity and tint-strength prompts remain typical comparison inputs.',
                ],
                [
                    'title' => 'Synthetic processing review',
                    'explanation' => 'Verify that dispersion and process prompts remain conditional on customer trials.',
                ],
            ],
            'field_tio2_product_recommended_applications' => [$application_id],
            'field_tio2_product_evidence_statement' => '<p>This <strong>synthetic local fixture</strong> verifies controlled rich text and buyer-owned evaluation language.</p><ul><li>No real Product claim is supplied.</li><li>No public document is linked.</li></ul>',
            'field_tio2_product_typical_properties' => [
                [
                    'property' => 'Synthetic content marker',
                    'value' => '1',
                    'unit' => 'fixture',
                    'method' => 'Local E2E harness',
                    'note' => 'Not a specification',
                    'display_order' => 1,
                ],
                [
                    'property' => 'Responsive table marker',
                    'value' => '2',
                    'unit' => 'fixture',
                    'method' => 'Browser inspection',
                    'note' => 'Not technical data',
                    'display_order' => 2,
                ],
                [
                    'property' => 'Isolation marker',
                    'value' => '3',
                    'unit' => 'fixture',
                    'method' => 'Network audit',
                    'note' => 'Site A only',
                    'display_order' => 3,
                ],
            ],
            'field_tio2_product_validation_checklist' => [
                ['item' => 'Confirm the signed preview stays noindex and no-store.'],
                ['item' => 'Confirm the canonical Product route remains anonymous 404.'],
                ['item' => 'Confirm no TDS URL or Site B request is exposed.'],
            ],
            'field_tio2_product_faq_items' => [
                [
                    'question' => 'Is TP-Z911 a real commercial Product in this fixture?',
                    'answer' => '<p>No. It is synthetic local test content used only for protected-preview verification.</p>',
                ],
                [
                    'question' => 'Does this preview publish the canonical Product route?',
                    'answer' => '<p>No. The anonymous canonical route remains outside the approved public inventory.</p>',
                ],
                [
                    'question' => 'Are the displayed property rows specifications?',
                    'answer' => '<p>No. They are synthetic markers that exercise the responsive table layout.</p>',
                ],
                [
                    'question' => 'Can the technical data sheet be downloaded here?',
                    'answer' => '<p>No. The page keeps document access request-only and exposes no download URL.</p>',
                ],
                [
                    'question' => 'Does this Product preview belong to Site B?',
                    'answer' => '<p>No. The fixture is scoped exactly to Site A and the test checks Site B isolation.</p>',
                ],
                [
                    'question' => 'What should a buyer do with these synthetic prompts?',
                    'answer' => '<p>Use them only to verify the interface; real decisions require authorized facts and customer testing.</p>',
                ],
            ],
            'field_tio2_product_related_links' => [
                'applications' => [$application_id],
                'resources' => [$resource_id],
                'products' => [],
            ],
        ];
        foreach ($product_values as $field_key => $value) {
            update_field($field_key, $value, $product_id);
        }

        $shared_fixture = [
            'inquiry_fields' => [
                [
                    'key' => 'application',
                    'label' => 'Intended application',
                    'guidance' => 'Describe the synthetic evaluation context required by the local test.',
                ],
                [
                    'key' => 'binder',
                    'label' => 'Binder system',
                    'guidance' => 'Record the buyer-provided system without inferring suitability.',
                ],
                [
                    'key' => 'priority',
                    'label' => 'Performance priority',
                    'guidance' => 'Identify the buyer-owned comparison priority.',
                ],
            ],
            'request_tds_cta' => [
                'label' => 'Request TDS',
                'description' => 'Ask for the current technical data sheet for TP-Z911.',
            ],
            'discuss_application_cta' => [
                'label' => 'Discuss your application',
                'description' => 'Share the application questions relevant to your evaluation.',
            ],
            'technical_disclaimer' => '<p>This is synthetic local test content, not a specification, offer, recommendation, or statement about a real Product. Buyers must validate all facts independently.</p>',
        ];
        tio2_product_preview_e2e_set_shared_values($shared_fixture);

        $validation = tio2_validate_product_contract($product_id);
        if (is_wp_error($validation)) {
            throw new RuntimeException(
                'The Product preview E2E fixture is invalid: ' . $validation->get_error_code()
            );
        }
        $serialized = tio2_serialize_product_preview(get_post($product_id));
        if (
            ! is_array($serialized) ||
            TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_ID !==
                ($serialized['productFields']['productId'] ?? null) ||
            'tio2-a' !== ($serialized['siteId'] ?? null) ||
            str_contains((string) wp_json_encode($serialized), 'tio2-b')
        ) {
            throw new RuntimeException('The Product preview E2E payload failed its isolation check.');
        }

        $state = [
            'version' => 1,
            'marker' => TIO2_PRODUCT_PREVIEW_E2E_MARKER,
            'postIds' => $post_ids,
            'familyId' => $family_id,
            'sharedBefore' => $shared_before,
            'productSettingsHash' => $preflight['productSettingsHash'],
            'siteBHash' => $preflight['siteBHash'],
        ];
        if (! add_option(TIO2_PRODUCT_PREVIEW_E2E_STATE, $state, '', false)) {
            throw new RuntimeException('Could not persist the Product preview E2E cleanup state.');
        }

        $site_b_hash = tio2_product_preview_e2e_site_b_hash();
        if (! hash_equals((string) $preflight['siteBHash'], $site_b_hash)) {
            throw new RuntimeException('Site B changed while applying the Product preview E2E fixture.');
        }

        return [
            'mode' => 'apply',
            'productId' => TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_ID,
            'productPath' => '/products/' . TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_SLUG,
            'createdPostCount' => count($post_ids),
            'productSettingsHash' => $preflight['productSettingsHash'],
            'siteBHash' => $site_b_hash,
        ];
    } catch (Throwable $error) {
        delete_option(TIO2_PRODUCT_PREVIEW_E2E_STATE);
        tio2_product_preview_e2e_delete_posts($post_ids);
        if ($family_id > 0 && term_exists($family_id, 'product_family')) {
            wp_delete_term($family_id, 'product_family');
        }
        tio2_product_preview_e2e_set_shared_values($shared_before);
        throw $error;
    }
}

/**
 * @return array<string, mixed>
 */
function tio2_product_preview_e2e_cleanup(): array
{
    $state = get_option(TIO2_PRODUCT_PREVIEW_E2E_STATE, false);
    if (! is_array($state)) {
        throw new RuntimeException('No exact Product preview E2E cleanup state exists.');
    }
    if (
        1 !== ($state['version'] ?? null) ||
        TIO2_PRODUCT_PREVIEW_E2E_MARKER !== ($state['marker'] ?? null) ||
        ! is_array($state['postIds'] ?? null) ||
        ! is_array($state['sharedBefore'] ?? null) ||
        ! is_string($state['productSettingsHash'] ?? null) ||
        ! is_string($state['siteBHash'] ?? null)
    ) {
        throw new RuntimeException('The Product preview E2E cleanup state is invalid.');
    }

    $family_id = (int) ($state['familyId'] ?? 0);
    if ($family_id > 0 && term_exists($family_id, 'product_family')) {
        $family = get_term($family_id, 'product_family');
        if (
            ! $family instanceof WP_Term ||
            TIO2_PRODUCT_PREVIEW_E2E_FAMILY_SLUG !== $family->slug ||
            TIO2_PRODUCT_PREVIEW_E2E_MARKER !== $family->description
        ) {
            throw new RuntimeException('Refused to delete an unexpected Product family term.');
        }
    }

    tio2_product_preview_e2e_delete_posts(array_map('intval', $state['postIds']));
    if ($family_id > 0 && term_exists($family_id, 'product_family')) {
        wp_delete_term($family_id, 'product_family');
    }
    tio2_product_preview_e2e_set_shared_values($state['sharedBefore']);

    $settings_hash = tio2_product_preview_e2e_value_hash(
        tio2_product_preview_e2e_shared_values()
    );
    $site_b_hash = tio2_product_preview_e2e_site_b_hash();
    if (! hash_equals($state['productSettingsHash'], $settings_hash)) {
        throw new RuntimeException('Product shared settings were not restored after E2E cleanup.');
    }
    if (! hash_equals($state['siteBHash'], $site_b_hash)) {
        throw new RuntimeException('Site B changed while cleaning the Product preview E2E fixture.');
    }

    delete_option(TIO2_PRODUCT_PREVIEW_E2E_STATE);
    $remaining = tio2_product_preview_e2e_marked_post_ids();
    if ([] !== $remaining) {
        throw new RuntimeException('Product preview E2E posts remain after cleanup.');
    }

    return [
        'mode' => 'cleanup',
        'deletedPostCount' => count($state['postIds']),
        'productSettingsHash' => $settings_hash,
        'siteBHash' => $site_b_hash,
    ];
}

try {
    $mode = isset($args[0]) && is_string($args[0]) ? $args[0] : '';
    if ('plan' === $mode) {
        $preflight = tio2_product_preview_e2e_preflight();
        tio2_product_preview_e2e_require_ready($preflight);
        tio2_product_preview_e2e_log([
            'mode' => 'plan',
            'planHash' => $preflight['planHash'],
            'productSettingsHash' => $preflight['productSettingsHash'],
            'siteBHash' => $preflight['siteBHash'],
            'targetPath' => '/products/' . TIO2_PRODUCT_PREVIEW_E2E_PRODUCT_SLUG,
        ]);
    } elseif ('apply' === $mode) {
        $expected_plan_hash = isset($args[1]) && is_string($args[1]) ? $args[1] : '';
        $preflight = tio2_product_preview_e2e_preflight();
        tio2_product_preview_e2e_require_ready($preflight);
        if (
            1 !== preg_match('/^[a-f0-9]{64}$/D', $expected_plan_hash) ||
            ! hash_equals((string) $preflight['planHash'], $expected_plan_hash)
        ) {
            throw new RuntimeException('The Product preview E2E apply plan is stale or missing.');
        }
        tio2_product_preview_e2e_log(tio2_product_preview_e2e_apply($preflight));
    } elseif ('cleanup' === $mode) {
        tio2_product_preview_e2e_log(tio2_product_preview_e2e_cleanup());
    } else {
        throw new RuntimeException('Choose plan, apply, or cleanup mode.');
    }
} catch (Throwable $error) {
    WP_CLI::error('Product preview E2E fixture failed: ' . $error->getMessage());
}
