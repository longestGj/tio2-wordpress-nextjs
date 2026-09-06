import {describe, expect, it} from 'vitest'

import {readBrowserQuery} from '@/lib/navigation/browser-query'

describe('readBrowserQuery', () => {
  it('returns an empty record for the statically rendered URL shell', () => {
    expect(readBrowserQuery('')).toEqual({})
  })

  it('preserves decoded values and repeated query keys for client prefill', () => {
    expect(readBrowserQuery('?grade=R-996&grade=R-902%2B&market=Malaysia')).toEqual({
      grade: ['R-996', 'R-902+'],
      market: 'Malaysia',
    })
  })
})
