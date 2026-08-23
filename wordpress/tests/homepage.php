<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_homepage_test_post_ids'] = [];
$GLOBALS['tio2_homepage_test_term_ids'] = [];
$GLOBALS['tio2_homepage_test_root_meta'] = [];
$GLOBALS['tio2_homepage_test_existing_homepages'] = [];

function tio2_homepage_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_homepage_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id)) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_homepage_test_post_ids'] = [];

    foreach ($GLOBALS['tio2_homepage_test_existing_homepages'] ?? [] as $post_id => $snapshot) {
        if (! get_post((int) $post_id)) {
            continue;
        }
        wp_update_post([
            'ID' => (int) $post_id,
            'post_status' => 'draft',
            'post_name' => (string) $snapshot['slug'],
        ]);
        wp_set_object_terms((int) $post_id, $snapshot['scopes'], 'site_scope', false);
        wp_update_post(['ID' => (int) $post_id, 'post_status' => (string) $snapshot['status']]);
    }
    $GLOBALS['tio2_homepage_test_existing_homepages'] = [];

    foreach ($GLOBALS['tio2_homepage_test_root_meta'] ?? [] as $post_id => $public_path) {
        if (get_post((int) $post_id)) {
            update_post_meta((int) $post_id, 'public_path', (string) $public_path);
        }
    }
    $GLOBALS['tio2_homepage_test_root_meta'] = [];

    foreach ($GLOBALS['tio2_homepage_test_term_ids'] ?? [] as $term_id) {
        if (term_exists((int) $term_id, 'site_scope')) {
            wp_delete_term((int) $term_id, 'site_scope');
        }
    }
    $GLOBALS['tio2_homepage_test_term_ids'] = [];
    $GLOBALS['tio2_webhook_queue'] = [];
}

function tio2_homepage_test_fail(string $message): void
{
    tio2_homepage_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_homepage_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        tio2_homepage_test_fail($message);
    }
}

/**
 * @param array<string, mixed> $expected
 * @param array<string, mixed> $actual
 */
function tio2_homepage_test_assert_field(array $expected, array $actual, string $parent = ''): void
{
    $label = '' === $parent ? $expected['key'] : $parent . ' > ' . $expected['key'];
    foreach (['key', 'name', 'type', 'required'] as $property) {
        tio2_homepage_test_assert(
            ($actual[$property] ?? null) === $expected[$property],
            "Field {$label} has wrong {$property}"
        );
    }
    tio2_homepage_test_assert(! empty($actual['show_in_graphql']), "Field {$label} is not in GraphQL");

    foreach (['min', 'max', 'maxlength', 'default_value', 'return_format'] as $property) {
        if (array_key_exists($property, $expected)) {
            tio2_homepage_test_assert(
                ($actual[$property] ?? null) === $expected[$property],
                "Field {$label} has wrong {$property}"
            );
        }
    }
    if (isset($expected['choices'])) {
        tio2_homepage_test_assert(
            array_keys($actual['choices'] ?? []) === $expected['choices'],
            "Field {$label} has wrong select choices"
        );
    }
    if (! empty($expected['hidden'])) {
        $classes = preg_split('/\s+/', trim((string) ($actual['wrapper']['class'] ?? ''))) ?: [];
        tio2_homepage_test_assert(in_array('acf-hidden', $classes, true), "Field {$label} is not hidden");
    }

    $expected_children = $expected['sub_fields'] ?? [];
    $actual_children = $actual['sub_fields'] ?? [];
    tio2_homepage_test_assert(
        array_column($actual_children, 'key') === array_column($expected_children, 'key'),
        "Field {$label} has wrong child keys or order"
    );
    foreach ($expected_children as $index => $expected_child) {
        tio2_homepage_test_assert_field($expected_child, $actual_children[$index], $label);
    }
}

/**
 * @return list<array<string, mixed>>
 */
