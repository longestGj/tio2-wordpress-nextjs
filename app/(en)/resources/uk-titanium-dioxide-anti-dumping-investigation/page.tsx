import '@/components/sites/tio2-my/editorial/res-trade-uk.css'

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID = 'RES-TRADE-UK'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID)
}

export default function MalaysiaUkTradeResourceRoute() {
  return renderMalaysiaEditorialRoute(PAGE_ID)
}
