<?php
// WP-CLI eval-file prepends evaluation context; do not add strict_types here.

if (!function_exists('wp_get_environment_type') || 'local' !== wp_get_environment_type()) {
    throw new RuntimeException('Local WordPress is required.');
}
if (get_option('tio2_editorial_task_id') !== 'G8-TRADE4-APP5-20260908-01') {
    throw new RuntimeException('The task-owned tio2my9 review clone is required.');
}

$mode = (string) ($args[0] ?? 'Plan');
$state_path = (string) ($args[1] ?? '');
if (!in_array($mode, ['Plan', 'Apply', 'Restore'], true)) {
    throw new RuntimeException('Use Plan, Apply or Restore.');
}

function gate9_contract_target(string $key): array
{
    if ('APP-COAT' === $key || 'RES-TRADE-UK' === $key) {
        $ids = tio2_editorial_candidates($key);
        if ([$ids[0] ?? null] !== $ids || !is_int($ids[0] ?? null)) {
            throw new RuntimeException($key . ' must have exactly one candidate.');
        }
        $id = $ids[0];
        if ('publish' !== get_post_status($id) || ['tio2-my'] !== wp_get_post_terms($id, 'site_scope', ['fields' => 'slugs'])) {
            throw new RuntimeException($key . ' identity is not the published tio2-my owner.');
        }
        $filename = 'APP-COAT' === $key ? 'tio2-my-editorial-app-coat.json' : 'tio2-my-editorial-res-trade-uk.json';
        return [
            'key' => $key,
            'postId' => $id,
            'metaKey' => TIO2_EDITORIAL_META,
            'configPath' => '/workspace/wordpress/plugins/tio2-site-model/config/' . $filename,
        ];
    }

    if ('CONV-RFQ' === $key) {
        $ids = get_posts([
            'post_type' => 'tio2_rfq_page',
            'post_status' => 'publish',
            'name' => 'tio2-my-request-a-quote',
            'fields' => 'ids',
            'numberposts' => 2,
            'suppress_filters' => false,
        ]);
        if (1 !== count($ids)) throw new RuntimeException('CONV-RFQ must have exactly one published owner.');
        $id = (int) $ids[0];
        if (
            ['tio2-my'] !== wp_get_post_terms($id, 'site_scope', ['fields' => 'slugs']) ||
            '/request-a-quote' !== get_post_meta($id, 'public_path', true)
        ) throw new RuntimeException('CONV-RFQ identity is not the tio2-my owner.');
        return [
            'key' => $key,
            'postId' => $id,
            'metaKey' => TIO2_MY_RFQ_PAGE_CONTRACT_META,
            'configPath' => '/workspace/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json',
        ];
    }

    throw new RuntimeException('Unexpected target.');
}

function gate9_assert_approved_delta(string $key, string $before_json, string $after_json): array
{
    $before = json_decode($before_json, true);
    $after = json_decode($after_json, true);
    if (!is_array($before) || !is_array($after)) throw new RuntimeException($key . ' has invalid JSON.');

    if ('APP-COAT' === $key) {
        if (false !== ($before['identity']['provisional'] ?? null) || true !== ($after['identity']['provisional'] ?? null)) {
            throw new RuntimeException('APP-COAT provisional delta is not false to true.');
        }
        $after['identity']['provisional'] = false;
        if ($after != $before) throw new RuntimeException('APP-COAT contains a non-approved delta.');
        return [['field' => 'identity.provisional', 'before' => false, 'after' => true]];
    }

    if ('RES-TRADE-UK' === $key) {
        $old = 'https://www.gov.uk/guidance/trade-remedies';
        $new = 'https://www.gov.uk/guidance/check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties';
        if (1 !== substr_count((string) ($before['bodyHtml'] ?? ''), $old) || 1 !== substr_count((string) ($after['bodyHtml'] ?? ''), $new)) {
            throw new RuntimeException('RES-TRADE-UK does not contain the one approved URL replacement.');
        }
        $after_rendered_hash = (string) ($after['source']['renderedBodySha256'] ?? '');
        $before_rendered_hash = (string) ($before['source']['renderedBodySha256'] ?? '');
        $after['bodyHtml'] = str_replace($new, $old, $after['bodyHtml']);
        $after['source']['renderedBodySha256'] = $before_rendered_hash;
        if ($after != $before) throw new RuntimeException('RES-TRADE-UK contains a non-approved delta.');
        return [
            ['field' => 'bodyHtml.officialSources[HMRC trade remedies guidance].href', 'before' => $old, 'after' => $new],
            ['field' => 'source.renderedBodySha256', 'before' => $before_rendered_hash, 'after' => $after_rendered_hash],
        ];
    }

    if ('CONV-RFQ' === $key) {
        $before_ids = $before['prefill']['approvedSourcePageIds'] ?? null;
        $after_ids = $after['prefill']['approvedSourcePageIds'] ?? null;
        if (!is_array($before_ids) || !is_array($after_ids)) throw new RuntimeException('CONV-RFQ source list is unavailable.');
        if (in_array('MARKET-BR-EN', $before_ids, true) || in_array('MARKET-BR-PT', $before_ids, true)) {
            throw new RuntimeException('CONV-RFQ before state already contains Brazil IDs.');
        }
        $without_brazil = array_values(array_filter($after_ids, static fn($id) => !in_array($id, ['MARKET-BR-EN', 'MARKET-BR-PT'], true)));
        if ($without_brazil !== $before_ids || 1 !== count(array_keys($after_ids, 'MARKET-BR-EN', true)) || 1 !== count(array_keys($after_ids, 'MARKET-BR-PT', true))) {
            throw new RuntimeException('CONV-RFQ Brazil source delta is not exact.');
        }
        $after['prefill']['approvedSourcePageIds'] = $without_brazil;
        if ($after != $before) throw new RuntimeException('CONV-RFQ contains a non-approved delta.');
        return [[
            'field' => 'prefill.approvedSourcePageIds',
            'before' => $before_ids,
            'after' => $after_ids,
            'added' => ['MARKET-BR-EN', 'MARKET-BR-PT'],
        ]];
    }

    throw new RuntimeException('No delta policy for ' . $key . '.');
}

