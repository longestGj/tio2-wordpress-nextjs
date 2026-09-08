'use client'

import type {AnchorHTMLAttributes, MouseEvent, ReactNode} from 'react'

export const MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY = 'tio2MyRfqSourcePageId'

interface MalaysiaPrivateRfqLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  readonly children: ReactNode
  readonly href: string
  readonly sourcePageId: string
}

export function MalaysiaPrivateRfqLink({
  children,
  href,
  sourcePageId,
  onClick,
  ...attributes
}: MalaysiaPrivateRfqLinkProps) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey ||
      event.shiftKey || event.altKey || attributes.target || href !== '/request-a-quote/'
    ) return

    window.sessionStorage.setItem(MALAYSIA_RFQ_PRIVATE_SOURCE_STATE_KEY, sourcePageId)
  }

  return (
    <a
      {...attributes}
      href={href}
      data-site-scope="tio2-my"
      data-source-page={sourcePageId}
      onClick={navigate}
    >
      {children}
    </a>
  )
}
