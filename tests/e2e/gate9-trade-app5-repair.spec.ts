import {requiredLocalUrl} from './support/required-local-url'
import {expect,test} from '@playwright/test'

const baseUrl=requiredLocalUrl('TIO2_MY_BASE_URL').origin

for(const target of [
 {path:'/markets/brazil/',pageId:'MARKET-BR-EN',language:'en'},
 {path:'/pt-br/markets/brazil/',pageId:'MARKET-BR-PT',language:'pt-BR'},
]) test(`${target.path} resolves its approved same-scope Brazil owner`,async({page})=>{
 const response=await page.goto(`${baseUrl}${target.path}`,{waitUntil:'domcontentloaded'})
 expect(response?.status()).toBe(200)
 const root=page.locator(`[data-site-scope="tio2-my"][data-page-id="${target.pageId}"]`)
 await expect(root).toHaveCount(1)
 await expect(page.locator('html')).toHaveAttribute('lang',target.language)
})
