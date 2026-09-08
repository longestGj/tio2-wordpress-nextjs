<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

const TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META = '_tio2_my_brazil_pt_market_contract_json';

function tio2_brazil_pt_keys($value, array $keys): bool
{
    if (!is_array($value)) return false;
    $actual = array_keys($value); sort($actual); sort($keys);
    return $actual === $keys;
}

function tio2_brazil_pt_text($value): bool
{
    $ws = '[\x09-\x0D\x20\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';
    return is_string($value) && '' !== $value && strlen($value) <= 20000 &&
        1 === preg_match('//u', $value) && 0 === preg_match('/[<>\x00-\x1F\x7F]/u', $value) &&
        0 === preg_match('/\A'.$ws.'|'.$ws.'\z/u', $value);
}

function tio2_brazil_pt_text_list($value, int $count): bool
{
    return is_array($value) && array_is_list($value) && count($value) === $count &&
        count(array_filter($value, 'tio2_brazil_pt_text')) === $count;
}

function tio2_brazil_pt_action($value, string $href, string $page_id, ?array $context = null, ?int $paragraph = null): bool
{
    $keys = ['label','href','targetPageId'];
    if ($context !== null) $keys[] = 'context';
    if ($paragraph !== null) $keys[] = 'paragraphIndex';
    if (!tio2_brazil_pt_keys($value, $keys) || !tio2_brazil_pt_text($value['label']) ||
        $value['href'] !== $href || $value['targetPageId'] !== $page_id) return false;
    if ($context !== null && $value['context'] !== $context) return false;
    return $paragraph === null || $value['paragraphIndex'] === $paragraph;
}

function tio2_brazil_pt_language_span($value, int $paragraph, string $label): bool
{
    return tio2_brazil_pt_keys($value, ['paragraphIndex','label','language']) &&
        $value === ['paragraphIndex'=>$paragraph,'label'=>$label,'language'=>'en'];
}

