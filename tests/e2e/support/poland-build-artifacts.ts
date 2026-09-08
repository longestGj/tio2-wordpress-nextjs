import {test as baseTest} from '@playwright/test'
import {existsSync,readFileSync} from 'node:fs'
import {extname,resolve,sep} from 'node:path'

export const artifactMode=process.env.POLAND_ARTIFACT_MODE==='1'
export const artifactOrigin='https://poland-artifact.test'
// Offline browser check: no listening server and no outbound requests. Serve only
// files from the completed local build/public directories to the test browser.
export const test=baseTest.extend({page:async({page},providePage)=>{
  if(artifactMode)await page.route('**/*',async route=>{
    const request=route.request(),url=new URL(request.url())
    if(url.origin!==artifactOrigin||request.method()!=='GET')return route.abort('blockedbyclient')
    const pathname=decodeURIComponent(url.pathname)
    let root:string,relative:string
    if(pathname.startsWith('/_next/static/')) {
      root=resolve('.next-poland/static');relative=pathname.slice('/_next/static/'.length)
    } else {
      root=resolve('public');relative=pathname.slice(1)
      const publicFile=resolve(root,relative)
      if(!publicFile.startsWith(root+sep)||!existsSync(publicFile)) {
        root=resolve('.next-poland/server/app')
        relative=(pathname==='/'?'index':pathname.replace(/^\/|\/$/g,''))+(request.headers().rsc==='1'?'.rsc':'.html')
      }
    }
    const file=resolve(root,relative)
    if(!file.startsWith(root+sep)||!existsSync(file))return route.fulfill({status:404,body:'Offline build artifact unavailable'})
    const types:Record<string,string>={'.html':'text/html','.rsc':'text/x-component','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'}
    return route.fulfill({status:200,contentType:types[extname(file)]??'application/octet-stream',body:readFileSync(file)})
  })
  await providePage(page)
}})
