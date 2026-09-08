<?php
// WP-CLI eval-file prepends evaluation context; a strict_types declaration here is incompatible.

// wp eval-file .../apply-tio2-my-country-markets.php [Plan|Apply]
// Plan is read-only. Apply is restricted to the explicit local WordPress environment.
function tio2_seed_malaysia_country_markets(string $mode = 'Plan'): array
{
    if (! in_array($mode, ['Plan', 'Apply'], true)) throw new RuntimeException('Use Plan or Apply.');
    if (! function_exists('wp_get_environment_type') || 'local' !== wp_get_environment_type() ||
        ! function_exists('tio2_validate_country_market_v01_stored_identity') ||
        ! function_exists('tio2_validate_country_market_v01_contract') ||
        ! function_exists('tio2_resolve_malaysia_country_market_record_json')) {
        throw new RuntimeException('Country Market seed requires the project plugin and an explicit local WordPress environment.');
    }
    $term = get_term_by('slug', 'tio2-my', 'site_scope');
    if (! $term || is_wp_error($term)) {
        throw new RuntimeException('Existing tio2-my site_scope term is required; seed will not create taxonomy terms.');
    }

    $plans = [];
    foreach (tio2_my_country_market_identities() as $page_id => $identity) {
        $json = tio2_my_country_market_config_json($page_id);
        if ('' === $json || is_wp_error(tio2_validate_country_market_v01_payload($json, $page_id))) {
            throw new RuntimeException('Missing or invalid approved payload for ' . $page_id . '.');
        }
        $ids = tio2_my_country_market_candidate_ids($page_id);
        if (count($ids) > 1) throw new RuntimeException('Multiple slug/path owners exist for ' . $page_id . '; no records changed.');
        $post_id = $ids[0] ?? 0;
        if ($post_id && is_wp_error(tio2_validate_country_market_v01_stored_identity($post_id, $page_id))) {
            throw new RuntimeException('Existing slug/path owner has a foreign or incomplete identity for ' . $page_id . '; no records changed.');
        }
        if ($post_id && ! in_array(get_post_status($post_id), ['draft', 'pending', 'private', 'publish'], true)) {
            throw new RuntimeException('Existing record has a protected status for ' . $page_id . '; no records changed.');
        }
        $plans[$page_id] = [
            'operation' => $post_id ? 'update' : 'create',
            'postId' => $post_id ?: null,
            'siteScope' => 'tio2-my',
            'publicPath' => $identity['path'],
            'payloadSha256' => hash('sha256', $json),
            'releaseEnabled' => false,
            'json' => $json,
        ];
    }
    $result = ['mode' => $mode, 'siteScope' => 'tio2-my', 'records' => []];
    foreach ($plans as $page_id => $plan) {
        $result['records'][] = array_merge(['pageId' => $page_id], array_diff_key($plan, ['json' => true]));
    }
    if ('Plan' === $mode) return $result;

    $snapshots = [];
    $active_page_id = '';
    try {
        foreach ($plans as $page_id => &$plan) {
            $active_page_id = $page_id;
            $identity = tio2_my_country_market_identities()[$page_id];
            $post_id = (int) ($plan['postId'] ?? 0);
            if ($post_id) {
                $snapshot = ['created' => false, 'post' => ['ID' => $post_id],
                    'scope' => wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']), 'meta' => []];
                foreach (['post_status', 'post_name', 'post_title', 'post_date', 'post_date_gmt', 'post_modified', 'post_modified_gmt'] as $key) {
                    $snapshot['post'][$key] = get_post_field($key, $post_id);
                }
                foreach (['public_path', TIO2_MY_COUNTRY_MARKET_CONTRACT_META] as $key) {
                    $snapshot['meta'][$key] = ['exists' => metadata_exists('post', $post_id, $key),
                        'value' => get_post_meta($post_id, $key, true)];
                }
                $snapshots[$page_id] = $snapshot;
                $updated = wp_update_post(['ID' => $post_id, 'post_status' => 'draft'], true);
                if (is_wp_error($updated) || $updated !== $post_id || 'draft' !== get_post_status($post_id)) {
                    throw new RuntimeException('Draft transition failed for ' . $page_id . '.');
                }
            } else {
                $approved = json_decode($plan['json'], true);
                $destination = is_array($approved) ? (string) ($approved['destinationCountry'] ?? $page_id) : $page_id;
                $inserted = wp_insert_post(['post_type' => 'tio2_market_page', 'post_status' => 'draft',
                    'post_name' => $identity['slug'], 'post_title' => 'TiO2 Malaysia ' . $destination . ' Market'], true);
                if (is_wp_error($inserted) || ! is_int($inserted) || $inserted <= 0) {
                    throw new RuntimeException('Draft creation failed for ' . $page_id . '.');
                }
                $post_id = $inserted;
                $plan['postId'] = $post_id;
                $snapshots[$page_id] = ['created' => true, 'post' => ['ID' => $post_id], 'scope' => [], 'meta' => []];
            }

            $scope = wp_set_object_terms($post_id, [(int) $term->term_id], 'site_scope', false);
            if (is_wp_error($scope) || ['tio2-my'] !== wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs'])) {
                throw new RuntimeException('Scope storage failed for ' . $page_id . '.');
            }
            foreach (['public_path' => $identity['path'], TIO2_MY_COUNTRY_MARKET_CONTRACT_META => $plan['json']] as $key => $value) {
                update_post_meta($post_id, $key, wp_slash($value));
                if (get_post_meta($post_id, $key, true) !== $value) {
                    throw new RuntimeException('Content storage failed for ' . $page_id . '.');
                }
            }
            if (is_wp_error(tio2_validate_country_market_v01_contract($post_id, $page_id, false)) ||
                tio2_my_country_market_candidate_ids($page_id) !== [$post_id]) {
                throw new RuntimeException('Scoped content verification failed for ' . $page_id . '.');
            }
            $published = wp_update_post(['ID' => $post_id, 'post_status' => 'publish'], true);
            if (is_wp_error($published) || $published !== $post_id || 'publish' !== get_post_status($post_id)) {
                throw new RuntimeException('Local storage publication failed for ' . $page_id . '.');
            }
            $readback = tio2_resolve_malaysia_country_market_record_json(null, ['pageId' => $page_id]);
            $decoded = json_decode($readback, true);
            if (! is_array($decoded) || $page_id !== ($decoded['recordPageId'] ?? null) || 'publish' !== ($decoded['status'] ?? null)) {
                throw new RuntimeException('Resolver readback failed for ' . $page_id . '.');
            }
        }
        unset($plan);

        $result['records'] = [];
        foreach ($plans as $page_id => $plan) {
            $result['records'][] = array_merge(['pageId' => $page_id, 'status' => 'publish'],
                array_diff_key($plan, ['json' => true]));
        }
        return $result;
    } catch (Throwable $failure) {
        $restored = true;
        foreach (array_reverse($snapshots, true) as $page_id => $snapshot) {
            $post_id = (int) $snapshot['post']['ID'];
            if ($snapshot['created']) {
                if (! wp_delete_post($post_id, true) || get_post($post_id)) $restored = false;
                continue;
            }
            foreach ($snapshot['meta'] as $key => $entry) {
                if ($entry['exists']) update_post_meta($post_id, $key, wp_slash($entry['value']));
                else delete_post_meta($post_id, $key);
                if (metadata_exists('post', $post_id, $key) !== $entry['exists'] ||
                    ($entry['exists'] && get_post_meta($post_id, $key, true) !== $entry['value'])) $restored = false;
            }
            $scope = wp_set_object_terms($post_id, $snapshot['scope'], 'site_scope', false);
            if (is_wp_error($scope) || wp_get_post_terms($post_id, 'site_scope', ['fields' => 'slugs']) !== $snapshot['scope']) $restored = false;
            $preserve_dates = static function (array $data, array $postarr) use ($post_id, $snapshot): array {
                if ((int) ($postarr['ID'] ?? 0) === $post_id) {
                    foreach (['post_date', 'post_date_gmt', 'post_modified', 'post_modified_gmt'] as $key) $data[$key] = $snapshot['post'][$key];
                }
                return $data;
            };
            add_filter('wp_insert_post_data', $preserve_dates, PHP_INT_MAX, 2);
            try {
                $post = wp_update_post(wp_slash($snapshot['post']), true);
            } finally {
                remove_filter('wp_insert_post_data', $preserve_dates, PHP_INT_MAX);
            }
            if (is_wp_error($post) || $post !== $post_id) $restored = false;
            foreach ($snapshot['post'] as $key => $value) {
                if ('ID' !== $key && get_post_field($key, $post_id) !== $value) $restored = false;
            }
        }
        $message = $restored ? 'Country Market seed failed; prior content restored. ' . $failure->getMessage()
            : 'Country Market seed failed and rollback verification failed; inspect ' . $active_page_id . ' only.';
        throw new RuntimeException($message, 0, $failure);
    }
}

echo wp_json_encode(tio2_seed_malaysia_country_markets((string)($args[0] ?? 'Plan'))) . PHP_EOL;
