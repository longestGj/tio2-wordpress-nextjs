<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_product_field_definitions(): array
{
    return [
        [
            'key' => 'field_tio2_product_id',
            'label' => 'Product ID',
            'name' => 'product_id',
            'type' => 'text',
            'required' => 1,
            'maxlength' => 10,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_family',
            'label' => 'Product Family',
            'name' => 'family',
            'type' => 'taxonomy',
            'taxonomy' => 'product_family',
            'field_type' => 'select',
            'return_format' => 'id',
            'add_term' => 0,
            'save_terms' => 0,
            'load_terms' => 0,
            'required' => 1,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_meta_title',
            'label' => 'Meta Title',
            'name' => 'meta_title',
            'type' => 'text',
            'required' => 1,
            'maxlength' => 60,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_meta_description',
            'label' => 'Meta Description',
            'name' => 'meta_description',
            'type' => 'textarea',
            'required' => 1,
            'rows' => 3,
            'maxlength' => 160,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_eyebrow',
            'label' => 'Eyebrow',
            'name' => 'eyebrow',
            'type' => 'text',
            'required' => 1,
            'maxlength' => 80,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_customer_problem_headline',
            'label' => 'Customer Problem Headline',
            'name' => 'customer_problem_headline',
            'type' => 'textarea',
            'required' => 1,
            'rows' => 2,
            'maxlength' => 180,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_quick_answer',
            'label' => 'Quick Answer',
            'name' => 'quick_answer',
            'type' => 'wysiwyg',
            'required' => 1,
            'tabs' => 'visual',
            'toolbar' => 'basic',
            'media_upload' => 0,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_type',
            'label' => 'Product Type',
            'name' => 'product_type',
            'type' => 'text',
            'required' => 1,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_process',
            'label' => 'Process',
            'name' => 'process',
            'type' => 'text',
            'required' => 0,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_primary_application',
            'label' => 'Primary Application',
            'name' => 'primary_application',
            'type' => 'text',
            'required' => 1,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_positioning',
            'label' => 'Positioning',
            'name' => 'positioning',
            'type' => 'text',
            'required' => 0,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_surface_treatment',
            'label' => 'Surface Treatment',
            'name' => 'surface_treatment',
            'type' => 'text',
            'required' => 0,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_packaging',
            'label' => 'Packaging',
            'name' => 'packaging',
            'type' => 'textarea',
            'required' => 1,
            'rows' => 3,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_tds_access',
            'label' => 'TDS Access',
            'name' => 'tds_access',
            'type' => 'textarea',
            'required' => 1,
            'rows' => 3,
            'instructions' => 'Describe request-only access. Do not enter a document URL.',
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_fit_when',
            'label' => 'Fits When',
            'name' => 'fit_when',
            'type' => 'repeater',
            'required' => 1,
            'min' => 3,
            'max' => 5,
            'layout' => 'row',
            'button_label' => 'Add selection fit',
            'show_in_graphql' => 1,
            'sub_fields' => [[
                'key' => 'field_tio2_product_fit_when_item',
                'label' => 'Item',
                'name' => 'item',
                'type' => 'textarea',
                'required' => 1,
                'rows' => 2,
                'show_in_graphql' => 1,
            ]],
        ],
        [
            'key' => 'field_tio2_product_discuss_first_when',
            'label' => 'Discuss First When',
            'name' => 'discuss_first_when',
            'type' => 'repeater',
            'required' => 1,
            'min' => 1,
            'max' => 5,
            'layout' => 'row',
            'button_label' => 'Add discussion point',
            'show_in_graphql' => 1,
            'sub_fields' => [[
                'key' => 'field_tio2_product_discuss_first_when_item',
                'label' => 'Item',
                'name' => 'item',
                'type' => 'textarea',
                'required' => 1,
                'rows' => 2,
                'show_in_graphql' => 1,
            ]],
        ],
        [
            'key' => 'field_tio2_product_performance_priorities',
            'label' => 'Performance Priorities',
            'name' => 'performance_priorities',
            'type' => 'repeater',
            'required' => 1,
            'min' => 3,
            'max' => 6,
            'layout' => 'row',
            'button_label' => 'Add performance priority',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_performance_priority_title',
                    'label' => 'Title',
                    'name' => 'title',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_performance_priority_explanation',
                    'label' => 'Explanation',
                    'name' => 'explanation',
                    'type' => 'textarea',
                    'required' => 1,
                    'rows' => 2,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_recommended_applications',
            'label' => 'Recommended Applications',
            'name' => 'recommended_applications',
            'type' => 'relationship',
            'required' => 1,
            'post_type' => ['tio2_application'],
            'filters' => ['search'],
            'return_format' => 'id',
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_evidence_statement',
            'label' => 'Product Evidence',
            'name' => 'evidence_statement',
            'type' => 'wysiwyg',
            'required' => 1,
            'tabs' => 'visual',
            'toolbar' => 'basic',
            'media_upload' => 0,
            'show_in_graphql' => 1,
        ],
        [
            'key' => 'field_tio2_product_typical_properties',
            'label' => 'Typical Properties',
            'name' => 'typical_properties',
            'type' => 'repeater',
            'required' => 1,
            'min' => 1,
            'max' => 0,
            'layout' => 'table',
            'button_label' => 'Add typical property',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_property_name',
                    'label' => 'Property',
                    'name' => 'property',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_property_value',
                    'label' => 'Value',
                    'name' => 'value',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_property_unit',
                    'label' => 'Unit',
                    'name' => 'unit',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_property_method',
                    'label' => 'Method',
                    'name' => 'method',
                    'type' => 'text',
                    'required' => 0,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_property_note',
                    'label' => 'Note',
                    'name' => 'note',
                    'type' => 'text',
                    'required' => 0,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_property_display_order',
                    'label' => 'Display Order',
                    'name' => 'display_order',
                    'type' => 'number',
                    'required' => 1,
                    'min' => 1,
                    'step' => 1,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_validation_checklist',
            'label' => 'Validation Checklist',
            'name' => 'validation_checklist',
            'type' => 'repeater',
            'required' => 0,
            'min' => 0,
            'max' => 0,
            'layout' => 'row',
            'button_label' => 'Add validation item',
            'show_in_graphql' => 1,
            'sub_fields' => [[
                'key' => 'field_tio2_product_validation_checklist_item',
                'label' => 'Item',
                'name' => 'item',
                'type' => 'textarea',
                'required' => 1,
                'rows' => 2,
                'show_in_graphql' => 1,
            ]],
        ],
        [
            'key' => 'field_tio2_product_faq_items',
            'label' => 'FAQ Items',
            'name' => 'faq_items',
            'type' => 'repeater',
            'required' => 1,
            'min' => 6,
            'max' => 10,
            'layout' => 'row',
            'button_label' => 'Add FAQ',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_faq_question',
                    'label' => 'Question',
                    'name' => 'question',
                    'type' => 'text',
                    'required' => 1,
                    'maxlength' => 180,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_faq_answer',
                    'label' => 'Answer',
                    'name' => 'answer',
                    'type' => 'wysiwyg',
                    'required' => 1,
                    'tabs' => 'visual',
                    'toolbar' => 'basic',
                    'media_upload' => 0,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_related_links',
            'label' => 'Related Links',
            'name' => 'related_links',
            'type' => 'group',
            'required' => 0,
            'layout' => 'block',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_related_applications',
                    'label' => 'Applications',
                    'name' => 'applications',
                    'type' => 'relationship',
                    'post_type' => ['tio2_application'],
                    'filters' => ['search'],
                    'return_format' => 'id',
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_related_resources',
                    'label' => 'Resources',
                    'name' => 'resources',
                    'type' => 'relationship',
                    'post_type' => ['tio2_document'],
                    'filters' => ['search'],
                    'return_format' => 'id',
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_related_products',
                    'label' => 'Products',
                    'name' => 'products',
                    'type' => 'relationship',
                    'post_type' => ['tio2_product'],
                    'filters' => ['search'],
                    'return_format' => 'id',
                    'show_in_graphql' => 1,
                ],
            ],
        ],
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_product_shared_field_definitions(): array
{
    return [
        [
            'key' => 'field_tio2_product_inquiry_fields',
            'label' => 'Inquiry Fields',
            'name' => 'inquiry_fields',
            'type' => 'repeater',
            'required' => 1,
            'min' => 1,
            'max' => 0,
            'layout' => 'table',
            'button_label' => 'Add inquiry field',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_inquiry_field_key',
                    'label' => 'Key',
                    'name' => 'key',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_inquiry_field_label',
                    'label' => 'Label',
                    'name' => 'label',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_inquiry_field_guidance',
                    'label' => 'Guidance',
                    'name' => 'guidance',
                    'type' => 'textarea',
                    'required' => 1,
                    'rows' => 2,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_request_tds_cta',
            'label' => 'Request TDS CTA',
            'name' => 'request_tds_cta',
            'type' => 'group',
            'required' => 1,
            'layout' => 'block',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_request_tds_cta_label',
                    'label' => 'Label',
                    'name' => 'label',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_request_tds_cta_description',
                    'label' => 'Description',
                    'name' => 'description',
                    'type' => 'textarea',
                    'required' => 1,
                    'rows' => 2,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_discuss_application_cta',
            'label' => 'Discuss Application CTA',
            'name' => 'discuss_application_cta',
            'type' => 'group',
            'required' => 1,
            'layout' => 'block',
            'show_in_graphql' => 1,
            'sub_fields' => [
                [
                    'key' => 'field_tio2_product_discuss_application_cta_label',
                    'label' => 'Label',
                    'name' => 'label',
                    'type' => 'text',
                    'required' => 1,
                    'show_in_graphql' => 1,
                ],
                [
                    'key' => 'field_tio2_product_discuss_application_cta_description',
                    'label' => 'Description',
                    'name' => 'description',
                    'type' => 'textarea',
                    'required' => 1,
                    'rows' => 2,
                    'show_in_graphql' => 1,
                ],
            ],
        ],
        [
            'key' => 'field_tio2_product_technical_disclaimer',
            'label' => 'Technical Disclaimer',
            'name' => 'technical_disclaimer',
            'type' => 'wysiwyg',
            'required' => 1,
            'tabs' => 'visual',
            'toolbar' => 'basic',
            'media_upload' => 0,
            'show_in_graphql' => 1,
        ],
    ];
}

