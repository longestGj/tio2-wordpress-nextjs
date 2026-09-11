import {describe, expect, it} from 'vitest'
import {wordpressComposeArgs} from '../helpers/wordpress-compose'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

describe('explicit WordPress test data ownership', () => {
  it('isolates repeated run IDs into distinct short project names and removes host HTTP', () => {
    const options = {dataMode: 'isolated' as const, runId: 'Vitest / 1234', hostHttp: false}
    const first = wordpressComposeArgs(options, {})
    expect(first).toEqual([
      'compose', '--project-name', expect.stringMatching(/^d16-test-vitest-1234-[a-f0-9]{12}$/u),
      '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml',
      '-f', 'wordpress/docker-compose.test-no-host.yml',
    ])
    expect(wordpressComposeArgs(options, {})[2]).not.toBe(first[2])
    expect(wordpressComposeArgs({...options, runId: 'a'.repeat(500)}, {})[2].length).toBeLessThanOrEqual(63)
  })
  it('requires a declared data mode and explicit serial mutation authorization', () => {
    expect(() => wordpressComposeArgs({} as never, {})).toThrow(/dataMode/u)
    expect(() => wordpressComposeArgs({dataMode: 'shared-mutating', runId: 'x', hostHttp: false}, {})).toThrow(/explicit serial authorization/u)
  })
  it('uses random loopback HTTP only for isolated host HTTP consumers', () => {
    expect(wordpressComposeArgs({dataMode: 'isolated', runId: 'x', hostHttp: true}, {}).at(-1)).toBe('wordpress/docker-compose.test-random-http.yml')
  })
  it('keeps shared access explicit and rejects environment project redirection', () => {
    for (const dataMode of ['shared-read-only', 'shared-mutating'] as const) {
      expect(wordpressComposeArgs({dataMode, runId: 'x', hostHttp: false, serialMutationAuthorized: true}, {}))
        .toEqual(['compose', '--project-name', 'wordpress', '--env-file', 'wordpress/.env', '-f', 'wordpress/docker-compose.yml'])
    }
    expect(() => wordpressComposeArgs({dataMode: 'isolated', runId: 'x', hostHttp: false}, {TIO2_TEST_WORDPRESS_PROJECT: 'wordpress'})).toThrow(/project/u)
  })
})
