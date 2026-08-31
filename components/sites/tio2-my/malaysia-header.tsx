'use client'

import Image from 'next/image'
import Link from 'next/link'
import {useEffect, useRef, useState} from 'react'

import type {MalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-types'

import styles from './homepage/malaysia-homepage.module.css'

type Chrome = MalaysiaHomepageDto['globalChrome']

const rfqAttributes = {
  'data-site-scope': 'tio2-my',
  'data-source-page': 'HOME-001',
} as const

export function MalaysiaHeader({chrome}: {readonly chrome: Chrome}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.logoLink} aria-label="TiO₂ Malaysia home">
          <Image
            src={chrome.logo.src}
            alt={chrome.logo.alt}
            width={chrome.logo.width}
            height={chrome.logo.height}
            className={styles.logo}
            fetchPriority="high"
          />
        </Link>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {chrome.navigation.map((item) => (
            <a key={item.targetPageId} href={item.href} aria-current={item.href === '/' ? 'page' : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className={styles.headerRfq} href={chrome.rfq.href} {...rfqAttributes}>
          <span className={styles.rfqFull}>{chrome.rfq.label}</span>
          <span className={styles.rfqCompact}>{chrome.rfq.compactLabel}</span>
        </a>
        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="malaysia-mobile-menu"
          onClick={() => setOpen((current) => !current)}
        >
          Menu
        </button>
      </div>
      <nav
        id="malaysia-mobile-menu"
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!open}
      >
        {chrome.navigation.map((item) => (
          <a key={item.targetPageId} href={item.href} aria-current={item.href === '/' ? 'page' : undefined}>
            {item.label}
          </a>
        ))}
        <a href={chrome.rfq.href} {...rfqAttributes}>{chrome.rfq.label}</a>
      </nav>
    </header>
  )
}
