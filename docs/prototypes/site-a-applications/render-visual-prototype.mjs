import {mkdir} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

import {chromium} from 'file:///D:/16Wordpress_nextjs/node_modules/playwright/index.mjs'

const root = path.dirname(fileURLToPath(import.meta.url))
const source = path.join(root, 'applications-visual-prototype.html')
const review = path.join(root, 'review')

const pages = [
  {key: 'hub', slug: 'applications-hub', h1: 'Titanium Dioxide Applications'},
  {key: 'category', slug: 'coatings-category', h1: 'Titanium Dioxide for Coatings'},
  {key: 'detail', slug: 'water-based-paint-detail', h1: 'Titanium Dioxide for Water-Based Paint'},
]

const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 390, height: 844},
]

await mkdir(review, {recursive: true})

const browser = await chromium.launch({headless: true})
const failures = []

try {
  for (const item of pages) {
    for (const viewport of viewports) {
      const context = await browser.newContext({
        viewport: {width: viewport.width, height: viewport.height},
        deviceScaleFactor: 1,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      })
      const page = await context.newPage()
      const errors = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push('console: ' + message.text())
      })
      page.on('pageerror', (error) => errors.push('page: ' + error.message))

      const target = pathToFileURL(source)
      target.searchParams.set('page', item.key)
      target.searchParams.set('capture', '1')
      await page.goto(target.href, {waitUntil: 'networkidle'})
      await page.evaluate(() => document.fonts.ready)

      const result = await page.evaluate(() => ({
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        header: Boolean(document.querySelector('.site-header')),
        footer: Boolean(document.querySelector('.site-footer')),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
        height: document.documentElement.scrollHeight,
      }))

      if (result.h1 !== item.h1) errors.push('H1 mismatch: ' + result.h1)
      if (!result.header) errors.push('Header missing')
      if (!result.footer) errors.push('Footer missing')
      if (result.overflow > 1) errors.push('Horizontal overflow: ' + result.overflow + 'px')

      const output = path.join(review, item.slug + '-' + viewport.name + '.png')
      await page.screenshot({path: output, fullPage: true, animations: 'disabled'})
      console.log(JSON.stringify({output, width: viewport.width, height: result.height, errors}))

      if (errors.length) failures.push({output, errors})
      await context.close()
    }
  }
} finally {
  await browser.close()
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}
