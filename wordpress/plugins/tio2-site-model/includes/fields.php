<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function tio2_register_acf_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }

    $technical_locations = [];
    foreach (array_keys(tio2_content_type_definitions()) as $post_type) {
        $technical_locations[] = [[
            'param' => 'post_type',
            'operator' => '==',
            'value' => $post_type,
        ]];
    }

    acf_add_local_field_group([
        'key' => 'group_tio2_technical_fields',
        'title' => 'TiO2 Technical Fields',
        'fields' => [
            [
                'key' => 'field_tio2_technical_summary',
                'label' => 'Technical Summary',
                'name' => 'technical_summary',
                'type' => 'textarea',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_evidence_source_url',
                'label' => 'Evidence Source URL',
                'name' => 'evidence_source_url',
                'type' => 'url',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
        ],
        'location' => $technical_locations,
        'show_in_graphql' => 1,
        'graphql_field_name' => 'technicalFields',
    ]);

    acf_add_local_field_group([
        'key' => 'group_tio2_publishing_fields',
        'title' => 'TiO2 Publishing Fields',
        'fields' => [
            [
                'key' => 'field_tio2_public_path',
                'label' => 'Public Path',
                'name' => 'public_path',
                'type' => 'text',
                'required' => 1,
                'instructions' => 'Enter a leading-slash path without a protocol, query string, or fragment.',
                'placeholder' => '/products/example',
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_seo_title',
                'label' => 'SEO Title',
                'name' => 'seo_title',
                'type' => 'text',
                'required' => 0,
                'show_in_graphql' => 1,
            ],
            [
                'key' => 'field_tio2_seo_description',
                'label' => 'SEO Description',
                'name' => 'seo_description',
                'type' => 'textarea',
                'required' => 0,
                'rows' => 3,
                'show_in_graphql' => 1,
            ],
        ],
        'location' => [
            [[
                'param' => 'post_type',
                'operator' => '==',
                'value' => 'page',
            ]],
            [[
                'param' => 'post_type',
                'operator' => '==',
                'value' => 'post',
            ]],
        ],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'publishingFields',
    ]);

    acf_add_local_field_group([
        'key' => 'group_tio2_homepage_fields',
        'title' => 'TiO2 Homepage Fields',
        'fields' => tio2_homepage_field_definitions(),
        'location' => [[[
            'param' => 'post_type',
            'operator' => '==',
            'value' => 'tio2_homepage',
        ]]],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'homepageFields',
    ]);

    tio2_register_homepage_v02_fields();
    tio2_register_homepage_v03_fields();
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_text_field(
    string $key,
    string $name,
    bool $required,
    ?int $maxlength = null,
    string $type = 'text'
): array {
    $field = [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => $type,
        'required' => $required ? 1 : 0,
        'show_in_graphql' => 1,
    ];
    if (null !== $maxlength) {
        $field['maxlength'] = $maxlength;
    }
    return $field;
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_image_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => 'image',
        'required' => 0,
        'return_format' => 'id',
        'preview_size' => 'medium',
        'library' => 'all',
        'mime_types' => 'jpg,jpeg,png,webp,avif',
        'show_in_graphql' => 1,
    ];
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_claim_basis_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => 'select',
        'required' => 1,
        'choices' => [
            'user_confirmed' => 'User confirmed',
            'source_required' => 'Source required',
        ],
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_evidence_url_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => 'url',
        'required' => 0,
        'show_in_graphql' => 1,
    ];
}

/**
 * @param list<array<string, mixed>> $sub_fields
 * @return array<string, mixed>
 */
