import {execFile, type ChildProcess} from 'node:child_process'
import {createHash, createHmac, timingSafeEqual} from 'node:crypto'
import {copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {dirname, relative, resolve} from 'node:path'
import {promisify} from 'node:util'

export const execute = promisify(execFile)
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

/** Use an actual HTTP subprocess, outside the repository's global MSW interceptor. */
export async function ownedHttp(url: string, body?: string, signature?: string) {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' || parsed.hostname !== '127.0.0.1') throw new Error('Owned HTTP requires loopback')
  const args = ['--noproxy','*','--silent','--show-error','--max-time','4','--write-out','\n%{http_code}']
  if (body !== undefined) args.push('--header','content-type: application/json','--data',body)
  if (signature) args.push('--header',`x-tio2-signature: ${signature}`)
  args.push(url)
  let stdout: string
  try {({stdout} = await execute(process.platform==='win32'?'curl.exe':'curl',args,{windowsHide:true,timeout:5000,maxBuffer:8*1024*1024}))}
  catch(error) {throw new Error(`Owned HTTP transport failed (${(error as {code?:string}).code ?? 'unknown'})`)}
  const split = stdout.lastIndexOf('\n')
  return {status:Number(stdout.slice(split+1)),body:stdout.slice(0,split)}
}

export function prepareHomeApplicationFixture(template: string, runDirectory: string, repository: string): string {
  for (const [path, pattern] of [
    ['applications/page.tsx', /export const revalidate = (\d+)/u],
    ['api/revalidate/route.ts', /export const runtime = '([^']+)'/u],
  ] as const) {
    const actual = pattern.exec(readFileSync(resolve(repository, 'app/(en)', path), 'utf8'))?.[1]
    const fixture = pattern.exec(readFileSync(resolve(template, 'app', path), 'utf8'))?.[1]
    if (!actual || actual !== fixture) throw new Error(`Fixture route config drift: ${path}`)
  }
  const target = resolve(runDirectory, 'next')
  if (existsSync(target)) throw new Error('Owned fixture already exists')
  mkdirSync(target)
  cpSync(resolve(template, 'app'), resolve(target, 'app'), {recursive: true})
  for (const name of ['next.config.mjs', 'next-env.d.ts']) copyFileSync(resolve(template, name), resolve(target, name))
  const config = JSON.parse(readFileSync(resolve(template, 'tsconfig.json'), 'utf8'))
  const source = relative(target, repository).replace(/\\/gu, '/')
  config.compilerOptions.paths = {'@/app/*': [`${source}/app/(en)/*`], '@/*': [`${source}/*`]}
  config.include.push(`${source}/lib/rfq/malaysia-rfq-analytics.ts`)
  writeFileSync(resolve(target, 'tsconfig.json'), JSON.stringify(config, null, 2))
  symlinkSync(resolve(repository, 'public'), resolve(target, 'public'), 'junction')
  return target
}

/** Unlink the junction itself, before any recursive deletion of the owned directory. */
export function removeOwnedHomeApplicationRun(root: string, runDirectory: string, runId: string, publicTarget: string) {
  if (!runId.startsWith('home-application-') || dirname(resolve(runDirectory)) !== resolve(root)
    || resolve(runDirectory) !== resolve(root, runId) || lstatSync(runDirectory).isSymbolicLink()
    || realpathSync(runDirectory) !== resolve(runDirectory)) throw new Error('Run directory ownership mismatch')
  if (readFileSync(resolve(runDirectory, 'owner'), 'utf8') !== runId) throw new Error('Run owner marker mismatch')
  const junction = resolve(runDirectory, 'next/public')
  if (existsSync(junction)) {
    if (!lstatSync(junction).isSymbolicLink() || realpathSync(junction) !== realpathSync(publicTarget)) throw new Error('Public junction ownership mismatch')
    unlinkSync(junction)
  }
  rmSync(runDirectory, {recursive: true})
}

