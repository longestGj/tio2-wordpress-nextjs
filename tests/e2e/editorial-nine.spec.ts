import {requiredLocalUrl} from './support/required-local-url'
import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import {JSDOM} from 'jsdom'
import {EDITORIAL_CONTRACTS} from './editorial-fixtures'

const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin
const root=resolve(process.env.EDITORIAL_EVIDENCE_DIR??'docs/verification/tio2-my/trade4-app5-20260908/runtime')
const normalize=(text:string|null)=>String(text??'').replace(/\s+/gu,' ').trim()
test.beforeAll(()=>{expect(['127.0.0.1','localhost']).toContain(new URL(base).hostname);mkdirSync(root,{recursive:true})})
for(const contract of EDITORIAL_CONTRACTS) test(`${contract.identity.pageId} live CMS SSR and responsive interactions`,async({page,request})=>{
 test.setTimeout(180_000)
 const id=contract.identity.pageId
 const pageNetwork:Array<{url:string;method:string}>=[]
 page.on('request',request=>pageNetwork.push({url:request.url(),method:request.method()}))
 const response=await page.goto(base+contract.identity.path+'?probe=canonical',{waitUntil:'networkidle'})
 expect(response?.status()).toBe(200)
 const html=await response!.text()
 const build=readFileSync(resolve(process.env.NEXT_DIST_DIR??'.next-trade4-app5','BUILD_ID'),'utf8').trim()
 expect(html).toContain(build)
 const document=new JSDOM(html).window.document
 const taskEnv=Object.fromEntries(readFileSync('wordpress/.env','utf8').split(/\r?\n/u).filter(line=>/^[A-Z_]+=/.test(line)).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}))
 const cmsResponse=await request.post(requiredLocalUrl('EDITORIAL_WORDPRESS_GRAPHQL_URL', '/graphql').href,{headers:{'x-tio2-editorial-token':taskEnv.WORDPRESS_EDITORIAL_API_TOKEN},data:{query:'query($pageId:String!,$siteScope:String!){malaysiaEditorialRecordJson(pageId:$pageId,siteScope:$siteScope)}',variables:{pageId:id,siteScope:'tio2-my'}}})
 const cms=JSON.parse((await cmsResponse.json()).data.malaysiaEditorialRecordJson)
 const approved=new JSDOM(`<main>${contract.bodyHtml}</main>`).window.document
 for(const anchor of approved.querySelectorAll('a[href]')) {
  const href=anchor.getAttribute('href')!
  if(/^\/products\/m-[0-9]+\/$/u.test(href) && !cms.availableGradePaths.includes(href)) anchor.remove()
  else if(cms.unavailableInternalPaths.includes(href)) anchor.replaceWith(...anchor.childNodes)
 }
 expect(normalize(document.querySelector('main')?.textContent??'')).toBe(normalize(approved.querySelector('main')?.textContent??''))
 expect(document.querySelector('main h1')?.textContent).toBe(contract.heading)
 expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(contract.seo.canonical)
 expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
 expect(document.querySelector('title')?.textContent).toBe(contract.seo.title)
 expect(html).not.toContain(contract.source.packageSha256)
 expect(html).not.toContain('evidenceArtifactSha256')
 const jsonld=JSON.parse(document.querySelector('script[type="application/ld+json"]')!.textContent!)
 expect(jsonld['@graph'].map((node:Record<string,unknown>)=>node['@type'])).toEqual(['WebPage','BreadcrumbList'])
 const machineCrumbs=jsonld['@graph'][1].itemListElement as Array<{item:string}>
 for(const href of cms.unavailableInternalPaths) expect(machineCrumbs.map(item=>item.item)).not.toContain(new URL(href,contract.seo.canonical!).href)
 const browserErrors:string[]=[];page.on('pageerror',error=>browserErrors.push(error.message))
 const captures:unknown[]=[]
 for(const width of [1440,768,390]) {
  await page.setViewportSize({width,height:1000});await page.evaluate(()=>document.fonts.ready)
  for(const logo of await page.locator('header img:visible, footer img:visible').all()) {await logo.scrollIntoViewIfNeeded();expect(await logo.evaluate(async element=>{await (element as HTMLImageElement).decode();return (element as HTMLImageElement).naturalWidth>0})).toBe(true)}
  await page.evaluate(()=>scrollTo(0,0))
  const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,dpr:devicePixelRatio,font:getComputedStyle(document.querySelector('main')!).fontFamily,sharedFont:getComputedStyle(document.querySelector('main')!).getPropertyValue('--font-my-shared').trim(),bodyEditorialFont:getComputedStyle(document.body).getPropertyValue('--font-my-shared').trim(),bodyMargin:getComputedStyle(document.body).margin}))
  expect(geometry.scrollWidth).toBeLessThanOrEqual(width+1)
  expect(geometry.bodyMargin).toBe('0px')
  expect(geometry.font).toContain('Inter')
  expect(geometry.sharedFont).not.toBe('')
  expect(geometry.bodyEditorialFont).toBe('')
  const screenshot=await page.screenshot({path:resolve(root,`${id}-${width}.png`),fullPage:true})
  captures.push({width,geometry,file:`${id}-${width}.png`,sha256:createHash('sha256').update(screenshot).digest('hex')})
  const current=contract.identity.section==='resources'?'Resources':'Applications'
  if(width===1440) {await expect(page.getByRole('navigation',{name:'Primary navigation',exact:true}).getByRole('link',{name:current,exact:true})).toHaveAttribute('aria-current','page')}
  else {
   const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
   await trigger.focus();await page.keyboard.press('Enter')
   const menu=page.getByRole('dialog',{name:'Primary navigation menu'})
   await expect(menu).toBeVisible();await expect(menu.getByRole('link',{name:current,exact:true})).toHaveAttribute('aria-current','page')
   await expect(page.getByRole('navigation',{name:'Primary navigation',exact:true})).toHaveCount(0)
   const close=menu.getByRole('button',{name:'Close primary navigation menu',exact:true})
   const lastQuote=menu.getByRole('link',{name:'Request a Quote',exact:true})
   await expect(close).toBeFocused()
   await page.keyboard.press('Shift+Tab');await expect(lastQuote).toBeFocused()
   await page.keyboard.press('Tab');await expect(close).toBeFocused()
   await page.screenshot({path:resolve(root,`${id}-${width}-menu.png`)})
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
  }
 }
 const anchors=page.locator('main a[href^="#"]')
 const anchorStates=[]
 for(const anchor of await anchors.all()) {
  await anchor.focus();await page.keyboard.press('Enter')
  const state=await page.evaluate(()=>({tag:document.activeElement?.tagName,id:document.activeElement?.id,text:document.activeElement?.textContent}))
  expect(state.tag).toMatch(/^H[123]$/u);anchorStates.push(state)
 }
 const cookie=page.getByRole('button',{name:'Cookie Settings',exact:true})
 await cookie.focus();await page.keyboard.press('Enter')
 await expect(page.getByRole('dialog',{name:'Cookie settings',exact:true})).toBeVisible()
 await page.screenshot({path:resolve(root,`${id}-390-cookie.png`)})
 await page.keyboard.press('Escape');await expect(cookie).toBeFocused()
 await expect(page.getByRole('link',{name:'Terms',exact:true})).toHaveCount(0)
 await page.emulateMedia({reducedMotion:'reduce'})
 const axe=await new AxeBuilder({page}).analyze()
 const violations=axe.violations.filter(v=>['serious','critical'].includes(v.impact??''))
 writeFileSync(resolve(root,`${id}-axe.json`),JSON.stringify(axe.violations,null,2))
 expect(violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])
 const internal=[...new Set([...approved.querySelectorAll('a[href^="/"]')].map(a=>a.getAttribute('href')!))]
 const destinations=[]
 for(const path of internal) {const destination=await request.get(base+path);destinations.push({path,status:destination.status(),url:destination.url()})}
 expect(browserErrors).toEqual([])
 expect(pageNetwork.filter(r=>!['127.0.0.1','localhost'].includes(new URL(r.url).hostname))).toEqual([])
 expect(pageNetwork.filter(r=>r.method==='POST')).toEqual([])
 writeFileSync(resolve(root,`${id}.json`),JSON.stringify({id,time:new Date().toISOString(),build,base,source:contract.source,cms:{environment:'real isolated WordPress :8186',id:cms.id,availableGradePaths:cms.availableGradePaths,unavailableInternalPaths:cms.unavailableInternalPaths},captures,anchorStates,destinations,browserErrors,pageNetwork,axeSeriousCritical:violations.length},null,2))
})

test('editorial preview routes remain absent from sitemap and queryless canonicals',async({request})=>{
 const response=await request.get(base+'/sitemap.xml');expect(response.status()).toBe(200)
 const xml=await response.text()
 for(const page of EDITORIAL_CONTRACTS) expect(xml).not.toContain(`<loc>${page.seo.canonical}</loc>`)
 const robots=await request.get(base+'/robots.txt');expect(robots.status()).toBe(200)
 writeFileSync(resolve(root,'indexing.json'),JSON.stringify({time:new Date().toISOString(),sitemapStatus:response.status(),nineAbsent:true,robots:await robots.text(),indexingAuthorized:false},null,2))
})
