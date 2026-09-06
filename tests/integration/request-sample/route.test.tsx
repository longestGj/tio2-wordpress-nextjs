import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {toMalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaRequestSamplePageSource} from '@/tests/fixtures/tio2-my-request-sample-page'

const pageDto=toMalaysiaRequestSamplePageDto(malaysiaRequestSamplePageSource())
const mocks=vi.hoisted(()=>({getCurrentSite:vi.fn(),getPage:vi.fn()}))
vi.mock('@/lib/sites/current-site',()=>({getCurrentSite:mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/request-sample-v01-queries',()=>({getMalaysiaRequestSamplePage:mocks.getPage}))
beforeEach(()=>{vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY','shared-web3forms-key');mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'));mocks.getPage.mockResolvedValue(pageDto)})
afterEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();vi.resetModules()})

describe('CONV-SAMPLE route',()=>{
  it('server-renders a static empty shell, initial answers, one graph and shared Chrome',async()=>{
    const route=await import('@/app/request-sample/page');const markup=renderToStaticMarkup(await route.default())
    expect(markup).toContain('data-site-scope="tio2-my"');expect(markup).not.toContain('Context brought from your previous page');expect(markup).not.toContain('value="M-2377" selected=""');expect(markup).not.toContain('United Kingdom');expect(markup.match(/application\/ld\+json/gu)).toHaveLength(1);expect(markup.match(/<header/gu)).toHaveLength(1);expect(markup.match(/<footer/gu)).toHaveLength(1);expect(markup).not.toContain('/contact');expect(markup).not.toContain('shared-web3forms-key')
    for(const item of pageDto.faq.items)expect(markup).toContain(item.answer)
  })
  it('server-renders no usable form or access key when the shared key is absent',async()=>{
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY','');const route=await import('@/app/request-sample/page');const markup=renderToStaticMarkup(await route.default())
    expect(markup).not.toContain('<form');expect(markup).not.toContain('id="sample-grade_id"');expect(markup).not.toContain('Submit Sample Request for Review');expect(markup).toContain('We cannot confirm sample requests right now.');expect(markup).toContain('The sample request form is not available. No request has been confirmed. Please try again later.');expect(markup).not.toContain('shared-web3forms-key')
  })
  it('rejects foreign site before querying WordPress',async()=>{mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'));const route=await import('@/app/request-sample/page');await expect(route.default()).rejects.toMatchObject({digest:'NEXT_HTTP_ERROR_FALLBACK;404'});expect(mocks.getPage).not.toHaveBeenCalled()})
  it('keeps metadata noindex and query-independent while authorization is false',async()=>{vi.stubEnv('VERCEL_ENV','production');vi.stubEnv('TIO2_MY_REQUEST_SAMPLE_INDEXING_RELEASE_AUTHORIZED','true');const route=await import('@/app/request-sample/page');await expect(route.generateMetadata()).resolves.toMatchObject({alternates:{canonical:'https://tio2malaysia.com/request-sample/'},robots:{index:false,follow:false}})})
})
