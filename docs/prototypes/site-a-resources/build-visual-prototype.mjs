import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const usage = 'Usage: node build-visual-prototype.mjs <site-a-resources-v0.1.json>'
const inputPath = process.argv[2]
if (!inputPath || process.argv.length !== 3) throw new Error(usage)

const manifest = JSON.parse(await readFile(inputPath, 'utf8'))
if (manifest?.siteId !== 'tio2-a' || !Array.isArray(manifest.records) || manifest.records.length !== 11) {
  throw new Error('Expected the complete 11-record Site A Resources manifest')
}

const records = new Map(manifest.records.map((record) => [record.identity.id, record]))
const hub = records.get('resources-hub')
const explainer = records.get('article-04')
const evaluation = records.get('article-07')
if (!hub || !explainer || !evaluation) throw new Error('Representative records are missing')

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')

const titleCase = (value) => value
  .split('-')
  .map((part) => part ? part[0].toUpperCase() + part.slice(1) : part)
  .join(' ')

const sectionById = (record, id) => record.sections.find((section) => section.id === id)

function preparedRichHtml(record, html) {
  const hasRelatedProduct = record.relationships.some((link) => link.type === 'product')
  const tdsControlled = hasRelatedProduct
    ? html
    : html.replaceAll('<p>Technical Data Sheets are available upon request.</p>', '')
  return tdsControlled
    .replace(/<\/ul>\s*<ul>/gu, '')
    .replaceAll('<table>', '<div class="table-region" tabindex="0"><table>')
    .replaceAll('</table>', '</table></div>')
}

const pagePresentation = Object.freeze({
  hub: {
    headline: 'Titanium Dioxide Technical Resources',
    directAnswer: '<p>Use these technical guides to understand titanium dioxide properties, interpret TDS data, compare candidate grades and plan application testing. The resources are designed to support technical decisions—not replace validation in your own formulation and process conditions.</p>',
    metaTitle: 'Titanium Dioxide Technical Resources | TIOVAR',
    metaDescription: 'Explore titanium dioxide technical guides on material fundamentals, performance interpretation, grade replacement and application testing.',
    summary: [
      ['Browse by', 'Technical question'],
      ['Library', '10 practical guides'],
      ['Use for', 'Comparison planning'],
      ['Boundary', 'Validate in application'],
    ],
  },
  evaluation: {
    headline: 'How to Evaluate an Alternative Titanium Dioxide Grade',
    metaTitle: 'Titanium Dioxide Grade Replacement Guide | TIOVAR',
    metaDescription: 'Learn how to evaluate an alternative titanium dioxide grade using a current control, staged screening, same-formulation testing and finished-product approval.',
    summary: [
      ['Decision', 'Grade replacement'],
      ['Starting point', 'Current grade as control'],
      ['Method', 'Same-formulation comparison'],
      ['Final step', 'Application validation'],
    ],
    practicalTitle: 'What This Means for Grade Replacement',
    mistakesTitle: 'Common Mistakes When Comparing Titanium Dioxide Grades',
    ctaEyebrow: 'Grade comparison',
    ctaTitle: 'Compare Your Current TiO₂ Grade with a Candidate',
    ctaBody: 'Share the grade you currently use, the candidate you are considering, and the application. We can help structure the comparison around the performance criteria that matter to your formulation.',
    ctaButton: 'Discuss a Grade Comparison',
  },
  explainer: {
    headline: 'What Does Oil Absorption Mean in Titanium Dioxide?',
    metaTitle: 'Titanium Dioxide Oil Absorption Explained | TIOVAR',
    metaDescription: 'Understand titanium dioxide oil absorption, why test methods matter, what the value cannot predict and how to validate it in formulation.',
    summary: [
      ['Topic', 'Performance indicator'],
      ['Relevant to', 'Formulation screening'],
      ['Use with', 'Application testing'],
      ['Do not use as', 'Standalone quality ranking'],
    ],
    practicalTitle: 'What This Means for Formulation Decisions',
    mistakesTitle: 'Common Mistakes When Interpreting Oil Absorption',
    ctaEyebrow: 'Interpret the comparison',
    ctaTitle: 'Need Help Interpreting Two Oil-Absorption Values?',
    ctaBody: 'Share the two grades, their reported test values and your application context. The comparison should be interpreted together with the formulation and the performance you need to protect.',
    ctaButton: 'Discuss the Comparison',
  },
})

const headingOverrides = new Map([
  ['evaluation:section-5', 'What the Comparison Means in Different Applications'],
  ['evaluation:section-6', 'When TDS Comparison Is No Longer Enough'],
  ['explainer:section-5', 'How Oil Absorption Should Be Interpreted by Application'],
  ['explainer:section-6', 'What to Check Before Comparing Two TiO₂ Grades'],
])

function formattedModified(value) {
  const date = new Date(`${value}Z`)
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'}).format(date)
}

function stripTags(value) {
  return String(value).replace(/<[^>]+>/gu, ' ').replace(/\s+/gu, ' ').trim()
}

function parseHtmlTable(html) {
  const table = html.match(/<table>[\s\S]*?<\/table>/u)?.[0]
  if (!table) return null
  const rows = [...table.matchAll(/<tr>([\s\S]*?)<\/tr>/gu)].map((match) =>
    [...match[1].matchAll(/<t[hd]>([\s\S]*?)<\/t[hd]>/gu)].map((cell) => stripTags(cell[1])),
  )
  return rows.length > 1 ? {table, headers: rows[0], rows: rows.slice(1)} : null
}

function prototypeHref(link) {
  if (link?.type === 'resource' && link.id === 'article-04') return '?page=explainer'
  if (link?.type === 'resource' && link.id === 'article-07') return '?page=evaluation'
  return `#prototype-${String(link?.type ?? 'link').toLowerCase()}-${String(link?.id ?? 'target').toLowerCase()}`
}

function renderHeader(mode) {
  return `<header class="site-header">
    <a class="logo-link" href="?page=hub" aria-label="TIOVAR Technical Resources home"><img class="logo" src="../site-a-applications/assets/tiovar-logo.png" alt="TIOVAR"></a>
    <nav id="site-navigation-${escapeHtml(mode)}" aria-label="TIOVAR sections"><a href="#prototype-products">Products</a><a href="#prototype-applications">Applications</a><a href="?page=hub">Technical Resources</a><a href="#prototype-about">About TIOVAR</a><a href="#prototype-contact">Contact</a></nav>
    <a class="button header-cta" href="#technical-enquiry-${escapeHtml(mode)}">Discuss Your Requirement</a>
    <button class="menu-mark" type="button" aria-label="Open navigation" aria-controls="site-navigation-${escapeHtml(mode)}" aria-expanded="false">☰</button>
  </header>`
}

function renderFooter() {
  return `<footer class="site-footer"><div class="wrap footer-grid">
    <div><img class="logo footer-logo" src="../site-a-applications/assets/tiovar-logo.png" alt="TIOVAR"><p>Titanium dioxide evaluation guidance for industrial applications.</p></div>
    <div><h3>Explore</h3><a href="#prototype-products">Products</a><a href="#prototype-applications">Applications</a><a href="?page=hub">Technical Resources</a></div>
    <div><h3>Work with us</h3><a href="#prototype-evaluation">Discuss an evaluation</a><a href="#prototype-documents">Request documents</a><a href="#prototype-sample">Request a sample</a></div>
    <div><h3>TIOVAR</h3><a href="#prototype-about">About TIOVAR</a><a href="#prototype-contact">Contact</a><a href="#prototype-privacy">Privacy</a></div>
  </div><div class="wrap footer-base"><span>© TIOVAR</span><span>Titanium dioxide for industrial applications</span></div></footer>`
}

function renderBreadcrumb(items) {
  return `<nav class="breadcrumb" aria-label="Breadcrumb"><ol>${items.map((item, index) => index === items.length - 1
    ? `<li aria-current="page">${escapeHtml(item)}</li>`
    : `<li><a href="${item === 'Technical Resources' ? '?page=hub' : '#top'}">${escapeHtml(item)}</a></li>`).join('')}</ol></nav>`
}

