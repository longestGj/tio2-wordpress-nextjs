import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import {resolve} from 'node:path'

const root = resolve('.')
const output = resolve(root, 'docs/verification/tio2-my/trade4-app5-gate9-cms-alignment-20260908/direct-cms-readback.json')
const env = Object.fromEntries((await readFile(resolve(root, 'wordpress/.env'), 'utf8')).split(/\r?\n/).filter((line) => /^[^#=]+=/.test(line)).map((line) => {
  const index = line.indexOf('=')
  return [line.slice(0, index), line.slice(index + 1)]
}))
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const config = async (filename) => readFile(resolve(root, 'wordpress/plugins/tio2-site-model/config', filename), 'utf8')

async function graphql(query, variables = {}, editorial = false) {
  const response = await fetch('http://127.0.0.1:8186/graphql', {
    method: 'POST',
    headers: {'content-type': 'application/json', ...(editorial ? {'x-tio2-editorial-token': env.WORDPRESS_EDITORIAL_API_TOKEN} : {})},
    body: JSON.stringify({query, variables}),
  })
  const result = await response.json()
  if (!response.ok || result.errors) throw new Error(JSON.stringify({status: response.status, errors: result.errors}))
  return result.data
}

const editorialQuery = 'query($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}'
const editorial = []
for (const [pageId, filename] of [
  ['APP-COAT', 'tio2-my-editorial-app-coat.json'],
  ['RES-TRADE-UK', 'tio2-my-editorial-res-trade-uk.json'],
]) {
  const data = await graphql(editorialQuery, {pageId, siteScope: 'tio2-my'}, true)
  const envelope = JSON.parse(data.malaysiaEditorialRecordJson)
  const expected = await config(filename)
  const contract = envelope.editorialContractJson
  const parsed = JSON.parse(contract)
  editorial.push({
    pageId,
    recordId: envelope.id,
    siteScopes: envelope.siteScopes.nodes.map(({slug}) => slug),
    publicPath: envelope.publishingFields.publicPath,
    exactApprovedBytes: contract === expected,
    storedSha256: sha256(contract),
    approvedSha256: sha256(expected),
    provisional: parsed.identity.provisional,
    oldUkUrlCount: (contract.match(/https:\/\/www\.gov\.uk\/guidance\/trade-remedies/g) ?? []).length,
    maintainedUkUrlCount: (contract.match(/https:\/\/www\.gov\.uk\/guidance\/check-when-you-need-to-pay-anti-dumping-countervailing-and-safeguard-duties/g) ?? []).length,
  })
}

const rfqData = await graphql('{malaysiaRfqPageRecordJson}')
const rfqEnvelope = JSON.parse(rfqData.malaysiaRfqPageRecordJson)
const rfqExpected = await config('tio2-my-rfq-page.json')
const rfqContract = rfqEnvelope.malaysiaRfqPageContractJson
const rfqParsed = JSON.parse(rfqContract)

const brazilData = await graphql('{malaysiaBrazilEnMarketRecordJson malaysiaBrazilPtMarketRecordJson}')
const brazil = []
for (const [pageId, field, contractField, filename] of [
  ['MARKET-BR-EN', 'malaysiaBrazilEnMarketRecordJson', 'malaysiaBrazilEnMarketContractJson', 'tio2-my-market-brazil-en.json'],
  ['MARKET-BR-PT', 'malaysiaBrazilPtMarketRecordJson', 'malaysiaBrazilPtMarketContractJson', 'tio2-my-market-brazil-pt.json'],
]) {
  const envelope = JSON.parse(brazilData[field])
  const expected = await config(filename)
  const contract = envelope[contractField]
  brazil.push({
    pageId,
    recordId: envelope.id,
    exactApprovedSemanticContract: JSON.stringify(JSON.parse(contract)) === JSON.stringify(JSON.parse(expected)),
    rawByteEqual: contract === expected,
    storedSha256: sha256(contract),
    approvedSha256: sha256(expected),
  })
}

const result = {
  checkedAt: new Date().toISOString(),
  endpoint: 'http://127.0.0.1:8186/graphql',
  overlayUsed: false,
  writesPerformedByReadback: false,
  editorial,
  rfq: {
    pageId: 'CONV-RFQ',
    recordId: rfqEnvelope.id,
    exactApprovedBytes: rfqContract === rfqExpected,
    storedSha256: sha256(rfqContract),
    approvedSha256: sha256(rfqExpected),
    approvedSourcePageIds: rfqParsed.prefill.approvedSourcePageIds,
    brazilSourceIdsPresent: ['MARKET-BR-EN', 'MARKET-BR-PT'].every((id) => rfqParsed.prefill.approvedSourcePageIds.includes(id)),
  },
  brazil,
}

await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
const valid = editorial.every((entry) => entry.exactApprovedBytes) && result.rfq.exactApprovedBytes && result.rfq.brazilSourceIdsPresent && brazil.every((entry) => entry.exactApprovedSemanticContract)
if (!valid) process.exitCode = 1