function gate9_build_plan(): array
{
    $entries = [];
    foreach (['APP-COAT', 'RES-TRADE-UK', 'CONV-RFQ'] as $key) {
        $target = gate9_contract_target($key);
        $before = get_post_meta($target['postId'], $target['metaKey'], true);
        $after = is_readable($target['configPath']) ? file_get_contents($target['configPath']) : false;
        if (!is_string($before) || '' === $before || !is_string($after) || '' === $after) {
            throw new RuntimeException($key . ' contract bytes are unavailable.');
        }
        $entries[] = array_merge($target, [
            'beforeSha256' => hash('sha256', $before),
            'afterSha256' => hash('sha256', $after),
            'fieldDiff' => gate9_assert_approved_delta($key, $before, $after),
            'rollbackValueBase64' => base64_encode($before),
        ]);
    }
    return [
        'schemaVersion' => 'gate9-local-cms-approved-contract-sync-v0.1',
        'environment' => 'tio2my9 isolated review clone :8186',
        'taskId' => get_option('tio2_editorial_task_id'),
        'mode' => 'Plan',
        'writesPerformed' => false,
        'entries' => $entries,
    ];
}

if ('Plan' === $mode) {
    echo wp_json_encode(gate9_build_plan(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    return;
}

if ('' === $state_path || !is_readable($state_path)) throw new RuntimeException('A readable Plan/rollback state file is required.');
$state = json_decode((string) file_get_contents($state_path), true);
if (!is_array($state) || 'gate9-local-cms-approved-contract-sync-v0.1' !== ($state['schemaVersion'] ?? null)) {
    throw new RuntimeException('Invalid Plan/rollback state file.');
}

$changed = [];
try {
    foreach ($state['entries'] as $expected) {
        $target = gate9_contract_target((string) $expected['key']);
        $current = get_post_meta($target['postId'], $target['metaKey'], true);
        $value = 'Apply' === $mode
            ? file_get_contents($target['configPath'])
            : base64_decode((string) $expected['rollbackValueBase64'], true);
        $expected_current_hash = 'Apply' === $mode ? (string) $expected['beforeSha256'] : (string) $expected['afterSha256'];
        $expected_value_hash = 'Apply' === $mode ? (string) $expected['afterSha256'] : (string) $expected['beforeSha256'];
        if (!is_string($current) || !hash_equals($expected_current_hash, hash('sha256', $current))) {
            throw new RuntimeException($target['key'] . ' current bytes do not match the approved state transition.');
        }
        if (!is_string($value) || !hash_equals($expected_value_hash, hash('sha256', $value))) {
            throw new RuntimeException($target['key'] . ' target bytes do not match the approved state transition.');
        }
        update_post_meta($target['postId'], $target['metaKey'], wp_slash($value));
        if (!hash_equals($expected_value_hash, hash('sha256', (string) get_post_meta($target['postId'], $target['metaKey'], true)))) {
            throw new RuntimeException($target['key'] . ' write verification failed.');
        }
        $changed[] = ['target' => $target, 'prior' => $current];
    }

    if ('Apply' === $mode) {
        foreach (['APP-COAT', 'RES-TRADE-UK'] as $page_id) {
            $target = gate9_contract_target($page_id);
            $valid = tio2_editorial_validate_record($target['postId'], $page_id);
            if (is_wp_error($valid)) throw new RuntimeException($page_id . ' validator rejected synchronized bytes.');
        }
        $rfq = gate9_contract_target('CONV-RFQ');
        if (true !== tio2_validate_rfq_page_v01_contract($rfq['postId'])) {
            throw new RuntimeException('CONV-RFQ validator rejected synchronized bytes.');
        }
    }
} catch (Throwable $failure) {
    $rollback_ok = true;
    foreach (array_reverse($changed) as $entry) {
        update_post_meta($entry['target']['postId'], $entry['target']['metaKey'], wp_slash($entry['prior']));
        if (!hash_equals(hash('sha256', $entry['prior']), hash('sha256', (string) get_post_meta($entry['target']['postId'], $entry['target']['metaKey'], true)))) {
            $rollback_ok = false;
        }
    }
    throw new RuntimeException(($rollback_ok ? 'Automatic rollback succeeded. ' : 'Automatic rollback failed. ') . $failure->getMessage(), 0, $failure);
}

$results = [];
foreach ($state['entries'] as $entry) {
    $target = gate9_contract_target((string) $entry['key']);
    $stored = (string) get_post_meta($target['postId'], $target['metaKey'], true);
    $results[] = [
        'key' => $target['key'],
        'postId' => $target['postId'],
        'storedSha256' => hash('sha256', $stored),
        'expectedSha256' => 'Apply' === $mode ? $entry['afterSha256'] : $entry['beforeSha256'],
        'exact' => hash_equals('Apply' === $mode ? $entry['afterSha256'] : $entry['beforeSha256'], hash('sha256', $stored)),
    ];
}

echo wp_json_encode([
    'schemaVersion' => 'gate9-local-cms-approved-contract-sync-v0.1',
    'environment' => 'tio2my9 isolated review clone :8186',
    'taskId' => get_option('tio2_editorial_task_id'),
    'mode' => $mode,
    'writesPerformed' => true,
    'results' => $results,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