function renderHero(record, mode) {
  const presentation = pagePresentation[mode]
  const eyebrow = mode === 'hub' ? 'Technical Resource Hub' : `${record.hero.eyebrow} · ${record.identity.cluster}`
  const guideLabel = mode === 'hub' ? 'Resource scope' : 'Direct answer'
  const answer = presentation.directAnswer ?? record.hero.directAnswer
  return `<section class="hero ${mode}"><div class="wrap hero-grid">
    <div class="hero-copy"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1>${escapeHtml(presentation.headline)}</h1><div class="trust-meta"><span>${mode === 'hub' ? 'Technical Resource Library' : 'Technical Guide'}</span><span>Last updated: ${escapeHtml(formattedModified(record.identity.modified))}</span></div><div class="hero-answer"><strong>${guideLabel}</strong>${answer}</div></div>
    <aside class="hero-visual" aria-label="Page decision summary"><div class="visual-orbit" aria-hidden="true"><span>TiO₂</span></div>${presentation.summary.map(([label, value]) => `<p><b>${escapeHtml(label)}</b><span>${escapeHtml(value)}</span></p>`).join('')}</aside>
  </div></section>`
}

function renderDecisionRail(labels) {
  return `<div class="decision-rail">${labels.map((label, index) => `<span>0${index + 1}&nbsp; ${escapeHtml(label)}</span>`).join('')}</div>`
}

function renderTakeaways(items, title = 'Key Takeaways') {
  return `<section class="section soft"><div class="wrap"><div class="section-head"><p class="eyebrow">At a glance</p><h2>${escapeHtml(title)}</h2></div><ol class="takeaway-grid">${items.map((item, index) => `<li><span>0${index + 1}</span><p>${escapeHtml(item)}</p></li>`).join('')}</ol></div></section>`
}

function renderNumberedList(items, title, eyebrow, className = 'numbered-list') {
  return `<section class="section"><div class="wrap split"><div class="section-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2></div><ol class="${className}">${items.map((item, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item)}</p></li>`).join('')}</ol></div></section>`
}

function renderComparison(table, title = 'Comparison Table', eyebrow = 'Compare the evidence') {
  if (!table) return ''
  return `<section class="section soft"><div class="wrap"><div class="section-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h2>${escapeHtml(title)}</h2></div><div class="table-region" tabindex="0"><table><thead><tr>${table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell, index) => `<${index === 0 ? 'th' : 'td'}>${escapeHtml(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</tbody></table></div></div></section>`
}

function renderFaqs(record, faqs = record.faqs) {
  return `<section class="section"><div class="wrap"><div class="section-head"><p class="eyebrow">Common technical questions</p><h2>Frequently Asked Questions</h2></div><div class="faq-list">${faqs.map((faq) => `<details><summary>${escapeHtml(faq.question)}<span>+</span></summary><div>${faq.answerHtml}</div></details>`).join('')}</div></div></section>`
}

const applicationTitles = new Map([
  ['applications-hub', 'Titanium Dioxide Applications'],
  ['printing-inks', 'Titanium Dioxide for Printing Inks'],
  ['high-pvc-flat-paint', 'Titanium Dioxide for High-PVC Flat Paint'],
])

const productTitles = new Map([
  ['products-hub', 'Titanium Dioxide Products'],
])

function relationshipTitle(link) {
  if (link.type === 'resource') return link.id === 'article-07' ? pagePresentation.evaluation.headline : records.get(link.id)?.identity.title ?? titleCase(link.id)
  if (link.type === 'product') return productTitles.get(link.id) ?? `TIOVAR ${link.id}`
  return applicationTitles.get(link.id) ?? titleCase(link.id)
}

const relatedDescriptions = new Map([
  ['resources-hub:product:products-hub', 'Explore TIOVAR product grades and the application contexts they are designed to support.'],
  ['resources-hub:application:applications-hub', 'Continue into coatings, plastics, inks and other application-specific selection and validation guidance.'],
  ['article-07:resource:article-03', 'Understand why composition alone cannot predict finished-system behavior.'],
  ['article-07:resource:article-04', 'Interpret powder–vehicle interaction without treating oil absorption as finished-formula viscosity.'],
  ['article-07:resource:article-05', 'Understand undertone as a controlled comparison parameter when evaluating titanium dioxide.'],
  ['article-07:resource:article-06', 'Connect pigment surface treatment with dispersion, rheology and durability direction.'],
  ['article-04:product:TP-I100', 'Review the printing-ink grade context behind one reported oil-absorption example.'],
  ['article-04:product:TP-C200', 'Review the high-PVC coating grade context behind the second reported example.'],
  ['article-04:application:printing-inks', 'Continue into vehicle, dispersion, filtration and print-performance validation.'],
  ['article-04:application:high-pvc-flat-paint', 'Plan oil-absorption, binder, dispersant and film-integrity screening in a complete high-PVC coating.'],
  ['article-04:resource:article-03', 'Understand why TiO₂ content alone cannot predict finished-system performance.'],
])

function renderRelated(record, links = record.relationships) {
  const cards = links.map((link) => {
    const description = relatedDescriptions.get(`${record.identity.id}:${link.type}:${link.id}`)
      ?? `Review ${relationshipTitle(link)} in the context of this technical decision.`
    return `<a href="${prototypeHref(link)}"><span>${escapeHtml(link.label ?? titleCase(link.type))}</span><h3>${escapeHtml(relationshipTitle(link))}</h3><p>${escapeHtml(description)}</p><span class="text-link">Review context →</span></a>`
  })
  const heading = record.identity.id === 'resources-hub'
    ? 'Related Products and Applications'
    : 'Related Products, Applications and Resources'
  const grid = record.identity.id === 'article-04'
    ? `<div class="related-grid count-5 related-grid--oil"><div class="related-row related-row--products">${cards.slice(0, 2).join('')}</div><div class="related-row related-row--context">${cards.slice(2).join('')}</div></div>`
    : `<div class="related-grid count-${links.length}">${cards.join('')}</div>`
  return `<section class="section soft"><div class="wrap"><div class="section-head"><p class="eyebrow">Continue the technical evaluation</p><h2>${heading}</h2></div>${grid}</div></section>`
}

function renderCta(mode, {showTds = false} = {}) {
  const presentation = pagePresentation[mode]
  const content = mode === 'hub'
    ? {
        eyebrow: 'Choose the next step',
        title: 'Not Sure Which Guide Fits Your Question?',
        body: 'Share the property, TDS value, candidate-grade question or application issue you are evaluating. We can help identify the information and comparison inputs needed for the next step.',
        button: 'Discuss Your Evaluation',
      }
    : {
        eyebrow: presentation.ctaEyebrow,
        title: presentation.ctaTitle,
        body: presentation.ctaBody,
        button: presentation.ctaButton,
      }
  const inputs = mode === 'evaluation'
    ? ['Current grade and candidate grade', 'Application and formulation context', 'Process conditions and current result', 'Test methods and acceptance limits']
    : mode === 'explainer'
      ? ['Two reported oil-absorption values', 'Test method and reporting basis', 'Vehicle, binder or formulation type', 'Performance that must be protected']
      : ['Question blocking the next decision', 'Current material or candidate grades', 'Application and process context', 'Available test data or observations']
  return `<section class="enquiry" id="technical-enquiry-${escapeHtml(mode)}"><div class="wrap enquiry-grid"><div><p class="eyebrow">${escapeHtml(content.eyebrow)}</p><h2>${escapeHtml(content.title)}</h2><p>${escapeHtml(content.body)}</p></div><div class="enquiry-panel"><h3>Useful inputs</h3><ul>${inputs.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="actions"><a class="button light" href="#prototype-enquiry">${escapeHtml(content.button)}</a>${showTds ? '<a class="button outline-light" href="#prototype-tds-request">Request a TDS</a>' : ''}</div></div></div></section>`
}

