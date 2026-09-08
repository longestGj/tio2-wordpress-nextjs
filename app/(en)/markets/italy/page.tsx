import '@/components/sites/tio2-my/editorial/market-eu-it.css'
import {generateMalaysiaEditorialMetadata, renderMalaysiaEditorialRoute} from '@/lib/editorial/malaysia-editorial-route'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata('MARKET-EU-IT')
}

export default function ItalyMarketRoute() {
  return renderMalaysiaEditorialRoute('MARKET-EU-IT')
}
