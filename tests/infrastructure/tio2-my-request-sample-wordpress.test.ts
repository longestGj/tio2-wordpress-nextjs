import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'

const php=readFileSync('wordpress/plugins/tio2-site-model/includes/request-sample-v01.php','utf8')
const plugin=readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php','utf8')
const seed=readFileSync('wordpress/seed/apply-tio2-my-request-sample.php','utf8')
const webhooks=readFileSync('wordpress/plugins/tio2-site-model/includes/webhooks.php','utf8')
const contentTypes=readFileSync('wordpress/plugins/tio2-site-model/includes/content-types.php','utf8')
const revalidate=readFileSync('app/api/revalidate/route.ts','utf8')

describe('TiO2 Malaysia Sample Request WordPress model',()=>{
  it('registers and loads one private scope-bound type and non-null GraphQL field',()=>{
    expect(plugin).toContain("require_once __DIR__ . '/includes/request-sample-v01.php'")
    expect(php).toContain("register_post_type('tio2_request_sample'")
    expect(php).toContain("register_taxonomy_for_object_type('site_scope', 'tio2_request_sample')")
    expect(contentTypes).toContain("'tio2_request_sample'")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain("'terms' => ['tio2-my']")
  })
  it('fails closed for zero/multiple records and validates exact route/scope/contract',()=>{
    expect(php).toContain('if (1 !== count($ids)) throw new \\GraphQL\\Error\\UserError')
    expect(php).toContain("['tio2-my'] !== array_values")
    expect(php).toContain("'/request-sample' !== get_post_meta")
    expect(php).toContain('hash_equals($approved, $stored)')
  })
  it('uses a collision-safe scoped seed and invalidates only the Malaysia route',()=>{
    expect(seed).toContain('A same-slug Sample Request record exists outside site_scope=tio2-my.')
    expect(seed).toContain("'tax_query'")
    expect(webhooks).toContain("'tio2_request_sample'")
    expect(webhooks).toContain("$paths = ['/request-sample']")
    expect(webhooks).toContain('TIO2_MY_REQUEST_SAMPLE_CONTRACT_META === $meta_key')
    expect(revalidate).toContain("path === '/request-sample'")
    expect(revalidate).toContain('requestSampleContentTag(siteId)')
  })
})
