import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {resolve, dirname} from 'node:path'
import {fileURLToPath} from 'node:url'
import {JSDOM} from 'jsdom'
import postcss from 'postcss'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const planningRoot = resolve(process.env.TIO2_MY_PLANNING_ROOT ?? 'D:/23MySec')
const checkOnly = process.argv.includes('--check')
const tradePath = '/resources/eu-titanium-dioxide-anti-dumping-duty/'
const specs = [
  {
    id: 'MARKET-EU-DE', country: 'Germany', slug: 'germany', packageVersion: '0.2', packageId: 'MARKET-EU-DE-G6-HANDOFF-02',
    packageHash: '75e184dfe89d9acbbb28da100dc8271c7c1a84f89c85f71d11b5ca1bc4d885c2',
    buyerHash: 'f95f338b4b966d48e0a10c0ad81b6fd7ffd21e552cee780bc9597d2e67b6c4d8',
    contractHash: 'a2a5d629258e1d24aff03d6a3b3a24f194d89c5c6c1f5e6b68bb8eaef5faa187',
    visualHash: '9f729196ea8135b7daa9aa83cc8e43768eafa27a35792605de67d125e0eccdbc',
    cssHash: 'd5723d30d33b265beb60d8afe5394621eb5c1ada23d2a89f56ad0d4d7f21b10d',
    meta: 'Evaluate Malaysia-origin titanium dioxide for coatings, plastics and masterbatch procurement in Germany. Review products, documents, samples and quote inputs.',
    tradeSuffix: 'for the dated trade-measure detail and official-source path.',
  },
  {
    id: 'MARKET-EU-IT', country: 'Italy', slug: 'italy', packageVersion: '0.1', packageId: 'MARKET-EU-IT-G6-HANDOFF-01',
    packageHash: '2a21d8bea4c9647ec58a64a085c973ac8f42b159f603c9faa3439b00bae3c6af',
    buyerHash: 'a7d047af04b5127cc54f97938e4d622b1e1b496691747516322924f6e0b44208',
    contractHash: 'ac49b66055bf36b87583e3919005ccbf87919a9900d9a9103aaa7d39936a6e19',
    visualHash: 'ed7d54648e058fee6ee4d6ff7ca76d3fe3f440eda0e5d0d7b8871b6da0f15615',
    meta: 'Evaluate Malaysia-origin titanium dioxide for coatings, compound, masterbatch and packaging-printing projects in Italy. Review products, documents and quote inputs.',
    tradeSuffix: 'for dated trade-measure detail and official-source paths.',
  },
]

const hash = (value) => createHash('sha256').update(value).digest('hex')
const normalize = (value) => value.replace(/\s+/gu, ' ').trim()

async function verified(relativePath, expected) {
  const bytes = await readFile(resolve(planningRoot, relativePath))
  if (hash(bytes) !== expected) throw new Error(`Approved source SHA-256 mismatch: ${relativePath}`)
  return bytes.toString('utf8')
}

function textOf(element) {
  const clone = element.cloneNode(true)
  for (const block of clone.querySelectorAll('section,div,nav,h1,h2,h3,p,li,ul,article,aside')) block.append(' ')
  return normalize(clone.textContent)
}

