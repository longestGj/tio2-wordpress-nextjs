<?php

if (! defined('ABSPATH')) {
    exit;
}

const TIO2_SITE_A_PRODUCT_REPRESENTATIVE_SHA256 = '4ee0c8f66e36d0e3ec34fb0a73367d63df09a99cf7894530753413321214fa71';
const TIO2_SITE_A_PRODUCT_REPRESENTATIVE_TARGETS = ['hub', 'coatings', 'TP-C120'];
const TIO2_SITE_A_PRODUCT_REPRESENTATIVE_HUB_FIELDS = [
    'metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer',
    'heroImage', 'decisionRail', 'families', 'knownGradeHeading', 'knownGradeHelp',
    'decisionPath', 'applicationBoundary', 'resources', 'enquiry', 'faqItems',
    'technicalDisclaimer',
];
const TIO2_SITE_A_PRODUCT_REPRESENTATIVE_FAMILY_FIELDS = [
    'metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer',
    'heroImage', 'decisionRail', 'filters', 'comparisonIntroduction',
    'comparisonCaption', 'selectionMethod', 'validationSteps', 'applications',
    'resources', 'enquiry', 'faqItems', 'technicalDisclaimer',
];
const TIO2_SITE_A_PRODUCT_REPRESENTATIVE_PRODUCT_FIELDS = [
    'meta_title', 'meta_description', 'eyebrow', 'customer_problem_headline',
    'quick_answer', 'product_type', 'process', 'primary_application', 'positioning',
    'surface_treatment', 'packaging', 'tds_access', 'fit_when',
    'discuss_first_when', 'performance_priorities', 'recommended_applications',
    'evidence_statement', 'typical_properties', 'validation_checklist', 'faq_items',
    'related_links', 'familyDisplayOrder', 'familyCardSummary',
    'collectionApplicationFocus', 'collectionPerformanceFocus',
    'collectionSurfaceTreatmentPositioning', 'collectionFilterTags',
];

/** @param mixed $value */
function tio2_site_a_product_representative_text($value, string $path, bool $allow_empty = false): string
{
    if (! is_string($value) || (! $allow_empty && '' === trim($value))) {
        throw new InvalidArgumentException("Representative fixture {$path} must be text.");
    }
    return $allow_empty ? $value : trim($value);
}

/** @param mixed $value @return array<string, mixed> */
function tio2_site_a_product_representative_object($value, string $path): array
{
    if (! is_array($value) || array_is_list($value)) {
        throw new InvalidArgumentException("Representative fixture {$path} must be an object.");
    }
    return $value;
}

/** @param mixed $value @return list<array<string, mixed>> */
function tio2_site_a_product_representative_rows($value, string $path): array
{
    if (! is_array($value) || ! array_is_list($value)) {
        throw new InvalidArgumentException("Representative fixture {$path} must be a list.");
    }
    foreach ($value as $row) {
        if (! is_array($row) || array_is_list($row)) {
            throw new InvalidArgumentException("Representative fixture {$path} contains a non-object row.");
        }
    }
    return array_values($value);
}

/** @param array<string, mixed> $value */
function tio2_site_a_product_representative_json(array $value): string
{
    return (string) wp_json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
}

/** @param list<array<string, mixed>> $rows @return list<array{item: string}> */
function tio2_site_a_product_representative_json_rows(array $rows): array
{
    return array_map(
        static fn (array $row): array => ['item' => tio2_site_a_product_representative_json($row)],
        $rows
    );
}

/** @param list<array<string, mixed>> $rows @return list<array{question: string, answer: string}> */
function tio2_site_a_product_representative_faq_rows(array $rows): array
{
    return array_map(static fn (array $row): array => [
        'question' => tio2_site_a_product_representative_text($row['question'] ?? null, 'faq.question'),
        'answer' => tio2_site_a_product_representative_text($row['answerHtml'] ?? null, 'faq.answerHtml'),
    ], $rows);
}

/** @param list<array<string, mixed>> $records */
function tio2_site_a_product_representative_record(array $records, string $level): array
{
    $matches = array_values(array_filter($records, static fn (array $record): bool => $level === ($record['level'] ?? null)));
    if (1 !== count($matches)) {
        throw new InvalidArgumentException("Representative fixture must contain exactly one {$level} record.");
    }
    return $matches[0];
}

