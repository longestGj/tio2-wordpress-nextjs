import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'
import {projectMalaysiaGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-public'

import {MalaysiaGlobalFooterClient, MalaysiaGlobalHeaderClient} from './malaysia-global-chrome-client'

interface GlobalChromeProps {
  readonly chrome: Tio2MyGlobalChrome
  readonly currentPageId: string
  readonly sourcePageId: string
}

const inlineMobileMenuSources = new Set([
  'MARKET-EU-DE', 'MARKET-EU-IT', 'PRODUCT-PROC-SU', 'RES-R706', 'RES-CHEMOURS',
])

export function MalaysiaGlobalHeader({chrome, currentPageId, sourcePageId}: GlobalChromeProps) {
  return <MalaysiaGlobalHeaderClient
    chrome={projectMalaysiaGlobalChrome(chrome)}
    currentHref={chrome.navigation.find((item) => item.targetPageId === currentPageId)?.href ?? null}
    inlineMobileMenu={inlineMobileMenuSources.has(sourcePageId)}
  />
}

export function MalaysiaGlobalFooter({chrome, sourcePageId}: Omit<GlobalChromeProps, 'currentPageId'>) {
  return <MalaysiaGlobalFooterClient
    chrome={projectMalaysiaGlobalChrome(chrome)}
    inlineMobileMenu={inlineMobileMenuSources.has(sourcePageId)}
  />
}
