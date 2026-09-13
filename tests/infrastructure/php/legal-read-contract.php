<?php
declare(strict_types=1);

namespace GraphQL\Error {
    final class UserError extends \RuntimeException {}
}

namespace {
    define('ABSPATH', __DIR__);

    final class WP_Error {
        public function __construct(public string $code, public string $message) {}
    }

    /** @var array<int, array<string, mixed>> */
    $GLOBALS['legal_records'] = [];

    function is_wp_error($value): bool { return $value instanceof WP_Error; }
    function add_action(...$args): void {}
    function register_post_type(...$args): void {}
    function register_taxonomy_for_object_type(...$args): void {}
    function register_graphql_field(...$args): void {}
    function wp_json_encode($value, int $flags = 0): string { return (string) json_encode($value, $flags); }
    function get_post_type(int $post_id): string { return (string) ($GLOBALS['legal_records'][$post_id]['post_type'] ?? ''); }
    function get_post_status(int $post_id): string { return (string) ($GLOBALS['legal_records'][$post_id]['status'] ?? ''); }
    function get_post_field(string $field, int $post_id): string { return (string) ($GLOBALS['legal_records'][$post_id][$field] ?? ''); }
    function get_post_meta(int $post_id, string $key, bool $single) {
        $record = $GLOBALS['legal_records'][$post_id] ?? [];
        return match ($key) {
            'public_path' => $record['publishingFields']['publicPath'] ?? '',
            '_tio2_my_legal_page_contract_json' => $record['malaysiaLegalPageContractJson'] ?? '',
            default => '',
        };
    }
    function wp_get_post_terms(int $post_id, string $taxonomy, array $args = []) {
        $nodes = $GLOBALS['legal_records'][$post_id]['siteScopes']['nodes'] ?? [];
        return array_map(static fn($node) => (string) ($node['slug'] ?? ''), is_array($nodes) ? $nodes : []);
    }
    function get_posts(array $args): array {
        $ids = [];
        foreach ($GLOBALS['legal_records'] as $post_id => $record) {
            if (($record['post_type'] ?? null) !== ($args['post_type'] ?? null)) continue;
            if (($record['status'] ?? null) !== ($args['post_status'] ?? null)) continue;
            $scopes = array_map(static fn($node) => $node['slug'] ?? null, $record['siteScopes']['nodes'] ?? []);
            if (!in_array('tio2-my', $scopes, true)) continue;
            $ids[] = $post_id;
            if (count($ids) >= (int) ($args['numberposts'] ?? PHP_INT_MAX)) break;
        }
        return $ids;
    }

    function check(bool $condition, string $message): void {
        if (!$condition) throw new \RuntimeException($message);
    }

