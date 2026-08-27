import {readFile} from 'node:fs/promises'

import {loadEditorialTypeScriptModule} from './runtime-loader.mjs'

const USAGE = 'Usage: node scripts/editorial/validate-site-a-content-graph.mjs [--allow-incomplete] --applications <manifest.json> --resources <manifest.json> --products <manifest.json>'

function parseArguments(args) {
  const allowIncomplete = args.filter((argument) => argument === '--allow-incomplete').length === 1
  const valuesArgs = args.filter((argument) => argument !== '--allow-incomplete')
  if (valuesArgs.length !== 6 || args.length !== valuesArgs.length + Number(allowIncomplete)) throw new Error(USAGE)
  const values = new Map()
  for (let index = 0; index < valuesArgs.length; index += 2) {
    const flag = valuesArgs[index]
    const value = valuesArgs[index + 1]
    if (!['--applications', '--resources', '--products'].includes(flag) || !value || values.has(flag)) throw new Error(USAGE)
    values.set(flag, value)
  }
  if (values.size !== 3) throw new Error(USAGE)
  return {allowIncomplete, applicationsPath: values.get('--applications'), resourcesPath: values.get('--resources'), productsPath: values.get('--products')}
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error)
}

try {
  const {allowIncomplete, applicationsPath, resourcesPath, productsPath} = parseArguments(process.argv.slice(2))
  const [applications, resources, products] = await Promise.all([applicationsPath, resourcesPath, productsPath].map(async (path) => JSON.parse(await readFile(path, 'utf8'))))
  const applicationApi = await loadEditorialTypeScriptModule(new URL('../../lib/applications/content-manifest.ts', import.meta.url))
  const resourceApi = await loadEditorialTypeScriptModule(new URL('../../lib/resources/content-manifest.ts', import.meta.url))
  applicationApi.validateSiteAApplicationManifest(applications, {allowIncomplete})
  resourceApi.validateSiteAResourceManifest(resources, {allowIncomplete})
  const {validateSiteAEditorialGraph} = await loadEditorialTypeScriptModule(new URL('../../lib/editorial/content-graph.ts', import.meta.url))
  const unresolvedEdges = validateSiteAEditorialGraph({applications, resources, products}, {allowIncomplete})
  if (unresolvedEdges.length > 0) {
    console.error(JSON.stringify({unresolvedEdges}, null, 2))
    process.exitCode = 1
  } else process.stdout.write(`${JSON.stringify({unresolvedEdges})}\n`)
} catch (error) {
  console.error(formatError(error))
  process.exitCode = 1
}
