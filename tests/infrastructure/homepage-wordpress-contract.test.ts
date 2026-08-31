import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const contentTypes = readFileSync(
  'wordpress/plugins/tio2-site-model/includes/content-types.php',
  'utf8',
)
const publication = readFileSync(
  'wordpress/plugins/tio2-site-model/includes/publication.php',
  'utf8',
)
const fields = readFileSync(
  'wordpress/plugins/tio2-site-model/includes/fields.php',
  'utf8',
)
const routes = JSON.parse(
  readFileSync(
    'wordpress/plugins/tio2-site-model/config/public-routes.json',
    'utf8',
  ),
) as {
  sites: Record<
    string,
    {expectedPublicUrls: number; routes: Array<{path: string; template: string}>}
  >
}

describe('Malaysia WordPress site-scope boundary', () => {
  it('registers tio2-my with its dedicated Homepage schema and one root route', () => {
    expect(contentTypes).toContain("return ['tio2-a', 'tio2-b', 'tio2-my'];")
    expect(contentTypes).toContain("'tio2-my' => 'homepage-v0.4-malaysia'")
    expect(routes.sites['tio2-my']).toEqual({
      expectedPublicUrls: 1,
      routes: [{path: '/', template: 'tio2-my-homepage-v0.4'}],
    })
  })

  it('uses the central supported-site registry at generic publication boundaries', () => {
    expect(publication).not.toContain("['tio2-a', 'tio2-b']")
    expect(fields).not.toContain("['tio2-a', 'tio2-b']")
    expect(publication).toContain('tio2_supported_site_ids()')
    expect(fields).toContain('tio2_supported_site_ids()')
  })
})
