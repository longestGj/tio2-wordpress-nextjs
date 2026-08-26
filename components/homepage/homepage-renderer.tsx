import {HomepageTemplate} from '@/components/homepage/homepage-template'
import {SiteShell} from '@/components/site-shell'
import {EditorialHomepage} from '@/components/sites/tio2-a/homepage/editorial-homepage'
import {SiteAHomepageShell} from '@/components/sites/tio2-a/site-a-homepage-shell'
import type {
  AnyHomepageDto,
  HomepageDto,
} from '@/lib/wordpress/homepage-types'
import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'
import type {SiteConfig} from '@/sites'
import {getSiteTemplateProfile} from '@/sites'

interface HomepageRendererProps {
  readonly site: SiteConfig
  readonly homepage: AnyHomepageDto
}

function isSiteAEditorialHomepage(
  homepage: AnyHomepageDto,
): homepage is SiteAEditorialHomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.2-editorial-geo'
}

function isLegacyHomepage(homepage: AnyHomepageDto): homepage is HomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.1'
}

export function HomepageRenderer({site, homepage}: HomepageRendererProps) {
  const profile = getSiteTemplateProfile(site.id)

  if (
    profile.homepage.key === 'site-a-homepage-editorial-v0.2' &&
    isSiteAEditorialHomepage(homepage)
  ) {
    return (
      <SiteAHomepageShell site={site} headerRfq={homepage.headerRfq}>
        <EditorialHomepage homepage={homepage} />
      </SiteAHomepageShell>
    )
  }

  if (
    profile.homepage.key === 'site-b-homepage-v0.1-frozen' &&
    isLegacyHomepage(homepage)
  ) {
    return (
      <SiteShell site={site}>
        <HomepageTemplate homepage={homepage} />
      </SiteShell>
    )
  }

  throw new Error(`Homepage template/data mismatch for ${site.id}`)
}
