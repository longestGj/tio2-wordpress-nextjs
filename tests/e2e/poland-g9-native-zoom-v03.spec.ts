import {test,expect,chromium} from '@playwright/test'
import {createHash} from 'node:crypto'
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import sharp from 'sharp'
const base=process.env.TIO2_MY_BASE_URL??'http://127.0.0.1:3015'

test('E03 native 200 percent captures complete pixels, readable text and keyboard states',async()=>{
  expect(['localhost','127.0.0.1']).toContain(new URL(base).hostname)
  const root=resolve('docs/verification/tio2-my/market-eu-pl/gate9-fixes-v04/native-zoom')
  mkdirSync(root,{recursive:true});mkdirSync('.tmp',{recursive:true})
  const work=mkdtempSync(resolve('.tmp/poland-zoom-')),extension=resolve(work,'extension')
  mkdirSync(extension)
  writeFileSync(resolve(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Local Poland zoom verification',version:'1.0',permissions:['tabs'],host_permissions:['http://127.0.0.1/*','http://localhost/*'],background:{service_worker:'worker.js'}}))
  writeFileSync(resolve(extension,'worker.js'),'chrome.runtime.onInstalled.addListener(()=>{});')
  const context=await chromium.launchPersistentContext(resolve(work,'profile'),{channel:'chromium',headless:true,viewport:null,deviceScaleFactor:undefined,isMobile:undefined,args:['--window-size=1440,1000',`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]})
  try {
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker')
    const page=await context.newPage(),response=await page.goto(base+'/markets/poland/',{waitUntil:'domcontentloaded'})
    expect(response?.status()).toBe(200)
    const html=await response!.text(),buildId=readFileSync('.next-poland-g9-f03/BUILD_ID','utf8').trim()
    expect(html).toContain(buildId)
    await page.evaluate(()=>document.fonts.ready)
    const measure=()=>page.evaluate(()=>({innerWidth,innerHeight,outerWidth,outerHeight,dpr:devicePixelRatio,visualScale:visualViewport?.scale,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,scrollY}))
    const before=await measure()
    const tab=await worker.evaluate(async origin=>{
      const api=(globalThis as unknown as {chrome:{tabs:{query:(o:object)=>Promise<Array<{id:number;url?:string}>>}}}).chrome
      return (await api.tabs.query({})).find(t=>t.url?.startsWith(origin))!.id
    },base)
    const zoom=async(factor?:number)=>worker.evaluate(async({tab,factor})=>{
      const api=(globalThis as unknown as {chrome:{tabs:{setZoom:(id:number,factor:number)=>Promise<void>;getZoom:(id:number)=>Promise<number>}}}).chrome
      if(factor!==undefined)await api.tabs.setZoom(tab,factor)
      return api.tabs.getZoom(tab)
    },{tab,factor})
    expect(await zoom(2)).toBe(2)
    await expect.poll(async()=>(await measure()).dpr).toBeCloseTo(before.dpr*2,3)
    const after=await measure()
    expect(after.outerWidth).toBe(before.outerWidth)
    expect(Math.abs(after.innerWidth*2-before.innerWidth)).toBeLessThanOrEqual(2)
    expect(after.scrollWidth).toBeLessThanOrEqual(after.innerWidth)
    const cdp=await context.newCDPSession(page),captures:unknown[]=[],focus:unknown[]=[]
    const capture=async(name:string,fullPage=false)=>{
      await page.evaluate(()=>new Promise<void>(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r()))))
      expect(await zoom()).toBe(2)
      const geometry=await measure(),metrics=await cdp.send('Page.getLayoutMetrics')
      expect(geometry.innerWidth).toBe(after.innerWidth);expect(geometry.outerWidth).toBe(before.outerWidth)
      // In this Chromium native-zoom session, CDP clip uses rendered coordinates.
      // CSS-width Playwright clips produced half-width/off-page captures (V0.2).
      const clip=fullPage?{x:0,y:0,width:metrics.contentSize.width,height:metrics.contentSize.height,scale:1}:undefined
      const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:fullPage,...(clip?{clip}:{})})
      const bytes=Buffer.from(result.data,'base64'),metadata=await sharp(bytes).metadata(),stats=await sharp(bytes).stats()
      expect(metadata.width).toBe(fullPage?Math.ceil(metrics.contentSize.width):metrics.layoutViewport.clientWidth)
      expect(metadata.height).toBe(fullPage?Math.ceil(metrics.contentSize.height):metrics.layoutViewport.clientHeight)
      expect(metadata.width).toBeGreaterThan(geometry.innerWidth*1.9)
      expect(stats.channels.some(c=>c.max-c.min>100)).toBe(true)
      const file=name+'.png';writeFileSync(resolve(root,file),bytes)
      expect(await measure()).toEqual(geometry);expect(await zoom()).toBe(2)
      captures.push({file,sha256:createHash('sha256').update(bytes).digest('hex'),geometry,metrics,pixels:{width:metadata.width,height:metadata.height,channels:stats.channels.map(c=>({min:c.min,max:c.max,stdev:c.stdev}))},method:fullPage?'CDP compositor full contentSize, scale 1':'CDP compositor viewport, no clip',nativeZoom:2})
      return bytes
    }
    const textGeometry=await page.locator('main,footer').evaluateAll(roots=>roots.flatMap(root=>Array.from(root.querySelectorAll('h1,h2,h3,p,a,button')).filter(el=>el.getClientRects().length>0).map(el=>{
      const range=document.createRange();range.selectNodeContents(el)
      return {tag:el.tagName,text:el.textContent,box:el.getBoundingClientRect().toJSON(),lines:Array.from(range.getClientRects()).map(r=>r.toJSON()),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}
    })))
    for(const element of textGeometry)for(const line of element.lines){expect(line.left).toBeGreaterThanOrEqual(-1);expect(line.right).toBeLessThanOrEqual(after.innerWidth+1)}
    for(const img of await page.locator('footer img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>(el as HTMLImageElement).decode())}
    await page.evaluate(()=>scrollTo(0,0));await capture('page-native-200-full',true)
    // Overlapping unedited compositor viewport frames cover the entire document.
    for(let y=0,index=0;;index++){
      await page.evaluate(y=>scrollTo(0,y),y);await capture(`page-native-200-viewport-${index}`)
      const m=await measure();if(m.scrollY+m.innerHeight>=m.scrollHeight-1)break
      y=Math.min(m.scrollY+Math.floor(m.innerHeight*.8),m.scrollHeight-m.innerHeight)
      expect(index).toBeLessThan(20)
    }
    await page.evaluate(()=>scrollTo(0,0))
    const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
    await trigger.focus();await page.keyboard.press('Enter')
    const menu=page.getByRole('dialog',{name:'Primary navigation menu'}),close=menu.getByRole('button',{name:'Close primary navigation menu'})
    await expect(close).toBeFocused();await capture('menu-native-200-top')
    const last=menu.getByRole('link').last()
    await last.evaluate(el=>el.scrollIntoView({block:'end'}))
    const unfocusedBox=(await last.boundingBox())!
    const unfocused=await capture('menu-native-200-bottom-unfocused')
    await close.focus()
    const topRfq=menu.locator('div > a[href="/request-a-quote/"]')
    await page.keyboard.press('Shift+Tab');await expect(topRfq).toBeFocused();await page.keyboard.press('Shift+Tab')
    await expect(last).toBeFocused()
    const menuBottom=await last.boundingBox();expect(menuBottom!.y).toBeGreaterThanOrEqual(0);expect(menuBottom!.y+menuBottom!.height).toBeLessThanOrEqual(after.innerHeight+1)
    const focused=await capture('menu-native-200-bottom')
    const edgePixels=async(bytes:Buffer,box:{y:number;height:number})=>{
      const r=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true})
      const scale=r.info.width/after.innerWidth
      return [2,after.innerWidth-3].map(x=>{const i=(Math.floor((box.y+box.height/2)*scale)*r.info.width+Math.floor(x*scale))*r.info.channels;return [...r.data.subarray(i,i+3)]})
    }
    const edgeBefore=await edgePixels(unfocused,unfocusedBox),edgeAfter=await edgePixels(focused,menuBottom!)
    expect(edgeBefore).toEqual([[0,128,120],[0,128,120]])
    expect(edgeAfter).toEqual([[255,255,255],[255,255,255]])
    focus.push({state:'rfq-visible-focus',edgeBefore,edgeAfter})
    focus.push({state:'menu',nativeModal:await menu.evaluate(el=>el.matches(':modal')),initial:'Close',reverse:['top RFQ','last menu RFQ'],lastControlBox:menuBottom,dialog:await menu.evaluate(el=>({box:el.getBoundingClientRect().toJSON(),scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,scrollTop:el.scrollTop}))})
    await page.keyboard.press('Tab');await expect(topRfq).toBeFocused();await page.keyboard.press('Tab');await expect(close).toBeFocused()
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
    const cookieTrigger=page.getByRole('button',{name:'Cookie Settings',exact:true})
    await cookieTrigger.focus();await page.keyboard.press('Enter')
    const cookie=page.getByRole('dialog',{name:'Cookie settings',exact:true}),cookieClose=cookie.getByRole('button',{name:'Close',exact:true})
    await expect(cookieClose).toBeFocused()
    const cookieGeometry=await cookie.locator('section,h2,p,a,button').evaluateAll(els=>els.map(el=>({text:el.textContent,box:el.getBoundingClientRect().toJSON(),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth})))
    for(const el of cookieGeometry){expect(el.box.left).toBeGreaterThanOrEqual(0);expect(el.box.right).toBeLessThanOrEqual(after.innerWidth);expect(el.box.top).toBeGreaterThanOrEqual(0);expect(el.box.bottom).toBeLessThanOrEqual(after.innerHeight)}
    await capture('cookie-native-200')
    await page.keyboard.press('Shift+Tab');await expect(cookie.getByRole('link')).toBeFocused();await page.keyboard.press('Tab');await expect(cookieClose).toBeFocused()
    focus.push({state:'cookie',nativeModal:await cookie.evaluate(el=>el.matches(':modal')),initial:'Close',reverse:'Read Cookie Policy',geometry:cookieGeometry})
    await page.keyboard.press('Escape');await expect(cookieTrigger).toBeFocused()
    expect(await zoom()).toBe(2);expect(await zoom(1)).toBe(1)
    writeFileSync(resolve(root,'evidence.json'),JSON.stringify({checkedAt:new Date().toISOString(),base,buildId,httpSha256:createHash('sha256').update(html).digest('hex'),browser:context.browser()?.version(),before,after,method:'Native chrome.tabs.setZoom(2), unchanged browser window, raw CDP compositor PNG bytes, no image edits or resizing',captures,textGeometry,focus,keyboardFocusRestored:true,restoredZoomFactor:1,limitations:'Headless Chromium, not physical device/other engine/screen reader or browser toolbar evidence'},null,2)+'\n')
  } finally {await context.close()}
})
test.setTimeout(60000)
