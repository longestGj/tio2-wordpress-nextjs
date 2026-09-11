import {requiredLocalUrl} from './support/required-local-url'
import {test,expect} from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import {mkdirSync,writeFileSync} from 'node:fs'
const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin
const root='docs/verification/tio2-my/market-eu-pl/gate9-fixes-v02/shared-visual'
mkdirSync(root,{recursive:true})
for(const width of [1440,768,390])test(`F01/F02 shared owner ${width}`,async({page,browser})=>{
  await page.setViewportSize({width,height:1000})
  await page.goto(base+'/markets/poland/',{waitUntil:'domcontentloaded'})
  await page.evaluate(()=>document.fonts.ready)
  const header=page.locator('header')
  expect(await header.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter')
  expect((await header.boundingBox())!.height).toBe(width>1100?84:64)
  await expect(header.locator('div > a[href="/request-a-quote/"]').first()).toHaveCSS('background-color','rgb(0, 128, 120)')
  const footer=page.locator('footer')
  await expect(footer.getByRole('heading').first()).toHaveCSS('font-size','14px')
  for(const img of await footer.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>(el as HTMLImageElement).decode())}
  await page.evaluate(()=>scrollTo(0,0))
  await page.screenshot({path:`${root}/full-${width}.png`,fullPage:true})
  if(width<1101){
    await page.getByRole('button',{name:'Open primary navigation',exact:true}).focus()
    await page.keyboard.press('Enter')
    const menu=page.getByRole('dialog',{name:'Primary navigation menu'})
    const nav=menu.getByRole('navigation')
    await expect(nav).toHaveCSS('background-color','rgb(3, 27, 58)')
    await expect(nav).toHaveCSS('grid-template-columns',`${width}px`)
    const box=(await menu.boundingBox())!
    expect(box.y).toBe(0);expect(box.height).toBeLessThan(600)
    const rfq=menu.locator('div > a[href="/request-a-quote/"]')
    await expect(rfq).toBeVisible();expect((await rfq.boundingBox())!.y).toBeLessThan(64)
    await expect(menu.getByRole('button',{name:'Close primary navigation menu'})).toHaveCSS('outline-color','rgb(0, 128, 120)')
    const cdp=await page.context().newCDPSession(page)
    const ax=await cdp.send('Accessibility.getFullAXTree')
    const exposed=ax.nodes.filter(n=>!n.ignored&&['main','contentinfo'].includes(String(n.role?.value)))
    expect(exposed).toHaveLength(0);await cdp.detach()
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
    await page.screenshot({path:`${root}/menu-${width}.png`})
    await page.keyboard.press('Escape')
  }
  await page.getByRole('button',{name:'Cookie Settings',exact:true}).focus()
  await page.keyboard.press('Enter')
  const cookie=page.getByRole('dialog',{name:'Cookie settings',exact:true}),heading=cookie.getByRole('heading')
  await expect(heading).toHaveCSS('text-transform','none')
  await expect(heading).toHaveCSS('font-size',width<561?'26px':'30px')
  expect(await heading.evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Inter')
  for(const control of await cookie.locator('button,a').all())await expect(control).toHaveCSS('border-top-color','rgb(0, 128, 120)')
  const close=cookie.getByRole('button',{name:'Close',exact:true})
  await expect(close).toHaveCSS('outline-color','rgb(0, 128, 120)')
  await close.hover();await expect(close).toHaveCSS('background-color','rgb(245, 248, 251)')
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  await page.screenshot({path:`${root}/cookie-${width}.png`})
  await page.keyboard.press('Escape')
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([])
  writeFileSync(`${root}/result-${width}.json`,JSON.stringify({checkedAt:new Date().toISOString(),base,width,browser:browser.version(),sharedInter:true,functionalTeal:'#008078',cookieNormalCase:true,dropdown:width<1101,axeViolations:0},null,2)+'\n')
})
