import '@/components/sites/tio2-my/editorial/res-chemours.css'

import {generateMalaysiaEditorialMetadata,renderMalaysiaEditorialRoute} from '@/lib/editorial/malaysia-editorial-route'

const PAGE_ID='RES-CHEMOURS'

export function generateMetadata(){return generateMalaysiaEditorialMetadata(PAGE_ID)}

export default function MalaysiaAlternativeResourceRoute(){return renderMalaysiaEditorialRoute(PAGE_ID)}
