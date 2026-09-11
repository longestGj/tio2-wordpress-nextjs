import {readFileSync} from 'node:fs'
import {dirname, resolve} from 'node:path'
import ts from 'typescript'

export const READ_ONLY_PREVIEW_PATH = '/workspace/tests/infrastructure/php/site-a-editorial-phase1-preview.php'

/**
 * A deliberately narrow language for this one reviewed probe, not a PHP parser.
 * Unknown tokens/call targets fail closed. The probe needs no database access.
 */
export function inspectReadOnlyPreviewPhp(source: string): string[] {
  const reject = ['reviewed preview helper contains mutation, SQL or dynamic execution input']
  const opening = /^\s*<\?php\s/u.exec(source)
  if (!opening || source.includes('?>')) return reject
  const body = source.slice(opening[0].length)
  // No interpolation, escape sequences, variable variables, namespaces, heredocs,
  // shell strings or unrecognized operators are admitted by this small vocabulary.
  const token = /\s+|\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|'[^'\\\r\n]*'|\$[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*|[0-9]+|=>|->|[\[\]{}(),:;.=!]/uy
  const tokens: string[] = []
  for (let position = 0; position < body.length;) {
    token.lastIndex = position
    const match = token.exec(body)
    if (!match) return reject
    const value = match[0]
    position = token.lastIndex
    if (!/^\s|^\/\/|^\/\*/u.test(value)) tokens.push(value)
  }
  const probe = 'tio2_read_only_editorial_preview_probe'
  const functions = new Set([probe, 'tio2_get_preview_config', 'is_array', 'time', 'hash_hmac',
    'tio2_preview_signature_message', 'rest_do_request', 'apply_filters', 'rest_get_server', 'wp_json_encode',
    'WP_REST_Request', 'RuntimeException'])
  const keywords = new Set(['function', 'string', 'array', 'if', 'throw', 'new', 'return', 'foreach', 'as', 'echo'])
  const variables = new Set(['$site_id', '$path', '$config', '$timestamp', '$request', '$response', '$paths', '$targets', '$closed'])
  const methods = new Map([
    ['$request', new Set(['set_param', 'set_header'])],
    ['$response', new Set(['get_status', 'get_headers', 'get_data'])],
  ])
  const brackets: string[] = []
  for (let index = 0; index < tokens.length; index++) {
    const value = tokens[index], previous = tokens[index - 1], next = tokens[index + 1]
    if (value.startsWith('$') && !variables.has(value)) return reject
    if (value === 'new' && (!['WP_REST_Request', 'RuntimeException'].includes(next) || tokens[index + 2] !== '(')) return reject
    if (value === 'function' && next !== probe) return reject
    if (value === '->' && (!methods.get(previous)?.has(next) || tokens[index + 2] !== '(')) return reject
    if (/^[A-Za-z_]/u.test(value)) {
      const method = previous === '->'
      if (!functions.has(value) && !keywords.has(value) && !method) return reject
      if (next === '(' && !method && !functions.has(value) && !['if', 'foreach'].includes(value)) return reject
      if (value === 'WP_REST_Request' && (tokens[index + 2] !== "'GET'" || tokens[index + 3] !== ','
        || tokens[index + 4] !== "'/tio2/v1/preview'" || tokens[index + 5] !== ')')) return reject
      if (value === 'apply_filters' && tokens[index + 2] !== "'rest_post_dispatch'") return reject
    }
    if (value === '(' && previous && (previous.startsWith('$') || previous.startsWith("'") || [')', ']', '}'].includes(previous))) return reject
    if (value === '.' && (previous === '.' || next === '.')) return reject
    if (value === ':' && (previous === ':' || next === ':')) return reject
    if (['(', '[', '{'].includes(value)) brackets.push(value)
    if ([')', ']', '}'].includes(value) && brackets.pop() !== ({')': '(', ']': '[', '}': '{'} as Record<string, string>)[value]) return reject
  }
  return brackets.length ? reject : []
}