function tio2_homepage_test_expected_fields(): array
{
    $text = static fn (string $key, string $name, int $required, ?int $maxlength = null): array => array_filter([
        'key' => $key,
        'name' => $name,
        'type' => 'text',
        'required' => $required,
        'maxlength' => $maxlength,
    ], static fn ($value): bool => null !== $value);
    $textarea = static fn (string $key, string $name, int $required, int $maxlength): array => [
        'key' => $key,
        'name' => $name,
        'type' => 'textarea',
        'required' => $required,
        'maxlength' => $maxlength,
    ];
    $image = static fn (string $key, string $name): array => [
        'key' => $key,
        'name' => $name,
        'type' => 'image',
        'required' => 0,
        'return_format' => 'id',
    ];
    $select = static fn (string $key, string $name): array => [
        'key' => $key,
        'name' => $name,
        'type' => 'select',
        'required' => 1,
        'choices' => ['user_confirmed', 'source_required'],
    ];
    $url = static fn (string $key, string $name): array => [
        'key' => $key,
        'name' => $name,
        'type' => 'url',
        'required' => 0,
    ];
    $repeater = static fn (
        string $key,
        string $name,
        int $required,
        int $min,
        int $max,
        array $sub_fields
    ): array => [
        'key' => $key,
        'name' => $name,
        'type' => 'repeater',
        'required' => $required,
        'min' => $min,
        'max' => $max,
        'sub_fields' => $sub_fields,
    ];

    return [
        $text('field_tio2_home_schema_version', 'homepage_schema_version', 1) + [
            'default_value' => 'homepage-v0.1',
            'hidden' => true,
        ],
        $text('field_tio2_home_hero_eyebrow', 'hero_eyebrow', 1, 80),
        $text('field_tio2_home_hero_heading', 'hero_heading', 1, 90),
        $textarea('field_tio2_home_hero_summary', 'hero_summary', 1, 320),
        $text('field_tio2_home_hero_primary_label', 'hero_primary_label', 1, 32),
        $text('field_tio2_home_hero_secondary_label', 'hero_secondary_label', 1, 32),
        $text('field_tio2_home_hero_secondary_path', 'hero_secondary_path', 1, 172),
        $image('field_tio2_home_hero_image', 'hero_image'),
        $text('field_tio2_home_hero_image_alt', 'hero_image_alt', 0, 160),
        $repeater('field_tio2_home_metrics', 'metrics', 0, 0, 4, [
            $text('field_tio2_home_metric_value', 'metric_value', 1, 24),
            $text('field_tio2_home_metric_unit', 'metric_unit', 0, 16),
            $text('field_tio2_home_metric_label', 'metric_label', 1, 60),
            $text('field_tio2_home_metric_context', 'metric_context', 0, 120),
            $select('field_tio2_home_metric_claim_basis', 'metric_claim_basis'),
            $url('field_tio2_home_metric_evidence_url', 'metric_evidence_url'),
        ]),
        $text('field_tio2_home_products_heading', 'products_heading', 1, 90),
        $textarea('field_tio2_home_products_intro', 'products_intro', 1, 240),
        $repeater('field_tio2_home_product_routes', 'product_routes', 1, 2, 6, [
            $text('field_tio2_home_product_title', 'product_title', 1, 80),
            $textarea('field_tio2_home_product_summary', 'product_summary', 1, 220),
            $text('field_tio2_home_product_path', 'product_path', 1, 172),
            $image('field_tio2_home_product_image', 'product_image'),
            $text('field_tio2_home_product_image_alt', 'product_image_alt', 0, 160),
        ]),
        $text('field_tio2_home_applications_heading', 'applications_heading', 1, 90),
        $textarea('field_tio2_home_applications_intro', 'applications_intro', 1, 240),
        $repeater('field_tio2_home_applications', 'applications', 1, 3, 6, [
            $text('field_tio2_home_application_name', 'application_name', 1),
            $text('field_tio2_home_application_summary', 'application_summary', 1),
            $text('field_tio2_home_application_path', 'application_path', 1),
            $image('field_tio2_home_application_image', 'application_image'),
            $text('field_tio2_home_application_image_alt', 'application_image_alt', 0, 160),
        ]),
        $text('field_tio2_home_inquiry_heading', 'inquiry_heading', 1, 90),
        $repeater('field_tio2_home_inquiry_steps', 'inquiry_steps', 1, 3, 3, [
            $text('field_tio2_home_inquiry_step_title', 'inquiry_step_title', 1, 70),
            $textarea('field_tio2_home_inquiry_step_description', 'inquiry_step_description', 1, 220),
        ]),
        $text('field_tio2_home_trust_heading', 'trust_heading', 1, 90),
        $textarea('field_tio2_home_trust_intro', 'trust_intro', 1, 240),
        $repeater('field_tio2_home_trust_reasons', 'trust_reasons', 1, 3, 4, [
            $text('field_tio2_home_trust_reason_title', 'trust_reason_title', 1),
            $text('field_tio2_home_trust_reason_description', 'trust_reason_description', 1),
            $select('field_tio2_home_trust_reason_claim_basis', 'trust_reason_claim_basis'),
            $url('field_tio2_home_trust_reason_evidence_url', 'trust_reason_evidence_url'),
        ]),
        $text('field_tio2_home_rfq_heading', 'rfq_heading', 1, 90),
        $textarea('field_tio2_home_rfq_intro', 'rfq_intro', 1, 260),
        [
            'key' => 'field_tio2_home_rfq_labels',
            'name' => 'rfq_labels',
            'type' => 'group',
            'required' => 1,
            'sub_fields' => [
                $text('field_tio2_home_rfq_label_name', 'rfq_label_name', 1),
                $text('field_tio2_home_rfq_label_company', 'rfq_label_company', 1),
                $text('field_tio2_home_rfq_label_country_region', 'rfq_label_country_region', 1),
                $text('field_tio2_home_rfq_label_work_email', 'rfq_label_work_email', 1),
                $text('field_tio2_home_rfq_label_buyer_type', 'rfq_label_buyer_type', 1),
                $text('field_tio2_home_rfq_label_interest', 'rfq_label_interest', 1),
                $text('field_tio2_home_rfq_label_expected_quantity', 'rfq_label_expected_quantity', 1),
                $text('field_tio2_home_rfq_label_destination', 'rfq_label_destination', 1),
                $text('field_tio2_home_rfq_label_message', 'rfq_label_message', 1),
                $text('field_tio2_home_rfq_label_privacy', 'rfq_label_privacy', 1),
                $text('field_tio2_home_rfq_buyer_industrial_label', 'rfq_buyer_industrial_label', 1),
                $text('field_tio2_home_rfq_buyer_distributor_label', 'rfq_buyer_distributor_label', 1),
                $text('field_tio2_home_rfq_buyer_other_label', 'rfq_buyer_other_label', 1),
            ],
        ],
        $text('field_tio2_home_rfq_submit_label', 'rfq_submit_label', 1, 32),
        $textarea('field_tio2_home_rfq_privacy_text', 'rfq_privacy_text', 1, 240),
        $text('field_tio2_home_rfq_success_heading', 'rfq_success_heading', 1, 80),
        $textarea('field_tio2_home_rfq_success_message', 'rfq_success_message', 1, 240),
        $text('field_tio2_home_faq_heading', 'faq_heading', 1, 90),
        $repeater('field_tio2_home_faqs', 'faqs', 1, 3, 6, [
            $text('field_tio2_home_faq_question', 'faq_question', 1, 160),
            $textarea('field_tio2_home_faq_answer', 'faq_answer', 1, 600),
            $text('field_tio2_home_faq_related_label', 'faq_related_label', 0),
            $text('field_tio2_home_faq_related_path', 'faq_related_path', 0),
        ]),
        $text('field_tio2_home_closing_heading', 'closing_heading', 1, 90),
        $textarea('field_tio2_home_closing_body', 'closing_body', 1, 220),
        $text('field_tio2_home_closing_label', 'closing_label', 1, 32),
        $text('field_tio2_home_seo_title', 'seo_title', 1, 60),
        $textarea('field_tio2_home_seo_description', 'seo_description', 1, 160),
        $image('field_tio2_home_og_image', 'og_image'),
        $text('field_tio2_home_primary_topic', 'primary_topic', 1, 80),
        $repeater('field_tio2_home_secondary_topics', 'secondary_topics', 0, 0, 10, [
            $text('field_tio2_home_secondary_topic', 'secondary_topic', 1, 80),
        ]),
    ];
}

function tio2_homepage_test_track_post(int $post_id): int
{
    $GLOBALS['tio2_homepage_test_post_ids'][] = $post_id;
    return $post_id;
}

function tio2_homepage_test_insert(array $postarr): int
{
    $post_id = wp_insert_post($postarr, true);
    if (is_wp_error($post_id) || $post_id <= 0) {
        tio2_homepage_test_fail('Could not create homepage test fixture');
    }
    return tio2_homepage_test_track_post((int) $post_id);
}

function tio2_homepage_test_route(string $site_id, string $path): int
{
    $post_id = tio2_homepage_test_insert([
        'post_type' => 'page',
        'post_status' => 'publish',
        'post_title' => 'Homepage test route ' . $site_id . ' ' . $path,
    ]);
    update_post_meta($post_id, 'public_path', $path);
    wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
    do_action('acf/save_post', $post_id);
    return $post_id;
}

/**
 * @return array<string, string>
 */
function tio2_homepage_test_routes(string $site_id): array
{
    $suffix = str_replace('tio2-', '', $site_id);
    $paths = [
        'secondary' => "/homepage-contract-{$suffix}-secondary",
        'product_one' => "/homepage-contract-{$suffix}-product-one",
        'product_two' => "/homepage-contract-{$suffix}-product-two",
        'application_one' => "/homepage-contract-{$suffix}-application-one",
        'application_two' => "/homepage-contract-{$suffix}-application-two",
        'application_three' => "/homepage-contract-{$suffix}-application-three",
    ];
    foreach ($paths as $path) {
        tio2_homepage_test_route($site_id, $path);
    }
    return $paths;
}

/**
 * @param mixed $value
 * @return mixed
 */
function tio2_homepage_test_normalize_field_value(string $field_key, $value)
{
    $field = acf_get_field($field_key);
    if (! is_array($field) || ! in_array($field['type'] ?? '', ['repeater', 'group'], true) || ! is_array($value)) {
        return $value;
    }
    $sub_fields = $field['sub_fields'] ?? [];
    $normalize_row = static function (array $row) use ($sub_fields): array {
        $normalized = [];
        foreach ($sub_fields as $sub_field) {
            $sub_key = $sub_field['key'];
            $sub_name = $sub_field['name'];
            if (array_key_exists($sub_key, $row)) {
                $normalized[$sub_name] = $row[$sub_key];
            } elseif (array_key_exists($sub_name, $row)) {
                $normalized[$sub_name] = $row[$sub_name];
            }
        }
        return $normalized;
    };
    if ('group' === $field['type']) {
        return $normalize_row($value);
    }
    return array_map($normalize_row, array_values($value));
}