function buyerText(markdown) {
  const body = markdown.match(/<!-- BUYER_COPY_START -->([\s\S]*?)<!-- BUYER_COPY_END -->/)?.[1]
  if (!body) throw new Error('Missing buyer-copy authority markers')
  return normalize(body.replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1').replace(/^#{1,3}\s+|^-\s+/gmu, '').replace(/\*\*|`/gu, ''))
}

function scopedCss(css, pageId) {
  const scope = `[data-editorial-page="${pageId}"]`
  const tree = postcss.parse(css)
  tree.walkComments((comment) => comment.remove())
  tree.walkAtRules((rule) => {
    if (rule.name !== 'media') throw new Error(`Unsupported approved page CSS rule: @${rule.name}`)
  })
  tree.walkRules((rule) => {
    rule.selectors = rule.selectors.flatMap((selector) => {
      const clean = selector.trim()
      if (clean === ':root') return [scope]
      if (clean === '*') return [`${scope} main`, `${scope} main *`]
      const local = clean.replace(/^(?:body|html)(?=\b)/u, 'main')
      return [`${scope} ${/^main(?:\b|[.#:[>])/u.test(local) ? local : `main ${local}`}`]
    })
  })
  tree.walkDecls((declaration) => {
    if (declaration.prop === 'font-family' || declaration.prop === 'font') {
      declaration.value = declaration.value.replace(/\bInter\b/gu, 'var(--font-my-shared),Inter')
    }
  })
  return `${tree.toString().trim()}\n`
}

async function emit(relativePath, content) {
  const path = resolve(repoRoot, relativePath)
  if (checkOnly) {
    if (await readFile(path, 'utf8') !== content) throw new Error(`Generated output is stale: ${relativePath}`)
  } else {
    await mkdir(dirname(path), {recursive: true})
    await writeFile(path, content, 'utf8')
  }
}

for (const spec of specs) {
  const base = `pages/markets/${spec.slug}`
  const visualBase = `${base}/04_planning/gate4-v0.1`
  const [buyer, , visual] = await Promise.all([
    verified(`${base}/04_planning/${spec.id}_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md`, spec.buyerHash),
    verified(`${base}/04_planning/${spec.id}_GATE2_CONTENT_CONTRACT_V0.2.md`, spec.contractHash),
    verified(`${visualBase}/${spec.id}_GATE4_COMPLETE_VISUAL_V0.1.html`, spec.visualHash),
    verified(`${base}/06_handoff/${spec.id}_GATE6_HANDOFF_PACKAGE_V${spec.packageVersion}.md`, spec.packageHash),
  ])
  const document = new JSDOM(visual).window.document
  const main = document.querySelector('main')
  if (!main || main.querySelectorAll('h1').length !== 1 || main.querySelectorAll(':scope > section').length !== 7) throw new Error(`${spec.id}: missing approved main structure`)
  const originalBodyHtml = main.innerHTML
  const originalText = textOf(main)
  if (originalText !== buyerText(buyer)) throw new Error(`${spec.id}: frozen visual body differs from complete B copy`)
  if (main.querySelectorAll('a').length !== 19) throw new Error(`${spec.id}: expected all 19 approved body links`)
  const trade = main.querySelector(`a[href="${tradePath}"]`)
  const sentence = `Use the <a href="${tradePath}">EU Titanium Dioxide Trade Update</a> ${spec.tradeSuffix}`
  if (!trade?.parentElement.innerHTML.includes(sentence)) throw new Error(`${spec.id}: exact conditional Trade sentence not found`)
  trade.parentElement.innerHTML = trade.parentElement.innerHTML.replace(sentence, `<span data-conditional-target="${tradePath}">${sentence}</span>`)

  for (const anchor of main.querySelectorAll('a')) {
    const href = anchor.getAttribute('href')
    if (href === '/request-a-quote/') {
      anchor.setAttribute('href', `${href}?${new URLSearchParams({source_page_id: spec.id, destination_country: spec.country})}`)
    } else if (href === '/request-documents/' || href === '/request-sample/') {
      anchor.setAttribute('href', `${href}?${new URLSearchParams({source_page_id: spec.id})}`)
    } else if (href.startsWith('/applications/')) {
      anchor.parentElement.setAttribute('data-conditional-target', href)
    }
  }
  if (textOf(main) !== originalText) throw new Error(`${spec.id}: content changed during context adaptation`)
  if (main.querySelector('script,img,form,iframe')) throw new Error(`${spec.id}: unapproved media or behavior in body`)

  const inline = document.querySelector('style')?.textContent ?? ''
  const pageStart = spec.id === 'MARKET-EU-DE' ? inline.lastIndexOf(':root{') : inline.lastIndexOf('*{box-sizing:border-box}')
  if (pageStart < 0) throw new Error(`${spec.id}: page-only CSS boundary missing`)
  const override = spec.cssHash ? await verified(`${visualBase}/visual-direction.css`, spec.cssHash) : ''
  const css = scopedCss(`${inline.slice(pageStart)}\n${override}`, spec.id)
  const route = `/markets/${spec.slug}/`
  const heading = `Titanium Dioxide Supplier for ${spec.country}`
  const bodyHtml = main.innerHTML
  const payload = {
    identity: {pageId: spec.id, siteScope: 'tio2-my', locale: 'en', path: route, section: 'markets', provisional: false, schemaVersion: 'editorial-v0.1'},
    source: {packageId: spec.packageId, packageSha256: spec.packageHash, bodySha256: spec.buyerHash, contractSha256: spec.contractHash, visualSha256: spec.visualHash, sourceMainSha256: hash(originalBodyHtml), renderedBodySha256: hash(bodyHtml), stylesheetSha256: hash(css), ...(spec.cssHash ? {visualOverrideSha256: spec.cssHash} : {})},
    seo: {title: `${heading} | TiO2 Malaysia`, metaDescription: spec.meta, canonical: `https://tio2malaysia.com${route}`, schemaType: 'WebPage'},
    heading,
    breadcrumb: [{label: 'Home', href: '/'}, {label: 'Markets', href: '/markets/'}, {label: 'European Union', href: '/markets/european-union/'}, {label: spec.country, href: route}],
    bodyHtml, mainClass: main.getAttribute('class') ?? '', freshness: null,
  }
  await emit(`wordpress/plugins/tio2-site-model/config/tio2-my-editorial-${spec.id.toLowerCase()}.json`, `${JSON.stringify(payload, null, 2)}\n`)
  await emit(`components/sites/tio2-my/editorial/${spec.id.toLowerCase()}.css`, css)
}
process.stdout.write(`${checkOnly ? 'Checked' : 'Built'} 2 exact-source Germany/Italy editorial payloads.\n`)