/** @param array<string, mixed> $fixture @return list<array<string, mixed>> */
function tio2_site_a_product_representative_validate_fixture(array $fixture): array
{
    $top_keys = array_keys($fixture);
    sort($top_keys, SORT_STRING);
    if (['records', 'siteId', 'version'] !== $top_keys || '0.5' !== ($fixture['version'] ?? null) || 'tio2-a' !== ($fixture['siteId'] ?? null)) {
        throw new InvalidArgumentException('Representative fixture must be the exact Site A v0.5 contract.');
    }
    $records = tio2_site_a_product_representative_rows($fixture['records'] ?? null, 'records');
    if (3 !== count($records)) {
        throw new InvalidArgumentException('Representative fixture must contain exactly three records.');
    }
    $hub = tio2_site_a_product_representative_record($records, 'hub');
    $family = tio2_site_a_product_representative_record($records, 'family');
    $detail = tio2_site_a_product_representative_record($records, 'detail');
    $hub_identity = tio2_site_a_product_representative_object($hub['identity'] ?? null, 'hub.identity');
    $family_identity = tio2_site_a_product_representative_object($family['identity'] ?? null, 'family.identity');
    $detail_identity = tio2_site_a_product_representative_object($detail['identity'] ?? null, 'detail.identity');
    if ('products-hub' !== ($hub_identity['id'] ?? null) || '/products' !== ($hub_identity['path'] ?? null) ||
        'coatings' !== ($family_identity['familySlug'] ?? null) || '/products/coatings' !== ($family_identity['path'] ?? null) ||
        'TP-C120' !== ($detail_identity['productId'] ?? null) || '/products/coatings/tp-c120' !== ($detail_identity['path'] ?? null)) {
        throw new InvalidArgumentException('Representative fixture escaped Hub, Coatings, or TP-C120.');
    }

    $hub_seo = tio2_site_a_product_representative_object($hub['seo'] ?? null, 'hub.seo');
    $hub_hero = tio2_site_a_product_representative_object($hub['hero'] ?? null, 'hub.hero');
    $hub_presentation = tio2_site_a_product_representative_object($hub['presentation'] ?? null, 'hub.presentation');
    $known_grade = tio2_site_a_product_representative_object($hub_presentation['knownGrade'] ?? null, 'hub.presentation.knownGrade');
    $hub_fields = [
        'metaTitle' => tio2_site_a_product_representative_text($hub_seo['title'] ?? null, 'hub.seo.title'),
        'metaDescription' => tio2_site_a_product_representative_text($hub_seo['description'] ?? null, 'hub.seo.description'),
        'eyebrow' => tio2_site_a_product_representative_text($hub_hero['eyebrow'] ?? null, 'hub.hero.eyebrow'),
        'headline' => tio2_site_a_product_representative_text($hub_hero['headline'] ?? null, 'hub.hero.headline'),
        'directAnswer' => tio2_site_a_product_representative_text($hub_hero['directAnswer'] ?? null, 'hub.hero.directAnswer'),
        'heroImage' => tio2_site_a_product_representative_text($hub_hero['image'] ?? null, 'hub.hero.image'),
        'decisionRail' => tio2_site_a_product_representative_json_rows(tio2_site_a_product_representative_rows($hub['decisionRail'] ?? null, 'hub.decisionRail')),
        'families' => array_map(static fn (array $row): array => ['family' => tio2_site_a_product_representative_text($row['slug'] ?? null, 'hub.families.slug')], tio2_site_a_product_representative_rows($hub['families'] ?? null, 'hub.families')),
        'knownGradeHeading' => tio2_site_a_product_representative_text($known_grade['heading'] ?? null, 'hub.presentation.knownGrade.heading'),
        'knownGradeHelp' => tio2_site_a_product_representative_text($known_grade['help'] ?? null, 'hub.presentation.knownGrade.help'),
        'decisionPath' => tio2_site_a_product_representative_json(tio2_site_a_product_representative_rows($hub['decisionPath'] ?? null, 'hub.decisionPath')),
        'applicationBoundary' => tio2_site_a_product_representative_json(tio2_site_a_product_representative_object($hub['applicationBoundary'] ?? null, 'hub.applicationBoundary')),
        'resources' => array_map(static fn (array $row): string => tio2_site_a_product_representative_text($row['id'] ?? null, 'hub.resources.id'), tio2_site_a_product_representative_rows($hub['resources'] ?? null, 'hub.resources')),
        'enquiry' => tio2_site_a_product_representative_json(tio2_site_a_product_representative_object($hub['enquiry'] ?? null, 'hub.enquiry')),
        'faqItems' => tio2_site_a_product_representative_faq_rows(tio2_site_a_product_representative_rows($hub['faqs'] ?? null, 'hub.faqs')),
        'technicalDisclaimer' => tio2_site_a_product_representative_text($hub['disclaimerHtml'] ?? null, 'hub.disclaimerHtml'),
    ];

    $family_seo = tio2_site_a_product_representative_object($family['seo'] ?? null, 'family.seo');
    $family_hero = tio2_site_a_product_representative_object($family['hero'] ?? null, 'family.hero');
    $family_presentation = tio2_site_a_product_representative_object($family['presentation'] ?? null, 'family.presentation');
    $comparison_presentation = tio2_site_a_product_representative_object($family_presentation['comparison'] ?? null, 'family.presentation.comparison');
    $comparison = tio2_site_a_product_representative_object($family['comparison'] ?? null, 'family.comparison');
    $family_fields = [
        'metaTitle' => tio2_site_a_product_representative_text($family_seo['title'] ?? null, 'family.seo.title'),
        'metaDescription' => tio2_site_a_product_representative_text($family_seo['description'] ?? null, 'family.seo.description'),
        'eyebrow' => tio2_site_a_product_representative_text($family_hero['eyebrow'] ?? null, 'family.hero.eyebrow'),
        'headline' => tio2_site_a_product_representative_text($family_hero['headline'] ?? null, 'family.hero.headline'),
        'directAnswer' => tio2_site_a_product_representative_text($family_hero['directAnswer'] ?? null, 'family.hero.directAnswer'),
        'heroImage' => tio2_site_a_product_representative_text($family_hero['image'] ?? null, 'family.hero.image'),
        'decisionRail' => tio2_site_a_product_representative_json_rows(tio2_site_a_product_representative_rows($family['decisionRail'] ?? null, 'family.decisionRail')),
        'filters' => tio2_site_a_product_representative_rows($family['filters'] ?? null, 'family.filters'),
        'comparisonIntroduction' => tio2_site_a_product_representative_text($comparison_presentation['intro'] ?? null, 'family.presentation.comparison.intro'),
        'comparisonCaption' => tio2_site_a_product_representative_text($comparison['caption'] ?? null, 'family.comparison.caption'),
        'selectionMethod' => tio2_site_a_product_representative_json(tio2_site_a_product_representative_object($family['selectionMethod'] ?? null, 'family.selectionMethod')),
        'validationSteps' => tio2_site_a_product_representative_json_rows(tio2_site_a_product_representative_rows($family['validationSteps'] ?? null, 'family.validationSteps')),
        'applications' => array_map(static fn (array $row): string => tio2_site_a_product_representative_text($row['id'] ?? null, 'family.applications.id'), tio2_site_a_product_representative_rows($family['applications'] ?? null, 'family.applications')),
        'resources' => array_map(static fn (array $row): string => tio2_site_a_product_representative_text($row['id'] ?? null, 'family.resources.id'), tio2_site_a_product_representative_rows($family['resources'] ?? null, 'family.resources')),
        'enquiry' => tio2_site_a_product_representative_json(tio2_site_a_product_representative_object($family['enquiry'] ?? null, 'family.enquiry')),
        'faqItems' => tio2_site_a_product_representative_faq_rows(tio2_site_a_product_representative_rows($family['faqs'] ?? null, 'family.faqs')),
        'technicalDisclaimer' => tio2_site_a_product_representative_text($family['disclaimerHtml'] ?? null, 'family.disclaimerHtml'),
    ];

    $detail_seo = tio2_site_a_product_representative_object($detail['seo'] ?? null, 'detail.seo');
    $detail_hero = tio2_site_a_product_representative_object($detail['hero'] ?? null, 'detail.hero');
    $snapshot = tio2_site_a_product_representative_rows($detail['snapshot'] ?? null, 'detail.snapshot');
    $snapshot_values = [];
    foreach ($snapshot as $row) {
        $snapshot_values[(string) ($row['label'] ?? '')] = tio2_site_a_product_representative_text($row['value'] ?? null, 'detail.snapshot.value');
    }
    $application_context = tio2_site_a_product_representative_object($detail['applicationContext'] ?? null, 'detail.applicationContext');
    $application = tio2_site_a_product_representative_object($application_context['application'] ?? null, 'detail.applicationContext.application');
    $enquiry = tio2_site_a_product_representative_object($detail['enquiryPreparation'] ?? null, 'detail.enquiryPreparation');
    $related = tio2_site_a_product_representative_object($detail['relatedLinks'] ?? null, 'detail.relatedLinks');
    $coatings_products = tio2_site_a_product_representative_rows($family['products'] ?? null, 'family.products');
    $tp_card = array_values(array_filter($coatings_products, static fn (array $row): bool => 'TP-C120' === ($row['productId'] ?? null)));
    if (1 !== count($tp_card)) {
        throw new InvalidArgumentException('Coatings must contain exactly one TP-C120 collection row.');
    }
    $tp_card = $tp_card[0];
    $product_fields = [
        'meta_title' => tio2_site_a_product_representative_text($detail_seo['title'] ?? null, 'detail.seo.title'),
        'meta_description' => tio2_site_a_product_representative_text($detail_seo['description'] ?? null, 'detail.seo.description'),
        'eyebrow' => tio2_site_a_product_representative_text($detail_hero['eyebrow'] ?? null, 'detail.hero.eyebrow'),
        'customer_problem_headline' => tio2_site_a_product_representative_text($detail_hero['headline'] ?? null, 'detail.hero.headline'),
        'quick_answer' => tio2_site_a_product_representative_text($detail_hero['directAnswer'] ?? null, 'detail.hero.directAnswer'),
        'product_type' => tio2_site_a_product_representative_text($snapshot_values['Product type'] ?? null, 'detail.snapshot.Product type'),
        'process' => tio2_site_a_product_representative_text($snapshot_values['Process'] ?? null, 'detail.snapshot.Process'),
        'primary_application' => tio2_site_a_product_representative_text($snapshot_values['Primary application'] ?? null, 'detail.snapshot.Primary application'),
        'positioning' => tio2_site_a_product_representative_text($snapshot_values['Positioning'] ?? null, 'detail.snapshot.Positioning'),
        'surface_treatment' => tio2_site_a_product_representative_text($snapshot_values['Surface treatment'] ?? null, 'detail.snapshot.Surface treatment'),
        'packaging' => tio2_site_a_product_representative_text($enquiry['packaging'] ?? null, 'detail.enquiryPreparation.packaging'),
        'tds_access' => tio2_site_a_product_representative_text($enquiry['tdsAccess'] ?? null, 'detail.enquiryPreparation.tdsAccess'),
        'fit_when' => array_map(static fn ($item): array => ['item' => tio2_site_a_product_representative_text($item, 'detail.fitWhen')], array_values(tio2_site_a_product_representative_object($detail['fitCheck'] ?? null, 'detail.fitCheck')['fitWhen'] ?? [])),
        'discuss_first_when' => array_map(static fn ($item): array => ['item' => tio2_site_a_product_representative_text($item, 'detail.discussFirstWhen')], array_values(tio2_site_a_product_representative_object($detail['fitCheck'] ?? null, 'detail.fitCheck')['discussFirstWhen'] ?? [])),
        'performance_priorities' => tio2_site_a_product_representative_rows($detail['formulationPriorities'] ?? null, 'detail.formulationPriorities'),
        'recommended_applications' => [tio2_site_a_product_representative_text($application['id'] ?? null, 'detail.applicationContext.application.id')],
        'evidence_statement' => tio2_site_a_product_representative_text($detail['technicalNote'] ?? null, 'detail.technicalNote'),
        'typical_properties' => array_map(static fn (array $row): array => [
            'property' => tio2_site_a_product_representative_text($row['property'] ?? null, 'detail.technicalProperties.property'),
            'value' => tio2_site_a_product_representative_text($row['value'] ?? null, 'detail.technicalProperties.value'),
            'unit' => tio2_site_a_product_representative_text($row['unit'] ?? null, 'detail.technicalProperties.unit', true),
            'display_order' => (int) ($row['displayOrder'] ?? 0),
        ], tio2_site_a_product_representative_rows($detail['technicalProperties'] ?? null, 'detail.technicalProperties')),
        'validation_checklist' => tio2_site_a_product_representative_json_rows(tio2_site_a_product_representative_rows($detail['validationSteps'] ?? null, 'detail.validationSteps')),
        'faq_items' => tio2_site_a_product_representative_faq_rows(tio2_site_a_product_representative_rows($detail['faqs'] ?? null, 'detail.faqs')),
        'related_links' => [
            'applications' => [],
            'resources' => array_map(static fn (array $row): string => tio2_site_a_product_representative_text($row['id'] ?? null, 'detail.relatedLinks.resources.id'), tio2_site_a_product_representative_rows($related['resources'] ?? null, 'detail.relatedLinks.resources')),
            'products' => array_map(static fn (array $row): string => tio2_site_a_product_representative_text($row['id'] ?? null, 'detail.relatedLinks.products.id'), tio2_site_a_product_representative_rows($related['products'] ?? null, 'detail.relatedLinks.products')),
        ],
        'familyDisplayOrder' => (int) ($tp_card['displayOrder'] ?? 0),
        'familyCardSummary' => tio2_site_a_product_representative_text($tp_card['cardSummary'] ?? null, 'family.products.TP-C120.cardSummary'),
        'collectionApplicationFocus' => tio2_site_a_product_representative_text($tp_card['applicationFocus'] ?? null, 'family.products.TP-C120.applicationFocus'),
        'collectionPerformanceFocus' => tio2_site_a_product_representative_text($tp_card['performanceFocus'] ?? null, 'family.products.TP-C120.performanceFocus'),
        'collectionSurfaceTreatmentPositioning' => tio2_site_a_product_representative_text($tp_card['surfaceTreatmentPositioning'] ?? null, 'family.products.TP-C120.surfaceTreatmentPositioning'),
        'collectionFilterTags' => array_values($tp_card['filterTags'] ?? []),
    ];
    if (array_keys($hub_fields) !== TIO2_SITE_A_PRODUCT_REPRESENTATIVE_HUB_FIELDS ||
        array_keys($family_fields) !== TIO2_SITE_A_PRODUCT_REPRESENTATIVE_FAMILY_FIELDS ||
        array_keys($product_fields) !== TIO2_SITE_A_PRODUCT_REPRESENTATIVE_PRODUCT_FIELDS) {
        throw new LogicException('Representative field allowlist construction drifted.');
    }
    return [
        ['target' => 'hub', 'fields' => $hub_fields, 'invariants' => ['siteId' => 'tio2-a', 'path' => '/products']],
        ['target' => 'coatings', 'fields' => $family_fields, 'invariants' => ['siteId' => 'tio2-a', 'path' => '/products/coatings']],
        ['target' => 'TP-C120', 'fields' => $product_fields, 'invariants' => ['siteId' => 'tio2-a', 'status' => 'draft', 'slug' => 'tp-c120', 'canonicalPath' => '/products/coatings/tp-c120']],
    ];
}

