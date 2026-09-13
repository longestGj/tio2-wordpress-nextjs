<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;
require_once __DIR__ . '/home-application-read-contract.php';

/** Decode full protected JSON without losing object/list kinds or duplicate keys.
 * The supported numeric domain is exact safe integers, matching the page schemas.
 */
function tio2_content_decode(string $json) {
    $value = json_decode($json, false, 512, JSON_THROW_ON_ERROR);
    // json_decode validates grammar/Unicode; this linear scan detects overwritten keys.
    // Avoid regex recursion/backtracking limits for technically valid long text.
    $stack = [];
    for ($i = 0, $length = strlen($json); $i < $length; $i++) {
        $token = $json[$i];
        if ($token === '{' || $token === '[') $stack[] = [];
        elseif ($token === '}' || $token === ']') array_pop($stack);
        elseif ($token === '"') {
            $start = $i++;
            while ($json[$i] !== '"') { if ($json[$i] === '\\') $i++; $i++; }
            $next = $i + 1 + strspn($json, " \r\n\t", $i + 1);
            if (($json[$next] ?? null) !== ':') continue;
            $key = 'key:' . json_decode(substr($json, $start, $i - $start + 1), false, 512, JSON_THROW_ON_ERROR);
            $index = count($stack) - 1;
            if (isset($stack[$index][$key])) throw new UnexpectedValueException('Duplicate JSON key.');
            $stack[$index][$key] = true;
        }
    }
    // Traversal also rejects overflow, non-finite and unsupported numeric values.
    tio2_content_canonical_value($value);
    return $value;
}

function tio2_content_canonical_value($value): string {
    if ($value instanceof stdClass) {
        $items = get_object_vars($value); ksort($items, SORT_STRING); $result = [];
        foreach ($items as $key => $item) $result[] = json_encode((string) $key, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS) . ':' . tio2_content_canonical_value($item);
        return '{' . implode(',', $result) . '}';
    }
    if (is_array($value)) {
        if (!array_is_list($value)) throw new UnexpectedValueException('Unsupported JSON value.');
        return '[' . implode(',', array_map('tio2_content_canonical_value', $value)) . ']';
    }
    if (is_float($value) || (is_int($value) && ($value > 9007199254740991 || $value < -9007199254740991))) throw new UnexpectedValueException('Unsupported JSON number.');
    if (!is_null($value) && !is_bool($value) && !is_int($value) && !is_string($value)) throw new UnexpectedValueException('Unsupported JSON value.');
    return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
}

/** SHA256 identifies full content; it does not grant approval. Invalid JSON throws. */
function tio2_content_digest(string $json): string {
    return hash('sha256', tio2_content_canonical_value(tio2_content_decode($json)));
}

/** Technical write validation only; independent of publish status or approval.
 * Legacy HOME footer is opaque and immutable, never inferred from old manuscripts.
 * @return true|WP_Error
 */
function tio2_validate_my_content_write(string $page_id, string $candidate_json, ?string $current_json) {
    try {
        $candidate = tio2_content_decode($candidate_json);
        if (!$candidate instanceof stdClass) throw new UnexpectedValueException('Object required.');
        $schema = tio2_my_home_application_read_schema();
        if (!isset($schema['pages'][$page_id])) throw new UnexpectedValueException('Unknown page.');
        if ($page_id === 'HOME-001') {
            $current = $current_json === null ? null : tio2_content_decode($current_json);
            if ($current_json !== null && !$current instanceof stdClass) throw new UnexpectedValueException('Current object required.');
            $had_footer = $current instanceof stdClass && property_exists($current, 'footer');
            if (property_exists($candidate, 'footer') !== $had_footer || ($had_footer && tio2_content_canonical_value($candidate->footer) !== tio2_content_canonical_value($current->footer))) throw new UnexpectedValueException('Legacy footer is immutable.');
            unset($candidate->footer);
        }
        tio2_my_home_application_project($candidate, $schema['pages'][$page_id], $schema, $page_id, true);
        return true;
    } catch (Throwable $error) {
        return new WP_Error('write_schema', 'Content does not satisfy the technical write contract.');
    }
}
