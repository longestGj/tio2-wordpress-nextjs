import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  MalaysiaCookieSettingsHost,
  MalaysiaCookieSettingsTrigger,
  createDeniedGoogleConsent,
  transitionConsent,
} from '@/components/sites/tio2-my/consent/malaysia-cookie-settings'
import {
  CONSENT_KEY,
  LEGACY_CONSENT_KEY,
  readMalaysiaConsentChoice,
  removeMalaysiaAnalyticsCookies,
} from '@/lib/consent/malaysia-consent'
import * as consentCopy from '@/lib/consent/malaysia-consent-copy'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

afterEach(() => {cleanup(); localStorage.clear(); delete window.__TIO2_SHARED_CONSENT__; delete window.dataLayer; vi.restoreAllMocks()})

describe('SHARED-CONSENT-TIO2-MY', () => {
  it('activates the exact GA4 first-layer copy only with both runtime identifiers', () => {
    const active = consentCopy.getMalaysiaConsentCopy({
      NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: 'GTM-ABC1234',
      NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'G-1A2B3C4D5E',
    }, true)
    expect(active).toMatchObject({
      analyticsActive: true,
      title: 'Analytics preferences',
      body: 'Optional Analytics helps us understand aggregate website use and performance. If you choose Necessary only, Analytics storage remains off, but limited cookieless measurement signals may still be sent to Google.',
      necessary: 'Necessary only',
    })
    expect(consentCopy.getMalaysiaConsentCopy({}).analyticsActive).toBe(false)
    expect(consentCopy.getMalaysiaConsentCopy({
      NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: 'GTM-ABC1234',
      NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'G-1A2B3C4D5E',
    }).analyticsActive).toBe(false)
  })

  it('defaults every Google signal to denied and never grants advertising states', () => {
    expect(createDeniedGoogleConsent()).toEqual(approved.consent.googleDefaults)
    expect(transitionConsent('analytics_accepted').analytics_storage).toBe('granted')
    expect(transitionConsent('analytics_accepted')).toMatchObject({
      ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    })
    expect(transitionConsent('necessary_only')).toEqual(approved.consent.googleDefaults)
  })

  it('keeps the inactive dialog necessary-only and restores focus', async () => {
    render(<><MalaysiaCookieSettingsTrigger>Cookie Settings</MalaysiaCookieSettingsTrigger><MalaysiaCookieSettingsHost /></>)
    const trigger = screen.getByRole('button', {name: 'Cookie Settings'})
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', {name: 'Cookie settings'})
    expect(dialog).toBeTruthy()
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(document.documentElement.style.overflow).toBe('hidden')
    const descriptionId = dialog.getAttribute('aria-describedby')
    expect(descriptionId).toBe('cookie-settings-description')
    expect(document.getElementById(descriptionId!)?.textContent).toBe(approved.consent.body)
    expect(within(dialog).getByRole('status').textContent).toBe('Necessary only; Analytics unavailable')
    expect(within(dialog).queryByRole('checkbox')).toBeNull()
    expect(within(dialog).queryByRole('button', {name: 'Accept analytics'})).toBeNull()
    expect(within(dialog).queryByRole('button', {name: 'Save preferences'})).toBeNull()
    expect(within(dialog).queryByRole('button', {name: 'Reject / withdraw analytics'})).toBeNull()
    const close = within(dialog).getByRole('button', {name: 'Close'})
    const policy = within(dialog).getByRole('link', {name: 'Read Cookie Policy'})
    expect(document.activeElement).toBe(close)
    policy.focus()
    fireEvent.keyDown(document, {key: 'Tab'})
    expect(document.activeElement).toBe(close)
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true})
    expect(document.activeElement).toBe(policy)
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('normalizes a stale accepted choice to denied during inactive initialization and panel open', async () => {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({version: 1, choice: 'analytics_accepted', decidedAt: 1}))
    render(<><MalaysiaCookieSettingsTrigger>Cookie Settings</MalaysiaCookieSettingsTrigger><MalaysiaCookieSettingsHost /></>)

    await waitFor(() => expect(window.__TIO2_SHARED_CONSENT__).toEqual({siteScope: 'tio2-my', analytics: 'denied'}))
    expect(readMalaysiaConsentChoice()).toBe('necessary_only')
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!)).toMatchObject({version: 1, choice: 'necessary_only'})
    expect(Array.from(window.dataLayer![0] as unknown as ArrayLike<unknown>)).toEqual([
      'consent', 'default', approved.consent.googleDefaults,
    ])
    expect(window.dataLayer?.some((entry) => (
      Array.from(entry as unknown as ArrayLike<unknown>)[2] as {analytics_storage?: string} | undefined
    )?.analytics_storage === 'granted')).toBe(false)

    fireEvent.click(screen.getByRole('button', {name: 'Cookie Settings'}))
    expect(screen.getByRole('status').textContent).toBe('Necessary only; Analytics unavailable')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('fails closed when another tab writes an accepted choice while analytics is inactive', async () => {
    render(<MalaysiaCookieSettingsHost />)
    await waitFor(() => expect(window.__TIO2_SHARED_CONSENT__?.analytics).toBe('denied'))

    localStorage.setItem(CONSENT_KEY, JSON.stringify({version: 1, choice: 'analytics_accepted', decidedAt: 2}))
    fireEvent(window, new StorageEvent('storage', {key: CONSENT_KEY}))

    expect(readMalaysiaConsentChoice()).toBe('necessary_only')
    expect(window.__TIO2_SHARED_CONSENT__).toEqual({siteScope: 'tio2-my', analytics: 'denied'})
    const latest = Array.from(window.dataLayer!.at(-1) as unknown as ArrayLike<unknown>)
    expect(latest).toEqual(['consent', 'update', approved.consent.googleDefaults])
  })
})
/** @vitest-environment jsdom */