/** @return true|WP_Error */
function tio2_validate_brazil_pt_market_payload($json)
{
    $invalid = new WP_Error('brazil_pt_payload', 'Brazil Portuguese content must retain the approved five-module contract and language boundaries.');
    if (!is_string($json) || strlen($json) > 500000) return $invalid;
    $p = json_decode($json, true);
    if (!tio2_brazil_pt_keys($p, ['identity','seo','languageNotice','breadcrumb','modules'])) return $invalid;
    $identity = ['pageId'=>'MARKET-BR-PT','siteScope'=>'tio2-my','locale'=>'pt-BR','path'=>'/pt-br/markets/brazil/','schemaVersion'=>'market-brazil-pt-v0.2'];
    if (!tio2_brazil_pt_keys($p['identity'], array_keys($identity)) || $p['identity'] !== $identity) return $invalid;
    if (!tio2_brazil_pt_keys($p['seo'], ['title','description','canonical']) ||
        !tio2_brazil_pt_text($p['seo']['title']) || !tio2_brazil_pt_text($p['seo']['description']) ||
        'https://tio2malaysia.com/pt-br/markets/brazil/' !== $p['seo']['canonical']) return $invalid;
    if ('Os links desta página levam a conteúdos e formulários disponíveis em inglês.' !== $p['languageNotice']) return $invalid;
    $breadcrumbs = [['/','HOME-001'],['/markets/','MARKET-000'],['/pt-br/markets/brazil/','MARKET-BR-PT']];
    if (!is_array($p['breadcrumb']) || count($p['breadcrumb']) !== 3) return $invalid;
    foreach ($breadcrumbs as $i=>$expected) if (!tio2_brazil_pt_action($p['breadcrumb'][$i], $expected[0], $expected[1])) return $invalid;
    if (!is_array($p['modules']) || !array_is_list($p['modules']) || count($p['modules']) !== 5) return $invalid;
    $counts = [[1,0,0,0,0,2],[2,3,0,0,0,1],[4,0,2,2,0,2],[1,0,0,0,0,1],[2,0,0,5,5,1]];
    foreach ($p['modules'] as $i=>$m) {
        if (!tio2_brazil_pt_keys($m, ['id','heading','paragraphs','cards','inlineLinks','languageSpans','listItems','actions']) ||
            $m['id'] !== 'BR-PT-0'.($i+1) || !tio2_brazil_pt_text($m['heading']) ||
            !tio2_brazil_pt_text_list($m['paragraphs'], $counts[$i][0]) ||
            !is_array($m['cards']) || count($m['cards']) !== $counts[$i][1] ||
            !is_array($m['inlineLinks']) || count($m['inlineLinks']) !== $counts[$i][2] ||
            !is_array($m['languageSpans']) || count($m['languageSpans']) !== $counts[$i][3] ||
            !tio2_brazil_pt_text_list($m['listItems'], $counts[$i][4]) ||
            !is_array($m['actions']) || count($m['actions']) !== $counts[$i][5]) return $invalid;
    }
    $cards = [['Tintas e revestimentos','/applications/titanium-dioxide-for-coatings/','APP-COAT'],['Plásticos','/applications/titanium-dioxide-for-plastics/','APP-PLAS'],['Produção de masterbatch','/applications/titanium-dioxide-for-masterbatch/','APP-MB']];
    foreach ($cards as $i=>$expected) {
        $card = $p['modules'][1]['cards'][$i];
        if (!tio2_brazil_pt_keys($card, ['heading','paragraphs','action']) || $card['heading'] !== $expected[0] ||
            !tio2_brazil_pt_text_list($card['paragraphs'], 1) || !tio2_brazil_pt_action($card['action'], $expected[1], $expected[2])) return $invalid;
    }
    $source = ['sourcePageId'=>'MARKET-BR-PT'];
    $destination = ['sourcePageId'=>'MARKET-BR-PT','destinationCountry'=>'Brazil'];
    $checks = [
        [$p['modules'][0]['actions'][0],'/request-a-quote/','CONV-RFQ',$destination],
        [$p['modules'][0]['actions'][1],'/products/','PRODUCT-000',null],
        [$p['modules'][1]['actions'][0],'/products/','PRODUCT-000',null],
        [$p['modules'][2]['actions'][0],'/request-documents/','CONV-DOC',$source],
        [$p['modules'][2]['actions'][1],'/documents/','DOC-000',null],
        [$p['modules'][3]['actions'][0],'/resources/brazil-titanium-dioxide-anti-dumping-duty/','RES-TRADE-BR',null],
        [$p['modules'][4]['actions'][0],'/request-a-quote/','CONV-RFQ',$destination],
    ];
    foreach ($checks as $check) if (!tio2_brazil_pt_action($check[0], $check[1], $check[2], $check[3])) return $invalid;
    $inline = $p['modules'][2]['inlineLinks'];
    if (!tio2_brazil_pt_action($inline[0], '/products/', 'PRODUCT-000', null, 2) ||
        !tio2_brazil_pt_action($inline[1], '/request-a-quote/', 'CONV-RFQ', $source, 2)) return $invalid;
    $spans3 = $p['modules'][2]['languageSpans'];
    if (!tio2_brazil_pt_language_span($spans3[0], 2, 'Not sure / Need help') ||
        !tio2_brazil_pt_language_span($spans3[1], 3, 'Additional Requirements')) return $invalid;
    $span_labels = ['Product / Grade','Not sure / Need help','Application','Other / Not sure','Additional Requirements'];
    foreach ($span_labels as $i=>$label) if (!tio2_brazil_pt_language_span($p['modules'][4]['languageSpans'][$i], 0, $label)) return $invalid;
    return true;
}

