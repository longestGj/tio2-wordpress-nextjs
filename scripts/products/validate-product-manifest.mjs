import {randomUUID} from 'node:crypto'
import {readFile, rm, writeFile} from 'node:fs/promises'

import ts from 'typescript'

const USAGE = 'Usage: node scripts/products/validate-product-manifest.mjs [--allow-incomplete] <manifest.json>'
const MANIFEST_SOURCE_URL = new URL(
  '../../lib/products/content-manifest.ts',
  import.meta.url,
)

async function loadManifestApi() {
  const source = await readFile(MANIFEST_SOURCE_URL, 'utf8')
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
    fileName: 'content-manifest.ts',
    reportDiagnostics: true,
  })
  const errors = result.diagnostics?.filter(
    ({category}) => category === ts.DiagnosticCategory.Error,
  ) ?? []
  if (errors.length > 0) {
    throw new Error(ts.formatDiagnostics(errors, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => process.cwd(),
      getNewLine: () => '\n',
    }))
  }

  const temporaryModuleUrl = new URL(
    `.content-manifest.${process.pid}.${randomUUID()}.mjs`,
    MANIFEST_SOURCE_URL,
  )
  await writeFile(temporaryModuleUrl, result.outputText, {
    encoding: 'utf8',
    flag: 'wx',
  })
  try {
    return await import(temporaryModuleUrl.href)
  } finally {
    await rm(temporaryModuleUrl, {force: true})
  }
}

function parseArguments(args) {
  const allowIncomplete = args.includes('--allow-incomplete')
  const paths = args.filter((argument) => argument !== '--allow-incomplete')
  const unknownFlags = paths.filter((argument) => argument.startsWith('-'))
  const flagCount = args.filter((argument) => argument === '--allow-incomplete').length

  if (paths.length !== 1 || unknownFlags.length > 0 || flagCount > 1) {
    throw new Error(USAGE)
  }
  return {allowIncomplete, inputPath: paths[0]}
}

function formatError(error) {
  if (error && typeof error === 'object' && Array.isArray(error.issues)) {
    return error.issues.map((issue) => {
      const path = Array.isArray(issue.path) && issue.path.length > 0
        ? issue.path.join('.')
        : 'manifest'
      return `${path}: ${issue.message}`
    }).join('\n')
  }
  return error instanceof Error ? error.message : String(error)
}

async function main() {
  let parsedArguments
  try {
    parsedArguments = parseArguments(process.argv.slice(2))
  } catch (error) {
    console.error(formatError(error))
    process.exitCode = 2
    return
  }

  const {allowIncomplete, inputPath} = parsedArguments
  try {
    const source = await readFile(inputPath, 'utf8')
    let input
    try {
      input = JSON.parse(source)
    } catch (error) {
      throw new Error(`Invalid JSON: ${formatError(error)}`)
    }

    const {
      summarizeProductContentBatch,
      summarizeProductContentManifest,
      validateProductContentBatch,
      validateProductContentManifest,
    } = await loadManifestApi()
    const validated = allowIncomplete
      ? validateProductContentBatch(input)
      : validateProductContentManifest(input)
    const summary = allowIncomplete
      ? summarizeProductContentBatch(validated)
      : summarizeProductContentManifest(validated)
    process.stdout.write(`${JSON.stringify(summary)}\n`)
  } catch (error) {
    console.error(`${inputPath}: ${formatError(error)}`)
    process.exitCode = 1
  }
}

await main()
