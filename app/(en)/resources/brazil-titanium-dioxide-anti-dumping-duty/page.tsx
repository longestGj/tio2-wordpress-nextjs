import '@/components/sites/tio2-my/editorial/res-trade-br.css'

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID = 'RES-TRADE-BR'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID)
}

export default function MalaysiaBrazilTradeResourceRoute() {
  return renderMalaysiaEditorialRoute(PAGE_ID)
}
