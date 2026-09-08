import '@/components/sites/tio2-my/editorial/product-proc-su.css'

import {
  generateMalaysiaEditorialMetadata,
  renderMalaysiaEditorialRoute,
} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID = 'PRODUCT-PROC-SU'

export function generateMetadata() {
  return generateMalaysiaEditorialMetadata(PAGE_ID)
}

export default function Page() {
  return renderMalaysiaEditorialRoute(PAGE_ID)
}
