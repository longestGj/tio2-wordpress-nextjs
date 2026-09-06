import {HomepageTemplate} from '@/components/homepage/homepage-template'
import {SiteShell} from '@/components/site-shell'
import {EditorialHomepage} from '@/components/sites/tio2-a/homepage/editorial-homepage'
import {SiteAHomepageShell} from '@/components/sites/tio2-a/site-a-homepage-shell'
import {BrandHomepage} from '@/components/sites/tio2-a/homepage/brand-homepage'
import {SiteABrandShell} from '@/components/sites/tio2-a/site-a-brand-shell'
import type {
  AnyHomepageDto,
  HomepageDto,
} from '@/lib/wordpress/homepage-types'
import type {SiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-types'
import type {SiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-types'
import type {MalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-types'
import {MalaysiaHomepage} from '@/components/sites/tio2-my/homepage/malaysia-homepage'
import type {SiteConfig} from '@/sites'
import {getSiteTemplateProfile} from '@/sites'

interface HomepageRendererProps {
  readonly site: SiteConfig
  readonly homepage: AnyHomepageDto
  readonly jsonLd?: string
}

function isSiteAEditorialHomepage(
  homepage: AnyHomepageDto,
): homepage is SiteAEditorialHomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.2-editorial-geo'
}

function isSiteABrandHomepage(homepage: AnyHomepageDto): homepage is SiteABrandHomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.3-brand'
}

function isLegacyHomepage(homepage: AnyHomepageDto): homepage is HomepageDto {
  return homepage.identity.schemaVersion === 'homepage-v0.1'
}

function isMalaysiaHomepage(homepage: AnyHomepageDto): homepage is MalaysiaHomepageDto {
  return homepage.identity.siteId === 'tio2-my' &&
    homepage.identity.schemaVersion === 'homepage-v0.4-malaysia'
}

export function HomepageRenderer({site, homepage, jsonLd}: HomepageRendererProps) {
  const profile = getSiteTemplateProfile(site.id)
  const structuredData = jsonLd ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: jsonLd}}
    />
  ) : null

  if (
    profile.homepage.key === 'tio2-my-homepage-v0.4' &&
    isMalaysiaHomepage(homepage)
  ) {
    return <MalaysiaHomepage homepage={homepage} structuredData={structuredData} />
  }

  if (
    profile.homepage.key === 'site-a-homepage-brand-v0.3' &&
    isSiteABrandHomepage(homepage)
  ) {
    return (
      <SiteABrandShell site={site} structuredData={structuredData}>
        <BrandHomepage homepage={homepage} />
      </SiteABrandShell>
    )
  }

  if (
    site.id === 'tio2-a' &&
    isSiteAEditorialHomepage(homepage)
  ) {
    return (
      <SiteAHomepageShell
        site={site}
        headerRfq={homepage.headerRfq}
        structuredData={structuredData}
      >
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
        {structuredData}
        <HomepageTemplate homepage={homepage} />
      </SiteShell>
    )
  }

  throw new Error(`Homepage template/data mismatch for ${site.id}`)
}
