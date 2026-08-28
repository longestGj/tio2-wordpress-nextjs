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

function get_field(string $name, $post_id, bool $format_value = true): mixed
{
    return false;
}

/** @return list<int> */
function wp_get_object_terms(int $post_id, string $taxonomy, array $arguments): array
{
    if (99 !== $post_id || 'product_family' !== $taxonomy || ['fields' => 'ids'] !== $arguments) {
        throw new RuntimeException('Unexpected taxonomy lookup.');
    }

    return [321];
}

require_once dirname(__DIR__) . '/plugins/tio2-site-model/includes/product-contract.php';

$validation = tio2_validate_product_field_definitions([
    [
        'name' => 'family',
        'type' => 'taxonomy',
        'required' => 1,
    ],
], 99);

if (true !== $validation) {
    fwrite(STDERR, "A Product family stored only in the canonical taxonomy did not satisfy the Product contract.\n");
    exit(1);
}

fwrite(STDOUT, "TiO2 Product taxonomy-family storage test passed\n");
