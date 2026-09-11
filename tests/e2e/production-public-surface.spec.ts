import {test,expect} from '@playwright/test'
import {surface,canonical} from '../fixtures/production/surface-contract.mjs'
for(const object of surface.objects){
 test(`${object.id} ${object.path}`,async({page,request,baseURL},testInfo)=>{
  const externalSubmissions:string[]=[]
  await page.route('**/*',async route=>{
   const r=route.request();const url=new URL(r.url())
   if(r.isNavigationRequest()&&url.origin!==new URL(baseURL!).origin){externalSubmissions.push('unexpected-navigation:'+url.origin);await route.abort();return}
   if(!['GET','HEAD'].includes(r.method())&&url.origin!==new URL(baseURL!).origin){externalSubmissions.push(url.origin);await route.abort();return}
   await route.continue()
  })
  const raw=await request.get(object.path,{maxRedirects:0})
  const expected=canonical(object.path)
  if(expected!==object.path){expect(raw.status()).toBe(308);expect(new URL(raw.headers().location,baseURL).pathname).toBe(expected)}
  else expect(raw.status()).toBe(object.expectedStatus)
  const response=await page.goto(object.path,{waitUntil:'networkidle'})
  expect(response?.status()).toBe(object.expectedStatus)
  expect(new URL(page.url()).pathname).toBe(expected)
  expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin)
  if(process.env.TIO2_EXPECT_RELEASE)expect(response?.headers()['x-tio2-release']).toBe(process.env.TIO2_EXPECT_RELEASE)
  await expect(page.locator('h1').first()).toBeVisible()
  expect((await page.title()).trim().length).toBeGreaterThan(0)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBe(true)
  const menu=page.getByRole('button',{name:'Open primary navigation',exact:true})
  if(object.id==='HOME-001' && await menu.isVisible()){
   await menu.click()
   await expect(page.locator('#malaysia-mobile-menu')).toBeVisible()
   await page.screenshot({path:testInfo.outputPath(`menu-${testInfo.project.name}.png`)})
   const close=page.getByRole('button',{name:'Close primary navigation menu',exact:true})
   if(await close.isVisible()) await close.click()
   else await page.getByRole('button',{name:'Close primary navigation',exact:true}).click()
   await expect(menu).toBeVisible()
  }
  const faq=page.locator('main button[aria-expanded]:visible').first()
  if(await faq.count()){
   const old=await faq.getAttribute('aria-expanded');await faq.click()
   await expect(faq).toHaveAttribute('aria-expanded',old==='true'?'false':'true');await faq.click()
  }
  const summary=page.locator('summary:visible').first()
  if(await summary.count()){const previous=await summary.evaluate(el=>(el.parentElement as HTMLDetailsElement).open);await summary.click();expect(await summary.evaluate(el=>(el.parentElement as HTMLDetailsElement).open)).toBe(!previous);await summary.click()}
  const form=page.locator('form').first()
  if(await form.count()){
   const required=form.locator('[required]').first()
   if(await required.count()) expect(await required.evaluate(el=>(el as HTMLInputElement).checkValidity())).toBe(false)
  }
  await page.keyboard.press('Tab')
  expect(await page.evaluate(()=>document.activeElement!==document.body)).toBe(true)
  expect(externalSubmissions).toEqual([])
  await page.screenshot({path:testInfo.outputPath(`${object.id}-${testInfo.project.name}.png`),fullPage:false})
  await testInfo.attach('surface-evidence',{body:JSON.stringify({id:object.id,input:object.path,canonical:expected,status:response?.status(),viewport:testInfo.project.name,fixture:!process.env.TIO2_PRODUCTION_BASE_URL,externalFormSubmissions:0}),contentType:'application/json'})
 })
}
