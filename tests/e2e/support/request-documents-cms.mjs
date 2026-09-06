import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync(
  new URL('../../../wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json', import.meta.url),
  'utf8',
))
const port = Number(process.env.REQUEST_DOCUMENTS_CMS_PORT || 3100)
const source = {
  id: 'request-documents-page-e2e', modifiedGmt: '2026-09-03T10:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/request-documents'},
  malaysiaRequestDocumentsContractJson: JSON.stringify(contract),
}

createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/graphql') {
    response.writeHead(404).end()
    return
  }
  let body = ''
  request.on('data', (chunk) => { body += chunk })
  request.on('end', () => {
    let query = ''
    try { query = JSON.parse(body).query ?? '' } catch { /* fail below */ }
    if (!query.includes('malaysiaRequestDocumentsRecordJson')) {
      response.writeHead(400, {'content-type': 'application/json'}).end(JSON.stringify({errors: [{message: 'Unexpected query'}]}))
      return
    }
    response.writeHead(200, {'content-type': 'application/json'})
    response.end(JSON.stringify({data: {malaysiaRequestDocumentsRecordJson: JSON.stringify(source)}}))
  })
}).listen(port, '127.0.0.1', () => process.stdout.write(`request-documents-cms:${port}\n`))
