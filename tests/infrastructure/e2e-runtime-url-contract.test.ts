import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {basename, join, resolve} from 'node:path'
import ts from 'typescript'
import {describe, expect, test} from 'vitest'

function sourceFiles(root: string): string[] {
  return readdirSync(root, {withFileTypes: true}).flatMap(entry => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|mjs)$/u.test(path) ? [path] : []
  })
}

// Regression boundary: a runnable E2E literal must never silently target an old
// listener. Parse expressions so spacing, nested fallbacks and inline requests
// cannot evade the contract; non-request assertion data remains allowed.
function fixedRuntimeUrls(path: string): string[] {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true)
  const violations: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) && /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):[0-9]+/u.test(node.text)) {
      const url = new URL(node.text)
      let assertion = false
      let request = false
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (ts.isCallExpression(parent) && /^expect(?:\.|\()/u.test(parent.getText(source))) assertion = true
        if (ts.isCallExpression(parent) && /(?:^fetch$|\.(?:get|post|put|delete|patch|goto|fetch|listen)$)/u.test(parent.expression.getText(source))) request = true
      }
      if ((!assertion || request) && !(basename(path).startsWith('prerelease-') && url.port === '3100')) {
        violations.push(`${path.replaceAll('\\', '/')}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.text}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

test('ordinary E2E entry points cannot request a fixed historical localhost URL', () => {
  expect(sourceFiles('tests/e2e').flatMap(fixedRuntimeUrls)).toEqual([])
})

describe('requiredLocalUrl', () => {
  test('fails closed for missing, remote, credentialed or wrong-path configuration', async () => {
    const modulePath = resolve('tests/e2e/support/required-local-url.ts')
    expect(existsSync(modulePath), 'The required local URL contract must be available').toBe(true)
    const {requiredLocalUrl} = await import(modulePath)
    expect(() => requiredLocalUrl('TIO2_MY_BASE_URL', '/', {})).toThrow(/TIO2_MY_BASE_URL is required/u)
    expect(requiredLocalUrl('TIO2_MY_BASE_URL', '/', {TIO2_MY_BASE_URL: 'http://127.0.0.1:32701/'}).href).toBe('http://127.0.0.1:32701/')
    expect(requiredLocalUrl('CMS_URL', '/graphql', {CMS_URL: 'http://[::1]:32702/graphql'}).href).toBe('http://[::1]:32702/graphql')
    for (const value of ['https://example.com/', 'http://192.168.1.2/', 'https://localhost/', 'invalid']) {
      expect(() => requiredLocalUrl('URL', '/', {URL: value})).toThrow(/loopback HTTP/u)
    }
    for (const value of ['http://user@localhost:32701/', 'http://localhost:32701/?q=1', 'http://localhost:32701/#x', 'http://localhost:32701/graphql']) {
      expect(() => requiredLocalUrl('URL', '/', {URL: value})).toThrow(/path \/ without credentials, query, or fragment/u)
    }
  })
})
