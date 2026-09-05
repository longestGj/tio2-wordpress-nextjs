import {test, expect, type Page, type APIRequestContext} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {createHash, createHmac, randomUUID} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs'
import {JSDOM} from 'jsdom'
import sharp from 'sharp'
import type UkContract from '../../wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json'
import {assertRenderedMalaysiaHeaderLogo} from './support/tio2-my-logo'

const root='docs/verification/market-uk-001'
const contract=JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-market-uk-001.json','utf8')) as typeof UkContract
const uk='/markets/united-kingdom/'
const rfq='/request-a-quote/?market=United%20Kingdom&source_page=MARKET-UK-001'
const records:Record<string,unknown>={}
const visualRoot='D:/23MySec/pages/markets/04_planning/visual-designs/market-uk-001/v0.1/'
const baselines={
  1440:['MARKET-UK-001_GATE5_FULL_DESKTOP_1440_V0.1.png','5197c6b2b997ebaae75c2617fc9d0339a3de4b949a7dbe52745d7107304ed41b',8177],
  768:['MARKET-UK-001_GATE5_FULL_TABLET_768_V0.1.png','37712250a50b56b044fc9c067735c483e530273c0499a759a8b9d92d2243d686',10724],
  390:['MARKET-UK-001_GATE5_FULL_MOBILE_390_V0.1.png','122d28a26e63d7034c9c2e330696ee6429f6e28e64bfab0581ce715c16479a56',14770],
} as const
mkdirSync(root,{recursive:true})
test.afterAll(()=>writeFileSync(root+'/runtime-matrix.json',JSON.stringify(records,null,2)+'\n'))
const modules=['breadcrumb','hero','direct-answer','application-paths','representative-grades','territory','checklist','documents','origin','trade','buyer-questions','final-rfq']
async function ready(page:Page,path=uk){
  const response=await page.goto(path,{waitUntil:'networkidle'})
  expect(response?.status()).toBe(200)
  await page.evaluate(()=>document.fonts.ready)
}
async function screenshot(page:Page,name:string,fullPage=true){
  if(fullPage && await page.locator('footer img').count()){
    const footerLogo=page.locator('footer img').first()
    await footerLogo.scrollIntoViewIfNeeded()
    await footerLogo.evaluate(async el=>{await (el as HTMLImageElement).decode();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())))})
    const crop=await footerLogo.screenshot({animations:'disabled'})
    const pixels=await sharp(crop).removeAlpha().raw().toBuffer()
    const colors=new Set<string>()
    for(let i=0;i<pixels.length;i+=3)colors.add(pixels.subarray(i,i+3).toString('hex'))
    expect(colors.size,'Footer logo crop must contain drawn artwork, not a uniform background').toBeGreaterThan(20)
    records[name+'-footer-logo']={distinctColors:colors.size,box:await footerLogo.boundingBox()}
    await page.evaluate(()=>scrollTo(0,0))
  }
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))))
  const bytes=await page.screenshot({path:root+'/'+name+'.png',fullPage,animations:'disabled'})
  records[name]={sha256:createHash('sha256').update(bytes).digest('hex'),...(await sharp(bytes).metadata())}
  return bytes
}
async function noOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)}
async function chrome(page:Page,width:number,current:string){
  const mobile=width<=900
  const logo=await assertRenderedMalaysiaHeaderLogo(page.locator('header > div img').first(),{width:mobile?120:180,height:mobile?40:60})
  expect((await page.locator('header > div').first().boundingBox())?.height).toBe(mobile?64:84)
  await expect(page.locator('header')).not.toContainText('CURRENT')
  const desktop=page.getByRole('navigation',{name:'Primary navigation',exact:true})
  if(mobile)await expect(desktop).toHaveCount(0)
  else{
    await expect(desktop.locator('[aria-current="page"]')).toHaveText(current)
    expect(await desktop.locator('[aria-current]').evaluate(el=>getComputedStyle(el,'::after').height)).toBe('3px')
  }
  await expect(page.locator('header > div a[href="/request-a-quote/"]')).toBeVisible()
  await expect(page.locator('footer h2')).toHaveText(['Explore','Information','Procurement'])
  for(const heading of await page.locator('footer h2').all())await expect(heading).toHaveCSS('font-size',width<=430?'14px':'12px')
  const boxes=await page.locator('footer h2').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}}))
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i]!,b=boxes[j]!;expect(a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y).toBe(true)
  }
  for(const a of await page.locator('header a[data-source-page],footer a[data-source-page]').all()){
    await expect(a).toHaveAttribute('href','/request-a-quote/')
    await expect(a).toHaveAttribute('data-site-scope','tio2-my')
  }
  return logo
}
async function menu(page:Page,current:string,name:string){
  const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
  await trigger.click()
  const dialog=page.getByRole('dialog',{name:'Primary navigation menu'})
  await expect(dialog).toBeVisible()
  const close=dialog.getByRole('button',{name:'Close primary navigation menu'})
  await expect(close).toBeFocused()
  expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('hidden')
  expect(await dialog.evaluate(el=>el.matches(':modal'))).toBe(true)
  // Role locators do not account for native modal implicit inertness. Inspect
  // Chromium's actual accessibility tree instead of inferring it from DOM.
  const cdp=await page.context().newCDPSession(page)
  const tree=await cdp.send('Accessibility.getFullAXTree')
  const exposed=tree.nodes.filter(n=>!n.ignored&&['main','navigation','dialog'].includes(String(n.role?.value))).map(n=>({role:n.role?.value,name:n.name?.value}))
  expect(exposed).toEqual([{role:'dialog',name:'Primary navigation menu'},{role:'navigation',name:'Mobile navigation'}])
  records[name+'-accessibility']=exposed
  await cdp.detach()
  await page.locator('main a').first().evaluate(el=>(el as HTMLElement).focus())
  await expect(close).toBeFocused()
  const nav=dialog.getByRole('navigation')
  await expect(nav.getByRole('link')).toHaveText(['Home','Markets','Products','Applications','Documents','Resources','About','Request a Quote'])
  await expect(nav.locator('[aria-current]')).toHaveText(current)
  expect(await nav.locator('[aria-current]').evaluate(el=>getComputedStyle(el,'::before').width)).toBe('4px')
  await expect(nav.locator('a').first()).toHaveCSS('text-align','left')
  await expect(nav.locator('a').last()).toHaveCSS('background-color','rgb(0, 106, 99)')
  await assertRenderedMalaysiaHeaderLogo(dialog.locator('img'),{width:120,height:40})
  await close.focus();await page.keyboard.press('Shift+Tab');await expect(nav.getByRole('link').last()).toBeFocused()
  await page.keyboard.press('Tab');await expect(close).toBeFocused()
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([])
  await screenshot(page,name,false)
  await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
  expect(await page.evaluate(()=>document.documentElement.style.overflow)).not.toBe('hidden')
}

