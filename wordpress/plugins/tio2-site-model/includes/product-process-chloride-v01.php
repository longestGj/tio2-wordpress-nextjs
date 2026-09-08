<?php
declare(strict_types=1);
if (!defined('ABSPATH')) exit;

const TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META = '_tio2_my_chloride_process_contract_json';

function tio2_chloride_process_keys($value, array $keys): bool
{
    if (!is_array($value)) return false;
    $actual = array_keys($value); sort($actual); sort($keys);
    return $actual === $keys;
}

function tio2_chloride_process_text($value): bool
{
    $ws = '[\x09-\x0D\x20\x{00A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';
    return is_string($value) && '' !== $value && strlen($value) <= 20000 &&
        1 === preg_match('//u', $value) && 0 === preg_match('/[<>\x00-\x1F\x7F]/u', $value) &&
        0 === preg_match('/\A'.$ws.'|'.$ws.'\z/u', $value);
}

function tio2_chloride_process_text_list($value, int $count): bool
{
    return is_array($value) && array_is_list($value) && count($value) === $count &&
        count(array_filter($value, 'tio2_chloride_process_text')) === $count;
}

function tio2_chloride_process_action($value, string $href, string $target, ?array $context = null): bool
{
    $keys = ['label','href','targetPageId'];
    if ($context !== null) $keys[] = 'context';
    if (!tio2_chloride_process_keys($value, $keys) || !tio2_chloride_process_text($value['label']) ||
        $value['href'] !== $href || $value['targetPageId'] !== $target) return false;
    return $context === null || $value['context'] === $context;
}

/** @return array<string, array{gradeNameOrModelCode:string,position:int,cleanUrl:string,summary:string,actionLabel:string}> */
function tio2_chloride_process_expected_grades(): array
{
    return [
        'GRADE-M350'=>['gradeNameOrModelCode'=>'M-350','position'=>1,'cleanUrl'=>'/products/m-350/','summary'=>'Excellent hue and high gloss with strong hiding power.','actionLabel'=>'View M-350'],
        'GRADE-M510'=>['gradeNameOrModelCode'=>'M-510','position'=>2,'cleanUrl'=>'/products/m-510/','summary'=>'TMP/TME-free multi-application grade with high brightness and durability.','actionLabel'=>'View M-510'],
        'GRADE-M896'=>['gradeNameOrModelCode'=>'M-896','position'=>3,'cleanUrl'=>'/products/m-896/','summary'=>'Superior weather resistance with high gloss and excellent opacity for demanding exterior coatings.','actionLabel'=>'View M-896'],
        'GRADE-M895'=>['gradeNameOrModelCode'=>'M-895','position'=>4,'cleanUrl'=>'/products/m-895/','summary'=>'High-opacity, high-gloss coatings grade with good weather resistance.','actionLabel'=>'View M-895'],
        'GRADE-M200'=>['gradeNameOrModelCode'=>'M-200','position'=>5,'cleanUrl'=>'/products/m-200/','summary'=>'High-durability exterior plastics grade with strong anti-chalking performance.','actionLabel'=>'View M-200'],
        'GRADE-M210'=>['gradeNameOrModelCode'=>'M-210','position'=>6,'cleanUrl'=>'/products/m-210/','summary'=>'High hiding power and easy dispersion for polyolefin masterbatch.','actionLabel'=>'View M-210'],
        'GRADE-M340'=>['gradeNameOrModelCode'=>'M-340','position'=>7,'cleanUrl'=>'/products/m-340/','summary'=>'High whiteness with strong high-temperature anti-yellowing performance.','actionLabel'=>'View M-340'],
        'GRADE-M886'=>['gradeNameOrModelCode'=>'M-886','position'=>8,'cleanUrl'=>'/products/m-886/','summary'=>'Bright-white plastics grade with excellent dispersion and processability.','actionLabel'=>'View M-886'],
    ];
}