function tio2_homepage_repeater_field(
    string $key,
    string $name,
    bool $required,
    int $min,
    int $max,
    array $sub_fields
): array {
    return [
        'key' => $key,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'name' => $name,
        'type' => 'repeater',
        'required' => $required ? 1 : 0,
        'min' => $min,
        'max' => $max,
        'layout' => 'row',
        'button_label' => 'Add item',
        'sub_fields' => $sub_fields,
        'show_in_graphql' => 1,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_homepage_field_definitions(): array
{
    $schema_version = tio2_homepage_text_field(
        'field_tio2_home_schema_version',
        'homepage_schema_version',
        true
    );
    $schema_version['default_value'] = 'homepage-v0.1';
    $schema_version['wrapper'] = ['class' => 'acf-hidden'];
    $schema_version['graphql_field_name'] = 'schemaVersion';

    $fields = [
        $schema_version,
        tio2_homepage_text_field('field_tio2_home_hero_eyebrow', 'hero_eyebrow', true, 80),
        tio2_homepage_text_field('field_tio2_home_hero_heading', 'hero_heading', true, 90),
        tio2_homepage_text_field('field_tio2_home_hero_summary', 'hero_summary', true, 320, 'textarea'),
        tio2_homepage_text_field('field_tio2_home_hero_primary_label', 'hero_primary_label', true, 32),
        tio2_homepage_text_field('field_tio2_home_hero_secondary_label', 'hero_secondary_label', true, 32),
        tio2_homepage_text_field('field_tio2_home_hero_secondary_path', 'hero_secondary_path', true, 172),
        tio2_homepage_image_field('field_tio2_home_hero_image', 'hero_image'),
        tio2_homepage_text_field('field_tio2_home_hero_image_alt', 'hero_image_alt', false, 160),
        tio2_homepage_repeater_field('field_tio2_home_metrics', 'metrics', false, 0, 4, [
            tio2_homepage_text_field('field_tio2_home_metric_value', 'metric_value', true, 24),
            tio2_homepage_text_field('field_tio2_home_metric_unit', 'metric_unit', false, 16),
            tio2_homepage_text_field('field_tio2_home_metric_label', 'metric_label', true, 60),
            tio2_homepage_text_field('field_tio2_home_metric_context', 'metric_context', false, 120),
            tio2_homepage_claim_basis_field('field_tio2_home_metric_claim_basis', 'metric_claim_basis'),
            tio2_homepage_evidence_url_field('field_tio2_home_metric_evidence_url', 'metric_evidence_url'),
        ]),
        tio2_homepage_text_field('field_tio2_home_products_heading', 'products_heading', true, 90),
        tio2_homepage_text_field('field_tio2_home_products_intro', 'products_intro', true, 240, 'textarea'),
        tio2_homepage_repeater_field('field_tio2_home_product_routes', 'product_routes', true, 2, 6, [
            tio2_homepage_text_field('field_tio2_home_product_title', 'product_title', true, 80),
            tio2_homepage_text_field('field_tio2_home_product_summary', 'product_summary', true, 220, 'textarea'),
            tio2_homepage_text_field('field_tio2_home_product_path', 'product_path', true, 172),
            tio2_homepage_image_field('field_tio2_home_product_image', 'product_image'),
            tio2_homepage_text_field('field_tio2_home_product_image_alt', 'product_image_alt', false, 160),
        ]),
        tio2_homepage_text_field('field_tio2_home_applications_heading', 'applications_heading', true, 90),
        tio2_homepage_text_field('field_tio2_home_applications_intro', 'applications_intro', true, 240, 'textarea'),
        tio2_homepage_repeater_field('field_tio2_home_applications', 'applications', true, 3, 6, [
            tio2_homepage_text_field('field_tio2_home_application_name', 'application_name', true),
            tio2_homepage_text_field('field_tio2_home_application_summary', 'application_summary', true),
            tio2_homepage_text_field('field_tio2_home_application_path', 'application_path', true),
            tio2_homepage_image_field('field_tio2_home_application_image', 'application_image'),
            tio2_homepage_text_field('field_tio2_home_application_image_alt', 'application_image_alt', false, 160),
        ]),
        tio2_homepage_text_field('field_tio2_home_inquiry_heading', 'inquiry_heading', true, 90),
        tio2_homepage_repeater_field('field_tio2_home_inquiry_steps', 'inquiry_steps', true, 3, 3, [
            tio2_homepage_text_field('field_tio2_home_inquiry_step_title', 'inquiry_step_title', true, 70),
            tio2_homepage_text_field(
                'field_tio2_home_inquiry_step_description',
                'inquiry_step_description',
                true,
                220,
                'textarea'
            ),
        ]),
        tio2_homepage_text_field('field_tio2_home_trust_heading', 'trust_heading', true, 90),
        tio2_homepage_text_field('field_tio2_home_trust_intro', 'trust_intro', true, 240, 'textarea'),
        tio2_homepage_repeater_field('field_tio2_home_trust_reasons', 'trust_reasons', true, 3, 4, [
            tio2_homepage_text_field('field_tio2_home_trust_reason_title', 'trust_reason_title', true),
            tio2_homepage_text_field(
                'field_tio2_home_trust_reason_description',
                'trust_reason_description',
                true
            ),
            tio2_homepage_claim_basis_field(
                'field_tio2_home_trust_reason_claim_basis',
                'trust_reason_claim_basis'
            ),
            tio2_homepage_evidence_url_field(
                'field_tio2_home_trust_reason_evidence_url',
                'trust_reason_evidence_url'
            ),
        ]),
        tio2_homepage_text_field('field_tio2_home_rfq_heading', 'rfq_heading', true, 90),
        tio2_homepage_rfq_copy_field('field_tio2_home_rfq_intro', 'rfq_intro'),
        [
            'key' => 'field_tio2_home_rfq_labels',
            'label' => 'RFQ Labels',
            'name' => 'rfq_labels',
            'type' => 'group',
            'required' => 1,
            'layout' => 'block',
            'show_in_graphql' => 1,
            'sub_fields' => [
                tio2_homepage_text_field('field_tio2_home_rfq_label_name', 'rfq_label_name', true),
                tio2_homepage_text_field('field_tio2_home_rfq_label_company', 'rfq_label_company', true),
                tio2_homepage_text_field(
                    'field_tio2_home_rfq_label_country_region',
                    'rfq_label_country_region',
                    true
                ),
                tio2_homepage_text_field('field_tio2_home_rfq_label_work_email', 'rfq_label_work_email', true),
                tio2_homepage_text_field('field_tio2_home_rfq_label_buyer_type', 'rfq_label_buyer_type', true),
                tio2_homepage_text_field('field_tio2_home_rfq_label_interest', 'rfq_label_interest', true),
                tio2_homepage_text_field(
                    'field_tio2_home_rfq_label_expected_quantity',
                    'rfq_label_expected_quantity',
                    true
                ),
                tio2_homepage_text_field('field_tio2_home_rfq_label_destination', 'rfq_label_destination', true),
                tio2_homepage_text_field('field_tio2_home_rfq_label_message', 'rfq_label_message', true),
                tio2_homepage_text_field('field_tio2_home_rfq_label_privacy', 'rfq_label_privacy', true),
                tio2_homepage_text_field(
                    'field_tio2_home_rfq_buyer_industrial_label',
                    'rfq_buyer_industrial_label',
                    true
                ),
                tio2_homepage_text_field(
                    'field_tio2_home_rfq_buyer_distributor_label',
                    'rfq_buyer_distributor_label',
                    true
                ),
                tio2_homepage_text_field(
                    'field_tio2_home_rfq_buyer_other_label',
                    'rfq_buyer_other_label',
                    true
                ),
            ],
        ],
        tio2_homepage_text_field('field_tio2_home_rfq_submit_label', 'rfq_submit_label', true, 32),
        tio2_homepage_rfq_copy_field('field_tio2_home_rfq_privacy_text', 'rfq_privacy_text'),
        tio2_homepage_rfq_copy_field('field_tio2_home_rfq_success_heading', 'rfq_success_heading'),
        tio2_homepage_rfq_copy_field('field_tio2_home_rfq_success_message', 'rfq_success_message'),
        tio2_homepage_text_field('field_tio2_home_faq_heading', 'faq_heading', true, 90),
        tio2_homepage_repeater_field('field_tio2_home_faqs', 'faqs', true, 3, 6, [
            tio2_homepage_text_field('field_tio2_home_faq_question', 'faq_question', true, 160),
            tio2_homepage_text_field('field_tio2_home_faq_answer', 'faq_answer', true, 600, 'textarea'),
            tio2_homepage_text_field('field_tio2_home_faq_related_label', 'faq_related_label', false),
            tio2_homepage_text_field('field_tio2_home_faq_related_path', 'faq_related_path', false),
        ]),
        tio2_homepage_text_field('field_tio2_home_closing_heading', 'closing_heading', true, 90),
        tio2_homepage_text_field('field_tio2_home_closing_body', 'closing_body', true, 220, 'textarea'),
        tio2_homepage_text_field('field_tio2_home_closing_label', 'closing_label', true, 32),
        tio2_homepage_text_field('field_tio2_home_seo_title', 'seo_title', true, 60),
        tio2_homepage_text_field('field_tio2_home_seo_description', 'seo_description', true, 160, 'textarea'),
        tio2_homepage_image_field('field_tio2_home_og_image', 'og_image'),
        tio2_homepage_text_field('field_tio2_home_primary_topic', 'primary_topic', true, 80),
        tio2_homepage_repeater_field('field_tio2_home_secondary_topics', 'secondary_topics', false, 0, 10, [
            tio2_homepage_text_field('field_tio2_home_secondary_topic', 'secondary_topic', true, 80),
        ]),
    ];

    $shared_field_names = [
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
    ];
    $v01_condition = [[[
        'field' => 'field_tio2_home_schema_version',
        'operator' => '==',
        'value' => 'homepage-v0.1',
    ]]];
    foreach ($fields as &$field) {
        if (! in_array($field['name'], $shared_field_names, true)) {
            $field['conditional_logic'] = $v01_condition;
        }
    }
    unset($field);

    return $fields;
}

/**
 * @param mixed $valid
 * @param mixed $value
 * @param mixed $field
 * @param mixed $input_name
 * @return mixed
 */
function tio2_validate_public_path($valid, $value, $field, $input_name)
{
    if (true !== $valid) {
        return $valid;
    }

    if (! is_string($value) || ! tio2_is_valid_public_path($value)) {
        return 'Public path must be / or lowercase slash-separated words using letters, numbers, and single hyphens.';
    }

    $post_id = tio2_get_authoring_post_id();
    $site_id = tio2_get_authoring_site_scope($post_id);
    if (null !== $site_id) {
        $other_owners = array_values(array_filter(
            tio2_find_managed_route_post_ids($site_id, $value),
            static fn (int $owner_id): bool => $owner_id !== $post_id
        ));
        if ([] !== $other_owners) {
            return 'Another Page or Post already owns this site scope and public path.';
        }
    }

    $submitted_status = $_POST['post_status'] ?? null;
    $post_status = is_scalar($submitted_status)
        ? sanitize_key((string) wp_unslash($submitted_status))
        : ($post_id > 0 ? (string) get_post_status($post_id) : 'draft');
    $submitted_post_type = $_POST['post_type'] ?? null;
    $post_type = is_scalar($submitted_post_type)
        ? sanitize_key((string) wp_unslash($submitted_post_type))
        : ($post_id > 0 ? (string) get_post_type($post_id) : '');
    $publication_validation = tio2_validate_managed_publication_candidate(
        $post_type,
        $post_status,
        $site_id,
        $value,
        $post_id
    );
    if (is_wp_error($publication_validation)) {
        return $publication_validation->get_error_message();
    }

    return true;
}

function tio2_get_authoring_post_id(): int
{
    foreach (['post_ID', 'post_id'] as $key) {
        if (isset($_POST[$key]) && is_scalar($_POST[$key])) {
            $post_id = (int) wp_unslash((string) $_POST[$key]);
            if ($post_id > 0) {
                return $post_id;
            }
        }
    }

    if (function_exists('acf_get_form_data')) {
        $post_id = (int) acf_get_form_data('post_id');
        if ($post_id > 0) {
            return $post_id;
        }
    }

    return 0;
}

function tio2_get_authoring_site_scope(int $post_id): ?string
{
    $submitted = $_POST['tax_input']['site_scope'] ?? null;
    if (null !== $submitted) {
        return tio2_publication_resolve_submitted_site_scope(wp_unslash($submitted));
    }

    if ($post_id <= 0) {
        return null;
    }
    $slugs = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($slugs)) {
        return null;
    }
    $slugs = array_values(array_unique(array_map('strval', $slugs)));
    return 1 === count($slugs) && in_array($slugs[0], ['tio2-a', 'tio2-b'], true)
        ? $slugs[0]
        : null;
}

function tio2_is_valid_public_path(string $path): bool
{
    return strlen($path) <= 172 &&
        1 === preg_match('~^/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$~', $path);
}

/**
 * @return string|WP_Error
 */
function tio2_build_internal_slug(string $site_id, string $public_path)
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true)) {
        return new WP_Error('tio2_invalid_site_scope', 'Managed content must have exactly one supported site scope.');
    }
    if (! tio2_is_valid_public_path($public_path)) {
        return new WP_Error('tio2_invalid_public_path', 'Managed content has an invalid public path.');
    }

    $path_slug = '/' === $public_path
        ? 'home'
        : str_replace('/', '--', substr($public_path, 1));
    $internal_slug = $site_id . '--' . $path_slug;

    if (strlen($internal_slug) > 180) {
        return new WP_Error('tio2_internal_slug_too_long', 'Managed content internal slug exceeds 180 characters.');
    }

    return $internal_slug;
}

