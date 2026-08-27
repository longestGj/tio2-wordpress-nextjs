import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, beforeAll, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const runLiveWordPress = process.env.WORDPRESS_APPLICATION_RESOURCE_RUNTIME === '1'
const fixtureMarker = 'application-resource-publication-runtime'

function wp(arguments_: string[]) {
  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      'wordpress/.env',
      '-f',
      'wordpress/docker-compose.yml',
      'run',
      '--rm',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      ...arguments_,
    ],
    {cwd: repositoryRoot, encoding: 'utf8', timeout: 180_000},
  )
}

function requireWpSuccess(result: ReturnType<typeof wp>): string {
  expect(result.error).toBeUndefined()
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  return result.stdout.trim()
}

interface RuntimeSnapshot {
  validation: {application: string[]; resource: string[]}
  hierarchy: {
    category: string[]
    detail: string[]
    universal: string[]
    invalidHubDirect: string[]
    wrongPostType: string[]
    siteBTarget: string[]
    mixedTarget: string[]
    malformedParent: string[]
    tooManyParents: string[]
  }
  statuses: {
    application: string
    resource: string
    siteBApplication: string
    siteBResource: string
    incomplete: string
    mixed: string
    reassignedBefore: string
    reassignedAfter: string
  }
  notices: {incomplete: {message?: string} | null; siteB: unknown; mixed: {message?: string} | null}
  fieldGroups: {application: string[]; resource: string[]; siteBApplication: string[]; siteBResource: string[]}
  visibility: {anonymousApplication: boolean; anonymousResource: boolean; anonymousSiteB: boolean; anonymousMixed: boolean; authenticatedApplication: boolean}
  graphql: {applications: number[]; resources: number[]}
  ids: {application: number; resource: number; siteBApplication: number; siteBResource: number}
}

