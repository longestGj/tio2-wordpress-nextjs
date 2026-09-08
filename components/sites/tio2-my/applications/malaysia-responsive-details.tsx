'use client'

import {useEffect, useRef, type ReactNode} from 'react'

export function MalaysiaResponsiveDetails({children, className}: {readonly children: ReactNode; readonly className: string}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 560px)')
    const applyDefault = () => {
      if (detailsRef.current) detailsRef.current.open = !mobile.matches
    }
    applyDefault()
    mobile.addEventListener('change', applyDefault)
    return () => mobile.removeEventListener('change', applyDefault)
  }, [])
  return <details ref={detailsRef} className={className} open>{children}</details>
}
