import {createServer} from 'node:http'

const port = Number(process.env.APP000_RFQ_RECEIVER_PORT ?? 4392)
let capturedPayload = null

function json(response, status, value) {
  response.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store'})
  response.end(JSON.stringify(value))
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 64_000) request.destroy(new Error('payload too large'))
    })
    request.on('end', () => {
      try { resolve(JSON.parse(body)) } catch (error) { reject(error) }
    })
    request.on('error', reject)
  })
}

createServer(async (request, response) => {
  if (request.method === 'POST' && request.url === '/reset') {
    capturedPayload = null
    json(response, 200, {reset: true})
    return
  }
  if (request.method === 'GET' && request.url === '/capture') {
    json(response, 200, {payload: capturedPayload})
    return
  }
  if (request.method === 'POST' && request.url === '/submit') {
    try {
      const safePayload = {...await readJson(request)}
      delete safePayload.access_key
      capturedPayload = safePayload
      json(response, 200, {success: false})
    } catch {
      json(response, 400, {success: false})
    }
    return
  }
  json(response, 404, {error: 'not found'})
}).listen(port, '127.0.0.1', () => process.stdout.write(`app000-private-rfq-receiver:${port}\n`))