/** @param mixed $value @return mixed */
function tio2_site_a_product_representative_normalize($value)
{
    if (! is_array($value)) {
        return $value;
    }
    foreach ($value as $key => $item) {
        $value[$key] = tio2_site_a_product_representative_normalize($item);
    }
    if (! array_is_list($value)) {
        ksort($value, SORT_STRING);
    }
    return $value;
}

/** @param array<string, mixed> $left @param array<string, mixed> $right */
function tio2_site_a_product_representative_equal(array $left, array $right): bool
{
    return wp_json_encode(tio2_site_a_product_representative_normalize($left)) === wp_json_encode(tio2_site_a_product_representative_normalize($right));
}

/**
 * @param array<string, mixed> $fixture
 * @param array<string, callable> $operations
 * @return array{mode: string, fixtureSha256: string, actions: list<array{target: string, action: string, record: array<string, mixed>}>}
 */
function tio2_site_a_product_representative_execute(string $mode, array $fixture, string $fixture_sha256, ?string $plan_sha256, array $operations): array
{
    if (! in_array($mode, ['plan', 'apply'], true) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $fixture_sha256)) {
        throw new InvalidArgumentException('Representative importer mode or fixture hash is invalid.');
    }
    if ('apply' === $mode && (! is_string($plan_sha256) || ! hash_equals($fixture_sha256, $plan_sha256))) {
        throw new InvalidArgumentException('Apply requires the exact current representative Plan hash.');
    }
    foreach (['begin', 'commit', 'rollback', 'find', 'write', 'snapshot_other_products', 'assert_other_products', 'snapshot_site_b', 'assert_site_b', 'assert_anonymous_hidden'] as $name) {
        if (! isset($operations[$name]) || ! is_callable($operations[$name])) {
            throw new InvalidArgumentException("Representative importer operation {$name} is required.");
        }
    }
    $records = tio2_site_a_product_representative_validate_fixture($fixture);
    $started = false;
    try {
        $operations['begin']();
        $started = true;
        $other_hash = $operations['snapshot_other_products']();
        $site_b_hash = $operations['snapshot_site_b']();
        $actions = [];
        foreach ($records as $record) {
            $existing = $operations['find']($record['target']);
            $action = is_array($existing) && tio2_site_a_product_representative_equal($existing, $record) ? 'no-change' : 'update';
            $actions[] = ['target' => $record['target'], 'action' => $action, 'record' => $record];
        }
        if ('plan' === $mode) {
            $operations['rollback']();
            $started = false;
            return ['mode' => 'plan', 'fixtureSha256' => $fixture_sha256, 'actions' => $actions];
        }
        foreach ($actions as $action) {
            if ('no-change' !== $action['action']) {
                $operations['write']($action['record']);
            }
        }
        foreach ($records as $record) {
            $readback = $operations['find']($record['target']);
            if (! is_array($readback) || ! tio2_site_a_product_representative_equal($readback, $record)) {
                throw new RuntimeException("Representative target {$record['target']} failed normalized read-back.");
            }
        }
        $operations['assert_other_products']($other_hash);
        $operations['assert_site_b']($site_b_hash);
        $operations['assert_anonymous_hidden']();
        $operations['commit']();
        $started = false;
        return ['mode' => 'apply', 'fixtureSha256' => $fixture_sha256, 'actions' => $actions];
    } catch (Throwable $error) {
        if ($started) {
            $operations['rollback']();
        }
        throw $error;
    }
}

