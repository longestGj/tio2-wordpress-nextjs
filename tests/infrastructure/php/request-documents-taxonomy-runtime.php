<?php

declare(strict_types=1);

namespace GraphQL\Error {
    final class UserError extends \RuntimeException {}
}

namespace {
    define('ABSPATH', __DIR__);
    $actions = [];
    $taxonomy_types = [];

    function add_action(string $hook, callable|string $callback, int $priority = 10): void
    {
        global $actions;
        $actions[$hook][$priority][] = $callback;
    }
    function register_post_type(string $type, array $args): void {}
    function register_taxonomy_for_object_type(string $taxonomy, string $type): void {}
    function register_taxonomy(string $taxonomy, array $types, array $args): void
    {
        global $taxonomy_types;
        if ('site_scope' === $taxonomy) $taxonomy_types = $types;
    }

    require $argv[1];
    require $argv[2];
    add_action('init', 'tio2_register_content_types');
    ksort($actions['init']);
    foreach ($actions['init'] as $callbacks) {
        foreach ($callbacks as $callback) $callback();
    }
    if (! in_array('tio2_request_docs', $taxonomy_types, true)) {
        throw new \RuntimeException('site_scope was not registered for tio2_request_docs.');
    }
    fwrite(STDOUT, "CONV-DOC taxonomy runtime: PASS\n");
}