/** @return true|WP_Error */
function tio2_validate_chloride_process_payload($json)
{
    $invalid = new WP_Error('chloride_process_payload', 'Chloride Process content must retain the approved modules and eight explicit Grade tuples.');
    if (!is_string($json) || strlen($json) > 500000) return $invalid;
    $p = json_decode($json, true);
    if (!tio2_chloride_process_keys($p, ['identity','seo','breadcrumb','modules','grades'])) return $invalid;
    $identity = ['pageId'=>'PRODUCT-PROC-CL','siteScope'=>'tio2-my','locale'=>'en','path'=>'/products/chloride-process-titanium-dioxide/','schemaVersion'=>'product-process-chloride-v0.1'];
    if (!tio2_chloride_process_keys($p['identity'], array_keys($identity)) || $p['identity'] !== $identity) return $invalid;
    if (!tio2_chloride_process_keys($p['seo'], ['title','description','canonical','socialImage']) ||
        !tio2_chloride_process_text($p['seo']['title']) || !tio2_chloride_process_text($p['seo']['description']) ||
        'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/' !== $p['seo']['canonical'] ||
        null !== $p['seo']['socialImage']) return $invalid;
    $breadcrumb = [['/','HOME-001'],['/products/','PRODUCT-000'],['/products/chloride-process-titanium-dioxide/','PRODUCT-PROC-CL']];
    if (!is_array($p['breadcrumb']) || count($p['breadcrumb']) !== 3) return $invalid;
    foreach ($breadcrumb as $i=>$expected) if (!tio2_chloride_process_action($p['breadcrumb'][$i],$expected[0],$expected[1])) return $invalid;
    if (!is_array($p['modules']) || !array_is_list($p['modules']) || count($p['modules']) !== 5) return $invalid;
    $module_counts = [[1,0,2],[2,0,1],[1,0,0],[0,3,2],[1,0,1]];
    foreach ($p['modules'] as $i=>$module) {
        $keys = ['id','heading','paragraphs','steps','actions'];
        if (0 === $i) $keys[] = 'eyebrow';
        if (!tio2_chloride_process_keys($module,$keys) || $module['id'] !== 'CL-0'.($i+1) ||
            !tio2_chloride_process_text($module['heading']) ||
            !tio2_chloride_process_text_list($module['paragraphs'],$module_counts[$i][0]) ||
            !is_array($module['steps']) || count($module['steps']) !== $module_counts[$i][1] ||
            !is_array($module['actions']) || count($module['actions']) !== $module_counts[$i][2]) return $invalid;
        if (0 === $i && !tio2_chloride_process_text($module['eyebrow'])) return $invalid;
        foreach ($module['steps'] as $step) if (!tio2_chloride_process_keys($step,['heading','paragraph']) || !tio2_chloride_process_text($step['heading']) || !tio2_chloride_process_text($step['paragraph'])) return $invalid;
    }
    $source = ['sourcePageId'=>'PRODUCT-PROC-CL'];
    $actions = [
        [$p['modules'][0]['actions'][0],'#explore-chloride-process-grades','PRODUCT-PROC-CL-GRADES',null],
        [$p['modules'][0]['actions'][1],'/request-a-quote/','CONV-RFQ',$source],
        [$p['modules'][1]['actions'][0],'/resources/chloride-vs-sulfate-titanium-dioxide/','RES-PROC',null],
        [$p['modules'][3]['actions'][0],'/applications/','APP-000',null],
        [$p['modules'][3]['actions'][1],'/request-documents/','CONV-DOC',$source],
        [$p['modules'][4]['actions'][0],'/request-a-quote/','CONV-RFQ',$source],
    ];
    foreach ($actions as $check) if (!tio2_chloride_process_action($check[0],$check[1],$check[2],$check[3])) return $invalid;
    if (!is_array($p['grades']) || !array_is_list($p['grades']) || count($p['grades']) !== 8) return $invalid;
    $seen = [];
    foreach ($p['grades'] as $grade) {
        if (!tio2_chloride_process_keys($grade,['registeredPageId','gradeNameOrModelCode','position','cleanUrl','summary','actionLabel'])) return $invalid;
        $id = $grade['registeredPageId'] ?? null;
        $expected = is_string($id) ? (tio2_chloride_process_expected_grades()[$id] ?? null) : null;
        if (null === $expected || isset($seen[$id])) return $invalid;
        $seen[$id] = true;
        $actual = $grade; unset($actual['registeredPageId']);
        if ($actual !== $expected) return $invalid;
    }
    return count($seen) === count(tio2_chloride_process_expected_grades()) ? true : $invalid;
}

/** @return true|WP_Error */
function tio2_validate_chloride_process_identity(int $post_id)
{
    if ('tio2_product_hub' !== get_post_type($post_id)) return new WP_Error('chloride_process_type','Invalid Chloride Process content type.');
    $scopes = wp_get_post_terms($post_id,'site_scope',['fields'=>'slugs']);
    if (is_wp_error($scopes) || ['tio2-my'] !== array_values($scopes)) return new WP_Error('chloride_process_scope','Chloride Process requires exactly tio2-my.');
    if ('tio2-my-product-process-chloride' !== get_post_field('post_name',$post_id) ||
        '/products/chloride-process-titanium-dioxide' !== get_post_meta($post_id,'public_path',true)) return new WP_Error('chloride_process_identity','Invalid Chloride Process route identity.');
    return true;
}

