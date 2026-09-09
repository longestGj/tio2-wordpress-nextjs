import {describe, expect, it} from 'vitest'
import {wordpressComposeArgs} from '../helpers/wordpress-compose'

describe('WordPress test Compose selection', () => {
  it('preserves the repository default when no test override is supplied', () => {
    expect(wordpressComposeArgs({})).toEqual(['compose', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml'])
  })

  it('routes a runtime probe to the explicitly isolated files and project', () => {
    expect(wordpressComposeArgs({
      TIO2_TEST_WORDPRESS_ENV: 'D:/isolated/environment.local',
      TIO2_TEST_WORDPRESS_COMPOSE: 'D:/isolated/compose.yml',
      TIO2_TEST_WORDPRESS_PROJECT: 'isolated-unit-php',
    })).toEqual(['compose', '--env-file', 'D:/isolated/environment.local', '-f', 'D:/isolated/compose.yml', '--project-name', 'isolated-unit-php'])
  })

  it('preserves the existing environment-only override', () => {
    expect(wordpressComposeArgs({TIO2_TEST_WORDPRESS_ENV: 'D:/test.env'})).toEqual(['compose', '--env-file', 'D:/test.env', '-f', 'wordpress/docker-compose.yml'])
  })
})