function renderDisclaimer(record) {
  return `<div class="wrap disclaimer"><strong>Technical Boundary</strong><div>${record.disclaimerHtml}</div></div>`
}

function renderStageFramework(table) {
  const stageContent = (row) => `<dl><div><dt>Action</dt><dd>${escapeHtml(row[1])}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(row[2])}</dd></div><div><dt>Boundary</dt><dd>${escapeHtml(row[3])}</dd></div></dl>`
  const desktop = table.rows.map((row, index) => {
    const title = row[0].replace(/^\d+\.\s*/u, '')
    return `<li><span>Stage ${String(index + 1).padStart(2, '0')}</span><h3>${escapeHtml(title)}</h3>${stageContent(row)}</li>`
  }).join('')
  const mobile = table.rows.map((row, index) => {
    const title = row[0].replace(/^\d+\.\s*/u, '')
    return `<details${index === 0 ? ' open' : ''}><summary><span>Stage ${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(title)}</strong><b aria-hidden="true">+</b></summary>${stageContent(row)}</details>`
  }).join('')
  return `<section class="stage-framework article-width--wide" id="evaluation-section-2" aria-labelledby="evaluation-stage-framework-heading"><p class="section-index">02</p><div class="stage-intro"><p class="eyebrow">Core evaluation method</p><h2 id="evaluation-stage-framework-heading">A Six-Stage Grade-Replacement Decision Path</h2><p>Each stage should produce a defined decision before the candidate moves forward. The stages should be documented as an evidence path; a favourable early screen is useful, but it should not be treated as the final selection decision.</p></div><ol class="stage-desktop">${desktop}</ol><div class="stage-mobile">${mobile}</div></section>`
}

function renderOilExamples(record) {
  const [inkExample, coatingExample] = record.comparisonTable.rows
  const examples = [
    {
      number: '01',
      row: inkExample,
      use: 'Use the reported value as one formulation-screening input. Validate vehicle balance, dispersion, fineness, viscosity, storage response and print performance in the actual ink.',
    },
    {
      number: '02',
      row: coatingExample,
      use: 'Use the reported value as one formulation-screening input when planning binder, dispersant and rheology trials. Validate hiding, film integrity and storage behavior in the complete coating.',
    },
  ]
  return `<!-- CONTENT VERIFICATION REQUIRED BEFORE PRODUCTION: confirm TP-I100 14 g/100 g, TP-C200 36 g/100 g, both application directions, whether each referenced TDS omits the test method, and whether revision/date traceability is available. --><div class="oil-examples" data-content-verification="required-before-production"><h3>Interpret the Values in Context</h3><p class="comparison-rule">Do not compare reported oil-absorption values as a performance ranking unless the test method, endpoint, sample handling and reference basis are comparable.</p><div class="oil-example-grid">${examples.map((example) => `<article><p class="example-index">Example ${example.number}</p><h4>${escapeHtml(example.row[0])}</h4><dl><div><dt>Reported oil absorption</dt><dd>${escapeHtml(example.row[1])}</dd></div><div><dt>Application direction</dt><dd>${escapeHtml(example.row[2])}</dd></div><div><dt>How to use the value</dt><dd>${escapeHtml(example.use)}</dd></div><div><dt>Method / source basis</dt><dd>Test method not stated in the referenced TDS.</dd></div></dl></article>`).join('')}</div><p class="validation-note">Use oil absorption to plan a dispersant ladder and high-PVC formulation screen, then validate the finished system and the formulation’s position relative to CPVC.</p></div>`
}

function renderScorecardSection(record, section, index, heading) {
  const parsed = parseHtmlTable(section.html)
  if (!parsed) return `<section class="article-section" id="${escapeHtml(section.id)}"><p class="section-index">${String(index + 1).padStart(2, '0')}</p><h2>${escapeHtml(heading)}</h2><div class="rich">${preparedRichHtml(record, section.html)}</div></section>`
  const intro = section.html.replace(parsed.table, '')
  const semanticTable = parsed.table.replace(/<tr><td>([\s\S]*?)<\/td>/gu, '<tr><th scope="row">$1</th>')
  const cards = parsed.headers.slice(1).map((application, columnIndex) => `<details${columnIndex === 0 ? ' open' : ''}><summary>${escapeHtml(application)}<span>+</span></summary><dl>${parsed.rows.map((row) => `<div><dt>${escapeHtml(row[0])}</dt><dd>${escapeHtml(row[columnIndex + 1])}</dd></div>`).join('')}</dl></details>`).join('')
  return `<section class="article-section scorecard-section article-width--full" id="evaluation-${escapeHtml(section.id)}"><p class="section-index">${String(index + 1).padStart(2, '0')}</p><h2>${escapeHtml(heading)}</h2><div class="rich">${preparedRichHtml(record, intro)}</div><div class="scorecard-desktop">${preparedRichHtml(record, semanticTable)}</div><div class="scorecard-mobile" aria-label="Cross-application scorecard by application">${cards}</div></section>`
}

function addEvaluationContextualLinks(html) {
  const links = [
    ['Why TiO₂ Content Alone Does Not Determine Performance', prototypeHref({type: 'resource', id: 'article-03'})],
    ['titanium dioxide oil absorption', prototypeHref({type: 'resource', id: 'article-04'})],
    ['CBU', prototypeHref({type: 'resource', id: 'article-05'})],
    ['titanium dioxide surface treatment', prototypeHref({type: 'resource', id: 'article-06'})],
  ]
  return links.reduce((result, [label, href]) => result.replace(label, `<a class="contextual-link" href="${href}">${label}</a>`), html)
}

function renderSection(record, section, index, mode) {
  const heading = headingOverrides.get(`${mode}:${section.id}`) ?? section.heading
  if (mode === 'evaluation' && section.id === 'section-4') return renderScorecardSection(record, section, index, heading)
  let sectionHtml = section.html
  if (mode === 'evaluation' && section.id === 'section-1') sectionHtml = addEvaluationContextualLinks(sectionHtml)
  if (mode === 'explainer' && section.id === 'section-5') sectionHtml = sectionHtml.replace('TP-I100 and TP-C200 are distinct application-designed examples.', 'TP-I100 and TP-C200 are application-specific examples intended for different formulation contexts.')
  if (mode === 'explainer') sectionHtml = sectionHtml.replace('does not prove a CPVC position', 'does not establish the formulation’s position relative to CPVC')
  const lead = mode === 'evaluation' && section.id === 'section-6'
    ? '<p class="section-lead">When dispersion, rheology, opacity, gloss, processing or durability can change the result, a document comparison must continue into application testing.</p>'
    : ''
  const oilExamples = mode === 'explainer' && section.id === 'section-5' ? renderOilExamples(record) : ''
  return `<section class="article-section article-width--text" id="${mode}-${escapeHtml(section.id)}"><p class="section-index">${String(index + 1).padStart(2, '0')}</p><h2>${escapeHtml(heading)}</h2>${lead}<div class="rich">${preparedRichHtml(record, sectionHtml)}</div>${oilExamples}</section>`
}

function renderArticleNavigation(items, mode) {
  return `<nav class="article-nav" aria-label="In this guide"><strong>In this guide</strong><ol>${items.map((item, index) => `<li><a href="#${mode}-section-${index + 1}"><span>0${index + 1}</span>${escapeHtml(item)}</a></li>`).join('')}</ol></nav>`
}

