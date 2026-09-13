<?php

declare(strict_types=1);

if (! defined('ABSPATH')) exit;

// ECMAScript WhiteSpace + LineTerminator code points used by String.trim and regex \s.
const TIO2_MY_LEGAL_ECMA_WHITESPACE = '\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}';

function tio2_my_legal_read_contract_path(): string
{
    return dirname(__DIR__) . '/config/tio2-my-legal-read-contract.json';
}

/** @return array<string, mixed>|WP_Error */
function tio2_my_legal_read_contract()
{
    $path = tio2_my_legal_read_contract_path();
    $json = is_readable($path) ? file_get_contents($path) : false;
    $contract = is_string($json) ? json_decode($json, true) : null;
    if (! is_array($contract)
        || 1 !== ($contract['version'] ?? null)
        || 'tio2-my' !== ($contract['siteScope'] ?? null)
        || ! is_array($contract['routes'] ?? null)
        || 3 !== count($contract['routes'])) {
        return new WP_Error('tio2_my_legal_read_contract_missing', 'The Malaysia Legal read contract is unavailable.');
    }
    return $contract;
}

/** @return array<string, mixed>|WP_Error */
function tio2_my_legal_read_route(string $public_path, array $contract)
{
    $matched = null;
    foreach ($contract['routes'] as $route) {
        if (! is_array($route) || ! is_string($route['path'] ?? null)) {
            return new WP_Error('tio2_my_legal_read_route_registry', 'The Malaysia Legal read route registry is invalid.');
        }
        if (rtrim($route['path'], '/') === $public_path) {
            if ($matched !== null) return new WP_Error('tio2_my_legal_read_duplicate_route', 'The Malaysia Legal read route registry is duplicated.');
            $matched = $route;
        }
    }
    return is_array($matched)
        ? $matched
        : new WP_Error('tio2_my_legal_read_invalid_route', 'The Legal page route identity is invalid.');
}

function tio2_my_legal_read_text($value, string $field, int $maximum, bool $markdown = false)
{
    $controls = $markdown ? '/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u' : '/[\x00-\x1f\x7f]/u';
    if (! is_string($value)
        || '' === $value
        || 1 === preg_match('/^[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']|[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']$/u', $value)
        || ! mb_check_encoding($value, 'UTF-8')
        || mb_strlen($value, 'UTF-8') > $maximum
        || 1 === preg_match($controls, $value)
        || str_contains($value, '<')
        || str_contains($value, '>')) {
        return new WP_Error('tio2_my_legal_read_invalid_text', 'The Legal page field ' . $field . ' is invalid.');
    }
    return $value;
}

function tio2_my_legal_section_id(string $heading)
{
    if (! class_exists('Normalizer')) {
        return new WP_Error('tio2_my_legal_read_intl_required', 'The PHP intl extension is required for Legal page validation.');
    }
    $normalized = \Normalizer::normalize($heading, \Normalizer::FORM_KD);
    if (! is_string($normalized)) return new WP_Error('tio2_my_legal_read_invalid_heading', 'The Legal page heading is invalid.');
    $normalized = preg_replace('/[\x{0300}-\x{036f}]/u', '', $normalized);
    $normalized = strtolower((string) $normalized);
    $normalized = preg_replace('/[^a-z0-9]+/u', '-', $normalized);
    return trim((string) $normalized, '-');
}