/**
 * @return array{siteId: string, publicPath: string, internalSlug: string}|WP_Error
 */
function tio2_get_managed_post_route_identity(int $post_id)
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || ! in_array($post->post_type, ['page', 'post'], true)) {
        return new WP_Error('tio2_not_managed_content', 'Only WordPress Pages and Posts use managed site routing.');
    }

    $site_scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes)) {
        return $site_scopes;
    }
    $site_scopes = array_values(array_unique(array_map('strval', $site_scopes)));
    if (1 !== count($site_scopes) || ! in_array($site_scopes[0], ['tio2-a', 'tio2-b'], true)) {
        return new WP_Error('tio2_invalid_site_scope', 'Managed content must have exactly one supported site scope.');
    }

    $public_path = (string) get_post_meta($post_id, 'public_path', true);
    $internal_slug = tio2_build_internal_slug($site_scopes[0], $public_path);
    if (is_wp_error($internal_slug)) {
        return $internal_slug;
    }

    return [
        'siteId' => $site_scopes[0],
        'publicPath' => $public_path,
        'internalSlug' => $internal_slug,
    ];
}

/**
 * Drafts and trashed content reserve their route until the owner is permanently
 * deleted or assigned another route. This prevents ambiguous previews and later
 * publication collisions.
 *
 * @return list<int>
 */
function tio2_find_managed_route_post_ids(string $site_id, string $public_path): array
{
    if (! in_array($site_id, ['tio2-a', 'tio2-b'], true) || ! tio2_is_valid_public_path($public_path)) {
        return [];
    }

    $candidate_ids = get_posts([
        'post_type' => ['page', 'post'],
        'post_status' => ['publish', 'future', 'draft', 'pending', 'private', 'trash', 'auto-draft'],
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
        'meta_key' => 'public_path',
        'meta_value' => $public_path,
    ]);
    $owners = [];
    foreach ($candidate_ids as $candidate_id) {
        $site_scopes = wp_get_post_terms((int) $candidate_id, 'site_scope', ['fields' => 'slugs']);
        if (is_wp_error($site_scopes)) {
            $owners[] = (int) $candidate_id;
            continue;
        }
        $site_scopes = array_values(array_unique(array_map('strval', $site_scopes)));
        $supported_scopes = array_values(array_intersect($site_scopes, ['tio2-a', 'tio2-b']));
        $has_exact_scope = 1 === count($site_scopes) && 1 === count($supported_scopes);
        if (
            ($has_exact_scope && $supported_scopes[0] === $site_id) ||
            (! $has_exact_scope && in_array($site_id, $supported_scopes, true))
        ) {
            $owners[] = (int) $candidate_id;
        }
    }

    return $owners;
}

/**
 * @return array{siteId: string, publicPath: string, internalSlug: string}|WP_Error
 */
function tio2_get_managed_post_route(int $post_id)
{
    $identity = tio2_get_managed_post_route_identity($post_id);
    if (is_wp_error($identity)) {
        return $identity;
    }
    $owners = tio2_find_managed_route_post_ids($identity['siteId'], $identity['publicPath']);
    if (1 !== count($owners) || $owners[0] !== $post_id) {
        return new WP_Error(
            'tio2_duplicate_route',
            'Another Page or Post already owns this site scope and public path.'
        );
    }

    return $identity;
}

function tio2_record_route_error(int $post_id, WP_Error $error): void
{
    update_post_meta($post_id, '_tio2_route_error', $error->get_error_code());
    $status = get_post_status($post_id);
    if (in_array($status, ['publish', 'future', 'pending', 'private'], true)) {
        wp_update_post(['ID' => $post_id, 'post_status' => 'draft']);
    }
}

