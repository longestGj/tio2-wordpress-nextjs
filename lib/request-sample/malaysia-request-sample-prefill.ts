import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

export interface MalaysiaSamplePrefill {
  source_page_id?: string
  grade_id?: string
  application_id?: string
  process_context?: 'chloride' | 'sulfate' | 'vapor-phase-oxidation'
  market_id?: string
  destination?: string
  documents_needed?: string[]
  resource_context?: string
  resource_context_label?: string
}

type Input = Record<string, string | string[] | undefined>
const grades = new Set<string>(contract.form.gradeOptions)
const applications = new Set(contract.form.applicationOptions.map(({value}) => value))
const documents = new Set(contract.form.documentOptions.map(({value}) => value))
export const MALAYSIA_SAMPLE_GRADE_PAGE_IDS = Object.freeze([
  'GRADE-M350', 'GRADE-M510', 'GRADE-M896', 'GRADE-M996', 'GRADE-M2196', 'GRADE-M895',
  'GRADE-M200', 'GRADE-M108', 'GRADE-M210', 'GRADE-M340', 'GRADE-M886', 'GRADE-M52',
  'GRADE-M2377', 'GRADE-CR901',
] as const)
export const MALAYSIA_SAMPLE_MARKET_IDS = Object.freeze([
  'MARKET-EU-001', 'MARKET-EU-DE', 'MARKET-EU-IT', 'MARKET-EU-ES', 'MARKET-EU-PL',
  'MARKET-EU-NL', 'MARKET-EU-BE', 'MARKET-UK-001', 'MARKET-IN-001', 'MARKET-BR-EN',
] as const)
export const MALAYSIA_SAMPLE_RESOURCE_CONTEXTS = Object.freeze([
  'RES-ORIGIN',
] as const)
export const MALAYSIA_SAMPLE_SOURCE_PAGE_IDS = Object.freeze([
  'PRODUCT-000', 'PRODUCT-PROC-CL', 'PRODUCT-PROC-SU',
  'APP-000', 'APP-COAT', 'APP-PLAS', 'APP-MB', 'APP-INK', 'APP-PAPER',
  'MARKET-000', 'RES-000',
  ...MALAYSIA_SAMPLE_GRADE_PAGE_IDS,
  ...MALAYSIA_SAMPLE_MARKET_IDS,
  ...MALAYSIA_SAMPLE_RESOURCE_CONTEXTS,
] as const)
const sources = new Set<string>(MALAYSIA_SAMPLE_SOURCE_PAGE_IDS)
const markets = new Set<string>(MALAYSIA_SAMPLE_MARKET_IDS)
const resources = new Set<string>(MALAYSIA_SAMPLE_RESOURCE_CONTEXTS)
const processes = new Set(['chloride', 'sulfate', 'vapor-phase-oxidation'] as const)
const gradeBySource = new Map<string,string>(MALAYSIA_SAMPLE_GRADE_PAGE_IDS.map((pageId)=>[pageId,pageId==='GRADE-CR901'?'CR-901':pageId.replace('GRADE-M','M-')]))
const applicationBySource = new Map<string,string>([
  ['APP-COAT','coatings'],['APP-PLAS','plastics'],['APP-MB','masterbatch'],
  ['APP-INK','printing_inks'],['APP-PAPER','paper'],
])
const processBySource = new Map<string,MalaysiaSamplePrefill['process_context']>([
  ['PRODUCT-PROC-CL','chloride'],['PRODUCT-PROC-SU','sulfate'],
])
const processByGrade = new Map<string,MalaysiaSamplePrefill['process_context']>([
  ...['M-350','M-510','M-896','M-895','M-200','M-210','M-340','M-886'].map((grade)=>[grade,'chloride'] as const),
  ...['M-996','M-2196','M-108','M-52','M-2377'].map((grade)=>[grade,'sulfate'] as const),
  ['CR-901','vapor-phase-oxidation'],
])
const applicationsByGrade = new Map<string,ReadonlySet<string>>([
  ['M-350',new Set(['coatings','plastics','printing_inks','paper'])],
  ['M-510',new Set(['coatings','plastics','masterbatch','printing_inks'])],
  ['M-896',new Set(['coatings'])],['M-996',new Set(['coatings'])],['M-2196',new Set(['coatings'])],
  ['M-895',new Set(['coatings'])],['M-200',new Set(['plastics','masterbatch'])],
  ['M-108',new Set(['plastics','masterbatch'])],['M-210',new Set(['plastics','masterbatch'])],
  ['M-340',new Set(['plastics','masterbatch'])],['M-886',new Set(['plastics','masterbatch'])],
  ['M-52',new Set(['coatings','printing_inks'])],
  ['M-2377',new Set(['coatings','plastics','masterbatch','printing_inks','paper'])],
  ['CR-901',new Set(['specialty_materials'])],
])
const marketDestinations = new Map<string,string>([
  ['MARKET-EU-001','European Union'],['MARKET-EU-DE','Germany'],['MARKET-EU-IT','Italy'],
  ['MARKET-EU-ES','Spain'],['MARKET-EU-PL','Poland'],['MARKET-EU-NL','Netherlands'],
  ['MARKET-EU-BE','Belgium'],['MARKET-UK-001','United Kingdom'],['MARKET-IN-001','India'],
  ['MARKET-BR-EN','Brazil'],
])
const resourceLabels = new Map<string,string>([
  ['RES-ORIGIN','Alternative-origin sourcing considerations'],
])
const one = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value

