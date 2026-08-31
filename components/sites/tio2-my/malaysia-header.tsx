import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'
import {MalaysiaGlobalHeader} from './malaysia-global-chrome'

export function MalaysiaHeader({chrome}: {readonly chrome: Tio2MyGlobalChrome}) {
  return (
    <MalaysiaGlobalHeader
      chrome={chrome}
      currentPageId="HOME-001"
      sourcePageId="HOME-001"
    />
  )
}
