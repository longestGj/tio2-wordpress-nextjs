import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {toMalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaRequestSamplePageSource} from '@/tests/fixtures/tio2-my-request-sample-page'

const mocks=vi.hoisted(()=>({getCurrentSite:vi.fn(),getPage:vi.fn()}))
vi.mock('@/lib/sites/current-site',()=>({getCurrentSite:mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/request-sample-v01-queries',()=>({getMalaysiaRequestSamplePage:mocks.getPage}))
beforeEach(()=>{mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'));mocks.getPage.mockResolvedValue(toMalaysiaRequestSamplePageDto(malaysiaRequestSamplePageSource()))})
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();vi.resetModules()})

describe('CONV-SAMPLE route',()=>{
  it('server-renders safe visible prefill, initial answers, one graph and shared Chrome',async()=>{
    const route=await import('@/app/request-sample/page');const markup=renderToStaticMarkup(await route.default({searchParams:Promise.resolve({source_page_id:'GRADE-M2377',grade_id:'M-2377',application_id:'coatings',process_context:'sulfate',destination:'United Kingdom','document_needs[]':['tds','coa']})}))
    expect(markup).toContain('data-site-scope="tio2-my"');expect(markup).toContain('Context brought from your previous page');expect(markup).toContain('value="M-2377" selected=""');expect(markup).toContain('United Kingdom');expect(markup.match(/application\/ld\+json/gu)).toHaveLength(1);expect(markup.match(/<header/gu)).toHaveLength(1);expect(markup.match(/<footer/gu)).toHaveLength(1);expect(markup).not.toContain('/contact')
  })
  it('rejects foreign site before querying WordPress',async()=>{mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'));const route=await import('@/app/request-sample/page');await expect(route.default({searchParams:Promise.resolve({})})).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'});expect(mocks.getPage).not.toHaveBeenCalled()})
  it('keeps metadata noindex and query-independent while authorization is false',async()=>{vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_INDEXING_RELEASE_AUTHORIZED','true');const route=await import('@/app/request-sample/page');await expect(route.generateMetadata()).resolves.toMatchObject({alternates:{canonical:'https://tio2malaysia.com/request-sample/'},robots:{index:false,follow:false}})})
})
