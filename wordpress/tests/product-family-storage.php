<?php

declare(strict_types=1);

define('ABSPATH', __DIR__);

final class WP_Error
{
    public function __construct(
        public readonly string $code,
        public readonly string $message = '',
        public readonly mixed $data = null
    ) {
    }
}

function is_wp_error($value): bool
{
    return $value instanceof WP_Error;
}

/** @var array<int, mixed> */
$acf_family_values = [];
/** @var array<int, mixed> */
$taxonomy_family_results = [];
$taxonomy_lookup_count = 0;

function get_field(string $name, $post_id, bool $format_value = true): mixed
{
    global $acf_family_values;
    return 'family' === $name && is_int($post_id)
        ? ($acf_family_values[$post_id] ?? false)
        : false;
}

function wp_get_object_terms(int $post_id, string $taxonomy, array $arguments): mixed
{
    global $taxonomy_family_results, $taxonomy_lookup_count;
    if ('product_family' !== $taxonomy || ['fields' => 'ids'] !== $arguments) {
        throw new RuntimeException('Unexpected taxonomy lookup.');
    }
    $taxonomy_lookup_count++;
    return $taxonomy_family_results[$post_id] ?? [];
}

require_once dirname(__DIR__) . '/plugins/tio2-site-model/includes/product-contract.php';

/** @var list<array<string, mixed>> $family_definition */
$family_definition = [[
    'name' => 'family',
    'type' => 'taxonomy',
    'required' => 1,
]];

function assert_same($expected, $actual, string $message): void
{
    if ($expected !== $actual) {
        fwrite(STDERR, $message . "\n");
        exit(1);
    }
}

function assert_missing_family(int $post_id, string $case): void
{
    global $family_definition;
    $validation = tio2_validate_product_field_definitions($family_definition, $post_id);
    if (! $validation instanceof WP_Error || 'product_field_missing' !== $validation->code) {
        fwrite(STDERR, "{$case} did not fail closed as product_field_missing.\n");
        exit(1);
    }
}

$acf_family_values[95] = 777;
$taxonomy_family_results[95] = [321];
$lookups_before_acf = $taxonomy_lookup_count;
assert_same(777, tio2_product_contract_field_value('family', 95), 'A populated ACF family did not retain priority.');
assert_same($lookups_before_acf, $taxonomy_lookup_count, 'A populated ACF family unexpectedly queried taxonomy.');

$taxonomy_family_results[96] = [];
assert_missing_family(96, 'Zero taxonomy terms');

$taxonomy_family_results[97] = [321, 654];
assert_missing_family(97, 'Multiple taxonomy terms');

$taxonomy_family_results[98] = new WP_Error('taxonomy_failure');
assert_missing_family(98, 'Taxonomy WP_Error');

$taxonomy_family_results[99] = [321];
assert_same(321, tio2_product_contract_field_value('family', 99), 'One canonical taxonomy family was not normalized to its term ID.');
$validation = tio2_validate_product_field_definitions($family_definition, 99);

if (true !== $validation) {
    fwrite(STDERR, "A Product family stored only in the canonical taxonomy did not satisfy the Product contract.\n");
    exit(1);
}

fwrite(STDOUT, "TiO2 Product taxonomy-family storage test passed\n");
