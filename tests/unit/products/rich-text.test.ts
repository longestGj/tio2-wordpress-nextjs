import {describe, expect, it} from 'vitest'

import {sanitizeProductRichText} from '@/lib/products/rich-text'

describe('Product rich-text allowlist', () => {
  it('retains approved paragraph, list, emphasis, and internal-link markup', () => {
    const html = '<p>Use <strong>representative</strong> testing with <em>real</em> formulations.</p><ol><li>Disperse</li><li>Compare <a href="/resources/testing-guide/" title="Testing guide">results</a></li></ol>'

    expect(sanitizeProductRichText(html)).toBe(
      '<p>Use <strong>representative</strong> testing with <em>real</em> formulations.</p><ol><li>Disperse</li><li>Compare <a href="/resources/testing-guide" title="Testing guide">results</a></li></ol>',
    )
  })

  it('removes scripts, event handlers, iframes, forms, and images', () => {
    const html = '<p onclick="track()">Safe <img src="https://tracker.test/pixel.gif" onerror="steal()">copy.</p><script>alert(1)</script><iframe src="https://evil.test"></iframe><form action="https://evil.test"><p>Form wrapper text.</p><input name="email"></form>'

    const sanitized = sanitizeProductRichText(html)

    expect(sanitized).toBe('<p>Safe copy.</p><p>Form wrapper text.</p>')
    expect(sanitized).not.toMatch(/script|onclick|onerror|iframe|form|img|input/)
  })

  it('removes external link targets and tracking attributes', () => {
    const html = '<p><a href="https://tracker.example/click?utm_source=site" target="_blank" rel="sponsored" data-track="cta" ping="https://tracker.example/ping">Tracked destination</a></p>'

    expect(sanitizeProductRichText(html)).toBe('<p><a>Tracked destination</a></p>')
  })

  it('blocks protocol-relative, executable, queried, and traversing link targets', () => {
    const html = '<ul><li><a href="//evil.test/x">Protocol relative</a></li><li><a href="javascript:alert(1)">Executable</a></li><li><a href="/resources/guide?utm_source=x">Query</a></li><li><a href="/resources/../private">Traversal</a></li></ul>'

    expect(sanitizeProductRichText(html)).toBe(
      '<ul><li><a>Protocol relative</a></li><li><a>Executable</a></li><li><a>Query</a></li><li><a>Traversal</a></li></ul>',
    )
  })

  it.each([
    '/tds/tp-z911',
    '/documents/tds/tp-z911.pdf',
    '/resources/private-sheet.pdf',
  ])('removes the private document target %s', (href) => {
    expect(
      sanitizeProductRichText(`<p><a href="${href}" title="Controlled document">Request it</a></p>`),
    ).toBe('<p><a>Request it</a></p>')
  })

  it('removes a safe href when another anchor attribute discloses a private location', () => {
    expect(
      sanitizeProductRichText('<p><a href="/resources/testing-guide" title="D:\\documents\\tds\\TP-Z911.pdf">Testing</a></p>'),
    ).toBe('<p><a>Testing</a></p>')
  })

  it('retains an ordinary internal guide whose slug describes TDS requests', () => {
    expect(
      sanitizeProductRichText('<p><a href="/resources/tds-request-guide">Request guide</a></p>'),
    ).toBe('<p><a href="/resources/tds-request-guide">Request guide</a></p>')
  })
})
