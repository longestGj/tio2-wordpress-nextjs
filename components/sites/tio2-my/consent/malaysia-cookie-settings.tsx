'use client'

import {useEffect, useRef, useState, type ReactNode} from 'react'

import styles from './malaysia-cookie-settings.module.css'
import {getMalaysiaConsentCopy} from '@/lib/consent/malaysia-consent-copy'

const OPEN_EVENT = 'cookie-settings:open'
import {readEffectiveMalaysiaConsentChoice, readEffectiveStoredMalaysiaConsentChoice, applyMalaysiaConsent, persistMalaysiaConsentChoice, type ConsentChoice} from '@/lib/consent/malaysia-consent'
export {createDeniedGoogleConsent, transitionConsent} from '@/lib/consent/malaysia-consent'

export function MalaysiaCookieSettingsTrigger({children, className}: {readonly children: ReactNode; readonly className?: string}) {
  return (
    <button
      type="button"
      className={className}
      onClick={(event) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, {detail: {trigger: event.currentTarget}}))}
    >
      {children}
    </button>
  )
}

export function MalaysiaCookieSettingsHost() {
  const publicConsentCopy = getMalaysiaConsentCopy()
  const analyticsActive = publicConsentCopy.analyticsActive
  const [open, setOpen] = useState(false)
  const [hasExistingChoice, setHasExistingChoice] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const acceptRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  function close() {
    setOpen(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    const onOpen = (event: Event) => {
      const trigger = (event as CustomEvent<{trigger?: HTMLElement}>).detail?.trigger
      triggerRef.current = trigger ?? document.activeElement as HTMLElement | null
      const storedChoice = readEffectiveStoredMalaysiaConsentChoice(analyticsActive)
      setHasExistingChoice(storedChoice !== null)
      setAnalytics(storedChoice === 'analytics_accepted')
      setSaveError(false)
      setOpen(true)
    }
    applyMalaysiaConsent('necessary_only', 'default')
    const initialChoice = readEffectiveMalaysiaConsentChoice(analyticsActive)
    if (initialChoice === 'analytics_accepted') applyMalaysiaConsent(initialChoice, 'update')
    const syncChoice = () => applyMalaysiaConsent(readEffectiveMalaysiaConsentChoice(analyticsActive), 'update')
    window.addEventListener('storage', syncChoice)
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => {window.removeEventListener(OPEN_EVENT, onOpen); window.removeEventListener('storage', syncChoice)}
  }, [analyticsActive])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const rootOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    if (analyticsActive) {
      if (hasExistingChoice) saveRef.current?.focus()
      else acceptRef.current?.focus()
    } else {
      closeRef.current?.focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled]), a[href]') ?? [])
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      dialog.close()
      document.documentElement.style.overflow = rootOverflow
      document.body.style.overflow = bodyOverflow
    }
  }, [analyticsActive, hasExistingChoice, open])

  function save(choice: ConsentChoice) {
    const effectiveChoice = analyticsActive ? choice : 'necessary_only'
    applyMalaysiaConsent(effectiveChoice, 'update')
    try {persistMalaysiaConsentChoice(effectiveChoice); close()}
    catch {setAnalytics(effectiveChoice === 'analytics_accepted'); setSaveError(true)}
  }

  if (!open) return null
  return (
    <dialog ref={dialogRef} className={styles.backdrop}
      aria-modal="true" aria-labelledby="cookie-settings-title"
      aria-describedby="cookie-settings-description"
      onCancel={(event) => { event.preventDefault(); close() }}
      onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
      <section className={styles.dialog}>
        <h2 id="cookie-settings-title">{publicConsentCopy.title}</h2>
        <p id="cookie-settings-description">{publicConsentCopy.body}</p>
        <p>{publicConsentCopy.necessaryDetail}</p>
        <p>{publicConsentCopy.analyticsDetail}</p>
        {analyticsActive && <label className={styles.preference}><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />Allow analytics</label>}
        <p role="status">{analyticsActive ? (analytics ? 'Analytics allowed' : 'Necessary only') : 'Necessary only; Analytics unavailable'}</p>
        {saveError && <p role="alert">Your browser could not save this preference.</p>}
        <div className={styles.actions}>
          {analyticsActive && !hasExistingChoice && <>
            <button ref={acceptRef} type="button" onClick={() => save('analytics_accepted')}>{publicConsentCopy.accept}</button>
            <button type="button" onClick={() => save('necessary_only')}>{publicConsentCopy.necessary}</button>
            <a href={publicConsentCopy.cookiePolicyHref}>{publicConsentCopy.firstOpenCookiePolicy}</a>
          </>}
          {analyticsActive && hasExistingChoice && <>
            <button ref={saveRef} type="button" onClick={() => save(analytics ? 'analytics_accepted' : 'necessary_only')}>Save preferences</button>
            <button type="button" onClick={() => save('analytics_accepted')}>{publicConsentCopy.accept}</button>
            <button type="button" onClick={() => save('necessary_only')}>{publicConsentCopy.necessary}</button>
            <button ref={closeRef} type="button" onClick={close}>{publicConsentCopy.close}</button>
          </>}
          {!analyticsActive && <>
            <button ref={closeRef} type="button" onClick={close}>{publicConsentCopy.close}</button>
            <a href={publicConsentCopy.cookiePolicyHref}>{publicConsentCopy.cookiePolicy}</a>
          </>}
        </div>
      </section>
    </dialog>
  )
}
