<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

/** Explicit installed text paths; all other structure, identity and controls remain fixed. */
function tio2_my_content_matches($candidate, $installed, ?string $page_id = null, string $root = ''): bool {
    static $policies = null;
    if ($policies === null) $policies = json_decode((string) file_get_contents(__DIR__.'/content-release-paths.json'), true);
    $page_id = $page_id ?? ($installed['identity']['pageId'] ?? $installed['page']['page_id'] ?? $installed['pageId'] ?? null);
    if (!is_string($page_id) || !isset($policies[$page_id])) return false;
    $editable = $policies[$page_id];
    $visit = function ($actual, $expected, string $path) use (&$visit, $editable): bool {
        if ($actual === $expected) return true;
        if (is_string($actual) && is_string($expected) && in_array($path, $editable, true)) {
            if ($path === 'bodyHtml') {
                if (trim($actual) === '' || strlen($actual) > 2000000 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u', $actual)) return false;
                $left = preg_split('/(<[^>]*>)/u', $actual, -1, PREG_SPLIT_DELIM_CAPTURE);
                $right = preg_split('/(<[^>]*>)/u', $expected, -1, PREG_SPLIT_DELIM_CAPTURE);
                if ($left === false || $right === false || count($left) !== count($right)) return false;
                foreach ($left as $i => $part) if ($i % 2 ? $part !== $right[$i] : preg_match('/[<>]/u', $part)) return false;
                return true;
            }
            if ($path === 'buyerVisibleMarkdown') {
                $structure = static function (string $text): array {
                    preg_match_all('/^(?:#{1,6} .*|\*\*(?:Last updated|Kemas kini terakhir):.*|(?:Actions|Tindakan):.*)$/mu', $text, $headings);
                    preg_match_all('/\[[^\]]*\]\(([^)]*)\)/u', $text, $links);
                    return [$headings[0], $links[1]];
                };
                return trim($actual) !== '' && strlen($actual) <= 100000 && !preg_match('/[<>\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u', $actual) && $structure($actual) === $structure($expected);
            }
            return $actual !== '' && strlen($actual) <= 100000 && trim($actual) === $actual && !preg_match('/[<>\x00-\x1f\x7f]/u', $actual);
        }
        if (!is_array($expected) || !is_array($actual) || count($actual) !== count($expected) || array_is_list($actual) !== array_is_list($expected)) return false;
        foreach ($expected as $key => $value) if (!array_key_exists($key, $actual) || !$visit($actual[$key], $value, $path === '' ? (string)$key : $path.'.'.$key)) return false;
        return true;
    };
    return $visit($candidate, $installed, $root);
}
function tio2_my_content_json_matches(string $candidate, string $installed): bool {
    $actual = json_decode($candidate, true); $expected = json_decode($installed, true);
    return is_array($actual) && is_array($expected) && tio2_my_content_matches($actual, $expected);
}
