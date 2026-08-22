import type {SiteConfig} from '@/sites'

interface SiteShellProps {
  readonly site: SiteConfig
  readonly children: React.ReactNode
}

export function SiteShell({site, children}: SiteShellProps) {
  return (
    <main data-site-id={site.id}>
      <p>{site.name}</p>
      {children}
    </main>
  )
}
