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

    if (! is_string($value) || 1 !== preg_match('~^/(?!/)[^?#]*$~', $value)) {
        return 'Public path must start with one slash and cannot contain a protocol, query string, or fragment.';
    }

    return true;
}