export interface CleanupStep {name: string; passed: boolean; error?: string}
export async function cleanupHomeApplicationSteps(steps: {name: string; run(): Promise<void> | void}[]): Promise<CleanupStep[]> {
  const result: CleanupStep[] = []
  for (const step of steps) {
    try {await step.run(); result.push({name: step.name, passed: true})}
    catch (error) {result.push({name: step.name, passed: false, error: (error as Error).message})}
  }
  return result
}

export interface CallbackEvidence {
  phase: string; receivedAt: string; remoteAddress?: string; body: string; signatureValid: boolean
  forwarded: boolean; status: number; response: string
}

/** A signed, run-specific Docker callback forwards unchanged bytes to the real Next handler. */
export async function startHomeApplicationRelay(runId: string, secret: string, events: CallbackEvidence[]) {
  let destination: string | undefined
  let phase = 'seed-before-next'
  const server = createServer(async (request, response) => {
    let raw = ''
    for await (const chunk of request) {
      raw += String(chunk)
      if (Buffer.byteLength(raw) > 65536) {response.writeHead(413).end(); return}
    }
    const signature = String(request.headers['x-tio2-signature'] ?? '')
    const valid = /^[a-f0-9]{64}$/u.test(signature)
      && timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', secret).update(raw).digest())
    if (request.method !== 'POST' || request.url !== `/${runId}` || !valid) {response.writeHead(403).end(); return}
    const record: CallbackEvidence = {phase, receivedAt: new Date().toISOString(), remoteAddress: request.socket.remoteAddress,
      body: raw, signatureValid: valid, forwarded: false, status: 503, response: 'Next not started'}
    try {
      if (destination) {
        const upstream = await ownedHttp(destination, raw, signature)
        record.forwarded = true; record.status = upstream.status; record.response = upstream.body
      }
    } catch (error) {record.status = 502; record.response = (error as Error).message}
    events.push(record)
    response.writeHead(record.status, {'content-type': 'application/json'}).end(record.response)
  })
  await new Promise<void>((done, reject) => {server.once('error', reject); server.listen(0, '0.0.0.0', done)})
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing relay port')
  return {
    port: address.port, url: `http://host.docker.internal:${address.port}/${runId}`,
    forwardTo(base: string) {
      const url = new URL(base)
      if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') throw new Error('Relay destination must be owned loopback Next')
      destination = `${base}/api/revalidate`
    },
    phase(value: string) {phase = value},
    async stop() {server.closeAllConnections(); await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))},
  }
}

export async function stopOwnedNext(child: ChildProcess) {
  if (child.exitCode !== null) return
  const exited = new Promise<void>(done => child.once('exit', () => done()))
  child.kill()
  let timer: NodeJS.Timeout | undefined
  try {await Promise.race([exited, new Promise<never>((_done, reject) => {timer = setTimeout(() => reject(new Error('Owned Next failed to stop')), 10_000)})])}
  finally {clearTimeout(timer)}
}

export async function removeOwnedWordPressVolume(project: string, suffix: 'db_data'|'wp_data') {
  if (!/^d16-test-home-application-[a-z0-9-]+$/u.test(project)) throw new Error('Unexpected WordPress project')
  const remaining = await execute('docker', ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`], {windowsHide: true})
  if (remaining.stdout.trim()) throw new Error('Owned WordPress containers remain')
    const name = `${project}_${suffix}`
    const output = await execute('docker', ['volume', 'inspect', name], {windowsHide: true})
    const [volume] = JSON.parse(output.stdout)
    if (volume.Name !== name || volume.Labels?.['com.docker.compose.project'] !== project || volume.Labels?.['com.docker.compose.volume'] !== suffix) throw new Error('WordPress volume owner mismatch')
    await execute('docker', ['volume', 'rm', name], {windowsHide: true})
  const residual = await execute('docker', ['volume', 'ls', '-q', '--filter', `name=^${name}$`], {windowsHide: true})
  if (residual.stdout.trim()) throw new Error('Owned volume remains after removal')
}
