import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json', 'utf8'))
const port = Number(process.env.DOC_TDS_CMS_PORT ?? 4012)
const upstream = process.env.DOC_TDS_CMS_UPSTREAM ?? 'http://127.0.0.1:8080/graphql'

const source = {
  id: 'document-tds-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(contract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
}

createServer(async (request, response) => {
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
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`DOC-TDS CMS fixture listening on ${port}\n`)
})
