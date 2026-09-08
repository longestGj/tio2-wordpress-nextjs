<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

const TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META = '_tio2_my_brazil_en_market_contract_json';

function tio2_brazil_en_keys($value, array $keys): bool
{
    if (!is_array($value)) return false;
    $actual = array_keys($value); sort($actual); sort($keys);
    return $actual === $keys;
}

function tio2_brazil_en_text($value): bool
{
    $ws = '[\x09-\x0D\x20\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';
    return is_string($value) && '' !== $value && strlen($value) <= 20000 &&
        1 === preg_match('//u', $value) && 0 === preg_match('/[<>\x00-\x1F\x7F]/u', $value) &&
        0 === preg_match('/\A'.$ws.'|'.$ws.'\z/u', $value);
}

function tio2_brazil_en_text_list($value, int $count): bool
{
    return is_array($value) && array_is_list($value) && count($value) === $count &&
        count(array_filter($value, 'tio2_brazil_en_text')) === $count;
}

function tio2_brazil_en_action($value, string $href, string $page_id, ?array $context = null, ?int $paragraph = null): bool
{
    $keys = ['label','href','targetPageId'];
    if ($context !== null) $keys[] = 'context';
    if ($paragraph !== null) $keys[] = 'paragraphIndex';
    if (!tio2_brazil_en_keys($value, $keys) || !tio2_brazil_en_text($value['label']) ||
        $value['href'] !== $href || $value['targetPageId'] !== $page_id) return false;
    if ($context !== null && $value['context'] !== $context) return false;
    return $paragraph === null || $value['paragraphIndex'] === $paragraph;
}