/** @return array<string, mixed> */
function tio2_site_a_product_representative_read_capability(array $args): array
{
    if (1 !== count($args) || ! is_string($args[0]) || ! is_readable($args[0])) {
        throw new RuntimeException('The local representative capability file is required.');
    }
    $path = (string) realpath($args[0]);
    $seed = (string) realpath(__DIR__);
    if (dirname($path) !== $seed || 1 !== preg_match('/^\.runtime-site-a-product-representatives-capability-[a-f0-9]{32}\.json$/D', basename($path))) {
        throw new RuntimeException('The local representative capability path was rejected.');
    }
    $capability = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    $token = getenv('TIO2_LOCAL_PRODUCT_REPRESENTATIVE_CAPABILITY');
    $fixture_path = is_array($capability) && is_string($capability['fixturePath'] ?? null) ? (string) realpath($capability['fixturePath']) : '';
    if (! is_array($capability) || 1 !== ($capability['version'] ?? null) ||
        ! is_string($token) || 1 !== preg_match('/^[a-f0-9]{64}$/D', $token) ||
        ! is_string($capability['token'] ?? null) || ! hash_equals($capability['token'], $token) ||
        ! in_array($capability['mode'] ?? null, ['plan', 'apply'], true) || dirname($fixture_path) !== $seed ||
        1 !== preg_match('/^\.runtime-site-a-product-representatives-[a-f0-9]{32}\.json$/D', basename($fixture_path)) ||
        ! is_string($capability['fixtureSha256'] ?? null) || ! hash_equals(TIO2_SITE_A_PRODUCT_REPRESENTATIVE_SHA256, $capability['fixtureSha256']) ||
        ! hash_equals($capability['fixtureSha256'], hash_file('sha256', $fixture_path)) ||
        ! is_string($capability['planSha256'] ?? null) ||
        ('apply' === $capability['mode'] && ! hash_equals($capability['fixtureSha256'], $capability['planSha256']))) {
        throw new RuntimeException('The local representative capability contract was rejected.');
    }
    $capability['fixturePath'] = $fixture_path;
    return $capability;
}

