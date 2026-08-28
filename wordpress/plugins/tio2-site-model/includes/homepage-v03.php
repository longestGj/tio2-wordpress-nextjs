<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_homepage_v03_field_definitions(): array
{
    $text = static fn (string $key, string $name, bool $textarea = false, ?int $maxlength = null): array =>
        tio2_homepage_text_field($key, $name, true, $maxlength, $textarea ? 'textarea' : 'text');
    $item_rows = static fn (string $key, string $name, int $count): array =>
        tio2_homepage_repeater_field($key, $name, true, $count, $count, [
            tio2_homepage_text_field($key . '_title', 'item_title', true, 120),
            tio2_homepage_text_field($key . '_description', 'item_description', true, 800, 'textarea'),
        ]);

    $fields = [
        $text('field_tio2_brand_hero_primary', 'brand_hero_primary_label', false, 50),
        $text('field_tio2_brand_hero_secondary', 'brand_hero_secondary_label', false, 50),
        $text('field_tio2_brand_about_eyebrow', 'brand_about_eyebrow', false, 100),
        $text('field_tio2_brand_about_heading', 'brand_about_heading', false, 140),
        $text('field_tio2_brand_who_title', 'brand_who_title', false, 80),
        $text('field_tio2_brand_who_body', 'brand_who_body', true, 800),
        $text('field_tio2_brand_what_title', 'brand_what_title', false, 80),
        $text('field_tio2_brand_what_body', 'brand_what_body', true, 800),
        tio2_homepage_repeater_field('field_tio2_brand_capabilities', 'brand_capabilities', true, 4, 4, [
            tio2_homepage_text_field('field_tio2_brand_capability', 'capability', true, 100),
        ]),
        tio2_homepage_repeater_field('field_tio2_brand_metrics', 'brand_metrics', true, 3, 3, [
            tio2_homepage_text_field('field_tio2_brand_metric_value', 'metric_value', true, 20),
            tio2_homepage_text_field('field_tio2_brand_metric_label', 'metric_label', true, 100),
        ]),
        $text('field_tio2_brand_routes_eyebrow', 'brand_routes_eyebrow', false, 100),
        $text('field_tio2_brand_routes_heading', 'brand_routes_heading', false, 160),
        tio2_homepage_repeater_field('field_tio2_brand_buyer_routes', 'brand_buyer_routes', true, 3, 3, [
            tio2_homepage_text_field('field_tio2_brand_route_title', 'route_title', true, 120),
            tio2_homepage_text_field('field_tio2_brand_route_description', 'route_description', true, 800, 'textarea'),
            tio2_homepage_text_field('field_tio2_brand_route_cta', 'route_cta_label', true, 80),
        ]),
        $text('field_tio2_brand_applications_eyebrow', 'brand_applications_eyebrow', false, 100),
        $text('field_tio2_brand_applications_heading', 'brand_applications_heading', false, 160),
        $text('field_tio2_brand_applications_intro', 'brand_applications_intro', true, 800),
        $item_rows('field_tio2_brand_applications', 'brand_applications', 6),
        $text('field_tio2_brand_families_eyebrow', 'brand_families_eyebrow', false, 100),
        $text('field_tio2_brand_families_heading', 'brand_families_heading', false, 160),
        $text('field_tio2_brand_families_intro', 'brand_families_intro', true, 800),
        $item_rows('field_tio2_brand_families', 'brand_product_families', 8),
        $text('field_tio2_brand_selection_eyebrow', 'brand_selection_eyebrow', false, 100),
        $text('field_tio2_brand_selection_heading', 'brand_selection_heading', false, 160),
        $text('field_tio2_brand_selection_intro', 'brand_selection_intro', true, 800),
        $item_rows('field_tio2_brand_selection_factors', 'brand_selection_factors', 4),
        $text('field_tio2_brand_resources_eyebrow', 'brand_resources_eyebrow', false, 100),
        $text('field_tio2_brand_resources_heading', 'brand_resources_heading', false, 160),
        tio2_homepage_repeater_field('field_tio2_brand_resources', 'brand_technical_resources', true, 4, 4, [
            tio2_homepage_text_field('field_tio2_brand_resource_tag', 'resource_tag', true, 50),
            tio2_homepage_text_field('field_tio2_brand_resource_title', 'resource_title', true, 120),
            tio2_homepage_text_field('field_tio2_brand_resource_description', 'resource_description', true, 800, 'textarea'),
        ]),
        $text('field_tio2_brand_process_eyebrow', 'brand_process_eyebrow', false, 100),
        $text('field_tio2_brand_process_heading', 'brand_process_heading', false, 160),
        $item_rows('field_tio2_brand_evaluation_steps', 'brand_evaluation_steps', 5),
        $text('field_tio2_brand_documents_eyebrow', 'brand_documents_eyebrow', false, 100),
        $text('field_tio2_brand_documents_heading', 'brand_documents_heading', false, 160),
        $text('field_tio2_brand_documents_intro', 'brand_documents_intro', true, 800),
        tio2_homepage_repeater_field('field_tio2_brand_documents', 'brand_controlled_documents', true, 4, 4, [
            tio2_homepage_text_field('field_tio2_brand_document_title', 'document_title', true, 120),
            tio2_homepage_text_field('field_tio2_brand_document_context', 'document_context', true, 160),
            [
                'key' => 'field_tio2_brand_document_access',
                'name' => 'document_access',
                'label' => 'Document Access',
                'type' => 'select',
                'required' => 1,
                'choices' => ['Request' => 'Request'],
                'return_format' => 'value',
                'show_in_graphql' => 1,
            ],
        ]),
        $text('field_tio2_brand_inquiry_eyebrow', 'brand_inquiry_eyebrow', false, 100),
        $text('field_tio2_brand_inquiry_heading', 'brand_inquiry_heading', false, 160),
        $text('field_tio2_brand_inquiry_intro', 'brand_inquiry_intro', true, 800),
        tio2_homepage_repeater_field('field_tio2_brand_inquiry_fields', 'brand_inquiry_fields', true, 6, 6, [
            tio2_homepage_text_field('field_tio2_brand_inquiry_field_label', 'field_label', true, 80),
        ]),
        $text('field_tio2_brand_inquiry_message', 'brand_inquiry_message_label', false, 120),
        $text('field_tio2_brand_inquiry_submit', 'brand_inquiry_submit_label', false, 50),
        $text('field_tio2_brand_inquiry_helper', 'brand_inquiry_helper_text', false, 200),
        $text('field_tio2_brand_inquiry_success_heading', 'brand_inquiry_success_heading', false, 100),
        $text('field_tio2_brand_inquiry_success_message', 'brand_inquiry_success_message', true, 300),
        $text('field_tio2_brand_faq_eyebrow', 'brand_faq_eyebrow', false, 100),
        $text('field_tio2_brand_faq_heading', 'brand_faq_heading', false, 160),
        tio2_homepage_repeater_field('field_tio2_brand_faqs', 'brand_faqs', true, 4, 4, [
            tio2_homepage_text_field('field_tio2_brand_faq_question', 'faq_question', true, 180),
            tio2_homepage_text_field('field_tio2_brand_faq_answer', 'faq_answer', true, 800, 'textarea'),
        ]),
        $text('field_tio2_brand_footer_description', 'brand_footer_description', true, 400),
    ];

    $condition = [[[
        'field' => 'field_tio2_home_schema_version',
        'operator' => '==',
        'value' => 'homepage-v0.3-brand',
    ]]];
    foreach ($fields as &$field) {
        $field['conditional_logic'] = $condition;
    }
    unset($field);

    return $fields;
}

