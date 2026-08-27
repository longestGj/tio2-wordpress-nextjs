import {readFile} from 'node:fs/promises'

import {loadEditorialTypeScriptModule} from './runtime-loader.mjs'

const USAGE = 'Usage: node scripts/editorial/validate-site-a-applications.mjs [--allow-incomplete] <manifest.json>'

function formatError(error) {
  if (error && typeof error === 'object' && Array.isArray(error.issues)) return error.issues.map((issue) => `${issue.path?.join('.') || 'manifest'}: ${issue.message}`).join('\n')
  return error instanceof Error ? error.message : String(error)
}

function parseArguments(args) {
  const allowIncomplete = args.filter((argument) => argument === '--allow-incomplete').length === 1
  const paths = args.filter((argument) => argument !== '--allow-incomplete')
  if (paths.length !== 1 || args.length !== paths.length + Number(allowIncomplete) || paths.some((argument) => argument.startsWith('-'))) throw new Error(USAGE)
  return {allowIncomplete, inputPath: paths[0]}
}

try {
  const {allowIncomplete, inputPath} = parseArguments(process.argv.slice(2))
  const input = JSON.parse(await readFile(inputPath, 'utf8'))
  const {validateSiteAApplicationManifest} = await loadEditorialTypeScriptModule(new URL('../../lib/applications/content-manifest.ts', import.meta.url))
  const manifest = validateSiteAApplicationManifest(input, {allowIncomplete})
  process.stdout.write(`${JSON.stringify({count: manifest.records.length, recordIds: manifest.records.map(({identity}) => identity.id).sort()})}\n`)
} catch (error) {
  console.error(formatError(error))
  process.exitCode = 1
}
