import '@/components/sites/tio2-my/editorial/res-trade-in.css'

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID = 'RES-TRADE-IN'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID)
}

export default function MalaysiaIndiaTradeResourceRoute() {
  return renderMalaysiaEditorialRoute(PAGE_ID)
}
