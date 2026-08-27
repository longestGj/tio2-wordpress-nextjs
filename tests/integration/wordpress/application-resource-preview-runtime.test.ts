import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {beforeAll, describe, expect, it} from 'vitest'

import {SITE_A_APPLICATION_IDENTITIES} from '../../../lib/applications/content-manifest'
import {SITE_A_RESOURCE_IDENTITIES} from '../../../lib/resources/content-manifest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_APPLICATION_RESOURCE_PREVIEW_RUNTIME === '1'
const marker = 'application-resource-preview-runtime'

function wpEval(script: string) {
  return spawnSync('docker', [
    'compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
    'run', '--rm', '--no-TTY', '--user', '33:33', 'wpcli', 'wp', 'eval', script,
  ], {cwd: repositoryRoot, encoding: 'utf8', timeout: 180_000})
}

function requireSuccess(result: ReturnType<typeof wpEval>) {
  expect(result.error).toBeUndefined()
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  return result.stdout.trim()
}

interface Snapshot {
  finder: {application: number; resource: number; wrongSite: boolean; wrongPath: boolean}
  application: Record<string, unknown>
  resource: Record<string, unknown>
  relationship: {targetType: string; targetKey: string; title: string; path: string; href: null}
  graphql: {application: boolean; resource: boolean; crossSiteNull: boolean; incompleteNull: boolean}
  identities: {applications: Record<string, unknown>; resources: Record<string, unknown>}
  errors: {incompleteStatus: number; unsafeStatus: number; nonDraftStatus: number; crossSiteStatus: number}
  rest: {applicationStatus: number; resourceStatus: number; missingStatus: number}
}

function collectKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(collectKeys)
  return Object.entries(value).flatMap(([key, item]) => [key, ...collectKeys(item)])
}

