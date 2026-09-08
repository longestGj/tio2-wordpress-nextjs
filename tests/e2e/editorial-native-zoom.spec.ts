import {test,expect,chromium} from '@playwright/test'
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'
import sharp from 'sharp'
import {EDITORIAL_CONTRACTS} from './editorial-fixtures'

test('nine pages preserve actual browser 200% zoom and keyboard states',async()=>{
 test.setTimeout(300_000)
 const base=process.env.TIO2_MY_BASE_URL??'http://127.0.0.1:3216'
 expect(['127.0.0.1','localhost']).toContain(new URL(base).hostname)
 const output=resolve('docs/verification/tio2-my/trade4-app5-20260908/native-zoom');mkdirSync(output,{recursive:true})
 const temp=mkdtempSync(resolve('.tmp/editorial-native-')),extension=resolve(temp,'extension');mkdirSync(extension)
 writeFileSync(resolve(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local editorial native zoom verification',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1/*'],background:{service_worker:'worker.js'}}))
 writeFileSync(resolve(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});')
 const context=await chromium.launchPersistentContext(resolve(temp,'profile'),{channel:'chromium',headless:true,viewport:null,deviceScaleFactor:undefined,isMobile:undefined,args:['--window-size=1440,1000',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]})
 try {
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
  for(const contract of EDITORIAL_CONTRACTS) {
   const id=contract.identity.pageId,page=await context.newPage()
   const response=await page.goto(base+contract.identity.path,{waitUntil:'networkidle'})
   expect(response?.status()).toBe(200)
   const build=readFileSync(resolve(process.env.NEXT_DIST_DIR??'.next-trade4-app5-verified','BUILD_ID'),'utf8').trim()
   expect(await response!.text()).toContain(build)
   const tab=await worker.evaluate(async url=>{
    const api=(globalThis as unknown as {chrome:{tabs:{query:(o:object)=>Promise<Array<{id:number;url?:string}>>}}}).chrome
    return (await api.tabs.query({})).find(t=>t.url===url)!.id
   },page.url())
   const zoom=(factor:number)=>worker.evaluate(async({tab,factor})=>{
    const api=(globalThis as unknown as {chrome:{tabs:{setZoom:(id:number,n:number)=>Promise<void>;getZoom:(id:number)=>Promise<number>}}}).chrome
    await api.tabs.setZoom(tab,factor);return api.tabs.getZoom(tab)
   },{tab,factor})
   await zoom(1)
   const measure=()=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight}))
   const before=await measure();expect(await zoom(2)).toBe(2)
   await expect.poll(async()=>(await measure()).dpr).toBeCloseTo(before.dpr*2,3)
   await page.evaluate(()=>document.fonts.ready)
   for(const logo of await page.locator('header img:visible, footer img:visible').all()) {
    await logo.scrollIntoViewIfNeeded()
    expect(await logo.evaluate(async element=>{await (element as HTMLImageElement).decode();return (element as HTMLImageElement).naturalWidth>0})).toBe(true)
   }
   const after=await measure();expect(after.outerWidth).toBe(before.outerWidth);expect(Math.abs(after.innerWidth*2-before.innerWidth)).toBeLessThanOrEqual(2);expect(after.scrollWidth).toBeLessThanOrEqual(after.innerWidth+1)
   const cdp=await context.newCDPSession(page)
   const captures:Array<{file:string;sha256:string;width:number|undefined;height:number|undefined;method:string;clip?:{x:number;y:number;width:number;height:number;scale:number}}>=[]
   async function capture(name:string,fullPage=false) {
    await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))))
    const metrics=await cdp.send('Page.getLayoutMetrics')
    // Keep each bitmap below Chromium's large compositor-surface boundary.
    // Segments are direct captures, never stitched, resized or image-edited.
    const parts=fullPage?Math.ceil(metrics.contentSize.height/10000):1
    for(let part=0;part<parts;part++) {
     const clip=fullPage?{x:0,y:part*10000,width:metrics.contentSize.width,height:Math.min(10000,metrics.contentSize.height-part*10000),scale:1}:undefined
     const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage,...(clip?{clip}:{})})
     const bytes=Buffer.from(result.data,'base64'),metadata=await sharp(bytes).metadata()
     expect(metadata.width).toBeGreaterThan(after.innerWidth*1.9)
     const file=`${id}-${name}${fullPage?`-part-${part+1}`:''}.png`
     writeFileSync(resolve(output,file),bytes)
     captures.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),width:metadata.width,height:metadata.height,method:'native tabs.setZoom(2), direct CDP compositor segment',...(clip?{clip}:{})})
    }
   }
   await page.evaluate(()=>scrollTo(0,0));await capture('full',true);await capture('top')
   const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true});await trigger.focus();await page.keyboard.press('Enter')
   await expect(page.getByRole('button',{name:'Close primary navigation menu',exact:true})).toBeFocused();await capture('menu')
   await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
   const cookie=page.getByRole('button',{name:'Cookie Settings',exact:true});await cookie.focus();await page.keyboard.press('Enter')
   await expect(page.getByRole('dialog',{name:'Cookie settings',exact:true})).toBeVisible();await capture('cookie')
   await page.keyboard.press('Escape');await expect(cookie).toBeFocused()
   writeFileSync(resolve(output,`${id}.json`),JSON.stringify({id,time:new Date().toISOString(),build,before,after,captures,nativeZoom:2},null,2))
   await zoom(1);await page.close()
  }
 } finally {await context.close()}
})
