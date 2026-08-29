<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return array<string, string>
 */
function tio2_product_collection_coatings_filters(): array
{
    return [
        'all' => 'All directions',
        'water' => 'Water-based',
        'architectural' => 'Architectural',
        'automotive' => 'Automotive & exterior',
        'specialty' => 'Specialty',
    ];
}

/**
 * @return array<string, string>
 */
function tio2_product_collection_filter_choices(): array
{
    return array_merge(tio2_product_collection_coatings_filters(), [
        'application' => 'Application',
        'performance' => 'Performance',
        'surface-treatment' => 'Surface Treatment',
    ]);
}

/**
 * @return array<string, string>
 */
function tio2_product_collection_product_filter_tag_choices(): array
{
    $choices = tio2_product_collection_filter_choices();
    unset($choices['all']);
    return $choices;
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_product_hub_field_definitions(): array
{
    return [
        ['key' => 'field_tio2_products_hub_meta_title', 'label' => 'Meta Title', 'name' => 'metaTitle', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_meta_description', 'label' => 'Meta Description', 'name' => 'metaDescription', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_eyebrow', 'label' => 'Eyebrow', 'name' => 'eyebrow', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_headline', 'label' => 'Headline', 'name' => 'headline', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_direct_answer', 'label' => 'Direct Answer', 'name' => 'directAnswer', 'type' => 'wysiwyg', 'required' => 1, 'tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_hero_image', 'label' => 'Hero Image', 'name' => 'heroImage', 'type' => 'image', 'required' => 1, 'return_format' => 'id', 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_decision_rail', 'label' => 'Decision Rail', 'name' => 'decisionRail', 'type' => 'repeater', 'required' => 1, 'min' => 1, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_products_hub_decision_rail_item', 'label' => 'Item', 'name' => 'item', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1]]],
        ['key' => 'field_tio2_products_hub_families', 'label' => 'Families', 'name' => 'families', 'type' => 'repeater', 'required' => 1, 'min' => 8, 'max' => 8, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_products_hub_families_family', 'label' => 'Family', 'name' => 'family', 'type' => 'taxonomy', 'taxonomy' => 'product_family', 'field_type' => 'select', 'return_format' => 'id', 'required' => 1, 'show_in_graphql' => 1]]],
        ['key' => 'field_tio2_products_hub_known_grade_heading', 'label' => 'Known Grade Heading', 'name' => 'knownGradeHeading', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_known_grade_help', 'label' => 'Known Grade Help', 'name' => 'knownGradeHelp', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_decision_path', 'label' => 'Decision Path', 'name' => 'decisionPath', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_application_boundary', 'label' => 'Application Boundary', 'name' => 'applicationBoundary', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_resources', 'label' => 'Resources', 'name' => 'resources', 'type' => 'relationship', 'required' => 0, 'post_type' => ['tio2_document'], 'filters' => ['search'], 'return_format' => 'id', 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_enquiry', 'label' => 'Enquiry', 'name' => 'enquiry', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_products_hub_faq_items', 'label' => 'FAQ Items', 'name' => 'faqItems', 'type' => 'repeater', 'required' => 1, 'min' => 4, 'max' => 10, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_products_hub_faq_items_question', 'label' => 'Question', 'name' => 'question', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1], ['key' => 'field_tio2_products_hub_faq_items_answer', 'label' => 'Answer', 'name' => 'answer', 'type' => 'wysiwyg', 'required' => 1, 'tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0, 'show_in_graphql' => 1]]],
        ['key' => 'field_tio2_products_hub_technical_disclaimer', 'label' => 'Technical Disclaimer', 'name' => 'technicalDisclaimer', 'type' => 'wysiwyg', 'required' => 1, 'tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0, 'show_in_graphql' => 1],
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_product_family_field_definitions(): array
{
    $text = static fn (string $key, string $label, string $name, string $type = 'text'): array => [
        'key' => "field_tio2_product_family_{$key}", 'label' => $label, 'name' => $name,
        'type' => $type, 'required' => 1, 'show_in_graphql' => 1,
    ];
    $fields = [
        $text('meta_title', 'Meta Title', 'metaTitle'),
        $text('meta_description', 'Meta Description', 'metaDescription', 'textarea'),
        $text('eyebrow', 'Eyebrow', 'eyebrow'),
        $text('headline', 'Headline', 'headline', 'textarea'),
        array_merge($text('direct_answer', 'Direct Answer', 'directAnswer', 'wysiwyg'), ['tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0]),
        array_merge($text('hero_image', 'Hero Image', 'heroImage', 'image'), ['return_format' => 'id']),
        ['key' => 'field_tio2_product_family_decision_rail', 'label' => 'Decision Rail', 'name' => 'decisionRail', 'type' => 'repeater', 'required' => 1, 'min' => 1, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_product_family_decision_rail_item', 'label' => 'Item', 'name' => 'item', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1]]],
        ['key' => 'field_tio2_product_family_filters', 'label' => 'Filters', 'name' => 'filters', 'type' => 'repeater', 'required' => 1, 'min' => 1, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_product_family_filters_slug', 'label' => 'Slug', 'name' => 'slug', 'type' => 'select', 'required' => 1, 'choices' => tio2_product_collection_filter_choices(), 'return_format' => 'value', 'show_in_graphql' => 1], ['key' => 'field_tio2_product_family_filters_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1]]],
        $text('comparison_introduction', 'Comparison Introduction', 'comparisonIntroduction', 'textarea'),
        $text('comparison_caption', 'Comparison Caption', 'comparisonCaption', 'textarea'),
        $text('selection_method', 'Selection Method', 'selectionMethod', 'textarea'),
        ['key' => 'field_tio2_product_family_validation_steps', 'label' => 'Validation Steps', 'name' => 'validationSteps', 'type' => 'repeater', 'required' => 1, 'min' => 1, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_product_family_validation_steps_item', 'label' => 'Item', 'name' => 'item', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1]]],
        ['key' => 'field_tio2_product_family_applications', 'label' => 'Applications', 'name' => 'applications', 'type' => 'relationship', 'required' => 0, 'post_type' => ['tio2_application'], 'filters' => ['search'], 'return_format' => 'id', 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_family_resources', 'label' => 'Resources', 'name' => 'resources', 'type' => 'relationship', 'required' => 0, 'post_type' => ['tio2_document'], 'filters' => ['search'], 'return_format' => 'id', 'show_in_graphql' => 1],
        $text('enquiry', 'Enquiry', 'enquiry', 'textarea'),
        ['key' => 'field_tio2_product_family_faq_items', 'label' => 'FAQ Items', 'name' => 'faqItems', 'type' => 'repeater', 'required' => 1, 'min' => 4, 'max' => 10, 'layout' => 'row', 'show_in_graphql' => 1, 'sub_fields' => [['key' => 'field_tio2_product_family_faq_items_question', 'label' => 'Question', 'name' => 'question', 'type' => 'text', 'required' => 1, 'show_in_graphql' => 1], ['key' => 'field_tio2_product_family_faq_items_answer', 'label' => 'Answer', 'name' => 'answer', 'type' => 'wysiwyg', 'required' => 1, 'tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0, 'show_in_graphql' => 1]]],
        array_merge($text('technical_disclaimer', 'Technical Disclaimer', 'technicalDisclaimer', 'wysiwyg'), ['tabs' => 'visual', 'toolbar' => 'basic', 'media_upload' => 0]),
    ];

    return $fields;
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_product_collection_display_field_definitions(): array
{
    return [
        ['key' => 'field_tio2_product_collection_family_display_order', 'label' => 'Family Display Order', 'name' => 'familyDisplayOrder', 'type' => 'number', 'required' => 1, 'min' => 1, 'step' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_collection_family_card_summary', 'label' => 'Family Card Summary', 'name' => 'familyCardSummary', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_collection_application_focus', 'label' => 'Collection Application Focus', 'name' => 'collectionApplicationFocus', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_collection_performance_focus', 'label' => 'Collection Performance Focus', 'name' => 'collectionPerformanceFocus', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_collection_surface_treatment_positioning', 'label' => 'Collection Surface Treatment Positioning', 'name' => 'collectionSurfaceTreatmentPositioning', 'type' => 'textarea', 'required' => 1, 'show_in_graphql' => 1],
        ['key' => 'field_tio2_product_collection_filter_tags', 'label' => 'Collection Filter Tags', 'name' => 'collectionFilterTags', 'type' => 'checkbox', 'required' => 1, 'choices' => tio2_product_collection_product_filter_tag_choices(), 'return_format' => 'value', 'show_in_graphql' => 1],
    ];
}

function tio2_register_product_collection_fields(): void
{
    if (! function_exists('acf_add_local_field_group')) {
        return;
    }

    acf_add_local_field_group([
        'key' => 'group_tio2_product_hub_fields', 'title' => 'Products Hub',
        'fields' => tio2_product_hub_field_definitions(),
        'location' => [[['param' => 'options_page', 'operator' => '==', 'value' => 'tio2-product-settings']]],
        'show_in_graphql' => 0,
    ]);
    acf_add_local_field_group([
        'key' => 'group_tio2_product_family_fields', 'title' => 'Product Family',
        'fields' => tio2_product_family_field_definitions(),
        'location' => [[['param' => 'taxonomy', 'operator' => '==', 'value' => 'product_family']]],
        'show_in_graphql' => 0,
    ]);
    acf_add_local_field_group([
        'key' => 'group_tio2_product_collection_display_fields', 'title' => 'Product Collection Display',
        'fields' => tio2_product_collection_display_field_definitions(),
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'tio2_product'], ['param' => 'post_taxonomy', 'operator' => '==', 'value' => 'site_scope:tio2-a']]],
        'show_in_graphql' => 0,
    ]);
}
