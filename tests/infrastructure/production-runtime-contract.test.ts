import {execFileSync} from 'node:child_process'
import {existsSync, readdirSync, readFileSync, rmSync} from 'node:fs'
import {join, resolve} from 'node:path'
import {parse} from 'yaml'
import {describe, expect, it} from 'vitest'

const composePath = 'ops/production/docker-compose.yml'
const dockerfilePath = 'ops/production/Dockerfile'
const nginxPath = 'ops/production/nginx/tio2malaysia.conf.template'

const nodeImage = 'node:24-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553'
const wordpressImage = 'wordpress:php8.3-apache@sha256:5a93c470ae8220fddf71f6ebe3bc94e615ddc2ae4d9810f795b830fb11c41a17'
const mariadbImage = 'mariadb:11.4@sha256:80494b9810694179889f7281ec44ca928241df577159c0356a1070e2e94616a1'
const rootEnvironment = '/etc/tio2-production/production.env'

type ComposeService = {
  depends_on?: Record<string, {condition?: string}>
  env_file?: string[]
  healthcheck?: {test?: string[]; interval?: string; timeout?: string; retries?: number}
  image?: string
  platform?: string
  ports?: string[]
  profiles?: string[]
  pull_policy?: string
  restart?: string
  volumes?: Array<string | {
    type?: string
    source?: string
    target?: string
    read_only?: boolean
    bind?: {create_host_path?: boolean}
  }>
}

type ProductionCompose = {
  name?: string
  networks?: Record<string, {driver?: string; internal?: boolean}>
  services?: Record<string, ComposeService>
  volumes?: Record<string, {external?: boolean; name?: string}>
}

function readCompose(): ProductionCompose | null {
  return existsSync(composePath)
    ? parse(readFileSync(composePath, 'utf8')) as ProductionCompose
    : null
}

function read(path: string): string {
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}

function filesUnder(root: string): string[] {
  return readdirSync(root, {recursive: true})
    .map((entry) => join(root, entry))
    .filter((entry) => entry.endsWith('.js'))
}

