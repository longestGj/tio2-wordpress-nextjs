import {describe, expect, it} from 'vitest'

import {getPublicRoutes, isPublicRoute} from '@/sites/public-routes'
import registry from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-page-registry.json'

const path = '/resources/chloride-vs-sulfate-titanium-dioxide/'

describe('RES-PROC Gate 8 release boundary', () => {
  it('allows the scoped implementation mapping without changing public inventory', () => {
    const entry = registry.entries.find((item) => item.pageId === 'RES-PROC')
    expect(entry).toMatchObject({canonicalPath: path, publicMappingAllowed: true})
    expect(getPublicRoutes('tio2-my')).toEqual([{path: '/', template: 'tio2-my-homepage-v0.4'}])
    expect(isPublicRoute('tio2-my', path)).toBe(false)
    expect(isPublicRoute('tio2-my', path.slice(0, -1))).toBe(false)
  })
})
