import type {Metadata} from 'next'
import {generateMalaysiaCountryMarketMetadata, renderMalaysiaCountryMarketRoute} from '@/lib/markets/malaysia-country-market-route'

export const revalidate = 3600
export const generateMetadata = (): Promise<Metadata> => generateMalaysiaCountryMarketMetadata('MARKET-EU-ES')
export default function SpainMarketRoute() { return renderMalaysiaCountryMarketRoute('MARKET-EU-ES') }