function renderArticleCore(record, mode) {
  const navItems = mode === 'explainer'
    ? ['Definition and limits', 'Why lower is not always better', 'Viscosity and vehicle demand', 'High-PVC coatings', 'Application interpretation', 'Before comparing grades']
    : ['Current control', 'Six-stage decision path', 'Same-formulation lab screen', 'Cross-application scorecard', 'Application interpretation', 'When TDS comparison is not enough']
  const takeaways = mode === 'explainer'
    ? record.keyTakeaways.slice(0, 4).map((item) => item
        .replace('Compare values only with the same method, endpoint, sample handling and preferably a simultaneous agreed reference sample.', 'Compare values only when the method, endpoint and sample handling are aligned, preferably with an agreed reference sample tested in the same run.')
        .replace('distinct application-designed examples', 'application-specific examples intended for different formulation contexts'))
    : record.keyTakeaways
  const sections = record.sections.filter((section) => !(mode === 'explainer' && section.id === 'section-7') && !(mode === 'evaluation' && section.id === 'section-2'))
  return `<section class="section article-overview"><div class="wrap article-overview-grid">${renderArticleNavigation(navItems, mode)}
    <section class="inline-takeaways"><p class="eyebrow">Key conclusions</p><ul>${takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p class="overview-guidance">Use the page as a planning guide. Confirm results in the intended formulation, process and finished product.</p></section></div></section>
    <section class="article-content">
    ${sections.map((section) => {
      const sectionIndex = Number(section.id.replace('section-', '')) - 1
      const articleSection = renderSection(record, section, sectionIndex, mode)
      if (mode === 'evaluation' && section.id === 'section-1') return `${articleSection}<div class="decision-chain article-width--medium" aria-label="Controlled comparison sequence"><span>Current grade</span><b>→</b><span>Candidate grade</span><b>→</b><span>Same formulation</span><b>→</b><span>Same process</span><b>→</b><span>Same test</span><b>→</b><span>Compare outcome</span></div>${renderStageFramework(record.comparisonTable)}`
      return articleSection
    }).join('')}
  </section>`
}

function renderMistakes(record, mode) {
  const mistakes = mode === 'evaluation'
    ? record.commonMistakes.map((item, index) => index === 5 ? 'Defining approval criteria only after seeing the candidate result, instead of setting them in advance against the intended end-use requirements.' : item)
    : record.commonMistakes
  return `<section class="section navy"><div class="wrap"><div class="section-head"><p class="eyebrow">Interpretation guardrails</p><h2>${escapeHtml(pagePresentation[mode].mistakesTitle)}</h2></div><div class="mistake-grid count-${mistakes.length}">${mistakes.map((item, index) => `<article><span>0${index + 1}</span><p>${escapeHtml(item)}</p></article>`).join('')}</div></div></section>`
}

function renderPractical(record, mode) {
  const implications = mode === 'explainer'
    ? record.practicalImplications.map((item) => item.replace('PVC-to-CPVC effects', 'the formulation’s position relative to CPVC'))
    : record.practicalImplications
  return `<section class="section soft"><div class="wrap split"><div class="section-head"><p class="eyebrow">Apply the guidance</p><h2>${escapeHtml(pagePresentation[mode].practicalTitle)}</h2></div><ul class="practical-list">${implications.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div></section>`
}

function renderHub() {
  const pathDefs = [
    {key: 'fundamentals', label: 'TiO₂ Fundamentals', ids: ['article-01', 'article-02', 'article-03'], intro: 'Use these guides to understand what crystal form, production route and TiO₂ content can tell you—and what they cannot predict about finished-system performance.'},
    {key: 'performance', label: 'Performance Interpretation', ids: ['article-04', 'article-05', 'article-06'], intro: 'Use these guides to interpret oil absorption, CBU and surface treatment without treating any single powder property as a prediction of finished-system performance.'},
    {key: 'replacement', label: 'Grade Replacement', ids: ['article-07'], intro: 'Use this guide to structure a controlled grade-replacement decision from the current control through laboratory screening, justified adjustment and production validation.'},
    {key: 'testing', label: 'Application Testing', ids: ['article-08', 'article-09', 'article-10'], intro: 'Use these guides to plan controlled tests for high-PVC cost, polycarbonate stability and outdoor durability questions.'},
  ]
  const paths = pathDefs.map((definition, index) => {
    return `<section class="learning-path" id="${definition.key}"><div class="path-intro"><p class="eyebrow">Path 0${index + 1} · ${definition.ids.length} ${definition.ids.length === 1 ? 'guide' : 'guides'}</p><h2>${escapeHtml(definition.label)}</h2><div class="rich"><p>${escapeHtml(definition.intro)}</p></div></div><div class="article-list">${definition.ids.map((id, articleIndex) => { const article = records.get(id); const type = Number(id.slice(-2)) <= 6 ? 'Technical Explainer' : 'Evaluation Guide'; const title = id === 'article-07' ? pagePresentation.evaluation.headline : article.identity.title; return `<a href="${prototypeHref({type: 'resource', id})}"><span>${String(articleIndex + 1).padStart(2, '0')}</span><div><p>${escapeHtml(type)}</p><h3>${escapeHtml(title)}</h3><p>${escapeHtml(article.seo.description)}</p><strong>View guide →</strong></div><b aria-hidden="true">→</b></a>` }).join('')}</div></section>`
  }).join('')
  const boundary = sectionById(hub, 'why-guides-do-not-replace-testing')
  const hubFaqs = [
    {question: 'Where should I start if I am comparing TiO₂ grades?', answerHtml: hub.faqs[0].answerHtml},
    {question: 'Can TDS values predict application performance?', answerHtml: '<p>No. They can be useful screening inputs when the test method and comparison basis are clear, but they do not establish complete-system performance.</p>'},
    {question: 'Can these guides recommend one titanium dioxide grade?', answerHtml: hub.faqs[1].answerHtml},
    {question: 'What should I prepare for a technical evaluation discussion?', answerHtml: hub.faqs[3].answerHtml},
  ]
  const hubLinks = [
    {type: 'product', id: 'products-hub', label: 'Products'},
    {type: 'application', id: 'applications-hub', label: 'Applications'},
  ]
  return `<section class="page active" id="page-hub" data-meta-title="${escapeHtml(pagePresentation.hub.metaTitle)}" data-meta-description="${escapeHtml(pagePresentation.hub.metaDescription)}">${renderHeader('hub')}${renderBreadcrumb(['Home', 'Technical Resources'])}${renderHero(hub, 'hub')}${renderDecisionRail(['Fundamentals', 'Interpretation', 'Replacement', 'Application testing'])}
    <section class="section topic-picker"><div class="wrap"><div class="section-head"><p class="eyebrow">Find the right guide</p><h2>Choose a Titanium Dioxide Topic</h2><p class="section-intro">Start with the question you are trying to answer—understanding TiO₂ properties, interpreting performance data, comparing grades, or planning application testing.</p></div></div></section>
    <section class="paths-section"><div class="wrap">${paths}</div></section>
    <section class="section soft"><div class="wrap"><div class="section-head"><p class="eyebrow">From information to evidence</p><h2>How to Use These Guides</h2></div><div class="use-guide-grid"><article><span>01</span><h3>Understand the property</h3><p>Learn what the value or characteristic actually represents.</p></article><article><span>02</span><h3>Compare the right variables</h3><p>Avoid treating a single specification as the complete decision.</p></article><article><span>03</span><h3>Validate in your formulation</h3><p>Use application testing before final grade approval.</p></article></div><div class="boundary-strip"><strong>${escapeHtml(boundary.heading)}</strong><div class="rich">${preparedRichHtml(hub, boundary.html)}</div></div></div></section>
    <section class="section navy"><div class="wrap"><div class="section-head"><p class="eyebrow">Technical guardrails</p><h2>Three Mistakes to Avoid When Using Technical Guides</h2></div><div class="hub-mistake-grid"><article><span>01</span><h3>Comparing grades by one TDS value</h3><p>A single specification is a screening input, not the complete grade decision.</p></article><article><span>02</span><h3>Treating a specification as finished-product performance</h3><p>Powder data does not establish the result in the complete formulation or finished product.</p></article><article><span>03</span><h3>Skipping application validation</h3><p>Use matched formulation, process and acceptance criteria before approval.</p></article></div></div></section>
    ${renderRelated(hub, hubLinks)}${renderCta('hub')}${renderFaqs(hub, hubFaqs)}${renderDisclaimer(hub)}${renderFooter()}</section>`
}

