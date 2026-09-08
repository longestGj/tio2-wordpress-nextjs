import {readFileSync} from 'node:fs'
import type {EditorialContract} from '../../lib/editorial/editorial-types'

export const EDITORIAL_CONTRACTS=['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER'].map(id=>JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`,'utf8')) as EditorialContract)
export function getEditorialContract(pageId:string):EditorialContract {
 const page=EDITORIAL_CONTRACTS.find(page=>page.identity.pageId===pageId)
 if(!page) throw new Error('Unknown editorial test fixture')
 return page
}
