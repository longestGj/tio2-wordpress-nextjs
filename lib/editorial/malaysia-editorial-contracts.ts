import coat from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-coat.json'
import plas from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-plas.json'
import mb from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-mb.json'
import ink from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-ink.json'
import paper from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-paper.json'
import eu from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-eu.json'
import uk from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-uk.json'
import india from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-in.json'
import brazil from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-trade-br.json'
import type {EditorialContract} from './editorial-types'
import germany from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-market-eu-de.json'
import italy from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-market-eu-it.json'
import sulfate from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-product-proc-su.json'
import r706 from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-r706.json'
import chemours from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-res-chemours.json'

export const EDITORIAL_IDS=['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER','MARKET-EU-DE','MARKET-EU-IT','PRODUCT-PROC-SU','RES-R706','RES-CHEMOURS'] as const
export type EditorialPageId=typeof EDITORIAL_IDS[number]
export const EDITORIAL_CONTRACTS=Object.freeze([eu,uk,india,brazil,coat,plas,mb,ink,paper,germany,italy,sulfate,r706,chemours] as unknown as readonly EditorialContract[])
export function getEditorialContract(pageId:string):EditorialContract {
  const page=EDITORIAL_CONTRACTS.find(p=>p.identity.pageId===pageId)
  if(!page || page.identity.siteScope!=='tio2-my' || !EDITORIAL_IDS.includes(pageId as EditorialPageId)) throw new Error('Unknown Malaysia editorial Page ID')
  return page
}
export function editorialTag(siteScope:string,pageId:string):string {
  if(siteScope!=='tio2-my') throw new Error('Editorial scope mismatch')
  getEditorialContract(pageId)
  return `content:tio2-my--editorial--${pageId}--en`
}
export function editorialPageIdForPath(path:string):string|undefined {
  return EDITORIAL_CONTRACTS.find(page=>page.identity.path.replace(/\/$/u,'')===path.replace(/\/$/u,''))?.identity.pageId
}