export const normalizeMalaysiaSampleSourcePageId = (value: unknown): string | null => typeof value === 'string' && sources.has(value) ? value : null
export const normalizeMalaysiaSampleMarketId = (value: unknown): string | null => typeof value === 'string' && markets.has(value) ? value : null
export const normalizeMalaysiaSampleResourceContext = (value: unknown): string | null => typeof value === 'string' && resources.has(value) ? value : null
export const normalizeMalaysiaSampleProcessContext = (value: unknown, gradeId: unknown): MalaysiaSamplePrefill['process_context'] | null => {
  if (typeof value !== 'string' || !processes.has(value as typeof processes extends Set<infer T> ? T : never)) return null
  if (typeof gradeId === 'string' && processByGrade.has(gradeId) && processByGrade.get(gradeId) !== value) return null
  return value as MalaysiaSamplePrefill['process_context']
}

export function resolveMalaysiaSamplePrefill(input: Input): MalaysiaSamplePrefill {
  const source = normalizeMalaysiaSampleSourcePageId(one(input.source_page_id))
  if (!source) return {}
  const result: MalaysiaSamplePrefill = {source_page_id: source}
  const requestedGrade = one(input.grade_id)
  const expectedGrade = gradeBySource.get(source)
  const requestedApplication = one(input.application_id)
  const expectedApplication = applicationBySource.get(source)
  const publicApplication=requestedApplication&&applications.has(requestedApplication)&&!['other','not_sure'].includes(requestedApplication)?requestedApplication:null
  const requestedProcess = one(input.process_context)
  const expectedProcess = processBySource.get(source)
  const gradeCandidate=requestedGrade&&grades.has(requestedGrade)?requestedGrade:null
  const gradeHasApplication=Boolean(gradeCandidate&&publicApplication&&applicationsByGrade.get(gradeCandidate)?.has(publicApplication))
  const gradeAllowedBySource=gradeCandidate&&(
    source==='PRODUCT-000'||
    (Boolean(expectedGrade)&&gradeCandidate===expectedGrade)||
    (source==='APP-000'&&gradeHasApplication)||
    (Boolean(expectedApplication)&&publicApplication===expectedApplication&&gradeHasApplication)||
    (Boolean(expectedProcess)&&requestedProcess===expectedProcess&&processByGrade.get(gradeCandidate)===expectedProcess)
  )
  const grade=gradeAllowedBySource?gradeCandidate:null
  const applicationAllowedBySource = source==='PRODUCT-000'||source==='APP-000'||Boolean(expectedApplication)||Boolean(expectedGrade)
  const application = publicApplication&&applicationAllowedBySource&&(!expectedApplication||publicApplication===expectedApplication)&&(!expectedGrade||Boolean(grade))&&(!grade||applicationsByGrade.get(grade)?.has(publicApplication))?publicApplication:null
  const processAllowedBySource = source==='PRODUCT-000'||Boolean(expectedProcess)||Boolean(expectedGrade)||Boolean(expectedApplication)||source==='APP-000'
  const market = normalizeMalaysiaSampleMarketId(one(input.market_id))
  const sourceIsSpecificMarket=markets.has(source)
  const acceptedMarket = market&&(source==='MARKET-000'||(sourceIsSpecificMarket&&source===market))?market:null
  const destination = one(input.destination)
  const resource = one(input.resource_context)
  if (grade) result.grade_id = grade
  if (application) result.application_id = application
  const normalizedProcess = processAllowedBySource&&(!expectedProcess||requestedProcess===expectedProcess)&&(!expectedGrade||Boolean(grade))&&(!(expectedApplication||source==='APP-000')||Boolean(grade))?normalizeMalaysiaSampleProcessContext(requestedProcess,grade):null
  if (normalizedProcess) result.process_context = normalizedProcess
  if (acceptedMarket) {const marketDestination=marketDestinations.get(acceptedMarket);result.market_id=acceptedMarket;if(marketDestination)result.destination=marketDestination}
  else if (destination && Array.from(destination).length <= 120 && destination.trim()) result.destination = destination.trim()
  const rawDocuments = input.document_needs ?? input['document_needs[]']
  const selected = (Array.isArray(rawDocuments) ? rawDocuments : rawDocuments ? [rawDocuments] : []).filter((value) => documents.has(value))
  if (selected.length) result.documents_needed = [...new Set(selected)]
  const normalizedResource = normalizeMalaysiaSampleResourceContext(resource)
  if (normalizedResource) {
    result.resource_context=normalizedResource
    result.resource_context_label=resourceLabels.get(normalizedResource)
  }
  return result
}
