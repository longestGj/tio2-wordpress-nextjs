import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json'
import type {Tio2MyGlobalChrome} from './tio2-my-global-chrome-types'
export type MalaysiaUkMarketPageDto = typeof contract & {
  readonly cms: {readonly id: string; readonly modified: string; readonly status: 'publish'}
  readonly globalChrome: Tio2MyGlobalChrome
  readonly routeReadiness: Readonly<Record<string, boolean>>
}
