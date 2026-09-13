import {copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs'
import {relative, resolve} from 'node:path'

export function prepareLegalReadFixture(templateRoot: string, runDirectory: string, repositoryRoot: string): string {
  const runFixtureRoot = resolve(runDirectory, 'next')
  if (existsSync(runFixtureRoot)) throw new Error(`Legal run fixture already exists: ${runFixtureRoot}`)
  mkdirSync(runFixtureRoot)
  cpSync(resolve(templateRoot, 'app'), resolve(runFixtureRoot, 'app'), {recursive: true})
  copyFileSync(resolve(templateRoot, 'next.config.mjs'), resolve(runFixtureRoot, 'next.config.mjs'))
  copyFileSync(resolve(templateRoot, 'next-env.d.ts'), resolve(runFixtureRoot, 'next-env.d.ts'))
  const tsconfig = JSON.parse(readFileSync(resolve(templateRoot, 'tsconfig.json'), 'utf8')) as {
    compilerOptions: {paths: Record<string, string[]>}; include: string[]
  }
  const source = relative(runFixtureRoot, repositoryRoot).replace(/\\/gu, '/')
  tsconfig.compilerOptions.paths = {
    '@/app/ms/*': [`${source}/app/(ms)/ms/*`],
    '@/app/*': [`${source}/app/(en)/*`],
    '@/*': [`${source}/*`],
  }
  tsconfig.include = tsconfig.include.map(entry => entry.endsWith('/lib/rfq/malaysia-rfq-analytics.ts')
    ? `${source}/lib/rfq/malaysia-rfq-analytics.ts` : entry)
  writeFileSync(resolve(runFixtureRoot, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
  symlinkSync(resolve(repositoryRoot, 'public'), resolve(runFixtureRoot, 'public'), 'junction')
  return runFixtureRoot
}

export async function runLegalCleanupSteps(steps: readonly {name: string; run: () => Promise<void> | void}[]): Promise<Error[]> {
  const errors: Error[] = []
  for (const step of steps) {
    try { await step.run() }
    catch (error) { errors.push(new Error(`${step.name}: ${(error as Error).message}`, {cause: error})) }
  }
  return errors
}

export function unexpectedLegalBrowserDiagnostics(diagnostics: readonly string[], baseUrl: string): string[] {
  const homePrefetch = diagnostics.some(value => value.startsWith(`response:404:${baseUrl}/?_rsc=`)
    && /^response:404:http:\/\/127\.0\.0\.1:\d+\/\?_rsc=[A-Za-z0-9_-]+$/u.test(value))
  return diagnostics.filter(value => {
    if (value.startsWith(`response:404:${baseUrl}/?_rsc=`)
      && /^response:404:http:\/\/127\.0\.0\.1:\d+\/\?_rsc=[A-Za-z0-9_-]+$/u.test(value)) return false
    if (homePrefetch && value === 'console:error:Failed to load resource: the server responded with a status of 404 (Not Found)') return false
    return true
  })
}