/** @return list<string> */
function tio2_my_legal_action_labels(string $line): array
{
    $labels = preg_split('/·/u', (string) preg_replace('/^(Actions|Tindakan):[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']*/u', '', $line));
    if (! is_array($labels)) return [];
    return array_values(array_filter(array_map(static function (string $label): string {
        return (string) preg_replace('/^[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']+|[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']+$/u', '', str_replace('**', '', $label));
    }, $labels), static fn(string $label): bool => '' !== $label));
}

/** @return true|WP_Error */
function tio2_my_validate_legal_markdown(string $markdown, array $contract)
{
    if (str_contains($markdown, '![')) return new WP_Error('tio2_my_legal_read_image', 'The Legal page Markdown contains image syntax.');
    $raw = str_replace(["\r\n", "\r"], "\n", $markdown);
    $lines = explode("\n", $raw);

    $h1_lines = array_values(array_filter($lines, static fn(string $line): bool => 1 === preg_match('/^#(?!#)(?: |$)/u', $line)));
    $non_whitespace = '[^' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']';
    if (1 !== count($h1_lines) || $lines[0] !== $h1_lines[0] || 1 !== preg_match('/^# ' . $non_whitespace . '(?:.*' . $non_whitespace . ')?$/u', $h1_lines[0])) {
        return new WP_Error('tio2_my_legal_read_h1', 'The Legal page Markdown must have exactly one nonempty H1.');
    }

    $h2_lines = array_values(array_filter($lines, static fn(string $line): bool => 1 === preg_match('/^##(?!#)(?: |$)/u', $line)));
    if ([] === $h2_lines) return new WP_Error('tio2_my_legal_read_h2', 'The Legal page Markdown must have a nonempty H2.');
    $section_ids = [];
    foreach ($h2_lines as $line) {
        if (1 !== preg_match('/^## ' . $non_whitespace . '(?:.*' . $non_whitespace . ')?$/u', $line)) return new WP_Error('tio2_my_legal_read_h2', 'The Legal page Markdown must have a nonempty H2.');
        $section_id = tio2_my_legal_section_id(substr($line, 3));
        if (is_wp_error($section_id) || '' === $section_id || in_array($section_id, $section_ids, true)) {
            return is_wp_error($section_id) ? $section_id : new WP_Error('tio2_my_legal_read_section_id', 'The Legal page Markdown section IDs are invalid.');
        }
        $section_ids[] = $section_id;
    }

    $allowed_links = $contract['markdown']['allowedLinkDestinations'] ?? null;
    if (! is_array($allowed_links)) return new WP_Error('tio2_my_legal_read_links_registry', 'The Legal page link registry is invalid.');
    preg_match_all('/\[[^\]\n]+\]\(([^)\n]+)\)/u', $raw, $link_matches);
    foreach ($link_matches[1] ?? [] as $destination) {
        if (! in_array($destination, $allowed_links, true)) return new WP_Error('tio2_my_legal_read_link', 'The Legal page Markdown contains an unsupported link.');
    }
    $without_links = preg_replace('/\[[^\]\n]+\]\([^)\n]+\)/u', '', $raw);
    if (! is_string($without_links) || 1 === preg_match('/\[[^\]]*\]\(/u', $without_links)) {
        return new WP_Error('tio2_my_legal_read_malformed_link', 'The Legal page Markdown contains malformed link syntax.');
    }

    $bindings = $contract['markdown']['actionBindings'] ?? null;
    if (! is_array($bindings)) return new WP_Error('tio2_my_legal_read_actions_registry', 'The Legal page action registry is invalid.');
    $allowed_actions = [];
    foreach ($bindings as $binding) {
        if (! is_array($binding) || ! is_string($binding['label'] ?? null)) return new WP_Error('tio2_my_legal_read_actions_registry', 'The Legal page action registry is invalid.');
        $allowed_actions[] = $binding['label'];
    }
    $action_entries = [];
    foreach ($lines as $index => $line) {
        if (1 !== preg_match('/^(Actions|Tindakan):/u', $line)) continue;
        $labels = tio2_my_legal_action_labels($line);
        if ([] === $labels || [] !== array_diff($labels, $allowed_actions)) {
            return new WP_Error('tio2_my_legal_read_action', 'The Legal page Markdown contains an unsupported action.');
        }
        $action_entries[] = ['index' => $index, 'labels' => $labels];
    }

    $first_h2_index = null;
    foreach ($lines as $index => $line) if (1 === preg_match('/^## /u', $line)) { $first_h2_index = $index; break; }
    if (! is_int($first_h2_index)) return new WP_Error('tio2_my_legal_read_h2', 'The Legal page Markdown must have a nonempty H2.');
    $hero_actions = array_values(array_filter($action_entries, static fn(array $entry): bool => $entry['index'] < $first_h2_index));
    $section_actions = array_values(array_filter($action_entries, static fn(array $entry): bool => $entry['index'] > $first_h2_index));
    $last_nonempty_before = static function (array $values, int $end): int {
        for ($index = $end - 1; $index >= 0; $index--) if ('' !== $values[$index]) return $index;
        return -1;
    };
    if (count($hero_actions) > 1
        || count($section_actions) > 1
        || (isset($hero_actions[0]) && $hero_actions[0]['index'] !== $last_nonempty_before($lines, $first_h2_index))
        || (isset($section_actions[0]) && (
            $section_actions[0]['index'] !== $last_nonempty_before($lines, count($lines))
            || ! isset($hero_actions[0])
            || $section_actions[0]['labels'] !== $hero_actions[0]['labels']
        ))) {
        return new WP_Error('tio2_my_legal_read_action_layout', 'The Legal page Markdown action layout is invalid.');
    }

    $hero_lines = array_slice($lines, 0, $first_h2_index);
    $updated_pattern = '/^\*\*(Last updated|Kemas kini terakhir):[' . TIO2_MY_LEGAL_ECMA_WHITESPACE . ']*' . $non_whitespace . '.*\*\*$/u';
    $updated_count = count(array_filter($hero_lines, static fn(string $line): bool => 1 === preg_match($updated_pattern, $line)));
    return 1 === $updated_count
        ? true
        : new WP_Error('tio2_my_legal_read_update_line', 'The Legal page Markdown must have one visible update line.');
}

/** @return array<string, mixed>|WP_Error */
function tio2_legal_page_read_public_contract(int $post_id)
{
    if ('tio2_legal_page' !== get_post_type($post_id)) return new WP_Error('tio2_my_legal_read_invalid_type', 'The Legal page record type is invalid.');
    if ('publish' !== get_post_status($post_id)) return new WP_Error('tio2_my_legal_read_invalid_status', 'The Legal page record is not published.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values(array_map('strval', $scopes))) {
        return new WP_Error('tio2_my_legal_read_invalid_scope', 'The Legal page record is valid only for site_scope=tio2-my.');
    }

    $contract = tio2_my_legal_read_contract();
    if (is_wp_error($contract)) return $contract;
    $public_path = (string) get_post_meta($post_id, 'public_path', true);
    $route = tio2_my_legal_read_route($public_path, $contract);
    if (is_wp_error($route)) return $route;
    $stored_json = get_post_meta($post_id, TIO2_MY_LEGAL_PAGE_CONTRACT_META, true);
    $stored = is_string($stored_json) ? json_decode($stored_json, true) : null;
    if (! is_array($stored) || array_is_list($stored)) return new WP_Error('tio2_my_legal_read_invalid_contract', 'The stored Legal page payload is invalid.');
    $maximum = is_int($contract['maximumTextCodePoints'] ?? null) ? $contract['maximumTextCodePoints'] : 0;
    if ($maximum < 1) return new WP_Error('tio2_my_legal_read_text_limit', 'The Legal page text limit is invalid.');

    foreach (['pageId', 'routeKey', 'path', 'locale'] as $field) {
        if (($stored[$field] ?? null) !== ($route[$field] ?? null)) return new WP_Error('tio2_my_legal_read_identity', 'The Legal page identity is invalid.');
    }
    if (($stored['pageType'] ?? null) !== ($contract['pageType'] ?? null)
        || ($stored['headerCurrentKey'] ?? '__missing__') !== ($contract['headerCurrentKey'] ?? '__missing__')) {
        return new WP_Error('tio2_my_legal_read_identity', 'The Legal page identity is invalid.');
    }

    $date = tio2_my_legal_read_text($stored['effectiveDate'] ?? null, 'effectiveDate', $maximum);
    if (is_wp_error($date)
        || 1 !== preg_match('/^(\d{4})-(\d{2})-(\d{2})$/u', $date, $date_parts)
        || (int) $date_parts[1] < 1
        || ! checkdate((int) $date_parts[2], (int) $date_parts[3], (int) $date_parts[1])) {
        return new WP_Error('tio2_my_legal_read_date', 'The Legal page effective date is invalid.');
    }

    $breadcrumb_values = $stored['breadcrumb'] ?? null;
    $breadcrumb_hrefs = $route['breadcrumbHrefs'] ?? null;
    if (! is_array($breadcrumb_values) || ! array_is_list($breadcrumb_values)
        || ! is_array($breadcrumb_hrefs) || count($breadcrumb_values) !== count($breadcrumb_hrefs)) {
        return new WP_Error('tio2_my_legal_read_breadcrumb', 'The Legal page breadcrumb is invalid.');
    }
    $breadcrumb = [];
    foreach ($breadcrumb_values as $index => $item) {
        if (! is_array($item) || array_is_list($item) || ($item['href'] ?? null) !== $breadcrumb_hrefs[$index]) {
            return new WP_Error('tio2_my_legal_read_breadcrumb', 'The Legal page breadcrumb is invalid.');
        }
        $label = tio2_my_legal_read_text($item['label'] ?? null, 'breadcrumb.label', $maximum);
        if (is_wp_error($label)) return $label;
        $breadcrumb[] = ['label' => $label, 'href' => $breadcrumb_hrefs[$index]];
    }

    $badge_value = $stored['badge'] ?? null;
    if (! is_array($badge_value) || array_is_list($badge_value)) return new WP_Error('tio2_my_legal_read_badge', 'The Legal page badge is invalid.');
    $badge_label = tio2_my_legal_read_text($badge_value['label'] ?? null, 'badge.label', $maximum);
    $badge_sub_label = tio2_my_legal_read_text($badge_value['subLabel'] ?? null, 'badge.subLabel', $maximum);
    if (is_wp_error($badge_label)) return $badge_label;
    if (is_wp_error($badge_sub_label)) return $badge_sub_label;

    $markdown = tio2_my_legal_read_text($stored['buyerVisibleMarkdown'] ?? null, 'buyerVisibleMarkdown', $maximum, true);
    if (is_wp_error($markdown)) return $markdown;
    $markdown_validation = tio2_my_validate_legal_markdown($markdown, $contract);
    if (is_wp_error($markdown_validation)) return $markdown_validation;

    $seo_value = $stored['seo'] ?? null;
    if (! is_array($seo_value) || array_is_list($seo_value)) return new WP_Error('tio2_my_legal_read_seo', 'The Legal page SEO fields are invalid.');
    $seo_title = tio2_my_legal_read_text($seo_value['title'] ?? null, 'seo.title', $maximum);
    $seo_description = tio2_my_legal_read_text($seo_value['description'] ?? null, 'seo.description', $maximum);
    $seo_keyword = tio2_my_legal_read_text($seo_value['primaryKeyword'] ?? null, 'seo.primaryKeyword', $maximum);
    if (is_wp_error($seo_title)) return $seo_title;
    if (is_wp_error($seo_description)) return $seo_description;
    if (is_wp_error($seo_keyword)) return $seo_keyword;
    $canonical = ($contract['origin'] ?? null) . ($route['path'] ?? null);
    if (($seo_value['canonical'] ?? null) !== $canonical) return new WP_Error('tio2_my_legal_read_canonical', 'The Legal page canonical URL is invalid.');

    return [
        'pageId' => $route['pageId'],
        'routeKey' => $route['routeKey'],
        'path' => $route['path'],
        'locale' => $route['locale'],
        'pageType' => $contract['pageType'],
        'headerCurrentKey' => $contract['headerCurrentKey'],
        'effectiveDate' => $date,
        'breadcrumb' => $breadcrumb,
        'badge' => ['label' => $badge_label, 'subLabel' => $badge_sub_label],
        'buyerVisibleMarkdown' => $markdown,
        'seo' => [
            'title' => $seo_title,
            'description' => $seo_description,
            'canonical' => $canonical,
            'primaryKeyword' => $seo_keyword,
        ],
    ];
}

/** @return true|WP_Error */
function tio2_validate_legal_page_read_contract(int $post_id)
{
    $contract = tio2_legal_page_read_public_contract($post_id);
    return is_wp_error($contract) ? $contract : true;
}
