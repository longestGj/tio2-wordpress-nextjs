import {readFileSync, readdirSync} from 'node:fs'
import {join, relative, resolve} from 'node:path'
import {inspectWordPressRuntime as inspectRuntime} from '../helpers/wordpress-runtime-classification'
import {describe, expect, it} from 'vitest'

const root = resolve('tests')

function testFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? testFiles(path) : /\.test\.tsx?$/u.test(path) ? [path] : []
  })
}

describe('WordPress runtime ownership classification', () => {
  const mutatingMode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true} as const;"
  const lockImport = "import {registerSharedWordPressMutationLock} from '../helpers/wordpress-test-support';"
  const sharedCall = "execute('docker', ['compose', '--project-name', 'wordpress', 'run', '--no-deps', 'wpcli', 'wp', 'post', 'list'])"
  const gatedCall = `describe.runIf(process.env.RUN === '1')('live', () => {${sharedCall}})`

  it.each([
    'infrastructure/site-a-editorial-fixture-core.test.ts',
    'integration/wordpress/site-a-application-page-draft-import-runtime.test.ts',
    'integration/wordpress/site-a-editorial-audit-runtime.test.ts',
    'integration/wordpress/site-a-editorial-draft-import-runtime.test.ts',
    'integration/wordpress/site-a-product-draft-import-runtime.test.ts',
  ])('detects the actual PHP helper caller after removing the mode from %s', path => {
    const source = readFileSync(join(root, path), 'utf8').replace(/^export const WORDPRESS_RUNTIME_MODE = .*\r?\n/mu, '')
    expect(inspectRuntime(source)).toContain('expected exactly one WORDPRESS_RUNTIME_MODE declaration, found 0')
  })

  it('classifies extracted Compose argument variables and rejects unknown Docker argument variables', () => {
    expect(inspectRuntime("const args = ['compose', 'run', '--no-deps', 'wpcli', 'wp', 'post', 'list']; spawnSync('docker', args)"))
      .toContain('expected exactly one WORDPRESS_RUNTIME_MODE declaration, found 0')
    expect(inspectRuntime("export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const; spawnSync('docker', unknownArgs)"))
      .toContain('Docker arguments cannot be statically classified')
  })

  it('fails closed when an extracted Docker array is mutated before execution', () => {
    expect(inspectRuntime("export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const; const args = ['compose', 'run']; args[1] = 'down'; spawnSync('docker', args)"))
      .toContain('Docker arguments cannot be statically classified')
  })

  it.each([
    ['import only', ''],
    ['disabled lock', 'registerSharedWordPressMutationLock(false);'],
    ['conditionally disabled lock', "registerSharedWordPressMutationLock(process.env.RUN === '1' && false);"],
    ['unrelated lock condition', "registerSharedWordPressMutationLock(process.env.OTHER === '1');"],
  ])('rejects %s for a shared mutation', (_name, registration) => {
    expect(inspectRuntime(`${lockImport}${mutatingMode}${registration}${gatedCall}`))
      .toContain('shared mutation requires an active lock registration bound to its gate')
  })

  it('does not accept an unrelated gate for an unguarded Docker call', () => {
    expect(inspectRuntime(`${lockImport}${mutatingMode}registerSharedWordPressMutationLock(true); describe.runIf(process.env.RUN === '1')('unrelated', () => {}); ${sharedCall}`))
      .toContain('shared Docker execution is not dominated by an opt-in gate')
  })

  it('also requires the gate to dominate a runtime wp call', () => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${mode}describe.runIf(process.env.RUN === '1')('unrelated', () => {}); runtime.wp(['post', 'list'])`))
      .toContain('shared Docker execution is not dominated by an opt-in gate')
  })

  it('rejects an overridden entrypoint even when the apparent WP command is read-only', () => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${mode}describe.runIf(process.env.RUN === '1')('live', () => {execute('docker', ['compose', 'run', '--no-deps', '--entrypoint', 'sh', 'wpcli', 'wp', 'post', 'list'])})`))
      .toContain('shared-read-only Compose execution options are not allowlisted')
  })

  it('does not treat evaluating the gate expression as executing its gated callback', () => {
    expect(inspectRuntime(`${lockImport}${mutatingMode}registerSharedWordPressMutationLock(true); describe.runIf((() => {${sharedCall}; return true})() && process.env.RUN === '1')('live', () => {})`))
      .toContain('shared Docker execution is not dominated by an opt-in gate')
  })

  it.each([
    "add_option('unsafe', 'value');",
    "update_field('hero_heading', 'unsafe', 1);",
    "new WP_REST_Request('POST', '/wp/v2/posts');",
    "require '/tmp/unsafe.php';",
    "$wpdb->query('INSERT INTO wp_options VALUES (1)');",
    "eval(getenv('PHP_SOURCE'));",
  ])('scans the sole reviewed PHP exception for unsafe behavior: %s', php => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    const source = `${mode}describe.runIf(process.env.RUN === '1')('live', () => {wp(['eval-file', '/workspace/tests/infrastructure/php/site-a-editorial-phase1-preview.php'])})`
    expect(inspectRuntime(source, () => '<?php ' + php)).toContain('reviewed preview helper contains mutation, SQL or dynamic execution input')
  })

  it.each([
    "['eval-file', '/workspace/tests/infrastructure/php/site-a-editorial-phase1-preview.php', 'untrusted-input']",
    "['eval-file', process.env.PREVIEW_PHP_PATH]",
  ])('does not permit caller input to extend the read-only PHP exception: %s', args => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${mode}describe.runIf(process.env.RUN === '1')('live', () => {wp(${args})})`))
      .toContain('shared-read-only WP command is not allowlisted')
  })

  it('catches removal of the real product-preview lock registration', () => {
    const source = readFileSync(join(root, 'integration/wordpress/product-preview-runtime.test.ts'), 'utf8')
      .replace(/^registerSharedWordPressMutationLock\(runLiveWordPress\)\r?\n/mu, '')
    expect(inspectRuntime(source)).toContain('shared mutation requires an active lock registration bound to its gate')
  })

  it.each([
    "['db', 'query', 'INSERT INTO wp_options VALUES (1)']",
    "['eval', 'echo 1;']",
    "['eval-file', '/workspace/arbitrary.php']",
  ])('rejects non-allowlisted read-only WP commands: %s', args => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${mode}describe.runIf(process.env.RUN === '1')('live', () => {wp(${args})})`))
      .toContain('shared-read-only WP command is not allowlisted')
  })

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
      .toContain('shared-read-only WP command is not allowlisted')
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
    expect(missingAuthorization).toContain('shared mutation requires an active lock registration bound to its gate')
    const readOnly = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const;"
    expect(inspectRuntime(`${readOnly}${gate}; wp(['eval', '$wpdb->query("UPDATE wp_posts SET post_status=1")'])`))
      .toContain('shared-read-only WP command is not allowlisted')
    expect(inspectRuntime(`${readOnly}${gate}; execute('docker', ['compose', 'run', '--rm', 'wpcli', 'wp', 'post', 'list'])`))
      .toContain('shared Compose run must include --no-deps')
  })
})
