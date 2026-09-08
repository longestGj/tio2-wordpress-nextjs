import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

import {JSDOM} from 'jsdom'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const planningRoot = resolve(process.env.TIO2_MY_PLANNING_ROOT ?? 'D:/23MySec')
const checkOnly = process.argv.includes('--check')
const pageId = 'PRODUCT-PROC-SU'
const route = '/products/sulfate-process-titanium-dioxide/'
const heading = 'Sulfate Process Titanium Dioxide'
const sourceRoot = 'pages/products/sulfate-process/'
const sources = {
  package: ['06_handoff/PRODUCT-PROC-SU_GATE6_HANDOFF_PACKAGE_V0.1.md', '343a220cb92d058a6c8914c4e30af405d619076b14ec96eb06a2e59ef0b7f192'],
  body: ['04_planning/PRODUCT-PROC-SU_GATE2_FULL_BUYER_CLEAN_COPY_V0.2.md', '8534c95765d8cb7869a686f20963f862f9f155555b49d6ada17fa5e310304fda'],
  contentContract: ['04_planning/PRODUCT-PROC-SU_GATE2_CONTENT_CONTRACT_V0.1.md', 'ec03883e25ce30629f20b84738dbab812e5323c28479bb595db49a0a53a39634'],
  visual: ['04_planning/gate4-v0.1/PRODUCT-PROC-SU_GATE4_COMPLETE_VISUAL_V0.1.html', 'e17a3fafb143b2a9c7d9b72661093bdb237d453c162b6a7f38feb209cbea485c'],
  direction: ['04_planning/gate4-v0.1/visual-direction.css', 'c9c3cd702764928f528f6be9824857b958df363171c5a1fff77fae204a2cfd99'],
  freeze: ['04_planning/gate4-v0.1/approval_core/source-freeze.json', 'e4615952f2989d09c66e61dc45b926c36226fd92fbde5ca3ad698cb090bd8576'],
}
const gradeItems = [
  {name: 'M-996', href: '/products/m-996/'},
  {name: 'M-2196', href: '/products/m-2196/'},
  {name: 'M-108', href: '/products/m-108/'},
  {name: 'M-52', href: '/products/m-52/'},
  {name: 'M-2377', href: '/products/m-2377/'},
]

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

// Split only selector-list commas, preserving :is(h1,h2,h3) and attribute values.
function splitSelectors(value) {
  const selectors = []
  let depth = 0
  let quote = null
  let start = 0
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (quote) {
      if (character === quote && value[index - 1] !== '\\') quote = null
    } else if (character === '"' || character === "'") quote = character
    else if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth -= 1
    else if (character === ',' && depth === 0) {
      selectors.push(value.slice(start, index).trim())
      start = index + 1
    }
  }
  selectors.push(value.slice(start).trim())
  return selectors
}

function closingBrace(css, open) {
  let depth = 1
  let quote = null
  for (let index = open + 1; index < css.length; index += 1) {
    const character = css[index]
    if (quote) {
      if (character === quote && css[index - 1] !== '\\') quote = null
    } else if (character === '"' || character === "'") quote = character
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return index
  }
  throw new Error('Unbalanced Sulfate visual CSS')
}

function scopeCss(css) {
  const prefix = `[data-editorial-page="${pageId}"] main`
  let result = ''
  let cursor = 0
  while (cursor < css.length) {
    const open = css.indexOf('{', cursor)
    if (open === -1) break
    const prelude = css.slice(cursor, open).trim()
    const close = closingBrace(css, open)
    const body = css.slice(open + 1, close)
    cursor = close + 1
    if (prelude.startsWith('@media')) result += `${prelude}{\n${scopeCss(body)}}\n`
    else {
      if (prelude.startsWith('@')) throw new Error(`Unsupported Sulfate CSS rule: ${prelude}`)
      const selectors = splitSelectors(prelude).flatMap((selector) => {
        if (/\.(header|footer|cookie-layer)\b/.test(selector)) throw new Error('Sulfate body CSS targets a shared owner')
        if (selector === '*') return [prefix, `${prefix} *`]
        if (selector === 'main' || selector === 'body') return [prefix]
        return [`${prefix} ${selector.replace(/^main\s+/, '')}`]
      })
      result += `${selectors.join(',\n')}{${body.trim()}}\n`
    }
  }
  return result
}

