// @vitest-environment jsdom
import {cleanup,fireEvent,render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {MalaysiaGlobalHeader} from '@/components/sites/tio2-my/malaysia-global-chrome'
import chrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
beforeEach(()=>{
  vi.stubGlobal('matchMedia', () => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')}
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')}
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals()})
it('opens the shared dialog with Close focused, locks scroll, wraps both Tab directions and returns focus',async()=>{
  const user=userEvent.setup()
  render(<MalaysiaGlobalHeader chrome={chrome} currentPageId="MARKET-000" sourcePageId="MARKET-UK-001"/>)
  const trigger=screen.getByRole('button',{name:'Open primary navigation'})
  trigger.focus();fireEvent.click(trigger)
  const dialog=screen.getByRole('dialog',{name:'Primary navigation menu'})
  expect(dialog.getAttribute('aria-modal')).toBe('true')
  const close=screen.getByRole('button',{name:'Close primary navigation menu'})
  expect(document.activeElement).toBe(close)
  expect(document.documentElement.style.overflow).toBe('hidden')
  expect(dialog.querySelector('img')?.getAttribute('src')).toContain('primary-horizontal-v0.1.svg')
  const links=dialog.querySelectorAll('nav a')
  expect([...links].map(a=>a.textContent)).toEqual(['Home','Markets','Products','Applications','Documents','Resources','About','Request a Quote'])
  const topbarRfq=dialog.querySelector('a[href="/request-a-quote/"]')
  // Close receives initial focus, but the topbar RFQ precedes it in tab order.
  // userEvent supplies normal Tab traversal; fireEvent only dispatches keydown.
  await user.tab({shift:true});expect(document.activeElement).toBe(topbarRfq)
  await user.tab({shift:true});expect(document.activeElement).toBe(links[7])
  await user.tab();expect(document.activeElement).toBe(topbarRfq)
  await user.tab();expect(document.activeElement).toBe(close)
  fireEvent(dialog,new Event('cancel',{bubbles:false,cancelable:true}))
  expect(document.activeElement).toBe(trigger)
  expect(document.documentElement.style.overflow).toBe('')
})