const setupScript = String.raw`
$required=['tio2_validate_application_record','tio2_validate_resource_record','tio2_application_resource_publication_allowed','tio2_save_application_resource_contract_feedback'];
foreach($required as $function){if(!function_exists($function)){WP_CLI::error('Missing runtime contract function: '.$function);}}
if(!function_exists('update_field')){WP_CLI::error('Advanced Custom Fields is required.');}
$marker='${fixtureMarker}';
$old=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>$marker]);
foreach($old as $old_id){wp_delete_post((int)$old_id,true);}
$create=static function(string $type,string $slug,string $title,string $scope)use($marker):int{
  $id=wp_insert_post(['post_type'=>$type,'post_status'=>'draft','post_name'=>$slug,'post_title'=>$title],true);
  if(is_wp_error($id)){WP_CLI::error($id->get_error_message());}
  update_post_meta((int)$id,'_tio2_runtime_fixture',$marker);
  $terms=wp_set_object_terms((int)$id,[$scope],'site_scope',false);
  if(is_wp_error($terms)){WP_CLI::error($terms->get_error_message());}
  return (int)$id;
};
$write=static function(int $id,array $values):void{foreach($values as $name=>$value){if(false===update_field($name,$value,$id)){WP_CLI::error('Failed to update field '.$name);}}};
$application_values=[
  'application_id'=>'applications-hub','application_level'=>'hub','family'=>'Synthetic','parent_application'=>[],
  'meta_title'=>'Synthetic applications','meta_description'=>'Synthetic application guidance for controlled local runtime verification.','eyebrow'=>'Synthetic application guidance','headline'=>'Compare fictional application conditions systematically.','direct_answer'=>'<p>Use representative fictional trials.</p>',
  'application_context'=>'Synthetic context.','buyer_problem'=>'Synthetic buyer problem.','selection_factors'=>[['item'=>'End use'],['item'=>'Process'],['item'=>'Evidence']],
  'powder_data_limits'=>'Synthetic powder data requires application testing.','validation_plan'=>[['item'=>'Define a control']],
  'customer_inputs'=>[['item'=>'Formulation context']],
  'body_sections'=>[['section_id'=>'overview','heading'=>'Overview','html'=>'<p>Synthetic overview.</p>'],['section_id'=>'next','heading'=>'Next','html'=>'<p>Synthetic next step.</p>']],
  'faq_items'=>array_map(static fn(int $n):array=>['question'=>'Synthetic application question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),
  'child_applications'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],
  'ctas'=>[['kind'=>'discuss-application','label'=>'Discuss synthetic context','href'=>'/contact']],
  'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>',
];
$resource_values=[
  'resource_id'=>'resources-hub','resource_kind'=>'hub','cluster'=>'Synthetic','meta_title'=>'Synthetic technical resources',
  'meta_description'=>'Synthetic technical resource guidance for controlled local runtime verification.','eyebrow'=>'Synthetic technical guidance','headline'=>'Compare fictional observations carefully.','direct_answer'=>'<p>Use consistent fictional methods.</p>',
  'key_takeaways'=>[['item'=>'Use representative conditions.']],
  'sections'=>[['section_id'=>'method','heading'=>'Method','html'=>'<p>Synthetic method.</p>'],['section_id'=>'review','heading'=>'Review','html'=>'<p>Synthetic review.</p>']],
  'comparison_table'=>['columns'=>[['label'=>'Option']], 'rows'=>[['cells'=>[['value'=>'Synthetic A']]]]],
  'practical_implications'=>[['item'=>'Choose a comparable process.']],'common_mistakes'=>[['item'=>'Avoid an unrepresentative trial.']],
  'evaluation_method'=>[['item'=>'Define test conditions.']],
  'faq_items'=>array_map(static fn(int $n):array=>['question'=>'Synthetic resource question '.$n.'?','answer'=>'<p>Synthetic answer.</p>'],range(1,4)),
  'child_resources'=>[],'related_applications'=>[],'related_resources'=>[],'related_products'=>[],
  'ctas'=>[['kind'=>'request-tds','label'=>'Request synthetic data','href'=>'/contact']],
  'technical_disclaimer'=>'<p>Synthetic technical data is available by request.</p>',
];
$application=$create('tio2_application','applications','Runtime Site A Application','tio2-a');
$resource=$create('tio2_document','resources','Runtime Site A Resource','tio2-a');
$site_b_application=$create('tio2_application','runtime-site-b-application','Runtime Site B Application','tio2-b');
$site_b_resource=$create('tio2_document','runtime-site-b-resource','Runtime Site B Resource','tio2-b');
$incomplete=$create('tio2_application','runtime-incomplete-application','Runtime Incomplete Application','tio2-a');
$site_b_incomplete=$create('tio2_application','runtime-site-b-incomplete','Runtime Site B Incomplete','tio2-b');
$mixed=$create('tio2_application','runtime-mixed-application','Runtime Mixed Application','tio2-a');
wp_set_object_terms($mixed,['tio2-a','tio2-b'],'site_scope',false);
$write($application,$application_values);$write($resource,$resource_values);$write($site_b_application,$application_values);$write($site_b_resource,$resource_values);
$write($mixed,$application_values);
$category=$create('tio2_application','coatings','Runtime Valid Category','tio2-a');
$write($category,array_replace($application_values,['application_id'=>'coatings','application_level'=>'category','parent_application'=>[$application]]));
$detail=$create('tio2_application','water-based-paint','Runtime Valid Detail','tio2-a');
$write($detail,array_replace($application_values,['application_id'=>'water-based-paint','application_level'=>'detail','parent_application'=>[$category]]));
$universal=$create('tio2_application','multi-purpose-titanium-dioxide','Runtime Universal Detail','tio2-a');
$write($universal,array_replace($application_values,['application_id'=>'universal-multi-application','application_level'=>'detail','parent_application'=>[$application]]));
$invalid_hub_direct=$create('tio2_application','invalid-hub-direct','Runtime Invalid Hub Direct Detail','tio2-a');
$write($invalid_hub_direct,array_replace($application_values,['application_id'=>'invalid-hub-direct','application_level'=>'detail','parent_application'=>[$application]]));
$wrong_post_type=$create('tio2_application','wrong-post-type-relationship','Runtime Wrong Post Type Relationship','tio2-a');
$write($wrong_post_type,array_replace($application_values,['application_id'=>'wrong-post-type-relationship','application_level'=>'detail','parent_application'=>[$category],'related_resources'=>[$application]]));
$site_b_target=$create('tio2_application','site-b-relationship-target','Runtime Site B Relationship Target','tio2-a');
$write($site_b_target,array_replace($application_values,['application_id'=>'site-b-relationship-target','application_level'=>'detail','parent_application'=>[$category],'related_resources'=>[$site_b_resource]]));
$mixed_resource_target=$create('tio2_document','mixed-resource-target','Runtime Mixed Resource Target','tio2-a');
wp_set_object_terms($mixed_resource_target,['tio2-a','tio2-b'],'site_scope',false);
$mixed_target=$create('tio2_application','mixed-relationship-target','Runtime Mixed Relationship Target','tio2-a');
$write($mixed_target,array_replace($application_values,['application_id'=>'mixed-relationship-target','application_level'=>'detail','parent_application'=>[$category],'related_resources'=>[$mixed_resource_target]]));
$malformed_parent=$create('tio2_application','malformed-parent','Runtime Malformed Parent','tio2-a');
$write($malformed_parent,array_replace($application_values,['application_id'=>'malformed-parent','application_level'=>'detail','parent_application'=>['not-a-post-id',$category]]));
$too_many_parents=$create('tio2_application','too-many-parents','Runtime Too Many Parents','tio2-a');
$write($too_many_parents,array_replace($application_values,['application_id'=>'too-many-parents','application_level'=>'detail','parent_application'=>[$category,$application]]));
$application_validation=tio2_validate_application_record($application);
$resource_validation=tio2_validate_resource_record($resource);
$hierarchy_validation=[
  'category'=>tio2_validate_application_record($category),
  'detail'=>tio2_validate_application_record($detail),
  'universal'=>tio2_validate_application_record($universal),
  'invalidHubDirect'=>tio2_validate_application_record($invalid_hub_direct),
  'wrongPostType'=>tio2_validate_application_record($wrong_post_type),
  'siteBTarget'=>tio2_validate_application_record($site_b_target),
  'mixedTarget'=>tio2_validate_application_record($mixed_target),
  'malformedParent'=>tio2_validate_application_record($malformed_parent),
  'tooManyParents'=>tio2_validate_application_record($too_many_parents),
];
do_action('acf/save_post',$incomplete);do_action('acf/save_post',$site_b_incomplete);do_action('acf/save_post',$mixed);
$incomplete_notice=get_transient(tio2_application_resource_contract_notice_key($incomplete));
$site_b_notice=get_transient(tio2_application_resource_contract_notice_key($site_b_incomplete));
$mixed_notice=get_transient(tio2_application_resource_contract_notice_key($mixed));
wp_update_post(['ID'=>$application,'post_status'=>'publish']);
wp_update_post(['ID'=>$resource,'post_status'=>'future','post_date'=>gmdate('Y-m-d H:i:s',time()+DAY_IN_SECONDS),'post_date_gmt'=>gmdate('Y-m-d H:i:s',time()+DAY_IN_SECONDS)]);
wp_update_post(['ID'=>$site_b_application,'post_status'=>'publish']);
wp_update_post(['ID'=>$site_b_resource,'post_status'=>'publish']);
wp_update_post(['ID'=>$mixed,'post_status'=>'publish']);
$reassigned=$create('tio2_application','runtime-reassigned-application','Runtime Reassigned Application','tio2-b');
wp_update_post(['ID'=>$reassigned,'post_status'=>'publish']);
$reassigned_before=get_post_status($reassigned);
wp_set_object_terms($reassigned,['tio2-a'],'site_scope',false);
$reassigned_after=get_post_status($reassigned);
$group_keys=static function(int $id):array{return array_values(array_map(static fn(array $group):string=>(string)$group['key'],acf_get_field_groups(['post_id'=>$id])));};
wp_set_current_user(0);
$visibility=[
  'anonymousApplication'=>(bool)apply_filters('graphql_pre_model_data_is_private',false,'PostObject',get_post($application)),
  'anonymousResource'=>(bool)apply_filters('graphql_pre_model_data_is_private',false,'PostObject',get_post($resource)),
  'anonymousSiteB'=>(bool)apply_filters('graphql_pre_model_data_is_private',false,'PostObject',get_post($site_b_application)),
  'anonymousMixed'=>(bool)tio2_application_resource_graphql_visibility(false,'PostObject',get_post($mixed)),
];
$query=graphql(['query'=>'{ tio2Applications(first: 100) { nodes { databaseId } } tio2Documents(first: 100) { nodes { databaseId } } }']);
if(!empty($query['errors'])){WP_CLI::error(wp_json_encode($query['errors']));}
$visibility['authenticatedApplication']=(static function(int $id):bool{$users=get_users(['number'=>1,'fields'=>'ids']);if([]===$users){WP_CLI::error('Runtime test requires an authenticated WordPress user.');}wp_set_current_user((int)$users[0]);return (bool)tio2_application_resource_graphql_visibility(false,'PostObject',get_post($id));})($application);
$application_nodes=$query['data']['tio2Applications']['nodes']??[];$resource_nodes=$query['data']['tio2Documents']['nodes']??[];
echo 'TIO2_APPLICATION_RESOURCE_RUNTIME '.wp_json_encode([
  'validation'=>['application'=>$application_validation,'resource'=>$resource_validation],
  'hierarchy'=>$hierarchy_validation,
  'statuses'=>['application'=>get_post_status($application),'resource'=>get_post_status($resource),'siteBApplication'=>get_post_status($site_b_application),'siteBResource'=>get_post_status($site_b_resource),'incomplete'=>get_post_status($incomplete),'mixed'=>get_post_status($mixed),'reassignedBefore'=>$reassigned_before,'reassignedAfter'=>$reassigned_after],
  'notices'=>['incomplete'=>$incomplete_notice?:null,'siteB'=>$site_b_notice?:null,'mixed'=>$mixed_notice?:null],
  'fieldGroups'=>['application'=>$group_keys($application),'resource'=>$group_keys($resource),'siteBApplication'=>$group_keys($site_b_application),'siteBResource'=>$group_keys($site_b_resource)],
  'visibility'=>$visibility,
  'graphql'=>['applications'=>array_values(array_map(static fn(array $node):int=>(int)$node['databaseId'],$application_nodes)),'resources'=>array_values(array_map(static fn(array $node):int=>(int)$node['databaseId'],$resource_nodes))],
  'ids'=>['application'=>$application,'resource'=>$resource,'siteBApplication'=>$site_b_application,'siteBResource'=>$site_b_resource],
]);
`