it('allows acceptance and withdrawal only with the active approved copy', () => {
  const activeCopy = consentCopy.getMalaysiaConsentCopy({
    NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: 'GTM-ABC1234',
    NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'G-1A2B3C4D5E',
  }, true)
  vi.spyOn(consentCopy, 'getMalaysiaConsentCopy').mockReturnValue(activeCopy)
  localStorage.clear()
  render(<><MalaysiaCookieSettingsTrigger>Manage preferences</MalaysiaCookieSettingsTrigger><MalaysiaCookieSettingsHost /></>)
  fireEvent.click(screen.getByRole('button', {name: 'Manage preferences'}))
  fireEvent.click(screen.getByRole('button', {name: 'Accept analytics'}))
  expect(window.__TIO2_SHARED_CONSENT__).toEqual({siteScope:'tio2-my',analytics:'granted'})
  fireEvent.click(screen.getByRole('button', {name: 'Manage preferences'}))
  expect(screen.getByRole('checkbox', {name: 'Allow analytics'}).getAttribute('checked')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Necessary only'}))
  expect(window.__TIO2_SHARED_CONSENT__).toEqual({siteScope:'tio2-my',analytics:'denied'})
  expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!)).toMatchObject({version:1,choice:'necessary_only'})
})

it('migrates the valid legacy choice to the legal canonical key', () => {
  localStorage.setItem(LEGACY_CONSENT_KEY, JSON.stringify({version: 1, choice: 'analytics_accepted'}))
  expect(readMalaysiaConsentChoice()).toBe('analytics_accepted')
  expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!)).toMatchObject({
    version: 1,
    choice: 'analytics_accepted',
  })
  expect(localStorage.getItem(LEGACY_CONSENT_KEY)).toBeNull()
})

it('withdrawal removes only the two known GA cookie names', () => {
  document.cookie = '_ga=GA1.1.fixture; Path=/'
  document.cookie = '_ga_1A2B3C4D5E=GS1.1.fixture; Path=/'
  document.cookie = 'session_required=keep; Path=/'
  removeMalaysiaAnalyticsCookies('G-1A2B3C4D5E')
  expect(document.cookie).not.toContain('_ga=')
  expect(document.cookie).not.toContain('_ga_1A2B3C4D5E=')
  expect(document.cookie).toContain('session_required=keep')
})