/**
 * @param array<string, mixed> $values
 * @return array{
 *   inquiryFields: list<array{key: string, label: string, guidance: string}>,
 *   requestTdsCta: array{label: string, description: string},
 *   discussApplicationCta: array{label: string, description: string},
 *   technicalDisclaimer: string
 * }
 */
function tio2_normalize_product_shared_settings(array $values): array
{
    $inquiry_fields = [];
    $raw_inquiry_fields = $values['inquiry_fields'] ?? [];
    $raw_inquiry_fields = is_array($raw_inquiry_fields) ? $raw_inquiry_fields : [];
    foreach ($raw_inquiry_fields as $field) {
        if (! is_array($field)) {
            continue;
        }
        $inquiry_fields[] = [
            'key' => is_scalar($field['key'] ?? null) ? trim((string) $field['key']) : '',
            'label' => is_scalar($field['label'] ?? null) ? trim((string) $field['label']) : '',
            'guidance' => is_scalar($field['guidance'] ?? null) ? trim((string) $field['guidance']) : '',
        ];
    }

    $normalize_cta = static function ($value): array {
        $value = is_array($value) ? $value : [];
        return [
            'label' => is_scalar($value['label'] ?? null) ? trim((string) $value['label']) : '',
            'description' => is_scalar($value['description'] ?? null) ? trim((string) $value['description']) : '',
        ];
    };

    return [
        'inquiryFields' => $inquiry_fields,
        'requestTdsCta' => $normalize_cta($values['request_tds_cta'] ?? null),
        'discussApplicationCta' => $normalize_cta($values['discuss_application_cta'] ?? null),
        'technicalDisclaimer' => is_scalar($values['technical_disclaimer'] ?? null)
            ? trim((string) $values['technical_disclaimer'])
            : '',
    ];
}