function tio2_register_homepage_v03_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }
    acf_add_local_field_group([
        'key' => 'group_tio2_homepage_brand',
        'title' => 'TIOVAR Homepage Brand Fields',
        'fields' => tio2_homepage_v03_field_definitions(),
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'tio2_homepage']]],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'brandHomepageFields',
    ]);
}

/** @return true|WP_Error */
function tio2_validate_homepage_v03_contract(int $post_id)
{
    $strings = [
        'hero_eyebrow' => 100, 'hero_heading' => 100, 'hero_summary' => 800,
        'seo_title' => 60, 'seo_description' => 160, 'primary_topic' => 80,
        'brand_hero_primary_label' => 50, 'brand_hero_secondary_label' => 50,
        'brand_about_eyebrow' => 100, 'brand_about_heading' => 140,
        'brand_who_title' => 80, 'brand_who_body' => 800,
        'brand_what_title' => 80, 'brand_what_body' => 800,
        'brand_routes_eyebrow' => 100, 'brand_routes_heading' => 160,
        'brand_applications_eyebrow' => 100, 'brand_applications_heading' => 160,
        'brand_applications_intro' => 800, 'brand_families_eyebrow' => 100,
        'brand_families_heading' => 160, 'brand_families_intro' => 800,
        'brand_selection_eyebrow' => 100, 'brand_selection_heading' => 160,
        'brand_selection_intro' => 800, 'brand_resources_eyebrow' => 100,
        'brand_resources_heading' => 160, 'brand_process_eyebrow' => 100,
        'brand_process_heading' => 160, 'brand_documents_eyebrow' => 100,
        'brand_documents_heading' => 160, 'brand_documents_intro' => 800,
        'brand_inquiry_eyebrow' => 100, 'brand_inquiry_heading' => 160,
        'brand_inquiry_intro' => 800, 'brand_inquiry_message_label' => 120,
        'brand_inquiry_submit_label' => 50, 'brand_inquiry_helper_text' => 200,
        'brand_inquiry_success_heading' => 100, 'brand_inquiry_success_message' => 300,
        'brand_faq_eyebrow' => 100, 'brand_faq_heading' => 160,
        'brand_footer_description' => 400,
    ];
    foreach ($strings as $name => $maxlength) {
        $valid = tio2_homepage_validate_string(get_field($name, $post_id, false), $name, true, $maxlength);
        if (is_wp_error($valid)) return $valid;
    }

    $repeaters = [
        'brand_capabilities' => 4, 'brand_metrics' => 3, 'brand_buyer_routes' => 3,
        'brand_applications' => 6, 'brand_product_families' => 8,
        'brand_selection_factors' => 4, 'brand_technical_resources' => 4,
        'brand_evaluation_steps' => 5, 'brand_controlled_documents' => 4,
        'brand_inquiry_fields' => 6, 'brand_faqs' => 4,
    ];
    foreach ($repeaters as $name => $count) {
        $rows = get_field($name, $post_id, false);
        if (! is_array($rows) || $count !== count($rows)) {
            return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$name} requires exactly {$count} rows.");
        }
        foreach ($rows as $row) {
            if (! is_array($row)) return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$name} contains an invalid row.");
            foreach ($row as $value) {
                if (! is_scalar($value) || is_wp_error(tio2_homepage_validate_string((string) $value, $name, true, 1200))) {
                    return new WP_Error('tio2_homepage_invalid_field', "Homepage field {$name} contains invalid text.");
                }
            }
        }
    }
    foreach ((array) get_field('brand_controlled_documents', $post_id, false) as $row) {
        if (($row['document_access'] ?? null) !== 'Request') {
            return new WP_Error('tio2_homepage_invalid_field', 'Controlled documents must use request-only access.');
        }
    }
    return true;
}

/** @return array<string, mixed> */
function tio2_serialize_homepage_v03_preview(WP_Post $post, string $site_id): array
{
    $post_id = (int) $post->ID;
    $payload = tio2_serialize_homepage_preview($post, $site_id);
    $camel = static fn (string $value): string => lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $value))));
    $fields = [];
    foreach (tio2_homepage_v03_field_definitions() as $definition) {
        $name = (string) ($definition['name'] ?? '');
        $value = get_field($name, $post_id, false);
        $key = $camel((string) preg_replace('/^brand_/', '', $name));
        if ('repeater' === ($definition['type'] ?? null)) {
            $rows = [];
            foreach (tio2_homepage_v02_preview_rows($value) as $row) {
                $normalized = [];
                foreach ($row as $row_name => $row_value) $normalized[$camel((string) $row_name)] = (string) $row_value;
                $rows[] = $normalized;
            }
            $fields[$key] = $rows;
        } else {
            $fields[$key] = (string) $value;
        }
    }
    $payload['brandHomepageFields'] = $fields;
    return $payload;
}