/** @param mixed $value */
function tio2_site_a_product_representative_database_hash($value): string
{
    return 'sha256:' . hash('sha256', (string) wp_json_encode(tio2_site_a_product_representative_normalize($value)));
}

/** @return array<string, mixed> */
function tio2_site_a_product_representative_field_keys(array $definitions): array
{
    $keys = [];
    foreach ($definitions as $definition) {
        if (is_array($definition) && is_string($definition['name'] ?? null) && is_string($definition['key'] ?? null)) {
            $keys[$definition['name']] = $definition['key'];
        }
    }
    return $keys;
}

/** @param list<int|string> $values @return list<string> */
function tio2_site_a_product_representative_relationship_values(array $values): array
{
    return array_values(array_map('strval', $values));
}

/** @return int */
function tio2_site_a_product_representative_post_id(string $product_id): int
{
    $ids = get_posts(['post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => 'product_id', 'meta_value' => $product_id]);
    if (1 !== count($ids)) {
        throw new RuntimeException("Representative Product {$product_id} must already exist exactly once.");
    }
    $post_id = (int) $ids[0];
    $scopes = wp_get_object_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-a'] !== array_values($scopes) || 'draft' !== get_post_status($post_id) || 'tp-c120' !== get_post_field('post_name', $post_id)) {
        throw new RuntimeException('TP-C120 must remain the exact Site A draft identity.');
    }
    return $post_id;
}

/** @return int */
function tio2_site_a_product_representative_relationship_id(string $type, string $key): int
{
    $post_type = ['application' => 'tio2_application', 'resource' => 'tio2_document', 'product' => 'tio2_product'][$type] ?? '';
    $meta_key = ['application' => 'application_id', 'resource' => 'resource_id', 'product' => 'product_id'][$type] ?? '';
    $ids = get_posts(['post_type' => $post_type, 'post_status' => 'any', 'fields' => 'ids', 'posts_per_page' => 2, 'no_found_rows' => true, 'meta_key' => $meta_key, 'meta_value' => $key]);
    if (1 !== count($ids)) {
        throw new RuntimeException("Representative relationship {$type}:{$key} must resolve exactly once.");
    }
    $id = (int) $ids[0];
    $scopes = wp_get_object_terms($id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-a'] !== array_values($scopes)) {
        throw new RuntimeException("Representative relationship {$type}:{$key} escaped Site A.");
    }
    return $id;
}

/** @return int */
function tio2_site_a_product_representative_image_id(string $path): int
{
    global $wpdb;
    $ids = $wpdb->get_col($wpdb->prepare("SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND guid LIKE %s ORDER BY ID ASC", '%' . $wpdb->esc_like($path)));
    if (1 !== count($ids)) {
        throw new RuntimeException("Representative image {$path} must resolve to one local attachment.");
    }
    return (int) $ids[0];
}

/** @param array<string, mixed> $record @return array<string, mixed> */
function tio2_site_a_product_representative_prepare_record(array $record): array
{
    if ('hub' === $record['target']) {
        $record['fields']['heroImage'] = tio2_site_a_product_representative_image_id($record['fields']['heroImage']);
        foreach ($record['fields']['families'] as &$row) {
            $term = get_term_by('slug', $row['family'], 'product_family');
            if (! $term instanceof WP_Term) throw new RuntimeException('A canonical Product Family term is missing.');
            $row['family'] = (int) $term->term_id;
        }
        unset($row);
        $record['fields']['resources'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('resource', $key), $record['fields']['resources']));
    } elseif ('coatings' === $record['target']) {
        $record['fields']['heroImage'] = tio2_site_a_product_representative_image_id($record['fields']['heroImage']);
        $record['fields']['applications'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('application', $key), $record['fields']['applications']));
        $record['fields']['resources'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('resource', $key), $record['fields']['resources']));
    } else {
        $record['fields']['recommended_applications'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('application', $key), $record['fields']['recommended_applications']));
        $record['fields']['related_links']['resources'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('resource', $key), $record['fields']['related_links']['resources']));
        $record['fields']['related_links']['products'] = tio2_site_a_product_representative_relationship_values(array_map(static fn (string $key): int => tio2_site_a_product_representative_relationship_id('product', $key), $record['fields']['related_links']['products']));
    }
    return $record;
}

