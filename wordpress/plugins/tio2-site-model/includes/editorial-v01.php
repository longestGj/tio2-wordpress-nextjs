<?php
declare(strict_types=1);
require_once __DIR__.'/content-release-validation.php';
if (!defined('ABSPATH')) exit;
require_once __DIR__.'/editorial-review.php';

const TIO2_EDITORIAL_META = '_tio2_my_editorial_contract';
const TIO2_EDITORIAL_REVIEW_META = '_tio2_my_editorial_review';
function tio2_editorial_ids(): array {
    return ['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER','MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU','RES-R706','RES-CHEMOURS'];
}
function tio2_editorial_config(string $page_id): string {
    if (!in_array($page_id,tio2_editorial_ids(),true)) return '';
    $path=dirname(__DIR__).'/config/tio2-my-editorial-'.strtolower($page_id).'.json';
    return is_file($path)?(string)file_get_contents($path):'';
}
function tio2_editorial_identity(string $page_id): ?array {
    $config=json_decode(tio2_editorial_config($page_id),true);
    if (!is_array($config) || ($config['identity']['pageId']??null)!==$page_id || ($config['identity']['siteScope']??null)!=='tio2-my') return null;
    return ['slug'=>'tio2-my-editorial-'.strtolower($page_id),'path'=>rtrim($config['identity']['path'],'/')];
}
function tio2_editorial_register(): void {
    register_post_type('tio2_my_editorial',[
        'label'=>'Malaysia Editorial Pages','public'=>false,'show_ui'=>true,'show_in_rest'=>false,
        'show_in_graphql'=>false,'publicly_queryable'=>false,'supports'=>['title','revisions'],
        'rewrite'=>false,'has_archive'=>false,
    ]);
    register_taxonomy_for_object_type('site_scope','tio2_my_editorial');
}
add_action('init','tio2_editorial_register',12);
function tio2_editorial_validate_payload(string $page_id,string $json) {
    $approved=json_decode(tio2_editorial_config($page_id),true);
    $payload=json_decode($json,true);
    if (!is_array($approved) || !is_array($payload) || !tio2_my_content_matches($payload,$approved)) return new WP_Error('editorial_payload','Unapproved editorial payload.');
    return true;
}
function tio2_editorial_candidates(string $page_id): array {
    $identity=tio2_editorial_identity($page_id);
    if (!$identity) return [];
    $ids=get_posts(['post_type'=>'tio2_my_editorial','post_status'=>['publish','draft','pending','private','future','trash'],'fields'=>'ids','numberposts'=>-1,'suppress_filters'=>false]);
    return array_values(array_filter(array_map('intval',$ids),static fn(int $id):bool => get_post_field('post_name',$id)===$identity['slug'] || get_post_meta($id,'public_path',true)===$identity['path'] || get_post_meta($id,'_tio2_editorial_page_id',true)===$page_id));
}
function tio2_editorial_validate_record(int $post_id,string $page_id,bool $published=true) {
    $identity=tio2_editorial_identity($page_id);
    $scopes=wp_get_post_terms($post_id,'site_scope',['fields'=>'slugs']);
    if (!$identity || get_post_type($post_id)!=='tio2_my_editorial' || is_wp_error($scopes) || array_values($scopes)!==['tio2-my'] ||
        get_post_field('post_name',$post_id)!==$identity['slug'] || get_post_meta($post_id,'public_path',true)!==$identity['path'] ||
        get_post_meta($post_id,'_tio2_editorial_page_id',true)!==$page_id || ($published && get_post_status($post_id)!=='publish')) return new WP_Error('editorial_identity','Invalid editorial identity or scope.');
    return tio2_editorial_validate_payload($page_id,(string)get_post_meta($post_id,TIO2_EDITORIAL_META,true));
}
/** @return array<string,array{pageId:string,resolver:string}> */
function tio2_editorial_internal_target_registry(): array {
    return [
        '/'=>['pageId'=>'HOME-001','resolver'=>'homepage'],
        '/applications/'=>['pageId'=>'APP-000','resolver'=>'unavailable'],
        '/products/'=>['pageId'=>'PRODUCT-000','resolver'=>'product-hub'],
        '/resources/'=>['pageId'=>'RES-000','resolver'=>'resource-hub'],
        '/resources/eu-titanium-dioxide-anti-dumping-duty/'=>['pageId'=>'RES-TRADE-EU','resolver'=>'editorial'],
        '/request-a-quote/'=>['pageId'=>'CONV-RFQ','resolver'=>'rfq'],
        '/request-documents/'=>['pageId'=>'CONV-DOC','resolver'=>'documents'],
        '/request-sample/'=>['pageId'=>'CONV-SAMPLE','resolver'=>'sample'],
        '/applications/titanium-dioxide-for-coatings/'=>['pageId'=>'APP-COAT','resolver'=>'editorial'],
        '/applications/titanium-dioxide-for-plastics/'=>['pageId'=>'APP-PLAS','resolver'=>'editorial'],
        '/applications/titanium-dioxide-for-masterbatch/'=>['pageId'=>'APP-MB','resolver'=>'editorial'],
        '/applications/titanium-dioxide-for-printing-inks/'=>['pageId'=>'APP-INK','resolver'=>'editorial'],
        '/applications/titanium-dioxide-for-paper/'=>['pageId'=>'APP-PAPER','resolver'=>'editorial'],
        '/markets/european-union/'=>['pageId'=>'MARKET-EU-001','resolver'=>'market-eu'],
        '/markets/united-kingdom/'=>['pageId'=>'MARKET-UK-001','resolver'=>'market-uk'],
        '/markets/india/'=>['pageId'=>'MARKET-IN-001','resolver'=>'market-country'],
        '/markets/brazil/'=>['pageId'=>'MARKET-BR-EN','resolver'=>'unavailable'],
        '/pt-br/markets/brazil/'=>['pageId'=>'MARKET-BR-PT','resolver'=>'unavailable'],
    ];
}
function tio2_editorial_target_record_ready(string $json,string $href): bool {
    $record=json_decode($json,true);
    return is_array($record) && ($record['status']??null)==='publish' &&
        ($record['siteScopes']['nodes']??null)===[['slug'=>'tio2-my']] &&
        ($record['publishingFields']['publicPath']??null)===rtrim($href,'/');
}
function tio2_editorial_homepage_target_ready(): bool {
    if(!function_exists('tio2_find_homepage_ids') || !function_exists('tio2_validate_homepage_v04_contract')) return false;
    $ids=array_values(array_filter(tio2_find_homepage_ids('tio2-my',false),static fn(int $id):bool=>get_post_status($id)==='publish'));
    return count($ids)===1 && !is_wp_error(tio2_validate_homepage_v04_contract((int)$ids[0]));
}
function tio2_editorial_page_target_ready(string $page_id,string $href): bool {
    $identity=tio2_editorial_identity($page_id);
    $ids=tio2_editorial_candidates($page_id);
    if(!$identity || count($ids)!==1 || $identity['path']!==rtrim($href,'/') || is_wp_error(tio2_editorial_validate_record($ids[0],$page_id))) return false;
    $payload=json_decode((string)get_post_meta($ids[0],TIO2_EDITORIAL_META,true),true);
    return is_array($payload) && tio2_editorial_review_valid($payload,get_post_meta($ids[0],TIO2_EDITORIAL_REVIEW_META,true));
}
/** @param array{pageId:string,resolver:string} $target */
function tio2_editorial_internal_target_ready(array $target,string $href): bool {
    if($target['resolver']==='unavailable') return false;
    if($target['resolver']==='homepage') return tio2_editorial_homepage_target_ready();
    if($target['resolver']==='editorial') return tio2_editorial_page_target_ready($target['pageId'],$href);
    $resolver=$target['resolver'];
    try {
        if($resolver==='product-hub' && function_exists('tio2_resolve_malaysia_product_hub_record_json')) $json=tio2_resolve_malaysia_product_hub_record_json();
        elseif($resolver==='resource-hub' && function_exists('tio2_resolve_malaysia_resource_hub_record_json')) $json=tio2_resolve_malaysia_resource_hub_record_json();
        elseif($resolver==='rfq' && function_exists('tio2_resolve_malaysia_rfq_page_record_json')) $json=tio2_resolve_malaysia_rfq_page_record_json();
        elseif($resolver==='documents' && function_exists('tio2_resolve_malaysia_request_documents_record_json')) $json=tio2_resolve_malaysia_request_documents_record_json();
        elseif($resolver==='sample' && function_exists('tio2_resolve_malaysia_request_sample_record_json')) $json=tio2_resolve_malaysia_request_sample_record_json();
        elseif($resolver==='market-eu' && function_exists('tio2_resolve_malaysia_eu_market_record_json')) $json=tio2_resolve_malaysia_eu_market_record_json();
        elseif($resolver==='market-uk' && function_exists('tio2_resolve_malaysia_uk_market_record_json')) $json=tio2_resolve_malaysia_uk_market_record_json();
        elseif($resolver==='market-country' && function_exists('tio2_resolve_malaysia_country_market_record_json')) $json=tio2_resolve_malaysia_country_market_record_json(null,['pageId'=>$target['pageId']]);
        else return false;
    } catch(\GraphQL\Error\UserError $error) { return false; }
    return is_string($json) && tio2_editorial_target_record_ready($json,$href);
}
/** @return list<string> */
function tio2_editorial_internal_paths(array $payload): array {
    $body=is_string($payload['bodyHtml']??null)?$payload['bodyHtml']:'';
    preg_match_all('~href="(/[^"?#]*)"~',$body,$matches);
    return array_values(array_unique(array_filter($matches[1],static fn(string $href):bool=>!str_starts_with($href,'//'))));
}
/** @return list<string> */
function tio2_editorial_unavailable_internal_paths(string $page_id,array $payload): array {
    // Only APP-INK/PAPER C §6 authorizes broad missing-target link suppression.
    // Other Application and Trade contracts retain their non-Grade destinations;
    // an unavailable mandatory route remains a release blocker instead of being masked.
    if(in_array($page_id,['MARKET-EU-DE','MARKET-EU-IT'],true)) {
        preg_match_all('~data-conditional-target="(/[^"?#]*)"~',$payload['bodyHtml']??'',$matches);
        $registry=tio2_editorial_internal_target_registry();
        return array_values(array_filter(array_unique($matches[1]),static fn(string $href):bool=>!isset($registry[$href]) || !tio2_editorial_internal_target_ready($registry[$href],$href)));
    }
    if(!in_array($page_id,['APP-INK','APP-PAPER'],true)) return [];
    $registry=tio2_editorial_internal_target_registry();$unavailable=[];
    foreach(tio2_editorial_internal_paths($payload) as $href) {
        if(preg_match('#^/products/m-[0-9]+/$#',$href)) continue;
        $target=$registry[$href]??null;
        if(!is_array($target) || !tio2_editorial_internal_target_ready($target,$href)) $unavailable[]=$href;
    }
    return $unavailable;
}
function tio2_editorial_resolve($root,array $args): string {
    $page_id=(string)($args['pageId']??'');
    if (($args['siteScope']??null)!=='tio2-my' || !in_array($page_id,tio2_editorial_ids(),true)) throw new \GraphQL\Error\UserError('Editorial scope or Page ID is not authorized.');
    if (!(defined('WP_CLI') && WP_CLI)) {
        $token=(string)getenv('EDITORIAL_API_TOKEN');
        $received=(string)($_SERVER['HTTP_X_TIO2_EDITORIAL_TOKEN']??'');
        if ($token==='' || $received==='' || !hash_equals($token,$received)) throw new \GraphQL\Error\UserError('Editorial delivery authentication required.');
    }
    $ids=tio2_editorial_candidates($page_id);
    if (count($ids)!==1 || is_wp_error(tio2_editorial_validate_record($ids[0],$page_id))) throw new \GraphQL\Error\UserError('Editorial record is missing, ambiguous or invalid.');
    $id=$ids[0]; $json=(string)get_post_meta($id,TIO2_EDITORIAL_META,true); $payload=json_decode($json,true);
    $review=get_post_meta($id,TIO2_EDITORIAL_REVIEW_META,true);
    if (!tio2_editorial_review_valid($payload,$review)) throw new \GraphQL\Error\UserError('Editorial source review is required.');
    $grade_paths=[];
    preg_match_all('#href="(/products/(m-[0-9]+)/)"#',$payload['bodyHtml'],$grade_links,PREG_SET_ORDER);
    foreach($grade_links as $link) {
        if(in_array($link[1],$grade_paths,true)) continue;
        try {
            $grade=json_decode(tio2_resolve_malaysia_product_detail_record_json(null,['slug'=>$link[2]]),true);
            if(($grade['status']??null)==='publish' && ($grade['siteScopes']['nodes']??null)===[['slug'=>'tio2-my']] && ($grade['publishingFields']['publicPath']??null)===rtrim($link[1],'/')) $grade_paths[]=$link[1];
        } catch(\GraphQL\Error\UserError $error) { /* Omit only the unavailable Grade action under the approved C contract. */ }
    }
    $unavailable_internal_paths=tio2_editorial_unavailable_internal_paths($page_id,$payload);
    return wp_json_encode([
        'id'=>'editorial-'.$id,'modifiedGmt'=>str_replace(' ','T',(string)get_post_field('post_modified_gmt',$id)),
        'status'=>get_post_status($id),'recordPageId'=>$page_id,'siteScopes'=>['nodes'=>[['slug'=>'tio2-my']]],
        'publishingFields'=>['publicPath'=>get_post_meta($id,'public_path',true)],'editorialContractJson'=>$json,
        'freshnessControl'=>is_array($review)?$review:null,
        'availableGradePaths'=>$grade_paths,
        'unavailableInternalPaths'=>$unavailable_internal_paths,
    ]);
}
add_action('graphql_register_types',static function():void {
    register_graphql_field('RootQuery','malaysiaEditorialRecordJson',[
        'type'=>['non_null'=>'String'],'args'=>['pageId'=>['type'=>['non_null'=>'String']],'siteScope'=>['type'=>['non_null'=>'String']]],
        'resolve'=>'tio2_editorial_resolve','description'=>'Exact source-bound Malaysia editorial record; fails closed for invalid scope, content or freshness.',
    ]);
});
add_action('add_meta_boxes_tio2_my_editorial',static function():void {
    add_meta_box('tio2-editorial-contract','Approved Malaysia editorial content',static function(WP_Post $post):void {
        wp_nonce_field('tio2_editorial_save','tio2_editorial_nonce');
        echo '<p>Source-bound content. Changed content requires a matching approved contract. Trade source review is maintained separately.</p><textarea name="tio2_editorial_json" rows="28" style="width:100%">'.esc_textarea((string)get_post_meta($post->ID,TIO2_EDITORIAL_META,true)).'</textarea>';
    });
});
add_action('save_post_tio2_my_editorial',static function(int $post_id):void {
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || wp_is_post_revision($post_id) || !current_user_can('edit_post',$post_id) ||
        !isset($_POST['tio2_editorial_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['tio2_editorial_nonce'])),'tio2_editorial_save')) return;
    $page_id=(string)get_post_meta($post_id,'_tio2_editorial_page_id',true);
    if (is_wp_error(tio2_editorial_validate_record($post_id,$page_id,false))) return;
    $json=isset($_POST['tio2_editorial_json'])?(string)wp_unslash($_POST['tio2_editorial_json']):'';
    if (!is_wp_error(tio2_editorial_validate_payload($page_id,$json))) update_post_meta($post_id,TIO2_EDITORIAL_META,wp_slash($json));
});
