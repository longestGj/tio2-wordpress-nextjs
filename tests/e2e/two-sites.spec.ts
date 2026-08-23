import {spawnSync} from 'node:child_process'
import {createHmac, randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {expect, test, type Page} from '@playwright/test'

const sites = [
  {
    id: 'tio2-a',
    baseUrl: 'http://localhost:3001',
    domain: 'https://tio2-a.example.com',
    name: 'TiO2 A',
    oppositeDomain: 'https://tio2-b.example.com',
    oppositeName: 'TiO2 B',
  },
  {
    id: 'tio2-b',
    baseUrl: 'http://localhost:3002',
    domain: 'https://tio2-b.example.com',
    name: 'TiO2 B',
    oppositeDomain: 'https://tio2-a.example.com',
    oppositeName: 'TiO2 A',
  },
] as const

const longTailPath = '/test-content/long-tail-500'
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
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`)
  })
  return errors
}

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
): Promise<void> {
  const script = page.locator('script[type="application/ld+json"]')
  await expect(script).toHaveCount(1)
  const source = await script.textContent()
  expect(source).not.toBeNull()
  expect(source).toContain(domain)
  expect(source).not.toContain(oppositeDomain)

  const objects = JSON.parse(source as string) as Array<Record<string, unknown>>
  expect(objects.map((value) => value['@type'])).toEqual([
    'Organization',
    'WebSite',
    'BreadcrumbList',
    'WebPage',
  ])
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
      site.id === 'tio2-a' ? 'Site A Synthetic Test Home' : 'Site B Synthetic Test Home',
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
    await assertCurrentSiteJsonLd(page, site.domain, site.oppositeDomain)
    expect(errors).toEqual([])
  })

  test(`${site.id} renders the same long-tail path with only its own content`, async ({
    page,
  }) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(`${site.baseUrl}${longTailPath}`, {
      waitUntil: 'networkidle',
    })

    expect(response?.status()).toBe(200)
    await expect(page.locator(`main[data-site-id="${site.id}"]`)).toBeVisible()
    await expect(page.getByRole('heading', {level: 1})).toHaveText(
      `${site.id} Synthetic Test Long-tail Page 500`,
    )
    await expect(page.locator('article')).toContainText(
      `Deterministic local scale fixture 500 for ${site.id}`,
    )
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    await expect(page.locator('body')).not.toContainText(
      `fixture 500 for ${site.id === 'tio2-a' ? 'tio2-b' : 'tio2-a'}`,
    )
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${site.domain}${longTailPath}`,
    )
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    )
    await assertCurrentSiteJsonLd(page, site.domain, site.oppositeDomain)
    expect(errors).toEqual([])
  })

  test(`${site.id} owns its robots and all 505 sitemap URLs`, async ({request}) => {
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
    expect(urls).toHaveLength(505)
    expect(new Set(urls).size).toBe(505)
    expect(urls).toContain(`${site.domain}/`)
    expect(urls).toContain(`${site.domain}${longTailPath}`)
    expect(urls.every((url) => url.startsWith(`${site.domain}/`))).toBe(true)
    expect(sitemapText).not.toContain(site.oppositeDomain)
  })

  test(`${site.id} returns a real 404 without cross-site leakage`, async ({page}) => {
    const errors = capturePageErrors(page)
    const response = await page.goto(`${site.baseUrl}/missing-local-acceptance-page`)

    expect(response?.status()).toBe(404)
    await expect(page.locator('body')).not.toContainText(site.oppositeName)
    expect(
      errors.filter(
        (error) =>
          error !==
          'console: Failed to load resource: the server responded with a status of 404 (Not Found)',
      ),
    ).toEqual([])
  })

  test(`${site.id} preview rejects bad boundaries and accepts its own path`, async ({
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

    const valid = await request.get(
      signedPreviewUrl(site, '/products'),
      {maxRedirects: 0},
    )
    expect(valid.status()).toBe(307)
    expect(valid.headers().location).toBe('/products')
    expect(valid.headers()['set-cookie']).toContain('tio2_preview_scope=')
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
        `route:${site.id}:/products`,
        `site:${site.id}`,
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

test('WordPress page edit reaches only its owning Next endpoint and is restored', async ({
  request,
}) => {
  const siteA = sites[0]
  const siteB = sites[1]
  const fixture = JSON.parse(
    wpEval(
      `$ids=get_posts(['post_type'=>'page','post_status'=>'publish','posts_per_page'=>1,'fields'=>'ids','meta_key'=>'public_path','meta_value'=>'/products','tax_query'=>[['taxonomy'=>'site_scope','field'=>'slug','terms'=>['tio2-a']]]]); if(empty($ids)){WP_CLI::error('Missing Site A products page');} echo wp_json_encode(['id'=>(int)$ids[0],'title'=>get_the_title((int)$ids[0])]);`,
    ),
  ) as {id: number; title: string}
  const changedTitle = `Site A webhook delivery ${process.pid}`
  const logDirectory = resolve('.tmp/local-sites')
  const aLogPath = resolve(logDirectory, 'tio2-a.stdout.log')
  const bLogPath = resolve(logDirectory, 'tio2-b.stdout.log')
  const aBefore = readFileSync(aLogPath, 'utf8').length
  const bBefore = readFileSync(bLogPath, 'utf8').length
  const saveThroughAdminContract = (title: string) => {
    const encodedTitle = Buffer.from(title, 'utf8').toString('base64')
    wpEval(
      `$result=wp_update_post(['ID'=>${fixture.id},'post_title'=>base64_decode('${encodedTitle}')],true); if(is_wp_error($result)){WP_CLI::error($result->get_error_message());} do_action('acf/save_post',${fixture.id});`,
    )
  }

  try {
    saveThroughAdminContract(changedTitle)

    await expect
      .poll(
        async () => (await request.get(`${siteA.baseUrl}/products`)).text(),
        {timeout: 15_000},
      )
      .toContain(changedTitle)
    expect(await (await request.get(`${siteB.baseUrl}/products`)).text()).not.toContain(
      changedTitle,
    )

    const aDeliveryLog = readFileSync(aLogPath, 'utf8').slice(aBefore)
    const bDeliveryLog = readFileSync(bLogPath, 'utf8').slice(bBefore)
    expect(aDeliveryLog).toContain('[tio2-revalidation]')
    expect(bDeliveryLog).not.toContain('[tio2-revalidation]')
  } finally {
    saveThroughAdminContract(fixture.title)
    await expect
      .poll(
        async () => (await request.get(`${siteA.baseUrl}/products`)).text(),
        {timeout: 15_000},
      )
      .toContain(fixture.title)
  }
})
