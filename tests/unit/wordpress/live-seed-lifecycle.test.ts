import {describe, expect, it, vi} from 'vitest'

import {runUnconditionalRestore} from '@/tests/integration/wordpress/live-seed-lifecycle'

describe('live WordPress seed restoration lifecycle', () => {
  it('attempts every cleanup, restore, and audit after an earlier failure', () => {
    const calls: string[] = []
    const primary = new Error('primary cleanup failure')

    expect(() =>
      runUnconditionalRestore({
        cleanup: [
          () => {
            calls.push('cleanup-one')
            throw primary
          },
          () => calls.push('cleanup-two'),
        ],
        restore: () => calls.push('restore'),
        audit: () => calls.push('audit'),
      }),
    ).toThrow(primary)
    expect(calls).toEqual(['cleanup-one', 'cleanup-two', 'restore', 'audit'])
  })

  it('preserves the first failure while still attempting audit after restore failure', () => {
    const primary = new Error('fixture cleanup failed')
    const restore = new Error('restore failed')
    const audit = vi.fn()

    let thrown: unknown
    try {
      runUnconditionalRestore({
        cleanup: [() => {
          throw primary
        }],
        restore: () => {
          throw restore
        },
        audit,
      })
    } catch (error) {
      thrown = error
    }

    expect(thrown).toBe(primary)
    expect(audit).toHaveBeenCalledOnce()
    expect((primary as Error & {suppressed?: unknown[]}).suppressed).toEqual([
      restore,
    ])
  })
})
