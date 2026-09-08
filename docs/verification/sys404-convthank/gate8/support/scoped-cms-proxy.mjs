import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const port = Number(process.env.SYS404_THANK_CMS_PORT ?? 4380)
const upstream = process.env.SYS404_THANK_CMS_UPSTREAM ?? 'http://127.0.0.1:8080/graphql'
const countryContracts = {
  'MARKET-EU-ES': 'tio2-my-market-eu-es.json',
  'MARKET-IN-001': 'tio2-my-market-in-001.json',
  'MARKET-EU-NL': 'tio2-my-market-eu-nl.json',
  'MARKET-EU-BE': 'tio2-my-market-eu-be.json',
}
const polandContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json', import.meta.url),
  'utf8',
))
const ukContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json', import.meta.url),
  'utf8',
))
const formContracts = Object.fromEntries([
  ['malaysiaRfqPageRecordJson', 'tio2-my-rfq-page.json', '/request-a-quote', 'malaysiaRfqPageContractJson'],
  ['malaysiaRequestDocumentsRecordJson', 'tio2-my-request-documents.json', '/request-documents', 'malaysiaRequestDocumentsContractJson'],
  ['malaysiaRequestSampleRecordJson', 'tio2-my-request-sample.json', '/request-sample', 'malaysiaRequestSampleContractJson'],
].map(([field, file, publicPath, payloadField]) => [field, {
  publicPath,
  payloadField,
  contract: JSON.parse(readFileSync(
    new URL(`../../../../../wordpress/plugins/tio2-site-model/config/${file}`, import.meta.url),
    'utf8',
  )),
}]))
const chlorideContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json', import.meta.url),
  'utf8',
))
const documentCooContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-document-coo.json', import.meta.url),
  'utf8',
))
const documentReachContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', import.meta.url),
  'utf8',
))
const documentTdsContract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json', import.meta.url),
  'utf8',
))
const brazilFixtures = Object.fromEntries([
  ['malaysiaBrazilEnMarketRecordJson', 'tio2-my-market-brazil-en.json', '/markets/brazil', 'malaysiaBrazilEnMarketContractJson'],
  ['malaysiaBrazilPtMarketRecordJson', 'tio2-my-market-brazil-pt.json', '/pt-br/markets/brazil', 'malaysiaBrazilPtMarketContractJson'],
].map(([field, file, publicPath, payloadField]) => [field, {
  publicPath,
  payloadField,
  contract: JSON.parse(readFileSync(
    new URL(`../../../../../wordpress/plugins/tio2-site-model/config/${file}`, import.meta.url),
    'utf8',
  )),
}]))

function countryResponse(pageId) {
  const file = countryContracts[pageId]
  if (!file) return null
  const contract = JSON.parse(readFileSync(new URL(`../../../../../wordpress/plugins/tio2-site-model/config/${file}`, import.meta.url), 'utf8'))
  return JSON.stringify({
    id: `gate8-country-${pageId}`,
    modifiedGmt: '2026-09-08T01:02:03',
    status: 'publish',
    recordPageId: pageId,
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: contract.identity.path.replace(/\/$/u, '')},
    malaysiaCountryMarketContractJson: JSON.stringify(contract),
  })
}

createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/graphql') {
    response.writeHead(404).end()
    return
  }
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', async () => {
    try {
      const parsed = JSON.parse(body)
      if (String(parsed.query).includes('malaysiaCountryMarketRecordJson')) {
        const record = countryResponse(parsed.variables?.pageId)
        response.writeHead(record ? 200 : 400, {'content-type': 'application/json'})
        response.end(JSON.stringify(record
          ? {data: {malaysiaCountryMarketRecordJson: record}}
          : {errors: [{message: 'Unsupported country fixture'}]}))
        return
      }
      if (String(parsed.query).includes('malaysiaPolandMarketRecordJson')) {
        const record = {
          id: 'gate8-market-eu-pl',
          modifiedGmt: '2026-09-08T01:02:03',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/markets/poland'},
          malaysiaPolandMarketContractJson: JSON.stringify(polandContract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaPolandMarketRecordJson: JSON.stringify(record)}}))
        return
      }
      if (String(parsed.query).includes('malaysiaUkMarketRecordJson')) {
        const record = {
          id: 'gate8-market-uk-001',
          modifiedGmt: '2026-09-08T01:02:03',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/markets/united-kingdom'},
          malaysiaUkMarketContractJson: JSON.stringify(ukContract),
          routeReadiness: Object.fromEntries(ukContract.routeRegistry.map((route) => [route.targetPageId, false])),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaUkMarketRecordJson: JSON.stringify(record)}}))
        return
      }
      const formField = Object.keys(formContracts).find((field) => String(parsed.query).includes(field))
      if (formField) {
        const fixture = formContracts[formField]
        const record = {
          id: `gate8-${formField}`,
          modifiedGmt: '2026-09-08T01:02:03',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: fixture.publicPath},
          [fixture.payloadField]: JSON.stringify(fixture.contract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {[formField]: JSON.stringify(record)}}))
        return
      }
      if (String(parsed.query).includes('malaysiaChlorideProcessRecordJson')) {
        const record = {
          id: 'gate8-product-proc-cl',
          modifiedGmt: '2026-09-08T01:02:03',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/products/chloride-process-titanium-dioxide'},
          malaysiaChlorideProcessContractJson: JSON.stringify(chlorideContract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaChlorideProcessRecordJson: JSON.stringify(record)}}))
        return
      }
      if (String(parsed.query).includes('malaysiaDocumentCooRecordJson')) {
        const record = {
          id: 'gate8-document-coo',
          modifiedGmt: '2026-09-08T08:00:00',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/documents/certificate-of-origin'},
          malaysiaDocumentCooContractJson: JSON.stringify(documentCooContract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaDocumentCooRecordJson: JSON.stringify(record)}}))
        return
      }
      if (String(parsed.query).includes('malaysiaDocumentReachRecordJson')) {
        const sourceItems = documentReachContract.modules[6].items
        const record = {
          id: 'gate8-document-reach',
          modifiedGmt: '2026-09-08T08:00:00',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/documents/reach'},
          malaysiaDocumentReachContractJson: JSON.stringify(documentReachContract),
          routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
          sourceReadiness: Object.fromEntries(sourceItems.map(({url}) => [url, true])),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaDocumentReachRecordJson: JSON.stringify(record)}}))
        return
      }
      if (String(parsed.query).includes('malaysiaDocumentTdsRecordJson')) {
        const record = {
          id: 'gate8-document-tds',
          modifiedGmt: '2026-09-08T08:00:00',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: '/documents/tds-sds-coa'},
          malaysiaDocumentTdsContractJson: JSON.stringify(documentTdsContract),
          routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaDocumentTdsRecordJson: JSON.stringify(record)}}))
        return
      }
      const brazilField = Object.keys(brazilFixtures).find((field) => String(parsed.query).includes(field))
      if (brazilField) {
        const fixture = brazilFixtures[brazilField]
        const record = {
          id: `gate8-${brazilField}`,
          modifiedGmt: '2026-09-08T08:00:00',
          status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]},
          publishingFields: {publicPath: fixture.publicPath},
          [fixture.payloadField]: JSON.stringify(fixture.contract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {[brazilField]: JSON.stringify(record)}}))
        return
      }
      const upstreamResponse = await fetch(upstream, {
        method: 'POST',
        headers: {'content-type': 'application/json', accept: 'application/json'},
        body,
      })
      response.writeHead(upstreamResponse.status, {'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json'})
      response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
    } catch (error) {
      response.writeHead(502, {'content-type': 'application/json'})
      response.end(JSON.stringify({errors: [{message: error instanceof Error ? error.message : 'proxy error'}]}))
    }
  })
}).listen(port, '127.0.0.1', () => process.stdout.write(`sys404-thank-scoped-cms:${port}\n`))