/**
 * @param mixed $value
 */
function tio2_homepage_test_update_field(string $field_key, $value, int $post_id): void
{
    update_field($field_key, tio2_homepage_test_normalize_field_value($field_key, $value), $post_id);
}

/**
 * @param array<string, string> $routes
 */
function tio2_homepage_test_set_valid_fields(int $post_id, array $routes): void
{
    $values = [
        'field_tio2_home_schema_version' => 'homepage-v0.1',
        'field_tio2_home_hero_eyebrow' => 'Industrial titanium dioxide sourcing',
        'field_tio2_home_hero_heading' => 'Find the right titanium dioxide supply route',
        'field_tio2_home_hero_summary' => 'Compare structured product and application routes before preparing a local inquiry.',
        'field_tio2_home_hero_primary_label' => 'Prepare an inquiry',
        'field_tio2_home_hero_secondary_label' => 'Explore sourcing routes',
        'field_tio2_home_hero_secondary_path' => $routes['secondary'],
        'field_tio2_home_hero_image' => 0,
        'field_tio2_home_hero_image_alt' => '',
        'field_tio2_home_metrics' => [],
        'field_tio2_home_products_heading' => 'Product routes',
        'field_tio2_home_products_intro' => 'Review two controlled routes for local contract verification.',
        'field_tio2_home_product_routes' => [
            [
                'field_tio2_home_product_title' => 'Product route one',
                'field_tio2_home_product_summary' => 'A structured route for the first product family.',
                'field_tio2_home_product_path' => $routes['product_one'],
                'field_tio2_home_product_image' => 0,
                'field_tio2_home_product_image_alt' => '',
            ],
            [
                'field_tio2_home_product_title' => 'Product route two',
                'field_tio2_home_product_summary' => 'A structured route for the second product family.',
                'field_tio2_home_product_path' => $routes['product_two'],
                'field_tio2_home_product_image' => 0,
                'field_tio2_home_product_image_alt' => '',
            ],
        ],
        'field_tio2_home_applications_heading' => 'Application routes',
        'field_tio2_home_applications_intro' => 'Review application contexts without unsupported performance claims.',
        'field_tio2_home_applications' => [
            [
                'field_tio2_home_application_name' => 'Application one',
                'field_tio2_home_application_summary' => 'A controlled application summary.',
                'field_tio2_home_application_path' => $routes['application_one'],
                'field_tio2_home_application_image' => 0,
                'field_tio2_home_application_image_alt' => '',
            ],
            [
                'field_tio2_home_application_name' => 'Application two',
                'field_tio2_home_application_summary' => 'A second controlled application summary.',
                'field_tio2_home_application_path' => $routes['application_two'],
                'field_tio2_home_application_image' => 0,
                'field_tio2_home_application_image_alt' => '',
            ],
            [
                'field_tio2_home_application_name' => 'Application three',
                'field_tio2_home_application_summary' => 'A third controlled application summary.',
                'field_tio2_home_application_path' => $routes['application_three'],
                'field_tio2_home_application_image' => 0,
                'field_tio2_home_application_image_alt' => '',
            ],
        ],
        'field_tio2_home_inquiry_heading' => 'A clear inquiry process',
        'field_tio2_home_inquiry_steps' => [
            [
                'field_tio2_home_inquiry_step_title' => 'Describe the requirement',
                'field_tio2_home_inquiry_step_description' => 'Provide the application context and requested specification.',
            ],
            [
                'field_tio2_home_inquiry_step_title' => 'Review the route',
                'field_tio2_home_inquiry_step_description' => 'Compare owned and partner production boundaries.',
            ],
            [
                'field_tio2_home_inquiry_step_title' => 'Plan the follow-up',
                'field_tio2_home_inquiry_step_description' => 'Use a separately authorized channel for any real inquiry.',
            ],
        ],
        'field_tio2_home_trust_heading' => 'Supply boundaries made explicit',
        'field_tio2_home_trust_intro' => 'Confirmed owned production and OEM or partner production remain clearly distinguished.',
        'field_tio2_home_trust_reasons' => [
            [
                'field_tio2_home_trust_reason_title' => 'Structured review',
                'field_tio2_home_trust_reason_description' => 'Routes are organized around verified requirements.',
                'field_tio2_home_trust_reason_claim_basis' => 'user_confirmed',
                'field_tio2_home_trust_reason_evidence_url' => '',
            ],
            [
                'field_tio2_home_trust_reason_title' => 'Clear ownership',
                'field_tio2_home_trust_reason_description' => 'Production ownership is described without overstatement.',
                'field_tio2_home_trust_reason_claim_basis' => 'user_confirmed',
                'field_tio2_home_trust_reason_evidence_url' => '',
            ],
            [
                'field_tio2_home_trust_reason_title' => 'Evidence-aware copy',
                'field_tio2_home_trust_reason_description' => 'Source-backed claims retain their evidence link.',
                'field_tio2_home_trust_reason_claim_basis' => 'source_required',
                'field_tio2_home_trust_reason_evidence_url' => 'https://example.test/evidence',
            ],
        ],
        'field_tio2_home_rfq_heading' => 'Prepare a local inquiry',
        'field_tio2_home_rfq_intro' => 'This v0.1 local demo does not send or store inquiry data.',
        'field_tio2_home_rfq_labels' => [
            'field_tio2_home_rfq_label_name' => 'Name',
            'field_tio2_home_rfq_label_company' => 'Company',
            'field_tio2_home_rfq_label_country_region' => 'Country or region',
            'field_tio2_home_rfq_label_work_email' => 'Work email',
            'field_tio2_home_rfq_label_buyer_type' => 'Buyer type',
            'field_tio2_home_rfq_label_interest' => 'Product or application interest',
            'field_tio2_home_rfq_label_expected_quantity' => 'Expected quantity',
            'field_tio2_home_rfq_label_destination' => 'Destination',
            'field_tio2_home_rfq_label_message' => 'Message',
            'field_tio2_home_rfq_label_privacy' => 'I understand this local demo does not send data',
            'field_tio2_home_rfq_buyer_industrial_label' => 'Industrial buyer',
            'field_tio2_home_rfq_buyer_distributor_label' => 'Distributor',
            'field_tio2_home_rfq_buyer_other_label' => 'Other',
        ],
        'field_tio2_home_rfq_submit_label' => 'Validate inquiry locally',
        'field_tio2_home_rfq_privacy_text' => 'This local demo does not send or save the information entered.',
        'field_tio2_home_rfq_success_heading' => 'Local validation complete',
        'field_tio2_home_rfq_success_message' => 'Nothing was sent, transmitted, or saved by this local interaction.',
        'field_tio2_home_faq_heading' => 'Homepage questions',
        'field_tio2_home_faqs' => [
            [
                'field_tio2_home_faq_question' => 'Does this form send an inquiry?',
                'field_tio2_home_faq_answer' => 'No. The v0.1 form validates only in the browser.',
                'field_tio2_home_faq_related_label' => '',
                'field_tio2_home_faq_related_path' => '',
            ],
            [
                'field_tio2_home_faq_question' => 'Are production routes identical?',
                'field_tio2_home_faq_answer' => 'No. Owned production and OEM or partner routes remain distinct.',
                'field_tio2_home_faq_related_label' => '',
                'field_tio2_home_faq_related_path' => '',
            ],
            [
                'field_tio2_home_faq_question' => 'Can both sites share one homepage record?',
                'field_tio2_home_faq_answer' => 'No. Each supported site owns an independent homepage record.',
                'field_tio2_home_faq_related_label' => '',
                'field_tio2_home_faq_related_path' => '',
            ],
        ],
        'field_tio2_home_closing_heading' => 'Ready to prepare the requirement?',
        'field_tio2_home_closing_body' => 'Use the local form to check the information before any separately authorized follow-up.',
        'field_tio2_home_closing_label' => 'Prepare an inquiry',
        'field_tio2_home_seo_title' => 'Titanium dioxide sourcing routes',
        'field_tio2_home_seo_description' => 'Explore structured titanium dioxide product and application sourcing routes.',
        'field_tio2_home_og_image' => 0,
        'field_tio2_home_primary_topic' => 'titanium dioxide sourcing',
        'field_tio2_home_secondary_topics' => [
            ['field_tio2_home_secondary_topic' => 'industrial titanium dioxide'],
            ['field_tio2_home_secondary_topic' => 'application sourcing'],
        ],
    ];

    foreach ($values as $field_key => $value) {
        tio2_homepage_test_update_field($field_key, $value, $post_id);
    }
}