test('UK initial SSR, canonical, breadcrumb, FAQ, schema and release omission',async({request})=>{
  const res=await request.get(uk+'?utm_source=test#ignored');expect(res.status()).toBe(200)
  const dom=new JSDOM(await res.text()).window.document
  const approvedHtml=readFileSync(visualRoot+'MARKET-UK-001_GATE5_FULL_VISUAL_V0.1.html')
  expect(createHash('sha256').update(approvedHtml).digest('hex')).toBe('988e0d2cfa3f2883e4c5ff70b90590894f754aff467977ebe0503e0fd9c9acba')
  const approvedDom=new JSDOM(approvedHtml.toString()).window.document
  const copy=(doc:Document)=>[...doc.querySelectorAll('main h1,main h2,main h3,main h4,main p,main summary')].map(el=>{
    const content=el.cloneNode(true) as Element
    content.querySelectorAll('[aria-hidden="true"]').forEach(icon=>icon.remove())
    return content.textContent?.replace(/\s+/g,' ').trim()
  })
  expect(copy(dom)).toEqual(copy(approvedDom))
  expect(dom.title).toBe('Malaysia Titanium Dioxide Supplier for UK Buyers | TiO2 Malaysia')
  expect(dom.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(contract.seo.metaDescription)
  expect([...dom.querySelectorAll('link[rel="canonical"]')].map(el=>el.getAttribute('href'))).toEqual(['https://tio2malaysia.com/markets/united-kingdom/'])
  expect(dom.querySelector('link[hreflang]')).toBeNull()
  expect(dom.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
  expect([...dom.querySelectorAll('main [data-module]')].map(el=>el.getAttribute('data-module'))).toEqual(modules)
  expect(dom.querySelectorAll('main h1')).toHaveLength(1)
  expect(dom.querySelectorAll('main details')).toHaveLength(6)
  expect(dom.querySelectorAll('main details[open]')).toHaveLength(2)
  for(const item of contract.buyerQuestions.items)expect(dom.querySelector('main')?.textContent).toContain(item.answer)
  const crumbs=dom.querySelector('nav[aria-label="Breadcrumb"]')!
  expect([...crumbs.querySelectorAll('a')].map(el=>[el.textContent,el.getAttribute('href')])).toEqual([['Home','/'],['Markets','/markets/']])
  expect(crumbs.querySelector('[aria-current]')?.tagName).toBe('SPAN')
  expect([...dom.querySelectorAll('main a[href^="/request-a-quote/"]')].map(el=>el.getAttribute('href'))).toEqual([rfq,rfq])
  expect(dom.querySelector('main')?.textContent).not.toMatch(/AD0086|PT-BR|REL-|release blocker|UK-G[16]|site_scope/i)
  expect(dom.querySelector('main a[href*="/trade/"]')).toBeNull()
  const graph=JSON.parse(dom.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
  expect(graph.map((n:{'@type':string})=>n['@type'])).toEqual(['WebPage','BreadcrumbList'])
  expect(JSON.stringify(graph)).not.toMatch(/FAQPage|QAPage|Product|Offer|manufacturer/)
  const sitemap=await request.get('/sitemap.xml');expect(await sitemap.text()).not.toContain(uk)
  records.ssr={canonical:'https://tio2malaysia.com'+uk,faqAnswers:6,moduleCount:12,jsonLdNodes:2,indexing:false,sitemapOmitted:true}
})

for(const width of [1440,768,390])test(`UK ${width}: approved layout, shared Chrome, focus, axe and screenshot`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:1000});await page.emulateMedia({reducedMotion:'reduce'})
  await ready(page)
  expect(await page.locator('main').evaluate(el=>({x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width}))).toEqual({x:0,width})
  if(width===1440){
    expect((await page.locator('[data-module="hero"] > div > div').first().boundingBox())?.width).toBeCloseTo(786.667,1)
    expect((await page.locator('[data-module="final-rfq"] > div > div').first().boundingBox())?.width).toBeCloseTo(686.667,1)
  }
  const logo=await chrome(page,width,'Markets');await noOverflow(page)
  for(const el of await page.locator('main a,main summary').all()){
    const b=await el.boundingBox();expect(b?.height).toBeGreaterThanOrEqual(44);expect(b?.width).toBeGreaterThanOrEqual(44)
  }
  expect(await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter')
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([])
  const bytes=await screenshot(page,'uk-'+width)
  const baseline=baselines[width as keyof typeof baselines]
  const reference=readFileSync(visualRoot+baseline[0])
  expect(createHash('sha256').update(reference).digest('hex')).toBe(baseline[1])
  const height=(await sharp(bytes).metadata()).height!
  expect(Math.abs(height-baseline[2])/baseline[2]).toBeLessThan(.05)
  const actualPixels=await sharp(bytes).resize(128,256,{fit:'fill'}).removeAlpha().raw().toBuffer()
  const refPixels=await sharp(reference).resize(128,256,{fit:'fill'}).removeAlpha().raw().toBuffer()
  let diff=0;for(let i=0;i<actualPixels.length;i++)diff+=Math.abs(actualPixels[i]!-refPixels[i]!)
  const similarity=1-diff/actualPixels.length/255
  expect(similarity).toBeGreaterThan(.88)
  records['visual-'+width]={approvedFile:baseline[0],approvedSha256:baseline[1],referenceHeight:baseline[2],actualHeight:height,normalizedSimilarity:similarity,threshold:.88,note:'Supplementary broad-layout signal; not a pixel-equivalence or visual-approval claim.'}
  records['layout-'+width]={logo,axeViolations:axe.violations.length,height:(await sharp(bytes).metadata()).height}
  const heading=page.locator('#application-paths');await page.locator('main a[href="#application-paths"]').first().click();await expect(heading).toBeFocused()
  const faq=page.locator('main details').last();await faq.locator('summary').focus();await page.keyboard.press('Enter');await expect(faq).toHaveAttribute('open','')
  await screenshot(page,'uk-faq-'+width,false)
  if(width<=900)await menu(page,'Markets','uk-menu-'+width)
})

for(const [path,label] of [['/','Home'],['/markets/','Markets'],['/products/','Products'],['/documents/reach/','Documents']] as const){
  for(const width of [1440,768,390])test(`Shared Chrome ${label} ${width}`,async({page})=>{
    await page.setViewportSize({width,height:844});await ready(page,path)
    records[`chrome-${label}-${width}`]=await chrome(page,width,label);await noOverflow(page)
    await screenshot(page,`chrome-${label.toLowerCase()}-${width}`,false)
    if(width<=900)await menu(page,label,`menu-${label.toLowerCase()}-${width}`)
  })
}

test('UK 200% equivalent reflow and 320px narrow viewport',async({page})=>{
  for(const width of [720,320]){
    await page.setViewportSize({width,height:500});await ready(page);await noOverflow(page)
    await expect(page.locator('main h1')).toBeVisible()
    await screenshot(page,'uk-reflow-'+width)
  }
  records.reflow={method:'1440 CSS viewport at 200% equivalent = 720 CSS px; additional 320 CSS px',widths:[720,320]}
})

test('UK FAQ expanded/collapsed and Documents keyboard-focus evidence',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await ready(page)
  for(const item of await page.locator('main details').all())if(!(await item.getAttribute('open')!==null))await item.locator('summary').click()
  await expect(page.locator('main details[open]')).toHaveCount(6)
  await page.locator('[data-module="buyer-questions"]').screenshot({path:root+'/uk-faq-all-expanded-1440.png',animations:'disabled'})
  const action=page.locator('[data-module="documents"] a').first()
  await page.keyboard.press('Tab');await action.focus()
  await expect(action).toBeFocused();await expect(action).toHaveCSS('outline-width','3px')
  await page.locator('[data-module="documents"]').screenshot({path:root+'/uk-documents-focus-1440.png',animations:'disabled'})
  await page.setViewportSize({width:390,height:844})
  for(const item of await page.locator('main details').all())await item.locator('summary').click()
  await expect(page.locator('main details[open]')).toHaveCount(0)
  await page.locator('[data-module="buyer-questions"]').screenshot({path:root+'/uk-faq-all-collapsed-390.png',animations:'disabled'})
  records.faqStates={expanded:6,collapsed:0,documentsFocusOutline:'3px'}
})

