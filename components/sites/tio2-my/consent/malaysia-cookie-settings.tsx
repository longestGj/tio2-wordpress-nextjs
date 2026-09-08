'use client'

import {useEffect, useRef, useState, type ReactNode} from 'react'

import consentContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'
import styles from './malaysia-cookie-settings.module.css'

const OPEN_EVENT = 'tio2-my:open-cookie-settings'

type ConsentChoice = 'necessary_only' | 'analytics_accepted'
type GoogleConsentValue = 'denied' | 'granted'
export interface GoogleConsentSnapshot {
  readonly analytics_storage: GoogleConsentValue
  readonly ad_storage: 'denied'
  readonly ad_user_data: 'denied'
  readonly ad_personalization: 'denied'
}

export function createDeniedGoogleConsent(): GoogleConsentSnapshot {
  return {...consentContract.consent.googleDefaults} as GoogleConsentSnapshot
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

export function MalaysiaCookieSettingsHost({nativeModal=false}:{readonly nativeModal?:boolean}={}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)

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
    const dialog=dialogRef.current
    const priorOverflow=document.documentElement.style.overflow
    if(nativeModal && dialog instanceof HTMLDialogElement){
      dialog.showModal()
      document.documentElement.style.overflow='hidden'
    }
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
      if(nativeModal && dialog instanceof HTMLDialogElement){
        dialog.close()
        document.documentElement.style.overflow=priorOverflow
      }
    }
  }, [open,nativeModal])

  if (!open) return null
  const content=<>
    <h2 id="tio2-my-cookie-settings-title">{consentContract.consent.title}</h2>
    <p id="tio2-my-cookie-settings-description">{consentContract.consent.body}</p>
    <div className={styles.actions}>
      <button ref={closeRef} type="button" onClick={close}>{consentContract.consent.actions.close}</button>
      <a href={consentContract.consent.cookiePolicyHref}>{consentContract.consent.actions.cookiePolicy}</a>
    </div>
  </>
  if(nativeModal)return <dialog
    ref={node=>{dialogRef.current=node}}
    className={`${styles.dialog} ${styles.nativeDialog}`}
    aria-labelledby="tio2-my-cookie-settings-title"
    aria-describedby="tio2-my-cookie-settings-description"
    onCancel={event=>{event.preventDefault();close()}}
    onClick={event=>{
      const rect=event.currentTarget.getBoundingClientRect()
      if(event.target===event.currentTarget && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom))close()
    }}
  >{content}</dialog>
  return (
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) close() }}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tio2-my-cookie-settings-title"
        aria-describedby="tio2-my-cookie-settings-description"
      >
        {content}
      </section>
    </div>
  )
}
