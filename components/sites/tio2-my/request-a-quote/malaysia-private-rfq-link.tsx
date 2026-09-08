'use client'

import type {AnchorHTMLAttributes, MouseEvent, ReactNode} from 'react'

interface MalaysiaPrivateRfqLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly children: ReactNode
  readonly href: string
}

export function MalaysiaPrivateRfqLink({
  children,
  href,
  onClick,
  ...attributes
}: MalaysiaPrivateRfqLinkProps) {
  async function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || attributes.target || href !== '/request-a-quote/'
    ) return

    event.preventDefault()
    try {
      await fetch('/api/tio2-my/rfq-attribution', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'x-requested-with': 'fetch'},
      })
    } finally {
      window.location.assign(href)
    }
  }

  return (
    <a
      {...attributes}
      href={href}
      onClick={navigate}
    >
      {children}
    </a>
  )
}
