import {execFile, type ChildProcess} from 'node:child_process'
import {createHash, createHmac, timingSafeEqual} from 'node:crypto'
import {copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {dirname, relative, resolve} from 'node:path'
import {promisify} from 'node:util'

export const execute = promisify(execFile)
export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

/** Installed constants and a Linux root-owned proof volume belong to this disposable Compose. */
export function prepareApprovalCompose(repository: string, directory: string, runId: string) {
  if (!/^home-application-[a-f0-9-]+$/u.test(runId)) throw new Error('Approval environment identity invalid')
  const source = readFileSync(resolve(repository, 'wordpress/docker-compose.yml'), 'utf8')
  const constants = `define('TIO2_CONTENT_APPROVAL_ROOT','/approvals'); define('TIO2_CONTENT_ENVIRONMENT_ID','${runId}'); define('TIO2_CONTENT_WRITER_UID',33); if(!defined('DISABLE_WP_CRON'))define('DISABLE_WP_CRON',true);`
  const result = source.replaceAll('./plugins/tio2-site-model:', `${repository.replaceAll('\\','/')}/wordpress/plugins/tio2-site-model:`)
    .replaceAll('..:/workspace', `${repository.replaceAll('\\','/')}:/workspace:ro`)
    .replaceAll('      WORDPRESS_DB_HOST: db:3306', `      WORDPRESS_CONFIG_EXTRA: "${constants}"\n      WORDPRESS_DB_HOST: db:3306`)
    .replaceAll('      - wp_data:/var/www/html', '      - wp_data:/var/www/html\n      - approvals:/approvals:ro')
    + '\n  approvals:\n'
  const path = resolve(directory, 'compose.yml')
  writeFileSync(path, result)
  return path
}

export async function registerSyntheticApproval(project: string, runId: string, proof: Record<string, unknown>) {
  if (!/^d16-test-home-application-[a-z0-9-]+$/u.test(project) || !/^home-application-[a-f0-9-]+$/u.test(runId)
    || !String(proof.sourceRef).startsWith(`SYNTHETIC-TEST-ONLY:${runId}:`)
    || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$/u.test(String(proof.approvalId))) throw new Error('Synthetic registration identity mismatch')
  const name = `${project}_approvals`
  const [volume] = JSON.parse((await execute('docker',['volume','inspect',name],{windowsHide:true})).stdout)
  if (volume.Labels?.['com.docker.compose.project'] !== project || volume.Labels?.['com.docker.compose.volume'] !== 'approvals') throw new Error('Proof volume owner mismatch')
  // Root helper has no network. WP and all CLI callers see only the read-only mount.
  await execute('docker',['run','--rm','--network','none','--user','0:0','--volume',`${name}:/approvals`,
    '--entrypoint','php','wordpress:php8.3-apache','-r',
    "$p=json_decode(base64_decode($argv[1]),true,512,JSON_THROW_ON_ERROR); $f='/approvals/'.$p['approvalId'].'.json'; if(file_exists($f))throw new RuntimeException('Proof already registered'); if(file_put_contents($f,json_encode($p))===false)throw new RuntimeException('Proof write failed'); chmod('/approvals',0755); chmod($f,0644);",
    Buffer.from(JSON.stringify(proof)).toString('base64')],{windowsHide:true})
}

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
  // The engine checks the actual production sitemap alongside target page output.
  writeFileSync(resolve(target,'app/sitemap.ts'), "export {default} from '@/app/sitemap'\n")
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
  forwarded: boolean; status: number; response: string; callerStatus?: number
}

/** A signed, run-specific Docker callback forwards unchanged bytes to the real Next handler. */
export async function startHomeApplicationRelay(runId: string, secret: string, events: CallbackEvidence[]) {
  let destination: string | undefined
  let failMode: 'reject'|'drop-ack'|undefined
  let identity: (() => Record<string, unknown>)|undefined
  let maintenanceOwner: string|undefined
  let phase = 'seed-before-next'
  const server = createServer(async (request, response) => {
    const publicPrefix=`/${runId}/public`
    if(request.method==='GET'&&request.url?.startsWith(publicPrefix)&&destination) {
      const path=request.url.slice(publicPrefix.length)
      if(!['/','/applications/','/sitemap.xml'].includes(path)) {response.writeHead(404).end();return}
      if(maintenanceOwner) {response.writeHead(503,{'content-type':'text/plain'}).end('Synthetic owned maintenance');return}
      try {const actual=await ownedHttp(new URL(path,destination).href);response.writeHead(actual.status,{'content-type':path==='/sitemap.xml'?'application/xml':'text/html'}).end(actual.body)}
      catch {response.writeHead(502).end()}
      return
    }
    let raw = ''
    for await (const chunk of request) {
      raw += String(chunk)
      if (Buffer.byteLength(raw) > 65536) {response.writeHead(413).end(); return}
    }
    const signature = String(request.headers['x-tio2-signature'] ?? '')
    const valid = /^[a-f0-9]{64}$/u.test(signature)
      && timingSafeEqual(Buffer.from(signature, 'hex'), createHmac('sha256', secret).update(raw).digest())
    if (request.method !== 'POST' || !valid) {response.writeHead(403).end(); return}
    if(request.url === `/${runId}/maintenance`) {
      try {
        const value=JSON.parse(raw)
        if(!identity||typeof value.owner!=='string'||!/^bulk-[a-z0-9-]+$/u.test(value.owner))throw new Error('Invalid maintenance identity')
        const observed=identity()
        if(value.action==='enter'&&!maintenanceOwner)maintenanceOwner=value.owner
        else if(maintenanceOwner!==value.owner)throw new Error('Maintenance owner changed')
        if(value.action==='leave')maintenanceOwner=undefined
        else if(!['enter','assert'].includes(value.action))throw new Error('Invalid maintenance action')
        response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({ok:true,identity:observed,owner:value.owner,maintenance:Boolean(maintenanceOwner)}));return
      } catch {response.writeHead(409).end();return}
    }
    if (request.url === `/${runId}/observe`) {
      try {
        const value=JSON.parse(raw)
        if(value.path==='identity'&&identity) {response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(identity()));return}
        if(!destination||!['/','/applications/','/sitemap.xml'].includes(value.path)) throw new Error('Invalid observation path')
        const actual=await ownedHttp(new URL(value.path,destination).href)
        response.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify(actual));return
      } catch {response.writeHead(503).end();return}
    }
    if(request.url !== `/${runId}`) {response.writeHead(403).end();return}
    const record: CallbackEvidence = {phase, receivedAt: new Date().toISOString(), remoteAddress: request.socket.remoteAddress,
      body: raw, signatureValid: valid, forwarded: false, status: 503, response: 'Next not started'}
    try {
      if (destination && failMode !== 'reject') {
        const upstream = await ownedHttp(destination, raw, signature)
        record.forwarded = true; record.status = upstream.status; record.response = upstream.body
      }
    } catch (error) {record.status = 502; record.response = (error as Error).message}
    record.callerStatus=failMode==='drop-ack'?503:record.status
    events.push(record)
    if (failMode === 'drop-ack') {response.writeHead(503).end('{"error":"synthetic-lost-ack"}'); return}
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
    fail(value?: 'reject'|'drop-ack') {failMode = value},
    identity(value: () => Record<string, unknown>) {identity=value},
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

export async function removeOwnedWordPressVolume(project: string, suffix: 'db_data'|'wp_data'|'approvals') {
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
