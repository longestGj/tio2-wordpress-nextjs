import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {fileURLToPath} from 'node:url'

const platformKeys = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'PATHEXT', 'TEMP', 'TMP', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA']

/** A Job Object is an unforgeable, non-breakaway descendant ownership boundary.
 * The helper holds process handles and validates PID/start time/command before
 * terminating a member. Closing the helper never kills unverified processes.
 */
export async function createProcessSupervisor() {
  if (process.platform !== 'win32') throw new Error('Owned E2E process identity requires the Windows Job Object supervisor on this host')
  const helper = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', fileURLToPath(new URL('./owned-process-tree.ps1', import.meta.url))], {
    env: Object.fromEntries(platformKeys.filter(name => process.env[name] !== undefined).map(name => [name, process.env[name]])),
    stdio: 'pipe', windowsHide: true,
  })
  const pending = new Map()
  let counter = 0
  let failure
  let stderr = ''
  let readyResolve
  let readyReject
  const ready = new Promise((done, reject) => { readyResolve = done; readyReject = reject })
  const fail = error => {
    failure = error
    readyReject(error)
    for (const request of pending.values()) request.reject(error)
    pending.clear()
  }
  helper.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-8_000) })
  helper.on('error', fail)
  const exited = new Promise(done => helper.once('exit', code => {
    fail(new Error(`Process supervisor exited (${code}): ${stderr}`))
    done()
  }))
  const lines = createInterface({input: helper.stdout})
  lines.on('line', line => {
    try {
      const message = JSON.parse(line)
      if (message.ready) { readyResolve(); return }
      const request = pending.get(message.id)
      if (!request) return
      pending.delete(message.id)
      if (message.error) request.reject(new Error(message.error))
      else request.resolve(message.result)
    } catch (error) { fail(error) }
  })
  const request = (action, payload = {}) => new Promise((resolve, reject) => {
    if (failure) { reject(failure); return }
    const id = ++counter
    pending.set(id, {resolve, reject})
    helper.stdin.write(`${JSON.stringify({id, action, ...payload})}\n`)
  })
  await ready
  let closed
  return {
    attach: (pid, token, gate, executable) => request('attach', {pid, token, gate, executable}),
    snapshot: token => request('snapshot', {token}),
    stop: (token, identities) => request('stop', {token, identities}),
    listenerOwners: port => request('listeners', {port}),
    close: () => closed ??= (async () => {
      if (!failure) await request('close')
      helper.stdin.end()
      await exited
      lines.close()
    })(),
  }
}
