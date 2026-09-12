import {matchesInstalledContent} from './content-release-validation'
import sanitizeHtml from 'sanitize-html'
import type {EditorialContract, EditorialDto} from '@/lib/editorial/editorial-types'
import {normalizeWordPressGmt} from './time'
import {CrossSiteContentError} from './types'
import {assertEditorialReview} from '@/lib/editorial/editorial-review'

export class EditorialContractError extends Error {
  constructor(field:string) { super(`Invalid Malaysia editorial record: ${field}`); this.name='EditorialContractError' }
}
export class EditorialFreshnessError extends Error {
  constructor() { super('The dated editorial record requires source review'); this.name='EditorialFreshnessError' }
}
function object(value:unknown):Record<string,unknown> {
  if(!value || typeof value!=='object' || Array.isArray(value)) throw new EditorialContractError('object')
  return value as Record<string,unknown>
}
const tags=['section','article','aside','nav','div','span','p','h1','h2','h3','h4','h5','h6','a','ol','ul','li','table','caption','thead','tbody','tfoot','tr','th','td','strong','em','b','i','code','br','hr','sup','sub','blockquote','dl','dt','dd','time','small','figure','figcaption']
export function sanitizeEditorialBody(body:string,availableGradePaths?:readonly string[],unavailableInternalPaths:readonly string[]=[]):string {
  if(/<\s*\/?\s*([a-z][\w:-]*)\b/giu.test(body)) {
    for(const match of body.matchAll(/<\s*\/?\s*([a-z][\w:-]*)\b/giu)) if(!tags.includes(match[1].toLowerCase())) throw new EditorialContractError('body tag')
  }
  const unavailablePaths=new Set(unavailableInternalPaths)
  return sanitizeHtml(body,{
    exclusiveFilter:frame=>{
      if(frame.attribs['data-conditional-target'] && unavailablePaths.has(frame.attribs['data-conditional-target'])) return true
      if(frame.tag!=='a') return false
      const href=frame.attribs.href??''
      if(availableGradePaths!==undefined && /^\/products\/m-[0-9]+\/$/u.test(href) && !availableGradePaths.includes(href)) return true
      return unavailablePaths.has(href)?'excludeTag':false
    },
    onOpenTag:(_tag,attributes)=>{
      for(const [name,value] of Object.entries(attributes)) {
        if(/^on/iu.test(name) || name==='style' || (['href','src'].includes(name) && /^(?:javascript|vbscript|file|data)\s*:/iu.test(value.trim()))) throw new EditorialContractError('body attributes')
      }
    },
    allowedTags:tags,
    allowedAttributes:{'*':['class','id','role','aria-*','data-*','lang','title','tabindex'],a:['href','rel','target'],th:['scope','colspan','rowspan','headers'],td:['colspan','rowspan','headers'],time:['datetime']},
    allowedSchemes:['https'],allowProtocolRelative:false,
    transformTags:{a:(_tag,attrs)=>({tagName:'a',attribs:{...attrs,...(attrs.href?.startsWith('https://') ? {rel:'noopener noreferrer'} : {})}})},
  })
}
export function toMalaysiaEditorialDto(approved:EditorialContract,value:unknown):EditorialDto {
  const source=object(value), nodes=object(source.siteScopes).nodes
  if(!Array.isArray(nodes)) throw new EditorialContractError('scopes')
  const scopes=nodes.map(node=>String(object(node).slug))
  if(scopes.length!==1 || scopes[0]!=='tio2-my') throw new CrossSiteContentError('tio2-my',scopes)
  if(approved.identity.siteScope!=='tio2-my' || source.recordPageId!==approved.identity.pageId || source.status!=='publish' || object(source.publishingFields).publicPath!==approved.identity.path.replace(/\/$/u,'')) throw new EditorialContractError('identity')
  if(typeof source.id!=='string' || !source.id.trim() || source.id.trim()!==source.id) throw new EditorialContractError('id')
  const modified=normalizeWordPressGmt(typeof source.modifiedGmt==='string'?source.modifiedGmt:null)
  if(!modified) throw new EditorialContractError('modified')
  let payload:unknown
  try { payload=JSON.parse(String(source.editorialContractJson)) } catch { throw new EditorialContractError('payload') }
  if(!matchesInstalledContent(payload,approved)) throw new EditorialContractError('approved revision')
  const delivered=payload as EditorialContract
  const paths=source.availableGradePaths
  if(!Array.isArray(paths) || paths.some(path=>typeof path!=='string' || !/^\/products\/m-[0-9]+\/$/u.test(path) || !delivered.bodyHtml.includes(`href="${path}"`)) || new Set(paths).size!==paths.length) throw new EditorialContractError('Grade readiness')
  const unavailableInternalPaths=source.unavailableInternalPaths
  if(!Array.isArray(unavailableInternalPaths) || unavailableInternalPaths.some(path=>typeof path!=='string' || !/^\/(?:[a-z0-9][a-z0-9-]*\/)*$/u.test(path) || /^\/products\/m-[0-9]+\/$/u.test(path) || !delivered.bodyHtml.includes(`href="${path}"`)) || new Set(unavailableInternalPaths).size!==unavailableInternalPaths.length) throw new EditorialContractError('internal route readiness')
  if(unavailableInternalPaths.length>0 && !['APP-INK','APP-PAPER','MARKET-EU-DE','MARKET-EU-IT'].includes(delivered.identity.pageId)) throw new EditorialContractError('internal route suppression policy')
  if(['MARKET-EU-DE','MARKET-EU-IT'].includes(delivered.identity.pageId) && unavailableInternalPaths.some(path=>!delivered.bodyHtml.includes(`data-conditional-target="${path}"`))) throw new EditorialContractError('unapproved conditional omission')
  return {...delivered,bodyHtml:sanitizeEditorialBody(delivered.bodyHtml,delivered.identity.pageId==='PRODUCT-PROC-SU'?undefined:paths,unavailableInternalPaths),cms:{id:source.id,modified,status:'publish'},freshnessControl:source.freshnessControl??null,availableGradePaths:paths,unavailableInternalPaths}
}
export function assertEditorialFreshness(page:EditorialContract,control:unknown,now=new Date()):void {
  try {assertEditorialReview(page,control,now)} catch {throw new EditorialFreshnessError()}
}
