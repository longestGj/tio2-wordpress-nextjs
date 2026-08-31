import {describe, expect, it} from 'vitest'
import {getSiteTemplateProfile} from '@/sites/template-profiles'

describe('site template profiles', () => {
  it.each([
    ['tio2-a', 'site-a-shell-active', 'active', 'site-a-homepage-brand-v0.3', 'active', 'homepage-v0.3-brand', 'site-template-decoupling-v0.1'],
    ['tio2-b', 'site-b-shell-v0.1-frozen', 'frozen', 'site-b-homepage-v0.1-frozen', 'frozen', 'homepage-v0.1', 'site-template-decoupling-v0.1'],
    ['tio2-my', 'tio2-my-shell-v0.4', 'active', 'tio2-my-homepage-v0.4', 'active', 'homepage-v0.4-malaysia', 'HOME-001-G7-HANDOFF-01'],
  ] as const)('registers the approved %s runtime binding', (siteId, shellKey, shellState, homepageKey, homepageState, schemaVersion, proposalId) => {
    expect(getSiteTemplateProfile(siteId)).toMatchObject({
      siteId,
      shell: {key: shellKey, state: shellState, proposalId},
      homepage: {
        key: homepageKey,
        state: homepageState,
        schemaVersion,
        proposalId,
      },
    })
  })

  it('activates the Site A brand homepage profile', () => {
    expect(getSiteTemplateProfile('tio2-a').homepage).toMatchObject({
      key: 'site-a-homepage-brand-v0.3',
      state: 'active',
      schemaVersion: 'homepage-v0.3-brand',
    })
  })

  it('keeps nested profile runtime bindings immutable', () => {
    const profile = getSiteTemplateProfile('tio2-b')

    expect(() => Object.assign(profile.shell, {state: 'active'})).toThrow(TypeError)
    expect(() => Object.assign(profile.homepage, {key: 'site-a-homepage-editorial-v0.2'})).toThrow(TypeError)
    expect(getSiteTemplateProfile('tio2-b').homepage.key).toBe('site-b-homepage-v0.1-frozen')
  })

  it('rejects unknown site profiles', () => {
    expect(() => getSiteTemplateProfile('unknown' as never)).toThrow('Unknown site ID: unknown')
  })
})