let snapshot: RuntimeSnapshot

describe.runIf(runLiveWordPress)('live WordPress Site A Application/Resource editorial guards', () => {
  beforeAll(() => {
    const output = requireWpSuccess(wp(['eval', setupScript]))
    const match = output.match(/TIO2_APPLICATION_RESOURCE_RUNTIME (\{.*\})/u)
    expect(match, output).not.toBeNull()
    snapshot = JSON.parse(match![1]) as RuntimeSnapshot
  }, 180_000)

  afterAll(() => {
    requireWpSuccess(wp([
      'eval',
      `$ids=get_posts(['post_type'=>['tio2_application','tio2_document'],'post_status'=>'any','posts_per_page'=>-1,'fields'=>'ids','meta_key'=>'_tio2_runtime_fixture','meta_value'=>'${fixtureMarker}']);foreach($ids as $id){wp_delete_post((int)$id,true);}`,
    ]))
  })

  it('saves complete exact-Site-A drafts with the matching ACF groups and empty validation errors', () => {
    expect(snapshot.validation).toEqual({application: [], resource: []})
    expect(snapshot.fieldGroups.application).toContain('group_tio2_application_fields')
    expect(snapshot.fieldGroups.resource).toContain('group_tio2_resource_fields')
    expect(snapshot.fieldGroups.siteBApplication).not.toContain('group_tio2_application_fields')
    expect(snapshot.fieldGroups.siteBResource).not.toContain('group_tio2_resource_fields')
  })

  it('validates the complete Application hierarchy and sole Hub-direct Detail exception', () => {
    expect(snapshot.hierarchy.category).toEqual([])
    expect(snapshot.hierarchy.detail).toEqual([])
    expect(snapshot.hierarchy.universal).toEqual([])
    expect(snapshot.hierarchy.invalidHubDirect).toEqual([
      'parent_application for a Detail must reference a Category.',
    ])
  })

  it('reports exact relationship field paths for wrong type, scope, malformed IDs, and count', () => {
    expect(snapshot.hierarchy.wrongPostType).toEqual([
      'related_resources.0 must reference the expected post type.',
    ])
    expect(snapshot.hierarchy.siteBTarget).toEqual([
      'related_resources.0 must reference an exact Site A record.',
    ])
    expect(snapshot.hierarchy.mixedTarget).toEqual([
      'related_resources.0 must reference an exact Site A record.',
    ])
    expect(snapshot.hierarchy.malformedParent).toEqual([
      'parent_application must contain only stable WordPress post IDs.',
    ])
    expect(snapshot.hierarchy.tooManyParents).toEqual([
      'parent_application exceeds its maximum of 1 relationships.',
      'parent_application must contain exactly one parent for a Detail.',
    ])
  })

  it('keeps incomplete Site A records in draft with actionable field-path feedback', () => {
    expect(snapshot.statuses.incomplete).toBe('draft')
    expect(snapshot.notices.incomplete?.message).toMatch(/application_id/u)
    expect(snapshot.notices.siteB).toBeNull()
  })

  it('coerces Site A publish and future attempts to draft while Site B keeps shared-CPT behavior', () => {
    expect(snapshot.statuses).toMatchObject({
      application: 'draft',
      resource: 'draft',
      siteBApplication: 'publish',
      siteBResource: 'publish',
    })
  })

  it('immediately demotes a published shared-CPT Site B record reassigned to Site A', () => {
    expect(snapshot.statuses.reassignedBefore).toBe('publish')
    expect(snapshot.statuses.reassignedAfter).toBe('draft')
  })

  it('keeps mixed ownership invalid and unpublished without widening the exact-Site-A privacy override', () => {
    expect(snapshot.statuses.mixed).toBe('draft')
    expect(snapshot.visibility.anonymousMixed).toBe(false)
    expect(snapshot.notices.mixed?.message).toMatch(/site_scope/u)
  })

  it('hides only exact-Site-A records from anonymous GraphQL and leaves authenticated and Site B visibility unchanged', () => {
    expect(snapshot.visibility).toEqual({
      anonymousApplication: true,
      anonymousResource: true,
      anonymousSiteB: false,
      anonymousMixed: false,
      authenticatedApplication: false,
    })
    expect(snapshot.graphql.applications).not.toContain(snapshot.ids.application)
    expect(snapshot.graphql.resources).not.toContain(snapshot.ids.resource)
    expect(snapshot.graphql.applications).toContain(snapshot.ids.siteBApplication)
    expect(snapshot.graphql.resources).toContain(snapshot.ids.siteBResource)
  })
})
