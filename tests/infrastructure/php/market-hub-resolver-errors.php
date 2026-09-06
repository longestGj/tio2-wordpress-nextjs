<?php

declare(strict_types=1);

namespace GraphQL\Error {
    final class UserError extends \RuntimeException
    {
    }
}

namespace {
    define('ABSPATH', __DIR__);

    final class WP_Error
    {
        public function __construct(
            public readonly string $code,
            public readonly string $message
        ) {
        }
    }

    $resolver_mode = 'missing';

    function add_action(): void {}
    function register_post_type(): void {}
    function register_taxonomy_for_object_type(): void {}
    function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }
    function get_posts(): array
    {
        global $resolver_mode;
        return match ($resolver_mode) {
            'missing' => [],
            'multiple' => [41, 42],
            default => [41],
        };
    }
    function get_post_type(): string { return 'foreign_type'; }

    require $argv[1];

    $expectations = [
        'missing' => 'The Malaysia Markets Hub record is missing.',
        'multiple' => 'Multiple Malaysia Markets Hub records were found.',
        'invalid' => 'The Malaysia Markets Hub record failed scope or contract validation.',
    ];

    foreach ($expectations as $mode => $expected_message) {
        $resolver_mode = $mode;
        try {
            tio2_resolve_malaysia_market_hub_record_json();
            throw new RuntimeException("Expected {$mode} to throw GraphQL UserError.");
        } catch (\GraphQL\Error\UserError $error) {
            if ($expected_message !== $error->getMessage()) {
                throw new RuntimeException("Unexpected {$mode} message: {$error->getMessage()}");
            }
        }
    }

    fwrite(STDOUT, "MARKET-000 resolver missing/multiple/invalid errors: PASS\n");
}
