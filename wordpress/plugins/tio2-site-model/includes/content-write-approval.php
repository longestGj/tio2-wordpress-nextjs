<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;
require_once __DIR__ . '/content-write-contract.php';

function tio2_content_approval_id($value): bool {
    return is_string($value) && preg_match('/\A[A-Za-z0-9][A-Za-z0-9_-]{0,95}\z/', $value) === 1;
}
function tio2_content_approval_hash($value): bool {
    return is_string($value) && preg_match('/\A[0-9a-f]{64}\z/', $value) === 1;
}
function tio2_content_approval_keys(array $value, array $keys): bool {
    $actual = array_keys($value); sort($actual, SORT_STRING); sort($keys, SORT_STRING);
    return $actual === $keys;
}
/** Validate proof format, not its source authority. @return true|WP_Error */
function tio2_content_approval_shape(array $approval) {
    if (!tio2_content_approval_keys($approval, ['schemaVersion','approvalId','sourceRef','sourceSha256','siteId','environmentId','validFrom','validUntil','operation','records']) ||
        $approval['schemaVersion'] !== 'd16-content-approval-v1' || !tio2_content_approval_id($approval['approvalId']) ||
        !is_string($approval['sourceRef']) || $approval['sourceRef'] === '' || trim($approval['sourceRef']) !== $approval['sourceRef'] ||
        strlen($approval['sourceRef']) > 512 || preg_match('/[<>\x00-\x1f\x7f]/u', $approval['sourceRef']) !== 0 ||
        !tio2_content_approval_hash($approval['sourceSha256']) || !is_int($approval['validFrom']) || !is_int($approval['validUntil']) ||
        $approval['validFrom'] < 0 || $approval['validUntil'] < $approval['validFrom'] || $approval['validUntil'] > 9007199254740991) {
        return new WP_Error('approval_untrusted', 'Invalid approval evidence.');
    }
    if (!is_array($approval['records']) || !array_is_list($approval['records']) || count($approval['records']) < 1 || count($approval['records']) > 2) return new WP_Error('approval_scope', 'Invalid approval pages.');
    $previous = '';
    foreach ($approval['records'] as $record) {
        if (!is_array($record) || !tio2_content_approval_keys($record, ['pageId','locale','beforeSha256','afterSha256']) ||
            !in_array($record['pageId'], ['APP-000','HOME-001'], true) || $record['locale'] !== 'en' || strcmp($previous, $record['pageId']) >= 0) return new WP_Error('approval_scope', 'Invalid approval pages.');
        if (!tio2_content_approval_hash($record['beforeSha256']) || !tio2_content_approval_hash($record['afterSha256'])) return new WP_Error('approval_content', 'Invalid approval content digest.');
        $previous = $record['pageId'];
    }
    return true;
}

/** Pure matching only. Production callers MUST reload using tio2_load_content_approval
 * for each operation and pass system time(), never a request/package clock.
 * This function cannot turn an untrusted payload into approval authority.
 * @return true|WP_Error
 */
function tio2_check_content_approval(array $approval, string $environment_id, string $operation, array $before, array $after, int $now) {
    $shape = tio2_content_approval_shape($approval);
    if (is_wp_error($shape)) return $shape;
    $pages = array_column($approval['records'], 'pageId');
    $before_pages = array_keys($before); sort($before_pages, SORT_STRING);
    $after_pages = array_keys($after); sort($after_pages, SORT_STRING);
    if ($approval['siteId'] !== 'tio2-my' || $environment_id === '' || $approval['environmentId'] !== $environment_id ||
        !in_array($operation, ['update-published','publish-draft'], true) || $approval['operation'] !== $operation ||
        $before_pages !== $pages || $after_pages !== $pages) return new WP_Error('approval_scope', 'Approval does not cover this operation.');
    if ($now < $approval['validFrom'] || $now >= $approval['validUntil']) return new WP_Error('approval_expired', 'Approval is not currently effective.');
    foreach ($approval['records'] as $record) {
        $page = $record['pageId'];
        try {
            if (!is_string($before[$page]) || !is_string($after[$page]) ||
                !hash_equals($record['beforeSha256'], tio2_content_digest($before[$page])) ||
                !hash_equals($record['afterSha256'], tio2_content_digest($after[$page]))) return new WP_Error('approval_content', 'Approval content version does not match.');
        } catch (Throwable $error) {
            return new WP_Error('approval_content', 'Approval content version does not match.');
        }
        $valid = tio2_validate_my_content_write($page, $after[$page], $before[$page]);
        if (is_wp_error($valid)) return $valid;
    }
    return true;
}

