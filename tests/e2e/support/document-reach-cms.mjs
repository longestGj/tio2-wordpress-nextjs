import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', 'utf8'))
const requestDocumentsContract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json', 'utf8'))
const port = Number(process.env.DOC_REACH_CMS_PORT ?? 4013)
const upstream = process.env.DOC_REACH_CMS_UPSTREAM ?? 'http://127.0.0.1:8080/graphql'
const defaultSource = {
  id: 'document-reach-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
  malaysiaDocumentReachContractJson: JSON.stringify(contract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
  sourceReadiness: Object.fromEntries(contract.modules[6].items.map(({url}) => [url, true])),
}
let source = structuredClone(defaultSource)
const requestDocumentsSource = {
  id: 'request-documents-page-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/request-documents'},
  malaysiaRequestDocumentsContractJson: JSON.stringify(requestDocumentsContract),
}

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
  if (body.toString('utf8').includes('malaysiaRequestDocumentsRecordJson')) {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {malaysiaRequestDocumentsRecordJson: JSON.stringify(requestDocumentsSource)}}))
    return
  }
  try {
    const upstreamResponse = await fetch(upstream, {method: 'POST', headers: {'content-type': 'application/json'}, body})
    response.writeHead(upstreamResponse.status, {'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json'})
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
  } catch {
    response.writeHead(503, {'content-type': 'application/json'})
    response.end(JSON.stringify({errors: [{message: 'Controlled DOC-REACH upstream unavailable'}]}))
  }
}).listen(port, '127.0.0.1', () => process.stdout.write(`DOC-REACH CMS fixture listening on ${port}\n`))
