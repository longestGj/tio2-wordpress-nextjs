<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/** @param mixed $source */
function tio2_editorial_graphql_source_post($source): ?WP_Post
{
    if ($source instanceof WP_Post) {
        return $source;
    }
    foreach (['databaseId', 'ID', 'id'] as $property) {
        if (is_object($source) && isset($source->{$property}) && is_numeric($source->{$property})) {
            $post = get_post((int) $source->{$property});
            return $post instanceof WP_Post ? $post : null;
        }
    }
    return null;
}

/** @param mixed $source @return array<string, mixed>|null */
function tio2_resolve_site_a_application_fields($source): ?array
{
    $post = tio2_editorial_graphql_source_post($source);
    if (! $post instanceof WP_Post || 'tio2_application' !== $post->post_type) {
        return null;
    }
    $fields = tio2_serialize_application_fields($post);
    return is_wp_error($fields) ? null : $fields;
}

/** @param mixed $source @return array<string, mixed>|null */
function tio2_resolve_site_a_resource_fields($source): ?array
{
    $post = tio2_editorial_graphql_source_post($source);
    if (! $post instanceof WP_Post || 'tio2_document' !== $post->post_type) {
        return null;
    }
    $fields = tio2_serialize_resource_fields($post);
    return is_wp_error($fields) ? null : $fields;
}

function tio2_register_application_resource_graphql_types(): void
{
    register_graphql_object_type('Tio2EditorialLink', ['fields' => [
        'targetType' => ['type' => ['non_null' => 'String']],
        'targetKey' => ['type' => ['non_null' => 'String']],
        'title' => ['type' => ['non_null' => 'String']],
        'path' => ['type' => ['non_null' => 'String']],
        'href' => ['type' => 'String'],
    ]]);
    register_graphql_object_type('Tio2EditorialSection', ['fields' => [
        'id' => ['type' => ['non_null' => 'String']],
        'heading' => ['type' => ['non_null' => 'String']],
        'html' => ['type' => ['non_null' => 'String']],
    ]]);
    register_graphql_object_type('Tio2EditorialFaq', ['fields' => [
        'question' => ['type' => ['non_null' => 'String']],
        'answerHtml' => ['type' => ['non_null' => 'String']],
    ]]);
    register_graphql_object_type('Tio2EditorialCta', ['fields' => [
        'kind' => ['type' => ['non_null' => 'String']],
        'label' => ['type' => ['non_null' => 'String']],
        'href' => ['type' => ['non_null' => 'String']],
    ]]);
    register_graphql_object_type('Tio2EditorialComparisonRow', ['fields' => [
        'cells' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'String']]]],
    ]]);
    register_graphql_object_type('Tio2EditorialComparisonTable', ['fields' => [
        'columns' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'String']]]],
        'rows' => ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2EditorialComparisonRow']]]],
    ]]);

    $string = ['type' => ['non_null' => 'String']];
    $strings = ['type' => ['non_null' => ['list_of' => ['non_null' => 'String']]]];
    $links = ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2EditorialLink']]]];
    $sections = ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2EditorialSection']]]];
    $faqs = ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2EditorialFaq']]]];
    $ctas = ['type' => ['non_null' => ['list_of' => ['non_null' => 'Tio2EditorialCta']]]];

    register_graphql_object_type('Tio2SiteAApplicationFields', ['fields' => [
        'applicationId' => $string, 'applicationLevel' => $string, 'family' => $string,
        'parentApplication' => ['type' => 'Tio2EditorialLink'],
        'metaTitle' => $string, 'metaDescription' => $string, 'eyebrow' => $string,
        'headline' => $string, 'directAnswer' => $string, 'applicationContext' => $string,
        'buyerProblem' => $string, 'selectionFactors' => $strings, 'powderDataLimits' => $string,
        'validationPlan' => $strings, 'customerInputs' => $strings, 'bodySections' => $sections,
        'faqItems' => $faqs, 'childApplications' => $links, 'relatedApplications' => $links,
        'relatedResources' => $links, 'relatedProducts' => $links, 'ctas' => $ctas,
        'technicalDisclaimer' => $string,
    ]]);
    register_graphql_object_type('Tio2SiteATechnicalResourceFields', ['fields' => [
        'resourceId' => $string, 'resourceKind' => $string, 'cluster' => $string,
        'metaTitle' => $string, 'metaDescription' => $string, 'eyebrow' => $string,
        'headline' => $string, 'directAnswer' => $string, 'keyTakeaways' => $strings,
        'sections' => $sections, 'comparisonTable' => ['type' => 'Tio2EditorialComparisonTable'],
        'practicalImplications' => $strings, 'commonMistakes' => $strings,
        'evaluationMethod' => $strings, 'faqItems' => $faqs, 'childResources' => $links,
        'relatedApplications' => $links, 'relatedResources' => $links,
        'relatedProducts' => $links, 'ctas' => $ctas, 'technicalDisclaimer' => $string,
    ]]);

    register_graphql_field('Tio2Application', 'siteAApplicationFields', [
        'type' => 'Tio2SiteAApplicationFields',
        'resolve' => 'tio2_resolve_site_a_application_fields',
    ]);
    register_graphql_field('Tio2Document', 'siteATechnicalResourceFields', [
        'type' => 'Tio2SiteATechnicalResourceFields',
        'resolve' => 'tio2_resolve_site_a_resource_fields',
    ]);
}

add_action('graphql_register_types', 'tio2_register_application_resource_graphql_types');
