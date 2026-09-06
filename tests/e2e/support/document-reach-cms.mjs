import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-document-reach.json', 'utf8'))
const port = Number(process.env.DOC_REACH_CMS_PORT ?? 4013)
const upstream = process.env.DOC_REACH_CMS_UPSTREAM ?? 'http://127.0.0.1:8080/graphql'
const source = {
  id: 'document-reach-e2e', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
  malaysiaDocumentReachContractJson: JSON.stringify(contract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
}

createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const body = Buffer.concat(chunks)
  if (body.toString('utf8').includes('malaysiaDocumentReachRecordJson')) {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {malaysiaDocumentReachRecordJson: JSON.stringify(source)}}))
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
