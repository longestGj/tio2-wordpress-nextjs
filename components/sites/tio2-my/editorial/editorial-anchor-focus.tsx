'use client'
import {useEffect} from 'react'

export function EditorialAnchorFocus({pageId}:{readonly pageId:string}) {
  useEffect(()=>{
    const root=document.querySelector<HTMLElement>(`[data-editorial-page="${pageId}"] main`)
    if(!root) return
    function focusAnchor(event:MouseEvent) {
      if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor=(event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if(!anchor) return
      const id=anchor.getAttribute('href')?.slice(1)
      const target=id?document.getElementById(id):null
      if(!target || !root?.contains(target)) return
      const heading=target.matches('h1,h2,h3')?target:target.querySelector<HTMLElement>('h1,h2,h3')??target
      // Native fragment navigation can reset focus after this listener for section targets.
      event.preventDefault()
      if(window.location.hash!==`#${id}`) window.history.pushState(null,'',`#${id}`)
      target.scrollIntoView({block:'start',behavior:'auto'})
      heading.tabIndex=-1
      heading.focus({preventScroll:true})
    }
    root.addEventListener('click',focusAnchor)
    return ()=>root.removeEventListener('click',focusAnchor)
  },[pageId])
  return null
}
