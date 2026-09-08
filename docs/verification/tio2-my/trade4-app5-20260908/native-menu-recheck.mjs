import {chromium, expect} from '@playwright/test'
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {createHash} from 'node:crypto'

const ids=['RES-TRADE-EU','RES-TRADE-UK','RES-TRADE-IN','RES-TRADE-BR','APP-COAT','APP-PLAS','APP-MB','APP-INK','APP-PAPER']
const build='UV4ipmsCJ7cj7M2EHPfID', base='http://127.0.0.1:3216'
const output=resolve('docs/verification/tio2-my/trade4-app5-20260908/native-zoom')
const temp=mkdtempSync(resolve('.tmp/editorial-menu-recheck-')), extension=resolve(temp,'extension')
mkdirSync(extension)
writeFileSync(resolve(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local editorial native menu recheck',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1/*'],background:{service_worker:'worker.js'}}))
writeFileSync(resolve(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});')
for(const id of ids) for(const file of [`${id}-menu.png`,`${id}.json`]) copyFileSync(resolve(output,file),resolve(temp,file))
const context=await chromium.launchPersistentContext(resolve(temp,'profile'),{channel:'chromium',headless:true,viewport:null,deviceScaleFactor:undefined,isMobile:undefined,args:['--window-size=1440,1000','--disable-gpu',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]})
const results=[]
try {
 const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
 for(const id of ids) {
  const contract=JSON.parse(readFileSync(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`,'utf8'))
  const page=await context.newPage(),response=await page.goto(base+contract.identity.path,{waitUntil:'networkidle'})
  expect(response.status()).toBe(200);expect(await response.text()).toContain(build)
  await page.bringToFront()
  const tab=await worker.evaluate(async url=>(await chrome.tabs.query({})).find(t=>t.url===url).id,page.url())
  const zoom=factor=>worker.evaluate(async ({tab,factor})=>{await chrome.tabs.setZoom(tab,factor);return chrome.tabs.getZoom(tab)},{tab,factor})
  const measure=()=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,scrollWidth:document.documentElement.scrollWidth}))
  await zoom(1);const before=await measure();expect(await zoom(2)).toBe(2)
  await expect.poll(async()=>(await measure()).dpr).toBe(before.dpr*2)
  await page.evaluate(()=>document.fonts.ready)
  const after=await measure()
  expect(after.outerWidth).toBe(before.outerWidth);expect(after.innerWidth*2).toBe(before.innerWidth);expect(after.scrollWidth).toBe(after.innerWidth)
  const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
  await trigger.focus();await page.keyboard.press('Enter')
  const dialog=page.getByRole('dialog',{name:'Primary navigation menu',exact:true}),close=dialog.getByRole('button',{name:'Close primary navigation menu',exact:true})
  await expect(close).toBeFocused()
  await dialog.locator('img').evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw new Error('Undecoded menu logo')})
  const cdp=await context.newCDPSession(page)
  const immediate=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false})
  writeFileSync(resolve(temp,`${id}-immediate-cdp.png`),Buffer.from(immediate.data,'base64'))
  await page.waitForTimeout(500)
  const captures=[]
  async function capture(file) {
   await page.bringToFront()
   await page.waitForTimeout(500)
   const pre=await measure(),shot=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false}),bytes=Buffer.from(shot.data,'base64'),post=await measure()
   expect(post).toEqual(pre);expect(await worker.evaluate(tab=>chrome.tabs.getZoom(tab),tab)).toBe(2)
   const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20)
   expect(width).toBe(1424);expect(height).toBe(905)
   writeFileSync(resolve(output,file),bytes)
   captures.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),width,height,method:'native tabs.setZoom(2), viewport:null, Chromium --disable-gpu, page.bringToFront then 500ms settle, direct CDP viewport capture fromSurface:true; native metrics unchanged before/after',time:new Date().toISOString()})
  }
  await capture(`${id}-menu.png`)
  const topRfq=dialog.getByRole('link',{name:'RFQ',exact:true}),last=dialog.getByRole('link',{name:'Request a Quote',exact:true})
  await page.keyboard.press('Shift+Tab');await expect(topRfq).toBeFocused()
  await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();await expect(last).toBeInViewport({ratio:1})
  await page.waitForTimeout(500);await capture(`${id}-menu-rfq.png`)
  const lastRect=await last.boundingBox()
  await page.keyboard.press('Tab');await expect(topRfq).toBeFocused()
  await page.keyboard.press('Tab');await expect(close).toBeFocused()
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
  const recordPath=resolve(output,`${id}.json`),record=JSON.parse(readFileSync(recordPath,'utf8'))
  expect(record.build).toBe(build)
  record.captures=record.captures.filter(c=>c.file!==`${id}-menu.png`&&c.file!==`${id}-menu-rfq.png`).concat(captures)
  record.menuRecheck={time:new Date().toISOString(),build,before,after,nativeZoom:2,oldEvidenceDirectory:temp,keyboard:'Close -> ShiftTab top RFQ -> ShiftTab final RFQ fully in viewport -> Tab top RFQ -> Tab Close -> Escape trigger',lastRect}
  writeFileSync(recordPath,JSON.stringify(record,null,2)+'\n')
  results.push({id,...record.menuRecheck,captures});console.log(`${id}: native menu and final RFQ captured; geometry and keyboard passed`)
  await zoom(1);await page.close()
 }
} finally {await context.close();writeFileSync(resolve(temp,'results.json'),JSON.stringify(results,null,2)+'\n');console.log(`Archive: ${temp}`)}