/** @return true|WP_Error */
function tio2_validate_brazil_en_market_payload($json)
{
    $invalid = new WP_Error('brazil_en_payload', 'Brazil English content must retain the approved five-module contract and navigation.');
    if (!is_string($json) || strlen($json) > 500000) return $invalid;
    $p = json_decode($json, true);
    if (!tio2_brazil_en_keys($p, ['identity','seo','breadcrumb','modules'])) return $invalid;
    $identity = ['pageId'=>'MARKET-BR-EN','siteScope'=>'tio2-my','locale'=>'en','path'=>'/markets/brazil/','schemaVersion'=>'market-brazil-en-v0.1'];
    if (!tio2_brazil_en_keys($p['identity'], array_keys($identity)) || $p['identity'] !== $identity) return $invalid;
    if (!tio2_brazil_en_keys($p['seo'], ['title','description','canonical']) ||
        !tio2_brazil_en_text($p['seo']['title']) || !tio2_brazil_en_text($p['seo']['description']) ||
        'https://tio2malaysia.com/markets/brazil/' !== $p['seo']['canonical']) return $invalid;
    $breadcrumbs = [['/','HOME-001'],['/markets/','MARKET-000'],['/markets/brazil/','MARKET-BR-EN']];
    if (!is_array($p['breadcrumb']) || count($p['breadcrumb']) !== 3) return $invalid;
    foreach ($breadcrumbs as $i=>$expected) if (!tio2_brazil_en_action($p['breadcrumb'][$i], $expected[0], $expected[1])) return $invalid;
    if (!is_array($p['modules']) || !array_is_list($p['modules']) || count($p['modules']) !== 5) return $invalid;
    $counts = [[1,0,0,0,2],[2,3,0,0,1],[4,0,2,0,2],[1,0,0,0,1],[2,0,0,5,1]];
    foreach ($p['modules'] as $i=>$m) {
        if (!tio2_brazil_en_keys($m, ['id','heading','paragraphs','cards','inlineLinks','listItems','actions']) ||
            $m['id'] !== 'BR-EN-0'.($i+1) || !tio2_brazil_en_text($m['heading']) ||
            !tio2_brazil_en_text_list($m['paragraphs'], $counts[$i][0]) ||
            !is_array($m['cards']) || count($m['cards']) !== $counts[$i][1] ||
            !is_array($m['inlineLinks']) || count($m['inlineLinks']) !== $counts[$i][2] ||
            !tio2_brazil_en_text_list($m['listItems'], $counts[$i][3]) ||
            !is_array($m['actions']) || count($m['actions']) !== $counts[$i][4]) return $invalid;
    }
    $cards = [['Coatings','/applications/titanium-dioxide-for-coatings/','APP-COAT'],['Plastics','/applications/titanium-dioxide-for-plastics/','APP-PLAS'],['Masterbatch Production','/applications/titanium-dioxide-for-masterbatch/','APP-MB']];
    foreach ($cards as $i=>$expected) {
        $card = $p['modules'][1]['cards'][$i];
        if (!tio2_brazil_en_keys($card, ['heading','paragraphs','action']) || $card['heading'] !== $expected[0] ||
            !tio2_brazil_en_text_list($card['paragraphs'], 1) || !tio2_brazil_en_action($card['action'], $expected[1], $expected[2])) return $invalid;
    }
    $source = ['sourcePageId'=>'MARKET-BR-EN']; $destination = ['sourcePageId'=>'MARKET-BR-EN','destinationCountry'=>'Brazil'];
    $checks = [
        [$p['modules'][0]['actions'][0],'/request-a-quote/','CONV-RFQ',$destination],
        [$p['modules'][0]['actions'][1],'/products/','PRODUCT-000',null],
        [$p['modules'][1]['actions'][0],'/products/','PRODUCT-000',null],
        [$p['modules'][2]['actions'][0],'/request-documents/','CONV-DOC',$source],
        [$p['modules'][2]['actions'][1],'/documents/','DOC-000',null],
        [$p['modules'][3]['actions'][0],'/resources/brazil-titanium-dioxide-anti-dumping-duty/','RES-TRADE-BR',null],
        [$p['modules'][4]['actions'][0],'/request-a-quote/','CONV-RFQ',$destination],
    ];
    foreach ($checks as $check) if (!tio2_brazil_en_action($check[0], $check[1], $check[2], $check[3])) return $invalid;
    $inline = $p['modules'][2]['inlineLinks'];
    if (!tio2_brazil_en_action($inline[0], '/products/', 'PRODUCT-000', null, 2) ||
        !tio2_brazil_en_action($inline[1], '/request-a-quote/', 'CONV-RFQ', $source, 2)) return $invalid;
    return true;
}

/** @return true|WP_Error */
function tio2_validate_brazil_en_market_identity(int $post_id)
{
    if ('tio2_market_page' !== get_post_type($post_id)) return new WP_Error('brazil_en_type', 'Invalid Brazil English content type.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields'=>'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) return new WP_Error('brazil_en_scope', 'Brazil English content requires exactly tio2-my.');
    if ('tio2-my-market-brazil-en' !== get_post_field('post_name', $post_id) || '/markets/brazil' !== get_post_meta($post_id, 'public_path', true)) return new WP_Error('brazil_en_identity', 'Invalid Brazil English route identity.');
    return true;
}

function tio2_validate_market_page_brazil_en_v01_contract(int $post_id)
{
    $identity = tio2_validate_brazil_en_market_identity($post_id);
    return is_wp_error($identity) ? $identity : tio2_validate_brazil_en_market_payload(get_post_meta($post_id, TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META, true));
}

function tio2_brazil_en_market_candidate_ids(): array
{
    $query = ['post_type'=>array_values(get_post_types()),'post_status'=>array_values(array_diff(get_post_stati(), ['auto-draft'])),'fields'=>'ids','numberposts'=>-1,'suppress_filters'=>true];
    $ids = get_posts(array_merge($query, ['name'=>'tio2-my-market-brazil-en']));
    foreach (['/markets/brazil','/markets/brazil/'] as $path) $ids = array_merge($ids, get_posts(array_merge($query, ['meta_key'=>'public_path','meta_value'=>$path])));
    return array_values(array_unique(array_map('intval', $ids)));
}

function tio2_resolve_malaysia_brazil_en_market_record_json(): string
{
    $ids = tio2_brazil_en_market_candidate_ids();
    if (count($ids) !== 1 || 'publish' !== get_post_status($ids[0]) || is_wp_error(tio2_validate_market_page_brazil_en_v01_contract($ids[0]))) {
        throw new \GraphQL\Error\UserError('The Malaysia Brazil English Market record is missing, ambiguous, unpublished or invalid.');
    }
    $id = $ids[0];
    return wp_json_encode(['id'=>'market-br-en-'.$id,'modifiedGmt'=>str_replace(' ', 'T', (string)get_post_field('post_modified_gmt', $id)),
        'status'=>'publish','siteScopes'=>['nodes'=>[['slug'=>'tio2-my']]],'publishingFields'=>['publicPath'=>'/markets/brazil'],
        'malaysiaBrazilEnMarketContractJson'=>get_post_meta($id, TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META, true)]);
}

function tio2_register_market_page_brazil_en_v01_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaBrazilEnMarketRecordJson', ['type'=>['non_null'=>'String'],
        'resolve'=>'tio2_resolve_malaysia_brazil_en_market_record_json','description'=>'Validated, scoped Brazil English Market content for TiO2 Malaysia.']);
}
add_action('graphql_register_types', 'tio2_register_market_page_brazil_en_v01_graphql_field');

