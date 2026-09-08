<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

const TIO2_MY_POLAND_MARKET_CONTRACT_META = '_tio2_my_poland_market_contract_json';

/** Strict shape validation keeps editorial text editable without admitting new capabilities. */
function tio2_poland_market_keys($value, array $keys): bool
{
    if (!is_array($value)) return false;
    $actual = array_keys($value); sort($actual); sort($keys);
    return $actual === $keys;
}

function tio2_poland_market_text($value): bool
{
    // Match the DTO's ECMAScript trim boundary, including NBSP and BOM (PHP trim omits them).
    $whitespace = '[\x09-\x0D\x20\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';
    return is_string($value) && '' !== $value && strlen($value) <= 20000 &&
        1 === preg_match('//u', $value) && 0 === preg_match('/[<>\x00-\x1F\x7F]/u', $value) &&
        0 === preg_match('/\A'.$whitespace.'|'.$whitespace.'\z/u', $value);
}

function tio2_poland_market_paragraphs($value, int $count): bool
{
    return is_array($value) && array_is_list($value) && count($value) === $count &&
        count(array_filter($value, 'tio2_poland_market_text')) === $count;
}

function tio2_poland_market_actions($value, array $routes): bool
{
    if (!is_array($value) || !array_is_list($value) || count($value) !== count($routes)) return false;
    foreach ($routes as $i => [$href, $page_id]) {
        $action = $value[$i];
        if (!tio2_poland_market_keys($action, ['label','href','targetPageId']) ||
            !tio2_poland_market_text($action['label']) || $href !== $action['href'] || $page_id !== $action['targetPageId']) return false;
    }
    return true;
}

/** @return true|WP_Error */
function tio2_validate_poland_market_payload($json)
{
    $invalid = new WP_Error('poland_payload', 'Poland content must contain the complete five-module plain text contract and approved navigation.');
    if (!is_string($json) || strlen($json) > 500000) return $invalid;
    $p = json_decode($json, true);
    if (!tio2_poland_market_keys($p, ['identity','seo','breadcrumb','modules'])) return $invalid;
    $identity = ['pageId'=>'MARKET-EU-PL','siteScope'=>'tio2-my','locale'=>'en','path'=>'/markets/poland/','schemaVersion'=>'market-poland-v0.1'];
    if (!tio2_poland_market_keys($p['identity'], array_keys($identity))) return $invalid;
    foreach ($identity as $key=>$value) if ($p['identity'][$key] !== $value) return $invalid;
    if (!tio2_poland_market_keys($p['seo'], ['title','description','canonical']) ||
        !tio2_poland_market_text($p['seo']['title']) || !tio2_poland_market_text($p['seo']['description']) ||
        'https://tio2malaysia.com/markets/poland/' !== $p['seo']['canonical']) return $invalid;
    $eu = ['/markets/european-union/','MARKET-EU-001'];
    if (!tio2_poland_market_actions($p['breadcrumb'], [['/','HOME-001'],['/markets/','MARKET-000'],$eu,['/markets/poland/','MARKET-EU-PL']])) return $invalid;
    if (!is_array($p['modules']) || !array_is_list($p['modules']) || count($p['modules']) !== 5) return $invalid;
    $rfq = ['/request-a-quote/','CONV-RFQ']; $products = ['/products/','PRODUCT-000'];
    $actions = [[$rfq,$products],[],[$products],[['/request-documents/','CONV-DOC'],['/documents/','DOC-000']],[$rfq,$eu]];
    foreach ([1,1,1,3,3] as $i=>$paragraph_count) {
        $m = $p['modules'][$i];
        if (!tio2_poland_market_keys($m, ['id','heading','paragraphs','columns','actions']) ||
            'PL-0'.($i+1) !== $m['id'] || !tio2_poland_market_text($m['heading']) ||
            !tio2_poland_market_paragraphs($m['paragraphs'], $paragraph_count) ||
            !tio2_poland_market_actions($m['actions'], $actions[$i]) ||
            !is_array($m['columns']) || !array_is_list($m['columns']) || count($m['columns']) !== ($i === 2 ? 2 : 0)) return $invalid;
        foreach ($m['columns'] as $column) if (!tio2_poland_market_keys($column, ['heading','paragraphs']) ||
            !tio2_poland_market_text($column['heading']) || !tio2_poland_market_paragraphs($column['paragraphs'], 1)) return $invalid;
    }
    return true;
}