function tio2_validate_product_process_chloride_v01_contract(int $post_id)
{
    $identity = tio2_validate_chloride_process_identity($post_id);
    return is_wp_error($identity) ? $identity : tio2_validate_chloride_process_payload(get_post_meta($post_id,TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META,true));
}

function tio2_chloride_process_candidate_ids(): array
{
    $query = ['post_type'=>array_values(get_post_types()),'post_status'=>array_values(array_diff(get_post_stati(),['auto-draft'])),'fields'=>'ids','numberposts'=>-1,'suppress_filters'=>true];
    $ids = get_posts(array_merge($query,['name'=>'tio2-my-product-process-chloride']));
    foreach (['/products/chloride-process-titanium-dioxide','/products/chloride-process-titanium-dioxide/'] as $path) $ids = array_merge($ids,get_posts(array_merge($query,['meta_key'=>'public_path','meta_value'=>$path])));
    return array_values(array_unique(array_map('intval',$ids)));
}

function tio2_resolve_malaysia_chloride_process_record_json(): string
{
    $ids = tio2_chloride_process_candidate_ids();
    if (count($ids) !== 1 || 'publish' !== get_post_status($ids[0]) || is_wp_error(tio2_validate_product_process_chloride_v01_contract($ids[0]))) {
        throw new \GraphQL\Error\UserError('The Malaysia Chloride Process record is missing, ambiguous, unpublished or invalid.');
    }
    $id = $ids[0];
    return wp_json_encode(['id'=>'product-proc-cl-'.$id,'modifiedGmt'=>str_replace(' ','T',(string)get_post_field('post_modified_gmt',$id)),
        'status'=>'publish','siteScopes'=>['nodes'=>[['slug'=>'tio2-my']]],'publishingFields'=>['publicPath'=>'/products/chloride-process-titanium-dioxide'],
        'malaysiaChlorideProcessContractJson'=>get_post_meta($id,TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META,true)]);
}

function tio2_register_product_process_chloride_v01_graphql_field(): void
{
    register_graphql_field('RootQuery','malaysiaChlorideProcessRecordJson',['type'=>['non_null'=>'String'],'resolve'=>'tio2_resolve_malaysia_chloride_process_record_json','description'=>'Validated scoped Chloride Process aggregation content for TiO2 Malaysia.']);
}
add_action('graphql_register_types','tio2_register_product_process_chloride_v01_graphql_field');

function tio2_register_product_process_chloride_v01_meta(): void
{
    register_post_meta('tio2_product_hub',TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META,['type'=>'string','single'=>true,'show_in_rest'=>false,
        'auth_callback'=>static function($allowed,$key,$post_id):bool{return current_user_can('edit_post',$post_id)&&true===tio2_validate_chloride_process_identity((int)$post_id);}]);
}
add_action('init','tio2_register_product_process_chloride_v01_meta');

function tio2_save_product_process_chloride_v01_meta(int $post_id): void
{
    if (wp_is_post_revision($post_id)||wp_is_post_autosave($post_id)||!current_user_can('edit_post',$post_id)||
        !isset($_POST['tio2_chloride_process_nonce'],$_POST['tio2_chloride_process_json'])||
        !is_string($_POST['tio2_chloride_process_nonce'])||!is_string($_POST['tio2_chloride_process_json'])||
        !wp_verify_nonce(wp_unslash($_POST['tio2_chloride_process_nonce']),'tio2_chloride_process_save_'.$post_id)||
        true!==tio2_validate_chloride_process_identity($post_id)) return;
    $json=wp_unslash($_POST['tio2_chloride_process_json']);
    if (true===tio2_validate_chloride_process_payload($json)) update_post_meta($post_id,TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META,wp_slash($json));
}
add_action('save_post_tio2_product_hub','tio2_save_product_process_chloride_v01_meta',40);

function tio2_add_product_process_chloride_v01_meta_box($post): void
{
    if (true!==tio2_validate_chloride_process_identity((int)$post->ID)||!current_user_can('edit_post',$post->ID)) return;
    add_meta_box('tio2-chloride-process','Chloride Process content','tio2_render_product_process_chloride_v01_meta_box','tio2_product_hub','normal','high');
}
add_action('add_meta_boxes_tio2_product_hub','tio2_add_product_process_chloride_v01_meta_box');

function tio2_render_product_process_chloride_v01_meta_box($post): void
{
    wp_nonce_field('tio2_chloride_process_save_'.$post->ID,'tio2_chloride_process_nonce');
    echo '<textarea name="tio2_chloride_process_json" rows="42" class="large-text code" aria-label="Chloride Process content JSON">'.esc_textarea((string)get_post_meta($post->ID,TIO2_MY_CHLORIDE_PROCESS_CONTRACT_META,true)).'</textarea>';
}