async function emit(relativePath, content) {
  const output = resolve(repoRoot, relativePath)
  if (checkOnly) {
    if (await readFile(output, 'utf8') !== content) throw new Error(`Generated Sulfate output is stale: ${relativePath}`)
  } else {
    await mkdir(dirname(output), {recursive: true})
    await writeFile(output, content, 'utf8')
  }
}

const inputs = {}
for (const [key, [relativePath, expected]] of Object.entries(sources)) {
  const bytes = await readFile(resolve(planningRoot, sourceRoot, relativePath))
  if (sha256(bytes) !== expected) throw new Error(`${pageId} ${key} SHA-256 mismatch`)
  inputs[key] = bytes.toString('utf8')
}

const document = new JSDOM(inputs.visual).window.document
const main = document.querySelector('main')
if (!main || main.querySelector('h1')?.textContent !== heading || main.querySelector('header,footer,script,style')) {
  throw new Error('The frozen Sulfate body identity is invalid')
}
const sections = [...main.querySelectorAll(':scope > section')]
if (sections.length !== 5) throw new Error('Sulfate must have five body modules')
const visibleGrades = [...main.querySelectorAll('.grades article')].map((article) => ({
  name: article.querySelector('h3')?.textContent,
  href: article.querySelector('a')?.getAttribute('href'),
}))
if (JSON.stringify(visibleGrades) !== JSON.stringify(gradeItems)) throw new Error('The frozen Sulfate Grade set/order is invalid')

const approvedText = main.textContent
// The only semantic transform is internal source attribution. No buyer values are prefilled.
for (const anchor of main.querySelectorAll('a')) {
  const href = anchor.getAttribute('href')
  if (href === '/request-a-quote/' || href === '/request-documents/') {
    anchor.setAttribute('href', `${href}?source_page_id=${pageId}`)
  }
}
const moduleIds = ['hero', 'process-explanation', 'sulfate-grades', 'continue-evaluation', 'request-quote']
sections.forEach((section, index) => section.setAttribute('data-module', moduleIds[index]))
if (main.textContent !== approvedText) throw new Error('Sulfate export changed approved visible text')

const bodyHtml = main.innerHTML
const payload = {
  identity: {pageId, siteScope: 'tio2-my', locale: 'en', path: route, section: 'products', provisional: false, schemaVersion: 'editorial-v0.1'},
  source: {
    packageId: 'PRODUCT-PROC-SU-G6-HANDOFF-01',
    packageSha256: sources.package[1],
    bodySha256: sources.body[1],
    visualSha256: sources.visual[1],
    renderedBodySha256: sha256(bodyHtml),
  },
  seo: {
    title: 'Sulfate Process Titanium Dioxide Grades | TiO2 Malaysia',
    metaDescription: 'Explore five Malaysia-origin sulfate process titanium dioxide Grades by application, then review product details, request documents or request a quote.',
    canonical: `https://tio2malaysia.com${route}`,
    schemaType: 'CollectionPage',
    schemaItems: gradeItems,
  },
  heading,
  breadcrumb: [{label: 'Home', href: '/'}, {label: 'Products', href: '/products/'}, {label: heading, href: route}],
  bodyHtml,
  mainClass: 'editorial-sulfate-main',
  freshness: null,
}
const allStyles = document.querySelector('style')?.textContent ?? ''
const bodyStart = allStyles.lastIndexOf('*{box-sizing:border-box}')
if (bodyStart === -1) throw new Error('Sulfate body CSS marker is missing')
const sourceCss = `${allStyles.slice(bodyStart)}\n${inputs.direction}`
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\bInter\s*,\s*Arial\s*,\s*sans-serif\b/gi, 'var(--font-my-shared),Arial,sans-serif')
const css = `/* Generated from SU-G4-COMPLETE-V01-F01 body and visual-direction.css. Shared owners are consumed separately. */\n${scopeCss(sourceCss)}`

await emit('wordpress/plugins/tio2-site-model/config/tio2-my-editorial-product-proc-su.json', `${JSON.stringify(payload, null, 2)}\n`)
await emit('components/sites/tio2-my/editorial/product-proc-su.css', css)
process.stdout.write(`${checkOnly ? 'Checked' : 'Built'} PRODUCT-PROC-SU; renderedBodySha256=${payload.source.renderedBodySha256}; cssSha256=${sha256(css)}\n`)