/** Ordinary Linux POSIX installation boundary, not an approval service.
 * TIO2_CONTENT_APPROVAL_ROOT and nonroot TIO2_CONTENT_WRITER_UID are installation
 * constants, never request fields. Only root may register/revoke approval files.
 * Every ancestor and the regular file must be root owned, without group/other write.
 * SourceRef/sourceSha256 are human provenance registered by that trusted operator;
 * no arbitrary document is parsed or fetched, and no payload claim grants authority.
 * @return array|WP_Error
 */
function tio2_load_content_approval(string $approval_id) {
    if (!tio2_content_approval_id($approval_id)) return new WP_Error('approval_untrusted', 'Invalid approval identifier.');
    if (!defined('TIO2_CONTENT_APPROVAL_ROOT') || !is_string(TIO2_CONTENT_APPROVAL_ROOT) || TIO2_CONTENT_APPROVAL_ROOT === '') return new WP_Error('approval_missing', 'Approval source is not installed.');
    if (PHP_OS_FAMILY !== 'Linux' || !function_exists('posix_geteuid') || !defined('TIO2_CONTENT_WRITER_UID') ||
        !is_int(TIO2_CONTENT_WRITER_UID) || TIO2_CONTENT_WRITER_UID <= 0) return new WP_Error('approval_untrusted', 'Approval source permissions cannot be verified.');
    $root = TIO2_CONTENT_APPROVAL_ROOT;
    if ($root[0] !== '/' || $root === '/' || str_contains($root, "\0") || realpath($root) !== $root) return new WP_Error('approval_untrusted', 'Unsafe approval source.');
    $file = $root . '/' . $approval_id . '.json';
    $cursor = $root;
    do {
        clearstatcache(true, $cursor); $stat = @lstat($cursor);
        if (!$stat || ($stat['mode'] & 0170000) !== 0040000 || $stat['uid'] !== 0 || ($stat['mode'] & 0022) !== 0) return new WP_Error('approval_untrusted', 'Unsafe approval source.');
        if ($cursor === '/') break;
        $cursor = dirname($cursor);
    } while (true);
    clearstatcache(true, $file); $stat = @lstat($file);
    if (!$stat) return new WP_Error('approval_missing', 'Approval evidence is unavailable.');
    if (($stat['mode'] & 0170000) !== 0100000 || $stat['uid'] !== 0 || ($stat['mode'] & 0022) !== 0 || $stat['size'] > 65536) return new WP_Error('approval_untrusted', 'Unsafe approval evidence.');
    $stream = @fopen($file, 'rb');
    if ($stream === false) return new WP_Error('approval_untrusted', 'Approval evidence cannot be verified.');
    try {
        $opened = fstat($stream);
        if (!$opened || $opened['dev'] !== $stat['dev'] || $opened['ino'] !== $stat['ino'] || $opened['mode'] !== $stat['mode'] || $opened['uid'] !== $stat['uid']) throw new UnexpectedValueException();
        $json = stream_get_contents($stream, 65537);
        if (!is_string($json) || strlen($json) > 65536) throw new UnexpectedValueException();
        $object = tio2_content_decode($json);
        if (!$object instanceof stdClass || !isset($object->records) || !is_array($object->records)) throw new UnexpectedValueException();
        foreach ($object->records as $record) if (!$record instanceof stdClass) throw new UnexpectedValueException();
        $approval = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
        $shape = tio2_content_approval_shape($approval);
        if (is_wp_error($shape)) return $shape;
        if ($approval['approvalId'] !== $approval_id) throw new UnexpectedValueException();
        return $approval;
    } catch (Throwable $error) {
        return new WP_Error('approval_untrusted', 'Approval evidence cannot be verified.');
    } finally {
        fclose($stream);
    }
}
