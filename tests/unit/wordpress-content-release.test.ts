import {describe,expect,it} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'
import editorial from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-coat.json'
import {toMalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-dto'
import {toMalaysiaEditorialDto} from '@/lib/wordpress/editorial-v01-dto'
import {malaysiaRequestSamplePageSource} from '../fixtures/tio2-my-request-sample-page'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
describe('CMS content-only delivery',()=>{
 it('renders changed sample request body from CMS',()=>{
 const changed=structuredClone(contract); changed.hero.body='Tell us what your sample evaluation needs.'
 expect(toMalaysiaRequestSamplePageDto(malaysiaRequestSamplePageSource({malaysiaRequestSampleContractJson:JSON.stringify(changed)})).hero.body).toBe(changed.hero.body)
 })
 it('renders an editorial paragraph edit with existing links and markup',()=>{
 const changed=structuredClone(editorial); changed.bodyHtml=changed.bodyHtml.replace(/(<p[^>]*>)([^<]+)/u,'$1Updated evaluation guidance. $2')
 const source={id:'editorial-1',modifiedGmt:'2026-09-03T10:00:00',status:'publish',recordPageId:editorial.identity.pageId,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:editorial.identity.path.replace(/\/$/u,'')},editorialContractJson:JSON.stringify(changed),availableGradePaths:[],unavailableInternalPaths:[]}
 expect(toMalaysiaEditorialDto(editorial as EditorialContract,source).bodyHtml).toContain('Updated evaluation guidance.')
 })
})

