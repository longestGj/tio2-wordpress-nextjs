import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'
import {listenFixture} from './fixture-server.mjs'
import {requiredLocalUrl} from './required-local-url.ts'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json', 'utf8'))
const upstream = requiredLocalUrl('DOC_TDS_CMS_UPSTREAM', '/graphql').href

const source = {
  id: 'document-tds-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(contract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
}

listenFixture(createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  const text = body.toString('utf8')
  if (text.includes('malaysiaDocumentTdsRecordJson')) {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {malaysiaDocumentTdsRecordJson: JSON.stringify(source)}}))
    return
  }
  try {
    const upstreamResponse = await fetch(upstream, {
      method: request.method,
      headers: {'content-type': request.headers['content-type'] ?? 'application/json'},
      body,
    })
    response.writeHead(upstreamResponse.status, {'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json'})
    response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
  } catch (error) {
    response.writeHead(502, {'content-type': 'application/json'})
    response.end(JSON.stringify({errors: [{message: error instanceof Error ? error.message : 'CMS proxy failed'}]}))
  }
}))
