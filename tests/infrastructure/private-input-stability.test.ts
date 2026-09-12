import {chromium} from '@playwright/test'
import {expect, it} from 'vitest'
import {fillPrivateInput} from '../e2e/support/private-input'

it.each(['synchronous-reset', 'next-frame-replacement'])('retains private input after %s without submitting', async mode => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    let writes = 0
    await page.route('**/*', route => { writes++; return route.abort() })
    await page.setContent('<input id="field">')
    await page.evaluate(mode => {
      let first = true
      document.addEventListener('input', event => {
        if (!first) return
        first = false
        const field = event.target as HTMLInputElement
        if (mode === 'synchronous-reset') field.value = ''
        else requestAnimationFrame(() => {const next = document.createElement('input'); next.id = 'field'; field.replaceWith(next)})
      })
    }, mode)
    await fillPrivateInput(page, '#field', 'synthetic-private-value')
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    expect(await page.evaluate(() => document.querySelector<HTMLInputElement>('#field')?.value === 'synthetic-private-value')).toBe(true)
    expect(writes).toBe(0)
  } finally { await browser.close() }
}, 15_000)