    function legal_source_records(array $pages): array {
        return array_map(static fn(array $page, int $index): array => [
            'id' => 'legal-' . $index,
            'post_type' => 'tio2_legal_page',
            'post_modified_gmt' => '2026-09-13 08:00:00',
            'modifiedGmt' => '2026-09-13T08:00:00',
            'status' => 'publish',
            'siteScopes' => ['nodes' => [['slug' => 'tio2-my']]],
            'publishingFields' => ['publicPath' => rtrim((string) $page['path'], '/')],
            'malaysiaLegalPageContractJson' => json_encode($page, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ], $pages, array_keys($pages));
    }

    function legal_set_path(array &$root, array $path, $value, bool $delete = false): void {
        $node =& $root;
        $last = array_pop($path);
        foreach ($path as $key) $node =& $node[$key];
        if ($delete) unset($node[$last]);
        else $node[$last] = $value;
    }

    function legal_apply_case(array $pages, array $mutations): array {
        $records = legal_source_records($pages);
        foreach ($mutations as $mutation) {
            if (($mutation['target'] ?? null) === 'collection') {
                $records[(int) $mutation['toIndex']] = $records[(int) $mutation['fromIndex']];
                continue;
            }
            $record_index = (int) ($mutation['recordIndex'] ?? 0);
            $operation = (string) ($mutation['operation'] ?? '');
            if (($mutation['target'] ?? null) === 'source') {
                legal_set_path($records[$record_index], $mutation['path'] ?? [], $mutation['value'] ?? null, $operation === 'delete');
                continue;
            }
            $contract = json_decode((string) $records[$record_index]['malaysiaLegalPageContractJson'], true);
            $value = $operation === 'repeat'
                ? str_repeat((string) ($mutation['value'] ?? ''), (int) ($mutation['count'] ?? 0))
                : ($mutation['value'] ?? null);
            legal_set_path($contract, $mutation['path'] ?? [], $value, $operation === 'delete');
            $records[$record_index]['malaysiaLegalPageContractJson'] = json_encode($contract, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }
        return $records;
    }

    function legal_install_records(array $records): void {
        $GLOBALS['legal_records'] = [];
        foreach (array_values($records) as $index => $record) $GLOBALS['legal_records'][$index + 1] = $record;
    }

    function legal_resolve(): array {
        return json_decode(tio2_resolve_malaysia_legal_pages_record_json(), true, 512, JSON_THROW_ON_ERROR);
    }

    $plugin = dirname(__DIR__, 3) . '/wordpress/plugins/tio2-site-model';
    require $plugin . '/includes/legal-pages-v01.php';

    $approved = json_decode((string) file_get_contents($plugin . '/config/tio2-my-legal-pages.json'), true, 512, JSON_THROW_ON_ERROR);
    $vectors = json_decode((string) file_get_contents(dirname(__DIR__, 2) . '/fixtures/legal/read-contract-cases.json'), true, 512, JSON_THROW_ON_ERROR);
    check(($vectors['version'] ?? null) === 1, 'shared vector version');

    $changed = legal_source_records($approved['pages']);
    $changed_contract = json_decode($changed[0]['malaysiaLegalPageContractJson'], true, 512, JSON_THROW_ON_ERROR);
    $changed_contract['buyerVisibleMarkdown'] = "# Published policy\n\n**Last updated: 14 September 2026**\n\nPublished introduction.\n\n## Published information\n\nPublished body.";
    $changed[0]['malaysiaLegalPageContractJson'] = json_encode($changed_contract, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    legal_install_records($changed);
    check(is_wp_error(tio2_validate_legal_page_v01_contract(1)), 'write approval remains enforced');
    $changed_response = legal_resolve();
    check(str_contains($changed_response[0]['malaysiaLegalPageContractJson'], 'Published body.'), 'CMS prose returned');
    check(true === tio2_validate_legal_page_read_contract(1), 'published read is independent');

    $accepted_resolver_records = null;
    $accepted = 0;
    $rejected = 0;
    foreach ($vectors['cases'] as $case) {
        legal_install_records(legal_apply_case($approved['pages'], $case['mutations']));
        try {
            $response = legal_resolve();
            check(($case['expected'] ?? null) === 'accept', 'accepted rejecting vector: ' . $case['name']);
            check(str_contains(json_encode($response, JSON_UNESCAPED_UNICODE), (string) $case['expectedOutputText']), 'accepted output text: ' . $case['name']);
            $accepted++;
            if ($accepted_resolver_records === null) $accepted_resolver_records = $response;
        } catch (\GraphQL\Error\UserError $error) {
            check(($case['expected'] ?? null) === 'reject', 'rejected accepting vector: ' . $case['name']);
            $rejected++;
        }
    }
    check($accepted + $rejected === count($vectors['cases']), 'all shared vectors executed');
    check($accepted_resolver_records !== null, 'accepted resolver output captured');

    $dangerous = legal_source_records($approved['pages']);
    $dangerous_contract = json_decode($dangerous[0]['malaysiaLegalPageContractJson'], true, 512, JSON_THROW_ON_ERROR);
    $dangerous_contract['releaseState'] = '<script>private evidence</script>';
    $dangerous_contract['unrecognizedCmsField'] = ['secret' => 'javascript:alert(1)'];
    $dangerous[0]['malaysiaLegalPageContractJson'] = json_encode($dangerous_contract, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    legal_install_records($dangerous);
    check(true === tio2_validate_legal_page_read_contract(1), 'unknown metadata does not redefine the public contract');
    $public_contract = json_decode(legal_resolve()[0]['malaysiaLegalPageContractJson'], true, 512, JSON_THROW_ON_ERROR);
    check(!array_key_exists('releaseState', $public_contract), 'release evidence is not public');
    check(!array_key_exists('unrecognizedCmsField', $public_contract), 'dangerous unknown metadata is not public');

    $foreign = legal_source_records($approved['pages']);
    $foreign[0]['siteScopes']['nodes'][0]['slug'] = 'tio2-a';
    legal_install_records($foreign);
    check(is_wp_error(tio2_validate_legal_page_v01_contract(1)), 'foreign-scope write remains rejected');

    $draft = legal_source_records($approved['pages']);
    $draft[0]['status'] = 'draft';
    legal_install_records($draft);
    check(is_wp_error(tio2_validate_legal_page_read_contract(1)), 'draft read is rejected directly');

    $wrong_type = legal_source_records($approved['pages']);
    $wrong_type[0]['post_type'] = 'post';
    legal_install_records($wrong_type);
    check(is_wp_error(tio2_validate_legal_page_read_contract(1)), 'foreign post type is rejected directly');

    $duplicate_scope = legal_source_records($approved['pages']);
    $duplicate_scope[0]['siteScopes']['nodes'][] = ['slug' => 'tio2-a'];
    legal_install_records($duplicate_scope);
    check(is_wp_error(tio2_validate_legal_page_read_contract(1)), 'additional site scope is rejected directly');

    $repeated_scope = legal_source_records($approved['pages']);
    $repeated_scope[0]['siteScopes']['nodes'][] = ['slug' => 'tio2-my'];
    legal_install_records($repeated_scope);
    check(is_wp_error(tio2_validate_legal_page_read_contract(1)), 'repeated site scope is rejected directly');

    $result = [
        'phpVersion' => PHP_VERSION,
        'intl' => extension_loaded('intl'),
        'mbstring' => extension_loaded('mbstring'),
        'caseCount' => count($vectors['cases']),
        'accepted' => $accepted,
        'rejected' => $rejected,
        'acceptedResolverRecords' => $accepted_resolver_records,
    ];
    if (in_array('--json', $argv, true)) echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    else echo "PASS {$result['caseCount']} shared legal read vectors ({$accepted} accepted, {$rejected} rejected); real resolver and write isolation\n";
}
