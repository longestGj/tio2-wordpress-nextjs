import {NextResponse, type NextRequest} from 'next/server'

import {
  resolveMalaysiaRfqAttributionToken,
  MALAYSIA_RFQ_ATTRIBUTION_COOKIE,
} from '@/lib/rfq/malaysia-rfq-private-attribution'
import {submitMalaysiaRfq, type MalaysiaRfqSubmission} from '@/lib/rfq/malaysia-rfq-receiver'
import {validateMalaysiaRfqValues} from '@/lib/rfq/malaysia-rfq-validation'

const fields = [
  'grade_id', 'application_id', 'quantity_mt', 'destination_country', 'destination_port_city',
  'company_name', 'contact_name', 'business_email', 'phone_whatsapp', 'website',
  'additional_requirements',
] as const

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({kind: 'submission_unconfirmed'}, {status: 400})
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({kind: 'submission_unconfirmed'}, {status: 400})
  }
  const record = body as Record<string, unknown>
  if (fields.some((field) => typeof record[field] !== 'string')) {
    return NextResponse.json({kind: 'submission_unconfirmed'}, {status: 400})
  }
  const value = (field: typeof fields[number]) => record[field] as string
  const cookie = request.cookies.get(MALAYSIA_RFQ_ATTRIBUTION_COOKIE)?.value
  const source = resolveMalaysiaRfqAttributionToken(cookie, process.env.TIO2_MY_RFQ_ATTRIBUTION_SECRET)
  const values: MalaysiaRfqSubmission = {
    grade_id: value('grade_id'),
    application_id: value('application_id'),
    quantity_mt: value('quantity_mt'),
    destination_country: value('destination_country'),
    destination_port_city: value('destination_port_city'),
    company_name: value('company_name'),
    contact_name: value('contact_name'),
    business_email: value('business_email'),
    phone_whatsapp: value('phone_whatsapp'),
    website: value('website'),
    additional_requirements: value('additional_requirements'),
    source_page_id: source,
  }
  const validation = validateMalaysiaRfqValues(values)
  if (!validation.valid) return NextResponse.json({kind: 'submission_unconfirmed'}, {status: 400})
  const result = await submitMalaysiaRfq(values, {
    accessKey: process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY ?? null,
    endpoint: process.env.TIO2_MY_WEB3FORMS_ENDPOINT,
  })
  const response = NextResponse.json(result, {headers: {'cache-control': 'no-store'}})
  if (source) response.cookies.set(MALAYSIA_RFQ_ATTRIBUTION_COOKIE, '', {path: '/', maxAge: 0})
  return response
}
