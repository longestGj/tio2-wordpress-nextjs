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

const approvedDropdownSources = new Set([
  'MARKET-EU-DE', 'MARKET-EU-IT', 'PRODUCT-PROC-SU', 'RES-R706', 'RES-CHEMOURS',
])

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
  const approvedDropdown = approvedDropdownSources.has(sourcePageId)
  const [open, setOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const dropdownRef = useRef<HTMLElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    if (approvedDropdown) {
      const header = headerRef.current
      const menu = dropdownRef.current
      const trigger = buttonRef.current
      if (!header || !menu || !trigger) return
      const page = header.parentElement
      const background = [page?.querySelector('main'), page?.querySelector('footer'),
        header.querySelector(`.${styles.logoLink}`), header.querySelector(`.${styles.headerRfq}`)]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((node) => ({node, wasInert: node.hasAttribute('inert')}))
      const rootOverflow = document.documentElement.style.overflow
      const bodyOverflow = document.body.style.overflow
      background.forEach(({node}) => node.setAttribute('inert', ''))
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      menu.querySelector<HTMLElement>('a[href]')?.focus()
      const desktop = window.matchMedia('(min-width: 1101px)')
      const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return }
        if (event.key !== 'Tab') return
        const last = Array.from(menu.querySelectorAll<HTMLElement>('a[href]')).at(-1)
        if (event.shiftKey && document.activeElement === trigger) {
          event.preventDefault(); last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); trigger.focus()
        }
      }
      document.addEventListener('keydown', handleKey)
      desktop.addEventListener('change', closeOnDesktop)
      return () => {
        document.removeEventListener('keydown', handleKey)
        desktop.removeEventListener('change', closeOnDesktop)
        background.forEach(({node, wasInert}) => { if (!wasInert) node.removeAttribute('inert') })
        document.documentElement.style.overflow = rootOverflow
        document.body.style.overflow = bodyOverflow
        const desktopCurrent = header.querySelector<HTMLElement>(`.${styles.desktopNav} [aria-current="page"]`)
        if (desktop.matches) desktopCurrent?.focus({preventScroll: true})
        else trigger.focus({preventScroll: true})
      }
    }
    const dialog = menuRef.current
    if (!dialog) return
    const trigger = buttonRef.current
    const rootOverflow = document.documentElement.style.overflow
    const bodyOverflow = document.body.style.overflow
    dialog.showModal()
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    const desktop = window.matchMedia('(min-width: 901px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.removeEventListener('keydown', closeOnEscape)
      desktop.removeEventListener('change', closeOnDesktop)
      dialog.close()
      document.documentElement.style.overflow = rootOverflow
      document.body.style.overflow = bodyOverflow
      trigger?.focus()
    }
  }, [open, approvedDropdown])

  function containMenuFocus(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return
    const links = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [],
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

  const mobileNavigation = <nav
    ref={dropdownRef}
    id={approvedDropdown ? 'malaysia-mobile-menu' : undefined}
    className={styles.mobileNav}
    aria-label="Mobile navigation"
    hidden={!open}
    onClick={approvedDropdown ? (event) => {
      if ((event.target as HTMLElement).closest('a[href]')) setOpen(false)
    } : undefined}
  >
    {chrome.navigation.map((item) => {
      const current = item.targetPageId === currentPageId
      return <a key={item.targetPageId} href={item.href} aria-current={current ? 'page' : undefined}>
        <span>{item.label}</span>
      </a>
    })}
    <a href={chrome.rfq.href} {...rfqAttributes(sourcePageId)}>{chrome.rfq.label}</a>
  </nav>

  return (
    <header ref={headerRef} className={styles.header} lang="en" data-chrome-variant={approvedDropdown ? 'gate8-approved' : undefined}>
      <div className={styles.headerInner} inert={open && !approvedDropdown}>
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
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      {approvedDropdown ? mobileNavigation : <dialog
        ref={menuRef}
        id="malaysia-mobile-menu"
        className={styles.mobileDialog}
        aria-label="Primary navigation menu"
        aria-modal="true"
        onCancel={(event) => { event.preventDefault(); setOpen(false) }}
        onKeyDown={containMenuFocus}
      >
        <div className={styles.menuTopbar}>
          <Image src={chrome.logo.primary.src} alt={chrome.logo.primary.alt} width={120} height={40} className={styles.menuLogo} />
          <button ref={closeRef} type="button" className={styles.menuClose} aria-label="Close primary navigation menu" onClick={() => setOpen(false)}>Close</button>
        </div>
        {mobileNavigation}
      </dialog>}
    </header>
  )
}

export function MalaysiaGlobalFooter({
  chrome,
  sourcePageId,
}: Omit<GlobalChromeProps, 'currentPageId'>) {
  const navById = new Map(chrome.navigation.map((item) => [item.targetPageId, item]))
  return (
    <><footer className={styles.footer} lang="en" data-chrome-variant={approvedDropdownSources.has(sourcePageId) ? 'gate8-approved' : undefined}>
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
      {!approvedDropdownSources.has(sourcePageId) && <MalaysiaCookieSettingsHost />}
    </footer>
    {approvedDropdownSources.has(sourcePageId) && <MalaysiaCookieSettingsHost nativeModal/>}</>
  )
}
