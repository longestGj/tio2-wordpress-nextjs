import type {EditorialContract} from '@/lib/editorial/editorial-types'
import evidence from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-review-evidence.json'

export type EditorialReviewStatus='verified'|'unverified'|'withdrawn'
export type EditorialReviewEventStatus='no_open_trigger'|'event_pending'

export interface EditorialReviewControl {
 readonly schemaVersion:'editorial-review-v0.1'
 readonly pageId:string
 readonly siteScope:'tio2-my'
 readonly packageSha256:string
 readonly evidenceArtifactSha256:string
 readonly evidenceDate:string
 readonly checkedAt:string
 readonly timeZone:'Asia/Kuala_Lumpur'
 readonly outcome:'NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK'
 readonly policyId:string
 readonly status:EditorialReviewStatus
 readonly eventStatus:EditorialReviewEventStatus
 readonly nextReviewDue:string
}

export interface EditorialReviewPolicy {
 readonly policyId:string
 readonly baselineDate:string
 readonly maximumIntervalDays:number
 readonly approvedNextReviewDue:string
 readonly timeZone:'Asia/Kuala_Lumpur'
 readonly eventTypes:readonly string[]
}

interface EvidenceArtifact {
 readonly path:string
 readonly sha256:string
 readonly evidenceDate:string
 readonly checkedAt:string
 readonly timeZone:'Asia/Kuala_Lumpur'
 readonly outcome:'NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK'
}

interface EvidencePage {
 readonly pageId:string
 readonly siteScope:'tio2-my'
 readonly packageSha256:string
 readonly policy:EditorialReviewPolicy
 readonly currentReview:EditorialReviewControl
}

interface EvidenceManifest {
 readonly schemaVersion:'tio2-my-editorial-review-evidence-v0.1'
 readonly siteScope:'tio2-my'
 readonly evidenceArtifact:EvidenceArtifact
 readonly pages:readonly EvidencePage[]
}

export class EditorialReviewError extends Error {
 constructor(message:string){super(message);this.name='EditorialReviewError'}
}

const manifest=evidence as unknown as EvidenceManifest
const reviewKeys=['checkedAt','eventStatus','evidenceArtifactSha256','evidenceDate','nextReviewDue','outcome','packageSha256','pageId','policyId','schemaVersion','siteScope','status','timeZone'] as const
const artifactKeys=['checkedAt','evidenceDate','outcome','path','sha256','timeZone'] as const
const manifestKeys=['evidenceArtifact','pages','schemaVersion','siteScope'] as const
const pageKeys=['currentReview','packageSha256','pageId','policy','siteScope'] as const
const policyKeys=['approvedNextReviewDue','baselineDate','eventTypes','maximumIntervalDays','policyId','timeZone'] as const
const sha256Pattern=/^[a-f0-9]{64}$/i
const datePattern=/^(\d{4})-(\d{2})-(\d{2})$/
const instantPattern=/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|([+-])(\d{2}):(\d{2}))$/

function fail(message:string):never{throw new EditorialReviewError(message)}
function record(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value)}
function exactKeys(value:Record<string,unknown>,keys:readonly string[]):boolean{
 const actual=Object.keys(value).sort()
 const expected=[...keys].sort()
 return actual.length===expected.length&&actual.every((key,index)=>key===expected[index])
}
function validDate(value:unknown):value is string{
 if(typeof value!=='string')return false
 const match=datePattern.exec(value)
 if(!match)return false
 const year=Number(match[1]),month=Number(match[2]),day=Number(match[3])
 const date=new Date(Date.UTC(year,month-1,day))
 return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day
}
function validInstant(value:unknown):value is string{
 if(typeof value!=='string')return false
 const match=instantPattern.exec(value)
 if(!match||!validDate(match[1])||Number(match[2])>23||Number(match[3])>59||Number(match[4])>59)return false
 if(match[5]!=='Z'&&(Number(match[7])>14||Number(match[8])>59||(Number(match[7])===14&&Number(match[8])!==0)))return false
 return Number.isFinite(Date.parse(value))
}
function localDate(date:Date,timeZone:string):string{
 try {
  const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date)
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value
  const year=part('year'),month=part('month'),day=part('day')
  if(!year||!month||!day)fail('Unable to determine the policy-local date.')
  return `${year}-${month}-${day}`
 } catch(error) {
  if(error instanceof EditorialReviewError)throw error
  return fail('Invalid evidence policy time zone.')
 }
}
function addDays(value:string,days:number):string{
 const [year,month,day]=value.split('-').map(Number)
 const result=new Date(Date.UTC(year,month-1,day+days))
 return result.toISOString().slice(0,10)
}
function samePrimitiveRecord(actual:Record<string,unknown>,expected:Record<string,unknown>,keys:readonly string[]):boolean{
 return keys.every(key=>actual[key]===expected[key])
}

