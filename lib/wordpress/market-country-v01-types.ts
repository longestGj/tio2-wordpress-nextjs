import type {MalaysiaCountryMarketContract, MalaysiaCountryMarketPageId} from '@/lib/markets/malaysia-country-market-contracts'
import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'

export type MalaysiaCountryMarketPageDto = MalaysiaCountryMarketContract & {
  readonly identity: MalaysiaCountryMarketContract['identity'] & {readonly pageId: MalaysiaCountryMarketPageId}
  readonly cms: {readonly id: string; readonly modified: string; readonly status: 'publish'}
  readonly globalChrome: Tio2MyGlobalChrome
}
