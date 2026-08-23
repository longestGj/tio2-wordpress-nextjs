import {describe, expect, it} from 'vitest'

import {tamperTokenSegmentByte} from '@/tests/utils/tamper-token'

describe('tamperTokenSegmentByte', () => {
  it.each(['payload', 'signature'] as const)(
    'flips a decoded %s byte before re-encoding the token',
    (segment) => {
      const original = `${Buffer.from([1, 2, 3]).toString('base64url')}.${Buffer.from([4, 5, 6]).toString('base64url')}`
      const tampered = tamperTokenSegmentByte(original, segment)
      const originalBytes = original.split('.').map((part) => Buffer.from(part, 'base64url'))
      const tamperedBytes = tampered.split('.').map((part) => Buffer.from(part, 'base64url'))
      const index = segment === 'payload' ? 0 : 1

      expect(tampered).not.toBe(original)
      expect(tamperedBytes[index]).not.toEqual(originalBytes[index])
      expect(tamperedBytes[1 - index]).toEqual(originalBytes[1 - index])
    },
  )
})
