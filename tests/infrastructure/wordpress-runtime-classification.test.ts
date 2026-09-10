import {readFileSync, readdirSync} from 'node:fs'
import {join, relative, resolve} from 'node:path'
import ts from 'typescript'
import {describe, expect, it} from 'vitest'

const root = resolve('tests')

function testFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? testFiles(path) : /\.test\.tsx?$/u.test(path) ? [path] : []
  })
}

function inspectRuntime(source: string) {
  const file = ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  source = ts.createPrinter({removeComments: true}).printFile(file)
  const declarations: ts.VariableDeclaration[] = []
  const composeCalls: string[] = []
  let executesCompose = false
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(file) === 'WORDPRESS_RUNTIME_MODE') declarations.push(node)
    if (ts.isCallExpression(node)) {
      const command = node.arguments[0]
      const args = node.arguments[1]
      if (command && ts.isStringLiteral(command) && command.text === 'docker' && args
        && /['"]compose['"]|wordpressComposeArgs\(/u.test(args.getText(file))) {
        executesCompose = true
        composeCalls.push(args.getText(file))
      }
      if (node.expression.getText(file) === 'startIsolatedWordPress') executesCompose = true
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  if (!executesCompose && declarations.length === 0) return []
  if (declarations.length !== 1) return [`expected exactly one WORDPRESS_RUNTIME_MODE declaration, found ${declarations.length}`]
  const declaration = declarations[0]
  const statement = declaration.parent.parent
  const errors: string[] = []
  if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
    errors.push('runtime mode must be exported')
  }
  let initializer = declaration.initializer
  if (initializer && ts.isAsExpression(initializer)) initializer = initializer.expression
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return [...errors, 'runtime mode must be a literal object']
  const fields = new Map(initializer.properties.filter(ts.isPropertyAssignment).map(property => [property.name.getText(file), property.initializer.getText(file)]))
  const mode = fields.get('dataMode')?.replace(/['"]/gu, '')
  if (!['isolated', 'shared-read-only', 'shared-mutating'].includes(mode ?? '')) errors.push('unknown dataMode')
  if (!['true', 'false'].includes(fields.get('hostHttp') ?? '')) errors.push('hostHttp must be explicit')
  if (mode?.startsWith('shared')) {
    // Shared consumers must not acquire lifecycle authority, including implicit dependency startup.
    if (/['"](?:up|down|stop|start|restart|rm)['"]/u.test(source)) errors.push('shared suite contains a Compose lifecycle command')
    if (!/describe\.(?:runIf|skipIf)|it\.(?:runIf|skipIf)/u.test(source) || !/process\.env[.[]/u.test(source)) errors.push('shared suite must be environment gated')
    if (composeCalls.some(args => /['"]run['"]/u.test(args) && !args.includes('--no-deps'))) errors.push('shared Compose run must include --no-deps')
  }
  if (mode === 'shared-read-only' && /['"](?:eval-file|create|update|delete|set|add|install|activate|deactivate|import|reset)['"]|\b(?:wp_insert_post|wp_update_post|wp_delete_post|update_post_meta|delete_post_meta|wp_set_object_terms|update_option|delete_option)\s*\(|\$wpdb\s*->\s*(?:insert|update|delete|query)\s*\(|WP_CLI::(?:runcommand|launch_self)\s*\(/u.test(source)) {
    errors.push('shared-read-only suite contains a WP-CLI mutation or unrestricted PHP command')
  }
  if (mode === 'shared-mutating') {
    if (fields.get('serialMutationAuthorized') !== 'true') errors.push('shared mutation requires serialMutationAuthorized: true')
    if (!/GET_LOCK|acquireSharedWordPressMutation|registerSharedWordPressMutationLock/u.test(source)) errors.push('shared mutation requires a lock')
  }
  if (/wordpressComposeArgs\(\s*\)/u.test(source)) errors.push('Compose calls require explicit runtime options')
  return errors
}

describe('WordPress runtime ownership classification', () => {
  it('rejects undeclared Docker Compose callers and unsafe shared capabilities', () => {
    const failures = testFiles(root).flatMap(path => inspectRuntime(readFileSync(path, 'utf8')).map(error => `${relative(root, path)}: ${error}`))
    expect(failures, failures.join('\n')).toEqual([])
  })

  it('does not let comments, duplicate declarations or a mutating read-only suite satisfy the guard', () => {
    const call = "execute('docker', ['compose', 'run', '--no-deps', 'wpcli', 'wp', 'post', 'list'])"
    expect(inspectRuntime(`// export const WORDPRESS_RUNTIME_MODE = {}\n${call}`)).toContain('expected exactly one WORDPRESS_RUNTIME_MODE declaration, found 0')
    const declaration = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${declaration}${declaration}${call}`)).toContain('expected exactly one WORDPRESS_RUNTIME_MODE declaration, found 2')
    expect(inspectRuntime(`${declaration}describe.runIf(process.env.RUN === '1')('x', () => {${call}; wp(['post', 'update', '1'])})`))
      .toContain('shared-read-only suite contains a WP-CLI mutation or unrestricted PHP command')
  })

  it('rejects runtime-helper callers without a declaration and authorization outside the mode', () => {
    expect(inspectRuntime("startIsolatedWordPress({dataMode: 'isolated', runId: 'example', hostHttp: false})"))
      .toContain('expected exactly one WORDPRESS_RUNTIME_MODE declaration, found 0')
    const declaration = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false} as const;"
    expect(inspectRuntime(`${declaration}const unrelated = {serialMutationAuthorized: true}; describe.runIf(process.env.RUN === '1')('x', () => {}); registerSharedWordPressMutationLock(true)`))
      .toContain('shared mutation requires serialMutationAuthorized: true')
  })

  it('rejects comment-only authorization, direct SQL writes and implicit shared dependency startup', () => {
    const mutation = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false} as const;"
    const gate = "describe.runIf(process.env.RUN === '1')('x', () => {})"
    const missingAuthorization = inspectRuntime(`${mutation}\n// serialMutationAuthorized: true; GET_LOCK\n${gate}`)
    expect(missingAuthorization).toContain('shared mutation requires serialMutationAuthorized: true')
    expect(missingAuthorization).toContain('shared mutation requires a lock')
    const readOnly = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${readOnly}${gate}; wp(['eval', '$wpdb->query("UPDATE wp_posts SET post_status=1")'])`))
      .toContain('shared-read-only suite contains a WP-CLI mutation or unrestricted PHP command')
    expect(inspectRuntime(`${readOnly}${gate}; execute('docker', ['compose', 'run', '--rm', 'wpcli', 'wp', 'post', 'list'])`))
      .toContain('shared Compose run must include --no-deps')
  })
})
