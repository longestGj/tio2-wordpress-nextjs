import {mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {resolve, sep} from 'node:path'
import {setTimeout as delay} from 'node:timers/promises'
import {chromium} from '@playwright/test'
import {launch} from 'chrome-launcher'
import lighthouse from 'lighthouse'

const PERFORMANCE_MINIMUM = 0.9
const ACCESSIBILITY_MINIMUM = 1
const reportDirectory = resolve('.tmp/homepage-evidence/lighthouse')
const sites = [
  {siteId: 'tio2-a', url: 'http://localhost:3001/'},
  {siteId: 'tio2-b', url: 'http://localhost:3002/'},
]

const modeArgument = process.argv.find((argument) => argument.startsWith('--mode='))
const mode = modeArgument?.slice('--mode='.length)
if (mode !== 'a11y' && mode !== 'performance') {
  throw new Error('Use --mode=a11y or --mode=performance')
}

function reportPath(siteId) {
  return resolve(reportDirectory, `${siteId}.json`)
}

async function removeChromeProfile(profileDirectory) {
  if (!profileDirectory.startsWith(`${reportDirectory}${sep}`)) {
    throw new Error(`Refusing to remove Chrome profile outside ${reportDirectory}`)
  }
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      rmSync(profileDirectory, {
        recursive: true,
        force: true,
        maxRetries: 2,
        retryDelay: 100,
      })
      return
    } catch (error) {
      if (
        attempt === 9 ||
        !error ||
        typeof error !== 'object' ||
        !['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error.code)
      ) {
        throw error
      }
      await delay(250)
    }
  }
}

function assertLocalNetwork(lhr, site) {
  if (lhr.finalUrl !== site.url || lhr.finalDisplayedUrl !== site.url) {
    throw new Error(
      `${site.siteId} Lighthouse navigated outside its local root: ${lhr.finalUrl}`,
    )
  }
  const requests = lhr.audits['network-requests']?.details?.items ?? []
  const remoteUrls = requests
    .map((item) => item.url)
    .filter((url) => typeof url === 'string' && /^https?:/u.test(url))
    .filter((url) => {
      const hostname = new URL(url).hostname
      return hostname !== 'localhost' && hostname !== '127.0.0.1'
    })
  if (remoteUrls.length > 0) {
    throw new Error(
      `${site.siteId} Lighthouse observed remote requests: ${remoteUrls.join(', ')}`,
    )
  }
}

function readAndAssertReports(assertionMode) {
  const summaries = sites.map((site) => {
    const lhr = JSON.parse(readFileSync(reportPath(site.siteId), 'utf8'))
    assertLocalNetwork(lhr, site)
    const performance = lhr.categories.performance?.score
    const accessibility = lhr.categories.accessibility?.score
    if (assertionMode === 'a11y' && accessibility !== ACCESSIBILITY_MINIMUM) {
      throw new Error(
        `${site.siteId} Lighthouse Accessibility is ${accessibility}; required ${ACCESSIBILITY_MINIMUM}`,
      )
    }
    if (
      assertionMode === 'performance' &&
      (typeof performance !== 'number' || performance < PERFORMANCE_MINIMUM)
    ) {
      throw new Error(
        `${site.siteId} Lighthouse Performance is ${performance}; required ${PERFORMANCE_MINIMUM}`,
      )
    }
    return {siteId: site.siteId, performance, accessibility}
  })
  process.stdout.write(
    `${JSON.stringify({
      status: 'passed',
      mode: assertionMode,
      performanceMinimum: PERFORMANCE_MINIMUM,
      accessibilityMinimum: ACCESSIBILITY_MINIMUM,
      sites: summaries,
    })}\n`,
  )
}

if (mode === 'a11y') {
  mkdirSync(reportDirectory, {recursive: true})
  const chromeProfileDirectory = resolve(
    reportDirectory,
    `chrome-profile-${process.pid}`,
  )
  await removeChromeProfile(chromeProfileDirectory)
  mkdirSync(chromeProfileDirectory, {recursive: false})
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    userDataDir: chromeProfileDirectory,
    chromeFlags: [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-extensions',
      '--disable-field-trial-config',
      '--disable-features=MediaRouter,OptimizationHints,Translate',
      '--no-default-browser-check',
      '--no-first-run',
      '--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE localhost, EXCLUDE 127.0.0.1',
    ],
  })
  try {
    for (const site of sites) {
      const result = await lighthouse(site.url, {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility'],
        formFactor: 'mobile',
        maxWaitForLoad: 45_000,
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 640,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttlingMethod: 'simulate',
      })
      if (!result) throw new Error(`Lighthouse returned no result for ${site.siteId}`)
      writeFileSync(reportPath(site.siteId), JSON.stringify(result.lhr), 'utf8')
    }
  } finally {
    chrome.kill()
    await delay(250)
    await removeChromeProfile(chromeProfileDirectory)
  }
}

readAndAssertReports(mode)