/**
 * @param array<string, string> $routes
 */
function tio2_homepage_test_home(
    string $site_id,
    array $routes,
    string $title = '',
    string $content = ''
): int
{
    $post_id = tio2_homepage_test_insert([
        'post_type' => 'tio2_homepage',
        'post_status' => 'draft',
        'post_title' => '' === $title ? 'Homepage contract ' . $site_id : $title,
        'post_content' => $content,
    ]);
    wp_set_object_terms($post_id, [$site_id], 'site_scope', false);
    tio2_homepage_test_set_valid_fields($post_id, $routes);
    do_action('acf/save_post', $post_id);
    clean_post_cache($post_id);
    return $post_id;
}

function tio2_homepage_test_assert_invalid(int $post_id, string $message): void
{
    $result = tio2_validate_homepage_contract($post_id);
    tio2_homepage_test_assert(is_wp_error($result), $message);
}

register_shutdown_function('tio2_homepage_test_cleanup');

$existing_homepage_ids = get_posts([
    'post_type' => 'tio2_homepage',
    'post_status' => ['publish', 'future', 'draft', 'pending', 'private', 'trash'],
    'posts_per_page' => -1,
    'fields' => 'ids',
    'no_found_rows' => true,
]);
foreach ($existing_homepage_ids as $existing_homepage_id) {
    $existing_scopes = wp_get_object_terms((int) $existing_homepage_id, 'site_scope', ['fields' => 'slugs']);
    tio2_homepage_test_assert(! is_wp_error($existing_scopes), 'Could not snapshot existing homepage scopes');
    $GLOBALS['tio2_homepage_test_existing_homepages'][(int) $existing_homepage_id] = [
        'status' => (string) get_post_status((int) $existing_homepage_id),
        'slug' => (string) get_post_field('post_name', (int) $existing_homepage_id),
        'scopes' => array_values($existing_scopes),
    ];
    wp_update_post(['ID' => (int) $existing_homepage_id, 'post_status' => 'draft']);
    wp_set_object_terms((int) $existing_homepage_id, [], 'site_scope', false);
    wp_update_post([
        'ID' => (int) $existing_homepage_id,
        'post_name' => 'homepage-test-backup-' . (int) $existing_homepage_id,
    ]);
}

if (! post_type_exists('tio2_homepage')) {
    tio2_homepage_test_fail('Missing post type: tio2_homepage');
}

$post_type = get_post_type_object('tio2_homepage');
$expected_registration = [
    'public' => false,
    'show_ui' => true,
    'show_in_rest' => true,
    'show_in_graphql' => true,
    'publicly_queryable' => false,
    'has_archive' => false,
    'rewrite' => false,
];
foreach ($expected_registration as $property => $expected_value) {
    tio2_homepage_test_assert(
        ($post_type->{$property} ?? null) === $expected_value,
        "tio2_homepage has wrong {$property} registration"
    );
}
tio2_homepage_test_assert('Tio2Homepage' === $post_type->graphql_single_name, 'Wrong homepage GraphQL single name');
tio2_homepage_test_assert('Tio2Homepages' === $post_type->graphql_plural_name, 'Wrong homepage GraphQL plural name');

$supports = array_keys(get_all_post_type_supports('tio2_homepage'));
sort($supports, SORT_STRING);
tio2_homepage_test_assert(['revisions', 'title'] === $supports, 'Homepage supports must be exactly title and revisions');

$taxonomy = get_taxonomy('site_scope');
tio2_homepage_test_assert(
    $taxonomy && in_array('tio2_homepage', $taxonomy->object_type, true),
    'site_scope is not registered for tio2_homepage'
);

tio2_homepage_test_assert(
    has_action('acf/save_post', 'tio2_enforce_homepage_from_acf') !== false,
    'Homepage enforcement is not registered on acf/save_post'
);
do_action('acf/save_post', 'options');
tio2_homepage_test_assert(
    has_action('save_post_tio2_homepage', 'tio2_enforce_homepage_contract') !== false ||
        has_action('transition_post_status', 'tio2_enforce_homepage_transition') !== false,
    'Homepage enforcement has no ACF-bypass save hook'
);

$group = acf_get_field_group('group_tio2_homepage_fields');
tio2_homepage_test_assert(is_array($group), 'Missing ACF field group: group_tio2_homepage_fields');
tio2_homepage_test_assert('homepageFields' === ($group['graphql_field_name'] ?? null), 'Wrong homepageFields GraphQL name');
tio2_homepage_test_assert(! empty($group['show_in_graphql']), 'Homepage ACF group is not in GraphQL');
$locations = $group['location'] ?? [];
tio2_homepage_test_assert(
    $locations === [[['param' => 'post_type', 'operator' => '==', 'value' => 'tio2_homepage']]],
    'Homepage ACF group has wrong location'
);

$expected_fields = tio2_homepage_test_expected_fields();
$actual_fields = acf_get_fields($group) ?: [];
tio2_homepage_test_assert(
    array_column($actual_fields, 'key') === array_column($expected_fields, 'key'),
    'Homepage ACF group has wrong top-level field keys or order'
);
foreach ($expected_fields as $index => $expected_field) {
    tio2_homepage_test_assert_field($expected_field, $actual_fields[$index]);
}

tio2_homepage_test_assert(class_exists('WPGraphQL'), 'WPGraphQL is not active');
$schema = WPGraphQL::get_schema();
$graphql_type = $schema->getType('Tio2Homepage');
tio2_homepage_test_assert(null !== $graphql_type, 'Missing GraphQL object type: Tio2Homepage');
$graphql_fields = $graphql_type->getFields();
tio2_homepage_test_assert(isset($graphql_fields['homepageFields']), 'Missing Tio2Homepage.homepageFields');
$homepage_fields_type = GraphQL\Type\Definition\Type::getNamedType($graphql_fields['homepageFields']->getType());
tio2_homepage_test_assert(
    $homepage_fields_type instanceof GraphQL\Type\Definition\ObjectType,
    'Tio2Homepage.homepageFields is not an object'
);
$homepage_graphql_fields = $homepage_fields_type->getFields();
tio2_homepage_test_assert(
    isset($homepage_graphql_fields['schemaVersion']) && ! isset($homepage_graphql_fields['homepageSchemaVersion']),
    'Homepage schema version is not exposed as homepageFields.schemaVersion'
);

