import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', 'utf8'))
const port = Number(process.env.DOC_REACH_CMS_PORT ?? 4013)
const loadContract = (name) => JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/${name}.json`, 'utf8'))
const record = (pageId, path, field, payload) => ({
  id: `${pageId}-integrated-e2e`, modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: path},
  [field]: JSON.stringify(payload),
})
// These are CMS transport records, consumed by the real production DTOs/routes.
// No proxy to a separately seeded WordPress instance or other scope is allowed.
const dependencies = {
  'MARKET-000': {field: 'malaysiaMarketHubRecordJson', source: record('MARKET-000', '/markets', 'malaysiaMarketHubContractJson', loadContract('tio2-my-market-hub'))},
  'PRODUCT-000': {field: 'malaysiaProductHubRecordJson', source: record('PRODUCT-000', '/products', 'malaysiaProductHubContractJson', loadContract('tio2-my-product-hub'))},
  'RES-000': {field: 'malaysiaResourceHubRecordJson', source: {
    ...record('RES-000', '/resources', 'malaysiaResourceHubContractJson', loadContract('tio2-my-resource-hub')),
    resourceProjection: {publicState: 'H0_NO_QUALIFIED_RESOURCE', featuredResources: [], latestResources: []},
  }},
  'ABOUT-001': {field: 'malaysiaAboutPageRecordJson', source: {
    ...record('ABOUT-001', '/about', 'malaysiaAboutPageContractJson', loadContract('tio2-my-about-page')),
    malaysiaAboutPageEvidenceJson: JSON.stringify(loadContract('tio2-my-about-evidence')),
  }},
  'DOC-000': {field: 'malaysiaDocumentsHubRecordJson', source: record('DOC-000', '/documents', 'malaysiaDocumentsHubContractJson', loadContract('tio2-my-documents-hub'))},
  'MARKET-EU-001': {field: 'malaysiaEuMarketRecordJson', source: record('MARKET-EU-001', '/markets/european-union', 'malaysiaEuMarketContractJson', loadContract('tio2-my-market-eu-001'))},
  'CONV-DOC': {field: 'malaysiaRequestDocumentsRecordJson', source: record('CONV-DOC', '/request-documents', 'malaysiaRequestDocumentsContractJson', loadContract('tio2-my-request-documents'))},
  'CONV-RFQ': {field: 'malaysiaRfqPageRecordJson', source: record('CONV-RFQ', '/request-a-quote', 'malaysiaRfqPageContractJson', loadContract('tio2-my-rfq-page'))},
  'LEGAL': {field: 'malaysiaLegalPagesRecordJson', source: loadContract('tio2-my-legal-pages').pages.map((page) => record(page.pageId, page.path.replace(/\/$/u, ''), 'malaysiaLegalPageContractJson', page))},
}
const homepageSource = {
  ...record('HOME-001', '/', 'malaysiaHomepageContractJson', loadContract('tio2-my-homepage')),
  homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
}
dependencies['PRODUCT-000'].source.routeReadiness = Object.fromEntries(
  loadContract('tio2-my-product-hub').routeRegistry.map(({targetPageId}) => [targetPageId, Object.hasOwn(dependencies, targetPageId)]),
)
const routeKeys = ['CONV-DOC', 'DOC-000', 'MARKET-EU-001']
const defaultRouteReadiness = Object.fromEntries(routeKeys.map((pageId) => [pageId,
  dependencies[pageId].source.status === 'publish' &&
  dependencies[pageId].source.siteScopes.nodes.length === 1 &&
  dependencies[pageId].source.siteScopes.nodes[0].slug === 'tio2-my',
]))
const defaultSource = {
  id: 'document-reach-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
  malaysiaDocumentReachContractJson: JSON.stringify(contract),
  routeReadiness: defaultRouteReadiness,
  sourceReadiness: Object.fromEntries(contract.modules[6].items.map(({url}) => [url, true])),
}
let source = structuredClone(defaultSource)

function isBooleanRecord(value, approvedKeys) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length === approvedKeys.length &&
    approvedKeys.every((key) => typeof value[key] === 'boolean')
}

function updateState(input) {
  if (input?.reset === true && Object.keys(input).length === 1) {
    source = structuredClone(defaultSource)
    return true
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return false
  const allowed = new Set(['routeReadiness', 'sourceReadiness', 'siteScopes'])
  if (Object.keys(input).some((key) => !allowed.has(key))) return false
  const routeKeys = Object.keys(defaultSource.routeReadiness)
  const sourceKeys = Object.keys(defaultSource.sourceReadiness)
  if (input.routeReadiness !== undefined && !isBooleanRecord(input.routeReadiness, routeKeys)) return false
  if (input.sourceReadiness !== undefined && !isBooleanRecord(input.sourceReadiness, sourceKeys)) return false
  if (input.siteScopes !== undefined &&
      (!Array.isArray(input.siteScopes) || input.siteScopes.some((slug) => typeof slug !== 'string'))) return false
  source = {
    ...source,
    ...(input.routeReadiness === undefined ? {} : {routeReadiness: {...input.routeReadiness}}),
    ...(input.sourceReadiness === undefined ? {} : {sourceReadiness: {...input.sourceReadiness}}),
    ...(input.siteScopes === undefined ? {} : {siteScopes: {nodes: input.siteScopes.map((slug) => ({slug}))}}),
  }
  return true
}

createServer(async (request, response) => {
  if (request.url === '/__health' && request.method === 'GET') {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({ok: true}))
    return
  }
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  if (request.url === '/__state' && request.method === 'PUT') {
    let input
    try {
      input = JSON.parse(body.toString('utf8'))
    } catch {
      response.writeHead(400, {'content-type': 'application/json'})
      response.end(JSON.stringify({ok: false, error: 'Invalid JSON'}))
      return
    }
    if (!updateState(input)) {
      response.writeHead(400, {'content-type': 'application/json'})
      response.end(JSON.stringify({ok: false, error: 'Invalid controlled fixture state'}))
      return
    }
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({ok: true}))
    return
  }
  if (body.toString('utf8').includes('malaysiaDocumentReachRecordJson')) {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {malaysiaDocumentReachRecordJson: JSON.stringify(source)}}))
    return
  }
  if (body.toString('utf8').includes('GetMalaysiaHomepage')) {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {tio2Homepage: homepageSource}}))
    return
  }
  for (const [pageId, dependency] of Object.entries(dependencies)) {
    if (!body.toString('utf8').includes(dependency.field)) continue
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify(source.routeReadiness[pageId] === false
      ? {errors: [{message: `Controlled dependency ${pageId} is unavailable`}]}
      : {data: {[dependency.field]: JSON.stringify(dependency.source)}}))
    return
  }
  response.writeHead(400, {'content-type': 'application/json'})
  response.end(JSON.stringify({errors: [{message: 'Query outside the integrated DOC-REACH fixture registry'}]}))
}).listen(port, '127.0.0.1', () => process.stdout.write(`DOC-REACH CMS fixture listening on ${port}\n`))
