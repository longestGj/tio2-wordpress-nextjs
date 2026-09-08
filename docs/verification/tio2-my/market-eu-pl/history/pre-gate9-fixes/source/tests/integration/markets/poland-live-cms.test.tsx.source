// @vitest-environment jsdom
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {renderToStaticMarkup} from 'react-dom/server'
import {expect,it} from 'vitest'
import {toMalaysiaPolandMarketPageDto} from '@/lib/wordpress/market-page-poland-v01-dto'
import {MalaysiaPolandMarketPage} from '@/components/sites/tio2-my/markets/malaysia-poland-market-page'

// Opt-in local mutation: only the explicitly selected record; PHP always restores.
it.skipIf(!process.env.POLAND_LOCAL_PROBE_POST_ID)('real local WordPress edit reaches GraphQL, DTO and server rendering, then restores',()=>{
  const postId=process.env.POLAND_LOCAL_PROBE_POST_ID!
  expect(postId).toMatch(/^\d+$/)
  const seedHash=createHash('sha256').update(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json')).digest('hex')
  const output=execFileSync('docker',['compose','--env-file','wordpress/.env','-f','wordpress/docker-compose.yml','run','--rm','--no-TTY','--user','33:33','-e','WP_ENVIRONMENT_TYPE=local','wpcli','wp','eval-file','/workspace/tests/infrastructure/php/poland-live-probe.php',postId,seedHash],{encoding:'utf8',timeout:45000})
  const result=JSON.parse(output.trim())
  expect(result.postId).toBe(Number(postId));expect(result.restoredSha256).toBe(seedHash)
  expect(result.before).toEqual(result.restored)
  const before=toMalaysiaPolandMarketPageDto(result.before),edited=toMalaysiaPolandMarketPageDto(result.edited)
  expect(renderToStaticMarkup(<MalaysiaPolandMarketPage marketPage={edited}/>)).toContain('Temporary local Poland editorial verification.')
  expect(renderToStaticMarkup(<MalaysiaPolandMarketPage marketPage={before}/>)).not.toContain('Temporary local Poland editorial verification.')
  const root='docs/verification/tio2-my/market-eu-pl'
  mkdirSync(root,{recursive:true})
  writeFileSync(root+'/live-cms-probe.json',JSON.stringify({checkedAt:new Date().toISOString(),postId:result.postId,siteScope:before.identity.siteScope,source:'real local WordPress via WPGraphQL execution',storedEditRendered:true,originalRestored:true,sha256:seedHash,httpCacheVerified:false},null,2)+'\n')
},50000)