function tio2_register_product_family_taxonomy(): void
{
    register_taxonomy('product_family', ['tio2_product'], [
        'labels' => [
            'name' => 'Product Families',
            'singular_name' => 'Product Family',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'ProductFamily',
        'graphql_plural_name' => 'ProductFamilies',
        'hierarchical' => true,
        'rewrite' => false,
    ]);
}

function tio2_register_product_settings_page(): void
{
    if (function_exists('acf_add_options_page')) {
        acf_add_options_page([
            'page_title' => 'TiO2 Product Settings',
            'menu_title' => 'Product Settings',
            'menu_slug' => 'tio2-product-settings',
            'capability' => 'manage_options',
            'redirect' => false,
        ]);
        return;
    }

    add_action('admin_menu', 'tio2_register_product_settings_page_fallback');
}

function tio2_register_product_settings_page_fallback(): void
{
    $page_hook = add_options_page(
        'TiO2 Product Settings',
        'Product Settings',
        'manage_options',
        'tio2-product-settings',
        'tio2_render_product_settings_page'
    );

    if (function_exists('acf_form_head')) {
        add_action("load-{$page_hook}", 'acf_form_head');
    }
}

function tio2_render_product_settings_page(): void
{
    if (! current_user_can('manage_options')) {
        wp_die('You are not allowed to manage Product settings.');
    }

    echo '<div class="wrap"><h1>TiO2 Product Settings</h1>';
    if (function_exists('acf_form')) {
        acf_form([
            'post_id' => 'option',
            'field_groups' => ['group_tio2_product_settings_fields'],
            'submit_value' => 'Save Product Settings',
        ]);
    } else {
        echo '<p>Advanced Custom Fields is required to edit Product settings.</p>';
    }
    echo '</div>';
}

function tio2_register_product_acf_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group([
        'key' => 'group_tio2_product_fields',
        'title' => 'TiO2 Product Fields',
        'fields' => tio2_product_field_definitions(),
        'location' => [[[
            'param' => 'post_type',
            'operator' => '==',
            'value' => 'tio2_product',
        ]]],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'productFields',
    ]);

    acf_add_local_field_group([
        'key' => 'group_tio2_product_settings_fields',
        'title' => 'TiO2 Product Settings Fields',
        'fields' => tio2_product_shared_field_definitions(),
        'location' => [[[
            'param' => 'options_page',
            'operator' => '==',
            'value' => 'tio2-product-settings',
        ]]],
        'show_in_graphql' => 1,
        'graphql_field_name' => 'productSettingsFields',
    ]);
}
