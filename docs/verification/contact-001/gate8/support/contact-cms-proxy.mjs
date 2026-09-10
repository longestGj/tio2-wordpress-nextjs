import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const port = Number(process.env.CONTACT_CMS_PORT ?? 4490)
const upstream = process.env.CONTACT_CMS_UPSTREAM ?? 'http://127.0.0.1:8080/graphql'
const contract = JSON.parse(readFileSync(
  new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json', import.meta.url),
  'utf8',
))

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
      if (String(parsed.query).includes('malaysiaContactPageRecordJson')) {
        const record = {
          id: 'contact-gate8-local-cms', modifiedGmt: '2026-09-10T08:00:00', status: 'publish',
          siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/contact'},
          malaysiaContactPageContractJson: JSON.stringify(contract),
        }
        response.writeHead(200, {'content-type': 'application/json'})
        response.end(JSON.stringify({data: {malaysiaContactPageRecordJson: JSON.stringify(record)}}))
        return
      }
      const upstreamResponse = await fetch(upstream, {
        method: 'POST', headers: {'content-type': 'application/json', accept: 'application/json'}, body,
      })
      response.writeHead(upstreamResponse.status, {'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json'})
      response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
    } catch (error) {
      response.writeHead(502, {'content-type': 'application/json'})
      response.end(JSON.stringify({errors: [{message: error instanceof Error ? error.message : 'proxy error'}]}))
    }
  })
}).listen(port, '127.0.0.1', () => process.stdout.write(`contact-gate8-cms:${port}\n`))