function tio2_managed_route_admin_notice(): void
{
    $post_id = isset($_GET['post']) ? (int) $_GET['post'] : 0;
    if ($post_id <= 0) {
        return;
    }
    $error_code = (string) get_post_meta($post_id, '_tio2_route_error', true);
    $messages = [
        'tio2_duplicate_route' => 'This content is a draft because another Page or Post owns the same site scope and public path.',
        'tio2_slug_collision' => 'This content is a draft because WordPress could not preserve its deterministic internal slug.',
        'tio2_invalid_site_scope' => 'This content is a draft because it must have exactly one supported site scope.',
        'tio2_invalid_public_path' => 'This content is a draft because its public path is invalid.',
    ];
    if (! isset($messages[$error_code])) {
        return;
    }
    echo '<div class="notice notice-error"><p>' . esc_html($messages[$error_code]) . '</p></div>';
}

/**
 * Enforce the final WordPress Admin/ACF save state after terms and fields exist.
 * Invalid managed content may remain a draft, but cannot remain published.
 *
 * @param int|string $post_id
 */
function tio2_sync_managed_post_routing($post_id): void
{
    $post_id = (int) $post_id;
    if ($post_id <= 0 || ! empty($GLOBALS['tio2_syncing_managed_post_routing'])) {
        return;
    }

    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        ! in_array($post->post_type, ['page', 'post'], true) ||
        wp_is_post_revision($post_id) ||
        wp_is_post_autosave($post_id)
    ) {
        return;
    }

    $route = tio2_get_managed_post_route($post_id);
    $GLOBALS['tio2_syncing_managed_post_routing'] = true;
    try {
        if (is_wp_error($route)) {
            tio2_record_route_error($post_id, $route);
            return;
        }

        if ($route['internalSlug'] === $post->post_name) {
            delete_post_meta($post_id, '_tio2_route_error');
            return;
        }

        $required_slug = $route['internalSlug'];
        $preserve_required_slug = static function ($sanitized, $raw_title, $context) use ($required_slug) {
            return 'save' === $context && $raw_title === $required_slug
                ? $required_slug
                : $sanitized;
        };
        add_filter('sanitize_title', $preserve_required_slug, 10, 3);
        try {
            $update_result = wp_update_post(['ID' => $post_id, 'post_name' => $required_slug], true);
        } finally {
            remove_filter('sanitize_title', $preserve_required_slug, 10);
        }
        clean_post_cache($post_id);
        if (is_wp_error($update_result) || $required_slug !== get_post_field('post_name', $post_id)) {
            tio2_record_route_error(
                $post_id,
                new WP_Error('tio2_slug_collision', 'WordPress could not preserve the deterministic internal slug.')
            );
            return;
        }
        delete_post_meta($post_id, '_tio2_route_error');
    } finally {
        $GLOBALS['tio2_syncing_managed_post_routing'] = false;
    }
}

function tio2_preserve_internal_slug(string $sanitized, string $raw_title, string $context): string
{
    $internal_slug_pattern = '~^tio2-(?:a|b)--(?:homepage|home|[a-z0-9]+(?:-[a-z0-9]+)*(?:--[a-z0-9]+(?:-[a-z0-9]+)*)*)$~';

    if (
        'query' === $context &&
        strlen($raw_title) <= 180 &&
        1 === preg_match($internal_slug_pattern, $raw_title)
    ) {
        return $raw_title;
    }

    return $sanitized;
}

function tio2_homepage_internal_slug(string $site_id): string
{
    return $site_id . '--homepage';
}

function tio2_get_homepage_site_id(int $post_id): ?string
{
    $site_scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes)) {
        return null;
    }
    $site_scopes = array_values(array_unique(array_map('strval', $site_scopes)));
    return 1 === count($site_scopes) && in_array($site_scopes[0], tio2_supported_site_ids(), true)
        ? $site_scopes[0]
        : null;
}

/**
 * @return list<int>
 */
function tio2_find_homepage_ids(string $site_id, bool $include_trash = true): array
{
    if (! in_array($site_id, tio2_supported_site_ids(), true)) {
        return [];
    }

    $statuses = ['publish', 'future', 'draft', 'pending', 'private', 'auto-draft'];
    if ($include_trash) {
        $statuses[] = 'trash';
    }
    $candidate_ids = get_posts([
        'post_type' => 'tio2_homepage',
        'post_status' => $statuses,
        'posts_per_page' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
        'tax_query' => [[
            'taxonomy' => 'site_scope',
            'field' => 'slug',
            'terms' => [$site_id],
        ]],
    ]);

    return array_values(array_filter(
        array_map('intval', $candidate_ids),
        static fn (int $candidate_id): bool => $site_id === tio2_get_homepage_site_id($candidate_id)
    ));
}

function tio2_homepage_string_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
}

/**
 * @param mixed $value
 * @return string|WP_Error
 */
function tio2_homepage_validate_string(
    $value,
    string $field_name,
    bool $required,
    ?int $maxlength = null
) {
    if (! is_scalar($value) && null !== $value) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be plain text.");
    }
    $trimmed = trim((string) $value);
    if ($trimmed !== wp_strip_all_tags($trimmed)) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be plain text without HTML.");
    }
    if ($required && '' === $trimmed) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} is required.");
    }
    if (null !== $maxlength && tio2_homepage_string_length($trimmed) > $maxlength) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} is too long.");
    }
    return $trimmed;
}

/**
 * Enforce the closed homepage-v0.1 RFQ editorial contract. WordPress owns
 * these values, but behavior copy is limited to the approved whole-string
 * statements after trim and consecutive-whitespace normalization.
 *
 * @param mixed $value
 * @return string|WP_Error
 */
function tio2_homepage_validate_rfq_behavior(
    $value,
    string $site_id,
    string $field_name,
    int $maxlength
)
{
    return tio2_validate_homepage_rfq_copy($value, $site_id, $field_name, $maxlength);
}

/**
 * @param mixed $value
 * @return list<array<string, mixed>>|WP_Error
 */
function tio2_homepage_validate_rows($value, string $field_name, int $min, int $max)
{
    if (false === $value || null === $value || '' === $value) {
        $value = [];
    }
    if (! is_array($value)) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be a repeater.");
    }
    $rows = array_values($value);
    if (count($rows) < $min || count($rows) > $max) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} has the wrong number of rows.");
    }
    foreach ($rows as $row) {
        if (! is_array($row)) {
            return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} contains an invalid row.");
        }
    }
    return $rows;
}

/**
 * @param mixed $value
 * @return true|WP_Error
 */
function tio2_homepage_validate_image($value, string $field_name, $alt_value)
{
    $alt = tio2_homepage_validate_string($alt_value, $field_name . '_alt', false, 160);
    if (is_wp_error($alt)) {
        return $alt;
    }
    if (false === $value || null === $value || '' === $value || 0 === (int) $value) {
        return '' === $alt
            ? true
            : new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name}_alt requires an image.");
    }
    if (! is_numeric($value) || (int) $value <= 0) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be an image ID.");
    }
    $attachment = get_post((int) $value);
    $mime_type = get_post_mime_type((int) $value);
    if (
        ! $attachment instanceof WP_Post ||
        'attachment' !== $attachment->post_type ||
        ! in_array($mime_type, ['image/jpeg', 'image/png', 'image/webp', 'image/avif'], true)
    ) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} has an unsupported image type.");
    }
    return true;
}