type Word = string | {kind: 'compose' | 'php' | 'unknown'}
const intersects = (sets: Set<string>[]) => sets.length ? new Set([...sets[0]].filter(item => sets.every(set => set.has(item)))) : new Set<string>()

/** Conservative source proof: unknown arguments/control flow fail closed. */
export function inspectWordPressRuntime(source: string, readPreview = () => readFileSync(resolve('tests/infrastructure/php/site-a-editorial-phase1-preview.php'), 'utf8'), sourcePath = resolve('tests/infrastructure/classification-input.test.ts')): string[] {
  const file = ts.createSourceFile('test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declarations: ts.VariableDeclaration[] = []
  const variables = new Map<string, ts.Expression | null>()
  const imports = new Map<string, {name: string; from: string}>()
  const runtimeNamespaces = new Set<string>()
  const calls: ts.CallExpression[] = []
  const memberAccesses: (ts.PropertyAccessExpression | ts.ElementAccessExpression)[] = []
  const identifiers: ts.Identifier[] = []
  const runtimeModule = (name: string) => name.startsWith('.')
    && resolve(dirname(sourcePath), name.replace(/\.ts$/u, '') + '.ts') === resolve('tests/helpers/wordpress-runtime.ts')
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings
      if (bindings && ts.isNamespaceImport(bindings) && runtimeModule(node.moduleSpecifier.text)) runtimeNamespaces.add(bindings.name.text)
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
        imports.set(binding.name.text, {name: binding.propertyName?.text ?? binding.name.text, from: node.moduleSpecifier.text})
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.name.text === 'WORDPRESS_RUNTIME_MODE') declarations.push(node)
      const immutable = ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const) !== 0
      variables.set(node.name.text, variables.has(node.name.text) || !immutable ? null : node.initializer ?? null)
      const awaited = node.initializer
      if (awaited && ts.isAwaitExpression(awaited) && ts.isCallExpression(awaited.expression)
        && awaited.expression.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(awaited.expression.arguments[0])
        && runtimeModule(awaited.expression.arguments[0].text)) runtimeNamespaces.add(node.name.text)
    }
    if (ts.isIdentifier(node)) identifiers.push(node)
    if (ts.isCallExpression(node)) calls.push(node)
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) memberAccesses.push(node)
    ts.forEachChild(node, visit)
  }
  visit(file)
  const memberName = (node: ts.PropertyAccessExpression | ts.ElementAccessExpression) => {
    if (ts.isPropertyAccessExpression(node)) return node.name.text
    const key = unwrap(node.argumentExpression)
    return ts.isStringLiteral(key) ? key.text : ''
  }
  const callName = (call: ts.CallExpression) => ts.isIdentifier(call.expression)
    ? imports.get(call.expression.text)?.name ?? call.expression.text
    : ts.isPropertyAccessExpression(call.expression) || ts.isElementAccessExpression(call.expression) ? memberName(call.expression) : ''
  for (const identifier of identifiers) {
    let target: ts.Node = identifier
    while ((ts.isPropertyAccessExpression(target.parent) || ts.isElementAccessExpression(target.parent)) && target.parent.expression === target) target = target.parent
    const parent = target.parent
    const assignment = ts.isBinaryExpression(parent) && parent.left === target
      && parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
    const methodCall = target !== identifier && ts.isCallExpression(parent) && parent.expression === target
    if (assignment || methodCall) variables.set(identifier.text, null)
  }
  function unwrap(input: ts.Expression, seen = new Set<string>()): ts.Expression {
    let node = input
    while (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) node = node.expression
    if (ts.isIdentifier(node) && variables.get(node.text) && !seen.has(node.text)) {
      return unwrap(variables.get(node.text)!, new Set([...seen, node.text]))
    }
    return node
  }
  function words(input?: ts.Expression): Word[] | null {
    if (!input) return null
    const node = unwrap(input)
    if (ts.isCallExpression(node)) {
      if (callName(node) === 'wordpressComposeArgs') {
        executedComposeHelpers.add(node)
        return [{kind: 'compose'}]
      }
      if (callName(node) === 'isolatedPhpArgs') return [{kind: 'php'}]
    }
    if (!ts.isArrayLiteralExpression(node)) return null
    return node.elements.flatMap(element => {
      if (ts.isSpreadElement(element)) return words(element.expression) ?? [{kind: 'unknown'}]
      const value = unwrap(element)
      return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? [value.text] : [{kind: 'unknown'}]
    })
  }
  function gate(input: ts.Expression, active = true): Set<string> {
    const node = unwrap(input)
    if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.ExclamationToken) return gate(node.operand, !active)
    if (ts.isCallExpression(node) && callName(node) === 'Boolean' && node.arguments.length === 1) return gate(node.arguments[0], active)
    const text = node.getText(file)
    if (/^process\.env(?:\.[A-Z0-9_]+|\[['"][A-Z0-9_]+['"]\])$/u.test(text)) return new Set(active ? [text + ':truthy'] : [])
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind
      if (operator === ts.SyntaxKind.AmpersandAmpersandToken || operator === ts.SyntaxKind.BarBarToken) {
        const sides = [gate(node.left, active), gate(node.right, active)]
        const allRequired = (operator === ts.SyntaxKind.AmpersandAmpersandToken) === active
        return allRequired ? new Set(sides.flatMap(set => [...set])) : intersects(sides)
      }
      const equals = operator === ts.SyntaxKind.EqualsEqualsEqualsToken || operator === ts.SyntaxKind.EqualsEqualsToken
      const differs = operator === ts.SyntaxKind.ExclamationEqualsEqualsToken || operator === ts.SyntaxKind.ExclamationEqualsToken
      if ((equals || differs) && active === equals) {
        const left = unwrap(node.left), right = unwrap(node.right)
        if (ts.isStringLiteral(right) && right.text === '1' && /^process\.env[.[]/u.test(left.getText(file))) return new Set([left.getText(file) + ':1'])
      }
    }
    return new Set()
  }
  function gateOnRegistration(node: ts.CallExpression): Set<string> {
    let expression: ts.Expression = node
    while (ts.isCallExpression(expression) || ts.isPropertyAccessExpression(expression)) {
      if (ts.isPropertyAccessExpression(expression)) {
        expression = expression.expression
        continue
      }
      if (ts.isPropertyAccessExpression(expression.expression)
        && ['runIf', 'skipIf'].includes(expression.expression.name.text) && expression.arguments[0]) {
        const owner = expression.expression.expression.getText(file)
        if (owner === 'describe' || owner === 'it' || owner === 'test') return gate(expression.arguments[0], expression.expression.name.text === 'runIf')
      }
      expression = expression.expression
    }
    return new Set()
  }
  const abrupt = (statement: ts.Statement): boolean => ts.isReturnStatement(statement) || ts.isThrowStatement(statement)
    || ts.isBlock(statement) && statement.statements.length > 0 && abrupt(statement.statements[statement.statements.length - 1])
  function functionName(node: ts.Node): string | null {
    if (ts.isFunctionDeclaration(node)) return node.name?.text ?? null
    if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)) return node.parent.name.text
    return null
  }
  function reference(node: ts.Identifier, name: string): boolean {
    if (node.text !== name) return false
    const parent = node.parent
    if ((ts.isFunctionDeclaration(parent) || ts.isVariableDeclaration(parent) || ts.isParameter(parent)) && parent.name === node) return false
    if (ts.isPropertyAccessExpression(parent) && parent.name === node) return false
    if (ts.isPropertyAssignment(parent) && parent.name === node) return false
    return !ts.isImportSpecifier(parent)
  }
  function guardsFor(node: ts.Node, visited = new Set<ts.Node>()): Set<string> {
    const direct = new Set<string>()
    let namedFunction: ts.Node | null = null
    for (let current: ts.Node = node; current.parent; current = current.parent) {
      const parent = current.parent
      if (ts.isCallExpression(parent) && ts.isCallExpression(parent.expression)
        && parent.arguments.some(argument => argument === current)
        && (ts.isArrowFunction(current) || ts.isFunctionExpression(current) || ts.isIdentifier(current))) {
        for (const item of gateOnRegistration(parent)) direct.add(item)
      }
      if (ts.isIfStatement(parent)) {
        const active = parent.thenStatement === current
        if (active || parent.elseStatement === current) for (const item of gate(parent.expression, active)) direct.add(item)
      }
      if (ts.isBlock(parent)) {
        const index = parent.statements.findIndex(statement => statement === current)
        for (const preceding of parent.statements.slice(0, Math.max(0, index))) {
          if (ts.isIfStatement(preceding) && abrupt(preceding.thenStatement)) for (const item of gate(preceding.expression, false)) direct.add(item)
        }
      }
      if (!namedFunction && functionName(parent)) namedFunction = parent
    }
    if (direct.size || !namedFunction || visited.has(namedFunction)) return direct
    const name = functionName(namedFunction)!
    const next = new Set([...visited, namedFunction])
    const usages = identifiers.filter(identifier => reference(identifier, name))
    return intersects(usages.map(usage => guardsFor(usage, next)))
  }

  const errors: string[] = []
  const executedComposeHelpers = new Set<ts.CallExpression>()
  const composeCalls: {node: ts.CallExpression; args: Word[]}[] = []
  const runtimeCalls = calls.filter(call => callName(call) === 'startIsolatedWordPress')
  const sharedSinks: ts.CallExpression[] = []
  let scoped = false
  for (const member of memberAccesses) {
    if (memberName(member) !== 'startIsolatedWordPress') continue
    scoped = true
    if (!ts.isCallExpression(member.parent) || member.parent.expression !== member) errors.push('runtime factory escapes static ownership proof')
  }
  for (const identifier of identifiers) {
    if (runtimeNamespaces.has(identifier.text) && reference(identifier, identifier.text) && !ts.isNamespaceImport(identifier.parent)) {
      const member = identifier.parent
      scoped = true
      if (!(ts.isPropertyAccessExpression(member) || ts.isElementAccessExpression(member)) || member.expression !== identifier
        || memberName(member) !== 'startIsolatedWordPress' || !ts.isCallExpression(member.parent) || member.parent.expression !== member) {
        errors.push('runtime namespace escapes static ownership proof')
      }
    }
    if ((imports.get(identifier.text)?.name ?? identifier.text) !== 'startIsolatedWordPress'
      || !reference(identifier, identifier.text)) continue
    scoped = true
    if (!ts.isCallExpression(identifier.parent) || identifier.parent.expression !== identifier) errors.push('runtime factory escapes static ownership proof')
  }
  for (const call of calls) {
    const name = callName(call)
    if (['wordpressComposeArgs', 'startIsolatedWordPress', 'isolatedPhpArgs'].includes(name)) scoped = true
    if (name === 'startIsolatedWordPress' || name === 'wp') sharedSinks.push(call)
    const command = call.arguments[0] && unwrap(call.arguments[0])
    if (!command || !ts.isStringLiteral(command) || command.text !== 'docker' || call.arguments.length < 2) continue
    const args = words(call.arguments[1])
    if (!args || typeof args[0] !== 'string' && args[0]?.kind === 'unknown') {
      errors.push('Docker arguments cannot be statically classified')
      scoped = true
    } else if (args[0] === 'compose' || typeof args[0] !== 'string' && args[0]?.kind === 'compose') {
      scoped = true
      composeCalls.push({node: call, args})
      sharedSinks.push(call)
    } else if (typeof args[0] !== 'string' && args[0]?.kind === 'php') scoped = true
  }
  if (!scoped && declarations.length === 0) return errors
  if (declarations.length !== 1) return [...errors, 'expected exactly one WORDPRESS_RUNTIME_MODE declaration, found ' + declarations.length]
  const declaration = declarations[0]
  const statement = declaration.parent.parent
  if (!ts.isVariableStatement(statement) || !statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) errors.push('runtime mode must be exported')
  const initializer = declaration.initializer && unwrap(declaration.initializer)
  if (!initializer || !ts.isObjectLiteralExpression(initializer)) return [...errors, 'runtime mode must be a literal object']
  const fields = new Map(initializer.properties.filter(ts.isPropertyAssignment).map(property => [property.name.getText(file), property.initializer.getText(file)]))
  const mode = fields.get('dataMode')?.replace(/['"]/gu, '')
  if (!['isolated', 'shared-read-only', 'shared-mutating'].includes(mode ?? '')) errors.push('unknown dataMode')
  if (!['true', 'false'].includes(fields.get('hostHttp') ?? '')) errors.push('hostHttp must be explicit')
  if (calls.some(call => callName(call) === 'wordpressComposeArgs' && call.arguments.length === 0)) errors.push('Compose calls require explicit runtime options')

  // Only the exported, immutable declaration may be spread into an executed
  // helper. Do not resolve aliases/dynamic expressions into apparent authority.
  const stripSyntax = (input: ts.Expression): ts.Expression => {
    while (ts.isParenthesizedExpression(input) || ts.isAsExpression(input) || ts.isSatisfiesExpression(input)) input = input.expression
    return input
  }
  const literalFields = (input: ts.Expression | undefined, allowMode: boolean): Map<string, string> | null => {
    if (!input) return null
    const node = stripSyntax(input)
    const isMode = (expression: ts.Expression) => ts.isIdentifier(expression)
      && expression.text === 'WORDPRESS_RUNTIME_MODE' && variables.get(expression.text) === declaration.initializer
    if (allowMode && isMode(node)) return literalFields(declaration.initializer, false)
    if (!ts.isObjectLiteralExpression(node)) return null
    const result = new Map<string, string>()
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        if (!allowMode || !isMode(stripSyntax(property.expression))) return null
        const spread = literalFields(declaration.initializer, false)
        if (!spread) return null
        for (const [key, value] of spread) {
          if (result.has(key)) return null
          result.set(key, value)
        }
        continue
      }
      if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) return null
      const key = property.name.text
      if (result.has(key)) return null
      const value = stripSyntax(property.initializer)
      if (['dataMode', 'hostHttp', 'serialMutationAuthorized'].includes(key)) {
        if (key === 'dataMode' ? !ts.isStringLiteral(value)
          : value.kind !== ts.SyntaxKind.TrueKeyword && value.kind !== ts.SyntaxKind.FalseKeyword) return null
        result.set(key, ts.isStringLiteral(value) ? value.text : value.getText(file))
      } else result.set(key, '<non-authority>')
    }
    return result
  }
  const declared = literalFields(declaration.initializer, false)
  if (!declared || variables.get('WORDPRESS_RUNTIME_MODE') !== declaration.initializer) errors.push('runtime mode must be an immutable literal without aliases or spreads')
  for (const identifier of identifiers.filter(node => reference(node, 'WORDPRESS_RUNTIME_MODE'))) {
    const parent = identifier.parent
    if (ts.isSpreadAssignment(parent) || ts.isTypeQueryNode(parent) || ts.isPropertyAccessExpression(parent)) continue
    if (ts.isCallExpression(parent) && ['wordpressComposeArgs', 'startIsolatedWordPress'].includes(callName(parent)) && parent.arguments[0] === identifier) continue
    errors.push('runtime mode escapes static ownership proof')
  }
  for (const helper of executedComposeHelpers) {
    const executed = literalFields(helper.arguments[0], true)
    if (!executed || !declared || ['dataMode', 'hostHttp', 'serialMutationAuthorized'].some(key => executed.get(key) !== declared.get(key))) {
      errors.push('executed Compose options do not prove the declared runtime mode')
    }
  }
  const bindingCount = (name: string) => identifiers.filter(identifier => {
    const parent = identifier.parent
    return identifier.text === name && (ts.isVariableDeclaration(parent) || ts.isParameter(parent)
      || ts.isBindingElement(parent) || ts.isFunctionDeclaration(parent)) && parent.name === identifier
  }).length
  const simulatedExecutor = (input?: ts.Expression): boolean => {
    if (!input) return false
    let options = stripSyntax(input)
    // Retain the exact argument object for the helper's caller-mutation tests.
    if (ts.isBinaryExpression(options) && options.operatorToken.kind === ts.SyntaxKind.EqualsToken
      && ts.isIdentifier(options.left)) options = stripSyntax(options.right)
    if (!ts.isObjectLiteralExpression(options)) return false
    // A spread may supply changing test options, but it can never replace the
    // final fixed executor. The trusted factory accepts no caller executor and
    // freezes this capability; merely naming a callback "execute" is no proof.
    const last = options.properties.at(-1)
    if (!last || !ts.isPropertyAssignment(last) || !ts.isIdentifier(last.name) || last.name.text !== 'execute'
      || options.properties.filter(property => ts.isPropertyAssignment(property) && property.name.getText(file) === 'execute').length !== 1) return false
    const executor = stripSyntax(last.initializer)
    if (!ts.isPropertyAccessExpression(executor) || executor.name.text !== 'execute' || !ts.isIdentifier(executor.expression)) return false
    const owner = executor.expression.text
    const initializer = variables.get(owner)
    if (!initializer || bindingCount(owner) !== 1) return false
    const awaited = stripSyntax(initializer)
    if (!ts.isAwaitExpression(awaited)) return false
    const factory = stripSyntax(awaited.expression)
    if (!ts.isCallExpression(factory) || !ts.isIdentifier(factory.expression) || bindingCount(factory.expression.text) !== 0) return false
    const imported = imports.get(factory.expression.text)
    return imported?.name === 'createWordPressRuntimeSimulation' && imported.from.startsWith('.')
      && resolve(dirname(sourcePath), imported.from.replace(/\.ts$/u, '') + '.ts') === resolve('tests/helpers/wordpress-runtime-simulation.ts')
  }
  for (const runtime of runtimeCalls) {
    const executed = literalFields(runtime.arguments[0], true)
    if (!simulatedExecutor(runtime.arguments[0]) && (!executed || !declared || executed.has('execute')
      || ['dataMode', 'hostHttp', 'serialMutationAuthorized'].some(key => executed.get(key) !== declared.get(key)))) {
      errors.push('executed runtime options do not prove the declared runtime mode')
    }
  }
  if (mode === 'isolated') for (const {args} of composeCalls) {
    if (args[0] !== 'compose') continue
    const projectIndex = args.findIndex(arg => arg === '--project-name' || arg === '-p')
    const project = args[projectIndex + 1]
    // Direct Docker config rendering is the existing no-lifecycle test surface.
    // A direct runnable command has no proof of the helper's isolated topology.
    let index = 1
    while (typeof args[index] === 'string' && ['--project-name', '-p', '--env-file', '-f'].includes(args[index] as string)) index += 2
    if (projectIndex < 0 || typeof project !== 'string' || !project.startsWith('d16-test-') || args[index] !== 'config') {
      errors.push('direct Compose target cannot be masked by an isolated declaration')
    }
  }

  const sinkGates = sharedSinks.map(sink => guardsFor(sink))
  if (mode?.startsWith('shared')) {
    if (sharedSinks.length && sinkGates.some(gates => gates.size === 0)) errors.push('shared Docker execution is not dominated by an opt-in gate')
    if (!sharedSinks.length && !calls.some(call => gateOnRegistration(call).size > 0)) errors.push('shared suite must be environment gated')
    for (const {args} of composeCalls) {
      let index = 1
      while (typeof args[index] === 'string' && ['--project-name', '-p', '--env-file', '-f'].includes(args[index] as string)) index += 2
      const command = args[index]
      if (typeof command !== 'string' || !['run', 'port', 'config', 'ps'].includes(command)) errors.push('shared suite contains a Compose lifecycle or unknown command')
      if (command === 'run' && !args.includes('--no-deps')) errors.push('shared Compose run must include --no-deps')
    }
  }
  if (mode === 'shared-mutating') {
    if (fields.get('serialMutationAuthorized') !== 'true') errors.push('shared mutation requires serialMutationAuthorized: true')
    const registrations = calls.filter(call => callName(call) === 'registerSharedWordPressMutationLock'
      && ts.isIdentifier(call.expression) && imports.get(call.expression.text)?.from.endsWith('/wordpress-test-support')
      && ts.isExpressionStatement(call.parent) && call.parent.parent === file)
    const valid = registrations.some(call => {
      if (!call.arguments[0]) return false
      if (unwrap(call.arguments[0]).kind === ts.SyntaxKind.TrueKeyword) return true
      let condition = unwrap(call.arguments[0])
      if (ts.isCallExpression(condition) && callName(condition) === 'Boolean' && condition.arguments.length === 1) condition = unwrap(condition.arguments[0])
      if (ts.isBinaryExpression(condition) && ![ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(condition.operatorToken.kind)) return false
      if (!ts.isBinaryExpression(condition) && !ts.isPropertyAccessExpression(condition) && !ts.isElementAccessExpression(condition)) return false
      const enabled = gate(condition)
      return enabled.size > 0 && sinkGates.length > 0 && sinkGates.every(gates => [...enabled].every(item => gates.has(item)))
    })
    if (!valid) errors.push('shared mutation requires an active lock registration bound to its gate')
  }
  if (mode === 'shared-read-only') {
    const allowed = new Set(['core version', 'core is-installed', 'option get', 'option list', 'post get', 'post list',
      'post meta get', 'post meta list', 'term get', 'term list', 'user get', 'user list', 'plugin list', 'plugin status', 'theme list'])
    const wpCommands: (Word[] | null)[] = composeCalls.map(({args}) => {
      const wp = args.indexOf('wp')
      const run = args.indexOf('run'), service = args.indexOf('wpcli')
      let validOptions = run >= 0 && service > run && service + 1 === wp
      for (let index = run + 1; validOptions && index < service; index++) {
        if (['--rm', '--no-deps', '--no-TTY', '-T'].includes(args[index] as string)) continue
        if (['--user', '-u'].includes(args[index] as string) && typeof args[index + 1] === 'string') { index++; continue }
        validOptions = false
      }
      if (!validOptions) errors.push('shared-read-only Compose execution options are not allowlisted')
      return wp < 0 ? null : args.slice(wp + 1)
    })
    for (const call of calls) if (callName(call) === 'wp') wpCommands.push(words(call.arguments[0]))
    for (const args of wpCommands) {
      const exactPreview = args?.length === 2 && args[0] === 'eval-file' && args[1] === READ_ONLY_PREVIEW_PATH
      if (exactPreview) {
        try { errors.push(...inspectReadOnlyPreviewPhp(readPreview())) } catch { errors.push('reviewed preview helper is unavailable') }
        continue
      }
      const length = args?.[1] === 'meta' ? 3 : 2
      if (!args || args.some(arg => typeof arg !== 'string') || !allowed.has(args.slice(0, length).join(' '))
        || args.some(arg => typeof arg === 'string' && (/^--(?:require|exec|ssh|http|path|config)(?:=|$)/u.test(arg) || arg.startsWith('@')))) errors.push('shared-read-only WP command is not allowlisted')
    }
  }
  return [...new Set(errors)]
}