const fixtureScript = String.raw`
$required=['tio2_find_application_for_preview','tio2_find_resource_for_preview','tio2_serialize_application_preview','tio2_serialize_resource_preview'];
foreach($required as $function){if(!function_exists($function)){WP_CLI::error('Missing runtime function: '.$function);}}
if(!function_exists('update_field')){WP_CLI::error('Advanced Custom Fields is required.');}
global $wpdb;
$marker='${marker}';
$lock=(string)$wpdb->get_var("SELECT GET_LOCK('tio2-application-resource-runtime',30)");if('1'!==$lock){WP_CLI::error('Could not lock Application/Resource runtime fixtures.');}
register_shutdown_function(static function()use($marker):void{global $wpdb;$ids=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($ids as$id){wp_delete_post((int)$id,true);}$restore=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'trash','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_restore_status']);foreach($restore as$id){$status=(string)get_post_meta((int)$id,'_tio2_runtime_restore_status',true);delete_post_meta((int)$id,'_tio2_runtime_restore_status');wp_update_post(['ID'=>(int)$id,'post_status'=>$status]);}$wpdb->get_var("SELECT RELEASE_LOCK('tio2-application-resource-runtime')");});
$old=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);foreach($old as $id){wp_delete_post((int)$id,true);}
$reserve=static function(string $type,string $slug)use($marker):void{$ids=get_posts(['post_type'=>$type,'post_status'=>'any','name'=>$slug,'posts_per_page'=>-1,'fields'=>'ids']);foreach($ids as$id){update_post_meta((int)$id,'_tio2_runtime_restore_status',(string)get_post_status($id));wp_update_post(['ID'=>(int)$id,'post_status'=>'trash']);}};$reserve('tio2_application','applications');$reserve('tio2_document','resources');
$create=static function(string $type,string $slug,string $title,array $scopes)use($marker):int{$id=wp_insert_post(['post_type'=>$type,'post_status'=>'draft','post_name'=>$slug,'post_title'=>$title],true);if(is_wp_error($id)){WP_CLI::error($id->get_error_message());}update_post_meta((int)$id,'_tio2_runtime_fixture',$marker);wp_set_object_terms((int)$id,$scopes,'site_scope',false);return (int)$id;};
$write=static function(int $id,array $values):void{foreach($values as $name=>$value){update_field($name,$value,$id);}};
$applicationValues=['application_id'=>'applications-hub','application_level'=>'hub','family'=>'All','parent_application'=>[],'meta_title'=>'Synthetic applications','meta_description'=>'Synthetic application guidance for controlled runtime verification.','eyebrow'=>'Synthetic guidance','headline'=>'Compare fictional application conditions.','direct_answer'=>'<p>Use representative fictional trials.</p>','application_context'=>'Synthetic context.','buyer_problem'=>'Synthetic buyer problem.','selection_factors'=>[['item'=>'End use'],['item'=>'Process'],['item'=>'Evidence']],'powder_data_limits'=>'Powder data requires application testing.','validation_plan'=>[['item'=>'Define a control']],'customer_inputs'=>[['item'=>'Formulation context']],'body_sections'=>[['section_id'=>'overview','heading'=>'Overview','html'=>'<p>Synthetic overview.</p>'],['section_id'=>'next','heading'=>'Next','html'=>'<p>Synthetic next step.</p>']],'faq_items'=>array_map(static fn(int $n):array=>['question'=>'Synthetic application question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),'child_applications'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],'ctas'=>[['kind'=>'discuss-application','label'=>'Discuss synthetic context','href'=>'/contact']],'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>'];
$resourceValues=['resource_id'=>'resources-hub','resource_kind'=>'hub','cluster'=>'Hub','meta_title'=>'Synthetic technical resources','meta_description'=>'Synthetic technical guidance for controlled runtime verification.','eyebrow'=>'Synthetic resource guidance','headline'=>'Compare fictional observations carefully.','direct_answer'=>'<p>Use consistent fictional methods.</p>','key_takeaways'=>[['item'=>'Use representative conditions.'],['item'=>'Use a control.'],['item'=>'Record observations.']],'sections'=>[['section_id'=>'method','heading'=>'Method','html'=>'<p>Synthetic method.</p>'],['section_id'=>'review','heading'=>'Review','html'=>'<p>Synthetic review.</p>']],'comparison_table'=>['columns'=>[['label'=>'Option'],['label'=>'Observation']],'rows'=>[['cells'=>[['value'=>'Synthetic A'],['value'=>'Synthetic B']]]]],'practical_implications'=>[['item'=>'Choose a comparable process.']],'common_mistakes'=>[['item'=>'Avoid an unrepresentative trial.']],'evaluation_method'=>[['item'=>'Define test conditions.']],'faq_items'=>array_map(static fn(int $n):array=>['question'=>'Synthetic resource question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),'child_resources'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],'ctas'=>[['kind'=>'request-tds','label'=>'Request synthetic data','href'=>'/contact']],'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>'];
$application=$create('tio2_application','applications','Synthetic Applications Hub',['tio2-a']);$resource=$create('tio2_document','resources','Synthetic Resources Hub',['tio2-a']);$write($application,$applicationValues);$write($resource,$resourceValues);$write($application,array_replace($applicationValues,['related_resources'=>[$resource]]));
$incomplete=$create('tio2_application','coatings','Incomplete Application',['tio2-a']);
$unsafe=$create('tio2_document','rutile-vs-anatase-titanium-dioxide','Unsafe Resource',['tio2-a']);$write($unsafe,array_replace($resourceValues,['resource_id'=>'article-01','resource_kind'=>'article','cluster'=>'TiO₂ Fundamentals','direct_answer'=>'<p>Read C:\\private\\source.pdf.</p>']));
$crossSite=$create('tio2_application','applications','Site B Application',['tio2-b']);$write($crossSite,$applicationValues);
$applicationPost=get_post($application);$resourcePost=get_post($resource);$appPayload=tio2_serialize_application_preview($applicationPost);$resourcePayload=tio2_serialize_resource_preview($resourcePost);
$nonDraft=clone $applicationPost;$nonDraft->post_status='publish';
$incompleteError=tio2_serialize_application_preview(get_post($incomplete));$unsafeError=tio2_serialize_resource_preview(get_post($unsafe));$nonDraftError=tio2_serialize_application_preview($nonDraft);$crossSiteError=tio2_serialize_application_preview(get_post($crossSite));
$request=static function(string $path):WP_REST_Request{$request=new WP_REST_Request('GET','/tio2/v1/preview');$request->set_param('siteId','tio2-a');$request->set_param('path',$path);return $request;};
$appRest=tio2_preview_rest_response($request('/applications'));$resourceRest=tio2_preview_rest_response($request('/resources'));$missingRest=tio2_preview_rest_response($request('/applications/not-approved'));
$users=get_users(['number'=>1,'fields'=>'ids']);if([]===$users){WP_CLI::error('Runtime test requires an authenticated WordPress user.');}wp_set_current_user((int)$users[0]);
echo 'TIO2_APPLICATION_RESOURCE_PREVIEW '.wp_json_encode(['finder'=>['application'=>(int)(tio2_find_application_for_preview('tio2-a','/applications')->ID??0),'resource'=>(int)(tio2_find_resource_for_preview('tio2-a','/resources')->ID??0),'wrongSite'=>null===tio2_find_application_for_preview('tio2-b','/applications'),'wrongPath'=>null===tio2_find_resource_for_preview('tio2-a','/resources/not-approved')],'application'=>$appPayload,'resource'=>$resourcePayload,'relationship'=>$appPayload['applicationFields']['relatedResources'][0]??null,'graphql'=>['application'=>is_array(tio2_resolve_site_a_application_fields(new WPGraphQL\Model\Post($applicationPost))),'resource'=>is_array(tio2_resolve_site_a_resource_fields(new WPGraphQL\Model\Post($resourcePost))),'crossSiteNull'=>null===tio2_resolve_site_a_application_fields(new WPGraphQL\Model\Post(get_post($crossSite))),'incompleteNull'=>null===tio2_resolve_site_a_application_fields(new WPGraphQL\Model\Post(get_post($incomplete)))],'identities'=>['applications'=>tio2_site_a_application_identities(),'resources'=>tio2_site_a_resource_identities()],'errors'=>['incompleteStatus'=>(int)$incompleteError->get_error_data()['status'],'unsafeStatus'=>(int)$unsafeError->get_error_data()['status'],'nonDraftStatus'=>(int)$nonDraftError->get_error_data()['status'],'crossSiteStatus'=>(int)$crossSiteError->get_error_data()['status']],'rest'=>['applicationStatus'=>$appRest instanceof WP_REST_Response?$appRest->get_status():0,'resourceStatus'=>$resourceRest instanceof WP_REST_Response?$resourceRest->get_status():0,'missingStatus'=>$missingRest instanceof WP_Error?(int)$missingRest->get_error_data()['status']:0]]);
`

