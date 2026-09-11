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

// All numeric loopback literals/quasis are forbidden in ordinary E2E, including
// assertion data. Parser test data belongs in infrastructure, never in a runnable
// browser suite where a surrounding call can later become a network request.
function fixedRuntimeUrls(path: string, text = readFileSync(path, 'utf8')): string[] {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true)
  const violations: string[] = []
  const visit = (node: ts.Node) => {
    if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      for (const match of node.text.matchAll(/https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):([0-9]+)/giu)) {
        if (!(basename(path).startsWith('prerelease-') && match[1] === '3100')) violations.push(`${path.replaceAll('\\', '/')}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1} ${node.text}`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return violations
}

test('ordinary E2E entry points cannot request a fixed historical localhost URL', () => {
  expect(sourceFiles('tests/e2e').flatMap(path => fixedRuntimeUrls(path))).toEqual([])
})

test.each([
  "expect(await request.head('http://localhost:3216/')).toBeTruthy()",
  "expect(await request.options('http://127.0.0.1:8186/')).toBeTruthy()",
  "expect('http://127.0.0.1:4024/graphql').toContain('graphql')",
  'request.get(`http://127.0.0.1:4013/${path}`)',
  'expect(`http://[::1]:3236/${path}`).toContain(path)',
  'request.get(`${prefix}http://localhost:3015/${path}`)',
  "expect('https://127.0.0.1:8443/').toBeTruthy()",
])('rejects numeric loopback literals and template quasis conservatively: %s', source => {
  expect(fixedRuntimeUrls('tests/e2e/ordinary.spec.ts', source)).toHaveLength(1)
})

test('only a prerelease basename and explicit port 3100 qualify for the fixed URL exception', () => {
  expect(fixedRuntimeUrls('tests/e2e/support/prerelease-evidence.ts', "const url = 'http://127.0.0.1:3100/'")).toEqual([])
  expect(fixedRuntimeUrls('tests/e2e/prerelease-like/ordinary.spec.ts', "const url = 'http://127.0.0.1:3100/'")).toHaveLength(1)
  expect(fixedRuntimeUrls('tests/e2e/prerelease-example.spec.ts', "const url = 'http://127.0.0.1:3101/'")).toHaveLength(1)
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
