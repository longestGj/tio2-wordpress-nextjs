import {spawnSync} from 'node:child_process'
import {createHmac, randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, type Page} from '@playwright/test'

const sites = [
  {
    id: 'tio2-a',
    baseUrl: 'http://localhost:3001',
    domain: 'https://tio2products.com',
    name: 'TiO2 A',
    oppositeDomain: 'https://tio2hub.com',
    oppositeName: 'TiO2 B',
  },
  {
    id: 'tio2-b',
    baseUrl: 'http://localhost:3002',
    domain: 'https://tio2hub.com',
    name: 'TiO2 B',
    oppositeDomain: 'https://tio2products.com',
    oppositeName: 'TiO2 A',
  },
] as const

const longTailPath = '/test-content/long-tail-500'
const chromiumResource404Error =
  'console: Failed to load resource: the server responded with a status of 404 (Not Found)'
const rootOnlySnapshotPath = process.env.TIO2_ROOT_ONLY_SNAPSHOT_PATH
const requireRootOnlySnapshot = process.env.TIO2_REQUIRE_ROOT_ONLY_SNAPSHOT === '1'
const wordpressEnvPath = resolve('wordpress/.env')
const wordpressEnv = Object.fromEntries(
  readFileSync(wordpressEnvPath, 'utf8')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=')
      return [line.slice(0, separator), line.slice(separator + 1)]
    }),
)

function siteSecret(
  siteId: 'tio2-a' | 'tio2-b',
  kind: 'PREVIEW' | 'REVALIDATION',
): string {
  const suffix = siteId.toUpperCase().replace('-', '_')
  const secret = wordpressEnv[`NEXTJS_${kind}_SECRET_${suffix}`]
  if (!secret) throw new Error(`Missing local ${kind} secret for ${siteId}`)
  return secret
}

function signedPreviewUrl(
  site: (typeof sites)[number],
  path: string,
  siteId: string = site.id,
): string {
  const expires = Math.floor(Date.now() / 1000) + 300
  const signature = createHmac('sha256', siteSecret(site.id, 'PREVIEW'))
    .update(`${expires}\n${siteId}\n${path}`)
    .digest('hex')
  const url = new URL('/api/preview', site.baseUrl)
  url.search = new URLSearchParams({
    siteId,
    path,
    expires: String(expires),
    signature,
  }).toString()
  return url.href
}

function capturePageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const locationUrl = message.location().url
      errors.push(
        locationUrl
          ? `console: ${message.text()} (${locationUrl})`
          : `console: ${message.text()}`,
      )
    }
  })
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`)
  })
  return errors
}

function withoutExpectedDocument404s(
  errors: string[],
  expectedDocumentUrls: readonly string[],
): string[] {
  const remainingExpectedCounts = new Map<string, number>()
  for (const url of expectedDocumentUrls) {
    const expectedError = `${chromiumResource404Error} (${url})`
    remainingExpectedCounts.set(
      expectedError,
      (remainingExpectedCounts.get(expectedError) ?? 0) + 1,
    )
  }

  return errors.filter((error) => {
    const remaining = remainingExpectedCounts.get(error) ?? 0
    if (remaining === 0) return true
    if (remaining === 1) remainingExpectedCounts.delete(error)
    else remainingExpectedCounts.set(error, remaining - 1)
    return false
  })
}

test('404 console filtering keeps identical errors from another resource URL', async ({
  page,
}) => {
  const site = sites[0]
  const documentUrl = `${site.baseUrl}/missing-console-filter-regression`
  const resourceUrl = `${site.baseUrl}/unexpected-console-resource-${randomUUID()}.js`
  const errors = capturePageErrors(page)

  const response = await page.goto(documentUrl, {waitUntil: 'networkidle'})
  expect(response?.status()).toBe(404)
  await page.evaluate(
    (url) =>
      new Promise<void>((resolve) => {
        const script = document.createElement('script')
        script.src = url
        script.addEventListener('load', () => resolve(), {once: true})
        script.addEventListener('error', () => resolve(), {once: true})
        document.body.append(script)
      }),
    resourceUrl,
  )
  await expect.poll(() => errors.length).toBeGreaterThanOrEqual(2)

  expect(withoutExpectedDocument404s(errors, [documentUrl])).toEqual([
    `${chromiumResource404Error} (${resourceUrl})`,
    `requestfailed: ${resourceUrl} (net::ERR_ABORTED)`,
  ])
})

function wp(arguments_: string[]): string {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      wordpressEnvPath,
      '-f',
      resolve('wordpress/docker-compose.yml'),
      'run',
      '--rm',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      ...arguments_,
    ],
    {encoding: 'utf8'},
  )
  if (result.status !== 0) {
    throw new Error(`WP-CLI failed: ${result.stdout}\n${result.stderr}`)
  }
  return result.stdout.trim()
}

function wpEval(source: string): string {
  return wp(['eval', source]).split(/\r?\n/u).at(-1)?.trim() ?? ''
}

async function assertCurrentSiteJsonLd(
  page: Page,
  domain: string,
  oppositeDomain: string,
  expectedTypes: readonly string[],
): Promise<void> {
  const script = page.locator('script[type="application/ld+json"]')
  await expect(script).toHaveCount(1)
  const source = await script.textContent()
  expect(source).not.toBeNull()
  expect(source).toContain(domain)
  expect(source).not.toContain(oppositeDomain)

  const objects = JSON.parse(source as string) as Array<Record<string, unknown>>
  expect(objects.map((value) => value['@type'])).toEqual(expectedTypes)
  expect(JSON.stringify(objects)).not.toContain('localhost:')
}

test.beforeEach(async ({page}) => {
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url())
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      throw new Error(`Unexpected remote browser request: ${url.href}`)
    }
    await route.continue()
  })
})

for (const site of sites) {
  test(`${site.id} homepage is isolated and non-indexable`, async ({page}) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(site.baseUrl, {waitUntil: 'networkidle'})

    expect(response?.status()).toBe(200)
    await expect(page.locator(`main[data-site-id="${site.id}"]`)).toBeVisible()
    await expect(page.getByRole('heading', {level: 1})).toContainText(
      site.id === 'tio2-a'
        ? 'Titanium Dioxide Supply for Formulators and Distributors'
        : 'Independent TiO2 Discovery for Site B Buyers',
    )
    await expect(page.locator('body')).toContainText(site.name)
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      site.domain,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await assertCurrentSiteJsonLd(page, site.domain, site.oppositeDomain, [
      'Organization',
      'WebSite',
      'WebPage',
      'FAQPage',
    ])
    expect(errors).toEqual([])
  })

  test(`${site.id} returns anonymous retired core and long-tail routes as real 404s`, async ({
    page,
  }) => {
    const errors = capturePageErrors(page)
    for (const retiredPath of [
      '/products',
      '/applications/coatings',
      longTailPath,
    ]) {
      const response = await page.goto(`${site.baseUrl}${retiredPath}`, {
        waitUntil: 'networkidle',
      })
      expect(response?.status(), retiredPath).toBe(404)
      await expect(page.locator('body')).not.toContainText(site.oppositeName)
      await expect(page.locator('article')).toHaveCount(0)
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0)
    }
    expect(
      withoutExpectedDocument404s(
        errors,
        [
          '/products',
          '/applications/coatings',
          longTailPath,
        ].map((path) => `${site.baseUrl}${path}`),
      ),
    ).toEqual([])
  })

  test(`${site.id} owns its robots and one root-only sitemap URL`, async ({request}) => {
    const robots = await request.get(`${site.baseUrl}/robots.txt`)
    expect(robots.status()).toBe(200)
    const robotsText = await robots.text()
    expect(robotsText).toContain('User-Agent: *')
    expect(robotsText).toContain('Disallow: /')
    expect(robotsText).toContain(`Host: ${site.domain}`)
    expect(robotsText).toContain(`Sitemap: ${site.domain}/sitemap.xml`)
    expect(robotsText).not.toContain(site.oppositeDomain)

    const sitemap = await request.get(`${site.baseUrl}/sitemap.xml`)
    expect(sitemap.status()).toBe(200)
    const sitemapText = await sitemap.text()
    const urls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/gu)].map(
      ([, url]) => url,
    )
    expect(urls).toEqual([`${site.domain}/`])
    expect(new Set(urls).size).toBe(1)
    expect(sitemapText).not.toContain(site.oppositeDomain)
  })

  test(`${site.id} returns a real 404 without cross-site leakage`, async ({page}) => {
    const errors = capturePageErrors(page)
    const missingUrl = `${site.baseUrl}/missing-local-acceptance-page`
    const expectedDocument404Urls = [missingUrl]
    const response = await page.goto(missingUrl)

    expect(response?.status()).toBe(404)
    await expect(page.locator('body')).not.toContainText(site.oppositeName)

    for (const invalidPath of [
      '/Products',
      '/under_score',
      '/钛白粉',
      `/${'a'.repeat(173)}`,
    ]) {
      const invalidUrl = new URL(invalidPath, site.baseUrl).href
      expectedDocument404Urls.push(invalidUrl)
      const invalidResponse = await page.goto(invalidUrl)
      expect(invalidResponse?.status(), invalidPath).toBe(404)
    }
    expect(
      withoutExpectedDocument404s(errors, expectedDocument404Urls),
    ).toEqual([])
  })

  test(`${site.id} preview rejects bad boundaries`, async ({
    request,
  }) => {
    const invalidSignatureUrl = new URL(signedPreviewUrl(site, '/products'))
    invalidSignatureUrl.searchParams.set('signature', '0'.repeat(64))
    const invalidSignature = await request.get(invalidSignatureUrl.href, {
      maxRedirects: 0,
    })
    expect(invalidSignature.status()).toBe(401)

    const otherSite = site.id === 'tio2-a' ? 'tio2-b' : 'tio2-a'
    const invalidSite = await request.get(
      signedPreviewUrl(site, '/products', otherSite),
      {maxRedirects: 0},
    )
    expect(invalidSite.status()).toBe(400)

    const unsafePath = await request.get(
      signedPreviewUrl(site, 'https://attacker.test'),
      {maxRedirects: 0},
    )
    expect(unsafePath.status()).toBe(400)

  })

  test(`${site.id} revalidation validates signatures and deduplicates events`, async ({
    request,
  }) => {
    const payload = {
      eventId: randomUUID(),
      siteIds: [site.id],
      contentId: 42,
      paths: ['/products'],
      entityIds: [],
      modified: new Date().toISOString(),
    }
    const body = JSON.stringify(payload)
    const signature = createHmac('sha256', siteSecret(site.id, 'REVALIDATION'))
      .update(body)
      .digest('hex')

    const bad = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': '0'.repeat(64),
      },
    })
    expect(bad.status()).toBe(401)

    const valid = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': signature,
      },
    })
    expect(valid.status()).toBe(200)
    expect(await valid.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [
        `content-list:${site.id}`,
        `route:${site.id}:/products`,
        `site:${site.id}`,
        `sitemap:${site.id}`,
      ],
      revalidatedPaths: ['/products'],
    })

    const duplicate = await request.post(`${site.baseUrl}/api/revalidate`, {
      data: body,
      headers: {
        'content-type': 'application/json',
        'x-tio2-signature': signature,
      },
    })
    expect(duplicate.status()).toBe(200)
    expect(await duplicate.json()).toEqual({
      ok: true,
      eventId: payload.eventId,
      revalidatedTags: [],
      revalidatedPaths: [],
    })
  })
}

test('every captured LegacyBaseline path is anonymously closed from the verified snapshot', async ({
  request,
}) => {
  if (!rootOnlySnapshotPath) {
    expect(requireRootOnlySnapshot, 'verify:root-only must provide its verified migration snapshot').toBe(false)
    return
  }

  const snapshot = JSON.parse(readFileSync(rootOnlySnapshotPath, 'utf8')) as {
    schemaVersion: string
    inventoryVersion: string
    sourceState: string
    records: Array<{
      kind: string
      siteScope?: string
      publicPath: string | null
      previousStatus: string
      targetStatus: string
    }>
  }
  expect(snapshot).toMatchObject({
    schemaVersion: 'root-only-retirement-v0.1',
    inventoryVersion: 'root-only-v0.1',
    sourceState: 'legacy',
  })
  const pages = snapshot.records.filter(({kind}) => kind === 'page-route')
  expect(pages).toHaveLength(1008)
  expect(new Set(pages.map(({siteScope, publicPath}) => `${siteScope}:${publicPath}`)).size)
    .toBe(1008)

  for (const site of sites) {
    const paths = pages
      .filter(({siteScope}) => siteScope === site.id)
      .map(({publicPath, previousStatus, targetStatus}) => {
        expect(previousStatus).toBe('publish')
        expect(targetStatus).toBe('draft')
        expect(publicPath).toMatch(/^\/[a-z0-9]/u)
        return publicPath as string
      })
    expect(paths).toHaveLength(504)

    for (let index = 0; index < paths.length; index += 24) {
      const batch = paths.slice(index, index + 24)
      const responses = await Promise.all(
        batch.map(async (path) => {
          const response = await request.get(`${site.baseUrl}${path}`)
          return {path, status: response.status(), body: await response.text()}
        }),
      )
      for (const response of responses) {
        expect(response.status, `${site.id}:${response.path}`).toBe(404)
        expect(response.body).not.toContain('<article')
        expect(response.body).not.toContain('application/ld+json')
      }
    }
  }
})

test('signed Site A preview renders a live unpublished draft and remains isolated', async ({
  page,
  request,
}) => {
  const siteA = sites[0]
  const siteB = sites[1]
  const path = `/preview-live-${process.pid}`
  const guessedPath = `/preview-guess-${process.pid}`
  const title = `Live unpublished preview ${process.pid}`
  const postId = wpEval(
    `$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'${title}','post_content'=>'<p>Live unpublished preview body ${process.pid}</p>'],true); if(is_wp_error($id)){WP_CLI::error($id->get_error_message());} update_post_meta($id,'public_path','${path}'); update_post_meta($id,'seo_title','${title} SEO'); wp_set_object_terms($id,['tio2-a'],'site_scope',false); do_action('acf/save_post',$id); echo $id;`,
  )
  const guessedPostId = wpEval(
    `$id=wp_insert_post(['post_type'=>'page','post_status'=>'draft','post_title'=>'Guessable unpublished preview ${process.pid}','post_content'=>'<p>This guessed draft must stay private ${process.pid}</p>'],true); if(is_wp_error($id)){WP_CLI::error($id->get_error_message());} update_post_meta($id,'public_path','${guessedPath}'); wp_set_object_terms($id,['tio2-a'],'site_scope',false); do_action('acf/save_post',$id); echo $id;`,
  )

  try {
    const response = await page.goto(signedPreviewUrl(siteA, path), {
      waitUntil: 'networkidle',
    })
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', {level: 1})).toHaveText(title)
    await expect(page.locator('article')).toContainText(
      `Live unpublished preview body ${process.pid}`,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )

    const guessedDraft = await page.goto(`${siteA.baseUrl}${guessedPath}`, {
      waitUntil: 'networkidle',
    })
    expect(guessedDraft?.status()).toBe(404)
    await expect(page.locator('body')).not.toContainText(
      `This guessed draft must stay private ${process.pid}`,
    )

    const crossSite = await request.get(signedPreviewUrl(siteB, path), {
      maxRedirects: 0,
    })
    expect(crossSite.status()).toBe(404)
  } finally {
    wp(['post', 'delete', postId, '--force'])
    wp(['post', 'delete', guessedPostId, '--force'])
  }
})

test('retained draft edit remains anonymous without public revalidation', async ({request}) => {
  const siteA = sites[0]
  const siteB = sites[1]
  const fixture = JSON.parse(
    wpEval(
      `$ids=get_posts(['post_type'=>'page','post_status'=>'draft','posts_per_page'=>1,'fields'=>'ids','meta_key'=>'public_path','meta_value'=>'/products','tax_query'=>[['taxonomy'=>'site_scope','field'=>'slug','terms'=>['tio2-a']]]]); if(empty($ids)){WP_CLI::error('Missing retained Site A products draft');} echo wp_json_encode(['id'=>(int)$ids[0],'title'=>get_the_title((int)$ids[0])]);`,
    ),
  ) as {id: number; title: string}
  const changedTitle = `Site A webhook delivery ${process.pid}`
  const logDirectory = resolve('.tmp/local-sites')
  const aLogPath = resolve(logDirectory, 'tio2-a.stdout.log')
  const bLogPath = resolve(logDirectory, 'tio2-b.stdout.log')
  const aBefore = readFileSync(aLogPath, 'utf8').length
  const bBefore = readFileSync(bLogPath, 'utf8').length
  const saveThroughAdminContract = (title: string): number => {
    const encodedTitle = Buffer.from(title, 'utf8').toString('base64')
    return Number.parseInt(
      wpEval(
        `$result=wp_update_post(['ID'=>${fixture.id},'post_title'=>base64_decode('${encodedTitle}')],true); if(is_wp_error($result)){WP_CLI::error($result->get_error_message());} do_action('acf/save_post',${fixture.id}); echo count($GLOBALS['tio2_webhook_queue'] ?? []);`,
      ),
      10,
    )
  }

  try {
    expect(saveThroughAdminContract(changedTitle)).toBe(0)
    expect((await request.get(`${siteA.baseUrl}/products`)).status()).toBe(404)
    expect((await request.get(`${siteB.baseUrl}/products`)).status()).toBe(404)

    const aDeliveryLog = readFileSync(aLogPath, 'utf8').slice(aBefore)
    const bDeliveryLog = readFileSync(bLogPath, 'utf8').slice(bBefore)
    expect(aDeliveryLog).not.toContain('[tio2-revalidation]')
    expect(bDeliveryLog).not.toContain('[tio2-revalidation]')
  } finally {
    saveThroughAdminContract(fixture.title)
  }
})