/** @return true|WP_Error */
function tio2_validate_brazil_pt_market_identity(int $post_id)
{
    if ('tio2_market_page' !== get_post_type($post_id)) return new WP_Error('brazil_pt_type', 'Invalid Brazil Portuguese content type.');
    $scopes = wp_get_post_terms($post_id, 'site_scope', ['fields'=>'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) return new WP_Error('brazil_pt_scope', 'Brazil Portuguese content requires exactly tio2-my.');
    if ('tio2-my-market-brazil-pt' !== get_post_field('post_name', $post_id) || '/pt-br/markets/brazil' !== get_post_meta($post_id, 'public_path', true)) return new WP_Error('brazil_pt_identity', 'Invalid Brazil Portuguese route identity.');
    return true;
}

function tio2_validate_market_page_brazil_pt_v02_contract(int $post_id)
{
    $identity = tio2_validate_brazil_pt_market_identity($post_id);
    return is_wp_error($identity) ? $identity : tio2_validate_brazil_pt_market_payload(get_post_meta($post_id, TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META, true));
}

function tio2_brazil_pt_market_candidate_ids(): array
{
    $query = ['post_type'=>array_values(get_post_types()),'post_status'=>array_values(array_diff(get_post_stati(), ['auto-draft'])),'fields'=>'ids','numberposts'=>-1,'suppress_filters'=>true];
    $ids = get_posts(array_merge($query, ['name'=>'tio2-my-market-brazil-pt']));
    foreach (['/pt-br/markets/brazil','/pt-br/markets/brazil/'] as $path) $ids = array_merge($ids, get_posts(array_merge($query, ['meta_key'=>'public_path','meta_value'=>$path])));
    return array_values(array_unique(array_map('intval', $ids)));
}

function tio2_resolve_malaysia_brazil_pt_market_record_json(): string
{
    $ids = tio2_brazil_pt_market_candidate_ids();
    if (count($ids) !== 1 || 'publish' !== get_post_status($ids[0]) || is_wp_error(tio2_validate_market_page_brazil_pt_v02_contract($ids[0]))) {
        throw new \GraphQL\Error\UserError('The Malaysia Brazil Portuguese Market record is missing, ambiguous, unpublished or invalid.');
    }
    $id = $ids[0];
    return wp_json_encode(['id'=>'market-br-pt-'.$id,'modifiedGmt'=>str_replace(' ', 'T', (string)get_post_field('post_modified_gmt', $id)),
        'status'=>'publish','siteScopes'=>['nodes'=>[['slug'=>'tio2-my']]],'publishingFields'=>['publicPath'=>'/pt-br/markets/brazil'],
        'malaysiaBrazilPtMarketContractJson'=>get_post_meta($id, TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META, true)]);
}

function tio2_register_market_page_brazil_pt_v02_graphql_field(): void
{
    register_graphql_field('RootQuery', 'malaysiaBrazilPtMarketRecordJson', ['type'=>['non_null'=>'String'],
        'resolve'=>'tio2_resolve_malaysia_brazil_pt_market_record_json','description'=>'Validated, scoped Brazil Portuguese Market content for TiO2 Malaysia.']);
}
add_action('graphql_register_types', 'tio2_register_market_page_brazil_pt_v02_graphql_field');

function tio2_register_market_page_brazil_pt_v02_meta(): void
{
    register_post_meta('tio2_market_page', TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META, ['type'=>'string','single'=>true,'show_in_rest'=>false,
        'auth_callback'=>static function ($allowed, $key, $post_id): bool { return current_user_can('edit_post', $post_id) && true === tio2_validate_brazil_pt_market_identity((int)$post_id); }]);
}
add_action('init', 'tio2_register_market_page_brazil_pt_v02_meta');

function tio2_save_market_page_brazil_pt_v02_meta(int $post_id): void
{
    if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id) || !current_user_can('edit_post', $post_id) ||
        !isset($_POST['tio2_brazil_pt_market_nonce'], $_POST['tio2_brazil_pt_market_json']) ||
        !is_string($_POST['tio2_brazil_pt_market_nonce']) || !is_string($_POST['tio2_brazil_pt_market_json']) ||
        !wp_verify_nonce(wp_unslash($_POST['tio2_brazil_pt_market_nonce']), 'tio2_brazil_pt_market_save_'.$post_id) ||
        true !== tio2_validate_brazil_pt_market_identity($post_id)) return;
    $json = wp_unslash($_POST['tio2_brazil_pt_market_json']);
    if (true === tio2_validate_brazil_pt_market_payload($json)) update_post_meta($post_id, TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META, wp_slash($json));
}
add_action('save_post_tio2_market_page', 'tio2_save_market_page_brazil_pt_v02_meta', 40);

function tio2_add_market_page_brazil_pt_v02_meta_box($post): void
{
    if (true !== tio2_validate_brazil_pt_market_identity((int)$post->ID) || !current_user_can('edit_post', $post->ID)) return;
    add_meta_box('tio2-brazil-pt-market', 'Brazil Portuguese Market content', 'tio2_render_market_page_brazil_pt_v02_meta_box', 'tio2_market_page', 'normal', 'high');
}
add_action('add_meta_boxes_tio2_market_page', 'tio2_add_market_page_brazil_pt_v02_meta_box');

function tio2_render_market_page_brazil_pt_v02_meta_box($post): void
{
    wp_nonce_field('tio2_brazil_pt_market_save_'.$post->ID, 'tio2_brazil_pt_market_nonce');
    echo '<textarea name="tio2_brazil_pt_market_json" rows="36" class="large-text code" aria-label="Brazil Portuguese Market content JSON">'.esc_textarea((string)get_post_meta($post->ID, TIO2_MY_BRAZIL_PT_MARKET_CONTRACT_META, true)).'</textarea>';
}
