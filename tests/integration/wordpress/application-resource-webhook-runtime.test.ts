import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {beforeAll, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_APPLICATION_RESOURCE_WEBHOOK_RUNTIME === '1'
const marker = 'application-resource-webhook-runtime'

function wpEval(script: string) {
  return spawnSync('docker', ['compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml', 'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli', 'wp', 'eval', script], {cwd: repositoryRoot, encoding: 'utf8', timeout: 180_000})
}

function requireSuccess(result: ReturnType<typeof wpEval>) {
  expect(result.error).toBeUndefined()
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  return result.stdout.trim()
}

interface State {siteIds: string[]; paths: string[]; entityIds: number[]; sitePaths: Record<string, string[]>}
interface Snapshot {
  application: State
  resource: State
  ids: Record<string, number>
  denied: {siteB: boolean; mixed: boolean; incomplete: boolean; unsafeRelation: boolean}
  meta: {application: boolean; applicationReference: boolean; resourceNested: boolean; resourceReference: boolean; globalApplicationReference: boolean; globalResourceNested: boolean; doubleUnderscore: boolean}
}

const fixtureScript = String.raw`
if(!function_exists('tio2_get_webhook_affected_state')){WP_CLI::error('Missing webhook runtime.');}if(!function_exists('update_field')){WP_CLI::error('Advanced Custom Fields is required.');}
global $wpdb;
$marker='${marker}';$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-application-resource-runtime',30)");if('1'!==$lock){WP_CLI::error('Could not lock Application/Resource runtime fixtures.');}register_shutdown_function(static function()use($marker):void{global $wpdb;$ids=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($ids as$id){wp_delete_post((int)$id,true);}$wpdb->get_var("SELECT RELEASE_LOCK('tio2-application-resource-runtime')");});$old=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($old as $id){wp_delete_post((int)$id,true);}
$create=static function(string $type,string $slug,string $title,array $scopes)use($marker):int{$id=wp_insert_post(['post_type'=>$type,'post_status'=>'draft','post_name'=>$slug,'post_title'=>$title],true);if(is_wp_error($id)){WP_CLI::error($id->get_error_message());}update_post_meta((int)$id,'_tio2_runtime_fixture',$marker);wp_set_object_terms((int)$id,$scopes,'site_scope',false);return(int)$id;};$write=static function(int$id,array$values):void{foreach($values as$name=>$value){update_field($name,$value,$id);}};
$app=['application_id'=>'applications-hub','application_level'=>'hub','family'=>'All','parent_application'=>[],'meta_title'=>'Synthetic applications','meta_description'=>'Synthetic application guidance for controlled runtime verification.','eyebrow'=>'Synthetic guidance','headline'=>'Compare fictional application conditions.','direct_answer'=>'<p>Use representative fictional trials.</p>','application_context'=>'Synthetic context.','buyer_problem'=>'Synthetic buyer problem.','selection_factors'=>[['item'=>'End use'],['item'=>'Process'],['item'=>'Evidence']],'powder_data_limits'=>'Powder data requires application testing.','validation_plan'=>[['item'=>'Define a control']],'customer_inputs'=>[['item'=>'Formulation context']],'body_sections'=>[['section_id'=>'overview','heading'=>'Overview','html'=>'<p>Synthetic overview.</p>'],['section_id'=>'next','heading'=>'Next','html'=>'<p>Synthetic next step.</p>']],'faq_items'=>array_map(static fn(int$n):array=>['question'=>'Synthetic question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),'child_applications'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],'ctas'=>[['kind'=>'discuss-application','label'=>'Discuss synthetic context','href'=>'/contact']],'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>'];
$res=['resource_id'=>'resources-hub','resource_kind'=>'hub','cluster'=>'Hub','meta_title'=>'Synthetic resources','meta_description'=>'Synthetic technical guidance for controlled runtime verification.','eyebrow'=>'Synthetic resource guidance','headline'=>'Compare fictional observations carefully.','direct_answer'=>'<p>Use consistent fictional methods.</p>','key_takeaways'=>[['item'=>'Use representative conditions.'],['item'=>'Use a control.'],['item'=>'Record observations.']],'sections'=>[['section_id'=>'method','heading'=>'Method','html'=>'<p>Synthetic method.</p>'],['section_id'=>'review','heading'=>'Review','html'=>'<p>Synthetic review.</p>']],'comparison_table'=>[],'practical_implications'=>[['item'=>'Choose a comparable process.']],'common_mistakes'=>[['item'=>'Avoid an unrepresentative trial.']],'evaluation_method'=>[['item'=>'Define test conditions.']],'faq_items'=>array_map(static fn(int$n):array=>['question'=>'Synthetic resource question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),'child_resources'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],'ctas'=>[['kind'=>'request-tds','label'=>'Request synthetic data','href'=>'/contact']],'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>'];
$hub=$create('tio2_application','applications','Applications Hub',['tio2-a']);$category=$create('tio2_application','coatings','Coatings Category',['tio2-a']);$detail=$create('tio2_application','titanium-dioxide-for-water-based-paint','Water Paint Detail',['tio2-a']);$resourceHub=$create('tio2_document','resources','Resources Hub',['tio2-a']);$article=$create('tio2_document','rutile-vs-anatase-titanium-dioxide','Rutile Article',['tio2-a']);
$write($hub,$app);$write($category,array_replace($app,['application_id'=>'coatings','application_level'=>'category','family'=>'Coatings','parent_application'=>[$hub]]));$write($detail,array_replace($app,['application_id'=>'water-based-paint','application_level'=>'detail','family'=>'Coatings','parent_application'=>[$category]]));$write($resourceHub,$res);$write($article,array_replace($res,['resource_id'=>'article-01','resource_kind'=>'article','cluster'=>'TiO₂ Fundamentals']));
$write($category,array_replace($app,['application_id'=>'coatings','application_level'=>'category','family'=>'Coatings','parent_application'=>[$hub],'child_applications'=>[$detail],'related_applications'=>[$hub],'related_resources'=>[$article]]));
$write($resourceHub,array_replace($res,['child_resources'=>[$article],'related_applications'=>[$category],'related_resources'=>[$article]]));
$siteB=$create('tio2_application','applications','Site B Application',['tio2-b']);$write($siteB,$app);$mixed=$create('tio2_document','resources','Mixed Resource',['tio2-a','tio2-b']);$write($mixed,$res);$incomplete=$create('tio2_document','chloride-vs-sulfate-titanium-dioxide','Incomplete Resource',['tio2-a']);$unsafe=$create('tio2_application','plastics','Unsafe Relation',['tio2-a']);$write($unsafe,array_replace($app,['application_id'=>'plastics','application_level'=>'category','family'=>'Plastics','parent_application'=>[$hub],'related_resources'=>[$incomplete]]));
$applicationState=tio2_get_webhook_affected_state($category);$resourceState=tio2_get_webhook_affected_state($resourceHub);
echo 'TIO2_APPLICATION_RESOURCE_WEBHOOK '.wp_json_encode(['application'=>$applicationState,'resource'=>$resourceState,'ids'=>['hub'=>$hub,'category'=>$category,'detail'=>$detail,'resourceHub'=>$resourceHub,'article'=>$article],'denied'=>['siteB'=>null===tio2_get_webhook_affected_state($siteB),'mixed'=>null===tio2_get_webhook_affected_state($mixed),'incomplete'=>null===tio2_get_webhook_affected_state($incomplete),'unsafeRelation'=>null===tio2_get_webhook_affected_state($unsafe)],'meta'=>['application'=>tio2_is_relevant_webhook_meta_key('application_id',$category),'applicationReference'=>tio2_is_relevant_webhook_meta_key('_application_id',$category),'resourceNested'=>tio2_is_relevant_webhook_meta_key('sections_0_heading',$resourceHub),'resourceReference'=>tio2_is_relevant_webhook_meta_key('_sections_0_heading',$resourceHub),'globalApplicationReference'=>tio2_is_relevant_webhook_meta_key('_application_id'),'globalResourceNested'=>tio2_is_relevant_webhook_meta_key('sections_0_heading'),'doubleUnderscore'=>tio2_is_relevant_webhook_meta_key('__sections_0_heading',$resourceHub)]]);
`

let snapshot: Snapshot

describe.runIf(runLiveWordPress)('live Site A Application/Resource webhook invalidation', () => {
  beforeAll(() => {
    const output = requireSuccess(wpEval(fixtureScript))
    const match = output.match(/TIO2_APPLICATION_RESOURCE_WEBHOOK (\{.*\})/u)
    expect(match, output).not.toBeNull()
    snapshot = JSON.parse(match![1]) as Snapshot
  }, 180_000)

  it('invalidates an Application, its parent, declared children, and related entities with deterministic de-duplication', () => {
    expect(snapshot.application.siteIds).toEqual(['tio2-a'])
    expect(snapshot.application.paths).toEqual(['/applications', '/applications/coatings', '/applications/titanium-dioxide-for-water-based-paint', '/resources/rutile-vs-anatase-titanium-dioxide'])
    expect(snapshot.application.entityIds).toEqual([snapshot.ids.hub, snapshot.ids.category, snapshot.ids.detail, snapshot.ids.article].sort((a, b) => a - b))
    expect(snapshot.application.sitePaths['tio2-a']).toEqual(snapshot.application.paths)
  })

  it('invalidates a Resource, its declared children, and related entities through canonical paths', () => {
    expect(snapshot.resource.siteIds).toEqual(['tio2-a'])
    expect(snapshot.resource.paths).toEqual(['/applications/coatings', '/resources', '/resources/rutile-vs-anatase-titanium-dioxide'])
    expect(snapshot.resource.entityIds).toEqual([snapshot.ids.category, snapshot.ids.resourceHub, snapshot.ids.article].sort((a, b) => a - b))
  })

  it('emits no editorial state for Site B, mixed scope, incomplete records, or unsafe relations', () => {
    expect(snapshot.denied).toEqual({siteB: true, mixed: true, incomplete: true, unsafeRelation: true})
  })

  it('recognizes all ACF values and one-underscore reference keys without widening double-underscore metadata', () => {
    expect(snapshot.meta).toEqual({application: true, applicationReference: true, resourceNested: true, resourceReference: true, globalApplicationReference: true, globalResourceNested: true, doubleUnderscore: false})
  })
})
