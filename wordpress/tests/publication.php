<?php

function tio2_publication_fail(string $message): void
{
    fwrite(STDERR, $message . "\n");
    exit(1);
}

function tio2_load_public_route_inventory_from_json(string $json): array
{
    try {
        $inventory = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    } catch (JsonException $error) {
        throw new InvalidArgumentException('Invalid public route inventory JSON.', 0, $error);
    }

    if (! is_array($inventory) || array_is_list($inventory)) {
        throw new InvalidArgumentException('Public route inventory must be an object.');
    }
    tio2_assert_publication_exact_keys($inventory, ['version', 'sites'], 'root');
    if ('root-only-v0.1' !== ($inventory['version'] ?? null) || ! is_array($inventory['sites']) || array_is_list($inventory['sites'])) {
        throw new InvalidArgumentException('Public route inventory root is invalid.');
    }
    tio2_assert_publication_exact_keys($inventory['sites'], ['tio2-a', 'tio2-b'], 'sites');

    $expected_templates = [
        'tio2-a' => 'site-a-homepage-active',
        'tio2-b' => 'site-b-homepage-v0.1-frozen',
    ];
    foreach ($expected_templates as $site_id => $expected_template) {
        $site = $inventory['sites'][$site_id];
        if (! is_array($site) || array_is_list($site)) {
            throw new InvalidArgumentException("Public route inventory site is invalid: {$site_id}.");
        }
        tio2_assert_publication_exact_keys($site, ['expectedPublicUrls', 'routes'], "site {$site_id}");
        if (! is_array($site['routes']) || ! array_is_list($site['routes'])) {
            throw new InvalidArgumentException("Public route list is invalid: {$site_id}.");
        }

        $paths = [];
        foreach ($site['routes'] as $route) {
            if (! is_array($route) || array_is_list($route)) {
                throw new InvalidArgumentException("Public route is invalid: {$site_id}.");
            }
            tio2_assert_publication_exact_keys($route, ['path', 'template'], "route {$site_id}");
            if (! is_string($route['path'])) {
                throw new InvalidArgumentException("Public route path is invalid: {$site_id}.");
            }
            if (in_array($route['path'], $paths, true)) {
                throw new InvalidArgumentException("Duplicate public route: {$site_id} {$route['path']}.");
            }
            $paths[] = $route['path'];
        }

        if (1 !== count($site['routes'])) {
            throw new InvalidArgumentException("Public route inventory must contain one root route: {$site_id}.");
        }
        if (! is_int($site['expectedPublicUrls']) || count($site['routes']) !== $site['expectedPublicUrls']) {
            throw new InvalidArgumentException("Expected public URL count mismatch: {$site_id}.");
        }

        $route = $site['routes'][0];
        if ('/' !== $route['path']) {
            throw new InvalidArgumentException("Public route path is not canonical: {$site_id}.");
        }
        if ($expected_template !== ($route['template'] ?? null)) {
            throw new InvalidArgumentException("Public route template is invalid: {$site_id}.");
        }
    }

    return $inventory;
}

function tio2_assert_publication_exact_keys(array $value, array $expected_keys, string $context): void
{
    $actual_keys = array_keys($value);
    sort($actual_keys, SORT_STRING);
    sort($expected_keys, SORT_STRING);
    if ($actual_keys !== $expected_keys) {
        throw new InvalidArgumentException("Unexpected public route inventory keys: {$context}.");
    }
}

function tio2_load_public_route_inventory(): array
{
    $json = file_get_contents(__DIR__ . '/../plugins/tio2-site-model/config/public-routes.json');
    if (false === $json) {
        throw new RuntimeException('Could not read the public route inventory.');
    }

    return tio2_load_public_route_inventory_from_json($json);
}

function tio2_assert_public_route_inventory(): void
{
    $inventory = tio2_load_public_route_inventory();
    $expected_routes = [
        'tio2-a' => ['expectedPublicUrls' => 1, 'path' => '/', 'template' => 'site-a-homepage-active'],
        'tio2-b' => ['expectedPublicUrls' => 1, 'path' => '/', 'template' => 'site-b-homepage-v0.1-frozen'],
    ];

    foreach ($expected_routes as $site_id => $expected) {
        if (($inventory['sites'][$site_id]['expectedPublicUrls'] ?? null) !== $expected['expectedPublicUrls']) {
            tio2_publication_fail("Public route inventory count drifted for {$site_id}.");
        }

        if (($inventory['sites'][$site_id]['routes'] ?? null) !== [[
            'path' => $expected['path'],
            'template' => $expected['template'],
        ]]) {
            tio2_publication_fail("Public route inventory mapping drifted for {$site_id}.");
        }
    }

    foreach ([
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-a-homepage-active"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"products","template":"site-a-homepage-active"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":2,"routes":[{"path":"/","template":"site-a-homepage-active"},{"path":"/","template":"site-a-homepage-active"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"invalid-template"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
        '{"version":"root-only-v0.1","sites":{"tio2-a":{"expectedPublicUrls":2,"routes":[{"path":"/","template":"site-a-homepage-active"}]},"tio2-b":{"expectedPublicUrls":1,"routes":[{"path":"/","template":"site-b-homepage-v0.1-frozen"}]}}}',
    ] as $invalid_json) {
        try {
            tio2_load_public_route_inventory_from_json($invalid_json);
            tio2_publication_fail('Invalid public route inventory was accepted.');
        } catch (InvalidArgumentException $error) {
        }
    }
}

tio2_assert_public_route_inventory();
fwrite(STDOUT, "TiO2 public route inventory test passed\n");
