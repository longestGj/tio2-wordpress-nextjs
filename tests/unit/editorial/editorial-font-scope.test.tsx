// @vitest-environment jsdom
import {render,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {MalaysiaEditorialPage} from '@/components/sites/tio2-my/editorial/malaysia-editorial-page'
import type {EditorialDto} from '@/lib/editorial/editorial-types'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-editorial-app-coat.json'

vi.mock('next/font/google',()=>({Inter:()=>({variable:'editorial-inter-variable'})}))
vi.mock('@/components/sites/tio2-my/malaysia-global-chrome',()=>({MalaysiaGlobalHeader:()=>null,MalaysiaGlobalFooter:()=>null}))
afterEach(cleanup)
it('keeps approved editorial typography scoped to its own wrapper after the global Country font is removed',()=>{
 const view=render(<MalaysiaEditorialPage page={contract as unknown as EditorialDto}/> )
 expect(view.container.querySelector('[data-editorial-page="APP-COAT"]')?.classList.contains('editorial-inter-variable')).toBe(true)
 expect(document.body.classList.contains('editorial-inter-variable')).toBe(false)
})