foreach ([
    'tio2_homepage_internal_slug',
    'tio2_get_homepage_site_id',
    'tio2_find_homepage_ids',
    'tio2_validate_homepage_contract',
    'tio2_enforce_homepage_contract',
] as $function_name) {
    tio2_homepage_test_assert(function_exists($function_name), "Missing homepage function: {$function_name}");
}
tio2_homepage_test_assert('tio2-a--homepage' === tio2_homepage_internal_slug('tio2-a'), 'Wrong site A homepage slug');
tio2_homepage_test_assert('tio2-b--homepage' === tio2_homepage_internal_slug('tio2-b'), 'Wrong site B homepage slug');

$routes_a = tio2_homepage_test_routes('tio2-a');
$routes_b = tio2_homepage_test_routes('tio2-b');

$root_conflict = tio2_homepage_test_route('tio2-a', '/');
$conflicted_home = tio2_homepage_test_home('tio2-a', $routes_a);
wp_update_post(['ID' => $conflicted_home, 'post_status' => 'publish']);
clean_post_cache($conflicted_home);
tio2_homepage_test_assert('draft' === get_post_status($conflicted_home), 'Page/Post root owner did not block homepage publication');
tio2_homepage_test_assert(
    'tio2_homepage_root_conflict' === get_post_meta($conflicted_home, '_tio2_homepage_error', true),
    'Root conflict did not record the homepage error'
);
wp_delete_post($conflicted_home, true);
wp_delete_post($root_conflict, true);
$GLOBALS['tio2_homepage_test_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_homepage_test_post_ids'],
    [$conflicted_home, $root_conflict]
));

foreach (tio2_find_managed_route_post_ids('tio2-a', '/') as $root_owner_id) {
    $GLOBALS['tio2_homepage_test_root_meta'][$root_owner_id] = get_post_meta($root_owner_id, 'public_path', true);
    update_post_meta($root_owner_id, 'public_path', '/homepage-contract-root-backup-' . $root_owner_id);
}
foreach (tio2_find_managed_route_post_ids('tio2-b', '/') as $root_owner_id) {
    $GLOBALS['tio2_homepage_test_root_meta'][$root_owner_id] = get_post_meta($root_owner_id, 'public_path', true);
    update_post_meta($root_owner_id, 'public_path', '/homepage-contract-root-backup-' . $root_owner_id);
}

$zero_scope = tio2_homepage_test_insert([
    'post_type' => 'tio2_homepage',
    'post_status' => 'publish',
    'post_title' => 'Homepage zero scope',
]);
clean_post_cache($zero_scope);
tio2_homepage_test_assert('draft' === get_post_status($zero_scope), 'Zero scopes could publish');

$two_scopes = tio2_homepage_test_insert([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => 'Homepage two scopes',
]);
wp_set_object_terms($two_scopes, ['tio2-a', 'tio2-b'], 'site_scope', false);
wp_update_post(['ID' => $two_scopes, 'post_status' => 'publish']);
clean_post_cache($two_scopes);
tio2_homepage_test_assert('draft' === get_post_status($two_scopes), 'Two scopes could publish');

$unsupported_term = wp_insert_term('Homepage unsupported scope', 'site_scope', ['slug' => 'homepage-unsupported']);
tio2_homepage_test_assert(! is_wp_error($unsupported_term), 'Could not create unsupported scope fixture');
$GLOBALS['tio2_homepage_test_term_ids'][] = (int) $unsupported_term['term_id'];
$unsupported_scope = tio2_homepage_test_insert([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => 'Homepage unsupported scope',
]);
wp_set_object_terms($unsupported_scope, ['homepage-unsupported'], 'site_scope', false);
wp_update_post(['ID' => $unsupported_scope, 'post_status' => 'publish']);
clean_post_cache($unsupported_scope);
tio2_homepage_test_assert('draft' === get_post_status($unsupported_scope), 'Unsupported scope could publish');

$wrong_version = tio2_homepage_test_home('tio2-a', $routes_a);
tio2_homepage_test_update_field('field_tio2_home_schema_version', 'homepage-v9.9', $wrong_version);
wp_update_post(['ID' => $wrong_version, 'post_status' => 'publish']);
clean_post_cache($wrong_version);
tio2_homepage_test_assert('draft' === get_post_status($wrong_version), 'Wrong schema version could publish');

foreach ([$zero_scope, $two_scopes, $unsupported_scope, $wrong_version] as $post_id) {
    wp_delete_post($post_id, true);
}
$GLOBALS['tio2_homepage_test_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_homepage_test_post_ids'],
    [$zero_scope, $two_scopes, $unsupported_scope, $wrong_version]
));

foreach (['draft', 'pending', 'private', 'publish', 'trash'] as $owner_status) {
    $owner = tio2_homepage_test_home('tio2-a', $routes_a);
    if ('trash' === $owner_status) {
        wp_trash_post($owner);
    } elseif ('draft' !== $owner_status) {
        wp_update_post(['ID' => $owner, 'post_status' => $owner_status]);
    }
    $preserved_owner_status = get_post_status($owner);
    $duplicate_content = "Recoverable duplicate content for {$owner_status}.";
    $duplicate = tio2_homepage_test_home(
        'tio2-a',
        $routes_a,
        "Recoverable duplicate {$owner_status}",
        $duplicate_content
    );
    $duplicate_post = get_post($duplicate);
    tio2_homepage_test_assert(
        $duplicate_post instanceof WP_Post && $duplicate_content === $duplicate_post->post_content,
        "A second homepage saved against a {$owner_status} owner was not recoverable"
    );
    tio2_homepage_test_assert(
        'draft' === get_post_status($duplicate) &&
            null === tio2_get_homepage_site_id($duplicate) &&
            'tio2-a--homepage' !== get_post_field('post_name', $duplicate),
        "A second homepage saved against a {$owner_status} owner retained its claimed identity"
    );
    tio2_homepage_test_assert(
        'tio2_homepage_duplicate' === get_post_meta($duplicate, '_tio2_homepage_error', true),
        "A second homepage saved against a {$owner_status} owner did not record the duplicate error"
    );
    tio2_homepage_test_assert(
        get_post($owner) instanceof WP_Post && $preserved_owner_status === get_post_status($owner),
        "Rejecting a duplicate changed the original {$owner_status} homepage"
    );
    tio2_homepage_test_assert(
        [$owner] === tio2_find_homepage_ids('tio2-a'),
        "A second homepage saved against a {$owner_status} owner still reserved the site identity"
    );
    wp_update_post(['ID' => $duplicate, 'post_status' => 'publish']);
    clean_post_cache($duplicate);
    tio2_homepage_test_assert(
        'draft' === get_post_status($duplicate) &&
            $duplicate_content === get_post_field('post_content', $duplicate) &&
            null === tio2_get_homepage_site_id($duplicate),
        "A released duplicate against a {$owner_status} owner could publish or lost authored content"
    );
    wp_delete_post($duplicate, true);
    wp_delete_post($owner, true);
    $GLOBALS['tio2_homepage_test_post_ids'] = array_values(array_diff(
        $GLOBALS['tio2_homepage_test_post_ids'],
        [$owner, $duplicate]
    ));
}