/**
 * @param mixed $value
 * @return string|WP_Error
 */
function tio2_homepage_validate_path(
    $value,
    string $field_name,
    string $site_id,
    bool $required,
    ?int $maxlength = null
) {
    $path = tio2_homepage_validate_string($value, $field_name, $required, $maxlength);
    if (is_wp_error($path) || '' === $path) {
        return $path;
    }
    if ('/' === $path || ! tio2_is_valid_public_path($path)) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be a non-root site path.");
    }
    $route_owner_ids = tio2_find_managed_route_post_ids($site_id, $path);
    $required_slug = tio2_build_internal_slug($site_id, $path);
    if (
        is_wp_error($required_slug) ||
        1 !== count($route_owner_ids) ||
        ! in_array(get_post_status($route_owner_ids[0]), ['publish', 'draft'], true) ||
        $required_slug !== get_post_field('post_name', $route_owner_ids[0])
    ) {
        return new WP_Error(
            'tio2_homepage_invalid_field',
            "Homepage field {$field_name} must have exactly one published or draft current-site target."
        );
    }
    return $path;
}

/**
 * @param mixed $basis_value
 * @param mixed $url_value
 * @return true|WP_Error
 */
function tio2_homepage_validate_evidence($basis_value, $url_value, string $field_name)
{
    $basis = tio2_homepage_validate_string($basis_value, $field_name . '_claim_basis', true);
    if (is_wp_error($basis)) {
        return $basis;
    }
    if (! in_array($basis, ['user_confirmed', 'source_required'], true)) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} has an invalid claim basis.");
    }
    $url = tio2_homepage_validate_string($url_value, $field_name . '_evidence_url', false);
    if (is_wp_error($url)) {
        return $url;
    }
    if ('source_required' === $basis && '' === $url) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} requires evidence.");
    }
    if ('' === $url) {
        return true;
    }
    $parts = wp_parse_url($url);
    if (
        false === filter_var($url, FILTER_VALIDATE_URL) ||
        ! is_array($parts) ||
        'https' !== ($parts['scheme'] ?? null) ||
        empty($parts['host']) ||
        isset($parts['user']) ||
        isset($parts['pass'])
    ) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} requires an HTTPS evidence URL.");
    }
    return true;
}

/**
 * @param list<string> $values
 */
function tio2_homepage_has_duplicates(array $values): bool
{
    $normalized = array_map(
        static fn (string $value): string => function_exists('mb_strtolower')
            ? mb_strtolower(trim($value))
            : strtolower(trim($value)),
        $values
    );
    return count($normalized) !== count(array_unique($normalized));
}

/**
 * @return true|WP_Error
 */
function tio2_validate_homepage_contract(int $post_id)
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_homepage' !== $post->post_type) {
        return new WP_Error('tio2_homepage_invalid_post', 'Homepage validation requires a homepage record.');
    }
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return new WP_Error('tio2_homepage_invalid_post', 'Homepage revisions and autosaves are not content records.');
    }

    $site_id = tio2_get_homepage_site_id($post_id);
    if (null === $site_id) {
        return new WP_Error('tio2_homepage_invalid_site_scope', 'Homepage must have exactly one supported site scope.');
    }
    if (tio2_homepage_internal_slug($site_id) !== $post->post_name) {
        return new WP_Error('tio2_homepage_invalid_slug', 'Homepage must retain its deterministic internal slug.');
    }

    $other_homepages = array_values(array_filter(
        tio2_find_homepage_ids($site_id),
        static fn (int $candidate_id): bool => $candidate_id !== $post_id
    ));
    if ([] !== $other_homepages) {
        return new WP_Error('tio2_homepage_duplicate', 'Another homepage already reserves this site identity.');
    }
    if ([] !== tio2_find_managed_route_post_ids($site_id, '/')) {
        return new WP_Error('tio2_homepage_root_conflict', 'A Page or Post already owns this site root.');
    }

    $schema_version = tio2_homepage_validate_string(
        get_field('homepage_schema_version', $post_id, false),
        'homepage_schema_version',
        true
    );
    $expected_version = tio2_expected_homepage_schema_version($site_id);
    if (is_wp_error($schema_version) || $schema_version !== $expected_version) {
        return new WP_Error(
            'tio2_homepage_invalid_schema_version',
            "Homepage schema version must be {$expected_version}."
        );
    }

    return match ($schema_version) {
        'homepage-v0.3-brand' => tio2_validate_homepage_v03_contract($post_id),
        'homepage-v0.2-editorial-geo' => tio2_validate_homepage_v02_contract($post_id),
        default => tio2_validate_homepage_v01_fields($post_id, $site_id),
    };
}

/**
 * @return true|WP_Error
 */
