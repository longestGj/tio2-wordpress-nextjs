import {spawn, execFile} from 'node:child_process'
import {randomUUID} from 'node:crypto'
import {existsSync, readFileSync} from 'node:fs'
import {mkdir, open, readFile, writeFile, rm} from 'node:fs/promises'
import {dirname, isAbsolute, relative, resolve} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {promisify} from 'node:util'
import {createRequire} from 'node:module'
import ts from 'typescript'
import {attachLease, registerObservedLease, releaseLease, reserveLease} from './runtime-ports/lease-core.mjs'
import {doctorRuntime} from './runtime-ports/doctor.mjs'
import {requiredLocalUrl} from '../tests/e2e/support/required-local-url.ts'

const execFileAsync = promisify(execFile)
const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const platformKeys = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'LANG', 'CI', 'PLAYWRIGHT_BROWSERS_PATH']
const runtimeKeys = ['WORDPRESS_GRAPHQL_URL', 'WORDPRESS_PREVIEW_URL', 'WORDPRESS_PREVIEW_SECRET', 'WORDPRESS_EDITORIAL_API_TOKEN', 'PREVIEW_SECRET', 'REVALIDATION_SECRET', 'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', 'TIO2_MY_RFQ_ATTRIBUTION_SECRET']
const baseSite = name => name === 'TIO2_A_BASE_URL' || name === 'POLAND_A_BASE_URL' ? 'tio2-a'
  : name === 'TIO2_B_BASE_URL' || name === 'POLAND_B_BASE_URL' ? 'tio2-b' : null

function installedCli(root, packageName, command) {
  const packagePath = createRequire(resolve(root, 'package.json')).resolve(`${packageName}/package.json`)
  const manifest = JSON.parse(readFileSync(packagePath, 'utf8'))
  const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[command]
  if (!bin) throw new Error(`Installed ${packageName} has no ${command} executable`)
  return resolve(dirname(packagePath), bin)
}