$stale_owner = tio2_homepage_test_home('tio2-a', $routes_a);
wp_update_post(['ID' => $stale_owner, 'post_status' => 'publish']);
$stale_content = 'Recoverable stale duplicate authored content.';
$stale_duplicate = tio2_homepage_test_insert([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => 'Stale duplicate homepage',
    'post_content' => $stale_content,
]);
wp_set_object_terms($stale_duplicate, ['tio2-a'], 'site_scope', false);
tio2_homepage_test_set_valid_fields($stale_duplicate, $routes_a);
tio2_homepage_test_assert(
    [$stale_owner, $stale_duplicate] === tio2_find_homepage_ids('tio2-a'),
    'Stale duplicate fixture did not retain both claimed identities before reconciliation'
);
wp_update_post(['ID' => $stale_owner, 'post_title' => 'Saved original stale owner']);
clean_post_cache($stale_owner);
clean_post_cache($stale_duplicate);
tio2_homepage_test_assert(
    get_post($stale_owner) instanceof WP_Post && get_post($stale_duplicate) instanceof WP_Post,
    'Saving the original owner permanently deleted a stale duplicate'
);
tio2_homepage_test_assert(
    'publish' === get_post_status($stale_owner) && true === tio2_validate_homepage_contract($stale_owner),
    'Saving the original owner invalidated its homepage contract'
);
tio2_homepage_test_assert(
        'draft' === get_post_status($stale_duplicate) &&
        null === tio2_get_homepage_site_id($stale_duplicate) &&
        'tio2-a--homepage' !== get_post_field('post_name', $stale_duplicate) &&
        $stale_content === get_post_field('post_content', $stale_duplicate) &&
        'tio2_homepage_duplicate' === get_post_meta($stale_duplicate, '_tio2_homepage_error', true),
    'Stale duplicate was not recoverably released from the claimed identity'
);
tio2_homepage_test_assert(
    [$stale_owner] === tio2_find_homepage_ids('tio2-a'),
    'Stale duplicate reconciliation did not restore one homepage identity'
);
wp_delete_post($stale_duplicate, true);
wp_delete_post($stale_owner, true);
$GLOBALS['tio2_homepage_test_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_homepage_test_post_ids'],
    [$stale_owner, $stale_duplicate]
));

$revision_owner = tio2_homepage_test_home('tio2-a', $routes_a);
$revision_id = tio2_homepage_test_insert([
    'post_type' => 'revision',
    'post_status' => 'inherit',
    'post_parent' => $revision_owner,
    'post_name' => $revision_owner . '-revision-v1',
    'post_title' => 'Homepage revision fixture',
]);
$autosave_id = tio2_homepage_test_insert([
    'post_type' => 'revision',
    'post_status' => 'inherit',
    'post_parent' => $revision_owner,
    'post_name' => $revision_owner . '-autosave-v1',
    'post_title' => 'Homepage autosave fixture',
]);
tio2_homepage_test_assert((bool) wp_is_post_revision($revision_id), 'Revision fixture was not a revision');
tio2_homepage_test_assert((bool) wp_is_post_autosave($autosave_id), 'Autosave fixture was not an autosave');
tio2_homepage_test_assert(
    [$revision_owner] === tio2_find_homepage_ids('tio2-a'),
    'Revision or autosave reserved an additional homepage identity'
);
wp_delete_post($revision_owner, true);
$GLOBALS['tio2_homepage_test_post_ids'] = array_values(array_diff(
    $GLOBALS['tio2_homepage_test_post_ids'],
    [$revision_owner, $revision_id, $autosave_id]
));

