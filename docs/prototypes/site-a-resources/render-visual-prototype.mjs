import {access, mkdir, readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))
const workspaceRoot = path.resolve(root, '..', '..', '..')

async function resolvePlaywrightModule() {
  const explicitRoot = process.env.TIOVAR_REPO_ROOT
  const candidates = explicitRoot ? [path.resolve(explicitRoot)] : [workspaceRoot]

  if (!explicitRoot) {
    try {
      const gitPointer = await readFile(path.join(workspaceRoot, '.git'), 'utf8')
      const gitDir = gitPointer.match(/^gitdir:\s*(.+)$/imu)?.[1]?.trim()
      if (gitDir) {
        const absoluteGitDir = path.resolve(workspaceRoot, gitDir)
        const commonGitDir = path.resolve(absoluteGitDir, '..', '..')
        candidates.push(path.dirname(commonGitDir))
      }
    } catch {
      // A normal checkout uses a .git directory; the local candidate already covers it.
    }
  }

  for (const candidate of [...new Set(candidates)]) {
    const modulePath = path.join(candidate, 'node_modules', 'playwright', 'index.mjs')
    try {
      await access(modulePath)
      return pathToFileURL(modulePath).href
    } catch {
      // Continue to the next repository-local dependency location.
    }
  }

  throw new Error(`Playwright was not found under the ${explicitRoot ? 'explicit' : 'current or shared'} repository root`)
}

const {chromium} = await import(await resolvePlaywrightModule())
const source = path.join(root, 'resources-visual-prototype.html')
const review = path.join(root, 'review-final')
const evaluationDetails = path.join(review, 'evaluation-details')

const evaluationToc = [
  '01 Current control',
  '02 Six-stage decision path',
  '03 Same-formulation lab screen',
  '04 Cross-application scorecard',
  '05 Application interpretation',
  '06 When TDS comparison is not enough',
]

const pages = [
  {
    key: 'hub',
    slug: 'resources-hub',
    h1: 'Titanium Dioxide Technical Resources',
    metaTitle: 'Titanium Dioxide Technical Resources | TIOVAR',
    metaDescription: 'Explore titanium dioxide technical guides on material fundamentals, performance interpretation, grade replacement and application testing.',
    faqs: 4,
    articleSections: 0,
    logicalSections: 0,
    methods: 0,
    mistakes: 3,
    relations: 2,
    breadcrumbs: 1,
  },
  {
    key: 'evaluation',
    slug: 'alternative-grade-evaluation-guide',
    h1: 'How to Evaluate an Alternative Titanium Dioxide Grade',
    metaTitle: 'Titanium Dioxide Grade Replacement Guide | TIOVAR',
    metaDescription: 'Learn how to evaluate an alternative titanium dioxide grade using a current control, staged screening, same-formulation testing and finished-product approval.',
    faqs: 5,
    articleSections: 5,
    logicalSections: 6,
    methods: 7,
    mistakes: 6,
    relations: 4,
    breadcrumbs: 2,
  },
  {
    key: 'explainer',
    slug: 'oil-absorption-technical-explainer',
    h1: 'What Does Oil Absorption Mean in Titanium Dioxide?',
    metaTitle: 'Titanium Dioxide Oil Absorption Explained | TIOVAR',
    metaDescription: 'Understand titanium dioxide oil absorption, why test methods matter, what the value cannot predict and how to validate it in formulation.',
    faqs: 5,
    articleSections: 6,
    logicalSections: 6,
    methods: 6,
    mistakes: 4,
    relations: 5,
    breadcrumbs: 2,
  },
]

const viewports = [
  {name: 'desktop', width: 1440, height: 1000},
  {name: 'mobile', width: 390, height: 844},
]

