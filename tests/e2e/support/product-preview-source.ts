import {createHmac, timingSafeEqual} from 'node:crypto'
import {createServer} from 'node:http'

import {validProductPageInput} from '../../fixtures/product-page'

export interface PreviewSourceRequest {
  readonly method: string
  readonly path: string
  readonly signatureValid: boolean
  readonly siteId: string
  readonly timestampValid: boolean
}

interface ProductPreviewSourceOptions {
  readonly canonicalPath: string
  readonly port?: number
  readonly requestLog?: PreviewSourceRequest[]
  readonly secret: string
}

export interface ProductPreviewSource {
  readonly requests: PreviewSourceRequest[]
  readonly url: string
  close(): Promise<void>
}

function productPreviewPayload() {
  const product = validProductPageInput
  return {
    id: 'test-owned-product-preview',
    databaseId: 911,
    siteId: 'tio2-a',
    path: product.identity.path,
    slug: product.identity.slug,
    title: product.identity.title,
    modifiedGmt: product.identity.modified,
    status: 'draft',
    productFields: {
      productId: product.identity.productId,
      family: product.identity.family,
      metaTitle: product.seo.title,
      metaDescription: product.seo.description,
      eyebrow: product.hero.eyebrow,
      customerProblemHeadline: product.hero.problemHeadline,
      quickAnswer: product.hero.quickAnswer,
      productType: product.snapshot.productType,
      process: product.snapshot.process,
      primaryApplication: product.snapshot.primaryApplication,
      positioning: product.snapshot.positioning,
      surfaceTreatment: product.snapshot.surfaceTreatment,
      packaging: product.packaging,
      tdsAccess: product.tdsAccess,
      fitWhen: product.selection.fitWhen.map((item) => ({item})),
      discussFirstWhen: product.selection.discussFirstWhen.map((item) => ({item})),
      performancePriorities: product.performancePriorities,
      recommendedApplications: product.recommendedApplications,
      evidenceStatement: product.evidenceHtml,
      typicalProperties: product.typicalProperties.map((property) => ({
        ...property,
        method: 'method' in property ? property.method : '',
        note: 'note' in property ? property.note : '',
      })),
      validationChecklist: product.validationChecklist.map((item) => ({item})),
      faqItems: product.faqs.map(({question, answerHtml}) => ({
        question,
        answer: answerHtml,
      })),
      relatedLinks: product.relatedLinks,
    },
    productSettingsFields: {
      inquiryFields: product.enquiryFields,
      requestTdsCta: product.ctas.requestTds,
      discussApplicationCta: product.ctas.discussApplication,
      technicalDisclaimer: product.disclaimerHtml,
    },
  }
}

function signatureMatches(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual)) return false
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export async function startProductPreviewSource({
  canonicalPath,
  port = 0,
  requestLog = [],
  secret,
}: ProductPreviewSourceOptions): Promise<ProductPreviewSource> {
  if (canonicalPath !== validProductPageInput.identity.path) {
    throw new Error('Test-owned preview source requires its canonical Product path')
  }
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (
      request.method !== 'GET' ||
      url.pathname !== '/wp-json/tio2/v1/preview'
    ) {
      response.writeHead(404, {'cache-control': 'no-store'})
      response.end()
      return
    }

    const siteId = url.searchParams.get('siteId') ?? ''
    const path = url.searchParams.get('path') ?? ''
    const timestamp = request.headers['x-tio2-preview-timestamp']
    const signature = request.headers['x-tio2-preview-signature']
    const timestampValue = typeof timestamp === 'string' ? timestamp : ''
    const signatureValue = typeof signature === 'string' ? signature : ''
    const timestampValid =
      /^[1-9][0-9]{9}$/u.test(timestampValue) &&
      Math.abs(Math.floor(Date.now() / 1000) - Number(timestampValue)) <= 60
    const expectedSignature = createHmac('sha256', secret)
      .update(`${timestampValue}\ntio2-a\n${canonicalPath}`)
      .digest('hex')
    const requestAudit: PreviewSourceRequest = {
      method: request.method,
      path,
      signatureValid: signatureMatches(signatureValue, expectedSignature),
      siteId,
      timestampValid,
    }
    requestLog.push(requestAudit)

    if (
      url.searchParams.size !== 2 ||
      siteId !== 'tio2-a' ||
      path !== canonicalPath ||
      !timestampValid ||
      !requestAudit.signatureValid
    ) {
      response.writeHead(401, {
        'cache-control': 'no-store',
        'content-type': 'application/json',
      })
      response.end(JSON.stringify({error: 'invalid preview request'}))
      return
    }

    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    })
    response.end(JSON.stringify(productPreviewPayload()))
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(port, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Test-owned preview source did not bind to a TCP port')
  }

  return {
    requests: requestLog,
    url: `http://127.0.0.1:${address.port}/wp-json/tio2/v1/preview`,
    async close(): Promise<void> {
      if (!server.listening) return
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) rejectClose(error)
          else resolveClose()
        })
      })
    },
  }
}
