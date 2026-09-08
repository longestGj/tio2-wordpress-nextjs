import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

interface PublicLogo {
  readonly src: string
  readonly alt: string
  readonly width: number
  readonly height: number
}

export interface MalaysiaGlobalChromePublicProjection {
  readonly logo: {
    readonly primary: PublicLogo
    readonly reverse: PublicLogo
  }
  readonly navigation: readonly {readonly label: string; readonly href: string}[]
  readonly rfq: {readonly label: string; readonly compactLabel: string; readonly href: string}
  readonly footer: {
    readonly headings: {readonly explore: string; readonly information: string; readonly procurement: string}
    readonly description: string
    readonly explore: readonly {readonly label: string; readonly href: string}[]
    readonly information: readonly {readonly label: string; readonly href: string}[]
    readonly legalUtilities: readonly {readonly label: string; readonly href: string | null}[]
    readonly copyright: string
  }
}

function publicLogo(logo: PublicLogo): PublicLogo {
  return {src: logo.src, alt: logo.alt, width: logo.width, height: logo.height}
}

export function projectMalaysiaGlobalChrome(chrome: Tio2MyGlobalChrome): MalaysiaGlobalChromePublicProjection {
  const navigation = chrome.navigation.map(({label, href}) => ({label, href}))
  const byId = new Map(chrome.navigation.map((item) => [item.targetPageId, {label: item.label, href: item.href}]))
  return {
    logo: {primary: publicLogo(chrome.logo.primary), reverse: publicLogo(chrome.logo.reverse)},
    navigation,
    rfq: {label: chrome.rfq.label, compactLabel: chrome.rfq.compactLabel, href: chrome.rfq.href},
    footer: {
      headings: {...chrome.footer.headings},
      description: chrome.footer.description,
      explore: chrome.footer.explore.flatMap((id) => byId.get(id) ?? []),
      information: chrome.footer.information.flatMap((id) => byId.get(id) ?? []),
      legalUtilities: chrome.footer.legalUtilities.map(({label, href}) => ({label, href})),
      copyright: chrome.footer.copyright,
    },
  }
}
