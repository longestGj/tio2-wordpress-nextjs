import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

export function isFixtureEntrypoint(url) {
  return Boolean(process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === url)
}

export function listenFixture(server) {
  const args = process.argv.slice(2)
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--port' || !/^\d+$/u.test(args[1]))) {
    throw new Error('Fixture usage: [--port <0-65535>]')
  }
  const port = args.length ? Number(args[1]) : 0
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid fixture port')
  server.listen(port, '127.0.0.1', () => {
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Fixture did not expose a TCP address')
    process.stdout.write(`${JSON.stringify({host: '127.0.0.1', port: address.port, baseUrl: `http://127.0.0.1:${address.port}`})}\n`)
  })
  return server
}
