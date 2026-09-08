import '@/components/sites/tio2-my/editorial/market-eu-de.css'
import {generateMalaysiaEditorialMetadata, renderMalaysiaEditorialRoute} from '@/lib/editorial/malaysia-editorial-route'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata('MARKET-EU-DE')
}

export default function GermanyMarketRoute() {
  return renderMalaysiaEditorialRoute('MARKET-EU-DE')
}