function validateManifestPage(page:EditorialContract):EvidencePage{
 if(!record(manifest as unknown)||!exactKeys(manifest as unknown as Record<string,unknown>,manifestKeys)||manifest.schemaVersion!=='tio2-my-editorial-review-evidence-v0.1'||manifest.siteScope!=='tio2-my'||!Array.isArray(manifest.pages))fail('Invalid trusted review manifest.')
 const artifact=manifest.evidenceArtifact as unknown
 if(!record(artifact)||!exactKeys(artifact,artifactKeys)||!sha256Pattern.test(String(artifact.sha256))||!validDate(artifact.evidenceDate)||!validInstant(artifact.checkedAt)||artifact.timeZone!=='Asia/Kuala_Lumpur'||artifact.outcome!=='NO_MATERIAL_CHANGE_LOCATED_IN_BOUNDED_OFFICIAL_CHECK'||typeof artifact.path!=='string'||artifact.path==='')fail('Invalid trusted evidence artifact.')
 const matches=manifest.pages.filter(candidate=>candidate.pageId===page.identity.pageId)
 if(matches.length!==1)fail('No unique trusted review policy exists for this page.')
 const trusted=matches[0]
 if(!record(trusted as unknown)||!exactKeys(trusted as unknown as Record<string,unknown>,pageKeys)||trusted.siteScope!=='tio2-my'||!sha256Pattern.test(trusted.packageSha256))fail('Invalid trusted page policy.')
 const policy=trusted.policy as unknown
 if(!record(policy)||!exactKeys(policy,policyKeys)||typeof policy.policyId!=='string'||!validDate(policy.baselineDate)||!validDate(policy.approvedNextReviewDue)||!Number.isInteger(policy.maximumIntervalDays)||Number(policy.maximumIntervalDays)<=0||policy.timeZone!=='Asia/Kuala_Lumpur'||!Array.isArray(policy.eventTypes)||policy.eventTypes.length===0||policy.eventTypes.some(value=>typeof value!=='string'||value===''))fail('Invalid trusted page review policy.')
 const trustedReview=trusted.currentReview as unknown
 if(!record(trustedReview)||!exactKeys(trustedReview,reviewKeys)||trustedReview.schemaVersion!=='editorial-review-v0.1')fail('Invalid trusted current review.')
 if(trusted.pageId!==trustedReview.pageId||trusted.siteScope!==trustedReview.siteScope||trusted.packageSha256!==trustedReview.packageSha256||trusted.policy.policyId!==trustedReview.policyId)fail('Trusted current review is not bound to its page policy.')
 if(trustedReview.evidenceArtifactSha256!==artifact.sha256||trustedReview.evidenceDate!==artifact.evidenceDate||trustedReview.checkedAt!==artifact.checkedAt||trustedReview.timeZone!==artifact.timeZone||trustedReview.outcome!==artifact.outcome)fail('Trusted current review is not bound to its evidence artifact.')
 return trusted
}

export function assertEditorialReview(page:EditorialContract,control:unknown,now=new Date()):void{
 if(page.freshness===null)return
 if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail('Invalid review clock.')
 if(!record(control)||!exactKeys(control,reviewKeys))fail('Editorial review has missing or unknown fields.')
 const trusted=validateManifestPage(page)
 const expected=trusted.currentReview as unknown as Record<string,unknown>
 if(!samePrimitiveRecord(control,expected,reviewKeys))fail('Editorial review does not match the trusted evidence record.')
 if(page.identity.siteScope!==trusted.siteScope||page.source.packageSha256!==trusted.packageSha256)fail('Editorial page is not bound to the trusted package.')
 if(!validDate(page.freshness.lastReviewed)||!validDate(page.freshness.nextReviewDue)||page.freshness.lastReviewed!==trusted.policy.baselineDate||page.freshness.nextReviewDue!==trusted.policy.approvedNextReviewDue)fail('Editorial page review dates do not match the approved policy.')
 if(!validDate(control.evidenceDate)||!validDate(control.nextReviewDue)||!validInstant(control.checkedAt))fail('Editorial review contains an invalid date or timestamp.')
 if(control.status!=='verified'||control.eventStatus!=='no_open_trigger')fail('Editorial review is not currently verified.')
 const today=localDate(now,trusted.policy.timeZone)
 if(control.evidenceDate<trusted.policy.baselineDate||control.evidenceDate>today)fail('Editorial evidence date is outside the permitted window.')
 const checkedAt=new Date(control.checkedAt)
 if(checkedAt.getTime()>now.getTime()||localDate(checkedAt,trusted.policy.timeZone)!==control.evidenceDate)fail('Editorial evidence timestamp is outside the permitted window.')
 const intervalDue=addDays(control.evidenceDate,trusted.policy.maximumIntervalDays)
 const expectedDue=intervalDue<trusted.policy.approvedNextReviewDue?intervalDue:trusted.policy.approvedNextReviewDue
 if(control.nextReviewDue!==expectedDue||control.nextReviewDue<control.evidenceDate||control.nextReviewDue<today)fail('Editorial review is expired or exceeds its approved due date.')
}
