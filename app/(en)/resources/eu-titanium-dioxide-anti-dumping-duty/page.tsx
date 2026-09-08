import '@/components/sites/tio2-my/editorial/res-trade-eu.css'

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID = 'RES-TRADE-EU'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID)
}

export default function MalaysiaEuTradeResourceRoute() {
  return renderMalaysiaEditorialRoute(PAGE_ID)
}
