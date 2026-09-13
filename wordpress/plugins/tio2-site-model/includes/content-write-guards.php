<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

/** Installed page identities; callers cannot supply database IDs or meta keys. */
function tio2_content_write_registry(): array {
    return [
        'APP-000' => ['type'=>'tio2_application_hub','slug'=>'tio2-my-applications','path'=>'/applications','meta'=>'_tio2_my_application_hub_contract_json'],
        'HOME-001' => ['type'=>'tio2_homepage','slug'=>'tio2-my--homepage','path'=>'/','meta'=>'_tio2_my_homepage_contract_json'],
    ];
}

function tio2_content_write_page_for_post(int $post_id): ?string {
    $post = get_post($post_id);
    if (!$post instanceof WP_Post) return null;
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields'=>'slugs']);
    foreach (tio2_content_write_registry() as $page=>$definition) {
        if ($post->post_type === $definition['type'] && ($post->post_name === $definition['slug'] ||
            (is_array($scopes) && in_array('tio2-my', $scopes, true)))) return $page;
    }
    return null;
}

/** Run before webhook before-image capture. Rejection is not a publication event. */
function tio2_guard_content_meta($check, int $post_id, string $meta_key, $value, $extra = null) {
    $hook = current_filter();
    $all_contract_keys = array_column(tio2_content_write_registry(), 'meta');
    if ($hook === 'delete_post_metadata' && $extra && in_array($meta_key, $all_contract_keys, true)) return false;
    $page = tio2_content_write_page_for_post($post_id);
    if ($page === null) return $check;
    $definition = tio2_content_write_registry()[$page];
    if (!in_array($meta_key, [$definition['meta'],'public_path','_public_path','homepage_schema_version','_homepage_schema_version'], true)) return $check;
    $rows = get_post_meta($post_id, $meta_key, false);
    $delete = $hook === 'delete_post_metadata';
    $add = $hook === 'add_post_metadata';
    if (!$delete && !$add && count($rows) === 1 && $rows[0] === $value) return false;
    if (!current_user_can('edit_post', $post_id) || $delete || count($rows) > 1 || ($add && count($rows) > 0)) return false;
    if (Tio2_Approved_Content_Write::active()) {
        return Tio2_Approved_Content_Write::permits_meta($post_id, $meta_key, $value) ? $check : false;
    }
    if (get_post_status($post_id) !== 'draft' && get_post_status($post_id) !== 'auto-draft') return false;
    if ($meta_key !== $definition['meta']) return $check;
    if (!is_string($value)) return false;
    $valid = tio2_validate_my_content_write($page, $value, count($rows) === 1 ? $rows[0] : null);
    return is_wp_error($valid) ? false : $check;
}

/** Metadata-by-ID APIs must not bypass the ordinary pre-mutation guard. */
function tio2_guard_content_meta_by_id($check, int $meta_id, $value = null, $meta_key = null) {
    $row = get_metadata_by_mid('post', $meta_id);
    if (!$row) return $check;
    $page = tio2_content_write_page_for_post((int)$row->post_id);
    if ($page === null) return $check;
    $keys = [tio2_content_write_registry()[$page]['meta'],'public_path','_public_path','homepage_schema_version','_homepage_schema_version'];
    return in_array($row->meta_key, $keys, true) || in_array($meta_key, $keys, true) ? false : $check;
}

/** Validate a whole ordinary save before core updates the post or emits transitions.
 * Values here are unslashed, matching the metadata filter's logical input.
 */
function tio2_content_save_error(int $post_id, array $meta_input): ?WP_Error {
    $page = tio2_content_write_page_for_post($post_id);
    if ($page === null) return null;
    $definition = tio2_content_write_registry()[$page];
    $keys = [$definition['meta'],'public_path','_public_path','homepage_schema_version','_homepage_schema_version'];
    foreach ($meta_input as $key=>$value) {
        if (!in_array($key, $keys, true)) continue;
        $rows = get_post_meta($post_id, $key, false);
        if (count($rows) === 1 && $rows[0] === $value) continue;
        if ($key === $definition['meta']) {
            $valid = is_string($value) ? tio2_validate_my_content_write($page, $value, count($rows) === 1 ? $rows[0] : null) : false;
            if ($valid !== true) return new WP_Error('write_schema', 'Content does not satisfy the technical write contract.', ['status'=>400]);
        }
        if (tio2_guard_content_meta(null, $post_id, $key, $value) === false) {
            return new WP_Error('approval_required', 'Protected content requires an exact approved write.', ['status'=>403]);
        }
    }
    return null;
}

