import {requiredLocalUrl} from './support/required-local-url'
import {expect,type Page} from '@playwright/test'
import {test,artifactMode,artifactOrigin} from './support/poland-build-artifacts'
import AxeBuilder from '@axe-core/playwright'
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {JSDOM} from 'jsdom'
import type PolandContract from '../../wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json'
const contract=JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-market-poland.json','utf8')) as typeof PolandContract

const base=artifactMode?artifactOrigin:requiredLocalUrl('TIO2_MY_BASE_URL').origin
const evidence=process.env.POLAND_EVIDENCE_DIR??'docs/verification/tio2-my/market-eu-pl/'+(artifactMode?'offline-build':'runtime')
const records:Record<string,unknown>={mode:artifactMode?'Offline build artifacts; no HTTP server or live cache verification':'Live local HTTP'}
mkdirSync(evidence,{recursive:true})
test.afterAll(()=>writeFileSync(evidence+'/browser-matrix.json',JSON.stringify(records,null,2)+'\n'))
async function ready(page:Page,path='/markets/poland/') {
  const response=await page.goto(base+path,{waitUntil:'domcontentloaded'})
  expect(response?.status()).toBe(200)
  await page.evaluate(()=>document.fonts.ready)
}
async function capture(page:Page,name:string,fullPage=true) {
  for(const img of await page.locator('footer img').all()) {
    await img.scrollIntoViewIfNeeded();await img.evaluate(el=>(el as HTMLImageElement).decode())
  }
  if(fullPage)await page.evaluate(()=>scrollTo(0,0))
  const bytes=await page.screenshot({path:evidence+'/'+name+'.png',fullPage,animations:'disabled'})
  records[name]={sha256:createHash('sha256').update(bytes).digest('hex')}
}
test('actual SSR preserves approved copy, identity, metadata and release omission',async({request})=>{
  const source=readFileSync('tests/fixtures/markets/poland/approved-copy.md','utf8').replace(/<!--[\s\S]*?-->/g,'')
  for(const suffix of artifactMode?['']:['', '?utm_source=poland-review']) {
    const response=artifactMode?null:await request.get(base+'/markets/poland/'+suffix)
    if(response)expect(response.status()).toBe(200)
    const doc=new JSDOM(response?await response.text():readFileSync('.next-poland/server/app/markets/poland.html','utf8')).window.document
    const actual=[...doc.querySelectorAll('main h1,main h2,main h3,main p')].map(el=>el.textContent)
    const expected=source.split(/\r?\n/).filter(l=>l.trim()&&!l.startsWith('[')).map(l=>l.replace(/^#+ /,''))
    expect(actual).toEqual(expected)
    expect(doc.title).toBe(contract.seo.title)
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(contract.seo.description)
    expect([...doc.querySelectorAll('link[rel="canonical"]')].map(el=>el.getAttribute('href'))).toEqual([contract.seo.canonical])
    expect(doc.querySelector('link[hreflang]')).toBeNull()
    expect(doc.documentElement.lang).toBe('en')
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow')
    expect(doc.querySelectorAll('main h1')).toHaveLength(1)
    expect(doc.querySelector('main form,main details,main table,main img')).toBeNull()
    const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!)['@graph']
    expect(graph.map((n:{'@type':string})=>n['@type'])).toEqual(['WebPage','BreadcrumbList'])
    expect(graph[1].itemListElement).toHaveLength(4)
  }
  if(artifactMode) {
    records.ssr={source:'Build prerender using actual local WordPress',copy:'exact B',canonical:contract.seo.canonical,indexing:false,liveHttpVerified:false}
    return
  }
  const slash=await request.get(base+'/markets/poland?utm_source=test',{maxRedirects:0})
  expect(slash.status()).toBe(308);expect(slash.headers().location).toContain('/markets/poland/?utm_source=test')
  const sitemap=await request.get(base+'/sitemap.xml');expect(await sitemap.text()).not.toContain('/markets/poland')
  records.ssr={source:'actual local WordPress',copy:'exact B',canonical:contract.seo.canonical,indexing:false,sitemapOmitted:true,queryParity:true}
})
test('live crawler endpoint retains preview disallow policy',async({request})=>{
  test.skip(artifactMode,'Requires real HTTP metadata route')
  const robots=await request.get(base+'/robots.txt')
  expect(robots.status()).toBe(200)
  expect(robots.headers()['content-type']).toContain('text/plain')
  expect(await robots.text()).toContain('Disallow: /')
  records.robots={status:robots.status(),disallowAll:true}
})
for(const width of [1440,768,390])test(`Poland ${width}: geometry, accessibility, focus and shared modals`,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:1000});await page.emulateMedia({reducedMotion:'reduce'})
  await ready(page)
  expect(await page.locator('main').evaluate(el=>({x:el.getBoundingClientRect().x,width:el.getBoundingClientRect().width}))).toEqual({x:0,width})
  const container=await page.locator('#pl-01 > div').boundingBox()
  expect(container?.width).toBe(width===1440?1200:width===768?704:350)
  await expect(page.locator('main h1')).toHaveCSS('font-size',width===1440?'54px':width===768?'44px':'36px')
  expect(await page.locator('main').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter')
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  const columns=await page.locator('#pl-03 h3').evaluateAll(els=>els.map(el=>({x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y})))
  expect(columns).toHaveLength(2)
  if(width>560) {expect(columns[0]!.y).toBe(columns[1]!.y);expect(columns[1]!.x).toBeGreaterThan(columns[0]!.x)}
  else {expect(columns[0]!.x).toBe(columns[1]!.x);expect(columns[1]!.y).toBeGreaterThan(columns[0]!.y)}
  expect(await page.locator('header').count()).toBe(1);expect(await page.locator('footer').count()).toBe(1)
  for(const link of await page.locator('main a').all()) {
    const box=await link.boundingBox();expect(box?.width).toBeGreaterThanOrEqual(44);expect(box?.height).toBeGreaterThanOrEqual(44)
  }
  const axe=await new AxeBuilder({page}).analyze();expect(axe.violations).toEqual([])
  records['geometry-'+width]={container,axeViolations:axe.violations.length,sections:await page.locator('main section').evaluateAll(els=>els.map(el=>({id:el.id,height:el.getBoundingClientRect().height}))),pageHeight:await page.evaluate(()=>document.documentElement.scrollHeight)}
  await capture(page,'poland-'+width)
  const action=page.locator('#pl-01 a[href="/request-a-quote/"]');await action.focus()
  await expect(action).toBeFocused();await expect(action).toHaveCSS('outline-width','3px')
  await page.locator('#pl-01').screenshot({path:evidence+'/focus-'+width+'.png'})
  for(const [id,href] of [['pl-04','/documents/'],['pl-05','/markets/european-union/']]) {
    await page.locator(`#${id} a[href="${href}"]`).hover()
    await expect(page.locator(`#${id} a[href="${href}"]`)).toHaveCSS('background-color','rgb(245, 248, 251)')
    await page.locator('#'+id).screenshot({path:evidence+'/hover-'+id+'-'+width+'.png'})
  }
  if(width<900) {
    const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true});await trigger.click()
    const dialog=page.getByRole('dialog',{name:'Primary navigation menu'})
    const close=dialog.getByRole('button',{name:'Close primary navigation menu'})
    await expect(close).toBeFocused();expect(await dialog.evaluate(el=>el.matches(':modal'))).toBe(true)
    await page.locator('main a').first().evaluate(el=>(el as HTMLElement).focus());await expect(close).toBeFocused()
    const topRfq=dialog.locator('div > a[href="/request-a-quote/"]')
    await page.keyboard.press('Shift+Tab');await expect(topRfq).toBeFocused()
    await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('link').last()).toBeFocused()
    await page.keyboard.press('Tab');await expect(topRfq).toBeFocused()
    await page.keyboard.press('Tab');await expect(close).toBeFocused()
    await expect(dialog.locator('nav [aria-current]')).toHaveText('Markets')
    await page.screenshot({path:evidence+'/menu-'+width+'.png'})
    await page.keyboard.press('Escape');await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
  }
  const trigger=page.getByRole('button',{name:'Cookie Settings',exact:true});await trigger.click()
  const cookie=page.getByRole('dialog',{name:'Cookie settings',exact:true})
  await expect(cookie).toBeVisible();expect(await cookie.evaluate(el=>el.matches(':modal'))).toBe(true)
  const close=cookie.getByRole('button',{name:'Close',exact:true});await expect(close).toBeFocused()
  await page.locator('main a').first().evaluate(el=>(el as HTMLElement).focus());await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab');await expect(cookie.getByRole('link').last()).toBeFocused()
  await page.keyboard.press('Tab');await expect(close).toBeFocused()
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  await page.screenshot({path:evidence+'/cookie-'+width+'.png'})
  await page.keyboard.press('Escape');await expect(cookie).not.toBeVisible();await expect(trigger).toBeFocused()
})
test('200% equivalent and narrow reflow retain readable content',async({page})=>{
  for(const width of [720,320]) {
    await page.setViewportSize({width,height:500});await ready(page)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
    await capture(page,'reflow-'+width)
  }
  records.reflow={widths:[720,320],method:'1440 viewport at 200% equivalent = 720 CSS pixels; additional 320 CSS pixels'}
})
test('main links navigate to actual owners and conversion forms retain their controls',async({page})=>{
  const ledger=[]
  for(const action of [...contract.breadcrumb.slice(0,3),...contract.modules.flatMap(m=>m.actions)].filter((a,i,all)=>all.findIndex(b=>b.href===a.href)===i)) {
    await ready(page)
    await page.locator(`main a[href="${action.href}"]`).first().click()
    await page.waitForLoadState('domcontentloaded')
    expect(new URL(page.url()).pathname.replace(/\/$/,'')||'/').toBe(action.href.replace(/\/$/,'')||'/')
    await expect(page.locator('main h1')).toHaveCount(1)
    expect(await page.locator('main').innerText()).not.toMatch(/TIOVAR|tiovar\.com/)
    ledger.push({...action,h1:await page.locator('main h1').innerText(),forms:await page.locator('main form').count()})
    if(action.targetPageId==='CONV-RFQ'||action.targetPageId==='CONV-DOC') {
      await expect(page.locator('main form')).toHaveCount(1)
      expect(await page.locator('select[multiple]').count()).toBe(0)
      records[action.targetPageId+'-controls']=await page.locator('main form input,main form select,main form textarea').evaluateAll(els=>els.map(el=>({tag:el.tagName,name:el.getAttribute('name'),type:el.getAttribute('type')})))
      if(action.targetPageId==='CONV-RFQ') {
        const grade=page.locator('select[name="grade_id"]')
        await expect(grade).toHaveValue('')
        const unknown=grade.getByRole('option',{name:/Not sure.*Need help/i})
        await expect(unknown).toHaveCount(1)
        await grade.selectOption((await unknown.getAttribute('value'))!)
        await expect(page.locator('input[name="destination_country"]')).toHaveValue('')
      } else {
        const grade=page.locator('select[name="product_grade"]')
        await expect(grade).toHaveValue('');await expect(grade).toHaveAttribute('required','')
        await expect(page.locator('input[name="country_region"]')).toHaveValue('')
        await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(0)
        await grade.selectOption({index:1})
        const boxes=page.locator('input[name="document_types"]')
        await boxes.nth(0).check();await boxes.nth(1).check()
        await expect(page.locator('input[name="document_types"]:checked')).toHaveCount(2)
      }
    }
  }
  records.navigation=ledger
})
test('shared Cookie regression on Home, UK and Privacy restores focus and scroll',async({page})=>{
  const results=[]
  for(const [path,width] of [['/',1440],['/markets/united-kingdom/',768],['/privacy-policy/',390]] as const) {
    await page.setViewportSize({width,height:844});await ready(page,path)
    const trigger=page.getByRole('button',{name:'Cookie Settings',exact:true});await trigger.click()
    const dialog=page.getByRole('dialog',{name:'Cookie settings',exact:true})
    const close=dialog.getByRole('button',{name:'Close',exact:true})
    await expect(close).toBeFocused();expect(await dialog.evaluate(el=>el.matches(':modal'))).toBe(true)
    await page.locator('main').evaluate(el=>{el.setAttribute('tabindex','-1');(el as HTMLElement).focus()});await expect(close).toBeFocused()
    await close.click();await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused()
    expect(await page.evaluate(()=>document.documentElement.style.overflow)).not.toBe('hidden')
    results.push({path,width,nativeModal:true,backgroundFocusBlocked:true,focusRestored:true})
  }
  records.sharedCookieRegression=results
})
