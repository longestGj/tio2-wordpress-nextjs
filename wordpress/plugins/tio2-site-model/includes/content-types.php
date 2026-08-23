<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @return array<string, array{singular: string, plural: string, graphql_single: string, graphql_plural: string}>
 */
function tio2_content_type_definitions(): array
{
    return [
        'tio2_product' => [
            'singular' => 'TiO2 Product',
            'plural' => 'TiO2 Products',
            'graphql_single' => 'Tio2Product',
            'graphql_plural' => 'Tio2Products',
        ],
        'tio2_grade' => [
            'singular' => 'TiO2 Grade',
            'plural' => 'TiO2 Grades',
            'graphql_single' => 'Tio2Grade',
            'graphql_plural' => 'Tio2Grades',
        ],
        'tio2_application' => [
            'singular' => 'TiO2 Application',
            'plural' => 'TiO2 Applications',
            'graphql_single' => 'Tio2Application',
            'graphql_plural' => 'Tio2Applications',
        ],
        'tio2_document' => [
            'singular' => 'TiO2 Document',
            'plural' => 'TiO2 Documents',
            'graphql_single' => 'Tio2Document',
            'graphql_plural' => 'Tio2Documents',
        ],
        'tio2_faq' => [
            'singular' => 'TiO2 FAQ',
            'plural' => 'TiO2 FAQs',
            'graphql_single' => 'Tio2Faq',
            'graphql_plural' => 'Tio2Faqs',
        ],
    ];
}

function tio2_register_content_types(): void
{
    $content_types = tio2_content_type_definitions();

    foreach ($content_types as $post_type => $definition) {
        register_post_type($post_type, [
            'labels' => [
                'name' => $definition['plural'],
                'singular_name' => $definition['singular'],
                'add_new_item' => 'Add New ' . $definition['singular'],
                'edit_item' => 'Edit ' . $definition['singular'],
            ],
            'public' => true,
            'show_in_rest' => true,
            'show_in_graphql' => true,
            'graphql_single_name' => $definition['graphql_single'],
            'graphql_plural_name' => $definition['graphql_plural'],
            'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'revisions'],
            'has_archive' => true,
            'rewrite' => ['slug' => str_replace('_', '-', $post_type)],
        ]);
    }

    register_post_type('tio2_homepage', [
        'labels' => [
            'name' => 'TiO2 Homepages',
            'singular_name' => 'TiO2 Homepage',
            'add_new_item' => 'Add New TiO2 Homepage',
            'edit_item' => 'Edit TiO2 Homepage',
        ],
        'public' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'Tio2Homepage',
        'graphql_plural_name' => 'Tio2Homepages',
        'publicly_queryable' => false,
        'supports' => ['title', 'revisions'],
        'has_archive' => false,
        'rewrite' => false,
    ]);

    $object_types = array_merge(['post', 'page'], array_keys($content_types), ['tio2_homepage']);

    register_taxonomy('site_scope', $object_types, [
        'labels' => [
            'name' => 'Site Scopes',
            'singular_name' => 'Site Scope',
        ],
        'public' => true,
        'hierarchical' => false,
        'show_in_rest' => true,
        'show_in_graphql' => true,
        'graphql_single_name' => 'SiteScope',
        'graphql_plural_name' => 'SiteScopes',
        'rewrite' => ['slug' => 'site-scope'],
    ]);
}

/**
 * Keep the homepage out of WordPress front-end routing while allowing the
 * published record to satisfy the public headless GraphQL contract.
 *
 * @param bool|null $is_private
 * @param mixed     $data
 * @return bool|null
 */
function tio2_homepage_graphql_visibility($is_private, string $model_name, $data)
{
    if (
        'PostObject' === $model_name &&
        $data instanceof WP_Post &&
        'tio2_homepage' === $data->post_type &&
        'publish' === $data->post_status
    ) {
        return false;
    }

    return $is_private;
}

function tio2_activate_site_model(): void
{
    tio2_register_content_types();

    foreach (['tio2-a', 'tio2-b'] as $term_slug) {
        if (! term_exists($term_slug, 'site_scope')) {
            wp_insert_term($term_slug, 'site_scope', ['slug' => $term_slug]);
        }
    }

    flush_rewrite_rules();
}
