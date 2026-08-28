import {expect, test} from '@playwright/test'

import {
  startOwnedNextDev,
  type OwnedNextDevRuntime,
} from './support/owned-next-dev'

test.use({trace: 'off'})

const previewPath = '/preview/release-look/products/tp-c120'
const expectedSections = [
  'hero',
  'snapshot',
  'selection-check',
  'performance-priorities',
  'recommended-applications',
  'product-evidence',
  'typical-properties',
  'validation-guide',
  'packaging-documents',
  'frequently-asked-questions',
  'related-applications-and-resources',
] as const

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing release-look test variable: ${name}`)
  return value
}

let runtime: OwnedNextDevRuntime | undefined

test.beforeAll(async ({}, testInfo) => {
  testInfo.setTimeout(180_000)
  runtime = await startOwnedNextDev({
    environment: {
      SITE_A_RELEASE_LOOK_PREVIEW: '1',
      SITE_ID: 'tio2-a',
      TASK12_APPLICATIONS_MANIFEST_PATH: requiredEnvironment(
        'TASK12_APPLICATIONS_MANIFEST_PATH',
      ),
      TASK12_PRODUCTS_MANIFEST_PATH: requiredEnvironment(
        'TASK12_PRODUCTS_MANIFEST_PATH',
      ),
      TASK12_RESOURCES_MANIFEST_PATH: requiredEnvironment(
        'TASK12_RESOURCES_MANIFEST_PATH',
      ),
    },
    runtimeId: 'product',
  })
})
test.afterAll(async ({}, testInfo) => {
  testInfo.setTimeout(30_000)
  await runtime?.stop()
})

test('shows the TP-C120 publication look without unapproved shared content', async ({page}) => {
  const runtimeUrl = runtime?.url(previewPath)
  if (!runtimeUrl) throw new Error('Release-look runtime did not start')

  for (const viewport of [
    {height: 1000, width: 1440},
    {height: 800, width: 360},
  ]) {
    await page.setViewportSize(viewport)
    const response = await page.goto(runtimeUrl, {waitUntil: 'networkidle'})

    expect(response?.status()).toBe(200)
    await expect(page.getByText('Local publication look — not published')).toBeVisible()
    await expect(page.getByRole('heading', {
      level: 1,
      name: 'TIOVAR TP-C120 Rutile Titanium Dioxide',
    })).toBeVisible()
    await expect(page).toHaveTitle('TP-C120 Premium TiO2 for Water-Based Emulsion Paint')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex,\s*nofollow/iu,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
    await expect(page.locator('[data-product-cta-placement]')).toHaveCount(0)
    await expect(page.locator('[data-product-section="enquiry-details"]')).toHaveCount(0)
    await expect(page.locator('[data-product-section="technical-disclaimer"]')).toHaveCount(0)
    await expect(page.getByText('Description', {exact: true})).toHaveCount(0)
    await expect(page.locator('[data-product-section="related-applications-and-resources"] a')).toHaveCount(0)

    expect(
      await page.locator('section[data-product-section]').evaluateAll((sections) =>
        sections.map((section) => section.getAttribute('data-product-section')),
      ),
    ).toEqual(expectedSections)

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  }
})
