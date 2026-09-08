'use client'

import {useEffect, useRef, useState, type ReactNode} from 'react'

import styles from './malaysia-cookie-settings.module.css'

const OPEN_EVENT = 'cookie-settings:open'
const publicConsentCopy = {
  title: 'Cookie settings',
  body: 'No optional Analytics or advertising technology is currently active on this site. Necessary functions may use browser storage to operate the site and remember an available privacy setting.',
  close: 'Close',
  cookiePolicy: 'Read Cookie Policy',
  cookiePolicyHref: '/cookie-policy/',
} as const

type ConsentChoice = 'necessary_only' | 'analytics_accepted'
type GoogleConsentValue = 'denied' | 'granted'
export interface GoogleConsentSnapshot {
  readonly analytics_storage: GoogleConsentValue
  readonly ad_storage: 'denied'
  readonly ad_user_data: 'denied'
  readonly ad_personalization: 'denied'
}

export function createDeniedGoogleConsent(): GoogleConsentSnapshot {
  return {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}
}

export function transitionConsent(choice: ConsentChoice): GoogleConsentSnapshot {
  return {...createDeniedGoogleConsent(), analytics_storage: choice === 'analytics_accepted' ? 'granted' : 'denied'}
}

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
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  function close() {
    setOpen(false)
    queueMicrotask(() => triggerRef.current?.focus())
  }

  useEffect(() => {
    const onOpen = (event: Event) => {
      const trigger = (event as CustomEvent<{trigger?: HTMLElement}>).detail?.trigger
      triggerRef.current = trigger ?? document.activeElement as HTMLElement | null
      setOpen(true)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (!dialog) return
    const rootOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]') ?? [])
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
  }, [open])

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
        <div className={styles.actions}>
          <button ref={closeRef} type="button" onClick={close}>{publicConsentCopy.close}</button>
          <a href={publicConsentCopy.cookiePolicyHref}>{publicConsentCopy.cookiePolicy}</a>
        </div>
      </section>
    </dialog>
  )
}
