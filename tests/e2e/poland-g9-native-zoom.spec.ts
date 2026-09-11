import {requiredLocalUrl} from './support/required-local-url'
import {test,expect,chromium} from '@playwright/test'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin
test('E03 native browser tab zoom 200 percent with fixed window and keyboard access',async()=>{
  expect(['localhost','127.0.0.1']).toContain(new URL(base).hostname)
  const root=resolve('docs/verification/tio2-my/market-eu-pl/gate9-fixes-v02/native-zoom')
  mkdirSync(root,{recursive:true});mkdirSync('.tmp',{recursive:true})
  const work=mkdtempSync(resolve('.tmp/poland-zoom-')),extension=resolve(work,'extension')
  mkdirSync(extension)
  writeFileSync(resolve(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local Poland zoom verification',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1/*','http://localhost/*'],background:{service_worker:'worker.js'}}))
  writeFileSync(resolve(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});')
  const context=await chromium.launchPersistentContext(resolve(work,'profile'),{channel:'chromium',headless:true,viewport:null,deviceScaleFactor:undefined,isMobile:undefined,args:['--window-size=1440,1000',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]})
  try {
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    const page=await context.newPage();await page.goto(base+'/markets/poland/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready)
    const measure=()=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,visualScale:visualViewport?.scale,scrollWidth:document.documentElement.scrollWidth}))
    const before=await measure()
    const tab=await worker.evaluate(async origin=>{
      // chrome.tabs is provided by this isolated test extension, not application code.
      const api=(globalThis as unknown as {chrome:{tabs:{query:(o:object)=>Promise<Array<{id:number;url?:string}>>}}}).chrome
      return (await api.tabs.query({})).find(t=>t.url?.startsWith(origin))!.id
    },base)
    const zoom=async(factor:number)=>worker.evaluate(async({tab,factor})=>{
      const api=(globalThis as unknown as {chrome:{tabs:{setZoom:(id:number,factor:number)=>Promise<void>;getZoom:(id:number)=>Promise<number>}}}).chrome
      await api.tabs.setZoom(tab,factor);return api.tabs.getZoom(tab)
    },{tab,factor})
    expect(await zoom(2)).toBe(2)
    await expect.poll(async()=>(await measure()).dpr).toBeCloseTo(before.dpr*2,3)
    const after=await measure()
    expect(after.outerWidth).toBe(before.outerWidth)
    expect(Math.abs(after.innerWidth*2-before.innerWidth)).toBeLessThanOrEqual(2)
    expect(after.scrollWidth).toBeLessThanOrEqual(after.innerWidth)
    await expect(page.locator('main h1')).toBeVisible()
    const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
    await trigger.focus();await page.keyboard.press('Enter')
    const menu=page.getByRole('dialog',{name:'Primary navigation menu'})
    await expect(menu).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
    const cookieTrigger=page.getByRole('button',{name:'Cookie Settings',exact:true})
    await cookieTrigger.focus();await page.keyboard.press('Enter')
    const cookie=page.getByRole('dialog',{name:'Cookie settings',exact:true})
    await expect(cookie).toBeVisible()
    await page.screenshot({path:resolve(root,'cookie-native-200.png')})
    await page.keyboard.press('Escape');await expect(cookieTrigger).toBeFocused()
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:resolve(root,'page-native-200.png'),fullPage:true})
    expect(await zoom(1)).toBe(1)
    writeFileSync(resolve(root,'evidence.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,browser:context.browser()?.version(),method:'Chromium native per-tab browser zoom via chrome.tabs.setZoom(2); no viewport resize, pageScaleFactor or CSS zoom',before,after,nativeZoomFactor:2,keyboard:true,restoredZoomFactor:1,limitations:'Headless Chromium native zoom; browser toolbar itself not screenshot, no real device or screen-reader claim'},null,2)+'\n')
  } finally {await context.close()}
})
test.setTimeout(45000)
