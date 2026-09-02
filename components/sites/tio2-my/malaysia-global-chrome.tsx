'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'

import type {Tio2MyGlobalChrome} from '@/lib/wordpress/tio2-my-global-chrome-types'

import styles from './malaysia-global-chrome.module.css'
import {MalaysiaCookieSettingsHost, MalaysiaCookieSettingsTrigger} from './consent/malaysia-cookie-settings'

interface GlobalChromeProps {
  readonly chrome: Tio2MyGlobalChrome
  readonly currentPageId: string
  readonly sourcePageId: string
}

function rfqAttributes(sourcePageId: string) {
  return {
    'data-site-scope': 'tio2-my',
    'data-source-page': sourcePageId,
  } as const
}

export function MalaysiaGlobalHeader({
  chrome,
  currentPageId,
  sourcePageId,
}: GlobalChromeProps) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  function containMenuFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const links = Array.from(
      menuRef.current?.querySelectorAll<HTMLAnchorElement>('a[href]') ?? [],
    )
    if (!links.length) return
    const first = links[0]
    const last = links.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last?.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first?.focus()
    }
  }

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logoLink} aria-label="TiO2 Malaysia home">
          <Image
            src={chrome.logo.primary.src}
            alt={chrome.logo.primary.alt}
            width={chrome.logo.primary.width}
            height={chrome.logo.primary.height}
            className={styles.logo}
            fetchPriority="high"
          />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {chrome.navigation.map((item) => {
            const current = item.targetPageId === currentPageId
            return (
              <a key={item.targetPageId} href={item.href} aria-current={current ? 'page' : undefined}>
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>
        <a className={styles.headerRfq} href={chrome.rfq.href} {...rfqAttributes(sourcePageId)}>
          <span className={styles.rfqFull}>{chrome.rfq.label}</span>
          <span className={styles.rfqCompact}>{chrome.rfq.compactLabel}</span>
        </a>
        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-label={`${open ? 'Close' : 'Open'} primary navigation`}
          aria-expanded={open}
          aria-controls="malaysia-mobile-menu"
          onClick={() => setOpen((current) => !current)}
        >
          Menu
        </button>
      </div>
      <nav
        ref={menuRef}
        id="malaysia-mobile-menu"
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!open}
        onKeyDown={containMenuFocus}
      >
        {chrome.navigation.map((item) => {
          const current = item.targetPageId === currentPageId
          return (
            <a key={item.targetPageId} href={item.href} aria-current={current ? 'page' : undefined}>
              <span>{item.label}</span>
            </a>
          )
        })}
        <a href={chrome.rfq.href} {...rfqAttributes(sourcePageId)}>{chrome.rfq.label}</a>
      </nav>
    </header>
  )
}

export function MalaysiaGlobalFooter({
  chrome,
  sourcePageId,
}: Omit<GlobalChromeProps, 'currentPageId'>) {
  const navById = new Map(chrome.navigation.map((item) => [item.targetPageId, item]))
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div className={styles.brandColumn}>
          <Image
            src={chrome.logo.reverse.src}
            alt={chrome.logo.reverse.alt}
            width={chrome.logo.reverse.width}
            height={chrome.logo.reverse.height}
            className={styles.footerLogo}
          />
          <p>{chrome.footer.description}</p>
        </div>
        <nav aria-label="Footer explore navigation">
          <h2>{chrome.footer.headings.explore}</h2>
          {chrome.footer.explore.map((id) => {
            const item = navById.get(id)
            return item ? <a key={id} href={item.href}>{item.label}</a> : null
          })}
        </nav>
        <nav aria-label="Footer information navigation">
          <h2>{chrome.footer.headings.information}</h2>
          {chrome.footer.information.map((id) => {
            const item = navById.get(id)
            return item ? <a key={id} href={item.href}>{item.label}</a> : null
          })}
        </nav>
        <div className={styles.conversionColumn}>
          <h2>{chrome.footer.headings.procurement}</h2>
          <a className={styles.footerRfq} href={chrome.rfq.href} {...rfqAttributes(sourcePageId)}>
            {chrome.rfq.label}
          </a>
        </div>
      </div>
      <nav className={styles.legalUtilities} aria-label="Legal and privacy navigation">
        {chrome.footer.legalUtilities.map((item) => item.action === 'OPEN_COOKIE_SETTINGS'
          ? <MalaysiaCookieSettingsTrigger key={item.label}>{item.label}</MalaysiaCookieSettingsTrigger>
          : <a key={item.label} href={item.href ?? undefined}>{item.label}</a>)}
      </nav>
      <p className={styles.copyright}>{chrome.footer.copyright}</p>
      <MalaysiaCookieSettingsHost />
    </footer>
  )
}
