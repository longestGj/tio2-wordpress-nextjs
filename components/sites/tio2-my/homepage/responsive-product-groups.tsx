'use client'

import {useState, useSyncExternalStore} from 'react'

import styles from './malaysia-homepage.module.css'

export function ResponsiveProductGroups({children}: {readonly children: React.ReactNode}) {
  const desktopTablet = useSyncExternalStore(
    (notify) => {
      if (typeof window.matchMedia !== 'function') return () => undefined
      const media = window.matchMedia('(max-width: 767px)')
      media.addEventListener('change', notify)
      return () => media.removeEventListener('change', notify)
    },
    () => typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(max-width: 767px)').matches,
    () => true,
  )
  const [mobileOpen, setMobileOpen] = useState(false)
  const open = desktopTablet || mobileOpen

  return (
    <details
      className={styles.productDetails}
      open={open}
      onToggle={(event) => {
        if (!desktopTablet) {
          setMobileOpen(event.currentTarget.open)
        }
      }}
    >
      <summary>View product groups <span aria-hidden>+</span></summary>
      {children}
    </details>
  )
}
