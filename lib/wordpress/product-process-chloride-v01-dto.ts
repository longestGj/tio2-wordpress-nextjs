import {z} from 'zod'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {normalizeWordPressGmt} from './time'
import type {
  ChlorideProcessAction,
  ChlorideProcessGradeRelation,
  MalaysiaChlorideProcessPageDto,
} from './product-process-chloride-v01-types'

export class ChlorideProcessContractError extends Error {
  constructor(field: string) {
    super(`Invalid Malaysia Chloride Process record: ${field}`)
    this.name = 'ChlorideProcessContractError'
  }
}

const text = z.string().min(1).max(20000).refine(value =>
  value.trim() === value && !/[<>\u0000-\u001f\u007f]/u.test(value), 'Plain text is required')
const sourceContext = z.strictObject({sourcePageId: z.literal('PRODUCT-PROC-CL')})
const action = (targetPageId: string, href: string, context?: typeof sourceContext): z.ZodType<ChlorideProcessAction> => (
  context
    ? z.strictObject({label: text, targetPageId: z.literal(targetPageId), href: z.literal(href), context})
    : z.strictObject({label: text, targetPageId: z.literal(targetPageId), href: z.literal(href)})
)
const empty = z.tuple([])
const step = z.strictObject({heading: text, paragraph: text})

const gradeSchema = z.strictObject({
  registeredPageId: z.enum(['GRADE-M350','GRADE-M510','GRADE-M896','GRADE-M895','GRADE-M200','GRADE-M210','GRADE-M340','GRADE-M886']),
  gradeNameOrModelCode: text,
  position: z.number().int().min(1).max(8),
  cleanUrl: text,
  summary: text,
  actionLabel: text,
})

const expectedGrades = new Map<string, Omit<ChlorideProcessGradeRelation, 'registeredPageId'>>([
  ['GRADE-M350',{gradeNameOrModelCode:'M-350',position:1,cleanUrl:'/products/m-350/',summary:'Excellent hue and high gloss with strong hiding power.',actionLabel:'View M-350'}],
  ['GRADE-M510',{gradeNameOrModelCode:'M-510',position:2,cleanUrl:'/products/m-510/',summary:'TMP/TME-free multi-application grade with high brightness and durability.',actionLabel:'View M-510'}],
  ['GRADE-M896',{gradeNameOrModelCode:'M-896',position:3,cleanUrl:'/products/m-896/',summary:'Superior weather resistance with high gloss and excellent opacity for demanding exterior coatings.',actionLabel:'View M-896'}],
  ['GRADE-M895',{gradeNameOrModelCode:'M-895',position:4,cleanUrl:'/products/m-895/',summary:'High-opacity, high-gloss coatings grade with good weather resistance.',actionLabel:'View M-895'}],
  ['GRADE-M200',{gradeNameOrModelCode:'M-200',position:5,cleanUrl:'/products/m-200/',summary:'High-durability exterior plastics grade with strong anti-chalking performance.',actionLabel:'View M-200'}],
  ['GRADE-M210',{gradeNameOrModelCode:'M-210',position:6,cleanUrl:'/products/m-210/',summary:'High hiding power and easy dispersion for polyolefin masterbatch.',actionLabel:'View M-210'}],
  ['GRADE-M340',{gradeNameOrModelCode:'M-340',position:7,cleanUrl:'/products/m-340/',summary:'High whiteness with strong high-temperature anti-yellowing performance.',actionLabel:'View M-340'}],
  ['GRADE-M886',{gradeNameOrModelCode:'M-886',position:8,cleanUrl:'/products/m-886/',summary:'Bright-white plastics grade with excellent dispersion and processability.',actionLabel:'View M-886'}],
])