/** @param array<string, mixed> $expected @return array<string, mixed> */
function tio2_site_a_product_representative_find_wp(array $expected): array
{
    $stored = tio2_site_a_product_representative_prepare_record($expected);
    $object_id = 'option';
    if ('coatings' === $expected['target']) {
        $term = get_term_by('slug', 'coatings', 'product_family');
        if (! $term instanceof WP_Term) throw new RuntimeException('The Coatings term is missing.');
        $object_id = 'product_family_' . $term->term_id;
    } elseif ('TP-C120' === $expected['target']) {
        $object_id = tio2_site_a_product_representative_post_id('TP-C120');
    }
    foreach ($stored['fields'] as $name => $ignored) {
        $stored['fields'][$name] = get_field($name, $object_id, false);
    }
    if ('TP-C120' === $expected['target'] && is_array($stored['fields']['related_links'] ?? null)) {
        $group = $stored['fields']['related_links'];
        $stored['fields']['related_links'] = [
            'applications' => $group['applications'] ?? $group['field_tio2_product_related_applications'] ?? [],
            'resources' => $group['resources'] ?? $group['field_tio2_product_related_resources'] ?? [],
            'products' => $group['products'] ?? $group['field_tio2_product_related_products'] ?? [],
        ];
    }
    return tio2_site_a_product_representative_equal($stored, tio2_site_a_product_representative_prepare_record($expected)) ? $expected : $stored;
}

