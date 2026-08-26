<?php

if (! defined('ABSPATH')) {
    exit(1);
}

$GLOBALS['tio2_homepage_v02_test_post_ids'] = [];
$GLOBALS['tio2_homepage_v02_test_existing_homepages'] = [];
$GLOBALS['tio2_homepage_v02_test_root_meta'] = [];

function tio2_homepage_v02_test_cleanup(): void
{
    foreach ($GLOBALS['tio2_homepage_v02_test_post_ids'] ?? [] as $post_id) {
        if (get_post((int) $post_id)) {
            wp_delete_post((int) $post_id, true);
        }
    }
    $GLOBALS['tio2_homepage_v02_test_post_ids'] = [];

    foreach ($GLOBALS['tio2_homepage_v02_test_existing_homepages'] ?? [] as $post_id => $snapshot) {
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
    $GLOBALS['tio2_homepage_v02_test_existing_homepages'] = [];

    foreach ($GLOBALS['tio2_homepage_v02_test_root_meta'] ?? [] as $post_id => $public_path) {
        if (get_post((int) $post_id)) {
            update_post_meta((int) $post_id, 'public_path', (string) $public_path);
        }
    }
    $GLOBALS['tio2_homepage_v02_test_root_meta'] = [];
    $GLOBALS['tio2_webhook_queue'] = [];
}

function tio2_homepage_v02_test_fail(string $message): void
{
    tio2_homepage_v02_test_cleanup();
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_homepage_v02_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        tio2_homepage_v02_test_fail($message);
    }
}

/**
 * @param mixed $value
 */
function tio2_homepage_v02_test_update_field(string $field_key, $value, int $post_id): void
{
    $field = acf_get_field($field_key);
    if (is_array($field) && in_array($field['type'] ?? '', ['repeater', 'group'], true) && is_array($value)) {
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
        $value = 'group' === $field['type']
            ? $normalize_row($value)
            : array_map($normalize_row, array_values($value));
    }
    update_field($field_key, $value, $post_id);
    if (function_exists('acf_flush_value_cache')) {
        acf_flush_value_cache($post_id, (string) ($field['name'] ?? ''));
    }
}

/**
 * @return array<string, mixed>
 */