async function state(request:APIRequestContext,mode:string){
  expect((await request.put('http://127.0.0.1:4024/__state',{data:{mode}})).ok()).toBe(true)
  const body=JSON.stringify({eventId:randomUUID(),siteIds:['tio2-my'],contentId:901,paths:[uk],entityIds:[],modified:new Date().toISOString()})
  const signature=createHmac('sha256','uk-local-revalidation').update(body).digest('hex')
  expect((await request.post('/api/revalidate',{data:body,headers:{'content-type':'application/json','x-tio2-signature':signature}})).status()).toBe(200)
}
test('UK missing/foreign records fail closed and Grade ItemList requires readiness',async({request})=>{
  try{
    for(const mode of ['missing','foreign']){
      await state(request,mode)
      const response=await request.get(uk);expect(response.status()).toBe(500)
      expect(await response.text()).not.toContain(contract.hero.h1)
    }
    await state(request,'grades-ready')
    const response=await request.get(uk);expect(response.status()).toBe(200)
    const dom=new JSDOM(await response.text()).window.document
    const graph=JSON.parse(dom.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
    expect(graph.map((n:{'@type':string})=>n['@type'])).toEqual(['WebPage','BreadcrumbList','ItemList'])
    expect(graph[2].numberOfItems).toBe(6)
    expect(graph[2].itemListElement.map((el:{name:string})=>el.name)).toEqual(['M-350','M-510','M-896','M-200','M-108','M-210'])
    records.failClosed={missing:500,foreign:500,readyGradeItems:6}
  }finally{await state(request,'default')}
})

test('UK approved route ledger records missing Applications without creating substitutes',async({request})=>{
  const ledger:Array<Record<string,unknown>>=[]
  records.routes=ledger
  for(const item of contract.routeRegistry){
    const response=await request.get(item.href)
    const status=response.status();ledger.push({...item,status})
    if(item.href.startsWith('/applications')){
      expect([404,500],item.href+' remains an explicit release blocker').toContain(status)
      expect(await response.text()).not.toMatch(/TIOVAR|tiovar\.com/)
    }else{
      expect(status,item.href).toBe(200)
      const doc=new JSDOM(await response.text()).window.document
      expect(new URL(doc.querySelector('link[rel="canonical"]')!.getAttribute('href')!).href).toBe('https://tio2malaysia.com'+item.href)
    }
  }
  records.routes=ledger
})

test('UK body RFQ prefill stays editable and bare shared RFQ has no implicit grade or country',async({page})=>{
  await ready(page,'/request-a-quote/')
  await expect(page.locator('#rfq-destination_country')).toHaveValue('')
  await ready(page,uk)
  await page.locator('main a[href^="/request-a-quote/"]').first().click()
  await expect(page.locator('#rfq-destination_country')).toHaveValue('United Kingdom')
  await expect(page.locator('#rfq-grade_id')).toHaveValue('')
  await page.locator('#rfq-destination_country').fill('Great Britain')
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Great Britain')
  await screenshot(page,'uk-rfq-prefill')
  await page.getByRole('button',{name:'REQUEST QUOTE',exact:true}).click()
  await expect(page.getByRole('alert').filter({has:page.getByRole('heading',{name:/Please review/})})).toBeFocused()
  await page.locator('#rfq-grade_id').selectOption({index:1})
  await page.locator('#rfq-application_id').selectOption({index:1})
  await page.locator('#rfq-quantity_mt').fill('20')
  await page.locator('#rfq-company_name').fill('UK Evidence Buyer Ltd')
  await page.locator('#rfq-contact_name').fill('Evidence Buyer')
  await page.locator('#rfq-business_email').fill('uk-evidence@example.com')
  let count=0
  await page.route('https://api.web3forms.com/submit',async route=>{
    count++
    expect(route.request().postDataJSON()).toMatchObject({site_scope:'tio2-my',page_id:'CONV-RFQ',source_page_id:'MARKET-UK-001',destination_country:'Great Britain',quantity_mt:'20'})
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:count>1})})
  })
  await page.getByRole('button',{name:'REQUEST QUOTE',exact:true}).click()
  await expect(page.getByRole('heading',{name:/Something went wrong/})).toBeVisible()
  await expect(page.locator('#rfq-destination_country')).toHaveValue('Great Britain')
  await screenshot(page,'uk-rfq-negative')
  await page.getByRole('button',{name:'TRY AGAIN',exact:true}).click()
  await page.getByRole('button',{name:'REQUEST QUOTE',exact:true}).click()
  await expect(page.getByRole('status').filter({has:page.getByRole('heading',{name:/Thank you/})})).toBeFocused()
  expect(count).toBe(2)
  await screenshot(page,'uk-rfq-positive')
  records.rfq={shared:'/request-a-quote/',body:rfq,countryEditable:true,implicitGrade:false,validationFocus:true,interceptedSubmissions:count,negativeThenPositive:true,externalSubmission:false}
})