function tio2_validate_homepage_v01_fields(int $post_id, string $site_id)
{
    $top_level_strings = [
        'hero_eyebrow' => [true, 80],
        'hero_heading' => [true, 90],
        'hero_summary' => [true, 320],
        'hero_primary_label' => [true, 32],
        'hero_secondary_label' => [true, 32],
        'products_heading' => [true, 90],
        'products_intro' => [true, 240],
        'applications_heading' => [true, 90],
        'applications_intro' => [true, 240],
        'inquiry_heading' => [true, 90],
        'trust_heading' => [true, 90],
        'trust_intro' => [true, 240],
        'rfq_heading' => [true, 90],
        'rfq_intro' => [true, 260],
        'rfq_submit_label' => [true, 32],
        'rfq_privacy_text' => [true, 240],
        'rfq_success_heading' => [true, 80],
        'rfq_success_message' => [true, 240],
        'faq_heading' => [true, 90],
        'closing_heading' => [true, 90],
        'closing_body' => [true, 220],
        'closing_label' => [true, 32],
        'seo_title' => [true, 60],
        'seo_description' => [true, 160],
        'primary_topic' => [true, 80],
    ];
    foreach ($top_level_strings as $field_name => [$required, $maxlength]) {
        $valid = tio2_homepage_validate_string(
            get_field($field_name, $post_id, false),
            $field_name,
            $required,
            $maxlength
        );
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    foreach ([
        'rfq_intro' => 260,
        'rfq_privacy_text' => 240,
        'rfq_success_heading' => 80,
        'rfq_success_message' => 240,
    ] as $field_name => $maxlength) {
        $valid = tio2_homepage_validate_rfq_behavior(
            get_field($field_name, $post_id, false),
            $site_id,
            $field_name,
            $maxlength
        );
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    $secondary_path = tio2_homepage_validate_path(
        get_field('hero_secondary_path', $post_id, false),
        'hero_secondary_path',
        $site_id,
        true,
        172
    );
    if (is_wp_error($secondary_path)) {
        return $secondary_path;
    }
    $hero_image = tio2_homepage_validate_image(
        get_field('hero_image', $post_id, false),
        'hero_image',
        get_field('hero_image_alt', $post_id, false)
    );
    if (is_wp_error($hero_image)) {
        return $hero_image;
    }
    $og_image = tio2_homepage_validate_image(
        get_field('og_image', $post_id, false),
        'og_image',
        ''
    );
    if (is_wp_error($og_image)) {
        return $og_image;
    }

    $metrics = tio2_homepage_validate_rows(get_field('metrics', $post_id, false), 'metrics', 0, 4);
    if (is_wp_error($metrics)) {
        return $metrics;
    }
    foreach ($metrics as $row) {
        foreach ([
            'metric_value' => [true, 24],
            'metric_unit' => [false, 16],
            'metric_label' => [true, 60],
            'metric_context' => [false, 120],
        ] as $field_name => [$required, $maxlength]) {
            $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, $required, $maxlength);
            if (is_wp_error($valid)) {
                return $valid;
            }
        }
        $evidence = tio2_homepage_validate_evidence(
            $row['metric_claim_basis'] ?? null,
            $row['metric_evidence_url'] ?? null,
            'metric'
        );
        if (is_wp_error($evidence)) {
            return $evidence;
        }
    }

    $product_routes = tio2_homepage_validate_rows(
        get_field('product_routes', $post_id, false),
        'product_routes',
        2,
        6
    );
    if (is_wp_error($product_routes)) {
        return $product_routes;
    }
    $product_paths = [];
    foreach ($product_routes as $row) {
        foreach ([
            'product_title' => [true, 80],
            'product_summary' => [true, 220],
        ] as $field_name => [$required, $maxlength]) {
            $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, $required, $maxlength);
            if (is_wp_error($valid)) {
                return $valid;
            }
        }
        $path = tio2_homepage_validate_path(
            $row['product_path'] ?? null,
            'product_path',
            $site_id,
            true,
            172
        );
        if (is_wp_error($path)) {
            return $path;
        }
        $product_paths[] = $path;
        $image = tio2_homepage_validate_image(
            $row['product_image'] ?? null,
            'product_image',
            $row['product_image_alt'] ?? null
        );
        if (is_wp_error($image)) {
            return $image;
        }
    }
    if (tio2_homepage_has_duplicates($product_paths)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage product paths must be unique.');
    }

    $applications = tio2_homepage_validate_rows(
        get_field('applications', $post_id, false),
        'applications',
        3,
        6
    );
    if (is_wp_error($applications)) {
        return $applications;
    }
    $application_paths = [];
    foreach ($applications as $row) {
        foreach (['application_name', 'application_summary'] as $field_name) {
            $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, true);
            if (is_wp_error($valid)) {
                return $valid;
            }
        }
        $path = tio2_homepage_validate_path(
            $row['application_path'] ?? null,
            'application_path',
            $site_id,
            true
        );
        if (is_wp_error($path)) {
            return $path;
        }
        $application_paths[] = $path;
        $image = tio2_homepage_validate_image(
            $row['application_image'] ?? null,
            'application_image',
            $row['application_image_alt'] ?? null
        );
        if (is_wp_error($image)) {
            return $image;
        }
    }
    if (tio2_homepage_has_duplicates($application_paths)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage application paths must be unique.');
    }

    $inquiry_steps = tio2_homepage_validate_rows(
        get_field('inquiry_steps', $post_id, false),
        'inquiry_steps',
        3,
        3
    );
    if (is_wp_error($inquiry_steps)) {
        return $inquiry_steps;
    }
    foreach ($inquiry_steps as $row) {
        foreach ([
            'inquiry_step_title' => 70,
            'inquiry_step_description' => 220,
        ] as $field_name => $maxlength) {
            $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, true, $maxlength);
            if (is_wp_error($valid)) {
                return $valid;
            }
        }
    }

    $trust_reasons = tio2_homepage_validate_rows(
        get_field('trust_reasons', $post_id, false),
        'trust_reasons',
        3,
        4
    );
    if (is_wp_error($trust_reasons)) {
        return $trust_reasons;
    }
    foreach ($trust_reasons as $row) {
        foreach (['trust_reason_title', 'trust_reason_description'] as $field_name) {
            $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, true);
            if (is_wp_error($valid)) {
                return $valid;
            }
        }
        $evidence = tio2_homepage_validate_evidence(
            $row['trust_reason_claim_basis'] ?? null,
            $row['trust_reason_evidence_url'] ?? null,
            'trust_reason'
        );
        if (is_wp_error($evidence)) {
            return $evidence;
        }
    }

    $rfq_labels = get_field('rfq_labels', $post_id);
    if (! is_array($rfq_labels)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage RFQ labels are required.');
    }
    foreach ([
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
    ] as $field_name) {
        $valid = tio2_homepage_validate_string($rfq_labels[$field_name] ?? null, $field_name, true);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    $faqs = tio2_homepage_validate_rows(get_field('faqs', $post_id, false), 'faqs', 3, 6);
    if (is_wp_error($faqs)) {
        return $faqs;
    }
    $faq_questions = [];
    foreach ($faqs as $row) {
        $question = tio2_homepage_validate_string($row['faq_question'] ?? null, 'faq_question', true, 160);
        if (is_wp_error($question)) {
            return $question;
        }
        $answer = tio2_homepage_validate_string($row['faq_answer'] ?? null, 'faq_answer', true, 600);
        if (is_wp_error($answer)) {
            return $answer;
        }
        $related_label = tio2_homepage_validate_string(
            $row['faq_related_label'] ?? null,
            'faq_related_label',
            false
        );
        if (is_wp_error($related_label)) {
            return $related_label;
        }
        $related_path_value = $row['faq_related_path'] ?? null;
        $related_path = tio2_homepage_validate_string($related_path_value, 'faq_related_path', false);
        if (is_wp_error($related_path)) {
            return $related_path;
        }
        if (('' === $related_label) !== ('' === $related_path)) {
            return new WP_Error('tio2_homepage_invalid_field', 'Homepage FAQ related label and path must be paired.');
        }
        if ('' !== $related_path) {
            $valid_path = tio2_homepage_validate_path(
                $related_path,
                'faq_related_path',
                $site_id,
                true
            );
            if (is_wp_error($valid_path)) {
                return $valid_path;
            }
        }
        $faq_questions[] = $question;
    }
    if (tio2_homepage_has_duplicates($faq_questions)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage FAQ questions must be unique.');
    }

    $secondary_topics = tio2_homepage_validate_rows(
        get_field('secondary_topics', $post_id, false),
        'secondary_topics',
        0,
        10
    );
    if (is_wp_error($secondary_topics)) {
        return $secondary_topics;
    }
    $topic_values = [];
    foreach ($secondary_topics as $row) {
        $topic = tio2_homepage_validate_string(
            $row['secondary_topic'] ?? null,
            'secondary_topic',
            true,
            80
        );
        if (is_wp_error($topic)) {
            return $topic;
        }
        $topic_values[] = $topic;
    }
    if (tio2_homepage_has_duplicates($topic_values)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage secondary topics must be unique.');
    }

    return true;
}

/**
 * @return true|WP_Error
 */
