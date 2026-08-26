import {readFile} from 'node:fs/promises'

import {
  summarizeProductContentBatch,
  summarizeProductContentManifest,
  validateProductContentBatch,
  validateProductContentManifest,
} from '../../lib/products/content-manifest.ts'

const USAGE = 'Usage: node scripts/products/validate-product-manifest.mjs [--allow-incomplete] <manifest.json>'

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