const contractSchema = z.strictObject({
  identity: z.strictObject({
    pageId: z.literal('PRODUCT-PROC-CL'), siteScope: z.literal('tio2-my'), locale: z.literal('en'),
    path: z.literal('/products/chloride-process-titanium-dioxide/'), schemaVersion: z.literal('product-process-chloride-v0.1'),
  }),
  seo: z.strictObject({
    title: text, description: text,
    canonical: z.literal('https://tio2malaysia.com/products/chloride-process-titanium-dioxide/'),
    socialImage: z.null(),
  }),
  breadcrumb: z.tuple([
    action('HOME-001','/'), action('PRODUCT-000','/products/'),
    action('PRODUCT-PROC-CL','/products/chloride-process-titanium-dioxide/'),
  ]),
  modules: z.tuple([
    z.strictObject({id:z.literal('CL-01'),eyebrow:text,heading:text,paragraphs:z.tuple([text]),steps:empty,actions:z.tuple([
      action('PRODUCT-PROC-CL-GRADES','#explore-chloride-process-grades'), action('CONV-RFQ','/request-a-quote/',sourceContext),
    ])}),
    z.strictObject({id:z.literal('CL-02'),heading:text,paragraphs:z.tuple([text,text]),steps:empty,actions:z.tuple([
      action('RES-PROC','/resources/chloride-vs-sulfate-titanium-dioxide/'),
    ])}),
    z.strictObject({id:z.literal('CL-03'),heading:text,paragraphs:z.tuple([text]),steps:empty,actions:empty}),
    z.strictObject({id:z.literal('CL-04'),heading:text,paragraphs:empty,steps:z.tuple([step,step,step]),actions:z.tuple([
      action('APP-000','/applications/'), action('CONV-DOC','/request-documents/',sourceContext),
    ])}),
    z.strictObject({id:z.literal('CL-05'),heading:text,paragraphs:z.tuple([text]),steps:empty,actions:z.tuple([
      action('CONV-RFQ','/request-a-quote/',sourceContext),
    ])}),
  ]),
  grades: z.array(gradeSchema).length(8),
})

const sourceSchema = z.strictObject({
  id: text,
  modifiedGmt: z.string(),
  status: z.literal('publish'),
  siteScopes: z.strictObject({nodes: z.tuple([z.strictObject({slug: z.literal('tio2-my')})])}),
  publishingFields: z.strictObject({publicPath: z.literal('/products/chloride-process-titanium-dioxide')}),
  malaysiaChlorideProcessContractJson: z.string(),
})

function validateAndOrderGrades(grades: readonly ChlorideProcessGradeRelation[]): readonly ChlorideProcessGradeRelation[] {
  for (const [registeredPageId, expected] of expectedGrades) {
    const matches = grades.filter(grade => grade.registeredPageId === registeredPageId)
    if (matches.length !== 1) throw new ChlorideProcessContractError('Grade relation cardinality')
    const grade = matches[0]!
    if (
      grade.gradeNameOrModelCode !== expected.gradeNameOrModelCode ||
      grade.position !== expected.position || grade.cleanUrl !== expected.cleanUrl ||
      grade.summary !== expected.summary || grade.actionLabel !== expected.actionLabel
    ) throw new ChlorideProcessContractError(`Grade relation ${registeredPageId}`)
  }
  return [...grades].sort((left, right) => left.position - right.position)
}

export function toMalaysiaChlorideProcessPageDto(value: unknown): MalaysiaChlorideProcessPageDto {
  const source = sourceSchema.safeParse(value)
  if (!source.success) throw new ChlorideProcessContractError('identity or source')
  const modifiedGmt = normalizeWordPressGmt(source.data.modifiedGmt)
  if (!modifiedGmt) throw new ChlorideProcessContractError('modifiedGmt')
  let raw: unknown
  try { raw = JSON.parse(source.data.malaysiaChlorideProcessContractJson) }
  catch { throw new ChlorideProcessContractError('payload JSON') }
  const payload = contractSchema.safeParse(raw)
  if (!payload.success) throw new ChlorideProcessContractError('payload')
  const grades = validateAndOrderGrades(payload.data.grades as readonly ChlorideProcessGradeRelation[])
  return {...payload.data, grades, id: source.data.id, modifiedGmt, globalChrome} as MalaysiaChlorideProcessPageDto
}