/** Core's official pre-SQL abort returns WP_Error(empty_content) or 0.
 * Its PHP error wording is fixed by core; REST below has the precise reason.
 */
function tio2_guard_content_save(bool $maybe_empty, array $postarr): bool {
    if ($maybe_empty || !is_array($postarr['meta_input'] ?? null)) return $maybe_empty;
    return tio2_content_save_error((int)($postarr['ID'] ?? 0), wp_unslash($postarr['meta_input'])) !== null;
}

function tio2_guard_content_rest_save($prepared_post, WP_REST_Request $request) {
    if (is_wp_error($prepared_post)) return $prepared_post;
    $meta = $request->get_param('meta');
    if (!is_array($meta)) return $prepared_post;
    return tio2_content_save_error((int)$request->get_param('id'), $meta) ?? $prepared_post;
}

function tio2_guard_content_post_data(array $data, array $postarr, array $unsanitized = [], bool $update = false): array {
    $id = (int)($postarr['ID'] ?? 0);
    $page = tio2_content_write_page_for_post($id);
    if ($page === null) {
        // New MY records must start as drafts; the approved service only publishes existing identities.
        foreach (tio2_content_write_registry() as $definition) {
            if (($data['post_type'] ?? '') === $definition['type'] && ($data['post_name'] ?? '') === $definition['slug'] &&
                in_array($data['post_status'] ?? '', ['publish','future','private'], true)) $data['post_status'] = 'draft';
        }
        return $data;
    }
    $post = get_post($id);
    $public = in_array($data['post_status'] ?? '', ['publish','future','private'], true);
    if (($public && $post->post_status !== $data['post_status']) || Tio2_Approved_Content_Write::active()) {
        if (!Tio2_Approved_Content_Write::permits_status($id, (string)$data['post_status'])) $data['post_status'] = $post->post_status;
    }
    if (!current_user_can('edit_post', $id)) $data['post_status'] = $post->post_status;
    // Content approval never authorizes routing or record-type changes.
    if ($post->post_status === 'publish' || Tio2_Approved_Content_Write::active()) {
        $data['post_name'] = $post->post_name;
        $data['post_type'] = $post->post_type;
    }
    return $data;
}

/** WP's core cron publisher calls a low-level SQL-writing function without a pre-filter.
 * Scheduled MY records (including legacy future records) require the explicit service;
 * leave them unpublished. Other site/page families retain the original core callback.
 */
function tio2_guard_scheduled_content_publication(int $post_id): void {
    if (tio2_content_write_page_for_post($post_id) !== null) return;
    check_and_publish_future_post($post_id);
}

remove_action('publish_future_post', 'check_and_publish_future_post');
add_action('publish_future_post', 'tio2_guard_scheduled_content_publication');

add_filter('add_post_metadata', 'tio2_guard_content_meta', 1, 5);
add_filter('update_post_metadata', 'tio2_guard_content_meta', 1, 5);
add_filter('delete_post_metadata', 'tio2_guard_content_meta', 1, 5);
add_filter('update_post_metadata_by_mid', 'tio2_guard_content_meta_by_id', 1, 4);
add_filter('delete_post_metadata_by_mid', 'tio2_guard_content_meta_by_id', 1, 2);
add_filter('wp_insert_post_empty_content', 'tio2_guard_content_save', 999, 2);
add_filter('rest_pre_insert_tio2_homepage', 'tio2_guard_content_rest_save', 999, 2);
add_filter('rest_pre_insert_tio2_application_hub', 'tio2_guard_content_rest_save', 999, 2);
add_filter('wp_insert_post_data', 'tio2_guard_content_post_data', 999, 4);
