<?php

declare(strict_types=1);

namespace GraphQL\Error {
    final class UserError extends \RuntimeException
    {
    }
}

namespace {
    define('ABSPATH', __DIR__);

    function add_action(): void {}
    function wp_parse_url(string $url) { return parse_url($url); }

    require $argv[1];

    $payload_json = base64_decode((string) ($argv[2] ?? ''), true);
    $payload = is_string($payload_json) ? json_decode($payload_json, true) : null;
    if (! is_array($payload)) throw new RuntimeException('Invalid parity payload.');
    $registry = [
        'RES-ORIGIN' => 'APPROVED_PRD_V0.3',
        'RES-PROC' => 'FIXTURE_PUBLIC_ELIGIBLE',
        'RES-TRADE-EU' => 'FIXTURE_PUBLIC_ELIGIBLE',
    ];
    $mapping = static fn (string $page_id, string $status, string $path): bool =>
        ($registry[$page_id] ?? null) === $status && str_starts_with($path, '/resources/');
    $ready = static fn (string $page_id, string $path): bool =>
        '' !== $page_id && str_starts_with($path, '/resources/');

    $output = [];
    foreach ($payload as $name => $relations) {
        if (! is_array($relations)) throw new RuntimeException('Invalid parity relations.');
        $output[$name] = tio2_my_resource_public_projection($relations, $mapping, $ready);
    }
    $output['REGISTRY_POLICY'] = [
        'originApproved' => tio2_my_resource_mapping_allows_public(
            'RES-ORIGIN',
            'APPROVED_PRD_V0.3',
            '/resources/non-china-titanium-dioxide/'
        ),
        'inventedStatus' => tio2_my_resource_mapping_allows_public(
            'RES-ORIGIN',
            'PUBLIC_ELIGIBLE',
            '/resources/non-china-titanium-dioxide/'
        ),
        'candidate' => tio2_my_resource_mapping_allows_public(
            'RES-PROC',
            'NEW_PAGE_CANDIDATE',
            '/resources/chloride-vs-sulfate-titanium-dioxide/'
        ),
        'plannedTrade' => tio2_my_resource_mapping_allows_public(
            'RES-TRADE-EU',
            'PLANNED_CONTENT',
            '/resources/eu-titanium-dioxide-anti-dumping-duty/'
        ),
    ];
    fwrite(STDOUT, (string) json_encode($output, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
}
