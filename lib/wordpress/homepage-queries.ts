import type {FetchGraphQLOptions} from './client'
import type {SiteId} from '@/sites'
import {getSiteTemplateProfile} from '@/sites'
import {fetchGraphQL} from './client'
import {homepageContentTag, routeTag, siteTag} from './cache-tags'
import {
  GetHomepageDocument,
} from './generated'
import type {
  GetHomepageQuery,
  GetHomepageQueryVariables,
} from './generated'
import {toHomepageDto} from './homepage-dto'
import {getHomepageLinkPolicy} from './homepage-link-policy'
import type {AnyHomepageDto, HomepageDto} from './homepage-types'
import {getSiteAEditorialHomepage} from './homepage-v02-queries'
import {getSiteABrandHomepage} from './homepage-v03-queries'
import {getMalaysiaHomepage} from './homepage-v04-queries'

export const GET_HOMEPAGE = GetHomepageDocument

async function getLegacyHomepage(
  siteId: SiteId,
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<HomepageDto | null> {
  const data = await fetchGraphQL<
    GetHomepageQuery,
    GetHomepageQueryVariables
  >(
    GET_HOMEPAGE,
    {slug: `${siteId}--homepage`},
    {
      ...options,
      tags: [
        siteTag(siteId),
        routeTag(siteId, '/'),
        homepageContentTag(siteId),
      ],
    },
  )

  return data.tio2Homepage
    ? toHomepageDto(data.tio2Homepage, siteId, {
        linkPolicy: getHomepageLinkPolicy(siteId),
      })
    : null
}

export async function getHomepage(
  siteId: SiteId,
  options: Pick<FetchGraphQLOptions, 'timeoutMs'> = {},
): Promise<AnyHomepageDto | null> {
  const profile = getSiteTemplateProfile(siteId)

  if (profile.homepage.schemaVersion === 'homepage-v0.4-malaysia') {
    if (siteId !== 'tio2-my') throw new Error(`Unsupported Malaysia Homepage owner: ${siteId}`)
    return getMalaysiaHomepage(options)
  }

  if (profile.homepage.schemaVersion === 'homepage-v0.3-brand') {
    if (siteId !== 'tio2-a') throw new Error(`Unsupported brand Homepage owner: ${siteId}`)
    return getSiteABrandHomepage(options)
  }

  if (profile.homepage.schemaVersion === 'homepage-v0.2-editorial-geo') {
    if (siteId !== 'tio2-a') {
      throw new Error(`Unsupported editorial Homepage owner: ${siteId}`)
    }
    return getSiteAEditorialHomepage(siteId, options)
  }

  return getLegacyHomepage(siteId, options)
}
