import {readFileSync} from 'node:fs'
import {parse} from 'yaml'
import {describe, expect, it} from 'vitest'

describe('local WordPress compose stack', () => {
  const compose = parse(readFileSync('wordpress/docker-compose.yml', 'utf8'))

  it('defines isolated database, WordPress, and WP-CLI services', () => {
    expect(Object.keys(compose.services)).toEqual(['db', 'wordpress', 'wpcli'])
    expect(compose.services.wordpress.depends_on.db.condition).toBe('service_healthy')
    expect(compose.services.wordpress.ports).toContain('8080:80')
  })

  it('persists database and uploads data', () => {
    expect(Object.keys(compose.volumes)).toEqual(
      expect.arrayContaining(['db_data', 'wp_data'])
    )
  })

  it('exposes the repository site model to WordPress and WP-CLI', () => {
    const siteModelMount =
      './plugins/tio2-site-model:/var/www/html/wp-content/plugins/tio2-site-model:ro'

    expect(compose.services.wordpress.volumes).toContain(siteModelMount)
    expect(compose.services.wpcli.volumes).toContain(siteModelMount)
    expect(compose.services.wpcli.volumes).toContain('..:/workspace')
  })
})
