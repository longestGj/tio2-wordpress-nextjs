import {randomUUID} from 'node:crypto'
import {access, mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {dirname, join, relative} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

import ts from 'typescript'

const PROJECT_ROOT_URL = new URL('../../', import.meta.url)
const PROJECT_ROOT_PATH = fileURLToPath(PROJECT_ROOT_URL)
const IMPORT_PATTERN = /(['"])(@\/|\.\.?\/)([^'"\n]+)\1/gu

function asSourceUrl(specifier, sourceUrl) {
  if (specifier.startsWith('@/')) return new URL(`${specifier.slice(2)}.ts`, PROJECT_ROOT_URL)
  return new URL(`${specifier}.ts`, sourceUrl)
}

function outputUrlFor(sourceUrl, temporaryRootUrl) {
  const sourcePath = fileURLToPath(sourceUrl)
  const relativePath = relative(PROJECT_ROOT_PATH, sourcePath).replaceAll('\\', '/')
  return new URL(relativePath.replace(/\.tsx?$/u, '.mjs'), temporaryRootUrl)
}

async function compileTree(sourceUrl, temporaryRootUrl, compiled) {
  const sourceKey = sourceUrl.href
  const known = compiled.get(sourceKey)
  if (known) return known
  const outputUrl = outputUrlFor(sourceUrl, temporaryRootUrl)
  compiled.set(sourceKey, outputUrl)
  let source = await readFile(sourceUrl, 'utf8')
  const matches = [...source.matchAll(IMPORT_PATTERN)]
  for (const match of matches) {
    const specifier = `${match[2]}${match[3]}`
    const dependencyUrl = asSourceUrl(specifier, sourceUrl)
    try {
      await access(dependencyUrl)
    } catch {
      continue
    }
    const dependencyOutputUrl = await compileTree(dependencyUrl, temporaryRootUrl, compiled)
    let rewritten = relative(dirname(fileURLToPath(outputUrl)), fileURLToPath(dependencyOutputUrl)).replaceAll('\\', '/')
    if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`
    source = source.replace(`${match[1]}${specifier}${match[1]}`, `${match[1]}${rewritten}${match[1]}`)
  }
  const result = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: true},
    fileName: fileURLToPath(sourceUrl),
    reportDiagnostics: true,
  })
  const errors = result.diagnostics?.filter(({category}) => category === ts.DiagnosticCategory.Error) ?? []
  if (errors.length > 0) throw new Error(ts.formatDiagnostics(errors, {getCanonicalFileName: (fileName) => fileName, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n'}))
  await mkdir(dirname(fileURLToPath(outputUrl)), {recursive: true})
  await writeFile(outputUrl, result.outputText, {encoding: 'utf8', flag: 'wx'})
  return outputUrl
}

export async function loadEditorialTypeScriptModule(sourceUrl) {
  const temporaryPath = await mkdtemp(join(fileURLToPath(new URL('./', import.meta.url)), `.runtime-${process.pid}-${randomUUID()}-`))
  const temporaryRootUrl = pathToFileURL(`${temporaryPath}/`)
  try {
    const outputUrl = await compileTree(sourceUrl, temporaryRootUrl, new Map())
    return await import(outputUrl.href)
  } finally {
    await rm(temporaryRootUrl, {recursive: true, force: true})
  }
}