/** @param array<string, mixed> $record */
function tio2_site_a_product_representative_write_wp(array $record): void
{
    $stored = tio2_site_a_product_representative_prepare_record($record);
    if ('hub' === $record['target']) {
        $allowed = TIO2_SITE_A_PRODUCT_REPRESENTATIVE_HUB_FIELDS;
        $keys = tio2_site_a_product_representative_field_keys(tio2_product_hub_field_definitions());
        $object_id = 'option';
    } elseif ('coatings' === $record['target']) {
        $allowed = TIO2_SITE_A_PRODUCT_REPRESENTATIVE_FAMILY_FIELDS;
        $keys = tio2_site_a_product_representative_field_keys(tio2_product_family_field_definitions());
        $term = get_term_by('slug', 'coatings', 'product_family');
        if (! $term instanceof WP_Term) throw new RuntimeException('The Coatings term is missing.');
        $object_id = 'product_family_' . $term->term_id;
    } else {
        $allowed = TIO2_SITE_A_PRODUCT_REPRESENTATIVE_PRODUCT_FIELDS;
        $keys = tio2_site_a_product_representative_field_keys(array_merge(tio2_product_field_definitions(), tio2_product_collection_display_field_definitions()));
        $object_id = tio2_site_a_product_representative_post_id('TP-C120');
    }
    if (array_keys($stored['fields']) !== $allowed) {
        throw new RuntimeException('Representative write field allowlist was rejected.');
    }
    foreach ($stored['fields'] as $name => $value) {
        if (! isset($keys[$name])) {
            throw new RuntimeException("Could not write representative field {$name}.");
        }
        update_field($keys[$name], $value, $object_id);
    }
}

/** @param list<int> $post_ids @return string */
function tio2_site_a_product_representative_posts_hash(array $post_ids): string
{
    global $wpdb;
    sort($post_ids, SORT_NUMERIC);
    $snapshot = [];
    foreach ($post_ids as $post_id) {
        $post = get_post($post_id, ARRAY_A);
        if (! is_array($post)) throw new RuntimeException('Could not snapshot a protected WordPress record.');
        $meta = get_post_meta($post_id);
        ksort($meta, SORT_STRING);
        $terms = $wpdb->get_results($wpdb->prepare(
            "SELECT tt.taxonomy, t.term_id, t.slug FROM {$wpdb->term_relationships} tr INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE tr.object_id=%d ORDER BY tt.taxonomy, t.term_id",
            $post_id
        ), ARRAY_A);
        if ('' !== $wpdb->last_error) throw new RuntimeException('Could not snapshot protected taxonomy assignments.');
        $snapshot[] = ['post' => $post, 'meta' => $meta, 'taxonomies' => $terms];
    }
    return tio2_site_a_product_representative_database_hash($snapshot);
}

/** @return string */
function tio2_site_a_product_representative_other_products_hash(): string
{
    $tp_id = tio2_site_a_product_representative_post_id('TP-C120');
    $ids = get_posts([
        'post_type' => 'tio2_product', 'post_status' => 'any', 'fields' => 'ids',
        'posts_per_page' => -1, 'post__not_in' => [$tp_id], 'no_found_rows' => true,
        'tax_query' => [['taxonomy' => 'site_scope', 'field' => 'slug', 'terms' => ['tio2-a']]],
    ]);
    if (24 !== count($ids)) {
        throw new RuntimeException('Representative import requires the other 24 Site A Product records to exist unchanged.');
    }
    $actual_ids = array_map(static fn ($id): string => (string) get_field('product_id', (int) $id, false), $ids);
    sort($actual_ids, SORT_STRING);
    $expected_ids = array_merge(...array_values(tio2_product_collection_membership()));
    $expected_ids = array_values(array_filter($expected_ids, static fn (string $id): bool => 'TP-C120' !== $id));
    sort($expected_ids, SORT_STRING);
    if ($actual_ids !== $expected_ids) {
        throw new RuntimeException('Representative import requires the exact other 24 canonical Site A Product IDs.');
    }
    return tio2_site_a_product_representative_posts_hash(array_map('intval', $ids));
}

