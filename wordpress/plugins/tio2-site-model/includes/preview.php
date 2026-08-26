<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

/**
 * @param array<string, string>|null $environment
 * @return array{url: string, secret: string}|null
 */
function tio2_get_preview_config(string $site_id, ?array $environment = null): ?array
{
    if (! in_array($site_id, tio2_supported_site_ids(), true)) {
        return null;
    }

    $suffix = strtoupper(str_replace('-', '_', $site_id));
    $url_name = 'NEXTJS_PREVIEW_URL_' . $suffix;
    $secret_name = 'NEXTJS_PREVIEW_SECRET_' . $suffix;
    $url = null === $environment ? getenv($url_name) : ($environment[$url_name] ?? '');
    $secret = null === $environment ? getenv($secret_name) : ($environment[$secret_name] ?? '');
    if (! is_string($url) || ! is_string($secret) || '' === $url || '' === $secret) {
        return null;
    }

    $parts = wp_parse_url($url);
    if (
        false === filter_var($url, FILTER_VALIDATE_URL) ||
        ! is_array($parts) ||
        ! in_array($parts['scheme'] ?? '', ['http', 'https'], true) ||
        empty($parts['host']) ||
        isset($parts['user']) ||
        isset($parts['pass'])
    ) {
        return null;
    }

    return ['url' => $url, 'secret' => $secret];
}

function tio2_preview_signature_message(string $timestamp, string $site_id, string $path): string
{
    return $timestamp . "\n" . $site_id . "\n" . $path;
}

/**
 * @param mixed $value
 * @return array{node: array{mediaItemUrl: string, altText: string, mediaDetails: array{width: int, height: int}, mimeType: string}}|null
 */
function tio2_preview_homepage_image($value): ?array
{
    $attachment_id = is_array($value)
        ? (int) ($value['ID'] ?? $value['id'] ?? 0)
        : (int) $value;
    if ($attachment_id <= 0) {
        return null;
    }

    $url = wp_get_attachment_url($attachment_id);
    $metadata = wp_get_attachment_metadata($attachment_id);
    $mime_type = get_post_mime_type($attachment_id);
    if (
        ! is_string($url) ||
        '' === $url ||
        ! is_array($metadata) ||
        ! is_string($mime_type)
    ) {
        return null;
    }

    return [
        'node' => [
            'mediaItemUrl' => $url,
            'altText' => (string) get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
            'mediaDetails' => [
                'width' => (int) ($metadata['width'] ?? 0),
                'height' => (int) ($metadata['height'] ?? 0),
            ],
            'mimeType' => $mime_type,
        ],
    ];
}

/**
 * @param mixed $value
 * @return list<array<string, mixed>>
 */
function tio2_preview_homepage_rows($value): array
{
    if (! is_array($value)) {
        return [];
    }

    return array_values(array_filter($value, 'is_array'));
}

/**
 * @param mixed $value
 * @return list<string>
 */
function tio2_preview_homepage_select($value): array
{
    if (is_array($value)) {
        return array_values(array_map('strval', $value));
    }

    return '' === (string) $value ? [] : [(string) $value];
}

/**
 * @return array<string, mixed>
 */