function tio2_force_homepage_slug(int $post_id)
{
    $site_id = tio2_get_homepage_site_id($post_id);
    if (null === $site_id) {
        return new WP_Error('tio2_homepage_invalid_site_scope', 'Homepage must have exactly one supported site scope.');
    }
    $required_slug = tio2_homepage_internal_slug($site_id);
    if ($required_slug === get_post_field('post_name', $post_id)) {
        return true;
    }

    $preserve_required_slug = static function ($sanitized, $raw_title, $context) use ($required_slug) {
        return 'save' === $context && $raw_title === $required_slug
            ? $required_slug
            : $sanitized;
    };
    add_filter('sanitize_title', $preserve_required_slug, 10, 3);
    try {
        $result = wp_update_post(['ID' => $post_id, 'post_name' => $required_slug], true);
    } finally {
        remove_filter('sanitize_title', $preserve_required_slug, 10);
    }
    clean_post_cache($post_id);
    if (is_wp_error($result) || $required_slug !== get_post_field('post_name', $post_id)) {
        return new WP_Error('tio2_homepage_invalid_slug', 'WordPress could not preserve the homepage slug.');
    }
    return true;
}

function tio2_release_homepage_identity(
    int $post_id,
    string $error_code,
    string $slug_prefix
): void
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || 'tio2_homepage' !== $post->post_type) {
        return;
    }

    wp_set_object_terms($post_id, [], 'site_scope', false);
    $post_update = [
        'ID' => $post_id,
        'post_name' => $slug_prefix . '-' . $post_id,
    ];
    if (in_array($post->post_status, ['publish', 'future', 'pending', 'private'], true)) {
        $post_update['post_status'] = 'draft';
    }
    wp_update_post($post_update);
    update_post_meta($post_id, '_tio2_homepage_error', $error_code);
    clean_post_cache($post_id);
}

function tio2_release_duplicate_homepage_identity(int $post_id): void
{
    tio2_release_homepage_identity(
        $post_id,
        'tio2_homepage_duplicate',
        'homepage-duplicate'
    );
}

/**
 * Reconcile only the site-owned homepage identity. Draft content may be
 * incomplete, so field, link, and evidence validation remains a separate
 * publish/preview boundary.
 *
 * @return true|WP_Error
 */
function tio2_reconcile_homepage_identity(int $post_id)
{
    if ($post_id <= 0 || ! empty($GLOBALS['tio2_reconciling_homepage_identity'])) {
        return true;
    }
    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        'tio2_homepage' !== $post->post_type ||
        wp_is_post_revision($post_id) ||
        wp_is_post_autosave($post_id)
    ) {
        return true;
    }

    $GLOBALS['tio2_reconciling_homepage_identity'] = true;
    try {
        $site_id = tio2_get_homepage_site_id($post_id);
        if (null === $site_id) {
            if ('tio2_homepage_duplicate' === get_post_meta($post_id, '_tio2_homepage_error', true)) {
                return new WP_Error(
                    'tio2_homepage_duplicate',
                    'Another homepage already reserves this site identity.'
                );
            }
            tio2_release_homepage_identity(
                $post_id,
                'tio2_homepage_invalid_site_scope',
                'homepage-unassigned'
            );
            return new WP_Error(
                'tio2_homepage_invalid_site_scope',
                'Homepage must have exactly one supported site scope.'
            );
        }

        $homepage_ids = tio2_find_homepage_ids($site_id);
        if (count($homepage_ids) > 1) {
            sort($homepage_ids, SORT_NUMERIC);
            $identity_owner_id = $homepage_ids[0];
            foreach (array_slice($homepage_ids, 1) as $duplicate_id) {
                tio2_release_duplicate_homepage_identity($duplicate_id);
            }
            if ($post_id !== $identity_owner_id) {
                return true;
            }
        }

        $slug_result = tio2_force_homepage_slug($post_id);
        if (is_wp_error($slug_result)) {
            update_post_meta($post_id, '_tio2_homepage_error', $slug_result->get_error_code());
            return $slug_result;
        }

        $stored_error = (string) get_post_meta($post_id, '_tio2_homepage_error', true);
        if (in_array($stored_error, [
            'tio2_homepage_invalid_site_scope',
            'tio2_homepage_invalid_slug',
            'tio2_homepage_duplicate',
        ], true)) {
            delete_post_meta($post_id, '_tio2_homepage_error');
        }
        return true;
    } finally {
        $GLOBALS['tio2_reconciling_homepage_identity'] = false;
    }
}

/**
 * @return true|WP_Error
 */
function tio2_set_homepage_status_exact(int $post_id, string $post_status)
{
    global $wpdb;

    $previous_status = (string) get_post_status($post_id);
    if ($previous_status === $post_status) {
        return true;
    }
    $force_failure = (bool) apply_filters(
        'tio2_homepage_force_status_update_failure',
        false,
        $post_id,
        $post_status
    );
    $updated = $force_failure
        ? false
        : $wpdb->update(
            $wpdb->posts,
            ['post_status' => $post_status],
            ['ID' => $post_id],
            ['%s'],
            ['%d']
        );
    $primary_failed = false === $updated;
    if (false === $updated) {
        $compensated = $wpdb->query($wpdb->prepare(
            "UPDATE {$wpdb->posts} SET post_status = %s WHERE ID = %d",
            $post_status,
            $post_id
        ));
        if (false === $compensated) {
            clean_post_cache($post_id);
            return new WP_Error(
                'tio2_homepage_status_write_failed',
                'Homepage status update and exact compensation both failed.'
            );
        }
    }
    clean_post_cache($post_id);
    $post = get_post($post_id);
    if (! $post instanceof WP_Post || $post_status !== $post->post_status) {
        return new WP_Error(
            'tio2_homepage_status_write_failed',
            'Homepage status update did not persist the required final status.'
        );
    }
    wp_transition_post_status($post_status, $previous_status, $post);

    return $primary_failed
        ? new WP_Error(
            'tio2_homepage_status_write_failed',
            'Homepage primary status update failed; exact compensation was applied.'
        )
        : true;
}

/**
 * @return true|WP_Error
 */
function tio2_enforce_homepage_contract(int $post_id)
{
    if ($post_id <= 0 || ! empty($GLOBALS['tio2_enforcing_homepage_contract'])) {
        return true;
    }
    $post = get_post($post_id);
    if (
        ! $post instanceof WP_Post ||
        'tio2_homepage' !== $post->post_type ||
        wp_is_post_revision($post_id) ||
        wp_is_post_autosave($post_id)
    ) {
        return true;
    }

    $GLOBALS['tio2_enforcing_homepage_contract'] = true;
    try {
        $identity_result = tio2_reconcile_homepage_identity($post_id);
        $result = is_wp_error($identity_result)
            ? $identity_result
            : tio2_validate_homepage_contract($post_id);
        if (is_wp_error($result)) {
            if (in_array(get_post_status($post_id), ['publish', 'future', 'pending', 'private'], true)) {
                update_post_meta($post_id, '_tio2_homepage_error', $result->get_error_code());
                $status_result = tio2_set_homepage_status_exact($post_id, 'draft');
                clean_post_cache($post_id);
                if (is_wp_error($status_result)) {
                    return $status_result;
                }
                if ('draft' !== get_post_status($post_id)) {
                    return new WP_Error(
                        'tio2_homepage_status_write_failed',
                        'Homepage enforcement could not verify the required draft status.'
                    );
                }
            }
            return $result;
        }
        delete_post_meta($post_id, '_tio2_homepage_error');
        return true;
    } finally {
        $GLOBALS['tio2_enforcing_homepage_contract'] = false;
    }
}

