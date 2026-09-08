// @vitest-environment jsdom
import {render,fireEvent,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {EditorialAnchorFocus} from '@/components/sites/tio2-my/editorial/editorial-anchor-focus'

afterEach(()=>{cleanup();vi.restoreAllMocks();history.replaceState(null,'','/')})
it('keeps section links on their heading after native anchor default would steal focus',()=>{
 const scroll=vi.fn();Element.prototype.scrollIntoView=scroll
 const view=render(<div data-editorial-page="APP-COAT"><main><a href="#grades">Grades</a><section id="grades"><h2>Starting Grades</h2></section></main><EditorialAnchorFocus pageId="APP-COAT"/></div>)
 fireEvent.click(view.getByText('Grades'))
 expect(location.hash).toBe('#grades')
 expect(document.activeElement).toBe(view.getByText('Starting Grades'))
 expect(scroll).toHaveBeenCalledWith({block:'start',behavior:'auto'})
 const push=vi.spyOn(history,'pushState')
 fireEvent.click(view.getByText('Grades'))
 expect(push).not.toHaveBeenCalled()
})
it('preserves modified clicks and outside fragment links',()=>{
 const push=vi.spyOn(history,'pushState')
 const view=render(<div data-editorial-page="APP-COAT"><main><a href="#grades">Grades</a><section id="grades"><h2>Starting Grades</h2></section></main><EditorialAnchorFocus pageId="APP-COAT"/></div>)
 fireEvent.click(view.getByText('Grades'),{ctrlKey:true})
 expect(push).not.toHaveBeenCalled()
 expect(document.activeElement).not.toBe(view.getByText('Starting Grades'))
})