$validation_home = tio2_homepage_test_home('tio2-a', $routes_a);
tio2_homepage_test_update_field('field_tio2_home_hero_heading', '   ', $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Whitespace-only required copy was accepted');
tio2_homepage_test_update_field(
    'field_tio2_home_hero_heading',
    '<strong>HTML must not be accepted</strong>',
    $validation_home
);
tio2_homepage_test_assert_invalid($validation_home, 'HTML in homepage plain text was accepted');
tio2_homepage_test_update_field(
    'field_tio2_home_hero_heading',
    'Find the right titanium dioxide supply route',
    $validation_home
);

$metric_rows = [];
for ($index = 0; $index < 5; $index++) {
    $metric_rows[] = [
        'field_tio2_home_metric_value' => (string) ($index + 1),
        'field_tio2_home_metric_unit' => '',
        'field_tio2_home_metric_label' => 'Metric ' . ($index + 1),
        'field_tio2_home_metric_context' => '',
        'field_tio2_home_metric_claim_basis' => 'user_confirmed',
        'field_tio2_home_metric_evidence_url' => '',
    ];
}
tio2_homepage_test_update_field('field_tio2_home_metrics', $metric_rows, $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Metric repeater maximum was not enforced');
tio2_homepage_test_update_field('field_tio2_home_metrics', [], $validation_home);

$duplicate_products = [
    [
        'field_tio2_home_product_title' => 'Product route one',
        'field_tio2_home_product_summary' => 'A structured route for the first product family.',
        'field_tio2_home_product_path' => $routes_a['product_one'],
        'field_tio2_home_product_image' => 0,
        'field_tio2_home_product_image_alt' => '',
    ],
    [
        'field_tio2_home_product_title' => 'Product route duplicate',
        'field_tio2_home_product_summary' => 'A duplicate path must fail.',
        'field_tio2_home_product_path' => $routes_a['product_one'],
        'field_tio2_home_product_image' => 0,
        'field_tio2_home_product_image_alt' => '',
    ],
];
tio2_homepage_test_update_field('field_tio2_home_product_routes', $duplicate_products, $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Duplicate product paths were accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

tio2_homepage_test_update_field(
    'field_tio2_home_hero_secondary_path',
    '/homepage-contract-missing-target',
    $validation_home
);
tio2_homepage_test_assert_invalid($validation_home, 'Missing current-site target was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

tio2_homepage_test_update_field(
    'field_tio2_home_hero_secondary_path',
    $routes_b['secondary'],
    $validation_home
);
tio2_homepage_test_assert_invalid($validation_home, 'Cross-site target was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$draft_link_target = tio2_homepage_test_route('tio2-a', '/homepage-contract-a-draft-target');
wp_update_post(['ID' => $draft_link_target, 'post_status' => 'draft']);
tio2_homepage_test_update_field(
    'field_tio2_home_hero_secondary_path',
    '/homepage-contract-a-draft-target',
    $validation_home
);
tio2_homepage_test_assert_invalid($validation_home, 'Draft-only current-site target was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$ambiguous_link_path = '/homepage-contract-a-ambiguous-target';
tio2_homepage_test_route('tio2-a', $ambiguous_link_path);
tio2_homepage_test_route('tio2-a', $ambiguous_link_path);
tio2_homepage_test_assert(
    count(tio2_find_managed_route_post_ids('tio2-a', $ambiguous_link_path)) > 1,
    'Ambiguous route fixture did not create multiple current-site owners'
);
tio2_homepage_test_update_field(
    'field_tio2_home_hero_secondary_path',
    $ambiguous_link_path,
    $validation_home
);
tio2_homepage_test_assert_invalid($validation_home, 'Ambiguous current-site target was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

tio2_homepage_test_update_field('field_tio2_home_hero_image_alt', 'Alt without an image', $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Image alt text without an image was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$bad_image = tio2_homepage_test_insert([
    'post_type' => 'attachment',
    'post_status' => 'inherit',
    'post_title' => 'Unsupported homepage image',
    'post_mime_type' => 'image/svg+xml',
]);
tio2_homepage_test_update_field('field_tio2_home_hero_image', $bad_image, $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Unsupported image MIME type was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$supported_image = tio2_homepage_test_insert([
    'post_type' => 'attachment',
    'post_status' => 'inherit',
    'post_title' => 'Supported homepage image',
    'post_mime_type' => 'image/jpeg',
]);
tio2_homepage_test_update_field('field_tio2_home_hero_image', $supported_image, $validation_home);
tio2_homepage_test_update_field(
    'field_tio2_home_hero_image_alt',
    'A supported homepage test image',
    $validation_home
);
tio2_homepage_test_assert(
    true === tio2_validate_homepage_contract($validation_home),
    'Supported image MIME type and informative alt text were rejected'
);
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$source_metric = [[
    'field_tio2_home_metric_value' => '1',
    'field_tio2_home_metric_unit' => '',
    'field_tio2_home_metric_label' => 'Sourced metric',
    'field_tio2_home_metric_context' => '',
    'field_tio2_home_metric_claim_basis' => 'source_required',
    'field_tio2_home_metric_evidence_url' => '',
]];
tio2_homepage_test_update_field('field_tio2_home_metrics', $source_metric, $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Required evidence URL was not enforced');
$source_metric[0]['field_tio2_home_metric_evidence_url'] = 'http://example.test/evidence';
tio2_homepage_test_update_field('field_tio2_home_metrics', $source_metric, $validation_home);
tio2_homepage_test_assert_invalid($validation_home, 'Non-HTTPS evidence URL was accepted');
tio2_homepage_test_set_valid_fields($validation_home, $routes_a);

$valid_a = $validation_home;
$valid_b = tio2_homepage_test_home('tio2-b', $routes_b);
$prepublish_a = tio2_validate_homepage_contract($valid_a);
$prepublish_b = tio2_validate_homepage_contract($valid_b);
tio2_homepage_test_assert(
    true === $prepublish_a,
    'Valid site A homepage failed before publish: ' .
        (is_wp_error($prepublish_a) ? $prepublish_a->get_error_message() : 'unknown')
);
tio2_homepage_test_assert(
    true === $prepublish_b,
    'Valid site B homepage failed before publish: ' .
        (is_wp_error($prepublish_b) ? $prepublish_b->get_error_message() : 'unknown')
);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);
wp_update_post(['ID' => $valid_b, 'post_status' => 'publish']);
clean_post_cache($valid_a);
clean_post_cache($valid_b);
$valid_a_result = tio2_validate_homepage_contract($valid_a);
$valid_b_result = tio2_validate_homepage_contract($valid_b);
tio2_homepage_test_assert(
    'publish' === get_post_status($valid_a),
    'Valid site A homepage did not publish; recorded=' .
        get_post_meta($valid_a, '_tio2_homepage_error', true) .
        '; current=' . (is_wp_error($valid_a_result) ? $valid_a_result->get_error_code() : 'valid')
);
tio2_homepage_test_assert(
    'publish' === get_post_status($valid_b),
    'Valid site B homepage did not publish; recorded=' .
        get_post_meta($valid_b, '_tio2_homepage_error', true) .
        '; current=' . (is_wp_error($valid_b_result) ? $valid_b_result->get_error_code() : 'valid')
);
tio2_homepage_test_assert('tio2-a--homepage' === get_post_field('post_name', $valid_a), 'Site A homepage slug drifted');
tio2_homepage_test_assert('tio2-b--homepage' === get_post_field('post_name', $valid_b), 'Site B homepage slug drifted');
tio2_homepage_test_assert('tio2-a' === tio2_get_homepage_site_id($valid_a), 'Site A homepage identity is wrong');
tio2_homepage_test_assert('tio2-b' === tio2_get_homepage_site_id($valid_b), 'Site B homepage identity is wrong');
tio2_homepage_test_assert(function_exists('graphql'), 'WPGraphQL query helper is unavailable');
$homepage_graphql_query = static function (string $slug): array {
    $result = graphql([
        'query' => sprintf(
            'query { homepage: tio2Homepage(id: %s, idType: SLUG) { databaseId slug status } }',
            wp_json_encode($slug)
        ),
    ]);

    return is_array($result) ? $result : [];
};
$published_graphql = $homepage_graphql_query('tio2-b--homepage');
tio2_homepage_test_assert(
    $valid_b === (int) ($published_graphql['data']['homepage']['databaseId'] ?? 0),
    'Published homepage did not resolve through the real WPGraphQL single-node contract'
);
global $wpdb;
foreach (['draft', 'future', 'pending', 'private'] as $non_public_status) {
    $wpdb->update(
        $wpdb->posts,
        ['post_status' => $non_public_status],
        ['ID' => $valid_b],
        ['%s'],
        ['%d']
    );
    clean_post_cache($valid_b);
    $non_public_graphql = $homepage_graphql_query('tio2-b--homepage');
    tio2_homepage_test_assert(
        null === ($non_public_graphql['data']['homepage'] ?? null),
        "Homepage with {$non_public_status} status was exposed by the public WPGraphQL contract"
    );
}
$wpdb->update(
    $wpdb->posts,
    ['post_status' => 'publish'],
    ['ID' => $valid_b],
    ['%s'],
    ['%d']
);
clean_post_cache($valid_b);
tio2_homepage_test_assert(
    'homepage-v0.1' === get_field('homepage_schema_version', $valid_a, false),
    'Fixed homepage schema version is not registered'
);

$acf_intermediate_status = null;
$acf_batch_update = static function ($post_id) use ($valid_a, &$acf_intermediate_status): void {
    if ((int) $post_id !== $valid_a) {
        return;
    }
    update_post_meta($valid_a, 'hero_heading', '');
    clean_post_cache($valid_a);
    $acf_intermediate_status = get_post_status($valid_a);
    update_post_meta($valid_a, 'hero_heading', 'Valid final ACF heading');
};
add_action('acf/save_post', $acf_batch_update, 10);
do_action('acf/save_post', $valid_a);
remove_action('acf/save_post', $acf_batch_update, 10);
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    'publish' === $acf_intermediate_status && 'publish' === get_post_status($valid_a),
    'ACF multi-field lifecycle enforced an invalid intermediate state before the final valid boundary'
);

$status_failure_slug = (string) get_post_field('post_name', $valid_a);
$status_failure_content = (string) get_post_field('post_content', $valid_a);
global $wpdb;
$wpdb->update(
    $wpdb->postmeta,
    ['meta_value' => '<em>Injected invalid homepage heading</em>'],
    ['post_id' => $valid_a, 'meta_key' => 'hero_heading'],
    ['%s'],
    ['%d', '%s']
);
if (function_exists('acf_flush_value_cache')) {
    acf_flush_value_cache($valid_a, 'hero_heading');
}
$inject_status_failure = static fn ($force_failure, $post_id, $post_status): bool =>
    (int) $post_id === $valid_a && 'draft' === $post_status ? true : (bool) $force_failure;
add_filter('tio2_homepage_force_status_update_failure', $inject_status_failure, 10, 3);
$status_failure_result = tio2_enforce_homepage_contract($valid_a);
remove_filter('tio2_homepage_force_status_update_failure', $inject_status_failure, 10);
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    is_wp_error($status_failure_result) &&
        'tio2_homepage_status_write_failed' === $status_failure_result->get_error_code(),
    'Homepage status write failure was not propagated to the enforcement caller'
);
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a),
    'Homepage status write failure left an invalid homepage published'
);
tio2_homepage_test_assert(
    $status_failure_slug === get_post_field('post_name', $valid_a) &&
        $status_failure_content === get_post_field('post_content', $valid_a),
    'Homepage status write compensation changed slug or content'
);
global $wpdb;
$wpdb->update(
    $wpdb->posts,
    ['post_status' => 'publish'],
    ['ID' => $valid_a],
    ['%s'],
    ['%d']
);
clean_post_cache($valid_a);
$invalid_published_graphql = $homepage_graphql_query('tio2-a--homepage');
tio2_homepage_test_assert(
    null === ($invalid_published_graphql['data']['homepage'] ?? null),
    'Public GraphQL exposed an invalid homepage after the status error boundary'
);
tio2_homepage_test_set_valid_fields($valid_a, $routes_a);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);
$normal_status_slug = (string) get_post_field('post_name', $valid_a);
$normal_status_content = (string) get_post_field('post_content', $valid_a);
$normal_status_result = tio2_set_homepage_status_exact($valid_a, 'draft');
tio2_homepage_test_assert(true === $normal_status_result, 'Normal exact homepage status update did not report success');
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a) &&
        $normal_status_slug === get_post_field('post_name', $valid_a) &&
        $normal_status_content === get_post_field('post_content', $valid_a),
    'Normal exact homepage status update changed identity or content'
);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

update_post_meta($valid_a, 'hero_heading', '<em>Direct meta HTML</em>');
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a) &&
        'tio2_homepage_invalid_field' === get_post_meta($valid_a, '_tio2_homepage_error', true),
    'Direct homepage field meta mutation bypassed final enforcement'
);
tio2_homepage_test_set_valid_fields($valid_a, $routes_a);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

