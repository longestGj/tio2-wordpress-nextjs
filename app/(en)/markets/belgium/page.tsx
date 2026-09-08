import type {Metadata} from 'next'
import {generateMalaysiaCountryMarketMetadata, renderMalaysiaCountryMarketRoute} from '@/lib/markets/malaysia-country-market-route'

export const revalidate = 3600
export const generateMetadata = (): Promise<Metadata> => generateMalaysiaCountryMarketMetadata('MARKET-EU-BE')
export default function BelgiumMarketRoute() { return renderMalaysiaCountryMarketRoute('MARKET-EU-BE') }