function tio2_homepage_v02_test_valid_values(): array
{
    return [
        'field_tio2_home_schema_version' => 'homepage-v0.2-editorial-geo',
        'field_tio2_home_hero_eyebrow' => 'Titanium dioxide sourcing context',
        'field_tio2_home_hero_heading' => 'Evaluate a titanium dioxide supply route',
        'field_tio2_home_hero_summary' => 'A synthetic local editorial fixture for comparing sourcing questions without production claims.',
        'field_tio2_home_hero_image' => 0,
        'field_tio2_home_hero_image_alt' => '',
        'field_tio2_home_closing_heading' => 'Clarify the sourcing context',
        'field_tio2_home_closing_body' => 'Prepare the application context and evidence questions for a separately authorized follow-up.',
        'field_tio2_home_closing_label' => 'Prepare an inquiry',
        'field_tio2_home_seo_title' => 'Titanium dioxide sourcing evaluation',
        'field_tio2_home_seo_description' => 'Review a synthetic editorial framework for evaluating titanium dioxide supply routes.',
        'field_tio2_home_og_image' => 0,
        'field_tio2_home_primary_topic' => 'titanium dioxide sourcing evaluation',
        'field_tio2_home_secondary_topics' => [
            ['secondary_topic' => 'supply route comparison'],
        ],
        'field_tio2_geo_header_rfq_label' => 'Prepare an inquiry',
        'field_tio2_geo_direct_answer_question' => 'What should a buyer clarify before sourcing titanium dioxide?',
        'field_tio2_geo_direct_answer_lead' => 'Start with application context, evidence boundaries, and supply-route ownership.',
        'field_tio2_geo_direct_answer_body' => 'This synthetic demo organizes questions for local editorial review and does not assert production performance.',
        'field_tio2_geo_decision_questions' => [[
            'decision_number' => '01',
            'decision_question' => 'Which application context is being evaluated?',
            'decision_answer' => 'Record the intended context before comparing documents or routes.',
        ]],
        'field_tio2_geo_application_briefs' => [[
            'application_name' => 'Coatings context',
            'application_summary' => 'A synthetic application brief for editorial structure testing.',
            'application_considerations' => 'Confirm requirements with appropriate technical documentation.',
        ]],
        'field_tio2_geo_supply_routes' => [[
            'route_name' => 'Synthetic comparison route',
            'route_meaning' => 'A demo-only route description.',
            'buyer_verification' => 'Ask who owns production and supporting documents.',
            'documentation_context' => 'Review documents within their stated applicability.',
            'claim_basis' => 'synthetic_demo',
            'evidence_url' => '',
        ]],
        'field_tio2_geo_evidence_items' => [[
            'document_type' => 'Synthetic document type',
            'document_title' => 'Synthetic local evidence example',
            'document_summary' => 'A demo record used only to exercise the editorial contract.',
            'applicability' => 'Local experimental content only',
            'revision_label' => 'demo',
            'evidence_url' => '',
            'verification_status' => 'demo',
        ]],
        'field_tio2_geo_evaluation_steps' => [[
            'method_number' => '01',
            'method_title' => 'Frame the question',
            'method_description' => 'Record the application and evidence context before comparing routes.',
        ]],
        'field_tio2_geo_faqs' => [
            ['faq_question' => 'Is this a production claim?', 'faq_answer' => 'No. It is synthetic demo content.'],
            ['faq_question' => 'Does this send an inquiry?', 'faq_answer' => 'No. No submission behavior is introduced.'],
            ['faq_question' => 'Should source context be checked?', 'faq_answer' => 'Yes. Review applicability and evidence boundaries.'],
        ],
        'field_tio2_geo_glossary_items' => [],
        'field_tio2_geo_editorial_reviewed_at' => '2026-08-26T00:00:00.000Z',
        'field_tio2_geo_editorial_reviewed_by' => 'Synthetic local editorial review',
        'field_tio2_geo_editorial_review_scope' => 'Local experimental content only',
    ];
}

function tio2_homepage_v02_test_set_valid_fields(int $post_id): void
{
    foreach (tio2_homepage_v02_test_valid_values() as $field_key => $value) {
        tio2_homepage_v02_test_update_field($field_key, $value, $post_id);
    }
}

function tio2_homepage_v02_test_assert_error(int $post_id, string $expected_code, string $message): void
{
    $result = tio2_validate_homepage_contract($post_id);
    tio2_homepage_v02_test_assert(
        is_wp_error($result) && $expected_code === $result->get_error_code(),
        $message . '; received=' . (is_wp_error($result) ? $result->get_error_code() : 'valid')
    );
}

register_shutdown_function('tio2_homepage_v02_test_cleanup');

tio2_homepage_v02_test_assert(
    function_exists('tio2_supported_site_ids'),
    'Missing supported site registry.'
);
tio2_homepage_v02_test_assert(
    ['tio2-a', 'tio2-b'] === tio2_supported_site_ids(),
    'Supported site IDs drifted.'
);
tio2_homepage_v02_test_assert(
    'homepage-v0.2-editorial-geo' === tio2_expected_homepage_schema_version('tio2-a'),
    'Site A schema mapping is wrong.'
);
tio2_homepage_v02_test_assert(
    'homepage-v0.1' === tio2_expected_homepage_schema_version('tio2-b'),
    'Site B schema mapping is wrong.'
);
tio2_homepage_v02_test_assert(
    null === tio2_expected_homepage_schema_version('unknown'),
    'Unknown site schema mapping must fail closed.'
);

