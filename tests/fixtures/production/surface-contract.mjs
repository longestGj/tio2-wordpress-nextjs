import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
// Frozen surface remains unchanged. Proxy and approved editorial paths define
// whether the input URL has an intentional canonical 308 before final status.
export const surface=JSON.parse(readFileSync(resolve('ops/production/release-surface.json'),'utf8'))
const proxy=readFileSync(resolve('proxy.ts'),'utf8')
const section=proxy.split('const MALAYSIA_TRAILING_SLASH_PATHS = new Set([')[1].split('])')[0]
const slash=new Set([...section.matchAll(/'([^']+)'/g)].map(m=>m[1]))
const contracts=readFileSync(resolve('lib/editorial/malaysia-editorial-contracts.ts'),'utf8')
for(const match of contracts.matchAll(/from '@\/(wordpress\/plugins\/[^']+\.json)'/g)){
 const data=JSON.parse(readFileSync(resolve(match[1]),'utf8'));slash.add(data.identity.path.replace(/\/$/,''))
}
export function canonical(path){const bare=path.replace(/\/$/,'');return path==='/'?path:path==='/404/'?path:slash.has(bare)?bare+'/':bare}