let snapshot: Snapshot

describe.runIf(runLiveWordPress)('live protected Site A Application/Resource preview', () => {
  beforeAll(() => {
    const output = requireSuccess(wpEval(fixtureScript))
    const match = output.match(/TIO2_APPLICATION_RESOURCE_PREVIEW (\{.*\})/u)
    expect(match, output).not.toBeNull()
    snapshot = JSON.parse(match![1]) as Snapshot
  }, 180_000)

  it('finds exactly one approved Site A draft by stable identity and denies other sites or paths', () => {
    expect(snapshot.finder.application).toBeGreaterThan(0)
    expect(snapshot.finder.resource).toBeGreaterThan(0)
    expect(snapshot.finder).toMatchObject({wrongSite: true, wrongPath: true})
  })

  it('keeps the WordPress canonical identity inventories identical to the Task 2 maps', () => {
    const applications = Object.fromEntries(SITE_A_APPLICATION_IDENTITIES.map(
      ([id, slug, path, level, family, parentId]) => [id, {slug, path, level, family, parentId}],
    ))
    const resources = Object.fromEntries(SITE_A_RESOURCE_IDENTITIES.map(
      ([id, slug, path, kind, cluster]) => [id, {slug, path, kind, cluster}],
    ))
    expect(snapshot.identities).toEqual({applications, resources})
  })

  it('serializes complete drafts with identical safe top-level and typed field boundaries', () => {
    expect(snapshot.application).toMatchObject({siteId: 'tio2-a', path: '/applications', slug: 'applications', status: 'draft'})
    expect(snapshot.resource).toMatchObject({siteId: 'tio2-a', path: '/resources', slug: 'resources', status: 'draft'})
    expect(snapshot.application).toHaveProperty('applicationFields.applicationId', 'applications-hub')
    expect(snapshot.resource).toHaveProperty('resourceFields.resourceId', 'resources-hub')
    const keys = collectKeys([snapshot.application, snapshot.resource])
    expect(keys).not.toEqual(expect.arrayContaining(['acf', 'rawAcf', 'source', 'sourcePath', 'evidence', 'evidenceUrl', 'tdsUrl', 'attachmentId', 'manufacturer', 'legalEntity']))
  })

  it('uses stable relationship keys and canonical identity-map paths while keeping unapproved href null', () => {
    expect(snapshot.relationship).toEqual({targetType: 'resource', targetKey: 'resources-hub', title: 'Synthetic Resources Hub', path: '/resources', href: null})
  })

  it('returns typed fields only for complete exact-Site-A WPGraphQL post models', () => {
    expect(snapshot.graphql).toEqual({application: true, resource: true, crossSiteNull: true, incompleteNull: true})
  })

  it('returns 422 for incomplete or unsafe records and 404 for non-draft or cross-site records', () => {
    expect(snapshot.errors).toEqual({incompleteStatus: 422, unsafeStatus: 422, nonDraftStatus: 404, crossSiteStatus: 404})
  })

  it('extends only the signed preview response boundary for approved Application and Resource paths', () => {
    expect(snapshot.rest).toEqual({applicationStatus: 200, resourceStatus: 200, missingStatus: 404})
  })
})
