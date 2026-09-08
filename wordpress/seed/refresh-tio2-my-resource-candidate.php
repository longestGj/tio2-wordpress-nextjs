<?php
// Exact local candidate upgrade from e803bf8; historical create-only seeds remain unchanged.
$mode = (string) ($args[0] ?? 'Plan');
if (!defined('WP_CLI') || !WP_CLI || wp_get_environment_type() !== 'local' ||
    getenv('D16_TIO2_MY_PRERELEASE_RESOURCE_REFRESH') !== '1' || !in_array($mode, ['Plan', 'Apply'], true)) {
    throw new RuntimeException('Resource refresh requires explicit local candidate opt-in.');
}
$prior = [
    'RES-R706' => ['payload' => 'bd88cd0f8673ffd290c69bac9b1e16c7aa38cb1e57bf9344b5b5ea56188a81a4', 'review' => 'e3d220f88d0d28a34b20e67a715248433fc61c8bf522c94c1f74f2a53d9f382e'],
    'RES-CHEMOURS' => ['payload' => 'b22b0e309ee1d57987feb1eb97d7c07f41bbd284242b3f877905e9a7051c57bf', 'review' => '0022fce8d9b9a7306590c034c9d4874072ae92b70442786e414c767833618631'],
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
    if (count($ids) > 1) throw new RuntimeException('Ambiguous resource identity '.$page_id);
    if (!$ids) continue; // The retained create-only seed creates absent records.
    $id = $ids[0];
    $scopes = wp_get_post_terms($id, 'site_scope', ['fields' => 'slugs']);
    if (get_post_type($id) !== 'tio2_my_editorial' || get_post_status($id) !== 'publish' || is_wp_error($scopes) ||
        array_values($scopes) !== ['tio2-my'] || get_post_field('post_name', $id) !== $identity['slug'] ||
        get_post_meta($id, 'public_path', true) !== $identity['path'] || get_post_meta($id, '_tio2_editorial_page_id', true) !== $page_id) {
        throw new RuntimeException('Invalid existing resource identity '.$page_id);
    }
    $stored = get_post_meta($id, TIO2_EDITORIAL_META, true);
    $stored_review = get_post_meta($id, TIO2_EDITORIAL_REVIEW_META, true);
    $already_current = $stored === $json && $stored_review === $review;
    $old_review_hash = hash('sha256', (string) json_encode($stored_review, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    if (!$already_current && (!is_string($stored) || !hash_equals($hashes['payload'], hash('sha256', $stored)) ||
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
            throw new RuntimeException('Resource refresh readback failed '.$plan['page_id']);
        }
    }
} catch (Throwable $error) {
    foreach (array_reverse($changed) as $plan) {
        update_post_meta($plan['id'], TIO2_EDITORIAL_META, wp_slash($plan['stored']));
        update_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, $plan['stored_review']);
        clean_post_cache($plan['id']);
        if (get_post_meta($plan['id'], TIO2_EDITORIAL_META, true) !== $plan['stored'] ||
            get_post_meta($plan['id'], TIO2_EDITORIAL_REVIEW_META, true) !== $plan['stored_review']) {
            throw new RuntimeException('Resource refresh rollback failed '.$plan['page_id'], 0, $error);
        }
    }
    throw $error;
}
echo wp_json_encode(['mode' => $mode, 'status' => 'passed', 'siteScope' => 'tio2-my', 'refreshedPageIds' => array_column($changed, 'page_id')]);
