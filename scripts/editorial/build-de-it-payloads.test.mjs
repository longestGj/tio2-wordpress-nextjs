import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import {JSDOM} from 'jsdom'

const root = new URL('../../', import.meta.url)

test('Germany and Italy keep full approved prose while adapting receiver context and the conditional Trade sentence', async () => {
  for (const [id, country] of [['MARKET-EU-DE', 'Germany'], ['MARKET-EU-IT', 'Italy']]) {
    const path = new URL(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${id.toLowerCase()}.json`, root)
    const raw = await readFile(path, 'utf8').catch(() => null)
    assert.ok(raw, `${id} generated CMS contract must exist`)
    const page = JSON.parse(raw)
    const document = new JSDOM(`<main>${page.bodyHtml}</main>`).window.document
    assert.equal(document.querySelectorAll('h1').length, 1)
    assert.equal(document.querySelectorAll('main > section').length, 7)
    assert.equal(document.querySelectorAll('a').length, 19)
    const rfq = [...document.querySelectorAll('a')].filter((a) => a.getAttribute('href').startsWith('/request-a-quote/'))
    assert.equal(rfq.length, 3)
    for (const anchor of rfq) {
      const url = new URL(anchor.href, 'https://tio2malaysia.com')
      assert.deepEqual([...url.searchParams], [['source_page_id', id], ['destination_country', country]])
    }
    for (const route of ['/request-documents/', '/request-sample/']) {
      const anchor = [...document.querySelectorAll('a')].find((a) => a.getAttribute('href').startsWith(route))
      assert.deepEqual([...new URL(anchor.href, 'https://tio2malaysia.com').searchParams], [['source_page_id', id]])
    }
    const optional = document.querySelector('[data-conditional-target="/resources/eu-titanium-dioxide-anti-dumping-duty/"]')
    assert.ok(optional.textContent.startsWith('Use the EU Titanium Dioxide Trade Update'))
    assert.equal(optional.querySelector('a').getAttribute('href'), '/resources/eu-titanium-dioxide-anti-dumping-duty/')
    optional.remove()
    assert.ok(document.querySelector('main').textContent.includes('general customs review.'))
    assert.ok(!document.querySelector('main').textContent.includes('EU Titanium Dioxide Trade Update'))
    const finalSection = document.querySelector('main > section:last-child')
    assert.equal(finalSection.textContent.split('After submission, our team reviews').length - 1, 1)
    assert.ok(finalSection.querySelector('h3 + ul li a'))
    assert.equal(page.seo.schemaType, 'WebPage')
  }
})
