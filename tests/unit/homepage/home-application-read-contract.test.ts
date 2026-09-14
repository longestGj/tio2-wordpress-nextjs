import {describe, expect, it} from 'vitest'
import home from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import application from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'
import vectors from '@/tests/fixtures/home-application-read-cases.json'
import {validateMalaysiaHomepageReadContent, validateMalaysiaApplicationHubReadContent} from '@/lib/wordpress/home-application-read-contract'

function atPath(root: unknown, path: string): unknown {
  return path.split('.').reduce((node: unknown, key) => node && typeof node === 'object' ? Reflect.get(node, key) : undefined, root)
}

function caseInput(test: typeof vectors.cases[number]): unknown {
  const root = structuredClone(test.pageId === 'HOME-001' ? home : application)
  for (const mutation of test.mutations) {
    const change = mutation as {path: string; operation?: string; value?: unknown; count?: number}
    const path = change.path.split('.')
    const key = path.pop()!
    const node = (path.length ? atPath(root, path.join('.')) : root) as Record<string, unknown>
    switch (change.operation) {
      case 'delete': delete node[key]; break
      case 'append': (node[key] as unknown[]).push(change.value); break
      case 'reverse': (node[key] as unknown[]).reverse(); break
      case 'repeat': node[key] = String(change.value).repeat(change.count!); break
      case 'repeatItem': node[key] = Array.from({length: change.count!}, () => structuredClone(change.value)); break
      default: node[key] = change.value
    }
  }
  return root
}

describe('shared HOME-001 / APP-000 read vectors', () => {
  for (const test of vectors.cases) it(test.name, () => {
    const validate = test.pageId === 'HOME-001' ? validateMalaysiaHomepageReadContent : validateMalaysiaApplicationHubReadContent
    if (test.expected === 'reject') expect(() => validate(caseInput(test))).toThrow()
    else {
      const result = validate(caseInput(test))
      for (const output of test.output) {
        const expected = output as {path: string; value?: unknown; absent?: boolean}
        expect(atPath(result, expected.path)).toEqual(expected.absent ? undefined : expected.value)
      }
    }
  })
})
