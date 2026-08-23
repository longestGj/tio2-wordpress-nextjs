import {readFileSync} from 'node:fs'
import {resolve, sep} from 'node:path'
import {gzipSync} from 'node:zlib'

const LIMIT_BYTES = 25_600
const sites = [
  {siteId: 'tio2-a', buildDir: '.next-tio2-a'},
  {siteId: 'tio2-b', buildDir: '.next-tio2-b'},
]

function readAppPaths(buildDir) {
  const manifestPath = resolve(buildDir, 'server/app-paths-manifest.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  if (!manifest || typeof manifest !== 'object') {
    throw new Error(`Invalid app paths manifest: ${manifestPath}`)
  }
  return manifest
}

function readClientRouteManifest(buildDir, route, serverEntry) {
  const relativeManifest = serverEntry.replace(
    /\.js$/u,
    '_client-reference-manifest.js',
  )
  const manifestPath = resolveBuildFile(
    buildDir,
    `server/${relativeManifest}`,
  )
  const source = readFileSync(manifestPath, 'utf8')
  const marker = `globalThis.__RSC_MANIFEST[${JSON.stringify(route)}] = `
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) {
    throw new Error(`Missing ${route} payload in ${manifestPath}`)
  }
  const json = source.slice(markerIndex + marker.length).trim().replace(/;$/u, '')
  const manifest = JSON.parse(json)
  const entryFiles = Object.values(manifest.entryJSFiles ?? {}).flat()
  const moduleFiles = Object.values(manifest.clientModules ?? {}).flatMap(
    (clientModule) => clientModule.chunks ?? [],
  )
  return [...new Set([...entryFiles, ...moduleFiles])].map((file) =>
    file.replace(/^\/_next\//u, ''),
  )
}

function resolveBuildFile(buildDir, relativePath) {
  const buildRoot = resolve(buildDir)
  const filePath = resolve(buildRoot, relativePath)
  if (!filePath.startsWith(`${buildRoot}${sep}`)) {
    throw new Error(`Build manifest path escapes ${buildDir}: ${relativePath}`)
  }
  return filePath
}

const results = sites.map(({siteId, buildDir}) => {
  const appPaths = readAppPaths(buildDir)
  const rootRoute = '/page'
  const catchallRoutes = Object.keys(appPaths).filter((route) =>
    /^\/\[\.\.\.[^\]]+\]\/page$/u.test(route),
  )
  if (typeof appPaths[rootRoute] !== 'string' || catchallRoutes.length !== 1) {
    throw new Error(`${siteId} build must contain exactly one root and one catch-all page route`)
  }
  const catchallRoute = catchallRoutes[0]
  const root = {
    route: rootRoute,
    files: readClientRouteManifest(
      buildDir,
      rootRoute,
      appPaths[rootRoute],
    ),
  }
  const catchall = {
    route: catchallRoute,
    files: readClientRouteManifest(
      buildDir,
      catchallRoute,
      appPaths[catchallRoute],
    ),
  }
  const baselineFiles = new Set(catchall.files)
  const uniqueFiles = [...new Set(root.files)]
    .filter((file) => file.endsWith('.js') && !baselineFiles.has(file))
    .sort((left, right) => left.localeCompare(right))
  const files = uniqueFiles.map((file) => {
    const source = readFileSync(resolveBuildFile(buildDir, file))
    return {
      path: file,
      rawBytes: source.byteLength,
      gzipBytes: gzipSync(source, {level: 9}).byteLength,
    }
  })
  const gzipBytes = files.reduce((total, file) => total + file.gzipBytes, 0)
  if (gzipBytes > LIMIT_BYTES) {
    throw new Error(
      `${siteId} homepage-owned client JavaScript is ${gzipBytes} gzip bytes; limit is ${LIMIT_BYTES}`,
    )
  }
  return {
    siteId,
    buildDir,
    rootRoute: root.route,
    baselineRoute: catchall.route,
    files,
    gzipBytes,
    status: 'passed',
  }
})

process.stdout.write(
  `${JSON.stringify({status: 'passed', limitBytes: LIMIT_BYTES, sites: results})}\n`,
)