$group = acf_get_field_group('group_tio2_homepage_editorial_geo');
tio2_homepage_v02_test_assert(is_array($group), 'Missing v0.2 editorial GEO field group.');
tio2_homepage_v02_test_assert(
    'editorialGeoFields' === ($group['graphql_field_name'] ?? null) && ! empty($group['show_in_graphql']),
    'The v0.2 GraphQL field group contract is wrong.'
);
$fields = acf_get_fields($group);
tio2_homepage_v02_test_assert(is_array($fields), 'Could not load v0.2 editorial GEO fields.');
$expected_top_level = [
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
tio2_homepage_v02_test_assert(
    $expected_top_level === array_column($fields, 'name'),
    'The v0.2 top-level field order or names drifted.'
);
$fields_by_name = array_column($fields, null, 'name');
$expected_repeaters = [
    'decision_questions' => [1, 12, ['decision_number', 'decision_question', 'decision_answer']],
    'application_briefs' => [1, 12, ['application_name', 'application_summary', 'application_considerations']],
    'supply_routes' => [1, 6, ['route_name', 'route_meaning', 'buyer_verification', 'documentation_context', 'claim_basis', 'evidence_url']],
    'evidence_items' => [0, 12, ['document_type', 'document_title', 'document_summary', 'applicability', 'revision_label', 'evidence_url', 'verification_status']],
    'evaluation_steps' => [1, 10, ['method_number', 'method_title', 'method_description']],
    'geo_faqs' => [3, 20, ['faq_question', 'faq_answer']],
    'glossary_items' => [0, 30, ['term', 'definition']],
];
foreach ($expected_repeaters as $name => [$min, $max, $sub_names]) {
    $field = $fields_by_name[$name] ?? [];
    tio2_homepage_v02_test_assert(
        'repeater' === ($field['type'] ?? null) && $min === ($field['min'] ?? null) && $max === ($field['max'] ?? null),
        "The {$name} repeater bounds drifted."
    );
    tio2_homepage_v02_test_assert(
        $sub_names === array_column($field['sub_fields'] ?? [], 'name'),
        "The {$name} subfield contract drifted."
    );
}
tio2_homepage_v02_test_assert(
    ['synthetic_demo', 'user_confirmed', 'source_document'] ===
        array_keys($fields_by_name['supply_routes']['sub_fields'][4]['choices'] ?? []),
    'Supply route claim basis choices drifted.'
);
tio2_homepage_v02_test_assert(
    ['demo', 'needs_review', 'verified'] ===
        array_keys($fields_by_name['evidence_items']['sub_fields'][6]['choices'] ?? []),
    'Evidence verification choices drifted.'
);
tio2_homepage_v02_test_assert(
    24 === ($fields_by_name['editorial_reviewed_at']['maxlength'] ?? null) &&
        1 === ($fields_by_name['editorial_reviewed_at']['required'] ?? null),
    'Editorial reviewed-at field must be required normalized text.'
);
foreach ($fields as $field) {
    $condition = $field['conditional_logic'][0][0] ?? [];
    tio2_homepage_v02_test_assert(
        'field_tio2_home_schema_version' === ($condition['field'] ?? null) &&
            '==' === ($condition['operator'] ?? null) &&
            'homepage-v0.2-editorial-geo' === ($condition['value'] ?? null),
        'A v0.2 field is visible outside the Site A schema condition.'
    );
}

$existing_homepage_ids = get_posts([
    'post_type' => 'tio2_homepage',
    'post_status' => ['publish', 'future', 'draft', 'pending', 'private', 'trash'],
    'posts_per_page' => -1,
    'fields' => 'ids',
    'no_found_rows' => true,
]);
foreach ($existing_homepage_ids as $existing_homepage_id) {
    $scopes = wp_get_object_terms((int) $existing_homepage_id, 'site_scope', ['fields' => 'slugs']);
    tio2_homepage_v02_test_assert(! is_wp_error($scopes), 'Could not snapshot an existing Homepage.');
    $GLOBALS['tio2_homepage_v02_test_existing_homepages'][(int) $existing_homepage_id] = [
        'status' => (string) get_post_status((int) $existing_homepage_id),
        'slug' => (string) get_post_field('post_name', (int) $existing_homepage_id),
        'scopes' => array_values($scopes),
    ];
    wp_update_post(['ID' => (int) $existing_homepage_id, 'post_status' => 'draft']);
    wp_set_object_terms((int) $existing_homepage_id, [], 'site_scope', false);
    wp_update_post([
        'ID' => (int) $existing_homepage_id,
        'post_name' => 'homepage-v02-test-backup-' . (int) $existing_homepage_id,
    ]);
}

$root_owner_ids = get_posts([
    'post_type' => ['page', 'post'],
    'post_status' => ['publish', 'future', 'draft', 'pending', 'private'],
    'posts_per_page' => -1,
    'fields' => 'ids',
    'no_found_rows' => true,
    'meta_key' => 'public_path',
    'meta_value' => '/',
]);
foreach ($root_owner_ids as $root_owner_id) {
    $GLOBALS['tio2_homepage_v02_test_root_meta'][(int) $root_owner_id] = '/';
    update_post_meta((int) $root_owner_id, 'public_path', '/homepage-v02-test-root-backup-' . (int) $root_owner_id);
}

$post_id = wp_insert_post([
    'post_type' => 'tio2_homepage',
    'post_status' => 'draft',
    'post_title' => 'Homepage v0.2 contract fixture',
], true);
tio2_homepage_v02_test_assert(! is_wp_error($post_id) && $post_id > 0, 'Could not create the Site A v0.2 fixture.');
$post_id = (int) $post_id;
$GLOBALS['tio2_homepage_v02_test_post_ids'][] = $post_id;
wp_set_object_terms($post_id, ['tio2-a'], 'site_scope', false);
wp_update_post(['ID' => $post_id, 'post_name' => 'tio2-a--homepage']);
tio2_homepage_v02_test_set_valid_fields($post_id);
clean_post_cache($post_id);

$valid = tio2_validate_homepage_contract($post_id);
tio2_homepage_v02_test_assert(
    true === $valid,
    'The complete Site A v0.2 fixture failed: ' . (is_wp_error($valid) ? $valid->get_error_message() : 'unknown')
);

tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field(
    'field_tio2_geo_direct_answer_lead',
    "Compare 1 < 2 and 3 > 2.\u{0085}Keep punctuation.",
    $post_id
);
$plain_comparison = tio2_validate_homepage_contract($post_id);
tio2_homepage_v02_test_assert(
    true === $plain_comparison,
    'Plain comparison symbols or C1 text were rejected by the WordPress contract.'
);

$parity_failures = [];
$forbidden_evidence_cases = [
    ['field_tio2_geo_supply_routes', 'https://example.test/products', 'literal product root in supply routes'],
    ['field_tio2_geo_supply_routes', 'https://example.test/%70roducts/rutile', 'encoded product segment in supply routes'],
    ['field_tio2_geo_supply_routes', 'https://example.test/review/../applications', 'dot-normalized application root in supply routes'],
    ['field_tio2_geo_evidence_items', 'https://example.test/applications/review', 'literal application descendant in evidence items'],
    ['field_tio2_geo_evidence_items', 'https://example.test/%61pplications', 'encoded application segment in evidence items'],
    ['field_tio2_geo_evidence_items', 'https://example.test/review/../products/rutile', 'dot-normalized product descendant in evidence items'],
];
foreach ($forbidden_evidence_cases as [$field_key, $evidence_url, $label]) {
    tio2_homepage_v02_test_set_valid_fields($post_id);
    $rows = tio2_homepage_v02_test_valid_values()[$field_key];
    $rows[0]['evidence_url'] = $evidence_url;
    if ('field_tio2_geo_supply_routes' === $field_key) {
        $rows[0]['claim_basis'] = 'source_document';
    } else {
        $rows[0]['verification_status'] = 'needs_review';
    }
    tio2_homepage_v02_test_update_field($field_key, $rows, $post_id);
    $result = tio2_validate_homepage_contract($post_id);
    if (! is_wp_error($result) || 'tio2_homepage_invalid_evidence' !== $result->get_error_code()) {
        $parity_failures[] = "Accepted {$label}";
    }
}

$raw_backslash = chr(92);
$backslash_evidence_cases = [
    ['field_tio2_geo_supply_routes', "https://example.test/products{$raw_backslash}rutile", 'forbidden-route supply URL containing a raw backslash'],
    ['field_tio2_geo_supply_routes', "https://example.test/evidence{$raw_backslash}supply-route.pdf", 'allowed-looking supply URL containing a raw backslash'],
    ['field_tio2_geo_evidence_items', "https://example.test/applications{$raw_backslash}coatings", 'forbidden-route evidence-item URL containing a raw backslash'],
    ['field_tio2_geo_evidence_items', "https://example.test/evidence{$raw_backslash}source-document.pdf", 'allowed-looking evidence-item URL containing a raw backslash'],
];
foreach ($backslash_evidence_cases as [$field_key, $evidence_url, $label]) {
    tio2_homepage_v02_test_set_valid_fields($post_id);
    $rows = tio2_homepage_v02_test_valid_values()[$field_key];
    $rows[0]['evidence_url'] = wp_slash($evidence_url);
    if ('field_tio2_geo_supply_routes' === $field_key) {
        $rows[0]['claim_basis'] = 'source_document';
    } else {
        $rows[0]['verification_status'] = 'needs_review';
    }
    tio2_homepage_v02_test_update_field($field_key, $rows, $post_id);
    $result = tio2_validate_homepage_contract($post_id);
    if (! is_wp_error($result) || 'tio2_homepage_invalid_evidence' !== $result->get_error_code()) {
        $parity_failures[] = "Accepted {$label}";
    }
}

$allowed_evidence_cases = [
    ['field_tio2_geo_supply_routes', 'https://example.test/documents/products-route.pdf', 'product word in a supply-route document name'],
    ['field_tio2_geo_evidence_items', 'https://example.test/evidence/applications-review.pdf', 'application word in an evidence-item document name'],
    ['field_tio2_geo_supply_routes', 'https://example.test/evidence?next=/products#applications', 'forbidden words outside a supply-route pathname'],
    ['field_tio2_geo_evidence_items', 'https://example.test/evidence?next=/applications#products', 'forbidden words outside an evidence-item pathname'],
];
foreach ($allowed_evidence_cases as [$field_key, $evidence_url, $label]) {
    tio2_homepage_v02_test_set_valid_fields($post_id);
    $rows = tio2_homepage_v02_test_valid_values()[$field_key];
    $rows[0]['evidence_url'] = $evidence_url;
    if ('field_tio2_geo_supply_routes' === $field_key) {
        $rows[0]['claim_basis'] = 'source_document';
    } else {
        $rows[0]['verification_status'] = 'needs_review';
    }
    tio2_homepage_v02_test_update_field($field_key, $rows, $post_id);
    $result = tio2_validate_homepage_contract($post_id);
    if (true !== $result) {
        $parity_failures[] = "Rejected {$label}";
    }
}

$distinct_decisions = [
    ['decision_number' => 'A 01', 'decision_question' => 'Which route is first?', 'decision_answer' => 'Review the first route.'],
    ['decision_number' => 'A 02', 'decision_question' => 'Which route is second?', 'decision_answer' => 'Review the second route.'],
];
tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_geo_decision_questions', $distinct_decisions, $post_id);
if (true !== tio2_validate_homepage_contract($post_id)) {
    $parity_failures[] = 'Rejected distinct decision rows';
}

$duplicate_decision_cases = [
    [[
        ['decision_number' => '01', 'decision_question' => 'First question?', 'decision_answer' => 'First answer.'],
        ['decision_number' => '01', 'decision_question' => 'Second question?', 'decision_answer' => 'Second answer.'],
    ], 'duplicate decision numbers'],
    [[
        ['decision_number' => '01', 'decision_question' => 'Same question?', 'decision_answer' => 'First answer.'],
        ['decision_number' => '02', 'decision_question' => 'Same question?', 'decision_answer' => 'Second answer.'],
    ], 'duplicate decision questions'],
    [[
        ['decision_number' => 'Step 01', 'decision_question' => 'First question?', 'decision_answer' => 'First answer.'],
        ['decision_number' => " step\u{0085}01 ", 'decision_question' => 'Second question?', 'decision_answer' => 'Second answer.'],
    ], 'case/whitespace-normalized decision numbers'],
    [[
        ['decision_number' => '01', 'decision_question' => 'Which route?', 'decision_answer' => 'First answer.'],
        ['decision_number' => '02', 'decision_question' => " WHICH\tROUTE? ", 'decision_answer' => 'Second answer.'],
    ], 'case/whitespace-normalized decision questions'],
];
foreach ($duplicate_decision_cases as [$decision_rows, $label]) {
    tio2_homepage_v02_test_set_valid_fields($post_id);
    tio2_homepage_v02_test_update_field('field_tio2_geo_decision_questions', $decision_rows, $post_id);
    $result = tio2_validate_homepage_contract($post_id);
    if (! is_wp_error($result) || 'tio2_homepage_invalid_field' !== $result->get_error_code()) {
        $parity_failures[] = "Accepted {$label}";
    }
}
tio2_homepage_v02_test_assert(
    [] === $parity_failures,
    'WordPress/DTO v0.2 publication parity failed: ' . implode('; ', $parity_failures)
);

$mutations = [
    ['field_tio2_home_schema_version', 'homepage-v0.1', 'tio2_homepage_invalid_schema_version', 'Wrong Site A schema version was accepted.'],
    ['field_tio2_geo_direct_answer_body', '', 'tio2_homepage_invalid_field', 'Empty direct answer was accepted.'],
    ['field_tio2_geo_decision_questions', [], 'tio2_homepage_invalid_rows', 'Zero decision rows were accepted.'],
    ['field_tio2_geo_decision_questions', array_fill(0, 13, [
        'decision_number' => '01',
        'decision_question' => 'Synthetic decision question?',
        'decision_answer' => 'Synthetic decision answer.',
    ]), 'tio2_homepage_invalid_rows', 'Thirteen decision rows were accepted.'],
    ['field_tio2_geo_supply_routes', [[
        'route_name' => 'Source-backed route',
        'route_meaning' => 'Synthetic route meaning.',
        'buyer_verification' => 'Review the source.',
        'documentation_context' => 'Use within the stated context.',
        'claim_basis' => 'source_document',
        'evidence_url' => 'http://example.test/evidence',
    ]], 'tio2_homepage_invalid_evidence', 'A source document without HTTPS evidence was accepted.'],
    ['field_tio2_geo_evidence_items', [[
        'document_type' => 'Synthetic document',
        'document_title' => 'Synthetic verified item',
        'document_summary' => 'A validation fixture.',
        'applicability' => 'Local test only',
        'revision_label' => '',
        'evidence_url' => '',
        'verification_status' => 'verified',
    ]], 'tio2_homepage_invalid_evidence', 'Verified evidence without URL was accepted.'],
    ['field_tio2_geo_faqs', [
        ['faq_question' => 'Duplicate question?', 'faq_answer' => 'First answer.'],
        ['faq_question' => ' duplicate QUESTION? ', 'faq_answer' => 'Second answer.'],
        ['faq_question' => 'Distinct question?', 'faq_answer' => 'Third answer.'],
    ], 'tio2_homepage_invalid_field', 'Duplicate normalized FAQ questions were accepted.'],
    ['field_tio2_geo_glossary_items', [
        ['term' => 'Rutile', 'definition' => 'First definition.'],
        ['term' => ' rutile ', 'definition' => 'Second definition.'],
    ], 'tio2_homepage_invalid_field', 'Duplicate normalized glossary terms were accepted.'],
    ['field_tio2_geo_editorial_reviewed_at', '2026-08-26 00:00:00', 'tio2_homepage_invalid_field', 'A non-normalized editorial date was accepted.'],
    ['field_tio2_home_hero_heading', '<em>Injected hero</em>', 'tio2_homepage_invalid_field', 'HTML in a reused Hero field was accepted.'],
    ['field_tio2_home_closing_body', '', 'tio2_homepage_invalid_field', 'An empty reused Closing field was accepted.'],
    ['field_tio2_home_seo_title', '', 'tio2_homepage_invalid_field', 'An empty reused SEO field was accepted.'],
];
foreach ($mutations as [$field_key, $value, $error_code, $message]) {
    tio2_homepage_v02_test_set_valid_fields($post_id);
    tio2_homepage_v02_test_update_field($field_key, $value, $post_id);
    tio2_homepage_v02_test_assert_error($post_id, $error_code, $message);
}

$attachment_id = wp_insert_post([
    'post_type' => 'attachment',
    'post_status' => 'inherit',
    'post_title' => 'Synthetic v0.2 image fixture',
    'post_mime_type' => 'image/png',
], true);
tio2_homepage_v02_test_assert(! is_wp_error($attachment_id) && $attachment_id > 0, 'Could not create image fixture.');
$attachment_id = (int) $attachment_id;
$GLOBALS['tio2_homepage_v02_test_post_ids'][] = $attachment_id;
tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image', $attachment_id, $post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image_alt', '', $post_id);
tio2_homepage_v02_test_assert_error(
    $post_id,
    'tio2_homepage_invalid_field',
    'A visible Hero image without explicit alt text was accepted.'
);

tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image', $attachment_id, $post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image_alt', 'Synthetic image', $post_id);
delete_post_meta($attachment_id, '_wp_attachment_metadata');
tio2_homepage_v02_test_assert_error(
    $post_id,
    'tio2_homepage_invalid_field',
    'A Hero image without positive attachment dimensions was accepted.'
);

wp_update_attachment_metadata($attachment_id, ['width' => 640, 'height' => 0]);
tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_og_image', $attachment_id, $post_id);
tio2_homepage_v02_test_assert_error(
    $post_id,
    'tio2_homepage_invalid_field',
    'An Open Graph image with a non-positive attachment dimension was accepted.'
);

wp_update_attachment_metadata($attachment_id, ['width' => 640, 'height' => 480]);
tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image', $attachment_id, $post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_hero_image_alt', 'Synthetic image', $post_id);
tio2_homepage_v02_test_update_field('field_tio2_home_og_image', $attachment_id, $post_id);
$positive_dimensions = tio2_validate_homepage_contract($post_id);
tio2_homepage_v02_test_assert(
    true === $positive_dimensions,
    'Positive Hero/Open Graph attachment dimensions were rejected.'
);

tio2_homepage_v02_test_set_valid_fields($post_id);
tio2_homepage_v02_test_update_field('field_tio2_geo_evidence_items', [[
    'document_type' => 'Synthetic document',
    'document_title' => 'Synthetic verified item',
    'document_summary' => 'A validation fixture.',
    'applicability' => 'Local test only',
    'revision_label' => '',
    'evidence_url' => 'https://example.test/evidence',
    'verification_status' => 'verified',
]], $post_id);
tio2_homepage_v02_test_update_field('field_tio2_geo_editorial_reviewed_by', '', $post_id);
tio2_homepage_v02_test_update_field('field_tio2_geo_editorial_reviewed_at', '', $post_id);
tio2_homepage_v02_test_assert_error(
    $post_id,
    'tio2_homepage_invalid_evidence',
    'Verified evidence without reviewer and review date was accepted.'
);

tio2_homepage_v02_test_cleanup();
fwrite(STDOUT, "TiO2 Site A homepage v0.2 field and publication contract passed\n");
