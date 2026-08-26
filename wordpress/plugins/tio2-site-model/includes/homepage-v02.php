<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_v02_claim_basis_field(string $key, string $name): array
{
    return [
        'key' => $key,
        'name' => $name,
        'label' => ucwords(str_replace('_', ' ', $name)),
        'type' => 'select',
        'required' => 1,
        'choices' => [
            'synthetic_demo' => 'Synthetic demo',
            'user_confirmed' => 'User confirmed',
            'source_document' => 'Source document',
        ],
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_v02_verification_field(string $key): array
{
    return [
        'key' => $key,
        'name' => 'verification_status',
        'label' => 'Verification Status',
        'type' => 'select',
        'required' => 1,
        'choices' => [
            'demo' => 'Demo',
            'needs_review' => 'Needs review',
            'verified' => 'Verified',
        ],
        'return_format' => 'value',
        'show_in_graphql' => 1,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_homepage_v02_field_definitions(): array
{
    $fields = [
        tio2_homepage_text_field('field_tio2_geo_header_rfq_label', 'header_rfq_label', true, 32),
        tio2_homepage_text_field('field_tio2_geo_direct_answer_question', 'direct_answer_question', true),
        tio2_homepage_text_field('field_tio2_geo_direct_answer_lead', 'direct_answer_lead', true, null, 'textarea'),
        tio2_homepage_text_field('field_tio2_geo_direct_answer_body', 'direct_answer_body', true, null, 'textarea'),
        tio2_homepage_repeater_field('field_tio2_geo_decision_questions', 'decision_questions', true, 1, 12, [
            tio2_homepage_text_field('field_tio2_geo_decision_number', 'decision_number', true),
            tio2_homepage_text_field('field_tio2_geo_decision_question', 'decision_question', true),
            tio2_homepage_text_field('field_tio2_geo_decision_answer', 'decision_answer', true, null, 'textarea'),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_application_briefs', 'application_briefs', true, 1, 12, [
            tio2_homepage_text_field('field_tio2_geo_application_name', 'application_name', true),
            tio2_homepage_text_field('field_tio2_geo_application_summary', 'application_summary', true, null, 'textarea'),
            tio2_homepage_text_field(
                'field_tio2_geo_application_considerations',
                'application_considerations',
                true,
                null,
                'textarea'
            ),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_supply_routes', 'supply_routes', true, 1, 6, [
            tio2_homepage_text_field('field_tio2_geo_route_name', 'route_name', true),
            tio2_homepage_text_field('field_tio2_geo_route_meaning', 'route_meaning', true, null, 'textarea'),
            tio2_homepage_text_field(
                'field_tio2_geo_buyer_verification',
                'buyer_verification',
                true,
                null,
                'textarea'
            ),
            tio2_homepage_text_field(
                'field_tio2_geo_documentation_context',
                'documentation_context',
                true,
                null,
                'textarea'
            ),
            tio2_homepage_v02_claim_basis_field('field_tio2_geo_claim_basis', 'claim_basis'),
            tio2_homepage_evidence_url_field('field_tio2_geo_route_evidence_url', 'evidence_url'),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_evidence_items', 'evidence_items', false, 0, 12, [
            tio2_homepage_text_field('field_tio2_geo_document_type', 'document_type', true),
            tio2_homepage_text_field('field_tio2_geo_document_title', 'document_title', true),
            tio2_homepage_text_field('field_tio2_geo_document_summary', 'document_summary', true, null, 'textarea'),
            tio2_homepage_text_field('field_tio2_geo_applicability', 'applicability', true, null, 'textarea'),
            tio2_homepage_text_field('field_tio2_geo_revision_label', 'revision_label', false),
            tio2_homepage_evidence_url_field('field_tio2_geo_item_evidence_url', 'evidence_url'),
            tio2_homepage_v02_verification_field('field_tio2_geo_verification_status'),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_evaluation_steps', 'evaluation_steps', true, 1, 10, [
            tio2_homepage_text_field('field_tio2_geo_method_number', 'method_number', true),
            tio2_homepage_text_field('field_tio2_geo_method_title', 'method_title', true),
            tio2_homepage_text_field(
                'field_tio2_geo_method_description',
                'method_description',
                true,
                null,
                'textarea'
            ),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_faqs', 'geo_faqs', true, 3, 20, [
            tio2_homepage_text_field('field_tio2_geo_faq_question', 'faq_question', true, 160),
            tio2_homepage_text_field('field_tio2_geo_faq_answer', 'faq_answer', true, 600, 'textarea'),
        ]),
        tio2_homepage_repeater_field('field_tio2_geo_glossary_items', 'glossary_items', false, 0, 30, [
            tio2_homepage_text_field('field_tio2_geo_term', 'term', true),
            tio2_homepage_text_field('field_tio2_geo_definition', 'definition', true, null, 'textarea'),
        ]),
        tio2_homepage_text_field(
            'field_tio2_geo_editorial_reviewed_at',
            'editorial_reviewed_at',
            true,
            24
        ),
        tio2_homepage_text_field('field_tio2_geo_editorial_reviewed_by', 'editorial_reviewed_by', true),
        tio2_homepage_text_field(
            'field_tio2_geo_editorial_review_scope',
            'editorial_review_scope',
            true,
            null,
            'textarea'
        ),
    ];

    $condition = [[[
        'field' => 'field_tio2_home_schema_version',
        'operator' => '==',
        'value' => 'homepage-v0.2-editorial-geo',
    ]]];
    foreach ($fields as &$field) {
        $field['conditional_logic'] = $condition;
    }
    unset($field);

    return $fields;
}

function tio2_register_homepage_v02_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group([
        'key' => 'group_tio2_homepage_editorial_geo',
        'title' => 'TiO2 Homepage Editorial GEO Fields',
        'fields' => tio2_homepage_v02_field_definitions(),
        'location' => [[[
            'param' => 'post_type',
            'operator' => '==',
            'value' => 'tio2_homepage',
        ]]],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'editorialGeoFields',
    ]);
}

/**
 * @param mixed $value
 * @return list<array<string, mixed>>
 */
function tio2_homepage_v02_preview_rows($value): array
{
    if (! is_array($value)) {
        return [];
    }

    return array_values(array_filter($value, 'is_array'));
}

/**
 * @return array<string, mixed>
 */
function tio2_serialize_homepage_v02_preview(WP_Post $post, string $site_id): array
{
    $post_id = (int) $post->ID;
    $schema_version = (string) get_field('homepage_schema_version', $post_id, false);
    $secondary_topics = array_map(static fn (array $row): array => [
        'secondaryTopic' => (string) ($row['secondary_topic'] ?? ''),
    ], tio2_homepage_v02_preview_rows(get_field('secondary_topics', $post_id, false)));

    return [
        'id' => (string) $post_id,
        'databaseId' => $post_id,
        'siteId' => $site_id,
        'path' => '/',
        'schemaVersion' => $schema_version,
        'modifiedGmt' => get_post_modified_time('Y-m-d\TH:i:s', true, $post),
        'status' => $post->post_status,
        'siteScopes' => ['nodes' => [['slug' => $site_id]]],
        'homepageFields' => [
            'homepageSchemaVersion' => $schema_version,
            'heroEyebrow' => (string) get_field('hero_eyebrow', $post_id, false),
            'heroHeading' => (string) get_field('hero_heading', $post_id, false),
            'heroSummary' => (string) get_field('hero_summary', $post_id, false),
            'heroImage' => tio2_preview_homepage_image(get_field('hero_image', $post_id, false)),
            'heroImageAlt' => (string) get_field('hero_image_alt', $post_id, false),
            'closingHeading' => (string) get_field('closing_heading', $post_id, false),
            'closingBody' => (string) get_field('closing_body', $post_id, false),
            'closingLabel' => (string) get_field('closing_label', $post_id, false),
            'seoTitle' => (string) get_field('seo_title', $post_id, false),
            'seoDescription' => (string) get_field('seo_description', $post_id, false),
            'ogImage' => tio2_preview_homepage_image(get_field('og_image', $post_id, false)),
            'primaryTopic' => (string) get_field('primary_topic', $post_id, false),
            'secondaryTopics' => $secondary_topics,
        ],
        'editorialGeoFields' => [
            'headerRfqLabel' => (string) get_field('header_rfq_label', $post_id, false),
            'directAnswerQuestion' => (string) get_field('direct_answer_question', $post_id, false),
            'directAnswerLead' => (string) get_field('direct_answer_lead', $post_id, false),
            'directAnswerBody' => (string) get_field('direct_answer_body', $post_id, false),
            'decisionQuestions' => array_map(static fn (array $row): array => [
                'decisionNumber' => (string) ($row['decision_number'] ?? ''),
                'decisionQuestion' => (string) ($row['decision_question'] ?? ''),
                'decisionAnswer' => (string) ($row['decision_answer'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('decision_questions', $post_id, false))),
            'applicationBriefs' => array_map(static fn (array $row): array => [
                'applicationName' => (string) ($row['application_name'] ?? ''),
                'applicationSummary' => (string) ($row['application_summary'] ?? ''),
                'applicationConsiderations' => (string) ($row['application_considerations'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('application_briefs', $post_id, false))),
            'supplyRoutes' => array_map(static fn (array $row): array => [
                'routeName' => (string) ($row['route_name'] ?? ''),
                'routeMeaning' => (string) ($row['route_meaning'] ?? ''),
                'buyerVerification' => (string) ($row['buyer_verification'] ?? ''),
                'documentationContext' => (string) ($row['documentation_context'] ?? ''),
                'claimBasis' => (string) ($row['claim_basis'] ?? ''),
                'evidenceUrl' => (string) ($row['evidence_url'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('supply_routes', $post_id, false))),
            'evidenceItems' => array_map(static fn (array $row): array => [
                'documentType' => (string) ($row['document_type'] ?? ''),
                'documentTitle' => (string) ($row['document_title'] ?? ''),
                'documentSummary' => (string) ($row['document_summary'] ?? ''),
                'applicability' => (string) ($row['applicability'] ?? ''),
                'revisionLabel' => (string) ($row['revision_label'] ?? ''),
                'evidenceUrl' => (string) ($row['evidence_url'] ?? ''),
                'verificationStatus' => (string) ($row['verification_status'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('evidence_items', $post_id, false))),
            'evaluationSteps' => array_map(static fn (array $row): array => [
                'methodNumber' => (string) ($row['method_number'] ?? ''),
                'methodTitle' => (string) ($row['method_title'] ?? ''),
                'methodDescription' => (string) ($row['method_description'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('evaluation_steps', $post_id, false))),
            'geoFaqs' => array_map(static fn (array $row): array => [
                'faqQuestion' => (string) ($row['faq_question'] ?? ''),
                'faqAnswer' => (string) ($row['faq_answer'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('geo_faqs', $post_id, false))),
            'glossaryItems' => array_map(static fn (array $row): array => [
                'term' => (string) ($row['term'] ?? ''),
                'definition' => (string) ($row['definition'] ?? ''),
            ], tio2_homepage_v02_preview_rows(get_field('glossary_items', $post_id, false))),
            'editorialReviewedAt' => (string) get_field('editorial_reviewed_at', $post_id, false),
            'editorialReviewedBy' => (string) get_field('editorial_reviewed_by', $post_id, false),
            'editorialReviewScope' => (string) get_field('editorial_review_scope', $post_id, false),
        ],
    ];
}

/**
 * @return list<string>
 */
function tio2_homepage_v02_meta_keys(): array
{
    $keys = [
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
    foreach ([
        'decision_questions' => [12, ['decision_number', 'decision_question', 'decision_answer']],
        'application_briefs' => [12, ['application_name', 'application_summary', 'application_considerations']],
        'supply_routes' => [6, ['route_name', 'route_meaning', 'buyer_verification', 'documentation_context', 'claim_basis', 'evidence_url']],
        'evidence_items' => [12, ['document_type', 'document_title', 'document_summary', 'applicability', 'revision_label', 'evidence_url', 'verification_status']],
        'evaluation_steps' => [10, ['method_number', 'method_title', 'method_description']],
        'geo_faqs' => [20, ['faq_question', 'faq_answer']],
        'glossary_items' => [30, ['term', 'definition']],
    ] as $repeater => [$max_rows, $sub_fields]) {
        foreach (range(0, $max_rows - 1) as $row_index) {
            foreach ($sub_fields as $sub_field) {
                $keys[] = "{$repeater}_{$row_index}_{$sub_field}";
            }
        }
    }

    return $keys;
}

/**
 * @param mixed $value
 * @return list<array<string, mixed>>|WP_Error
 */
function tio2_homepage_v02_validate_rows($value, string $field_name, int $min, int $max)
{
    if (false === $value || null === $value || '' === $value) {
        $value = [];
    }
    if (! is_array($value)) {
        return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$field_name} must be a repeater.");
    }
    $rows = array_values($value);
    if (count($rows) < $min || count($rows) > $max) {
        return new WP_Error('tio2_homepage_invalid_rows', "Homepage field {$field_name} has the wrong number of rows.");
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
 * @return string|WP_Error
 */
function tio2_homepage_v02_validate_https_url($value, string $field_name, bool $required)
{
    $url = tio2_homepage_validate_string($value, $field_name, false);
    if (is_wp_error($url)) {
        return new WP_Error('tio2_homepage_invalid_evidence', "Homepage field {$field_name} must be plain text.");
    }
    if ('' === $url) {
        if ($required) {
            return new WP_Error('tio2_homepage_invalid_evidence', "Homepage field {$field_name} requires evidence.");
        }
        return $url;
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
        return new WP_Error('tio2_homepage_invalid_evidence', "Homepage field {$field_name} requires an HTTPS URL.");
    }
    return $url;
}

/**
 * @param mixed $value
 * @return true|WP_Error
 */
function tio2_homepage_v02_validate_image_dimensions($value, string $field_name)
{
    $attachment_id = is_array($value)
        ? (int) ($value['ID'] ?? $value['id'] ?? 0)
        : (int) $value;
    if ($attachment_id <= 0) {
        return true;
    }

    $metadata = wp_get_attachment_metadata($attachment_id);
    if (! is_array($metadata)) {
        return new WP_Error(
            'tio2_homepage_invalid_field',
            "Homepage field {$field_name} requires positive image dimensions."
        );
    }
    foreach (['width', 'height'] as $dimension_name) {
        $dimension = filter_var($metadata[$dimension_name] ?? null, FILTER_VALIDATE_INT);
        if (false === $dimension || $dimension <= 0) {
            return new WP_Error(
                'tio2_homepage_invalid_field',
                "Homepage field {$field_name} requires positive image dimensions."
            );
        }
    }

    return true;
}

/**
 * @param array<string, mixed> $row
 * @param array<string, array{0: bool, 1: int|null}> $fields
 * @return true|WP_Error
 */
function tio2_homepage_v02_validate_row_strings(array $row, array $fields)
{
    foreach ($fields as $field_name => [$required, $maxlength]) {
        $valid = tio2_homepage_validate_string($row[$field_name] ?? null, $field_name, $required, $maxlength);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }
    return true;
}

/**
 * @return true|WP_Error
 */
function tio2_validate_homepage_v02_contract(int $post_id)
{
    foreach ([
        'hero_eyebrow' => [true, 80],
        'hero_heading' => [true, 90],
        'hero_summary' => [true, 320],
        'header_rfq_label' => [true, 32],
        'direct_answer_question' => [true, null],
        'direct_answer_lead' => [true, null],
        'direct_answer_body' => [true, null],
        'closing_heading' => [true, 90],
        'closing_body' => [true, 220],
        'closing_label' => [true, 32],
        'seo_title' => [true, 60],
        'seo_description' => [true, 160],
        'primary_topic' => [true, 80],
    ] as $field_name => [$required, $maxlength]) {
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

    $hero_image_value = get_field('hero_image', $post_id, false);
    $hero_image = tio2_homepage_validate_image(
        $hero_image_value,
        'hero_image',
        get_field('hero_image_alt', $post_id, false)
    );
    if (is_wp_error($hero_image)) {
        return $hero_image;
    }
    $hero_image_dimensions = tio2_homepage_v02_validate_image_dimensions(
        $hero_image_value,
        'hero_image'
    );
    if (is_wp_error($hero_image_dimensions)) {
        return $hero_image_dimensions;
    }
    if (false !== $hero_image_value && null !== $hero_image_value && '' !== $hero_image_value && 0 !== (int) $hero_image_value) {
        $hero_alt = tio2_homepage_validate_string(
            get_field('hero_image_alt', $post_id, false),
            'hero_image_alt',
            true,
            160
        );
        if (is_wp_error($hero_alt)) {
            return $hero_alt;
        }
    }
    $og_image = tio2_homepage_validate_image(get_field('og_image', $post_id, false), 'og_image', '');
    if (is_wp_error($og_image)) {
        return $og_image;
    }
    $og_image_dimensions = tio2_homepage_v02_validate_image_dimensions(
        get_field('og_image', $post_id, false),
        'og_image'
    );
    if (is_wp_error($og_image_dimensions)) {
        return $og_image_dimensions;
    }

    $decision_questions = tio2_homepage_v02_validate_rows(
        get_field('decision_questions', $post_id, false),
        'decision_questions',
        1,
        12
    );
    if (is_wp_error($decision_questions)) {
        return $decision_questions;
    }
    foreach ($decision_questions as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'decision_number' => [true, null],
            'decision_question' => [true, null],
            'decision_answer' => [true, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    $application_briefs = tio2_homepage_v02_validate_rows(
        get_field('application_briefs', $post_id, false),
        'application_briefs',
        1,
        12
    );
    if (is_wp_error($application_briefs)) {
        return $application_briefs;
    }
    foreach ($application_briefs as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'application_name' => [true, null],
            'application_summary' => [true, null],
            'application_considerations' => [true, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    $supply_routes = tio2_homepage_v02_validate_rows(
        get_field('supply_routes', $post_id, false),
        'supply_routes',
        1,
        6
    );
    if (is_wp_error($supply_routes)) {
        return $supply_routes;
    }
    foreach ($supply_routes as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'route_name' => [true, null],
            'route_meaning' => [true, null],
            'buyer_verification' => [true, null],
            'documentation_context' => [true, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
        $basis = tio2_homepage_validate_string($row['claim_basis'] ?? null, 'claim_basis', true);
        if (is_wp_error($basis) || ! in_array($basis, ['synthetic_demo', 'user_confirmed', 'source_document'], true)) {
            return new WP_Error('tio2_homepage_invalid_evidence', 'Homepage supply route has an invalid claim basis.');
        }
        $evidence_url = tio2_homepage_v02_validate_https_url(
            $row['evidence_url'] ?? null,
            'supply_route_evidence_url',
            'source_document' === $basis
        );
        if (is_wp_error($evidence_url)) {
            return $evidence_url;
        }
    }

    $evidence_items = tio2_homepage_v02_validate_rows(
        get_field('evidence_items', $post_id, false),
        'evidence_items',
        0,
        12
    );
    if (is_wp_error($evidence_items)) {
        return $evidence_items;
    }
    foreach ($evidence_items as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'document_type' => [true, null],
            'document_title' => [true, null],
            'document_summary' => [true, null],
            'applicability' => [true, null],
            'revision_label' => [false, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
        $status = tio2_homepage_validate_string($row['verification_status'] ?? null, 'verification_status', true);
        if (is_wp_error($status) || ! in_array($status, ['demo', 'needs_review', 'verified'], true)) {
            return new WP_Error('tio2_homepage_invalid_evidence', 'Homepage evidence item has an invalid verification status.');
        }
        $evidence_url = tio2_homepage_v02_validate_https_url(
            $row['evidence_url'] ?? null,
            'evidence_item_evidence_url',
            'verified' === $status
        );
        if (is_wp_error($evidence_url)) {
            return $evidence_url;
        }
        if ('verified' === $status) {
            foreach (['editorial_reviewed_at', 'editorial_reviewed_by', 'editorial_review_scope'] as $field_name) {
                $review_value = tio2_homepage_validate_string(
                    get_field($field_name, $post_id, false),
                    $field_name,
                    true
                );
                if (is_wp_error($review_value)) {
                    return new WP_Error(
                        'tio2_homepage_invalid_evidence',
                        'Verified Homepage evidence requires complete editorial review metadata.'
                    );
                }
            }
        }
    }

    $evaluation_steps = tio2_homepage_v02_validate_rows(
        get_field('evaluation_steps', $post_id, false),
        'evaluation_steps',
        1,
        10
    );
    if (is_wp_error($evaluation_steps)) {
        return $evaluation_steps;
    }
    foreach ($evaluation_steps as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'method_number' => [true, null],
            'method_title' => [true, null],
            'method_description' => [true, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    $faqs = tio2_homepage_v02_validate_rows(get_field('geo_faqs', $post_id, false), 'geo_faqs', 3, 20);
    if (is_wp_error($faqs)) {
        return $faqs;
    }
    $faq_questions = [];
    foreach ($faqs as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'faq_question' => [true, 160],
            'faq_answer' => [true, 600],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
        $faq_questions[] = trim((string) $row['faq_question']);
    }
    if (tio2_homepage_has_duplicates($faq_questions)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage GEO FAQ questions must be unique.');
    }

    $glossary_items = tio2_homepage_v02_validate_rows(
        get_field('glossary_items', $post_id, false),
        'glossary_items',
        0,
        30
    );
    if (is_wp_error($glossary_items)) {
        return $glossary_items;
    }
    $glossary_terms = [];
    foreach ($glossary_items as $row) {
        $valid = tio2_homepage_v02_validate_row_strings($row, [
            'term' => [true, null],
            'definition' => [true, null],
        ]);
        if (is_wp_error($valid)) {
            return $valid;
        }
        $glossary_terms[] = trim((string) $row['term']);
    }
    if (tio2_homepage_has_duplicates($glossary_terms)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage glossary terms must be unique.');
    }

    $secondary_topics = tio2_homepage_v02_validate_rows(
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
        $topic = tio2_homepage_validate_string($row['secondary_topic'] ?? null, 'secondary_topic', true, 80);
        if (is_wp_error($topic)) {
            return $topic;
        }
        $topic_values[] = $topic;
    }
    if (tio2_homepage_has_duplicates($topic_values)) {
        return new WP_Error('tio2_homepage_invalid_field', 'Homepage secondary topics must be unique.');
    }

    $reviewed_at = tio2_homepage_validate_string(
        get_field('editorial_reviewed_at', $post_id, false),
        'editorial_reviewed_at',
        true,
        24
    );
    if (is_wp_error($reviewed_at)) {
        return $reviewed_at;
    }
    $reviewed_date = DateTimeImmutable::createFromFormat(
        '!Y-m-d\TH:i:s.v\Z',
        $reviewed_at,
        new DateTimeZone('UTC')
    );
    if (
        1 !== preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/D', $reviewed_at) ||
        false === $reviewed_date ||
        $reviewed_at !== $reviewed_date->format('Y-m-d\TH:i:s.v\Z')
    ) {
        return new WP_Error(
            'tio2_homepage_invalid_field',
            'Homepage field editorial_reviewed_at must be a normalized UTC instant.'
        );
    }
    foreach (['editorial_reviewed_by', 'editorial_review_scope'] as $field_name) {
        $valid = tio2_homepage_validate_string(get_field($field_name, $post_id, false), $field_name, true);
        if (is_wp_error($valid)) {
            return $valid;
        }
    }

    return true;
}