/**
 * ACF also uses acf/save_post for non-post targets such as options pages.
 *
 * @param mixed $post_id
 */
function tio2_enforce_homepage_from_acf($post_id): void
{
    if (! is_numeric($post_id) || (int) $post_id <= 0) {
        return;
    }
    unset($GLOBALS['tio2_homepage_acf_save_in_progress'][(int) $post_id]);
    tio2_enforce_homepage_contract((int) $post_id);
}

/**
 * ACF writes a record's fields at priority 10. Defer validation until the
 * priority-30 final boundary so an invalid intermediate row cannot draft an
 * otherwise valid final record.
 *
 * @param mixed $post_id
 */
function tio2_begin_homepage_acf_save($post_id): void
{
    if (! is_numeric($post_id) || (int) $post_id <= 0) {
        return;
    }
    $post = get_post((int) $post_id);
    if (! $post instanceof WP_Post || 'tio2_homepage' !== $post->post_type) {
        return;
    }
    if (! isset($GLOBALS['tio2_homepage_acf_save_in_progress'])) {
        $GLOBALS['tio2_homepage_acf_save_in_progress'] = [];
    }
    $GLOBALS['tio2_homepage_acf_save_in_progress'][(int) $post_id] = true;
}

/**
 * @param mixed $request
 */
function tio2_enforce_homepage_after_rest(WP_Post $post, $request, bool $creating): void
{
    tio2_enforce_homepage_contract((int) $post->ID);
}

function tio2_revalidate_published_homepages(): void
{
    if (! empty($GLOBALS['tio2_revalidating_homepage_dependencies'])) {
        return;
    }

    $GLOBALS['tio2_revalidating_homepage_dependencies'] = true;
    try {
        $homepage_ids = get_posts([
            'post_type' => 'tio2_homepage',
            'post_status' => ['publish', 'future', 'pending', 'private'],
            'posts_per_page' => -1,
            'fields' => 'ids',
            'no_found_rows' => true,
        ]);
        foreach ($homepage_ids as $homepage_id) {
            tio2_enforce_homepage_contract((int) $homepage_id);
        }
    } finally {
        $GLOBALS['tio2_revalidating_homepage_dependencies'] = false;
    }
}

/**
 * @param mixed $meta_id
 * @param mixed $meta_value
 */
function tio2_enforce_homepage_after_meta_mutation($meta_id, int $post_id, string $meta_key, $meta_value): void
{
    $post = get_post($post_id);
    if (! $post instanceof WP_Post) {
        return;
    }

    if ('tio2_homepage' === $post->post_type) {
        if (! empty($GLOBALS['tio2_homepage_acf_save_in_progress'][$post_id])) {
            return;
        }
        if ('_tio2_homepage_error' !== $meta_key && in_array($post->post_status, ['publish', 'future', 'pending', 'private'], true)) {
            if (function_exists('acf_flush_value_cache')) {
                acf_flush_value_cache($post_id, ltrim($meta_key, '_'));
            }
            tio2_enforce_homepage_contract($post_id);
        }
        return;
    }

    if (in_array($post->post_type, ['page', 'post'], true) && 'public_path' === $meta_key) {
        tio2_revalidate_published_homepages();
    }
}

/**
 * @param list<int> $term_taxonomy_ids
 */
function tio2_enforce_homepage_after_site_scope_removal(
    int $post_id,
    array $term_taxonomy_ids,
    string $taxonomy
): void {
    if ('site_scope' !== $taxonomy || ! empty($GLOBALS['tio2_enforcing_homepage_site_scope_removal'])) {
        return;
    }
    $post = get_post($post_id);
    if (! $post instanceof WP_Post) {
        return;
    }

    $GLOBALS['tio2_enforcing_homepage_site_scope_removal'] = true;
    try {
        if ('tio2_homepage' === $post->post_type) {
            tio2_reconcile_homepage_identity($post_id);
            if (in_array(get_post_status($post_id), ['publish', 'future', 'pending', 'private'], true)) {
                tio2_enforce_homepage_contract($post_id);
            }
        } elseif (in_array($post->post_type, ['page', 'post'], true)) {
            tio2_revalidate_published_homepages();
        }
    } finally {
        $GLOBALS['tio2_enforcing_homepage_site_scope_removal'] = false;
    }
}

/**
 * @param mixed $terms
 * @param list<int> $term_taxonomy_ids
 * @param list<int> $old_term_taxonomy_ids
 */
function tio2_enforce_homepage_after_site_scope_mutation(
    int $post_id,
    $terms,
    array $term_taxonomy_ids,
    string $taxonomy,
    bool $append,
    array $old_term_taxonomy_ids
): void {
    if ('site_scope' !== $taxonomy) {
        return;
    }
    $post = get_post($post_id);
    if (! $post instanceof WP_Post) {
        return;
    }
    if ('tio2_homepage' === $post->post_type) {
        tio2_reconcile_homepage_identity($post_id);
        if (in_array(get_post_status($post_id), ['publish', 'future', 'pending', 'private'], true)) {
            tio2_enforce_homepage_contract($post_id);
        }
        return;
    }
    if (in_array($post->post_type, ['page', 'post'], true)) {
        tio2_revalidate_published_homepages();
    }
}

function tio2_enforce_homepage_dependencies_after_transition(
    string $new_status,
    string $old_status,
    WP_Post $post
): void {
    if (
        $new_status !== $old_status &&
        in_array($post->post_type, ['page', 'post'], true) &&
        (
            in_array($new_status, ['publish', 'draft'], true) ||
            in_array($old_status, ['publish', 'draft'], true)
        )
    ) {
        tio2_revalidate_published_homepages();
    }
}

function tio2_enforce_homepage_dependencies_after_delete(int $post_id, WP_Post $post): void
{
    if (in_array($post->post_type, ['page', 'post'], true)) {
        tio2_revalidate_published_homepages();
    }
}

function tio2_enforce_homepage_dependencies_after_slug_change(
    int $post_id,
    WP_Post $post_after,
    WP_Post $post_before
): void {
    if (
        ! in_array($post_after->post_type, ['page', 'post'], true) ||
        $post_after->post_name === $post_before->post_name
    ) {
        return;
    }

    $route = tio2_get_managed_post_route($post_id);
    if (
        ! is_wp_error($route) &&
        $post_after->post_status === $post_before->post_status &&
        $post_after->post_title !== $post_before->post_title &&
        $route['internalSlug'] === $post_before->post_name &&
        sanitize_title($post_before->post_name) === $post_after->post_name
    ) {
        tio2_sync_managed_post_routing($post_id);
    }

    tio2_revalidate_published_homepages();
}
