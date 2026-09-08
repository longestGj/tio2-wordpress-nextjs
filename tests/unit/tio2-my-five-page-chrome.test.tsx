// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen, within, waitFor} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'
import {MalaysiaGlobalFooter, MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import chrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

afterEach(cleanup)

const sources = ['MARKET-EU-DE', 'MARKET-EU-IT', 'PRODUCT-PROC-SU', 'RES-R706', 'RES-CHEMOURS']

describe('five approved pages consume the shared dropdown Chrome variant', () => {
  it('mounts native Cookie modality outside the Footer and restores scroll/focus',async()=>{
    const view=render(<MalaysiaGlobalFooter chrome={chrome} sourcePageId="PRODUCT-PROC-SU"/>)
    const trigger=screen.getByRole('button',{name:'Cookie Settings'})
    fireEvent.click(trigger)
    const dialog=screen.getByRole('dialog',{name:'Cookie settings'})
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog.closest('footer')).toBeNull()
    expect(view.container.querySelector('footer h2#tio2-my-cookie-settings-title')).toBeNull()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(within(dialog).getByRole('heading',{name:'Cookie settings'})).toBeTruthy()
    fireEvent.keyDown(document,{key:'Escape'})
    await waitFor(()=>expect(document.activeElement).toBe(trigger))
    expect(document.documentElement.style.overflow).toBe('')
  })
  it.each(sources)('%s opens at the first link, isolates the background, cycles through the trigger and restores focus', (sourcePageId) => {
    const currentPageId = sourcePageId.startsWith('MARKET') ? 'MARKET-000' : sourcePageId.startsWith('PRODUCT') ? 'PRODUCT-000' : 'RES-000'
    const {container} = render(<div><MalaysiaGlobalHeader chrome={chrome} currentPageId={currentPageId} sourcePageId={sourcePageId}/><main><a href="#body-content">Body content</a></main><MalaysiaGlobalFooter chrome={chrome} sourcePageId={sourcePageId}/></div>)
    const trigger = screen.getByRole('button', {name: 'Open primary navigation'})
    fireEvent.click(trigger)
    const menu = screen.getByRole('navigation', {name: 'Mobile navigation'})
    const links = within(menu).getAllByRole('link')
    expect(document.activeElement).toBe(links[0])
    expect(container.querySelector('main')?.hasAttribute('inert')).toBe(true)
    expect(container.querySelector('footer')?.hasAttribute('inert')).toBe(true)
    expect(trigger.closest('[inert]')).toBeNull()
    expect(screen.queryByRole('dialog', {name: 'Primary navigation menu'})).toBeNull()
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1)
    links.at(-1)!.focus()
    fireEvent.keyDown(document, {key: 'Tab'})
    expect(document.activeElement).toBe(trigger)
    fireEvent.keyDown(document, {key: 'Tab', shiftKey: true})
    expect(document.activeElement).toBe(links.at(-1))
    fireEvent.keyDown(document, {key: 'Escape'})
    expect(document.activeElement).toBe(trigger)
    expect(container.querySelector('main')?.hasAttribute('inert')).toBe(false)
    expect(container.querySelector('footer')?.hasAttribute('inert')).toBe(false)
    expect(screen.queryByRole('navigation', {name: 'Mobile navigation'})).toBeNull()
    for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[data-source-page]')) {
      expect(anchor.getAttribute('href')).toBe('/request-a-quote/')
    }
  })

  it('preserves the existing dialog and initial close-button focus for other consumers', () => {
    render(<MalaysiaGlobalHeader chrome={chrome} currentPageId="RES-000" sourcePageId="RES-TRADE-EU"/>)
    fireEvent.click(screen.getByRole('button', {name: 'Open primary navigation'}))
    const dialog = screen.getByRole('dialog', {name: 'Primary navigation menu'})
    expect(document.activeElement).toBe(within(dialog).getByRole('button', {name: 'Close primary navigation menu'}))
  })
})
