import {createServer} from 'node:http'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

const port = Number(process.env.CONTACT_CMS_PORT ?? 4510)
const upstream = process.env.CONTACT_CMS_UPSTREAM ?? 'http://127.0.0.1:8180/graphql'
const contractUrl = new URL('../../../../../wordpress/plugins/tio2-site-model/config/tio2-my-contact-page.json', import.meta.url)
const contractBytes = readFileSync(contractUrl)
const contract = JSON.parse(contractBytes.toString('utf8'))
const contractSha256 = createHash('sha256').update(contractBytes).digest('hex')

createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/identity') {
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({
      mode: 'prerelease-3100-gate8-composite-cms',
      upstream,
      contactContractSha256: contractSha256,
    }))
    return
  }
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
      const headers = {'content-type': 'application/json', accept: 'application/json'}
      const editorialToken = request.headers['x-tio2-editorial-token']
      if (typeof editorialToken === 'string') headers['x-tio2-editorial-token'] = editorialToken
      const upstreamResponse = await fetch(upstream, {method: 'POST', headers, body})
      response.writeHead(upstreamResponse.status, {'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json'})
      response.end(Buffer.from(await upstreamResponse.arrayBuffer()))
    } catch (error) {
      response.writeHead(502, {'content-type': 'application/json'})
      response.end(JSON.stringify({errors: [{message: error instanceof Error ? error.message : 'proxy error'}]}))
    }
  })
}).listen(port, '127.0.0.1', () => process.stdout.write(`prerelease-3100-gate8-cms:${port}\n`))
