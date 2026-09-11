import {requiredLocalUrl} from './support/required-local-url'
import {test,expect} from '@playwright/test'
import {mkdirSync,writeFileSync} from 'node:fs'
import sharp from 'sharp'
const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin
const root=process.env.POLAND_F03_EVIDENCE_DIR??'docs/verification/tio2-my/market-eu-pl/gate9-fixes-v04/focus'
for(const width of [768,390])test(`F03 menu RFQ visibly changes under keyboard focus at ${width}`,async({page})=>{
  mkdirSync(root,{recursive:true});await page.setViewportSize({width,height:1000})
  await page.goto(base+'/markets/poland/');await page.evaluate(()=>document.fonts.ready)
  const trigger=page.getByRole('button',{name:'Open primary navigation',exact:true})
  await trigger.focus();await page.keyboard.press('Enter')
  const menu=page.getByRole('dialog',{name:'Primary navigation menu'}),last=menu.getByRole('link').last()
  const close=menu.getByRole('button',{name:'Close primary navigation menu'})
  await expect(close).toBeFocused()
  const box=(await last.boundingBox())!
  const unfocused=await page.screenshot({path:`${root}/unfocused-${width}.png`})
  await page.keyboard.press('Shift+Tab');await expect(menu.locator('div > a[href="/request-a-quote/"]')).toBeFocused()
  await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused()
  const focused=await page.screenshot({path:`${root}/focused-${width}.png`})
  const pixels=async(bytes:Buffer)=>{const r=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});return [2,width-3].map(x=>{const i=(Math.floor(box.y+box.height/2)*r.info.width+x)*r.info.channels;return [...r.data.subarray(i,i+3)]})}
  const before=await pixels(unfocused),after=await pixels(focused)
  const style=await last.evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,outline:s.outline,offset:s.outlineOffset,shadow:s.boxShadow,focusVisible:el.matches(':focus-visible')}})
  writeFileSync(`${root}/result-${width}.json`,JSON.stringify({base,width,box,before,after,style},null,2))
  expect(before).toEqual([[0,128,120],[0,128,120]])
  // A visible contrasting perimeter must exist on both sides inside the clip.
  expect(after).toEqual([[255,255,255],[255,255,255]])
  await expect(last).toHaveCSS('outline-color','rgb(0, 128, 120)')
  await page.keyboard.press('Tab');await expect(menu.locator('div > a[href="/request-a-quote/"]')).toBeFocused()
  await page.keyboard.press('Tab');await expect(close).toBeFocused()
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused()
})
