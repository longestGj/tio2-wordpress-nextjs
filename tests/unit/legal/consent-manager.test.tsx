import {fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {describe, expect, it} from 'vitest'

import {
  MalaysiaCookieSettingsHost,
  MalaysiaCookieSettingsTrigger,
  createDeniedGoogleConsent,
  transitionConsent,
} from '@/components/sites/tio2-my/consent/malaysia-cookie-settings'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

describe('SHARED-CONSENT-TIO2-MY', () => {
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
    expect(screen.queryByRole('button', {name: /Accept analytics/i})).toBeNull()
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
  })
})
/** @vitest-environment jsdom */
