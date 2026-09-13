import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

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
import {getMalaysiaConsentCopy} from '@/lib/consent/malaysia-consent-copy'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

afterEach(() => {cleanup(); localStorage.clear(); delete window.__TIO2_SHARED_CONSENT__; delete window.dataLayer})

describe('SHARED-CONSENT-TIO2-MY', () => {
  it('activates the exact GA4 first-layer copy only with both runtime identifiers', () => {
    const active = getMalaysiaConsentCopy({
      NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: 'GTM-ABC1234',
      NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'G-1A2B3C4D5E',
    }, true)
    expect(active).toMatchObject({
      analyticsActive: true,
      title: 'Analytics preferences',
      body: 'Optional Analytics helps us understand aggregate website use and performance. If you choose Necessary only, Analytics storage remains off, but limited cookieless measurement signals may still be sent to Google.',
      necessary: 'Necessary only',
    })
    expect(getMalaysiaConsentCopy({}).analyticsActive).toBe(false)
    expect(getMalaysiaConsentCopy({
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

  it('opens the no-Analytics dialog without a first-visit banner and restores focus', async () => {
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
    expect(screen.getByRole('button', {name: 'Accept analytics'})).toBeTruthy()
    const close = within(dialog).getByRole('button', {name: 'Close'})
    const policy = within(dialog).getByRole('link', {name: 'Read Cookie Policy'})
    expect(document.activeElement).toBe(close)
    policy.focus()
    fireEvent.keyDown(document, {key: 'Tab'})
    expect(document.activeElement).toBe(screen.getByRole('checkbox'))
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true})
    expect(document.activeElement).toBe(policy)
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(trigger))
    expect(document.documentElement.style.overflow).toBe('')
  })
})
/** @vitest-environment jsdom */


it('persists a shared analytics choice and withdraws it without storing buyer data', () => {
  localStorage.clear()
  render(<><MalaysiaCookieSettingsTrigger>Manage preferences</MalaysiaCookieSettingsTrigger><MalaysiaCookieSettingsHost /></>)
  fireEvent.click(screen.getByRole('button', {name: 'Manage preferences'}))
  fireEvent.click(screen.getByRole('button', {name: 'Accept analytics'}))
  expect(window.__TIO2_SHARED_CONSENT__).toEqual({siteScope:'tio2-my',analytics:'granted'})
  fireEvent.click(screen.getByRole('button', {name: 'Manage preferences'}))
  expect(screen.getByRole('checkbox', {name: 'Allow analytics'}).getAttribute('checked')).not.toBeNull()
  fireEvent.click(screen.getByRole('button', {name: 'Reject / withdraw analytics'}))
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
