import type {SiteConfig} from '@/sites'
import {getSiteTemplateProfile} from '@/sites'

interface SiteHeaderProps {
  readonly site: SiteConfig
}

export function SiteHeader({site}: SiteHeaderProps) {
  const profile = getSiteTemplateProfile(site.id)

  if (profile.shell.key === 'site-b-shell-v0.1-frozen') {
    return <header>{site.name}</header>
  }

  return null
}