/** @return string */
function tio2_site_a_product_representative_site_b_hash(): string
{
    global $wpdb;
    $ids = $wpdb->get_col("SELECT DISTINCT tr.object_id FROM {$wpdb->term_relationships} tr INNER JOIN {$wpdb->term_taxonomy} tt ON tt.term_taxonomy_id=tr.term_taxonomy_id INNER JOIN {$wpdb->terms} t ON t.term_id=tt.term_id WHERE tt.taxonomy='site_scope' AND t.slug='tio2-b' ORDER BY tr.object_id");
    if ('' !== $wpdb->last_error) throw new RuntimeException('Could not enumerate frozen Site B records.');
    return tio2_site_a_product_representative_posts_hash(array_map('intval', $ids));
}

if (defined('WP_CLI') && WP_CLI) {
    try {
        $capability = tio2_site_a_product_representative_read_capability($args);
        if (! current_user_can('manage_options') || ! function_exists('update_field') || ! function_exists('tio2_product_hub_field_definitions')) {
            throw new RuntimeException('Representative import requires an authenticated local administrator, ACF, and the Site Model.');
        }
        $fixture = json_decode((string) file_get_contents($capability['fixturePath']), true, 512, JSON_THROW_ON_ERROR);
        if (! is_array($fixture)) throw new RuntimeException('The staged representative fixture is invalid.');
        $expected = [];
        foreach (tio2_site_a_product_representative_validate_fixture($fixture) as $record) $expected[$record['target']] = $record;
        global $wpdb;
        $lock = 'tio2-site-a-product-representatives';
        if (1 !== (int) $wpdb->get_var($wpdb->prepare('SELECT GET_LOCK(%s, 0)', $lock))) throw new RuntimeException('Could not acquire the representative import lock.');
        try {
            $operations = [
                'begin' => static function () use ($wpdb): void { if (false === $wpdb->query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE') || false === $wpdb->query('START TRANSACTION')) throw new RuntimeException('Could not start representative transaction.'); },
                'commit' => static function () use ($wpdb): void { if (false === $wpdb->query('COMMIT')) throw new RuntimeException('Could not COMMIT representative transaction.'); },
                'rollback' => static function () use ($wpdb): void { if (false === $wpdb->query('ROLLBACK')) throw new RuntimeException('Could not ROLLBACK representative transaction.'); },
                'find' => static fn (string $target): array => tio2_site_a_product_representative_find_wp($expected[$target]),
                'write' => static fn (array $record) => tio2_site_a_product_representative_write_wp($record),
                'snapshot_other_products' => static fn (): string => tio2_site_a_product_representative_other_products_hash(),
                'assert_other_products' => static function (string $hash): void { if (! hash_equals($hash, tio2_site_a_product_representative_other_products_hash())) throw new RuntimeException('A non-target Product changed.'); },
                'snapshot_site_b' => static fn (): string => tio2_site_a_product_representative_site_b_hash(),
                'assert_site_b' => static function (string $hash): void { if (! hash_equals($hash, tio2_site_a_product_representative_site_b_hash())) throw new RuntimeException('Site B changed.'); },
                'assert_anonymous_hidden' => static function (): void {
                    $post = get_post(tio2_site_a_product_representative_post_id('TP-C120'));
                    $user_id = get_current_user_id();
                    wp_set_current_user(0);
                    try { if (! $post instanceof WP_Post || true !== tio2_product_graphql_visibility(null, 'PostObject', $post)) throw new RuntimeException('Anonymous Product visibility was exposed.'); }
                    finally { wp_set_current_user($user_id); }
                },
            ];
            $result = tio2_site_a_product_representative_execute($capability['mode'], $fixture, $capability['fixtureSha256'], $capability['planSha256'], $operations);
        } finally {
            $wpdb->get_var($wpdb->prepare('SELECT RELEASE_LOCK(%s)', $lock));
        }
        WP_CLI::log('TIO2_SITE_A_PRODUCT_REPRESENTATIVE_RESULT ' . wp_json_encode([
            'mode' => $result['mode'], 'fixtureSha256' => $result['fixtureSha256'],
            'actions' => array_map(static fn (array $action): array => ['target' => $action['target'], 'action' => $action['action']], $result['actions']),
        ]));
    } catch (Throwable $error) {
        WP_CLI::error('Site A representative import failed: ' . $error->getMessage());
    }
}
