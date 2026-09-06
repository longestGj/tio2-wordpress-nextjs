import {createServer} from 'node:http'
import {readFileSync} from 'node:fs'

const contract = JSON.parse(readFileSync(
  new URL('../../wordpress/plugins/tio2-site-model/config/tio2-my-resource-proc.json', import.meta.url),
  'utf8',
))

function payload() {
  const value = structuredClone(contract)
  const approvedSources = value.externalSources.filter((source) => source.evidenceStatus === 'APPROVED')
  value.externalSources = approvedSources.map(({evidenceStatus: _status, ...source}) => source)
  value.applicationOverlap.evidenceAvailable = true
  value.eligibleRelations = value.relations
    .filter((relation) => (
      relation.sourcePageId === 'RES-PROC' &&
      relation.sourceSiteScope === 'tio2-my' &&
      relation.targetSiteScope === 'tio2-my' &&
      relation.contentStatus === 'APPROVED' &&
      relation.routeStatus === 'VERIFIED_PUBLIC' &&
      relation.canonicalStatus === 'VERIFIED' &&
      relation.publicEligibilityStatus === 'ELIGIBLE'
    ))
    .map(({relationKey, targetPageId, href, displayOrder}) => ({
      relationKey, targetPageId, href, displayOrder,
    }))
  value.schemaMode = 'BREADCRUMB_ONLY'
  delete value.internal
  delete value.releaseControls
  delete value.relations
  delete value.seo.primaryKeyword
  return value
}

const record = JSON.stringify({
  id: 'resource-proc-preview-82',
  modifiedGmt: '2026-09-06T00:30:00',
  status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]},
  publishingFields: {publicPath: contract.identity.path},
  resourceProcPayload: payload(),
})

const port = Number(process.env.RES_PROC_GRAPHQL_PORT ?? 4013)
createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/graphql') {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, {'content-type': 'application/json'})
  response.end(JSON.stringify({data: {malaysiaResourceProcRecordJson: record}}))
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`RES-PROC preview GraphQL ready on ${port}\n`)
})
