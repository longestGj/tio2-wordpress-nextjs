<?php
declare(strict_types=1);
// wp --user=<actual-editor> eval-file /workspace/wordpress/approved-write.php <approval-id> <operation> <records.json>
// No HTTP bootstrap, actor field, approval root or environment override in the input.
if (PHP_SAPI !== 'cli' || !defined('WP_CLI') || !WP_CLI || !function_exists('tio2_apply_approved_content')) {
    if (PHP_SAPI !== 'cli') http_response_code(404);
    exit(1);
}
if (count($args ?? []) !== 3 || !get_current_user_id()) WP_CLI::error('Choose an actual WordPress user with --user, then supply approval ID, operation and records JSON file.');
$json = @file_get_contents($args[2]);
try {
    if (!is_string($json) || strlen($json)>2097152) throw new RuntimeException();
    tio2_content_decode($json);
    $records = json_decode($json,true,512,JSON_THROW_ON_ERROR);
    if (!is_array($records)) throw new RuntimeException();
} catch (Throwable $error) { WP_CLI::error('Invalid records JSON.'); }
$result = tio2_apply_approved_content($args[0],$args[1],$records);
if (is_wp_error($result)) WP_CLI::error($result->get_error_code().': '.$result->get_error_message());
WP_CLI::line(wp_json_encode($result));