await mkdir(review, {recursive: true})
await mkdir(evaluationDetails, {recursive: true})
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
        if (message.type() === 'error') errors.push(`console: ${message.text()}`)
      })
      page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

      const target = pathToFileURL(source)
      target.searchParams.set('page', item.key)
      target.searchParams.set('capture', '1')
      await page.goto(target.href, {waitUntil: 'networkidle'})
      await page.evaluate(() => document.fonts.ready)

      if (viewport.name === 'mobile') {
        const menuButton = page.locator('.page.active .menu-mark')
        const mobileNav = page.locator('.page.active .site-header nav')
        if (await menuButton.getAttribute('aria-expanded') !== 'false') errors.push('Mobile menu initial aria-expanded is not false')
        await menuButton.click()
        if (await menuButton.getAttribute('aria-expanded') !== 'true') errors.push('Mobile menu does not set aria-expanded true')
        if (!await mobileNav.isVisible()) errors.push('Mobile navigation does not open')
        await menuButton.click()
        if (await menuButton.getAttribute('aria-expanded') !== 'false') errors.push('Mobile menu does not close')
      }

      if (viewport.name === 'desktop' && item.key !== 'hub') {
        const lastArticleNavLink = page.locator('.page.active .article-nav a').last()
        const expectedHash = await lastArticleNavLink.getAttribute('href')
        await lastArticleNavLink.click()
        const navigationResult = await page.evaluate((hash) => ({
          hash: location.hash,
          targetInActivePage: Boolean(document.querySelector(hash)?.closest('.page.active')),
        }), expectedHash)
        if (navigationResult.hash !== expectedHash) errors.push(`Article-nav click hash mismatch: ${navigationResult.hash}`)
        if (!navigationResult.targetInActivePage) errors.push(`Article-nav click targets a hidden page: ${expectedHash}`)
        await page.evaluate(() => { history.replaceState(null, '', `${location.pathname}${location.search}`); scrollTo(0, 0) })
      }

      const result = await page.evaluate(() => {
        const active = document.querySelector('.page.active')
        const visible = (element) => Boolean(element?.getClientRects().length)
        const box = (selector) => {
          const element = active.querySelector(selector)
          if (!element || !visible(element)) return null
          const rect = element.getBoundingClientRect()
          return {width: rect.width, left: rect.left, centerDelta: rect.left + rect.width / 2 - window.innerWidth / 2}
        }
        const h2Texts = [...active.querySelectorAll('h2')].map((heading) => heading.textContent.trim())
        const duplicateH2s = h2Texts.filter((heading, index) => h2Texts.indexOf(heading) !== index)
        const requiredLinks = [
          ...active.querySelectorAll('.site-header nav a, .breadcrumb a, .article-list a, .related-grid a, .enquiry a.button, .site-footer a'),
        ]
        const majorLinkHeights = requiredLinks
          .filter(visible)
          .map((link) => ({text: link.textContent.trim().slice(0, 60), height: link.getBoundingClientRect().height}))

        return {
          h1: active.querySelector('h1')?.textContent?.trim() ?? '',
          metaTitle: active.dataset.metaTitle ?? '',
          metaDescription: active.dataset.metaDescription ?? '',
          header: Boolean(active.querySelector('.site-header')),
          footer: Boolean(active.querySelector('.site-footer')),
          overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
          height: document.documentElement.scrollHeight,
          h1Count: active.querySelectorAll('h1').length,
          duplicateH2s,
          duplicateIds: [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
          answerCount: active.querySelectorAll('.hero-answer').length,
          trustMeta: active.querySelector('.trust-meta')?.textContent?.trim() ?? '',
          faqCount: active.querySelectorAll('.faq-list details').length,
          articleSectionCount: active.querySelectorAll('.article-section').length,
          logicalSectionCount: active.querySelectorAll('.article-body > .article-section, .article-body > .stage-framework, .article-content > .article-section, .article-content > .stage-framework').length,
          methodCount: active.querySelectorAll('.method-list li').length,
          mistakeCount: active.querySelectorAll('.mistake-grid article, .hub-mistake-grid article').length,
          relationCount: active.querySelectorAll('.related-grid a').length,
          relatedDescriptions: [...active.querySelectorAll('.related-grid a > p')].map((node) => node.textContent.trim()),
          learningPathCount: active.querySelectorAll('.learning-path').length,
          hubArticleCount: active.querySelectorAll('.article-list > a').length,
          headerLinkCount: active.querySelectorAll('.site-header nav a').length,
          headerLogoLinkCount: active.querySelectorAll('.site-header > a.logo-link').length,
          menuButtonCount: active.querySelectorAll('.site-header > button.menu-mark').length,
          breadcrumbLinkCount: active.querySelectorAll('.breadcrumb a').length,
          footerLinkCount: active.querySelectorAll('.site-footer a').length,
          invalidHrefCount: requiredLinks.filter((link) => !link.getAttribute('href')).length,
          nonSemanticClickableCount: active.querySelectorAll('.site-header nav span, .article-list article[tabindex], .related-grid article, .enquiry span.button, .site-footer span:not(.footer-base span)').length,
          tooShortMajorLinks: majorLinkHeights.filter((link) => link.height < 43).slice(0, 10),
          heroHeight: active.querySelector('.hero-grid')?.getBoundingClientRect().height ?? 0,
          stageDesktopCount: active.querySelectorAll('.stage-desktop > li').length,
          stageMobileCount: active.querySelectorAll('.stage-mobile > details').length,
          stageFirstOpen: active.querySelector('.stage-mobile > details:first-child')?.open ?? false,
          stageDesktopDisplay: getComputedStyle(active.querySelector('.stage-desktop') ?? document.body).display,
          stageMobileDisplay: getComputedStyle(active.querySelector('.stage-mobile') ?? document.body).display,
          scorecardCardCount: active.querySelectorAll('.scorecard-mobile details').length,
          scorecardRowHeaderCount: active.querySelectorAll('.scorecard-desktop tbody th[scope="row"]').length,
          scorecardDesktopDisplay: getComputedStyle(active.querySelector('.scorecard-desktop') ?? document.body).display,
          scorecardMobileDisplay: getComputedStyle(active.querySelector('.scorecard-mobile') ?? document.body).display,
          tocItems: [...active.querySelectorAll('.article-nav li')].map((node) => {
            const number = node.querySelector('span')?.textContent?.trim() ?? ''
            const label = node.textContent.replace(number, '').replace(/\s+/g, ' ').trim()
            return `${number} ${label}`.trim()
          }),
          articleNavLinkCount: active.querySelectorAll('.article-nav a[href*="-section-"]').length,
          articleNavBrokenTargetCount: [...active.querySelectorAll('.article-nav a[href*="-section-"]')].filter((link) => !document.querySelector(link.getAttribute('href'))).length,
          stagedHeadingCount: [...active.querySelectorAll('h2')].filter((node) => node.textContent.trim() === 'A staged decision framework').length,
          stageHeadingCount: [...active.querySelectorAll('h2')].filter((node) => node.textContent.trim() === 'A Six-Stage Grade-Replacement Decision Path').length,
          stageIntro: active.querySelector('.stage-intro > p:last-child')?.textContent?.trim() ?? '',
          evaluationMistakeSix: active.querySelector('.mistake-grid article:nth-child(6) p')?.textContent?.trim() ?? '',
          keyConclusionCount: active.querySelectorAll('.inline-takeaways li').length,
          oilApplicationDesignedCount: [...active.querySelectorAll('.inline-takeaways li')].filter((node) => node.textContent.includes('application-designed')).length,
          oilPvcToCpvcCount: (active.textContent.match(/PVC-to-CPVC/g) ?? []).length,
          oilSection2UlCount: active.querySelectorAll('#explainer-section-2 .rich > ul').length,
          oilSection2LiCount: active.querySelectorAll('#explainer-section-2 .rich > ul > li').length,
          oilSection6UlCount: active.querySelectorAll('#explainer-section-6 .rich > ul').length,
          oilSection6LiCount: active.querySelectorAll('#explainer-section-6 .rich > ul > li').length,
          oilSection5InterpretH3: [...active.querySelectorAll('#explainer-section-5 h3')].filter((node) => node.textContent.trim() === 'Interpret the Values in Context').length,
          oilInterpretH2: [...active.querySelectorAll('h2')].filter((node) => node.textContent.trim() === 'Interpret the Values in Context').length,
          oilExampleCount: active.querySelectorAll('.oil-example-grid article').length,
          oilExampleMethodCount: [...active.querySelectorAll('.oil-example-grid dd')].filter((node) => node.textContent.trim() === 'Test method not stated in the referenced TDS.').length,
          oilExampleTableCount: active.querySelectorAll('.oil-examples table').length,
          visibleTableRegions: [...active.querySelectorAll('.table-region')].filter(visible).map((region) => ({clientWidth: region.clientWidth, scrollWidth: region.scrollWidth})),
          hubFaqAnswer: active.querySelector('.faq-list details:nth-child(2) div')?.textContent?.trim() ?? '',
          topicIntros: [...active.querySelectorAll('.path-intro .rich p')].map((node) => node.textContent.trim()),
          hubRelatedHeading: active.querySelector('.related-grid')?.closest('.section')?.querySelector('h2')?.textContent?.trim() ?? '',
          articleOverviewCount: active.querySelectorAll('.article-overview').length,
          articleOverviewGridCount: active.querySelectorAll('.article-overview-grid').length,
          articleContentCount: active.querySelectorAll('.article-content').length,
          overviewContainsNavAndTakeaways: Boolean(active.querySelector('.article-overview-grid > .article-nav') && active.querySelector('.article-overview-grid > .inline-takeaways')),
          articleNavParagraphCount: active.querySelectorAll('.article-nav > p').length,
          overviewGuidanceCount: active.querySelectorAll('.inline-takeaways > .overview-guidance').length,
          overviewGuidanceText: active.querySelector('.overview-guidance')?.textContent?.trim() ?? '',
          overviewGuidanceDisplay: getComputedStyle(active.querySelector('.overview-guidance') ?? document.body).display,
          articleNavLinkHeights: [...active.querySelectorAll('.article-nav a')].filter(visible).map((link) => link.getBoundingClientRect().height),
          articleNavFontSizes: [...active.querySelectorAll('.article-nav a')].filter(visible).map((link) => parseFloat(getComputedStyle(link).fontSize)),
          articleOverviewHeight: active.querySelector('.article-overview')?.getBoundingClientRect().height ?? 0,
          articleNavHeight: active.querySelector('.article-nav')?.getBoundingClientRect().height ?? 0,
          articleTakeawaysHeight: active.querySelector('.inline-takeaways')?.getBoundingClientRect().height ?? 0,
          evaluationBoxes: {
            section1: box('#evaluation-section-1'),
            decision: box('.decision-chain'),
            stage: box('#evaluation-section-2'),
            section3: box('#evaluation-section-3'),
            scorecard: box('#evaluation-section-4'),
            section5: box('#evaluation-section-5'),
            section6: box('#evaluation-section-6'),
          },
          oilBoxes: {
            sections: [...active.querySelectorAll('[id^="explainer-section-"]')].map((element) => {
              const rect = element.getBoundingClientRect()
              return {width: rect.width, centerDelta: rect.left + rect.width / 2 - window.innerWidth / 2}
            }),
            examples: box('.oil-examples'),
          },
          contextualLinkCount: active.querySelectorAll('#evaluation-section-1 a.contextual-link[href]').length,
          contextualLinkTexts: [...active.querySelectorAll('#evaluation-section-1 a.contextual-link[href]')].map((link) => link.textContent.trim()),
          contentVerification: active.querySelector('.oil-examples')?.dataset.contentVerification ?? '',
          oilExampleValues: [...active.querySelectorAll('.oil-example-grid article')].map((card) => card.textContent.replace(/\s+/g, ' ').trim()),
          oilH2Size: parseFloat(getComputedStyle(active.querySelector('#explainer-section-5 h2') ?? document.body).fontSize),
          oilH3Size: parseFloat(getComputedStyle(active.querySelector('.oil-examples h3') ?? document.body).fontSize),
          oilH4Sizes: [...active.querySelectorAll('.oil-example-grid h4')].map((heading) => parseFloat(getComputedStyle(heading).fontSize)),
          relatedProductCount: active.querySelectorAll('.related-row--products > a').length,
          relatedContextCount: active.querySelectorAll('.related-row--context > a').length,
          breadcrumbCurrentDisplay: getComputedStyle(active.querySelector('.breadcrumb [aria-current="page"]') ?? document.body).display,
          breadcrumbCurrentSemanticState: (() => {
            const current = active.querySelector('.breadcrumb [aria-current="page"]')
            if (!current) return null
            const style = getComputedStyle(current)
            const rect = current.getBoundingClientRect()
            return {
              text: current.textContent.trim(),
              ariaHidden: current.getAttribute('aria-hidden'),
              display: style.display,
              visibility: style.visibility,
              position: style.position,
              width: rect.width,
              height: rect.height,
              clipPath: style.clipPath,
            }
          })(),
          oilNaturalComparisonCount: (active.textContent.match(/Compare values only when the method, endpoint and sample handling are aligned, preferably with an agreed reference sample tested in the same run\./g) ?? []).length,
          oilOldComparisonCount: (active.textContent.match(/preferably a simultaneous agreed reference sample/g) ?? []).length,
          oilProveCpvcCount: (active.textContent.match(/does not prove a CPVC position/g) ?? []).length,
          oilNaturalCpvcCount: (active.textContent.match(/does not establish the formulation’s position relative to CPVC/g) ?? []).length,
        }
      })

      if (result.h1 !== item.h1) errors.push(`H1 mismatch: ${result.h1}`)
      if (result.metaTitle !== item.metaTitle) errors.push(`Meta title mismatch: ${result.metaTitle}`)
      if (result.metaDescription !== item.metaDescription) errors.push(`Meta description mismatch: ${result.metaDescription}`)
      if (result.h1Count !== 1) errors.push(`H1 count: ${result.h1Count}`)
      if (result.duplicateH2s.length) errors.push(`Duplicate H2s: ${result.duplicateH2s.join(', ')}`)
      if (result.duplicateIds.length) errors.push(`Duplicate IDs: ${[...new Set(result.duplicateIds)].join(', ')}`)
      if (result.answerCount !== 1) errors.push(`Direct answer count: ${result.answerCount}`)
      if (!result.trustMeta.includes('Last updated:')) errors.push(`Trust metadata missing: ${result.trustMeta}`)
      if (!result.header) errors.push('Header missing')
      if (!result.footer) errors.push('Footer missing')
      if (result.faqCount !== item.faqs) errors.push(`FAQ count: ${result.faqCount}`)
      if (result.articleSectionCount !== item.articleSections) errors.push(`Article section count: ${result.articleSectionCount}`)
      if (result.logicalSectionCount !== item.logicalSections) errors.push(`Logical section count: ${result.logicalSectionCount}`)
      if (result.methodCount !== item.methods) errors.push(`Method count: ${result.methodCount}`)
      if (result.mistakeCount !== item.mistakes) errors.push(`Mistake count: ${result.mistakeCount}`)
      if (result.relationCount !== item.relations) errors.push(`Relationship count: ${result.relationCount}`)
      if (new Set(result.relatedDescriptions).size !== result.relatedDescriptions.length) errors.push('Related descriptions are duplicated')
      if (result.headerLinkCount !== 5) errors.push(`Header link count: ${result.headerLinkCount}`)
      if (result.headerLogoLinkCount !== 1) errors.push(`Header logo-link count: ${result.headerLogoLinkCount}`)
      if (result.menuButtonCount !== 1) errors.push(`Header menu-button count: ${result.menuButtonCount}`)
      if (result.breadcrumbLinkCount !== item.breadcrumbs) errors.push(`Breadcrumb link count: ${result.breadcrumbLinkCount}`)
      if (result.footerLinkCount < 9) errors.push(`Footer link count: ${result.footerLinkCount}`)
      if (result.invalidHrefCount) errors.push(`Links without href: ${result.invalidHrefCount}`)
      if (result.nonSemanticClickableCount) errors.push(`Non-semantic clickable elements: ${result.nonSemanticClickableCount}`)
      if (result.tooShortMajorLinks.length) errors.push(`Major links below 44px: ${JSON.stringify(result.tooShortMajorLinks)}`)

      if (item.key !== 'hub') {
        if (result.articleOverviewCount !== 1 || result.articleOverviewGridCount !== 1) errors.push(`Article overview structure: ${result.articleOverviewCount}/${result.articleOverviewGridCount}`)
        if (result.articleContentCount !== 1) errors.push(`Main article-content count: ${result.articleContentCount}`)
        if (!result.overviewContainsNavAndTakeaways) errors.push('Overview does not contain both TOC and Key Conclusions')
        if (result.articleNavParagraphCount !== 0) errors.push(`Article nav contains ${result.articleNavParagraphCount} guidance paragraphs`)
        if (result.overviewGuidanceCount !== 1) errors.push(`Overview guidance count: ${result.overviewGuidanceCount}`)
        if (result.overviewGuidanceText !== 'Use the page as a planning guide. Confirm results in the intended formulation, process and finished product.') errors.push(`Overview guidance text: ${result.overviewGuidanceText}`)
        if (viewport.name === 'mobile') {
          const crumb = result.breadcrumbCurrentSemanticState
          if (!crumb || crumb.display === 'none' || crumb.visibility === 'hidden' || crumb.ariaHidden === 'true') errors.push(`Mobile current-page breadcrumb is not semantic: ${JSON.stringify(crumb)}`)
          if (!crumb || crumb.position !== 'absolute' || crumb.width > 1 || crumb.height > 1 || !crumb.clipPath.includes('inset')) errors.push(`Mobile current-page breadcrumb is not visually hidden: ${JSON.stringify(crumb)}`)
          if (result.overviewGuidanceDisplay !== 'none') errors.push(`Mobile overview guidance display: ${result.overviewGuidanceDisplay}`)
        }
        if (viewport.name === 'desktop') {
          if (result.breadcrumbCurrentDisplay === 'none') errors.push('Desktop current-page breadcrumb is hidden')
          if (result.overviewGuidanceDisplay === 'none') errors.push('Desktop overview guidance is hidden')
          if (result.articleNavLinkHeights.some((height) => height < 43)) errors.push(`Article nav links below 44px: ${JSON.stringify(result.articleNavLinkHeights)}`)
          if (result.articleNavFontSizes.some((size) => size < 14.3 || size > 14.5)) errors.push(`Article nav font sizes: ${JSON.stringify(result.articleNavFontSizes)}`)
          if (Math.abs(result.articleNavHeight - result.articleTakeawaysHeight) > 60) errors.push(`Overview column height mismatch: nav=${result.articleNavHeight}, takeaways=${result.articleTakeawaysHeight}`)
          if (result.articleOverviewHeight > 560) errors.push(`Article overview too tall: ${result.articleOverviewHeight}`)
        }
      }

      if (item.key === 'hub') {
        if (result.learningPathCount !== 4) errors.push(`Learning path count: ${result.learningPathCount}`)
        if (result.hubArticleCount !== 10) errors.push(`Hub article count: ${result.hubArticleCount}`)
        if (viewport.name === 'desktop' && (result.heroHeight < 520 || result.heroHeight > 580)) errors.push(`Desktop Hub hero height: ${result.heroHeight}`)
        if (viewport.name === 'mobile' && result.heroHeight > 650) errors.push(`Mobile Hub hero too tall: ${result.heroHeight}`)
        if (result.hubFaqAnswer !== 'No. They can be useful screening inputs when the test method and comparison basis are clear, but they do not establish complete-system performance.') errors.push(`Hub FAQ answer mismatch: ${result.hubFaqAnswer}`)
        if (result.topicIntros[0] !== 'Use these guides to understand what crystal form, production route and TiO₂ content can tell you—and what they cannot predict about finished-system performance.') errors.push(`Fundamentals intro mismatch: ${result.topicIntros[0]}`)
        if (result.topicIntros[1] !== 'Use these guides to interpret oil absorption, CBU and surface treatment without treating any single powder property as a prediction of finished-system performance.') errors.push(`Performance intro mismatch: ${result.topicIntros[1]}`)
        if (result.hubRelatedHeading !== 'Related Products and Applications') errors.push(`Hub related heading: ${result.hubRelatedHeading}`)
        if (viewport.name === 'mobile' && result.breadcrumbCurrentDisplay === 'none') errors.push('Hub mobile current-page breadcrumb was hidden')
      }

      if (item.key === 'evaluation') {
        if (result.articleNavLinkCount !== 6) errors.push(`Evaluation article-nav link count: ${result.articleNavLinkCount}`)
        if (result.articleNavBrokenTargetCount) errors.push(`Evaluation article-nav broken targets: ${result.articleNavBrokenTargetCount}`)
        if (result.stagedHeadingCount !== 0) errors.push('Duplicate staged-framework H2 remains')
        if (result.stageHeadingCount !== 1) errors.push(`Six-stage H2 count: ${result.stageHeadingCount}`)
        if (!result.stageIntro.includes('documented as an evidence path')) errors.push(`Stage evidence-path boundary missing: ${result.stageIntro}`)
        if (JSON.stringify(result.tocItems) !== JSON.stringify(evaluationToc)) errors.push(`Evaluation TOC mismatch: ${JSON.stringify(result.tocItems)}`)
        if (result.stageDesktopCount !== 6) errors.push(`Desktop stage count: ${result.stageDesktopCount}`)
        if (result.stageMobileCount !== 6) errors.push(`Mobile stage count: ${result.stageMobileCount}`)
        if (!result.stageFirstOpen) errors.push('First mobile stage is not open')
        if (result.scorecardCardCount !== 4) errors.push(`Scorecard application-card count: ${result.scorecardCardCount}`)
        if (result.scorecardRowHeaderCount !== 7) errors.push(`Scorecard row-header count: ${result.scorecardRowHeaderCount}`)
        if (result.evaluationMistakeSix !== 'Defining approval criteria only after seeing the candidate result, instead of setting them in advance against the intended end-use requirements.') errors.push(`Mistake 06 mismatch: ${result.evaluationMistakeSix}`)
        if (viewport.name === 'mobile' && result.stageMobileDisplay === 'none') errors.push('Mobile stage accordion is hidden')
        if (viewport.name === 'mobile' && result.stageDesktopDisplay !== 'none') errors.push('Desktop stages are visible on mobile')
        if (viewport.name === 'desktop' && result.stageMobileDisplay !== 'none') errors.push('Mobile stage accordion is visible on desktop')
        if (viewport.name === 'desktop' && result.stageDesktopDisplay === 'none') errors.push('Desktop stages are hidden on desktop')
        if (viewport.name === 'mobile' && result.scorecardMobileDisplay === 'none') errors.push('Mobile scorecard cards are hidden')
        if (viewport.name === 'mobile' && result.scorecardDesktopDisplay !== 'none') errors.push('Desktop scorecard is visible on mobile')
        if (viewport.name === 'desktop' && result.scorecardMobileDisplay !== 'none') errors.push('Mobile scorecard cards are visible on desktop')
        if (viewport.name === 'desktop' && result.scorecardDesktopDisplay === 'none') errors.push('Desktop scorecard is hidden on desktop')
        if (result.contextualLinkCount !== 4) errors.push(`Evaluation contextual-link count: ${result.contextualLinkCount}`)
        const expectedContextualLinks = ['Why TiO₂ Content Alone Does Not Determine Performance', 'titanium dioxide oil absorption', 'CBU', 'titanium dioxide surface treatment']
        if (JSON.stringify(result.contextualLinkTexts) !== JSON.stringify(expectedContextualLinks)) errors.push(`Evaluation contextual-link texts: ${JSON.stringify(result.contextualLinkTexts)}`)
        if (viewport.name === 'desktop') {
          const expectedWidths = [
            ['Section 01', result.evaluationBoxes.section1, 980, 1020],
            ['Decision chain', result.evaluationBoxes.decision, 1040, 1080],
            ['Six-stage framework', result.evaluationBoxes.stage, 1100, 1140],
            ['Section 03', result.evaluationBoxes.section3, 980, 1020],
            ['Scorecard', result.evaluationBoxes.scorecard, 1178, 1182],
            ['Section 05', result.evaluationBoxes.section5, 980, 1020],
            ['Section 06', result.evaluationBoxes.section6, 980, 1020],
          ]
          for (const [label, measured, min, max] of expectedWidths) {
            if (!measured || measured.width < min || measured.width > max) errors.push(`${label} width: ${measured?.width ?? 'missing'}`)
            if (!measured || Math.abs(measured.centerDelta) > 2) errors.push(`${label} center delta: ${measured?.centerDelta ?? 'missing'}`)
          }
        }
      }

      if (item.key === 'explainer') {
        if (result.articleNavLinkCount !== 6) errors.push(`Oil article-nav link count: ${result.articleNavLinkCount}`)
        if (result.articleNavBrokenTargetCount) errors.push(`Oil article-nav broken targets: ${result.articleNavBrokenTargetCount}`)
        if (result.keyConclusionCount !== 4) errors.push(`Oil key conclusion count: ${result.keyConclusionCount}`)
        if (result.oilApplicationDesignedCount !== 0) errors.push(`Oil application-designed wording count: ${result.oilApplicationDesignedCount}`)
        if (result.oilPvcToCpvcCount !== 0) errors.push(`Oil PVC-to-CPVC wording count: ${result.oilPvcToCpvcCount}`)
        if (result.oilSection2UlCount !== 1 || result.oilSection2LiCount !== 7) errors.push(`Oil section 2 list structure: ${result.oilSection2UlCount} lists / ${result.oilSection2LiCount} items`)
        if (result.oilSection6UlCount !== 1 || result.oilSection6LiCount !== 6) errors.push(`Oil section 6 list structure: ${result.oilSection6UlCount} lists / ${result.oilSection6LiCount} items`)
        if (result.oilSection5InterpretH3 !== 1 || result.oilInterpretH2 !== 0) errors.push(`Oil interpretation heading hierarchy: H3=${result.oilSection5InterpretH3}, H2=${result.oilInterpretH2}`)
        if (result.oilExampleCount !== 2) errors.push(`Oil example-card count: ${result.oilExampleCount}`)
        if (result.oilExampleMethodCount !== 2) errors.push(`Oil method/source statements: ${result.oilExampleMethodCount}`)
        if (result.oilExampleTableCount !== 0) errors.push(`Oil example tables: ${result.oilExampleTableCount}`)
        if (result.contentVerification !== 'required-before-production') errors.push(`Oil content-verification gate: ${result.contentVerification}`)
        if (!result.oilExampleValues[0]?.includes('TP-I100') || !result.oilExampleValues[0]?.includes('14 g/100 g')) errors.push(`TP-I100 evidence changed: ${result.oilExampleValues[0]}`)
        if (!result.oilExampleValues[1]?.includes('TP-C200') || !result.oilExampleValues[1]?.includes('36 g/100 g')) errors.push(`TP-C200 evidence changed: ${result.oilExampleValues[1]}`)
        if (!(result.oilH2Size > result.oilH3Size && result.oilH4Sizes.every((size) => result.oilH3Size > size))) errors.push(`Oil visual heading hierarchy: H2=${result.oilH2Size}, H3=${result.oilH3Size}, H4=${result.oilH4Sizes.join(',')}`)
        if (result.oilH3Size < 24 || result.oilH3Size > 28 || result.oilH4Sizes.some((size) => size < 18 || size > 21)) errors.push(`Oil heading scale: H3=${result.oilH3Size}, H4=${result.oilH4Sizes.join(',')}`)
        if (result.relatedProductCount !== 2 || result.relatedContextCount !== 3) errors.push(`Oil related semantic rows: ${result.relatedProductCount}+${result.relatedContextCount}`)
        if (result.oilNaturalComparisonCount < 1 || result.oilOldComparisonCount !== 0) errors.push(`Oil comparison phrasing: natural=${result.oilNaturalComparisonCount}, old=${result.oilOldComparisonCount}`)
        if (result.oilProveCpvcCount !== 0 || result.oilNaturalCpvcCount < 1) errors.push(`Oil CPVC phrasing: natural=${result.oilNaturalCpvcCount}, old=${result.oilProveCpvcCount}`)
        if (viewport.name === 'desktop') {
          if (result.oilBoxes.sections.length !== 6) errors.push(`Oil centered-section count: ${result.oilBoxes.sections.length}`)
          for (const [index, measured] of result.oilBoxes.sections.entries()) {
            if (measured.width < 980 || measured.width > 1020) errors.push(`Oil section ${index + 1} width: ${measured.width}`)
            if (Math.abs(measured.centerDelta) > 2) errors.push(`Oil section ${index + 1} center delta: ${measured.centerDelta}`)
          }
          if (!result.oilBoxes.examples || result.oilBoxes.examples.width < 1100 || result.oilBoxes.examples.width > 1140) errors.push(`Oil examples width: ${result.oilBoxes.examples?.width ?? 'missing'}`)
          if (!result.oilBoxes.examples || Math.abs(result.oilBoxes.examples.centerDelta) > 2) errors.push(`Oil examples center delta: ${result.oilBoxes.examples?.centerDelta ?? 'missing'}`)
        }
      }

      if (viewport.name === 'mobile' && result.visibleTableRegions.length) errors.push(`Mobile has visible table regions: ${JSON.stringify(result.visibleTableRegions)}`)
      if (result.overflow > 1) errors.push(`Horizontal overflow: ${result.overflow}px`)

      const output = path.join(review, `${item.slug}-${viewport.name}.png`)
      await page.screenshot({path: output, fullPage: true, animations: 'disabled'})
      if (item.key === 'evaluation' && viewport.name === 'desktop') {
        const detailShots = [
          ['01-overview.png', '.page.active .article-overview'],
          ['02-section-01.png', '.page.active #evaluation-section-1'],
          ['03-six-stage-framework.png', '.page.active #evaluation-section-2'],
          ['04-section-03.png', '.page.active #evaluation-section-3'],
          ['05-cross-application-scorecard.png', '.page.active #evaluation-section-4'],
          ['06-section-05.png', '.page.active #evaluation-section-5'],
          ['07-section-06.png', '.page.active #evaluation-section-6'],
        ]
        for (const [filename, selector] of detailShots) {
          await page.locator(selector).screenshot({path: path.join(evaluationDetails, filename), animations: 'disabled'})
        }
      }
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
