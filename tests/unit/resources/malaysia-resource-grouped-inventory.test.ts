import {describe, expect, it} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'
import {projectEligibleMalaysiaResources} from '@/lib/wordpress/resource-hub-v01-dto'
import {buildEditorialJsonLd, buildEditorialMetadata} from '@/lib/seo/editorial-metadata'
import chemours from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-chemours.json'
import r706 from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-r706.json'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
import {getSiteConfig} from '@/sites'
const groups = [['Sourcing',['RES-ORIGIN']],['Technical Evaluation',['RES-PROC','RES-CHEMOURS','RES-R706']],['Trade & Market',['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR']]]
describe('approved grouped inventory',()=>{
 it('projects eight approved Resources in stable groups',()=>{
  const dto=projectEligibleMalaysiaResources(contract.resourceRelations)
  expect(dto.publicState).toBe('H3_GROUPED_PUBLIC_RESOURCES')
  expect(dto.resourceGroups.map(group=>[group.heading,group.items.map(item=>item.pageId)])).toEqual(groups)
  expect(new Set(dto.resourceGroups.flatMap(group=>group.items.map(item=>item.href))).size).toBe(8)
  expect(dto).not.toHaveProperty('featuredResources')
  expect(dto).not.toHaveProperty('latestResources')
 })
 it.each([[chemours,'TechArticle'],[r706,'WebPage']] as const)('activates exact candidate canonical and permitted Schema', (raw,type)=>{
  const page=raw as EditorialContract
  const site=getSiteConfig('tio2-my')
  expect(buildEditorialMetadata(site,page).alternates?.canonical).toBe('https://tio2malaysia.com'+page.identity.path)
  expect((buildEditorialJsonLd(site,page)?.['@graph'] as Record<string,unknown>[]).map(node=>node['@type'])).toEqual([type,'BreadcrumbList'])
 })
})
import {toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {malaysiaResourceHubSource} from '@/tests/fixtures/tio2-my-resource-hub'

describe('approved inventory rejects altered public data',()=>{
 it.each(['title','summary','lastReviewedAt','groupKey','displayOrder','canonicalUrl','siteScope','locale','mappingStatus','releaseState','publicEligibilityStatus'])('removes a relation whose %s is altered',field=>{
  const relations=structuredClone(contract.resourceRelations) as Record<string,unknown>[]
  relations[0][field]=field==='displayOrder'?9:'ALTERED'
  expect(projectEligibleMalaysiaResources(relations).resourceGroups.flatMap(group=>group.items).map(item=>item.pageId)).not.toContain('RES-ORIGIN')
 })
 it('rejects forged CMS public cards and incorrect group placement',()=>{
  const source=malaysiaResourceHubSource()
  const projection=structuredClone(projectEligibleMalaysiaResources(contract.resourceRelations))
  ;(projection.resourceGroups[0].items[0] as {title: string}).title='Invented endorsement'
  expect(()=>toMalaysiaResourceHubDto({...source,resourceProjection:projection})).toThrow()
 })
})
describe('candidate metadata rejects identity and Schema drift',()=>{
 it.each([
  {...r706,identity:{...r706.identity,path:'/resources/unregistered/'},seo:{...r706.seo,canonical:'https://tio2malaysia.com/resources/unregistered/'}},
  {...r706,identity:{...r706.identity,locale:'fr'}},
  {...r706,seo:{...r706.seo,schemaType:'TechArticle'}},
  {...r706,seo:{...r706.seo,schemaItems:[{name:'Invented mapping',href:'/products/m-996/'}]}},
 ])('fails closed for altered candidate metadata',raw=>{
  expect(()=>buildEditorialJsonLd(getSiteConfig('tio2-my'),raw as EditorialContract)).toThrow()
 })
})

it('keeps the raw eligibility ledger out of the public DTO',()=>{
 expect(toMalaysiaResourceHubDto(malaysiaResourceHubSource())).not.toHaveProperty('resourceRelations')
})
