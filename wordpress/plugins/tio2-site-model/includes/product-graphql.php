<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @param mixed                $source
 * @param array<string, mixed> $args
 * @return array{
 *   inquiryFields: list<array{key: string, label: string, guidance: string}>,
 *   requestTdsCta: array{label: string, description: string},
 *   discussApplicationCta: array{label: string, description: string},
 *   technicalDisclaimer: string
 * }|null
 */
function tio2_resolve_product_settings($source, array $args): ?array
{
    if ('tio2-a' !== ($args['siteId'] ?? null) || ! function_exists('get_field')) {
        return null;
    }

    $values = [];
    foreach ([
        'inquiry_fields',
        'request_tds_cta',
        'discuss_application_cta',
        'technical_disclaimer',
    ] as $field_name) {
        $values[$field_name] = get_field($field_name, 'option');
    }

    return tio2_normalize_product_shared_settings($values);
}

function tio2_register_product_graphql_types(): void
{
    register_graphql_object_type('Tio2InquiryField', [
        'description' => 'A field requested during a Product inquiry.',
        'fields' => [
            'key' => ['type' => ['non_null' => 'String']],
            'label' => ['type' => ['non_null' => 'String']],
            'guidance' => ['type' => ['non_null' => 'String']],
        ],
    ]);

    register_graphql_object_type('Tio2Cta', [
        'description' => 'A shared Product call to action.',
        'fields' => [
            'label' => ['type' => ['non_null' => 'String']],
            'description' => ['type' => ['non_null' => 'String']],
        ],
    ]);

    register_graphql_object_type('Tio2ProductSettings', [
        'description' => 'Shared Product settings for the configured Site A storefront.',
        'fields' => [
            'inquiryFields' => [
                'type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2InquiryField']]],
            ],
            'requestTdsCta' => ['type' => ['non_null' => 'Tio2Cta']],
            'discussApplicationCta' => ['type' => ['non_null' => 'Tio2Cta']],
            'technicalDisclaimer' => ['type' => ['non_null' => 'String']],
        ],
    ]);

    register_graphql_field('RootQuery', 'tio2ProductSettings', [
        'description' => 'Shared Product settings for the requested configured site.',
        'type' => 'Tio2ProductSettings',
        'args' => [
            'siteId' => ['type' => ['non_null' => 'String']],
        ],
        'resolve' => 'tio2_resolve_product_settings',
    ]);
}

add_action('graphql_register_types', 'tio2_register_product_graphql_types');
