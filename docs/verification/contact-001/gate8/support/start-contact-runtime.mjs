import startServerModule from 'next/dist/server/lib/start-server.js'

const {startServer} = startServerModule
await startServer({
  dir: process.cwd(),
  isDev: false,
  hostname: '127.0.0.1',
  port: Number(process.env.CONTACT_APP_PORT ?? 4491),
})