function parseArgs(args) {
  const result = {specs: [], fixtures: [], environment: {}}
  for (let index = 0; index < args.length; index += 2) {
    const [flag, value] = args.slice(index, index + 2)
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`)
    if (flag === '--site' && !result.site) result.site = value
    else if (flag === '--spec') result.specs.push(value)
    else if (flag === '--fixture' || flag === '--env') {
      const separator = value.indexOf('=')
      const name = value.slice(0, separator)
      if (separator < 1 || !/^[A-Z][A-Z0-9_]*$/u.test(name) || !value.slice(separator + 1)) throw new Error(`Invalid ${flag} assignment`)
      if (flag === '--fixture') {
        if (result.fixtures.some(fixture => fixture.name === name)) throw new Error(`Duplicate fixture ${name}`)
        result.fixtures.push({name, script: value.slice(separator + 1)})
      } else {
        if (Object.hasOwn(result.environment, name)) throw new Error(`Duplicate environment ${name}`)
        result.environment[name] = value.slice(separator + 1)
      }
    } else throw new Error(`Unsupported or duplicate flag ${flag}`)
  }
  if (!['tio2-my', 'tio2-a', 'tio2-b'].includes(result.site) || !result.specs.length) {
    throw new Error('Usage: --site <site-id> --spec <path> [--spec <path>] [--fixture <env-name>=<script>] [--env <name>=<value>]')
  }
  return result
}

function readContract(paths, root) {
  const names = new Set()
  const urls = new Map()
  const visited = new Set()
  const visitFile = path => {
    if (visited.has(path)) return
    visited.add(path)
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
    const visit = node => {
      if (ts.isPropertyAccessExpression(node) && node.expression.getText(source) === 'process.env') names.add(node.name.text)
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'requiredLocalUrl' && ts.isStringLiteralLike(node.arguments[0])) {
        const name = node.arguments[0].text
        const expectedPath = node.arguments[1] && ts.isStringLiteralLike(node.arguments[1]) ? node.arguments[1].text : '/'
        if (urls.has(name) && urls.get(name) !== expectedPath) throw new Error(`Conflicting URL paths for ${name}`)
        names.add(name)
        urls.set(name, expectedPath)
      }
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('.')) {
        const target = resolve(dirname(path), node.moduleSpecifier.text)
        const dependency = [target, `${target}.ts`, `${target}.mjs`].find(candidate => existsSync(candidate) && /\.(?:ts|mjs)$/u.test(candidate))
        if (dependency && relative(resolve(root, 'tests/e2e'), dependency).replaceAll('\\', '/').startsWith('support/')) visitFile(dependency)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  paths.forEach(visitFile)
  return {names, urls}
}

function finished(child) { return child.exitCode !== null || child.signalCode !== null }

async function stopChild(child) {
  if (finished(child) || !child.pid) return
  if (process.platform === 'win32') {
    await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {windowsHide: true}).catch(error => {
      if (!finished(child)) throw error
    })
  } else {
    try { process.kill(-child.pid, 'SIGTERM') } catch (error) { if (error.code !== 'ESRCH') throw error }
  }
  const deadline = Date.now() + 5_000
  while (!finished(child) && Date.now() < deadline) await new Promise(done => setTimeout(done, 25))
  if (!finished(child) && process.platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL') } catch (error) { if (error.code !== 'ESRCH') throw error }
    await new Promise(done => setTimeout(done, 100))
  }
  if (!finished(child)) throw new Error(`Owned child ${child.pid} could not be stopped; lease retained`)
}

/** Public programmatic entry point also permits controlled executables for integration tests. */
export async function runOwnedE2e(args, dependencies = {}) {
  const options = parseArgs(args)
  const root = resolve(dependencies.repositoryRoot ?? defaultRoot)
  const leaseRoot = resolve(dependencies.leaseRoot ?? resolve(root, '.runtime/port-leases'))
  const emit = dependencies.emit ?? (event => process.stdout.write(`${JSON.stringify(event)}\n`))
  const specs = options.specs.map(spec => {
    const path = resolve(root, spec)
    const scopedPath = relative(resolve(root, 'tests/e2e'), path)
    if (scopedPath.startsWith('..') || isAbsolute(scopedPath) || !path.endsWith('.spec.ts') || !existsSync(path)) throw new Error(`Invalid E2E specification: ${spec}`)
    if (scopedPath.startsWith('prerelease-')) throw new Error('Authoritative prerelease suites use their existing prerelease launcher')
    return path
  })
  const fixtures = options.fixtures.map(fixture => ({...fixture, script: resolve(root, fixture.script)}))
  const contract = readContract(specs, root)
  const fixtureContract = readContract(fixtures.map(fixture => fixture.script), root)
  for (const name of fixtureContract.names) contract.names.add(name)
  for (const [name, path] of fixtureContract.urls) contract.urls.set(name, path)
  // A fixture without a direct test consumer is still a declared CMS transport.
  for (const fixture of fixtures) {
    if (!/^[A-Z][A-Z0-9_]*_FIXTURE_URL$/u.test(fixture.name) || !fixture.script.endsWith('.mjs')) throw new Error(`Invalid fixture contract ${fixture.name}`)
    contract.urls.set(fixture.name, '/')
  }
  for (const [name, value] of Object.entries(options.environment)) {
    if (!contract.names.has(name) || platformKeys.includes(name) || name === 'NODE_OPTIONS') throw new Error(`Environment key ${name} is not allowed by the selected specification contract`)
    if (contract.urls.has(name) || name.endsWith('_URL') || /^https?:\/\//u.test(value)) requiredLocalUrl(name, contract.urls.get(name) ?? '/', {[name]: value})
  }
  const input = dependencies.environment ?? process.env
  const selected = Object.fromEntries([...new Set([...platformKeys, ...runtimeKeys, ...contract.names])]
    .filter(name => input[name] !== undefined && name !== 'NODE_OPTIONS')
    .map(name => [name, input[name]]))
  Object.assign(selected, options.environment)
  for (const [name, path] of contract.urls) {
    if (selected[name] !== undefined) requiredLocalUrl(name, path, selected)
  }
  for (const name of ['WORDPRESS_GRAPHQL_URL', 'WORDPRESS_PREVIEW_URL']) {
    if (selected[name]) requiredLocalUrl(name, name.endsWith('GRAPHQL_URL') ? '/graphql' : '/wp-json/tio2/v1/preview', selected)
  }
  const runId = `e2e-${randomUUID()}`
  const outputRoot = resolve(root, '.tmp/owned-e2e', runId)
  const sourceCommit = (await execFileAsync('git', ['rev-parse', 'HEAD'], {cwd: root, windowsHide: true})).stdout.trim()
  const metadata = {leaseRoot, runId, worktree: root, commit: sourceCommit}
  const children = []
  const leases = []
  const controller = new AbortController()
  const interrupt = signal => controller.abort(new Error(`Owned E2E interrupted: ${signal}`))
  const signalHandlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => interrupt(signal)]))
  let stopping
  let lock
  let originalTsconfig
  const distDirs = []
  const lockPath = resolve(root, '.tmp/owned-e2e.lock')
  const cancellation = new Promise((_, reject) => controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {once: true}))
  cancellation.catch(() => {})
  const checked = promise => Promise.race([promise, cancellation])

  const start = (label, commandArgs, env) => {
    controller.signal.throwIfAborted()
    const child = spawn(process.execPath, commandArgs, {cwd: root, env, stdio: 'pipe', windowsHide: true, detached: process.platform !== 'win32'})
    const record = {label, child, output: '', error: null}
    children.push(record)
    child.stdout.on('data', chunk => { record.output = (record.output + chunk.toString()).slice(-256_000) })
    child.stderr.on('data', chunk => { record.output = (record.output + chunk.toString()).slice(-256_000) })
    record.completion = new Promise((done, reject) => {
      child.once('error', error => { record.error = error; reject(error) })
      child.once('exit', code => done(code ?? 1))
    })
    record.completion.catch(() => {})
    emit({event: 'started', runId, label, pid: child.pid})
    return record
  }
  const healthyChild = record => {
    if (record.error) throw record.error
    if (finished(record.child)) throw new Error(`${record.label} exited before readiness (exit ${record.child.exitCode})`)
  }
  const waitFor = async (record, check, description) => {
    const deadline = Date.now() + (dependencies.startupTimeoutMs ?? 90_000)
    while (Date.now() < deadline) {
      healthyChild(record)
      const result = await checked(check())
      if (result) return result
      await checked(new Promise(done => setTimeout(done, 100)))
    }
    throw new Error(`Timed out waiting for ${description}`)
  }
  const cleanup = () => stopping ??= (async () => {
    const failures = []
    for (const record of [...children].reverse()) {
      try { await stopChild(record.child); emit({event: 'stopped', runId, label: record.label, pid: record.child.pid}) }
      catch (error) { failures.push(error) }
    }
    for (const lease of [...leases].reverse()) {
      const owners = children.filter(record => lease.processIds.includes(record.child.pid))
      if (owners.some(record => !finished(record.child))) continue
      try { await releaseLease({leaseRoot, leaseId: lease.leaseId, expectedProcessIds: lease.processIds}) }
      catch (error) { failures.push(error) }
    }
    if (originalTsconfig !== undefined && failures.length === 0) {
      try {
        const path = resolve(root, 'tsconfig.json')
        const currentText = await readFile(path, 'utf8')
        if (currentText !== originalTsconfig) {
          const original = JSON.parse(originalTsconfig)
          const current = JSON.parse(currentText)
          const ownedIncludes = new Set(distDirs.flatMap(dir => [`${dir}/types/**/*.ts`, `${dir}/dev/types/**/*.ts`]))
          current.include = current.include.filter(entry => !ownedIncludes.has(entry))
          await writeFile(path, JSON.stringify(current) === JSON.stringify(original) ? originalTsconfig : `${JSON.stringify(current, null, 2)}\n`)
        }
      } catch (error) { failures.push(error) }
    }
    // Build/output artifacts remain under the run's named directories for diagnosis.
    if (lock) { await lock.close(); await rm(lockPath) }
    for (const [signal, handler] of signalHandlers) process.off(signal, handler)
    if (failures.length) throw new AggregateError(failures, 'Owned E2E cleanup failed')
  })()

  try {
    for (const [signal, handler] of signalHandlers) process.on(signal, handler)
    await mkdir(outputRoot, {recursive: true})
    lock = await open(lockPath, 'wx')
    await lock.writeFile(JSON.stringify({runId, pid: process.pid}))
    originalTsconfig = await readFile(resolve(root, 'tsconfig.json'), 'utf8')
    for (const fixture of fixtures) {
      const record = start(`fixture:${fixture.name}`, [fixture.script, '--port', '0'], selected)
      const discovered = await waitFor(record, async () => {
        for (const line of record.output.split(/\r?\n/u)) {
          if (!line.startsWith('{') || !line.endsWith('}')) continue
          const candidate = JSON.parse(line)
          const url = requiredLocalUrl(fixture.name, '/', {[fixture.name]: candidate.baseUrl})
          if (candidate.host !== '127.0.0.1' || !Number.isInteger(candidate.port) || candidate.port < 1 || candidate.port > 65535 || url.hostname !== candidate.host || Number(url.port) !== candidate.port) throw new Error('Fixture discovery host/port/baseUrl disagree')
          return candidate
        }
        return null
      }, `fixture ${fixture.name} JSON`)
      const lease = await registerObservedLease({...metadata, purpose: 'fixture', siteId: options.site, ports: [discovered.port], processIds: [record.child.pid]})
      leases.push(lease)
      selected[fixture.name] = discovered.baseUrl
      emit({event: 'ready', runId, label: record.label, pid: record.child.pid, leaseId: lease.leaseId, ...discovered})
    }
    const cmsUrls = [...contract.urls].filter(([name, path]) => path === '/graphql' && selected[name]).map(([name]) => selected[name])
    const fixtureUrls = fixtures.map(fixture => `${selected[fixture.name]}/graphql`)
    if (fixtureUrls.length > 1 && !selected.WORDPRESS_GRAPHQL_URL) throw new Error('Multiple CMS fixtures require an explicit WORDPRESS_GRAPHQL_URL contract')
    selected.WORDPRESS_GRAPHQL_URL = fixtureUrls[0] ?? selected.WORDPRESS_GRAPHQL_URL ?? (new Set(cmsUrls).size === 1 ? cmsUrls[0] : undefined)
    requiredLocalUrl('WORDPRESS_GRAPHQL_URL', '/graphql', selected)
    if (new URL(selected.WORDPRESS_GRAPHQL_URL).port === '8080') {
      const report = await doctorRuntime({leaseRoot})
      const endpoint = report.fixedEndpoints.find(endpoint => endpoint.port === 8080)
      if (endpoint?.state !== 'expected-owner') throw new Error(`Canonical CMS ownership is ${endpoint?.state ?? 'unknown'}; E2E refused`)
    }
    const baseVariables = [...contract.urls].filter(([name, path]) => path === '/' && (name.endsWith('_BASE_URL') || name === 'RES_PROC_PREVIEW_URL')).map(([name]) => name)
    const sites = [...new Set([options.site, ...baseVariables.map(baseSite).filter(Boolean)])]
    for (const siteId of sites) {
      const lease = await reserveLease({...metadata, purpose: 'test-next', siteId})
      leases.push(lease)
      const baseUrl = `http://127.0.0.1:${lease.ports[0]}`
      const distDir = `.next-owned-${runId}-${siteId}`
      distDirs.push(distDir)
      const env = {...selected, SITE_ID: siteId, NEXT_DIST_DIR: distDir, NEXT_TELEMETRY_DISABLED: '1'}
      // The shared installation uses junctions outside worktrees. Webpack supports
      // that layout without widening Turbopack's filesystem root into other work.
      const record = start(`next:${siteId}`, [dependencies.nextCli ?? installedCli(root, 'next', 'next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(lease.ports[0])], env)
      const attached = await attachLease({leaseRoot, leaseId: lease.leaseId, processId: record.child.pid})
      Object.assign(lease, attached)
      await waitFor(record, async () => {
        try {
          const response = await fetch(`${baseUrl}/`, {redirect: 'manual', signal: AbortSignal.timeout(5_000)})
          const html = await response.text()
          if (response.ok && new RegExp(`data-site-id=["']${siteId}["']`, 'u').test(html)) return true
          if (response.ok && /data-site-id=/u.test(html)) throw new Error(`Wrong site identity at ${baseUrl}`)
          return false
        } catch (error) {
          if (error.message.startsWith('Wrong site identity')) throw error
          return false
        }
      }, `${siteId} identity at ${baseUrl}`)
      for (const name of baseVariables) if ((baseSite(name) ?? options.site) === siteId) selected[name] = baseUrl
      selected[`TIO2_${siteId.slice(5).toUpperCase()}_BASE_URL`] = baseUrl
      emit({event: 'ready', runId, label: record.label, pid: record.child.pid, leaseId: lease.leaseId, baseUrl, siteId})
    }
    for (const [name, path] of contract.urls) requiredLocalUrl(name, path, selected)
    for (const name of contract.names) if (name.endsWith('_EVIDENCE_DIR') && !options.environment[name]) selected[name] = outputRoot
    const playwright = start('playwright', [dependencies.playwrightCli ?? installedCli(root, '@playwright/test', 'playwright'), 'test', ...options.specs, '--output', resolve(outputRoot, 'playwright')], selected)
    const exitCode = await checked(playwright.completion)
    // Test output is useful to the invoking terminal; never print the environment.
    if (!dependencies.emit && playwright.output) process.stdout.write(playwright.output)
    return {runId, exitCode, outputRoot, sourceCommit, output: playwright.output, urls: Object.fromEntries([...contract.urls.keys()].map(name => [name, selected[name]]))}
  } finally { await cleanup() }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runOwnedE2e(process.argv.slice(2)).then(result => {
    process.stdout.write(`${JSON.stringify({event: 'complete', ...result, output: undefined})}\n`)
    process.exitCode = result.exitCode
  }).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1 })
}
