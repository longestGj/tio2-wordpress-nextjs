import {getCurrentSite} from '@/lib/sites/current-site'

export default function HomePage() {
  const site = getCurrentSite()

  return (
    <main>
      <h1>{site.name}</h1>
      <p>Site ID: {site.id}</p>
    </main>
  )
}
