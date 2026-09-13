<?php
declare(strict_types=1);

namespace GraphQL\Error { final class UserError extends \RuntimeException {} }
namespace {
    define('ABSPATH', __DIR__);
    final class WP_Error { public function __construct(public string $code, public string $message = '', public array $data = []) {} }
    final class WP_Post {
        public function __construct(public int $ID, public string $post_type, public string $post_status, public string $post_name) {}
    }
    $GLOBALS['records'] = [];
    function is_wp_error($value): bool { return $value instanceof WP_Error; }
    function add_action(...$args): void {}
    function add_filter(...$args): void {}
    function wp_json_encode($value, int $flags = 0): string { return json_encode($value, $flags | JSON_THROW_ON_ERROR); }
    function wp_strip_all_tags(string $value): string { return strip_tags($value); }
    function get_post(int $id): ?WP_Post {
        $r = $GLOBALS['records'][$id] ?? null;
        return $r ? new WP_Post($id, $r['post_type'], $r['post_status'], $r['post_name']) : null;
    }
    function get_post_type(int $id): string { return get_post_field('post_type', $id); }
    function get_post_status(int $id): string { return get_post_field('post_status', $id); }
    function get_post_field(string $field, int $id): string { return (string) ($GLOBALS['records'][$id][$field] ?? ''); }
    function get_post_modified_time(string $format, bool $gmt, WP_Post $post): string { return '2026-09-14T08:00:00'; }
    function get_post_meta(int $id, string $key, bool $single) { return $GLOBALS['records'][$id]['meta'][$key] ?? ''; }
    function get_field(string $key, int $id, bool $format = true) { return get_post_meta($id, $key, true); }
    function wp_get_post_terms(int $id, string $taxonomy, array $args = []): array { return $GLOBALS['records'][$id]['scopes'] ?? []; }
    function wp_is_post_revision(int $id): bool { return $GLOBALS['records'][$id]['revision'] ?? false; }
    function wp_is_post_autosave(int $id): bool { return $GLOBALS['records'][$id]['autosave'] ?? false; }
    function get_posts(array $args): array {
        $ids = [];
        foreach ($GLOBALS['records'] as $id => $record) {
            if (!in_array($record['post_type'], (array) ($args['post_type'] ?? 'post'), true)) continue;
            if (!in_array($record['post_status'], (array) ($args['post_status'] ?? 'publish'), true)) continue;
            if (isset($args['name']) && $record['post_name'] !== $args['name']) continue;
            if (isset($args['meta_key']) && ($record['meta'][$args['meta_key']] ?? null) !== $args['meta_value']) continue;
            foreach ($args['tax_query'] ?? [] as $query) {
                if (!array_intersect($query['terms'], $record['scopes'])) continue 2;
            }
            $ids[] = $id;
        }
        $limit = $args['numberposts'] ?? $args['posts_per_page'] ?? 5;
        return $limit === -1 ? $ids : array_slice($ids, 0, $limit);
    }
    // Route targets outside this task are represented as ready; their validators are not replaced in production.
    function tio2_my_product_target_ready(string $id, string $href): bool { return true; }
    function check(bool $condition, string $message): void { if (!$condition) throw new \RuntimeException($message); }
    function at_path($value, string $path) {
        foreach (explode('.', $path) as $key) $value = is_array($value) ? ($value[$key] ?? null) : null;
        return $value;
    }
    function mutate(array $value, array $mutations): array {
        foreach ($mutations as $change) {
            $path = explode('.', $change['path']); $key = array_pop($path); $node =& $value;
            foreach ($path as $part) $node =& $node[$part];
            switch ($change['operation'] ?? '') {
                case 'delete': unset($node[$key]); break;
                case 'append': $node[$key][] = $change['value']; break;
                case 'reverse': $node[$key] = array_reverse($node[$key]); break;
                case 'repeat': $node[$key] = str_repeat($change['value'], $change['count']); break;
                case 'repeatItem': $node[$key] = array_fill(0, $change['count'], $change['value']); break;
                default: $node[$key] = $change['value'];
            }
            unset($node);
        }
        return $value;
    }
    function install(array $value, string $page): void {
        $home = $page === 'HOME-001';
        $GLOBALS['records'] = [1 => [
            'post_type' => $home ? 'tio2_homepage' : 'tio2_application_hub', 'post_status' => 'publish',
            'post_name' => $home ? 'tio2-my--homepage' : 'tio2-my-applications',
            'post_modified_gmt' => '2026-09-14 08:00:00', 'scopes' => ['tio2-my'],
            'meta' => [
                'public_path' => $home ? '/' : '/applications',
                'homepage_schema_version' => 'homepage-v0.4-malaysia',
                $home ? '_tio2_my_homepage_contract_json' : '_tio2_my_application_hub_contract_json' => json_encode($value, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
            ],
        ]];
    }
    function resolve_content(string $page): array {
        if ($page === 'HOME-001' && tio2_homepage_graphql_visibility(true, 'PostObject', get_post(1)) !== false) {
            throw new \GraphQL\Error\UserError('Homepage is private at the GraphQL model boundary');
        }
        $json = $page === 'HOME-001'
            ? tio2_resolve_malaysia_homepage_contract_json(get_post(1))
            : json_decode(tio2_resolve_malaysia_application_hub_record_json(), true, 512, JSON_THROW_ON_ERROR)['malaysiaApplicationHubContractJson'];
        if (!is_string($json)) throw new \GraphQL\Error\UserError('Homepage read was rejected');
        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }
    $plugin = dirname(__DIR__, 3) . '/wordpress/plugins/tio2-site-model';
    require $plugin . '/includes/content-types.php';
    require $plugin . '/includes/fields.php';
    require $plugin . '/includes/homepage-v04.php';
    require $plugin . '/includes/application-hub-v01.php';
    require $plugin . '/includes/editorial-v01.php';
    require $plugin . '/includes/preview.php';
    require $plugin . '/includes/product-detail-v01.php';
    $approved = [
        'HOME-001' => json_decode(file_get_contents($plugin . '/config/tio2-my-homepage.json'), true, 512, JSON_THROW_ON_ERROR),
        'APP-000' => json_decode(file_get_contents($plugin . '/config/tio2-my-application-hub.json'), true, 512, JSON_THROW_ON_ERROR),
    ];
    if (in_array('--visibility-only', $argv, true) || in_array('--parent-only', $argv, true)) {
        $visibility = in_array('--visibility-only', $argv, true);
        $available = static fn(): bool => $visibility
            ? tio2_homepage_graphql_visibility(true, 'PostObject', get_post(1)) === false
            : tio2_my_product_detail_required_parent_available('HOME-001', '/');
        $checks = 0;
        install($approved['HOME-001'], 'HOME-001');
        check($available(), 'baseline homepage remains available'); $checks++;
        $changed = $approved['HOME-001'];
        $changed['packageId'] = 'HOME-001-ENTRY-READ-2';
        $changed['hero']['heading'] = 'Current homepage through real read entry';
        install($changed, 'HOME-001');
        check($available(), $visibility ? 'revised homepage is public at GraphQL model visibility' : 'revised homepage is available as required product parent'); $checks++;
        check(is_wp_error(tio2_validate_homepage_contract(1)), 'new content does not authorize a write'); $checks++;
        foreach ([['post_status','draft'],['post_status','future'],['post_status','private'],['post_status','trash'],['post_type','post'],['post_name','wrong-slug'],['scopes',['tio2-a']],['scopes',['tio2-my','tio2-a']],['scopes',['tio2-my','tio2-my']],['revision',true],['autosave',true]] as [$key,$value]) {
            install($changed, 'HOME-001'); $GLOBALS['records'][1][$key] = $value;
            check(!$available(), 'read entry rejects ' . $key); $checks++;
        }
        foreach (['publish','draft'] as $status) {
            install($changed, 'HOME-001'); $GLOBALS['records'][2] = $GLOBALS['records'][1]; $GLOBALS['records'][2]['post_status'] = $status;
            check(!$available(), 'read entry rejects duplicate reserved identity ' . $status); $checks++;
        }
        foreach (['page','post'] as $type) {
            install($changed, 'HOME-001'); $GLOBALS['records'][2] = $GLOBALS['records'][1]; $GLOBALS['records'][2]['post_type'] = $type;
            check(!$available(), 'read entry rejects root occupied by ' . $type); $checks++;
        }
        install($changed, 'HOME-001'); $GLOBALS['records'][1]['meta']['homepage_schema_version'] = 'wrong';
        check(!$available(), 'read entry rejects wrong schema'); $checks++;
        install($changed, 'HOME-001'); $GLOBALS['records'] = [];
        check(!$available(), 'read entry rejects missing record'); $checks++;
        $unsafe = $changed; $unsafe['hero']['heading'] = '<script>unsafe</script>'; install($unsafe, 'HOME-001');
        check(!$available(), 'read entry rejects unsafe content'); $checks++;
        install($changed, 'HOME-001');
        if ($visibility) {
            foreach ([true, false, null] as $incoming) {
                check(tio2_homepage_graphql_visibility($incoming, 'OtherModel', get_post(1)) === $incoming, 'other model privacy preserved'); $checks++;
                $GLOBALS['records'][1]['post_status'] = 'draft';
                check(tio2_homepage_graphql_visibility($incoming, 'PostObject', get_post(1)) === $incoming, 'nonpublished privacy preserved'); $checks++;
            }
            foreach (['tio2-a','tio2-b'] as $scope) {
                install($changed, 'HOME-001'); $GLOBALS['records'][1]['scopes'] = [$scope];
                check(tio2_homepage_graphql_visibility(true, 'PostObject', get_post(1)) === true, 'invalid other-site record still private'); $checks++;
            }
        } else {
            check(!tio2_my_product_detail_required_parent_available('HOME-001', '/products/'), 'parent href pairing retained'); $checks++;
            check(!tio2_my_product_detail_required_parent_available('PRODUCT-000', '/products/'), 'missing product parent remains unavailable'); $checks++;
        }
        echo json_encode(['entry' => $visibility ? 'visibility' : 'required-parent', 'checks' => $checks], JSON_THROW_ON_ERROR);
        exit;
    }
    $vectors = json_decode(file_get_contents(dirname(__DIR__, 2) . '/fixtures/home-application-read-cases.json'), true, 512, JSON_THROW_ON_ERROR);
    // Preserve JSON object/array kinds in injected values, even for numeric object keys.
    $vector_objects = json_decode(file_get_contents(dirname(__DIR__, 2) . '/fixtures/home-application-read-cases.json'), false, 512, JSON_THROW_ON_ERROR);
    $accepted = 0; $rejected = 0; $projected = [];
    foreach ($vectors['cases'] as $case_index => $case) {
        foreach ($case['mutations'] as $change_index => &$change) {
            $raw = $vector_objects->cases[$case_index]->mutations[$change_index];
            if (property_exists($raw, 'value')) $change['value'] = $raw->value;
        }
        unset($change);
        $value = mutate($approved[$case['pageId']], $case['mutations']);
        install($value, $case['pageId']);
        try {
            $result = resolve_content($case['pageId']);
            check($case['expected'] === 'accept', 'accepted rejecting vector: ' . $case['name']);
            foreach ($case['output'] as $output) check(at_path($result, $output['path']) === ($output['value'] ?? null), 'projection: ' . $case['name']);
            $projected[] = ['name' => $case['name'], 'pageId' => $case['pageId'], 'content' => $result];
            $accepted++;
        } catch (\GraphQL\Error\UserError $error) {
            check($case['expected'] === 'reject', 'rejected accepting vector: ' . $case['name'] . ' (' . $error->getMessage() . ')');
            $rejected++;
        }
    }
    $record_checks = 0; $preview_record = null;
    foreach ($approved as $page => $baseline) {
        $read = $page === 'HOME-001' ? 'tio2_validate_homepage_v04_read_record' : 'tio2_validate_application_hub_v01_read_record';
        $write = $page === 'HOME-001' ? 'tio2_validate_homepage_contract' : 'tio2_validate_application_hub_v01_contract';
        install($baseline, $page);
        check(is_wp_error($read(999)), $page . ' missing WP_Post rejected'); $record_checks++;
        check($write(1) === true, $page . ' baseline write allowed');
        $changed = $baseline;
        $changed[$page === 'HOME-001' ? 'packageId' : 'reviewId'] = $page . '-CURRENT-READ';
        install($changed, $page);
        check(is_array($read(1)), $page . ' new tracking read allowed');
        check(is_wp_error($write(1)), $page . ' new tracking cannot claim old approval');
        if ($page === 'HOME-001') check(tio2_editorial_homepage_target_ready(), 'changed homepage readiness');
        foreach ([['post_status','draft'],['post_status','future'],['post_status','private'],['post_status','trash'],['post_type','post'],['post_name','wrong-slug'],['scopes',['tio2-a']],['scopes',['tio2-my','tio2-a']],['scopes',['tio2-my','tio2-my']],['revision',true],['autosave',true]] as [$key,$value]) {
            install($changed, $page); $GLOBALS['records'][1][$key] = $value;
            check(is_wp_error($read(1)), $page . ' rejects record ' . $key);
            $record_checks++;
        }
        install($changed, $page); $GLOBALS['records'][2] = $GLOBALS['records'][1];
        check(is_wp_error($read(1)), $page . ' rejects duplicate identity'); $record_checks++;
        if ($page === 'HOME-001') check(is_wp_error($write(1)), 'write shares duplicate guard');
        install($changed, $page); $GLOBALS['records'][2] = $GLOBALS['records'][1]; $GLOBALS['records'][2]['post_status'] = 'draft';
        check(is_wp_error($read(1)), $page . ' rejects draft reserved identity'); $record_checks++;
        foreach (['page','post'] as $type) {
            install($changed, $page); $GLOBALS['records'][2] = $GLOBALS['records'][1]; $GLOBALS['records'][2]['post_type'] = $type;
            check(is_wp_error($read(1)), $page . ' rejects managed route conflict ' . $type); $record_checks++;
            if ($page === 'HOME-001') {
                check(is_wp_error($write(1)), 'write shares route ownership guard');
                check(!tio2_editorial_homepage_target_ready(), 'root conflict is not ready');
            }
        }
        if ($page === 'HOME-001') {
            install($changed, $page); $GLOBALS['records'][1]['meta']['homepage_schema_version'] = 'wrong';
            check(is_wp_error($read(1)), 'homepage record schema'); $record_checks++;
            install($changed, $page); $GLOBALS['records'][1]['post_status'] = 'draft';
            check(is_array($read(1, 'preview')), 'draft authorized preview read');
            $preview_record = tio2_serialize_homepage_v04_preview(get_post(1), 'tio2-my');
            check($preview_record['status'] === 'draft', 'preview serializer retains draft status');
            $preview_content = json_decode($preview_record['malaysiaHomepageContractJson'], true, 512, JSON_THROW_ON_ERROR);
            check($preview_content['packageId'] === 'HOME-001-CURRENT-READ' && !array_key_exists('footer', $preview_content), 'preview projected CMS tracking and no legacy footer');
            check(tio2_serialize_homepage_v04_preview(get_post(1), 'tio2-a') === [], 'preview foreign scope rejected');
            check(!tio2_editorial_homepage_target_ready(), 'draft is not published readiness');
            check(is_wp_error($read(1, 'anything')), 'unknown mode rejected');
            install($changed, $page); check(is_wp_error($read(1, 'preview')), 'published not draft preview');
            check(tio2_serialize_homepage_v04_preview(get_post(1), 'tio2-my') === [], 'published serializer cannot claim draft');
            $record_checks += 8;
        }
    }
    echo json_encode(['caseCount' => count($vectors['cases']), 'accepted' => $accepted, 'rejected' => $rejected,
        'recordChecks' => $record_checks, 'projected' => $projected, 'previewRecord' => $preview_record], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}
