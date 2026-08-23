// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import type {HomepageRfqDto} from '@/lib/wordpress/homepage-types'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function rfqFixture(): HomepageRfqDto {
  return toHomepageDto(makeHomepageNode(), 'tio2-a').rfq
}

async function completeRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  rfq: HomepageRfqDto,
) {
  await user.type(screen.getByLabelText(rfq.labels.name), 'Taylor Buyer')
  await user.type(screen.getByLabelText(rfq.labels.company), 'Mineral Works')
  await user.type(screen.getByLabelText(rfq.labels.countryRegion), 'Canada')
  await user.type(screen.getByLabelText(rfq.labels.workEmail), 'buyer@example.com')
  await user.selectOptions(
    screen.getByLabelText(rfq.labels.buyerType),
    'distributor',
  )
  await user.type(screen.getByLabelText(rfq.labels.interest), 'Coatings')
  await user.type(screen.getByLabelText(rfq.labels.message), 'Local review only.')
  await user.click(screen.getByLabelText(rfq.labels.privacy))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RFQ local-only side-effect boundary', () => {
  it('performs invalid and valid submissions without network, cookies, or browser storage', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(
      new Error('RFQ must not fetch'),
    )
    const cookieSpy = vi.spyOn(document, 'cookie', 'set')
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const sessionStorageSpy = vi.spyOn(Storage.prototype, 'setItem')
    const {RfqForm} = await import('@/components/homepage/rfq-form')
    const rfq = rfqFixture()
    const user = userEvent.setup()
    const {container} = render(<RfqForm rfq={rfq} />)
    const form = container.querySelector('form')

    expect(form?.getAttribute('action')).toBeNull()
    await user.click(screen.getByRole('button', {name: rfq.submitLabel}))
    expect(screen.getByRole('alert')).toBeTruthy()

    await completeRequiredFields(user, rfq)
    await user.click(screen.getByRole('button', {name: rfq.submitLabel}))
    expect(screen.getByRole('status').textContent).toContain(rfq.success.message)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(cookieSpy).not.toHaveBeenCalled()
    expect(localStorageSpy).not.toHaveBeenCalled()
    expect(sessionStorageSpy).not.toHaveBeenCalled()
  })
})