wp_set_object_terms($valid_a, [], 'site_scope', false);
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a),
    'Direct homepage site_scope mutation bypassed final enforcement'
);
wp_set_object_terms($valid_a, ['tio2-a'], 'site_scope', false);
tio2_homepage_test_set_valid_fields($valid_a, $routes_a);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

$dependent_target_id = tio2_find_managed_route_post_ids('tio2-a', $routes_a['secondary'])[0] ?? 0;
tio2_homepage_test_assert($dependent_target_id > 0, 'Missing homepage dependency fixture');

wp_update_post(['ID' => $dependent_target_id, 'post_status' => 'draft']);
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Drafted link target left homepage published');
wp_update_post(['ID' => $dependent_target_id, 'post_status' => 'publish']);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

update_post_meta($dependent_target_id, 'public_path', '/homepage-contract-a-moved-target');
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Moved link target left homepage published');
update_post_meta($dependent_target_id, 'public_path', $routes_a['secondary']);
do_action('acf/save_post', $dependent_target_id);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

wp_trash_post($dependent_target_id);
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Trashed link target left homepage published');
wp_untrash_post($dependent_target_id);
wp_update_post(['ID' => $dependent_target_id, 'post_status' => 'publish']);
do_action('acf/save_post', $dependent_target_id);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

wp_set_object_terms($dependent_target_id, ['tio2-b'], 'site_scope', false);
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Reassigned link target left homepage published');
wp_set_object_terms($dependent_target_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', $dependent_target_id);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

wp_remove_object_terms($dependent_target_id, 'tio2-a', 'site_scope');
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a),
    'Direct site_scope term removal left a dependent homepage published'
);
wp_set_object_terms($dependent_target_id, ['tio2-a'], 'site_scope', false);
do_action('acf/save_post', $dependent_target_id);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

$dependent_original_slug = (string) get_post_field('post_name', $dependent_target_id);
wp_update_post(['ID' => $dependent_target_id, 'post_name' => 'directly-moved-link-target']);
clean_post_cache($valid_a);
tio2_homepage_test_assert(
    'draft' === get_post_status($valid_a),
    'Direct Page/Post post_name change left a dependent homepage published'
);
wp_update_post(['ID' => $dependent_target_id, 'post_name' => $dependent_original_slug]);
do_action('acf/save_post', $dependent_target_id);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

global $wpdb;
$wpdb->update(
    $wpdb->posts,
    ['post_name' => 'raw-wrong-link-target-slug'],
    ['ID' => $dependent_target_id],
    ['%s'],
    ['%d']
);
clean_post_cache($dependent_target_id);
$wrong_target_slug_result = tio2_validate_homepage_contract($valid_a);
tio2_homepage_test_assert(
    is_wp_error($wrong_target_slug_result) &&
        'tio2_homepage_invalid_field' === $wrong_target_slug_result->get_error_code(),
    'Homepage link validation accepted a target whose actual slug was not deterministic'
);
$wpdb->update(
    $wpdb->posts,
    ['post_name' => $dependent_original_slug],
    ['ID' => $dependent_target_id],
    ['%s'],
    ['%d']
);
clean_post_cache($dependent_target_id);

tio2_homepage_test_update_field('field_tio2_home_hero_heading', '   ', $valid_a);
do_action('acf/save_post', $valid_a);
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'ACF save bypassed homepage enforcement');
tio2_homepage_test_set_valid_fields($valid_a, $routes_a);
do_action('acf/save_post', $valid_a);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);

tio2_homepage_test_update_field('field_tio2_home_hero_heading', '   ', $valid_a);
$previous_acf_post = $_POST['acf'] ?? null;
$_POST['acf'] = ['ambient' => 'spoofed'];
wp_update_post(['ID' => $valid_a, 'post_title' => 'Ambient ACF POST save']);
if (null === $previous_acf_post) {
    unset($_POST['acf']);
} else {
    $_POST['acf'] = $previous_acf_post;
}
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Ambient ACF POST state bypassed save enforcement');

tio2_homepage_test_set_valid_fields($valid_a, $routes_a);
do_action('acf/save_post', $valid_a);
wp_update_post(['ID' => $valid_a, 'post_status' => 'publish']);
tio2_homepage_test_update_field('field_tio2_home_hero_heading', '   ', $valid_a);
if (! defined('REST_REQUEST')) {
    define('REST_REQUEST', true);
}
tio2_homepage_test_assert(REST_REQUEST, 'Homepage test could not enter an unrelated REST request context');
wp_update_post(['ID' => $valid_a, 'post_title' => 'Unrelated REST programmatic save']);
clean_post_cache($valid_a);
tio2_homepage_test_assert('draft' === get_post_status($valid_a), 'Unrelated REST context bypassed save enforcement');

tio2_homepage_test_cleanup();
fwrite(STDOUT, "TiO2 homepage identity and field contract passed\n");
