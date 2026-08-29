<?php

if (! defined('ABSPATH')) {
    exit(1);
}

function tio2_product_collection_fields_test_assert(bool $condition, string $message): void
{
    if (! $condition) {
        fwrite(STDERR, $message . "\n");
        exit(1);
    }
}

foreach ([
    'tio2_product_hub_field_definitions',
    'tio2_product_family_field_definitions',
    'tio2_product_collection_display_field_definitions',
    'tio2_register_product_collection_fields',
] as $function_name) {
    tio2_product_collection_fields_test_assert(function_exists($function_name), "Missing Product collection field function: {$function_name}().");
}

$hub_fields = tio2_product_hub_field_definitions();
$family_fields = tio2_product_family_field_definitions();
$display_fields = tio2_product_collection_display_field_definitions();

$names = static fn (array $fields): array => array_values(array_map(
    static fn (array $field): string => (string) ($field['name'] ?? ''),
    $fields
));

tio2_product_collection_fields_test_assert(
    ['metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer', 'heroImage', 'decisionRail', 'families', 'knownGradeHeading', 'knownGradeHelp', 'decisionPath', 'applicationBoundary', 'resources', 'enquiry', 'faqItems', 'technicalDisclaimer'] === $names($hub_fields),
    'Hub field keys drifted from the Product collection contract.'
);
tio2_product_collection_fields_test_assert(
    ['metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer', 'heroImage', 'decisionRail', 'filters', 'comparisonIntroduction', 'comparisonCaption', 'selectionMethod', 'validationSteps', 'applications', 'resources', 'enquiry', 'faqItems', 'technicalDisclaimer'] === $names($family_fields),
    'Family field keys drifted from the Product collection contract.'
);
tio2_product_collection_fields_test_assert(
    ['familyDisplayOrder', 'familyCardSummary', 'collectionApplicationFocus', 'collectionPerformanceFocus', 'collectionSurfaceTreatmentPositioning', 'collectionFilterTags'] === $names($display_fields),
    'Product collection display field keys drifted from the Product collection contract.'
);

$hub_families = $hub_fields[7] ?? [];
tio2_product_collection_fields_test_assert(
    'repeater' === ($hub_families['type'] ?? null) && 8 === ($hub_families['min'] ?? null) && 8 === ($hub_families['max'] ?? null),
    'Hub must require exactly eight ordered Family references.'
);
$family_filters = $family_fields[7] ?? [];
tio2_product_collection_fields_test_assert(
    'repeater' === ($family_filters['type'] ?? null) && isset($family_filters['sub_fields'][0]['choices']),
    'Family filters must use controlled slug/label pairs.'
);
$family_faq = $family_fields[15] ?? [];
tio2_product_collection_fields_test_assert(
    4 === ($family_faq['min'] ?? null) && 10 === ($family_faq['max'] ?? null),
    'Family FAQ bounds must be 4–10.'
);
$display_order = $display_fields[0] ?? [];
tio2_product_collection_fields_test_assert(
    'number' === ($display_order['type'] ?? null) && 1 === ($display_order['min'] ?? null) && 1 === ($display_order['step'] ?? null),
    'Family display order must be a positive integer.'
);

ob_start();
tio2_register_product_collection_fields();
ob_end_clean();

fwrite(STDOUT, "TiO2 Product collection field registration test passed\n");
