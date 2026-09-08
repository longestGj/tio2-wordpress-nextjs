'use client'

import {useEffect} from 'react'

const TARGET_ID = 'explore-chloride-process-grades'

function focusTarget() {
  document.getElementById(TARGET_ID)?.focus({preventScroll: true})
}

export function ChlorideGradeAnchor({label}: {readonly label: string}) {
  useEffect(() => {
    if (window.location.hash !== `#${TARGET_ID}`) return
    window.requestAnimationFrame(focusTarget)
  }, [])

  return (
    <a
      href={`#${TARGET_ID}`}
      onClick={(event) => {
        event.preventDefault()
        if (window.location.hash !== `#${TARGET_ID}`) {
          window.location.hash = TARGET_ID
        }
        document.getElementById(TARGET_ID)?.scrollIntoView({block: 'start'})
        focusTarget()
      }}
    >{label}</a>
  )
}
