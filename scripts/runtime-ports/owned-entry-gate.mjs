// The entry module cannot execute (and therefore cannot fork) until the launcher
// has attached this exact process to its kernel-owned process tree.
const token = new URL(import.meta.url).searchParams.get('owner')
if (!/^[a-f0-9]{64}$/u.test(token ?? '') || !process.send) throw new Error('Missing owned entry gate')
await new Promise((done, reject) => {
  const timeout = setTimeout(() => reject(new Error('Owned entry gate timed out')), 30_000)
  const receive = message => {
    if (message?.owner !== token || message?.action !== 'run') return
    clearTimeout(timeout)
    process.off('message', receive)
    // Next forks with execArgv. Descendants inherit Job membership, not this
    // one-shot IPC gate; their own application IPC must remain untouched.
    process.execArgv = process.execArgv.filter((arg, index, args) => arg !== import.meta.url && !(arg === '--import' && args[index + 1] === import.meta.url))
    process.disconnect()
    done()
  }
  process.on('message', receive)
  process.send({owner: token, action: 'gated', pid: process.pid})
})