function tio2_register_market_page_brazil_en_v01_meta(): void
{
    register_post_meta('tio2_market_page', TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META, ['type'=>'string','single'=>true,'show_in_rest'=>false,
        'auth_callback'=>static function ($allowed, $key, $post_id): bool { return current_user_can('edit_post', $post_id) && true === tio2_validate_brazil_en_market_identity((int)$post_id); }]);
}
add_action('init', 'tio2_register_market_page_brazil_en_v01_meta');

function tio2_save_market_page_brazil_en_v01_meta(int $post_id): void
{
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || !current_user_can('edit_post', $post_id) ||
        !isset($_POST['tio2_brazil_en_market_nonce'], $_POST['tio2_brazil_en_market_json']) ||
        !is_string($_POST['tio2_brazil_en_market_nonce']) || !is_string($_POST['tio2_brazil_en_market_json']) ||
        !wp_verify_nonce(wp_unslash($_POST['tio2_brazil_en_market_nonce']), 'tio2_brazil_en_market_save_'.$post_id) ||
        true !== tio2_validate_brazil_en_market_identity($post_id)) return;
    $json = wp_unslash($_POST['tio2_brazil_en_market_json']);
    if (true === tio2_validate_brazil_en_market_payload($json)) update_post_meta($post_id, TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META, wp_slash($json));
}
add_action('save_post_tio2_market_page', 'tio2_save_market_page_brazil_en_v01_meta', 40);

function tio2_add_market_page_brazil_en_v01_meta_box($post): void
{
    if (true !== tio2_validate_brazil_en_market_identity((int)$post->ID) || !current_user_can('edit_post', $post->ID)) return;
    add_meta_box('tio2-brazil-en-market', 'Brazil English Market content', 'tio2_render_market_page_brazil_en_v01_meta_box', 'tio2_market_page', 'normal', 'high');
}
add_action('add_meta_boxes_tio2_market_page', 'tio2_add_market_page_brazil_en_v01_meta_box');

function tio2_render_market_page_brazil_en_v01_meta_box($post): void
{
    wp_nonce_field('tio2_brazil_en_market_save_'.$post->ID, 'tio2_brazil_en_market_nonce');
    echo '<textarea name="tio2_brazil_en_market_json" rows="36" class="large-text code" aria-label="Brazil English Market content JSON">'.esc_textarea((string)get_post_meta($post->ID, TIO2_MY_BRAZIL_EN_MARKET_CONTRACT_META, true)).'</textarea>';
}