function renderArticle(record, mode) {
  const isExplainer = mode === 'explainer'
  const methodTitle = isExplainer ? 'How to Validate Oil Absorption in Your Formulation' : 'How to Move From Lab Screen to Finished-Product Approval'
  return `<section class="page" id="page-${mode}" data-meta-title="${escapeHtml(pagePresentation[mode].metaTitle)}" data-meta-description="${escapeHtml(pagePresentation[mode].metaDescription)}">${renderHeader(mode)}${renderBreadcrumb(['Home', 'Technical Resources', pagePresentation[mode].headline])}${renderHero(record, mode)}${renderDecisionRail(isExplainer ? ['Answer', 'Interpret', 'Compare', 'Validate'] : ['Define', 'Control', 'Evaluate', 'Approve'])}
    ${renderArticleCore(record, mode)}${renderPractical(record, mode)}${renderMistakes(record, mode)}${renderNumberedList(record.evaluationMethod, methodTitle, 'Practical validation', 'method-list')}${renderRelated(record)}${renderCta(mode, {showTds: isExplainer && record.relationships.some((link) => link.type === 'product')})}${renderFaqs(record)}${renderDisclaimer(record)}${renderFooter()}</section>`
}

const css = String.raw`
  :root{--navy:#0a1f44;--navy2:#112d59;--ink:#10203a;--muted:#48566b;--steel:#657185;--silver:#c7ccd3;--rule:#e1e5ea;--ice:#f4f6f8;--white:#fff;--focus:#4f82c4;--gutter:clamp(1.35rem,5cqw,3.7rem)}
  *{box-sizing:border-box}html{background:#dfe4ea;scroll-behavior:smooth}body{margin:0;color:var(--ink);font-family:"Source Sans 3","Segoe UI",Arial,sans-serif;font-size:17px;line-height:1.62}.reviewbar{position:sticky;z-index:100;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;border-bottom:1px solid #b8c0cb;background:rgba(247,249,251,.97);padding:.7rem 1rem;box-shadow:0 8px 24px rgba(10,31,68,.08)}.reviewbar strong{margin-right:auto;color:var(--navy)}.reviewbar button{min-height:38px;border:1px solid var(--silver);border-radius:8px;background:#fff;color:var(--navy);padding:.45rem .75rem;font:600 .84rem inherit;cursor:pointer}.reviewbar button.active{border-color:var(--navy);background:var(--navy);color:#fff}.reviewbar small{width:100%;color:var(--steel);text-align:right}.stage{padding:1.25rem;overflow:auto}.viewport{container-name:prototype;container-type:inline-size;width:min(100%,1440px);margin:auto;background:#fff;box-shadow:0 20px 55px rgba(10,31,68,.16)}.viewport.mobile{width:390px}.site{min-width:0;overflow:hidden;background:#fff}.page{display:none}.page.active{display:block}body.capture .reviewbar{display:none}body.capture .stage{padding:0}body.capture .viewport{width:100%;box-shadow:none}
  h1,h2,h3,h4,p,ol,ul{margin:0}h1,h2,h3,h4{font-family:"Space Grotesk","Segoe UI",Arial,sans-serif;font-weight:500;text-wrap:balance}h1{max-width:17ch;color:var(--navy);font-size:clamp(2.8rem,5.1cqw,4.75rem);letter-spacing:-.045em;line-height:.99}h2{color:var(--navy);font-size:clamp(2rem,3.25cqw,3rem);letter-spacing:-.035em;line-height:1.08}h3{color:var(--navy);font-size:1.18rem;line-height:1.25}h4{color:var(--navy);font-size:1.5rem;line-height:1.2}a{color:inherit;text-decoration:none}p{color:var(--muted)}.wrap{width:min(100%,1180px);margin-inline:auto;padding-inline:var(--gutter)}.section{padding-block:clamp(4.25rem,7.5cqw,5.5rem)}.soft{background:var(--ice)}.navy{background:linear-gradient(115deg,var(--navy),var(--navy2));color:#fff}.navy h2,.navy h3,.navy p{color:#fff}.eyebrow{margin-bottom:.8rem;color:var(--steel)!important;font-size:.76rem;font-weight:600;letter-spacing:.16em;text-transform:uppercase}.section-head{max-width:780px}.split{display:grid;grid-template-columns:.84fr 1.16fr;gap:clamp(3rem,7cqw,5.5rem);align-items:start}.button{display:inline-flex;min-height:44px;align-items:center;justify-content:center;border:1px solid var(--navy);border-radius:10px;background:var(--navy);color:#fff;padding:.7rem 1rem;font-weight:600}.text-link{display:inline-flex;margin-top:1rem;color:var(--navy);font-weight:600}
  .site-header{display:grid;grid-template-columns:auto minmax(0,1fr) auto;min-height:78px;align-items:center;gap:clamp(1rem,3cqw,2.5rem);border-bottom:1px solid var(--rule);background:#fff;padding:.75rem clamp(1.25rem,4cqw,4rem)}.logo{width:150px;height:auto}.site-header nav{display:flex;justify-content:center;gap:clamp(.8rem,2cqw,1.55rem);font-size:.85rem}.site-header nav a{display:inline-flex;min-height:44px;align-items:center;white-space:nowrap}.menu-mark{display:none}.breadcrumb{border-bottom:1px solid var(--rule);background:#fff;padding:.25rem clamp(1.25rem,5cqw,3.7rem)}.breadcrumb ol{display:flex;align-items:center;gap:.5rem;padding:0;list-style:none}.breadcrumb li{color:var(--steel);font-size:.75rem}.breadcrumb a{display:inline-flex;min-height:44px;align-items:center}.breadcrumb li+li::before{margin-right:.5rem;color:var(--silver);content:"/"}
  .hero{position:relative;overflow:hidden;background:linear-gradient(120deg,#fbfcfd 0%,#f3f6f8 58%,#e5ebf0 100%)}.hero::after{position:absolute;right:0;bottom:0;left:0;height:6px;background:linear-gradient(90deg,var(--navy) 0%,var(--navy) 58%,var(--silver) 58%);content:""}.hero-grid{display:grid;grid-template-columns:1.16fr .84fr;min-height:640px;align-items:center;gap:clamp(2rem,5cqw,4rem);padding-block:4.4rem}.hero.hub .hero-grid{min-height:560px;padding-block:3.2rem}.hero-copy{position:relative;z-index:2}.trust-meta{display:flex;flex-wrap:wrap;gap:.5rem 1.25rem;margin-top:1.15rem;color:var(--steel);font-size:.78rem;font-weight:600;letter-spacing:.04em}.trust-meta span+span::before{margin-right:1.25rem;color:var(--silver);content:"•"}.hero-answer{max-width:680px;margin-top:1.35rem;border:1px solid #d4dbe3;border-left:4px solid var(--navy);background:rgba(255,255,255,.9);padding:1.15rem 1.3rem;color:var(--ink);font-size:1.08rem;line-height:1.62}.hero-answer strong{display:block;margin-bottom:.45rem;color:var(--navy);font:600 .7rem "Space Grotesk",Arial,sans-serif;letter-spacing:.15em;text-transform:uppercase}.hero-answer p{color:inherit}.hero-visual{position:relative;display:grid;grid-template-columns:1fr 1fr;align-content:end;gap:1px;min-height:410px;background:var(--silver);padding:1px}.hero-visual::before{position:absolute;inset:0;background:linear-gradient(rgba(10,31,68,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(10,31,68,.04) 1px,transparent 1px);background-size:32px 32px;content:""}.hero-visual p{position:relative;z-index:2;display:grid;min-height:112px;align-content:center;gap:.35rem;background:rgba(255,255,255,.94);padding:1.1rem;color:var(--navy);font-family:"Space Grotesk",Arial,sans-serif;font-size:.9rem}.hero-visual p b{color:var(--steel);font-size:.7rem;font-weight:600;letter-spacing:.09em;text-transform:uppercase}.hero-visual p span{font-size:.92rem;line-height:1.35}.visual-orbit{position:relative;z-index:2;grid-column:1/-1;display:grid;min-height:165px;place-items:center;background:var(--navy)}.visual-orbit::before,.visual-orbit::after{position:absolute;border:1px solid rgba(255,255,255,.28);border-radius:50%;content:""}.visual-orbit::before{width:120px;height:120px}.visual-orbit::after{width:72px;height:72px}.visual-orbit span{color:#fff;font:500 2.3rem "Space Grotesk",Arial,sans-serif}.decision-rail{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--rule);background:#fff}.decision-rail span{padding:1rem;color:var(--steel);font-size:.74rem;font-weight:600;text-align:center}.decision-rail span+span{border-left:1px solid var(--rule)}
  .rich p+p,.rich p+ul,.rich ul+p,.rich table+p{margin-top:1rem}.rich ul{display:grid;gap:.5rem;margin-top:1rem;padding-left:1.25rem}.rich li{color:var(--muted)}.practical-list{display:grid;gap:0;padding:0;list-style:none}.practical-list li{border-top:1px solid var(--silver);padding:1.1rem 0;color:var(--ink);font-size:1.03rem}.practical-list li::before{margin-right:.8rem;color:var(--steel);content:"→"}.takeaway-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2.8rem;background:var(--silver);padding:1px;list-style:none}.takeaway-grid li{min-height:210px;background:#fff;padding:1.4rem}.takeaway-grid span{display:block;margin-bottom:2rem;color:var(--steel)}.takeaway-grid p{color:var(--ink)}
  .topic-picker{padding-bottom:2.2rem}.section-intro{max-width:680px;margin-top:1rem;font-size:1.08rem}.paths-section{padding-block:1rem clamp(3rem,6cqw,5rem)}.learning-path{display:grid;grid-template-columns:.78fr 1.22fr;gap:clamp(2rem,6cqw,5rem);padding-block:clamp(3.8rem,7cqw,5.5rem);border-top:1px solid var(--silver)}.learning-path:first-child{border-top:0}.path-intro{position:sticky;top:5rem;align-self:start}.path-intro .rich{margin-top:1.2rem}.article-list{border-top:1px solid var(--silver)}.article-list>a{display:grid;min-height:44px;grid-template-columns:42px 1fr auto;align-items:start;gap:1.2rem;border-bottom:1px solid var(--rule);border-left:3px solid transparent;padding:1.35rem 1rem 1.35rem .8rem;transition:background .18s ease,border-color .18s ease}.article-list>a:hover,.article-list>a:focus{outline:0;border-left-color:var(--navy);background:var(--ice)}.article-list>a>span,.article-list>a>b{color:var(--steel);font-weight:500}.article-list a h3{margin:.2rem 0 .55rem}.article-list a p:first-child{color:var(--steel);font-size:.72rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase}.article-list a p:last-of-type{font-size:.92rem}.article-list a strong{display:inline-block;margin-top:.7rem;color:var(--navy);font-size:.82rem}.use-guide-grid,.hub-mistake-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2.6rem;background:var(--silver);padding:1px}.use-guide-grid article{min-height:210px;background:#fff;padding:1.45rem}.use-guide-grid span,.hub-mistake-grid span{display:block;margin-bottom:1.6rem;color:var(--steel);font-size:.8rem}.use-guide-grid p,.hub-mistake-grid p{margin-top:.65rem}.boundary-strip{display:grid;grid-template-columns:240px 1fr;gap:2rem;margin-top:1px;border-top:1px solid var(--silver);background:#fff;padding:1.45rem}.boundary-strip strong{color:var(--navy);font-family:"Space Grotesk",Arial,sans-serif}.hub-mistake-grid{background:rgba(255,255,255,.2)}.hub-mistake-grid article{min-height:230px;background:rgba(7,23,47,.42);padding:1.45rem}.hub-mistake-grid span{color:var(--silver)}.method-list,.numbered-list{padding:0;list-style:none}.method-list li,.numbered-list li{display:grid;grid-template-columns:42px 1fr;gap:1.2rem;border-top:1px solid var(--silver);padding:1.15rem 0}.method-list span,.numbered-list span{color:var(--steel)}.method-list p,.numbered-list p{color:var(--ink)}
  .article-shell{padding-bottom:0}.article-grid{display:grid;grid-template-columns:230px minmax(0,1fr);gap:clamp(3rem,7cqw,6rem);align-items:start}.article-nav{position:sticky;top:2rem;border-top:4px solid var(--navy);background:var(--ice);padding:1.4rem}.article-nav strong{color:var(--navy);font-family:"Space Grotesk",Arial,sans-serif}.article-nav ol{display:grid;gap:.25rem;margin-top:1rem;padding:0;list-style:none}.article-nav li a{display:grid;min-height:44px;grid-template-columns:28px 1fr;align-items:center;color:var(--muted);font-size:.82rem}.article-nav li a:hover,.article-nav li a:focus{outline:0;color:var(--navy);text-decoration:underline;text-underline-offset:3px}.article-nav li span{color:var(--steel)}.article-nav p{margin-top:1.5rem;border-top:1px solid var(--silver);padding-top:1rem;font-size:.78rem}.article-body{min-width:0;max-width:850px}.inline-takeaways{padding:3.5rem 0;border-bottom:1px solid var(--silver)}.inline-takeaways ul{display:grid;grid-template-columns:1fr 1fr;gap:0 2rem;padding:0;list-style:none}.inline-takeaways li{border-top:1px solid var(--rule);padding:1rem 0;color:var(--ink)}.article-section{padding:clamp(3.8rem,6cqw,5rem) 0;border-bottom:1px solid var(--silver);scroll-margin-top:2rem}.section-index{margin-bottom:1rem;color:var(--steel);font:500 .78rem "Space Grotesk",Arial,sans-serif}.article-section h2{max-width:20ch}.section-lead{max-width:760px;margin-top:1.4rem;border-left:3px solid var(--navy);padding-left:1rem;color:var(--ink);font-weight:600}.article-section .rich{margin-top:1.5rem}.article-section .rich>p,.article-section .rich>ul{max-width:760px}.article-section .rich strong{color:var(--navy)}.decision-chain{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem;margin-top:-1px;border:1px solid var(--silver);background:var(--ice);padding:1.2rem}.decision-chain span{border:1px solid #d6dce4;background:#fff;padding:.45rem .65rem;color:var(--navy);font-size:.82rem;font-weight:600}.decision-chain b{color:var(--steel);font-weight:500}.stage-framework{margin:3.5rem 0 1rem;border-top:5px solid var(--navy);background:var(--ice);padding:clamp(1.5rem,4cqw,2.5rem);scroll-margin-top:2rem}.stage-intro{max-width:680px}.stage-intro>p:last-child{margin-top:.8rem}.stage-desktop{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2.3rem;background:var(--silver);padding:1px;list-style:none}.stage-desktop>li{min-width:0;background:#fff;padding:1.25rem}.stage-desktop>li>span{display:block;margin-bottom:1rem;color:var(--steel);font:600 .7rem "Space Grotesk",Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase}.stage-framework dl{display:grid;gap:.75rem;margin:1.2rem 0 0}.stage-framework dl div{border-top:1px solid var(--rule);padding-top:.65rem}.stage-framework dt{color:var(--steel);font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase}.stage-framework dd{margin:.25rem 0 0;color:var(--muted);font-size:.84rem;line-height:1.45}.stage-mobile{display:none}.stage-mobile details{border:1px solid var(--silver);background:#fff}.stage-mobile details+details{margin-top:.75rem}.stage-mobile summary{display:grid;min-height:64px;grid-template-columns:auto 1fr auto;align-items:center;gap:.75rem;padding:.85rem;color:var(--navy);cursor:pointer}.stage-mobile summary span{color:var(--steel);font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.stage-mobile summary strong{font-family:"Space Grotesk",Arial,sans-serif;font-weight:500}.stage-mobile details dl{padding:0 .9rem 1rem}.comparison-rule{margin:1.35rem 0 0;border-left:4px solid var(--navy);background:var(--ice);padding:1.1rem 1.3rem;color:var(--ink);font-weight:600}.oil-examples{margin-top:2.5rem}.oil-examples>h3{font-size:1.65rem}.oil-example-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;margin-top:1.2rem;background:var(--silver);padding:1px}.oil-example-grid article{background:#fff;padding:1.4rem}.example-index{margin-bottom:.55rem;color:var(--steel);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.oil-example-grid dl{margin:1.25rem 0 0}.oil-example-grid dl div{border-top:1px solid var(--rule);padding:.8rem 0}.oil-example-grid dt{color:var(--steel);font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.oil-example-grid dd{margin:.25rem 0 0;color:var(--muted);font-size:.9rem}.validation-note{margin-top:1px;border-left:3px solid var(--navy);background:var(--ice);padding:1rem;color:var(--ink)}
  .article-overview{padding-block:clamp(3.5rem,6cqw,4.25rem)}.article-overview-grid{display:grid;grid-template-columns:230px minmax(0,1fr);align-items:start;gap:clamp(3rem,7cqw,6rem)}.article-overview .inline-takeaways{padding:0}.article-overview .article-nav{padding:1.1rem 1.2rem}.article-overview .article-nav ol{gap:0;margin-top:.65rem}.article-overview .article-nav li a{font-size:.9rem;line-height:1.45}.overview-guidance{margin-top:1rem;border-top:1px solid var(--silver);padding-top:.85rem;color:var(--muted);font-size:.8rem;line-height:1.5}.article-content{padding-bottom:0}.article-width--text{width:min(calc(100% - 2 * var(--gutter)),1000px);margin-inline:auto}.article-width--medium{width:min(calc(100% - 2 * var(--gutter)),1060px);margin-inline:auto}.article-width--wide{width:min(calc(100% - 2 * var(--gutter)),1120px);margin-inline:auto}.article-width--full{width:min(calc(100% - 2 * var(--gutter)),1180px);margin-inline:auto}.contextual-link{color:var(--navy);font-weight:600;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}.oil-examples{position:relative;left:50%;width:min(calc(100cqw - 2 * var(--gutter)),1120px);transform:translateX(-50%)}.oil-example-grid h4{font-size:1.2rem}
  .table-region{width:100%;margin-top:2.2rem;overflow-x:auto;border:1px solid var(--silver)}table{width:100%;min-width:840px;border-collapse:collapse;text-align:left}th,td{border-bottom:1px solid var(--rule);padding:1rem;vertical-align:top}thead th{background:var(--ice);color:var(--steel);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase}tbody th{color:var(--navy)}td{color:var(--muted);font-size:.9rem}.rich>.table-region{margin-top:1.5rem}.rich table th,.rich table td{font-size:.82rem}.rich table thead th{background:var(--ice)}.scorecard-mobile{display:none}.scorecard-mobile details{border:1px solid var(--silver);background:#fff}.scorecard-mobile details+details{margin-top:.75rem}.scorecard-mobile summary{display:flex;min-height:58px;align-items:center;justify-content:space-between;padding:.8rem 1rem;color:var(--navy);font-weight:700;cursor:pointer}.scorecard-mobile dl{margin:0;padding:0 1rem 1rem}.scorecard-mobile dl div{display:grid;grid-template-columns:.9fr 1.1fr;gap:.8rem;border-top:1px solid var(--rule);padding:.75rem 0}.scorecard-mobile dt{color:var(--steel);font-size:.75rem;font-weight:600}.scorecard-mobile dd{margin:0;color:var(--ink);font-size:.86rem}.mistake-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2.7rem}.mistake-grid.count-4{grid-template-columns:repeat(4,1fr)}.mistake-grid article{min-height:220px;background:rgba(7,23,47,.42);padding:1.4rem}.mistake-grid span{display:block;margin-bottom:1.8rem;color:var(--silver)}.related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;margin-top:2.5rem}.related-grid.count-1{grid-template-columns:minmax(0,560px)}.related-grid.count-2{grid-template-columns:repeat(2,minmax(0,1fr))}.related-grid.count-4{grid-template-columns:repeat(4,1fr)}.related-grid>a{display:block;min-height:240px;border-top:4px solid var(--navy);background:#fff;padding:1.5rem}.related-grid>a:hover,.related-grid>a:focus{outline:2px solid var(--focus);outline-offset:-2px}.related-grid>a>span:first-child{display:block;margin-bottom:2rem;color:var(--steel);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.related-grid>a p{margin-top:.7rem;font-size:.9rem}
  .related-grid--oil{display:block;background:transparent;padding:0}.related-row{display:grid;gap:1px;background:var(--silver);padding:1px}.related-row+.related-row{margin-top:1px}.related-row--products{grid-template-columns:repeat(2,1fr)}.related-row--context{grid-template-columns:repeat(3,1fr)}.related-row>a{display:block;min-height:240px;border-top:4px solid var(--navy);background:#fff;padding:1.5rem}.related-row>a:hover,.related-row>a:focus{outline:2px solid var(--focus);outline-offset:-2px}.related-row>a>span:first-child{display:block;margin-bottom:2rem;color:var(--steel);font-size:.72rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase}.related-row>a p{margin-top:.7rem;font-size:.9rem}
  .enquiry{background:linear-gradient(115deg,var(--navy),var(--navy2));padding-block:4.75rem}.enquiry-grid{display:grid;grid-template-columns:.85fr 1.15fr;gap:clamp(3rem,7cqw,5rem)}.enquiry h2,.enquiry h3,.enquiry p{color:#fff}.enquiry .eyebrow{color:var(--silver)!important}.enquiry-grid>div:first-child>p:last-child{margin-top:1rem}.enquiry-panel{border:1px solid rgba(255,255,255,.22);padding:1.5rem}.enquiry-panel ul{display:grid;grid-template-columns:1fr 1fr;gap:.7rem 1.5rem;margin-top:1rem;padding-left:1.2rem;color:#e6e8ec}.actions{display:flex;flex-wrap:wrap;gap:.7rem;margin-top:1.5rem}.light{border-color:#fff;background:#fff;color:var(--navy)}.outline-light{border-color:#fff;background:transparent;color:#fff}.faq-list{margin-top:2.3rem;border-top:1px solid var(--silver)}.faq-list details{border-bottom:1px solid var(--silver)}.faq-list summary{display:flex;min-height:64px;align-items:center;justify-content:space-between;gap:1rem;color:var(--navy);font-weight:600;cursor:pointer}.faq-list details>div{max-width:820px;padding:0 2rem 1.25rem 0}.disclaimer{display:grid;grid-template-columns:220px 1fr;gap:2rem;border-top:1px solid var(--rule);padding-block:2.2rem;color:var(--steel);font-size:.78rem}.disclaimer strong{color:var(--navy)}.site-footer{background:#07172f;color:#fff;padding:3rem 0 1.5rem}.footer-grid{display:grid;grid-template-columns:1.6fr repeat(3,1fr);gap:2rem}.footer-logo{filter:brightness(0) invert(1)}.site-footer h3{color:#fff;font-size:.95rem}.site-footer p,.site-footer span,.site-footer a{display:flex;min-height:44px;align-items:center;color:#d8dee7;font-size:.82rem}.site-footer p{margin-top:.55rem}.footer-base{display:flex;justify-content:space-between;margin-top:2rem;border-top:1px solid rgba(255,255,255,.16);padding-top:1rem}.footer-base span{min-height:0}
  @container prototype (max-width:900px){.site-header nav{display:none}.menu-mark{display:block;grid-column:-2/-1;grid-row:1}.header-cta{display:none}.site-header nav.mobile-open{display:flex;grid-column:1/-1;grid-row:2;flex-direction:column;align-items:stretch;gap:0}.site-header nav.mobile-open a{border-top:1px solid var(--rule)}.hero-grid,.learning-path,.split,.article-grid,.enquiry-grid{grid-template-columns:1fr}.hero-grid{min-height:0}.hero-visual{min-height:330px}.path-intro,.article-nav{position:static}.article-nav{display:none}.takeaway-grid,.mistake-grid,.mistake-grid.count-4,.related-grid,.related-grid.count-4,.stage-desktop{grid-template-columns:repeat(2,1fr)}.boundary-strip{grid-template-columns:1fr}.footer-grid{grid-template-columns:1fr 1fr}.footer-grid>div:first-child{grid-column:1/-1}}
  @container prototype (max-width:700px){body{font-size:16px}h1{font-size:clamp(2.35rem,11cqw,3.15rem)}h2{font-size:clamp(1.8rem,8cqw,2.3rem)}.site-header{grid-template-columns:1fr auto;min-height:64px;padding:.7rem 1rem}.logo{width:124px}.breadcrumb{padding-inline:1rem}.hero-grid{gap:1.7rem;padding:2.8rem 1rem 3.1rem}.hero.hub .hero-grid{gap:1.2rem;padding:2rem 1rem}.trust-meta{display:grid;gap:.2rem;margin-top:1rem}.trust-meta span+span::before{display:none}.hero-answer{margin-top:1rem;padding:1rem;font-size:1rem;line-height:1.55}.hero-visual{grid-template-columns:1fr 1fr;min-height:290px}.visual-orbit{min-height:125px}.hero-visual p{min-height:96px;padding:.85rem;font-size:.75rem}.hero-visual p span{font-size:.78rem}.hero.hub .hero-visual{min-height:0}.hero.hub .visual-orbit{min-height:72px}.hero.hub .visual-orbit::before{width:58px;height:58px}.hero.hub .visual-orbit::after{width:34px;height:34px}.hero.hub .visual-orbit span{font-size:1.45rem}.hero.hub .hero-visual p{min-height:58px;padding:.55rem}.decision-rail{grid-template-columns:repeat(2,1fr)}.wrap{padding-inline:1rem}.section{padding-block:3.8rem}.topic-picker{padding-bottom:1rem}.takeaway-grid,.mistake-grid,.mistake-grid.count-4,.related-grid,.related-grid.count-1,.related-grid.count-2,.related-grid.count-4,.use-guide-grid,.hub-mistake-grid,.oil-example-grid{grid-template-columns:1fr}.takeaway-grid li,.mistake-grid article,.related-grid>a,.use-guide-grid article,.hub-mistake-grid article{min-height:0}.learning-path{gap:1.4rem;padding-block:3rem}.article-list>a{grid-template-columns:28px 1fr;gap:.65rem;padding:1.2rem .6rem}.article-list>a>b{display:none}.article-list a p:last-of-type{font-size:.86rem}.article-shell{background:var(--ice);padding-block:1rem}.article-body{display:grid;gap:1rem}.inline-takeaways{border:1px solid var(--rule);background:#fff;padding:1.25rem}.inline-takeaways ul{grid-template-columns:1fr}.inline-takeaways li:last-child{padding-bottom:0}.article-section{border:1px solid var(--rule);border-top:4px solid #b8c2cf;background:#fff;padding:2rem 1.1rem}.article-section h2{max-width:none}.article-section .rich{margin-top:1.15rem}.decision-chain{margin-top:0;padding:.9rem}.decision-chain span{flex:1 1 42%;text-align:center}.stage-framework{margin:0;padding:1.25rem 1rem}.stage-desktop{display:none}.stage-mobile{display:block;margin-top:1.5rem}.scorecard-desktop{display:none}.scorecard-mobile{display:block;margin-top:1.35rem}.comparison-rule{margin-top:1.1rem;padding:1rem}.oil-examples{margin-top:1.8rem}.oil-example-grid{margin-top:1rem}.table-region{width:calc(100vw - 2rem)}.scorecard-section .table-region{width:100%}.enquiry-panel ul{grid-template-columns:1fr}.actions{display:grid}.disclaimer{grid-template-columns:1fr;gap:.7rem;padding-inline:1rem}.footer-grid{grid-template-columns:1fr 1fr}.footer-base{display:grid;gap:.4rem}}
  .hero.hub .hero-grid{padding-block:2.7rem}
  @container prototype (max-width:700px){.hero.hub .hero-grid{gap:1rem;padding:1.4rem 1rem}.hero.hub h1{font-size:2.35rem}.hero.hub .hero-answer{padding:.8rem;font-size:.92rem;line-height:1.45}}
  @container prototype (max-width:900px){.article-overview-grid{grid-template-columns:1fr}.overview-guidance{display:none}.related-row--products,.related-row--context{grid-template-columns:repeat(2,1fr)}}
  @container prototype (max-width:700px){#page-evaluation .breadcrumb [aria-current="page"],#page-explainer .breadcrumb [aria-current="page"]{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;border:0;padding:0;clip-path:inset(50%);white-space:nowrap}.article-overview{background:var(--ice);padding-block:1rem}.article-overview-grid{display:block}.article-content{display:grid;gap:1rem;background:var(--ice);padding-block:1rem}.article-width--text,.article-width--medium,.article-width--wide,.article-width--full{width:calc(100% - 2rem);margin-inline:auto}.oil-examples{left:auto;width:100%;transform:none}.related-row--products,.related-row--context{grid-template-columns:1fr}.related-row>a{min-height:0}}
  .logo-link{display:inline-flex;min-height:44px;align-items:center}.menu-mark{min-width:44px;min-height:44px;border:0;background:transparent;color:var(--navy);font-size:1.2rem}
  @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TIOVAR Technical Resources Visual Prototype</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600&family=Space+Grotesk:wght@400;500;600&display=swap" rel="stylesheet"><style>${css}</style></head><body id="top"><div class="reviewbar"><strong>TIOVAR Technical Resources — representative visual prototype</strong><div><button class="page-button active" data-page="hub">Resources Hub</button><button class="page-button" data-page="evaluation">Evaluation Guide</button><button class="page-button" data-page="explainer">Technical Explainer</button></div><div><button class="view-button active" data-view="desktop">Desktop</button><button class="view-button" data-view="mobile">Mobile</button></div><small>Protected visual review · complete approved content · semantic prototype links</small></div><div class="stage"><div class="viewport" id="viewport"><div class="site">${renderHub()}${renderArticle(evaluation, 'evaluation')}${renderArticle(explainer, 'explainer')}</div></div></div><script>
  const params=new URLSearchParams(location.search);const selected=params.get('page')||'hub';if(params.get('capture')==='1')document.body.classList.add('capture');
  const closeMenus=()=>document.querySelectorAll('.menu-mark').forEach((button)=>{button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open navigation');button.textContent='☰';button.closest('.site-header').querySelector('nav').classList.remove('mobile-open')});
  const selectPage=(key)=>{closeMenus();document.querySelectorAll('.page').forEach((page)=>page.classList.toggle('active',page.id==='page-'+key));document.querySelectorAll('.page-button').forEach((button)=>button.classList.toggle('active',button.dataset.page===key));scrollTo(0,0)};
  document.querySelectorAll('.page-button').forEach((button)=>button.addEventListener('click',()=>selectPage(button.dataset.page)));selectPage(selected);
  document.querySelectorAll('.menu-mark').forEach((button)=>button.addEventListener('click',()=>{const open=button.getAttribute('aria-expanded')!=='true';closeMenus();if(open){button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Close navigation');button.textContent='×';button.closest('.site-header').querySelector('nav').classList.add('mobile-open')}}));
  document.querySelectorAll('.view-button').forEach((button)=>button.addEventListener('click',()=>{document.querySelectorAll('.view-button').forEach((item)=>item.classList.toggle('active',item===button));document.getElementById('viewport').classList.toggle('mobile',button.dataset.view==='mobile')}));
</script></body></html>`

const outputDirectory = path.dirname(fileURLToPath(import.meta.url))
await mkdir(outputDirectory, {recursive: true})
const outputPath = path.join(outputDirectory, 'resources-visual-prototype.html')
await writeFile(outputPath, html, 'utf8')
console.log(JSON.stringify({output: outputPath, records: [hub.identity.id, evaluation.identity.id, explainer.identity.id], bytes: Buffer.byteLength(html)}))
