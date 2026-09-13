<?php
// Exact local candidate upgrade from 53da53fb; historical create-only seeds remain unchanged.
$mode = (string) ($args[0] ?? 'Plan');
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local' ||
    getenv('D16_TIO2_MY_PRERELEASE_TRADE_REFRESH') !== '1' || !in_array($mode, ['Plan', 'Apply'], true)) {
    throw new RuntimeException('Trade refresh requires explicit local candidate opt-in.');
}
$prior = [
    'RES-TRADE-EU' => ['payload' => '071b8d1dc53eca3f6956e1db19ce9067a306f8c3a0b5d676f6cb24866a0abb77', 'review' => '76a86a4e7bbb3a003e44068e2242a42b91ebe19ad42deefdcf777ef0ce8eb4b8'],
    'RES-TRADE-UK' => ['payload' => 'a2d2901d2a2040f6ffce86b844b033b09060f352be8fcd80ca6812feb05d2e45', 'review' => 'a1d76d670487dce6acfd6cbc742833557be636ba5684ab5c841f97f424e14d0f'],
    'RES-TRADE-IN' => ['payload' => 'b8de5c191e6058b8b92b686d9e4446abd6a7a28d125f4faa7fb18c19cee38656', 'review' => 'a55d34a2a7fa19586115060cf807fdc306d91f3742d1b6bf73e8f314112370b5'],
    'RES-TRADE-BR' => ['payload' => 'b6a465384eac3257b9f299c8f5cc34d8b84c14bdc316619aa86dfabe980e1d89', 'review' => '185fa2c7521ebc2cc80cd64c99f2df5a03e8f866c42992be01da6c1333ed3137'],
];
$plans = [];
foreach ($prior as $page_id => $hashes) {
    $json = tio2_editorial_config($page_id);
    $payload = json_decode($json, true);
    $identity = tio2_editorial_identity($page_id);
    $manifest = tio2_editorial_review_manifest($page_id);
    $reviews = array_values(array_filter($manifest['pages'] ?? [], static fn (array $page): bool => $page['pageId'] === $page_id));
    $review = $reviews[0]['currentReview'] ?? null;
    if (!$identity || count($reviews) !== 1 || is_wp_error(tio2_editorial_validate_payload($page_id, $json)) ||
        !tio2_editorial_review_valid($payload, $review)) throw new RuntimeException('Invalid successor input '.$page_id);
    $ids = tio2_editorial_candidates($page_id);
    if (count($ids) > 1) throw new RuntimeException('Ambiguous trade identity '.$page_id);
    if (!$ids) continue; // The retained create-only seed creates absent records.
    $id = $ids[0];
    $scopes = wp_get_post_terms($id, 'site_scope', ['fields' => 'slugs']);
    if (get_post_type($id) !== 'tio2_my_editorial' || get_post_status($id) !== 'publish' || is_wp_error($scopes) ||
        array_values($scopes) !== ['tio2-my'] || get_post_field('post_name', $id) !== $identity['slug'] ||
        get_post_meta($id, 'public_path', true) !== $identity['path'] || get_post_meta($id, '_tio2_editorial_page_id', true) !== $page_id) {
        throw new RuntimeException('Invalid existing trade identity '.$page_id);
    }
    $stored = get_post_meta($id, TIO2_EDITORIAL_META, true);
    $stored_review = get_post_meta($id, TIO2_EDITORIAL_REVIEW_META, true);
    $already_current = $stored === $json && $stored_review === $review;
    $old_review_hash = hash('sha256', (string) json_encode($stored_review, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    if (!$already_current && (!is_string($stored) || !hash_equals($hashes['payload'], hash('sha256', str_replace("\r\n", "\n", $stored))) ||
        !hash_equals($hashes['review'], $old_review_hash))) throw new RuntimeException('Unrecognized predecessor payload or review '.$page_id);
    if (!$already_current) $plans[] = compact('id', 'page_id', 'json', 'payload', 'review', 'stored', 'stored_review');
}
$changed = [];
try {
    if ($mode === 'Apply') foreach ($plans as $plan) {
        $changed[] = $plan;
        update_post_meta($plan['id'], TIO2_EDITORIAL_META, wp_slash($plan['json']));
        update_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, $plan['review']);
        clean_post_cache($plan['id']);
        if (get_post_meta($plan['id'], TIO2_EDITORIAL_META, true) !== $plan['json'] ||
            get_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, true) !== $plan['review'] ||
            is_wp_error(tio2_editorial_validate_record($plan['id'], $plan['page_id'])) ||
            !tio2_editorial_review_valid($plan['payload'], get_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, true))) {
            throw new RuntimeException('Trade refresh readback failed '.$plan['page_id']);
        }
    }
} catch (Throwable $error) {
    foreach (array_reverse($changed) as $plan) {
        update_post_meta($plan['id'], TIO2_EDITORIAL_META, wp_slash($plan['stored']));
        update_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, $plan['stored_review']);
        clean_post_cache($plan['id']);
        if (get_post_meta($plan['id'], TIO2_EDITORIAL_META, true) !== $plan['stored'] ||
            get_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, true) !== $plan['stored_review']) {
            throw new RuntimeException('Trade refresh rollback failed '.$plan['page_id'], 0, $error);
        }
    }
    throw $error;
}
echo wp_json_encode(['mode' => $mode, 'status' => 'passed', 'siteScope' => 'tio2-my', 'refreshedPageIds' => array_column($changed, 'page_id')]);
