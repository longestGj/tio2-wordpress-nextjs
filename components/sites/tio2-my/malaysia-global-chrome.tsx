import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'
import {projectMalaysiaGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-public'

import {MalaysiaGlobalFooterClient, MalaysiaGlobalHeaderClient} from './malaysia-global-chrome-client'

interface GlobalChromeProps {
  readonly chrome: Tio2MyGlobalChrome
  readonly currentPageId: string
  readonly sourcePageId: string
}

const approvedDropdownSources = new Set([
  'MARKET-EU-DE', 'MARKET-EU-IT', 'PRODUCT-PROC-SU', 'RES-R706', 'RES-CHEMOURS',
])

export function MalaysiaGlobalHeader({chrome, currentPageId, sourcePageId}: GlobalChromeProps) {
  const privateRfqAttribution = sourcePageId === 'APP-000'
  return <MalaysiaGlobalHeaderClient
    chrome={projectMalaysiaGlobalChrome(chrome)}
    currentHref={chrome.navigation.find((item) => item.targetPageId === currentPageId)?.href ?? null}
    approvedDropdown={approvedDropdownSources.has(sourcePageId)}
    privateRfqAttribution={privateRfqAttribution}
    {...privateRfqAttribution ? {} : {publicSourcePageId: sourcePageId}}
  />
}

export function MalaysiaGlobalFooter({chrome, sourcePageId}: Omit<GlobalChromeProps, 'currentPageId'>) {
  const privateRfqAttribution = sourcePageId === 'APP-000'
  return <MalaysiaGlobalFooterClient
    chrome={projectMalaysiaGlobalChrome(chrome)}
    approvedDropdown={approvedDropdownSources.has(sourcePageId)}
    privateRfqAttribution={privateRfqAttribution}
    {...privateRfqAttribution ? {} : {publicSourcePageId: sourcePageId}}
  />
}
