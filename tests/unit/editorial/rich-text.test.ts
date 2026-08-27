import {describe, expect, it} from 'vitest'

import {toApplicationPageDto} from '@/lib/applications/dto'
import {sanitizeEditorialRichText} from '@/lib/editorial/rich-text'
import {applicationHubInput} from '@/tests/fixtures/editorial/application-pages'

const resolveTarget = ({type, id}: {type: 'product'|'application'|'resource'; id: string}) => {
  const path = type === 'product' ? `/products/${id.toLowerCase()}` : `/${type}s/${id}`
  return {type, id, title: id, path, href: path}
}
const clone = <T>(value: T): T => structuredClone(value)

describe('editorial rich-text and safety boundaries', () => {
  it('allowlists visible text and safe internal links while removing hostile markup and tracking', () => {
    const sanitized = sanitizeEditorialRichText('<p onclick="track()">Safe <strong>copy</strong> <img src="x"></p><script>alert(1)</script><iframe src="x"></iframe><form><p>Visible form text.</p></form><a href="https://tracker.test/x" data-track="x">Tracked</a><a href="/resources/article-01/" title="Guide">Guide</a>')
    expect(sanitized).toBe('<p>Safe <strong>copy</strong> </p><p>Visible form text.</p><a>Tracked</a><a href="/resources/article-01" title="Guide">Guide</a>')
  })

  it.each(['<p>Download /documents/tds/controlled.pdf</p>', '<p>Open file:///D:/controlled/tds.pdf</p>', '<p>Open /tds/controlled.pdf</p>', '<p>Open C:\\controlled\\tds.pdf</p>'])('rejects private document content %s', (html) => {
    const input = clone(applicationHubInput) as any
    input.bodySections[0].html = html
    expect(() => toApplicationPageDto(input, resolveTarget)).toThrow('Invalid Application render contract')
  })

  it.each(['manufacturer', 'legal entity', 'reviewer', 'source file', 'approval', 'price', 'stock', 'availability', 'guaranteed result', 'competitor equivalent'])('rejects forbidden private or commercial claim %s', (phrase) => {
    const input = clone(applicationHubInput) as any
    input.hero.directAnswer = `<p>Synthetic content includes ${phrase}.</p>`
    expect(() => toApplicationPageDto(input, resolveTarget)).toThrow('Invalid Application render contract')
  })

  it('allows the approved request-only TDS wording', () => {
    const input = clone(applicationHubInput) as any
    input.disclaimerHtml = '<p>The current technical data sheet is available by request.</p>'
    expect(toApplicationPageDto(input, resolveTarget).disclaimerHtml).toBe(input.disclaimerHtml)
  })
})