function tio2_serialize_homepage_preview(WP_Post $post, string $site_id): array
{
    $post_id = (int) $post->ID;
    $metrics = array_map(static fn (array $row): array => [
        'metricValue' => (string) ($row['metric_value'] ?? ''),
        'metricUnit' => (string) ($row['metric_unit'] ?? ''),
        'metricLabel' => (string) ($row['metric_label'] ?? ''),
        'metricContext' => (string) ($row['metric_context'] ?? ''),
        'metricClaimBasis' => tio2_preview_homepage_select($row['metric_claim_basis'] ?? ''),
        'metricEvidenceUrl' => (string) ($row['metric_evidence_url'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('metrics', $post_id)));
    $product_routes = array_map(static fn (array $row): array => [
        'productTitle' => (string) ($row['product_title'] ?? ''),
        'productSummary' => (string) ($row['product_summary'] ?? ''),
        'productPath' => (string) ($row['product_path'] ?? ''),
        'productImage' => tio2_preview_homepage_image($row['product_image'] ?? null),
        'productImageAlt' => (string) ($row['product_image_alt'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('product_routes', $post_id)));
    $applications = array_map(static fn (array $row): array => [
        'applicationName' => (string) ($row['application_name'] ?? ''),
        'applicationSummary' => (string) ($row['application_summary'] ?? ''),
        'applicationPath' => (string) ($row['application_path'] ?? ''),
        'applicationImage' => tio2_preview_homepage_image($row['application_image'] ?? null),
        'applicationImageAlt' => (string) ($row['application_image_alt'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('applications', $post_id)));
    $inquiry_steps = array_map(static fn (array $row): array => [
        'inquiryStepTitle' => (string) ($row['inquiry_step_title'] ?? ''),
        'inquiryStepDescription' => (string) ($row['inquiry_step_description'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('inquiry_steps', $post_id)));
    $trust_reasons = array_map(static fn (array $row): array => [
        'trustReasonTitle' => (string) ($row['trust_reason_title'] ?? ''),
        'trustReasonDescription' => (string) ($row['trust_reason_description'] ?? ''),
        'trustReasonClaimBasis' => tio2_preview_homepage_select($row['trust_reason_claim_basis'] ?? ''),
        'trustReasonEvidenceUrl' => (string) ($row['trust_reason_evidence_url'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('trust_reasons', $post_id)));
    $rfq_labels = get_field('rfq_labels', $post_id);
    $rfq_labels = is_array($rfq_labels) ? $rfq_labels : [];
    $faqs = array_map(static fn (array $row): array => [
        'faqQuestion' => (string) ($row['faq_question'] ?? ''),
        'faqAnswer' => (string) ($row['faq_answer'] ?? ''),
        'faqRelatedLabel' => (string) ($row['faq_related_label'] ?? ''),
        'faqRelatedPath' => (string) ($row['faq_related_path'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('faqs', $post_id)));
    $secondary_topics = array_map(static fn (array $row): array => [
        'secondaryTopic' => (string) ($row['secondary_topic'] ?? ''),
    ], tio2_preview_homepage_rows(get_field('secondary_topics', $post_id)));
    $schema_version = (string) get_field('homepage_schema_version', $post_id);

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
            'heroEyebrow' => (string) get_field('hero_eyebrow', $post_id),
            'heroHeading' => (string) get_field('hero_heading', $post_id),
            'heroSummary' => (string) get_field('hero_summary', $post_id),
            'heroPrimaryLabel' => (string) get_field('hero_primary_label', $post_id),
            'heroSecondaryLabel' => (string) get_field('hero_secondary_label', $post_id),
            'heroSecondaryPath' => (string) get_field('hero_secondary_path', $post_id),
            'heroImage' => tio2_preview_homepage_image(get_field('hero_image', $post_id)),
            'heroImageAlt' => (string) get_field('hero_image_alt', $post_id),
            'metrics' => $metrics,
            'productsHeading' => (string) get_field('products_heading', $post_id),
            'productsIntro' => (string) get_field('products_intro', $post_id),
            'productRoutes' => $product_routes,
            'applicationsHeading' => (string) get_field('applications_heading', $post_id),
            'applicationsIntro' => (string) get_field('applications_intro', $post_id),
            'applications' => $applications,
            'inquiryHeading' => (string) get_field('inquiry_heading', $post_id),
            'inquirySteps' => $inquiry_steps,
            'trustHeading' => (string) get_field('trust_heading', $post_id),
            'trustIntro' => (string) get_field('trust_intro', $post_id),
            'trustReasons' => $trust_reasons,
            'rfqHeading' => (string) get_field('rfq_heading', $post_id),
            'rfqIntro' => (string) get_field('rfq_intro', $post_id),
            'rfqLabels' => [
                'rfqLabelName' => (string) ($rfq_labels['rfq_label_name'] ?? ''),
                'rfqLabelCompany' => (string) ($rfq_labels['rfq_label_company'] ?? ''),
                'rfqLabelCountryRegion' => (string) ($rfq_labels['rfq_label_country_region'] ?? ''),
                'rfqLabelWorkEmail' => (string) ($rfq_labels['rfq_label_work_email'] ?? ''),
                'rfqLabelBuyerType' => (string) ($rfq_labels['rfq_label_buyer_type'] ?? ''),
                'rfqLabelInterest' => (string) ($rfq_labels['rfq_label_interest'] ?? ''),
                'rfqLabelExpectedQuantity' => (string) ($rfq_labels['rfq_label_expected_quantity'] ?? ''),
                'rfqLabelDestination' => (string) ($rfq_labels['rfq_label_destination'] ?? ''),
                'rfqLabelMessage' => (string) ($rfq_labels['rfq_label_message'] ?? ''),
                'rfqLabelPrivacy' => (string) ($rfq_labels['rfq_label_privacy'] ?? ''),
                'rfqBuyerIndustrialLabel' => (string) ($rfq_labels['rfq_buyer_industrial_label'] ?? ''),
                'rfqBuyerDistributorLabel' => (string) ($rfq_labels['rfq_buyer_distributor_label'] ?? ''),
                'rfqBuyerOtherLabel' => (string) ($rfq_labels['rfq_buyer_other_label'] ?? ''),
            ],
            'rfqSubmitLabel' => (string) get_field('rfq_submit_label', $post_id),
            'rfqPrivacyText' => (string) get_field('rfq_privacy_text', $post_id),
            'rfqSuccessHeading' => (string) get_field('rfq_success_heading', $post_id),
            'rfqSuccessMessage' => (string) get_field('rfq_success_message', $post_id),
            'faqHeading' => (string) get_field('faq_heading', $post_id),
            'faqs' => $faqs,
            'closingHeading' => (string) get_field('closing_heading', $post_id),
            'closingBody' => (string) get_field('closing_body', $post_id),
            'closingLabel' => (string) get_field('closing_label', $post_id),
            'seoTitle' => (string) get_field('seo_title', $post_id),
            'seoDescription' => (string) get_field('seo_description', $post_id),
            'ogImage' => tio2_preview_homepage_image(get_field('og_image', $post_id)),
            'primaryTopic' => (string) get_field('primary_topic', $post_id),
            'secondaryTopics' => $secondary_topics,
        ],
    ];
}

function tio2_preview_product_field_name(string $name): string
{
    return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $name))));
}

/**
 * @param array<string, mixed> $container
 * @param array<string, mixed> $field
 */
function tio2_preview_product_field_value(array $container, array $field)
{
    $name = (string) ($field['name'] ?? '');
    $key = (string) ($field['key'] ?? '');

    return $container[$name] ?? $container[$key] ?? null;
}

/**
 * @param array<string, mixed> $field
 * @return mixed
 */
function tio2_preview_product_normalize_value(array $field, $value)
{
    $type = (string) ($field['type'] ?? '');
    if ('taxonomy' === $type) {
        return (int) $value;
    }
    if ('relationship' === $type) {
        $items = is_array($value) ? $value : [];
        return array_values(array_filter(array_map('intval', $items), static fn (int $id): bool => $id > 0));
    }
    if ('number' === $type) {
        $number = (float) $value;
        return floor($number) === $number ? (int) $number : $number;
    }
    if ('repeater' === $type) {
        $rows = is_array($value) ? array_values($value) : [];
        return array_values(array_map(static function ($row) use ($field): array {
            $row = is_array($row) ? $row : [];
            return tio2_preview_product_normalize_fields($field['sub_fields'] ?? [], $row);
        }, $rows));
    }
    if ('group' === $type) {
        return tio2_preview_product_normalize_fields(
            $field['sub_fields'] ?? [],
            is_array($value) ? $value : []
        );
    }

    return is_scalar($value) ? (string) $value : '';
}

/**
 * @param list<array<string, mixed>> $definitions
 * @param array<string, mixed> $values
 * @return array<string, mixed>
 */
function tio2_preview_product_normalize_fields(array $definitions, array $values): array
{
    $normalized = [];
    foreach ($definitions as $field) {
        if (! is_array($field)) {
            continue;
        }
        $name = (string) ($field['name'] ?? '');
        if ('' === $name) {
            continue;
        }
        $normalized[tio2_preview_product_field_name($name)] = tio2_preview_product_normalize_value(
            $field,
            tio2_preview_product_field_value($values, $field)
        );
    }

    return $normalized;
}

function tio2_preview_product_plain_text(string $value): string
{
    $decoded = html_entity_decode(
        wp_strip_all_tags($value, true),
        ENT_QUOTES | ENT_HTML5,
        'UTF-8'
    );
    $normalized = preg_replace('/\s+/u', ' ', $decoded);

    return trim(is_string($normalized) ? $normalized : $decoded);
}

/**
 * @param mixed $value
 */
function tio2_preview_product_family_name($value): string
{
    $term_id = $value instanceof WP_Term ? (int) $value->term_id : (int) $value;
    if ($term_id <= 0) {
        return '';
    }

    $term = get_term($term_id, 'product_family');
    return $term instanceof WP_Term
        ? tio2_preview_product_plain_text($term->name)
        : '';
}

function tio2_preview_product_has_only_site_a_scope(int $post_id): bool
{
    $site_scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($site_scopes)) {
        return false;
    }

    return ['tio2-a'] === array_values(array_unique(array_map('strval', $site_scopes)));
}

function tio2_preview_product_relationship_path(WP_Post $post): ?string
{
    if ('tio2_product' === $post->post_type) {
        $product_id = get_field('product_id', $post->ID, false);
        if (
            ! is_string($product_id) ||
            1 !== preg_match(tio2_product_id_pattern(), $product_id) ||
            tio2_product_slug_from_id($product_id) !== $post->post_name
        ) {
            return null;
        }
        $path = tio2_product_path_from_id($product_id);
    } else {
        if ('' === $post->post_name) {
            return null;
        }
        $permalink = get_permalink($post);
        $parts = is_string($permalink) ? wp_parse_url($permalink) : false;
        if (
            ! is_array($parts) ||
            isset($parts['query']) ||
            isset($parts['fragment']) ||
            ! isset($parts['path']) ||
            ! is_string($parts['path'])
        ) {
            return null;
        }
        $path = '/' === $parts['path'] ? '/' : untrailingslashit($parts['path']);
        if (! str_ends_with($path, '/' . $post->post_name)) {
            return null;
        }
    }

    return '/' !== $path && tio2_is_valid_public_path($path) ? $path : null;
}

/**
 * @param mixed $value
 * @return list<array{title: string, fit?: string, href?: string}>
 */
function tio2_preview_product_relationships(
    $value,
    string $expected_post_type,
    bool $include_fit = false
): array {
    $items = is_array($value) ? $value : [];
    $relationships = [];
    foreach ($items as $item) {
        $post = $item instanceof WP_Post ? $item : get_post((int) $item);
        if (
            ! $post instanceof WP_Post ||
            $expected_post_type !== $post->post_type ||
            'publish' !== $post->post_status ||
            ! tio2_preview_product_has_only_site_a_scope((int) $post->ID)
        ) {
            continue;
        }

        $href = tio2_preview_product_relationship_path($post);
        if (! $include_fit && null === $href) {
            continue;
        }
        $relationship = [
            'title' => tio2_preview_product_plain_text((string) get_the_title($post)),
        ];
        if ($include_fit) {
            $relationship['fit'] = tio2_preview_product_plain_text(
                (string) apply_filters('the_excerpt', get_the_excerpt($post))
            );
        }
        if (null !== $href) {
            $relationship['href'] = $href;
        }
        $relationships[] = $relationship;
    }

    return $relationships;
}

function tio2_find_product_for_preview(string $site_id, string $path): ?WP_Post
{
    if ('tio2-a' !== $site_id || 1 !== preg_match('#^/products/(tp-[a-z]{1,2}[0-9]{3})$#', $path, $matches)) {
        return null;
    }

    $products = get_posts([
        'post_type' => 'tio2_product',
        'post_status' => 'draft',
        'name' => $matches[1],
        'posts_per_page' => 2,
        'no_found_rows' => true,
        'orderby' => 'ID',
        'order' => 'ASC',
    ]);
    if (1 !== count($products) || ! $products[0] instanceof WP_Post) {
        return null;
    }

    $product = $products[0];
    return 'tio2-a' === tio2_product_site_id((int) $product->ID) ? $product : null;
}

/**
 * @return array<string, mixed>|WP_Error
 */
function tio2_serialize_product_preview(WP_Post $product): array|WP_Error
{
    if ('draft' !== $product->post_status) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    $validation = tio2_validate_product_contract((int) $product->ID);
    if (is_wp_error($validation)) {
        return new WP_Error(
            'tio2_preview_product_incomplete',
            'Product preview contract is incomplete.',
            [
                'status' => 422,
                'validationCode' => $validation->get_error_code(),
            ]
        );
    }

    $product_values = [];
    foreach (tio2_product_field_definitions() as $field) {
        if (! is_array($field) || empty($field['name'])) {
            continue;
        }
        $product_values[(string) $field['name']] = get_field((string) $field['name'], $product->ID, false);
    }

    $shared_values = [];
    foreach (tio2_product_shared_field_definitions() as $field) {
        if (! is_array($field) || empty($field['name'])) {
            continue;
        }
        $shared_values[(string) $field['name']] = get_field((string) $field['name'], 'option', false);
    }
    $shared_fields = tio2_preview_product_normalize_fields(
        tio2_product_shared_field_definitions(),
        $shared_values
    );

    $product_fields = tio2_preview_product_normalize_fields(
        tio2_product_field_definitions(),
        $product_values
    );
    $product_fields['family'] = tio2_preview_product_family_name($product_values['family'] ?? null);
    $product_fields['recommendedApplications'] = tio2_preview_product_relationships(
        $product_values['recommended_applications'] ?? [],
        'tio2_application',
        true
    );
    $related_links = is_array($product_values['related_links'] ?? null)
        ? $product_values['related_links']
        : [];
    $related_values = [];
    foreach (tio2_product_field_definitions() as $field) {
        if (! is_array($field) || 'related_links' !== ($field['name'] ?? null)) {
            continue;
        }
        foreach ($field['sub_fields'] ?? [] as $sub_field) {
            if (! is_array($sub_field) || empty($sub_field['name'])) {
                continue;
            }
            $related_values[(string) $sub_field['name']] = tio2_preview_product_field_value(
                $related_links,
                $sub_field
            );
        }
    }
    $product_fields['relatedLinks'] = [
        'applications' => tio2_preview_product_relationships(
            $related_values['applications'] ?? [],
            'tio2_application'
        ),
        'resources' => tio2_preview_product_relationships(
            $related_values['resources'] ?? [],
            'tio2_document'
        ),
        'products' => tio2_preview_product_relationships(
            $related_values['products'] ?? [],
            'tio2_product'
        ),
    ];

    $modified_gmt = get_post_modified_time('Y-m-d\TH:i:s', true, $product);
    if (! is_string($modified_gmt) || '' === $modified_gmt) {
        $modified_gmt = get_gmt_from_date(
            (string) $product->post_modified,
            'Y-m-d\TH:i:s'
        );
    }

    $product_id = (string) $product_values['product_id'];
    return [
        'id' => (string) $product->ID,
        'databaseId' => (int) $product->ID,
        'siteId' => 'tio2-a',
        'path' => tio2_product_path_from_id($product_id),
        'slug' => $product->post_name,
        'title' => get_the_title($product),
        'modifiedGmt' => $modified_gmt,
        'status' => $product->post_status,
        'productFields' => $product_fields,
        'productSettingsFields' => $shared_fields,
    ];
}

/**
 * @return true|WP_Error
 */
function tio2_preview_rest_permission(WP_REST_Request $request)
{
    $site_id = (string) $request->get_param('siteId');
    $path = (string) $request->get_param('path');
    $timestamp = (string) $request->get_header('x-tio2-preview-timestamp');
    $signature = (string) $request->get_header('x-tio2-preview-signature');
    $config = tio2_get_preview_config($site_id);

    if (
        null === $config ||
        ! tio2_is_valid_public_path($path) ||
        1 !== preg_match('/^(?:0|[1-9][0-9]{0,12})$/', $timestamp) ||
        abs(time() - (int) $timestamp) > 300 ||
        1 !== preg_match('/^[0-9a-f]{64}$/', $signature)
    ) {
        return new WP_Error('tio2_preview_unauthorized', 'Preview authorization failed.', ['status' => 401]);
    }

    $expected = hash_hmac(
        'sha256',
        tio2_preview_signature_message($timestamp, $site_id, $path),
        $config['secret']
    );
    if (! hash_equals($expected, $signature)) {
        return new WP_Error('tio2_preview_unauthorized', 'Preview authorization failed.', ['status' => 401]);
    }

    return true;
}

/**
 * @return WP_REST_Response|WP_Error
 */
function tio2_preview_rest_response(WP_REST_Request $request)
{
    $site_id = (string) $request->get_param('siteId');
    $path = (string) $request->get_param('path');
    if ('/' === $path) {
        $homepage_ids = tio2_find_homepage_ids($site_id);
        if (1 !== count($homepage_ids)) {
            return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
        }
        $homepage = get_post((int) $homepage_ids[0]);
        $validation = $homepage instanceof WP_Post
            ? tio2_validate_homepage_contract((int) $homepage->ID)
            : new WP_Error('tio2_preview_not_found');
        if (
            ! $homepage instanceof WP_Post ||
            is_wp_error($validation) ||
            'draft' !== $homepage->post_status
        ) {
            return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
        }

        $schema_version = (string) get_field('homepage_schema_version', $homepage->ID, false);
        $payload = 'homepage-v0.2-editorial-geo' === $schema_version
            ? tio2_serialize_homepage_v02_preview($homepage, $site_id)
            : tio2_serialize_homepage_preview($homepage, $site_id);

        return new WP_REST_Response($payload, 200);
    }

    if (str_starts_with($path, '/products/')) {
        $product = tio2_find_product_for_preview($site_id, $path);
        if (! $product instanceof WP_Post || 'draft' !== $product->post_status) {
            return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
        }

        $payload = tio2_serialize_product_preview($product);
        return is_wp_error($payload) ? $payload : new WP_REST_Response($payload, 200);
    }

    $internal_slug = tio2_build_internal_slug($site_id, $path);
    if (is_wp_error($internal_slug)) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    $owner_ids = tio2_find_managed_route_post_ids($site_id, $path);
    if (1 !== count($owner_ids)) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }
    $post = get_post($owner_ids[0]);
    if (
        ! $post instanceof WP_Post ||
        ! in_array($post->post_status, ['publish', 'future', 'draft', 'pending', 'private'], true)
    ) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    $route = tio2_get_managed_post_route((int) $post->ID);
    if (
        is_wp_error($route) ||
        $route['siteId'] !== $site_id ||
        $route['publicPath'] !== $path ||
        $route['internalSlug'] !== $post->post_name
    ) {
        return new WP_Error('tio2_preview_not_found', 'Preview content was not found.', ['status' => 404]);
    }

    return new WP_REST_Response([
        'id' => (string) $post->ID,
        'siteId' => $site_id,
        'path' => $path,
        'title' => get_the_title($post),
        'html' => apply_filters('the_content', $post->post_content),
        'modified' => get_post_modified_time('c', true, $post),
        'status' => $post->post_status,
        'seo' => [
            'title' => (string) get_post_meta((int) $post->ID, 'seo_title', true),
            'description' => (string) get_post_meta((int) $post->ID, 'seo_description', true),
        ],
    ], 200);
}

function tio2_register_preview_rest_route(): void
{
    register_rest_route('tio2/v1', '/preview', [
        'methods' => WP_REST_Server::READABLE,
        'permission_callback' => 'tio2_preview_rest_permission',
        'callback' => 'tio2_preview_rest_response',
        'args' => [
            'siteId' => ['required' => true, 'type' => 'string'],
            'path' => ['required' => true, 'type' => 'string'],
        ],
    ]);
}

function tio2_filter_preview_post_link(string $preview_link, WP_Post $post): string
{
    if ('tio2_homepage' === $post->post_type) {
        $site_id = tio2_get_homepage_site_id((int) $post->ID);
        if (
            null === $site_id ||
            tio2_homepage_internal_slug($site_id) !== $post->post_name
        ) {
            return $preview_link;
        }
        $route = ['siteId' => $site_id, 'publicPath' => '/'];
    } elseif ('tio2_product' === $post->post_type) {
        $validation = tio2_validate_product_contract((int) $post->ID);
        $product_id = get_field('product_id', $post->ID, false);
        if (
            is_wp_error($validation) ||
            ! is_string($product_id) ||
            'draft' !== $post->post_status ||
            'tio2-a' !== tio2_product_site_id((int) $post->ID) ||
            tio2_product_slug_from_id($product_id) !== $post->post_name
        ) {
            return $preview_link;
        }
        $route = ['siteId' => 'tio2-a', 'publicPath' => tio2_product_path_from_id($product_id)];
    } else {
        $route = tio2_get_managed_post_route((int) $post->ID);
        if (is_wp_error($route)) {
            return $preview_link;
        }
    }

    $config = tio2_get_preview_config($route['siteId']);
    if (null === $config) {
        return $preview_link;
    }

    $expires = (string) (time() + 300);
    $signature = hash_hmac(
        'sha256',
        tio2_preview_signature_message($expires, $route['siteId'], $route['publicPath']),
        $config['secret']
    );

    return add_query_arg([
        'siteId' => $route['siteId'],
        'path' => $route['publicPath'],
        'expires' => $expires,
        'signature' => $signature,
    ], $config['url']);
}