describe('tio2-my production runtime topology', () => {
  it('uses only fixed Compose services, images, volumes, network, and loopback endpoints', () => {
    const compose = readCompose()
    const source = read(composePath)

    expect(compose?.name).toBe('tio2-production')
    expect(Object.keys(compose?.services ?? {})).toEqual(['db', 'wordpress', 'wpcli', 'web', 'candidate'])
    expect(compose?.volumes).toEqual({
      wp_data: {external: true, name: 'wordpress_wp_data'},
      db_data: {external: true, name: 'wordpress_db_data'},
    })
    expect(compose?.networks).toEqual({production: {driver: 'bridge', internal: true}})

    expect(compose?.services?.db.image).toBe(mariadbImage)
    expect(compose?.services?.wordpress.image).toBe(wordpressImage)
    expect(compose?.services?.db.ports).toBeUndefined()
    expect(compose?.services?.wordpress.ports).toEqual(['127.0.0.1:8080:80'])
    expect(compose?.services?.web.ports).toEqual(['127.0.0.1:3000:3000'])
    expect(compose?.services?.candidate.ports).toEqual(['127.0.0.1:3001:3000'])
    const releaseBinds = [
      ...(compose?.services?.wordpress.volumes ?? []),
      ...(compose?.services?.wpcli.volumes ?? []),
    ].filter((volume): volume is Exclude<ComposeService['volumes'], undefined>[number] & object =>
      typeof volume === 'object' && volume.source?.startsWith('/opt/tio2-production/current') === true
    )
    expect(releaseBinds).toEqual([
      {
        type: 'bind', source: '/opt/tio2-production/current/wordpress/plugins/tio2-site-model',
        target: '/var/www/html/wp-content/plugins/tio2-site-model', read_only: true,
        bind: {create_host_path: false},
      },
      {
        type: 'bind', source: '/opt/tio2-production/current/wordpress/plugins/tio2-site-model',
        target: '/var/www/html/wp-content/plugins/tio2-site-model', read_only: true,
        bind: {create_host_path: false},
      },
      {
        type: 'bind', source: '/opt/tio2-production/current', target: '/release', read_only: true,
        bind: {create_host_path: false},
      },
    ])
    expect(compose?.services?.wpcli.profiles).toEqual(['tools'])
    expect(compose?.services?.wpcli.image).toBe('tio2-my-wpcli:resolved')
    expect(compose?.services?.wpcli.platform).toBe('linux/arm64')
    expect(compose?.services?.wpcli.pull_policy).toBe('never')
    expect(source).toContain(
      'Task 4 exception: privileged deployment must pull wordpress:cli-php8.3 for linux/arm64, inspect and record its digest and image ID, then tag it as tio2-my-wpcli:resolved before Compose use.'
    )
    expect(source).toContain('The privileged deployment layer must validate the resolved /opt/tio2-production/current symlink target before creating containers.')

    for (const service of ['db', 'wordpress', 'web']) {
      expect(compose?.services?.[service]?.restart).toBe('unless-stopped')
      expect(compose?.services?.[service]?.env_file).toEqual([rootEnvironment])
      expect(compose?.services?.[service]?.healthcheck).toMatchObject({
        test: expect.any(Array), interval: '5s', timeout: '5s', retries: 30,
      })
    }
    expect(compose?.services?.candidate.profiles).toEqual(['candidate'])
    expect(compose?.services?.candidate.restart).toBe('no')
    expect(compose?.services?.candidate.env_file).toEqual([rootEnvironment])
    expect(compose?.services?.candidate.healthcheck).toMatchObject({
      test: expect.any(Array), interval: '5s', timeout: '5s', retries: 30,
    })
    expect(compose?.services?.wpcli.restart).toBe('no')
    expect(compose?.services?.wpcli.env_file).toEqual([rootEnvironment])
    expect(compose?.services?.wordpress.depends_on?.db.condition).toBe('service_healthy')
    expect(compose?.services?.web.depends_on?.wordpress.condition).toBe('service_healthy')
    expect(compose?.services?.candidate.depends_on?.wordpress.condition).toBe('service_healthy')

    expect(compose?.services?.web.image).toBe('tio2-my-web:active')
    expect(compose?.services?.candidate.image).toBe('tio2-my-web:candidate')
    expect(compose?.services?.web).not.toHaveProperty('build')
    expect(compose?.services?.candidate).not.toHaveProperty('build')
    expect(source).not.toContain('${')
    expect(source).not.toContain('/home/deploy')
  })

  it('builds and runs the Next.js image with pinned inputs and a non-root runtime', () => {
    const dockerfile = read(dockerfilePath)

    expect(existsSync(dockerfilePath)).toBe(true)
    expect(dockerfile).toContain(`FROM ${nodeImage} AS dependencies`)
    expect(dockerfile).toContain(`FROM ${nodeImage} AS runtime`)
    expect(dockerfile).toContain('RUN npm ci')
    expect(dockerfile).toContain('# syntax=docker/dockerfile:1.10.0')
    expect(dockerfile).toContain('RUN --mount=type=secret,id=wordpress_editorial_api_token,env=WORDPRESS_EDITORIAL_API_TOKEN,required=true npm run build')
    expect(dockerfile).not.toContain('ARG WORDPRESS_EDITORIAL_API_TOKEN')
    expect(dockerfile).toContain('ARG SITE_ID=tio2-my')
    expect(dockerfile).toContain('ARG NODE_ENV=production')
    expect(dockerfile).toContain('ARG VERCEL_ENV=production')
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_SITE_URL=https://tio2malaysia.com')
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY')
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT=production')
    expect(dockerfile).toContain('ARG TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=false')
    expect(dockerfile).toContain('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=${NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY}')
    expect(dockerfile).toContain('NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT=${NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT}')
    expect(dockerfile).toContain('TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=${TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED}')
    expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next')
    expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/public ./public')
    expect(dockerfile).toContain('USER nextjs')
    expect(dockerfile).toContain('ENV HOSTNAME=0.0.0.0')
    expect(dockerfile).toContain('EXPOSE 3000')
    expect(dockerfile).toContain('REVALIDATION_SECRET=\\"$NEXTJS_REVALIDATION_SECRET_TIO2_MY\\"')
    expect(dockerfile).toContain('WORDPRESS_PREVIEW_SECRET=\\"$NEXTJS_PREVIEW_SECRET_TIO2_MY\\"')
    expect(dockerfile).toContain('npm run start -- --hostname 0.0.0.0 --port 3000')
  })

  it('pins a Dockerfile frontend that parses the BuildKit secret environment option', () => {
    const dockerfile = read(dockerfilePath)
    const frontend = dockerfile.match(/^# syntax=docker\/dockerfile:(\d+)\.(\d+)\.(\d+)$/mu)
    const secretBuild = dockerfile.match(/RUN --mount=type=secret,([^\s]+) npm run build/u)

    expect(frontend?.slice(1)).toEqual(['1', '10', '0'])
    expect(secretBuild?.[1].split(',')).toEqual(expect.arrayContaining([
      'id=wordpress_editorial_api_token',
      'env=WORDPRESS_EDITORIAL_API_TOKEN',
      'required=true',
    ]))
  })

  it('builds a production form bundle with the approved public key and without the editorial credential', () => {
    const dockerfile = read(dockerfilePath)
    const formBundle = read('components/sites/tio2-my/request-a-quote/malaysia-rfq-form.tsx')
    const runtimeStage = dockerfile.slice(dockerfile.indexOf('AS runtime'))
    const outputDirectory = resolve('.next-production-runtime-contract')
    const publicKey = '01234567-89ab-cdef-0123-456789abcdef'
    const editorialToken = 'runtime-contract-editorial-token'

    expect(formBundle).toContain('process.env.NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY')
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY')
    expect(dockerfile).toContain('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=${NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY}')
    expect(dockerfile).toContain('id=wordpress_editorial_api_token,env=WORDPRESS_EDITORIAL_API_TOKEN,required=true')
    expect(runtimeStage).not.toContain('WORDPRESS_EDITORIAL_API_TOKEN')

    rmSync(outputDirectory, {recursive: true, force: true})
    try {
      execFileSync(process.execPath, [
        'node_modules/next/dist/bin/next', 'build', '--experimental-build-mode=compile',
      ], {
        env: {
          ...process.env,
          SITE_ID: 'tio2-my',
          NODE_ENV: 'production',
          VERCEL_ENV: 'production',
          NEXT_PUBLIC_SITE_URL: 'https://tio2malaysia.com',
          NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT: 'production',
          NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY: publicKey,
          TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'false',
          WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:9/graphql',
          WORDPRESS_MEDIA_ORIGIN: 'https://cms.tio2malaysia.com',
          WORDPRESS_PREVIEW_URL: 'http://wordpress/wp-json/tio2/v1/preview',
          WORDPRESS_EDITORIAL_API_TOKEN: editorialToken,
          NEXT_DIST_DIR: '.next-production-runtime-contract',
        },
        encoding: 'utf8',
        timeout: 120_000,
      })
      const clientBundles = filesUnder(join(outputDirectory, 'static'))

      expect(clientBundles.some((bundle) => readFileSync(bundle, 'utf8').includes(publicKey))).toBe(true)
      expect(clientBundles.some((bundle) => readFileSync(bundle, 'utf8').includes(editorialToken))).toBe(false)
    } finally {
      rmSync(outputDirectory, {recursive: true, force: true})
    }
  }, 120_000)

  it('stages only the approved CMS, apex, and www Nginx hosts', () => {
    const nginx = read(nginxPath)
    const approvedHosts = ['cms.tio2malaysia.com', 'tio2malaysia.com', 'www.tio2malaysia.com']
    const configuredHosts = [...nginx.matchAll(/^\s*server_name\s+([^;]+);/gm)]
      .flatMap((match) => match[1].trim().split(/\s+/))

    expect(existsSync(nginxPath)).toBe(true)
    expect(configuredHosts).not.toHaveLength(0)
    expect(new Set(configuredHosts)).toEqual(new Set(approvedHosts))
    expect(nginx).toContain('return 301 https://tio2malaysia.com$request_uri;')
    expect(nginx).toContain('proxy_pass http://127.0.0.1:8080;')
    expect(nginx).toContain('proxy_pass http://127.0.0.1:3000;')
    expect(nginx).toContain('/etc/letsencrypt/live/cms.tio2malaysia.com/fullchain.pem')
    expect(nginx).toContain('/etc/letsencrypt/live/tio2malaysia.com/fullchain.pem')
    expect(nginx).toContain('/etc/letsencrypt/options-ssl-nginx.conf')
    expect(nginx).toContain('/etc/letsencrypt/ssl-dhparams.pem')
    expect(nginx).toContain('TIO2_NGINX_STAGING_MARKER: nginx -t')
    expect(nginx).not.toMatch(/server_name\s+[_*]/)
    expect(nginx).not.toMatch(/default_server/)
  })

  it('provides a fixed HTTP-only Certbot bootstrap before the final TLS template is validated', () => {
    const bootstrapPath = 'ops/production/nginx/tio2malaysia.bootstrap-http.conf.template'
    const bootstrap = read(bootstrapPath)
    const configuredHosts = [...bootstrap.matchAll(/^\s*server_name\s+([^;]+);/gm)]
      .flatMap((match) => match[1].trim().split(/\s+/))

    expect(existsSync(bootstrapPath)).toBe(true)
    expect(new Set(configuredHosts)).toEqual(new Set([
      'cms.tio2malaysia.com', 'tio2malaysia.com', 'www.tio2malaysia.com',
    ]))
    expect(bootstrap).toContain('TIO2_NGINX_FIRST_ISSUANCE_MARKER')
    expect(bootstrap).toContain('root /var/lib/tio2-production/acme;')
    expect(bootstrap).toContain('certbot certonly --webroot --webroot-path /var/lib/tio2-production/acme -d tio2malaysia.com -d www.tio2malaysia.com')
    expect(bootstrap).not.toMatch(/listen\s+443|ssl_certificate/u)
  })
})
