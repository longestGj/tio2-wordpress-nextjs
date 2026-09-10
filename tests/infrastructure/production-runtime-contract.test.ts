import {existsSync, readFileSync} from 'node:fs'
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
  ports?: string[]
  profiles?: string[]
  restart?: string
  volumes?: string[]
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
    expect(compose?.services?.wordpress.volumes).toContain(
      '/opt/tio2-production/current/wordpress/plugins/tio2-site-model:/var/www/html/wp-content/plugins/tio2-site-model:ro'
    )
    expect(compose?.services?.wpcli.volumes).toContain(
      '/opt/tio2-production/current:/release:ro'
    )
    expect(compose?.services?.wpcli.profiles).toEqual(['tools'])
    expect(compose?.services?.wpcli.image).toBe('wordpress:cli-php8.3')
    expect(source).toContain(
      'Task 4 exception: the approved constraints provide no wpcli digest; the privileged deployment layer must resolve and record the linux/arm64 digest before use.'
    )

    for (const service of ['db', 'wordpress', 'web', 'candidate']) {
      expect(compose?.services?.[service]?.restart).toBe('unless-stopped')
      expect(compose?.services?.[service]?.env_file).toEqual([rootEnvironment])
      expect(compose?.services?.[service]?.healthcheck).toMatchObject({
        test: expect.any(Array), interval: '5s', timeout: '5s', retries: 30,
      })
    }
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
    expect(dockerfile).toContain('RUN npm run build')
    expect(dockerfile).toContain('ARG SITE_ID=tio2-my')
    expect(dockerfile).toContain('ARG NODE_ENV=production')
    expect(dockerfile).toContain('ARG VERCEL_ENV=production')
    expect(dockerfile).toContain('ARG NEXT_PUBLIC_SITE_URL=https://tio2malaysia.com')
    expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next')
    expect(dockerfile).toContain('COPY --from=builder --chown=nextjs:nodejs /app/public ./public')
    expect(dockerfile).toContain('USER nextjs')
    expect(dockerfile).toContain('ENV HOSTNAME=0.0.0.0')
    expect(dockerfile).toContain('EXPOSE 3000')
    expect(dockerfile).toContain('CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]')
  })

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
})
