import {createHmac, randomUUID} from 'node:crypto'
import {afterEach, expect, it, vi} from 'vitest'

const cache = vi.hoisted(() => ({revalidateTag: vi.fn(), revalidatePath: vi.fn()}))
vi.mock('next/cache', () => cache)
import {POST} from '@/app/api/revalidate/route'

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

it('invalidates only the DOC-COO route and content identity', async () => {
  vi.stubEnv('SITE_ID', 'tio2-my')
  vi.stubEnv('REVALIDATION_SECRET', 'document-coo-test-secret')
  const body = JSON.stringify({
    eventId: randomUUID(), siteIds: ['tio2-my'], contentId: 1,
    paths: ['/documents/certificate-of-origin'], entityIds: [], modified: new Date().toISOString(),
  })
  const response = await POST(new Request('http://localhost/api/revalidate', {method: 'POST', body, headers: {
    'content-type': 'application/json',
    'x-tio2-signature': createHmac('sha256', 'document-coo-test-secret').update(body).digest('hex'),
  }}))
  expect(response.status).toBe(200)
  expect(cache.revalidateTag.mock.calls.map((call) => call[0])).toEqual([
    'content:tio2-my--document-coo',
    'route:tio2-my:/documents/certificate-of-origin',
  ])
  expect(cache.revalidatePath).toHaveBeenCalledWith('/documents/certificate-of-origin')
})