/** Identity checking is separate so an editor can repair malformed content. @return true|WP_Error */
function tio2_validate_poland_market_identity(int $post_id)
{
    if ('tio2_market_page' !== get_post_type($post_id)) return new WP_Error('poland_type', 'Invalid Poland content type.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields'=>'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) return new WP_Error('poland_scope', 'Poland content requires exactly the tio2-my scope.');
    if ('tio2-my-market-poland' !== get_post_field('post_name', $post_id) || '/markets/poland' !== get_post_meta($post_id, 'public_path', true)) return new WP_Error('poland_identity', 'Invalid Poland route identity.');
    return true;
}

/** @return true|WP_Error */
function tio2_validate_market_page_poland_v01_contract(int $post_id)
{
    $identity = tio2_validate_poland_market_identity($post_id);
    return is_wp_error($identity) ? $identity : tio2_validate_poland_market_payload(get_post_meta($post_id, TIO2_MY_POLAND_MARKET_CONTRACT_META, true));
}

/** Find every potential owner, including custom statuses and foreign post types; never filter away a collision. */
function tio2_poland_market_candidate_ids(): array
{
    $statuses = array_values(array_diff(get_post_stati(), ['auto-draft']));
    $query = ['post_type'=>array_values(get_post_types()), 'post_status'=>$statuses, 'fields'=>'ids', 'numberposts'=>-1, 'suppress_filters'=>true];
    $ids = get_posts(array_merge($query, ['name'=>'tio2-my-market-poland']));
    foreach (['/markets/poland','/markets/poland/'] as $path) {
        $ids = array_merge($ids, get_posts(array_merge($query, ['meta_key'=>'public_path','meta_value'=>$path])));
    }
    return array_values(array_unique(array_map('intval', $ids)));
}

function tio2_resolve_malaysia_poland_market_record_json(): string
{
    $ids = tio2_poland_market_candidate_ids();
    if (count($ids) !== 1 || 'publish' !== get_post_status($ids[0]) || is_wp_error(tio2_validate_market_page_poland_v01_contract($ids[0]))) {
        throw new \GraphQL\Error\UserError('The Malaysia Poland Market record is missing, ambiguous, unpublished or invalid.');
    }
    $id = $ids[0];
    return wp_json_encode(['id'=>'market-eu-pl-'.$id,
        'modifiedGmt'=>str_replace(' ', 'T', (string)get_post_field('post_modified_gmt', $id)),
        'status'=>'publish', 'siteScopes'=>['nodes'=>[['slug'=>'tio2-my']]],
        'publishingFields'=>['publicPath'=>'/markets/poland'],
        'malaysiaPolandMarketContractJson'=>get_post_meta($id, TIO2_MY_POLAND_MARKET_CONTRACT_META, true)]);
}

function tio2_register_market_page_poland_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaPolandMarketRecordJson', ['type'=>['non_null'=>'String'],
        'resolve'=>'tio2_resolve_malaysia_poland_market_record_json', 'description'=>'Validated, scoped Poland Market content for TiO2 Malaysia.']);
}
add_action('graphql_register_types', 'tio2_register_market_page_poland_v01_graphql_field');

function tio2_register_market_page_poland_v01_meta(): void
{
    register_post_meta('tio2_market_page', TIO2_MY_POLAND_MARKET_CONTRACT_META, ['type'=>'string', 'single'=>true,
        'show_in_rest'=>false, 'auth_callback'=>static function ($allowed, $key, $post_id): bool {
            return current_user_can('edit_post', $post_id) && true === tio2_validate_poland_market_identity((int)$post_id);
        }]);
}
add_action('init', 'tio2_register_market_page_poland_v01_meta');

function tio2_add_market_page_poland_v01_meta_box($post): void
{
    if (true !== tio2_validate_poland_market_identity((int)$post->ID) || !current_user_can('edit_post', $post->ID)) return;
    add_meta_box('tio2-poland-market', 'Poland Market content', 'tio2_render_market_page_poland_v01_meta_box', 'tio2_market_page', 'normal', 'high');
}
add_action('add_meta_boxes_tio2_market_page', 'tio2_add_market_page_poland_v01_meta_box');

function tio2_render_market_page_poland_v01_meta_box($post): void
{
    wp_nonce_field('tio2_poland_market_save_'.$post->ID, 'tio2_poland_market_nonce');
    echo '<p>Edit the complete page JSON. Keep the five modules, identity and approved navigation. Editorial approval remains required.</p>';
    echo '<textarea name="tio2_poland_market_json" rows="32" class="large-text code" aria-label="Poland Market content JSON">'.esc_textarea((string)get_post_meta($post->ID, TIO2_MY_POLAND_MARKET_CONTRACT_META, true)).'</textarea>';
}

function tio2_save_market_page_poland_v01_meta(int $post_id): void
{
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) ||
        !current_user_can('edit_post', $post_id) || !isset($_POST['tio2_poland_market_nonce'], $_POST['tio2_poland_market_json']) ||
        !is_string($_POST['tio2_poland_market_nonce']) || !is_string($_POST['tio2_poland_market_json']) ||
        !wp_verify_nonce(wp_unslash($_POST['tio2_poland_market_nonce']), 'tio2_poland_market_save_'.$post_id) ||
        true !== tio2_validate_poland_market_identity($post_id)) return;
    $json = wp_unslash($_POST['tio2_poland_market_json']);
    if (true !== tio2_validate_poland_market_payload($json)) {
        if (function_exists('set_transient')) set_transient('tio2_poland_market_error_'.get_current_user_id(), 'Poland content was not saved: check required plain text, module structure and approved links.', 60);
        return;
    }
    update_post_meta($post_id, TIO2_MY_POLAND_MARKET_CONTRACT_META, wp_slash($json));
    if (get_post_meta($post_id, TIO2_MY_POLAND_MARKET_CONTRACT_META, true) !== $json && function_exists('set_transient')) {
        set_transient('tio2_poland_market_error_'.get_current_user_id(), 'Poland content storage failed; the previous content remains in use.', 60);
    }
}
add_action('save_post_tio2_market_page', 'tio2_save_market_page_poland_v01_meta', 40);
add_action('admin_notices', static function (): void {
    $key = 'tio2_poland_market_error_'.get_current_user_id(); $message = get_transient($key);
    if (is_string($message) && '' !== $message) { delete_transient($key); echo '<div class="notice notice-error"><p>'.esc_html($message).'</p></div>'; }
});
