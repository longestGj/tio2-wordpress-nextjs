import {describe, expect, it} from 'vitest'
import {getSiteTemplateProfile} from '@/sites/template-profiles'

describe('site template profiles', () => {
  it.each([
    ['tio2-a', 'site-a-shell-active', 'active', 'site-a-homepage-active', 'active'],
    ['tio2-b', 'site-b-shell-v0.1-frozen', 'frozen', 'site-b-homepage-v0.1-frozen', 'frozen'],
  ] as const)('registers the approved %s runtime binding', (siteId, shellKey, shellState, homepageKey, homepageState) => {
    expect(getSiteTemplateProfile(siteId)).toMatchObject({
      siteId,
      shell: {key: shellKey, state: shellState, proposalId: 'site-template-decoupling-v0.1'},
      homepage: {
        key: homepageKey,
        state: homepageState,
        schemaVersion: 'homepage-v0.1',
        proposalId: 'site-template-decoupling-v0.1',
      },
    })
  })

  it('keeps nested profile runtime bindings immutable', () => {
    const profile = getSiteTemplateProfile('tio2-b')

    expect(() => Object.assign(profile.shell, {state: 'active'})).toThrow(TypeError)
    expect(() => Object.assign(profile.homepage, {key: 'site-a-homepage-active'})).toThrow(TypeError)
    expect(getSiteTemplateProfile('tio2-b').homepage.key).toBe('site-b-homepage-v0.1-frozen')
  })

  it('rejects unknown site profiles', () => {
    expect(() => getSiteTemplateProfile('unknown' as never)).toThrow('Unknown site ID: unknown')
  })
})
