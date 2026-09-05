<?php
declare(strict_types=1);

// Run the real seed against in-memory WP storage; never connect to WordPress.
define('TIO2_MY_UK_MARKET_CONTRACT_META', '_tio2_my_uk_market_contract_json');
final class WP_Error {
    public function get_error_message(): string { return 'Simulated storage failure'; }
}
function is_wp_error(mixed $value): bool { return $value instanceof WP_Error; }
function wp_get_environment_type(): string { return 'local'; }
function get_posts(array $args): array { return []; }
function wp_insert_post(array $args, bool $error): int { $GLOBALS['status'] = 'draft'; return 42; }
function wp_set_object_terms(...$args): array { return [1]; }
function update_post_meta(...$args): bool { return true; }
function tio2_validate_market_page_uk_v01_contract(int $id): array { return ['valid' => true]; }
function wp_update_post(array $args, bool $error = false): mixed {
    $GLOBALS['requestedErrors'] = $error;
    if ($GLOBALS['mode'] === 'wp-error') return new WP_Error();
    if ($GLOBALS['mode'] === 'zero') return 0;
    if ($GLOBALS['mode'] === 'false') return false;
    if ($GLOBALS['mode'] !== 'wrong-status') $GLOBALS['status'] = 'publish';
    return 42;
}
function get_post_status(int $id): string { return $GLOBALS['status']; }
function wp_json_encode(mixed $value): string { return json_encode($value, JSON_THROW_ON_ERROR); }

$failures = [];
foreach (['wp-error', 'zero', 'false', 'wrong-status', 'success'] as $mode) {
    $status = 'draft';
    $requestedErrors = false;
    $thrown = null;
    ob_start();
    try { require '/work/wordpress/seed/apply-tio2-my-market-uk-001.php'; }
    catch (RuntimeException $error) { $thrown = $error; }
    $output = ob_get_clean();
    if ($mode === 'success') {
        if ($thrown !== null || !$requestedErrors || $status !== 'publish' ||
            json_decode($output, true) !== ['postId' => 42, 'siteScope' => 'tio2-my', 'releaseEnabled' => false]) {
            $failures[] = 'Valid seed did not confirm storage publish with errors enabled';
        }
    } elseif ($thrown === null || $output !== '') {
        $failures[] = "Seed reported success after $mode";
    }
}
if ($failures) throw new RuntimeException(implode('; ', $failures));
echo "UK seed: 4 failure paths reject without success output; valid local storage publish PASS\n";
