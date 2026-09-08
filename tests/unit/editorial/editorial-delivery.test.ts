import {describe, expect, it} from 'vitest'
import {toMalaysiaEditorialDto, assertEditorialFreshness, sanitizeEditorialBody} from '@/lib/wordpress/editorial-v01-dto'
import type {EditorialContract} from '@/lib/editorial/editorial-types'
import {getEditorialContract} from '@/lib/editorial/malaysia-editorial-contracts'
import evidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'

const approved: EditorialContract = {
  identity: {pageId:'APP-COAT',siteScope:'tio2-my',locale:'en',path:'/applications/titanium-dioxide-for-coatings/',section:'applications',provisional:false,schemaVersion:'editorial-v0.1'},
  source:{packageId:'APP-COAT-G6-HANDOFF-01',packageSha256:'a'.repeat(64),bodySha256:'b'.repeat(64),visualSha256:'c'.repeat(64)},
  seo:{title:'Approved title',metaDescription:'Approved description',canonical:'https://tio2malaysia.com/applications/titanium-dioxide-for-coatings/'},
  heading:'Approved heading',breadcrumb:[{label:'Home',href:'/'},{label:'Coatings',href:'/applications/titanium-dioxide-for-coatings/'}],
  bodyHtml:'<section data-module="COAT-01"><h1>Approved heading</h1><p>Qualified body. <a href="/products/">Products</a></p></section>',mainClass:'',freshness:null,
}
function record(contract:EditorialContract=approved) { return {id:'editorial-12',modifiedGmt:'2026-09-08T00:00:00',status:'publish',recordPageId:contract.identity.pageId,siteScopes:{nodes:[{slug:'tio2-my'}]},publishingFields:{publicPath:contract.identity.path.slice(0,-1)},editorialContractJson:JSON.stringify(contract),freshnessControl:null,availableGradePaths:[],unavailableInternalPaths:[]} }
describe('Malaysia editorial delivery boundary',()=>{
  it('projects the exact published CMS payload and its real record identity',()=>{
    const result=toMalaysiaEditorialDto(approved,record())
    expect(result.bodyHtml).toBe(approved.bodyHtml)
    expect(result.cms.id).toBe('editorial-12')
    expect(result.cms.modified).toContain('2026-09-08')
    expect(result.unavailableInternalPaths).toEqual([])
  })
  it.each([[],[{slug:'tio2-a'}],[{slug:'tio2-my'},{slug:'tio2-b'}],[{slug:'unknown'}]].map(nodes=>({nodes})))('rejects invalid CMS scopes $nodes',({nodes})=>{
    expect(()=>toMalaysiaEditorialDto(approved,{...record(),siteScopes:{nodes}})).toThrow()
  })
  it.each(['draft','private','trash'])('rejects %s status',status=>expect(()=>toMalaysiaEditorialDto(approved,{...record(),status})).toThrow())
  it('rejects wrong public path, Page ID, empty id and malformed date',()=>{
    for(const change of [{publishingFields:{publicPath:'/wrong'}},{recordPageId:'APP-PAPER'},{id:''},{modifiedGmt:'nonsense'}]) expect(()=>toMalaysiaEditorialDto(approved,{...record(),...change})).toThrow()
  })
  it('does not replace missing or changed CMS body with seed content',()=>{
    expect(()=>toMalaysiaEditorialDto(approved,{...record(),editorialContractJson:''})).toThrow()
    expect(()=>toMalaysiaEditorialDto(approved,{...record(),editorialContractJson:JSON.stringify({...approved,bodyHtml:'<p>Foreign claim</p>'})})).toThrow()
  })
  it.each(['<script>alert(1)</script>','<a href="javascript:alert(1)">x</a>','<p onclick="alert(1)">x</p>','<img src="file:///D:/source.png">','<iframe src="https://example.com"></iframe>'])('rejects unsafe or non-content markup',body=>expect(()=>sanitizeEditorialBody(body)).toThrow())
  it('retains semantic table header associations and source links',()=>{
    const body='<table><thead><tr><th scope="col" id="a">Basis</th></tr></thead><tbody><tr><td headers="a" data-label="Basis">Actual system</td></tr></tbody></table><a href="https://example.com/source" rel="noopener noreferrer">Full source title</a>'
    expect(sanitizeEditorialBody(body)).toBe(body)
  })
  it('allows approved source titles containing the ordinary phrase public file:',()=>{
    const body='<p>TRA public file: AD0086</p>'
    expect(sanitizeEditorialBody(body)).toBe(body)
  })
  it('omits only an unavailable Grade action while retaining the neutral relation text',()=>{
    const html='<tr><td>M-350</td><td>Chloride</td><td><a href="/products/m-350/">View M-350</a></td></tr>'
    expect(sanitizeEditorialBody(html,[])).toBe('<tr><td>M-350</td><td>Chloride</td><td></td></tr>')
    expect(sanitizeEditorialBody(html,['/products/m-350/'])).toBe(html)
  })
  it('removes exact unavailable CMS-backed links without touching anchors or authoritative sources',()=>{
    const html='<p>Continue to <a href="/products/">Products</a>, <a href="#evidence">evidence</a> or <a href="https://example.com/source">the source</a>.</p>'
    expect(sanitizeEditorialBody(html,[],['/products/'])).toBe('<p>Continue to Products, <a href="#evidence">evidence</a> or <a href="https://example.com/source" rel="noopener noreferrer">the source</a>.</p>')
    const inkApproved:EditorialContract={...approved,identity:{...approved.identity,pageId:'APP-INK',path:'/applications/titanium-dioxide-for-printing-inks/',provisional:true},seo:{...approved.seo,canonical:'https://tio2malaysia.com/applications/titanium-dioxide-for-printing-inks/'}}
    const result=toMalaysiaEditorialDto(inkApproved,{...record(inkApproved),unavailableInternalPaths:['/products/']})
    expect(result.unavailableInternalPaths).toEqual(['/products/'])
    expect(result.bodyHtml).not.toContain('href="/products/"')
    expect(result.bodyHtml).toContain('Qualified body.')
  })
  it('rejects malformed, duplicate, Grade or payload-foreign unavailable route evidence',()=>{
    for(const unavailableInternalPaths of [['https://example.com/'],['/products/','/products/'],['/products/m-350/'],['/not-in-approved-body/']]) {
      expect(()=>toMalaysiaEditorialDto(approved,{...record(),unavailableInternalPaths})).toThrow()
    }
    expect(()=>toMalaysiaEditorialDto(approved,{...record(),unavailableInternalPaths:['/products/']})).toThrow()
  })
  it('suppresses overdue, withdrawn, unverified and mismatched review revisions',()=>{
    const trade=getEditorialContract('RES-TRADE-EU')
    const control=evidence.pages.find(p=>p.pageId==='RES-TRADE-EU')!.currentReview
    expect(()=>assertEditorialFreshness(trade,control,new Date('2026-09-08T12:00:00Z'))).not.toThrow()
    for(const change of [{status:'withdrawn'},{status:'unverified'},{sourceRevision:'wrong'},{evidenceDate:'2027-01-01'}]) expect(()=>assertEditorialFreshness(trade,{...control,...change},new Date('2026-09-08T12:00:00Z'))).toThrow()
    expect(()=>assertEditorialFreshness(trade,control,new Date('2026-10-08T00:00:00Z'))).toThrow()
    expect(()=>assertEditorialFreshness(trade,null,new Date('2026-09-08T12:00:00Z'))).toThrow()
  })
})
