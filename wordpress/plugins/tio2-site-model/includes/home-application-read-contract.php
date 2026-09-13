<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

/** Technical schema only; never derive read permissions from an installed approved manuscript. */
function tio2_my_home_application_read_schema(): array {
    static $schema = null;
    if ($schema === null) $schema = json_decode((string) file_get_contents(dirname(__DIR__) . '/config/tio2-my-home-application-read-contract.json'), true, 512, JSON_THROW_ON_ERROR);
    return $schema;
}
function tio2_my_home_application_expand(array $node, array $schema): array {
    if (!isset($node['$ref'])) return $node;
    $base = tio2_my_home_application_expand($schema['definitions'][$node['$ref']], $schema);
    unset($node['$ref']);
    return array_replace($base, $node);
}
function tio2_my_home_application_member_id($value, string $key, array $schema, bool $technical = false): ?string {
    foreach (explode('.', $key) as $part) {
        if ($value instanceof \stdClass) $value = get_object_vars($value);
        if (!is_array($value)) return null;
        $value = ($technical ? tio2_my_home_application_expand($value, $schema) : $value)[$part] ?? null;
    }
    if ($technical && is_array($value) && isset($value['$values'])) $value = $value['$values'];
    if (is_array($value) && array_is_list($value)) {
        foreach ($value as $item) if (!is_string($item)) return null;
        sort($value, SORT_STRING);
        return json_encode($value, JSON_THROW_ON_ERROR);
    }
    return is_string($value) ? $value : null;
}
function tio2_my_home_application_project($value, $definition, array $schema, string $path) {
    if (in_array($definition, ['$text', '$alt', '$tracking'], true)) {
        // Match ECMAScript trim exactly, including BOM; reject invalid Unicode and C0/DEL.
        $edge_space = '/\A[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]|[\x{0009}-\x{000D}\x{0020}\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]\z/u';
        if (!is_string($value) || preg_match('//u', $value) !== 1 || ($definition !== '$alt' && $value === '') ||
            preg_match($edge_space, $value) !== 0 || preg_match('/[<>\x00-\x1F\x7F]/u', $value) !== 0 ||
            mb_strlen($value, 'UTF-8') > $schema['textMaxCodePoints'] ||
            ($definition === '$tracking' && preg_match('/\A[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\z/', $value) !== 1)) throw new \UnexpectedValueException($path);
        return $value;
    }
    if (!is_array($definition)) {
        $numeric_equal = (is_int($definition) || is_float($definition)) && (is_int($value) || is_float($value)) && (float) $value === (float) $definition;
        if ($value !== $definition && !$numeric_equal) throw new \UnexpectedValueException($path);
        return $value;
    }
    $node = tio2_my_home_application_expand($definition, $schema);
    if (isset($node['$values'])) {
        if (!is_array($value) || !array_is_list($value) || count($value) !== count($node['$values'])) throw new \UnexpectedValueException($path);
        $seen = [];
        foreach ($value as $item) {
            if (!is_string($item) || !in_array($item, $node['$values'], true) || in_array($item, $seen, true)) throw new \UnexpectedValueException($path);
            $seen[] = $item;
        }
        return $value;
    }
    if (array_key_exists('$list', $node)) {
        if (!is_array($value) || !array_is_list($value) || count($value) < $schema['contentArrayMin'] || count($value) > $schema['contentArrayMax']) throw new \UnexpectedValueException($path);
        $result = [];
        foreach ($value as $index => $item) $result[] = tio2_my_home_application_project($item, $node['$list'], $schema, $path . '.' . $index);
        return $result;
    }
    if (isset($node['$members'])) {
        if (!is_array($value) || !array_is_list($value) || count($value) !== count($node['$members'])) throw new \UnexpectedValueException($path);
        $seen = []; $result = [];
        foreach ($value as $index => $item) {
            $id = tio2_my_home_application_member_id($item, $node['$key'], $schema);
            $member = null;
            foreach ($node['$members'] as $candidate) if (tio2_my_home_application_member_id($candidate, $node['$key'], $schema, true) === $id) { $member = $candidate; break; }
            if ($id === null || $member === null || in_array($id, $seen, true)) throw new \UnexpectedValueException($path . '.' . $index);
            $seen[] = $id;
            $result[] = tio2_my_home_application_project($item, array_replace(tio2_my_home_application_expand($node['$item'], $schema), $member), $schema, $path . '.' . $index);
        }
        return $result;
    }
    if ($value instanceof \stdClass) $value = get_object_vars($value);
    if (!is_array($value) || array_is_list($value)) throw new \UnexpectedValueException($path);
    $result = [];
    foreach ($node as $key => $child) {
        if (!array_key_exists($key, $value)) throw new \UnexpectedValueException($path . '.' . $key);
        $result[$key] = tio2_my_home_application_project($value[$key], $child, $schema, $path . '.' . $key);
    }
    return $result;
}
/** @return array|WP_Error */
function tio2_my_home_application_read_content($value, string $page_id) {
    try {
        $schema = tio2_my_home_application_read_schema();
        if (!isset($schema['pages'][$page_id])) throw new \UnexpectedValueException('pageId');
        return tio2_my_home_application_project($value, $schema['pages'][$page_id], $schema, $page_id);
    } catch (\Throwable $error) {
        return new WP_Error('tio2_my_home_application_read_invalid', 'Invalid Malaysia read content: ' . $error->getMessage());
    }
}
