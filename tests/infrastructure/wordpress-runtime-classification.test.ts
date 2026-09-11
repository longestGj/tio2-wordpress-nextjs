import {readFileSync, readdirSync} from 'node:fs'
import {join, relative, resolve} from 'node:path'
import {inspectReadOnlyPreviewPhp, inspectWordPressRuntime as inspectRuntime} from '../helpers/wordpress-runtime-classification'
import {describe, expect, it} from 'vitest'

const root = resolve('tests')

function testFiles(directory: string): string[] {
  return readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? testFiles(path) : /\.test\.tsx?$/u.test(path) ? [path] : []
  })
}

describe('WordPress runtime ownership classification', () => {
  const isolatedMode = "export const WORDPRESS_RUNTIME_MODE = {dataMode:'isolated', hostHttp:false} as const;"
  const runtimeImport = "import {startIsolatedWordPress} from '../helpers/wordpress-runtime';"
  const simulationImport = "import {createWordPressRuntimeSimulation} from '../helpers/wordpress-runtime-simulation';"

  it.each(['startIsolatedWordPress', 'launchWordPress'])('binds a live runtime helper imported as %s to the declaration', name => {
    const imported = `import {startIsolatedWordPress${name === 'startIsolatedWordPress' ? '' : ` as ${name}`}} from '../helpers/wordpress-runtime';`
    expect(inspectRuntime(`${imported}${isolatedMode}const runtime = await ${name}({dataMode:'shared-mutating', hostHttp:false, serialMutationAuthorized:true, runId:'unsafe'}); await runtime.wp(['option','update','unsafe','yes']);`))
      .toContain('executed runtime options do not prove the declared runtime mode')
  })

  it.each([
    "{dataMode:'shared-read-only', hostHttp:false, runId:'x'}",
    "{dataMode:mode, hostHttp:false, runId:'x'}",
    "{...WORDPRESS_RUNTIME_MODE, ...unknown}",
    "{...WORDPRESS_RUNTIME_MODE, hostHttp:true}",
    'options',
    'condition ? WORDPRESS_RUNTIME_MODE : options',
    '',
    "{dataMode:'shared-mutating', hostHttp:false, serialMutationAuthorized:true, execute:unknownExecutor}",
  ])('fails closed for runtime options that cannot prove authority: %s', options => {
    expect(inspectRuntime(`${runtimeImport}${isolatedMode}startIsolatedWordPress(${options});`))
      .toContain('executed runtime options do not prove the declared runtime mode')
  })

  it('rejects the converse live runtime mismatch even under an opt-in gate', () => {
    const mode = "export const WORDPRESS_RUNTIME_MODE = {dataMode:'shared-read-only', hostHttp:false};"
    expect(inspectRuntime(`${runtimeImport}${mode}describe.runIf(process.env.RUN === '1')('live', async () => {const runtime = await startIsolatedWordPress({dataMode:'isolated', hostHttp:false, runId:'x'}); await runtime.wp(['post','list']);});`))
      .toContain('executed runtime options do not prove the declared runtime mode')
  })

  it.each([
    'const launch = startIsolatedWordPress; launch(options);',
    'const {launch} = {launch: startIsolatedWordPress}; launch(options);',
    'useFactory(startIsolatedWordPress);',
  ])('rejects a runtime factory escaping through an unproved alias: %s', escape => {
    expect(inspectRuntime(`${runtimeImport}${isolatedMode}${escape}`)).not.toEqual([])
  })

  it.each([
    "import * as runtimeHelper from '../helpers/wordpress-runtime'; const launch = runtimeHelper.startIsolatedWordPress; launch(options);",
    "import * as runtimeHelper from '../helpers/wordpress-runtime'; runtimeHelper['startIsolatedWordPress'](options);",
    "import * as runtimeHelper from '../helpers/wordpress-runtime'; runtimeHelper[unknownMember](options);",
    "const runtimeHelper = await import('../helpers/wordpress-runtime'); const launch = runtimeHelper.startIsolatedWordPress; launch(options);",
    "const {startIsolatedWordPress: launch} = await import('../helpers/wordpress-runtime'); launch(options);",
  ])('does not lose runtime authority through a module member or dynamic import: %s', source => {
    expect(inspectRuntime(`${isolatedMode}${source}`)).not.toEqual([])
  })

  it('accepts a statically proven direct namespace runtime call', () => {
    expect(inspectRuntime(`import * as runtimeHelper from '../helpers/wordpress-runtime'; ${isolatedMode}runtimeHelper.startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId:'x'});`)).toEqual([])
  })

  it('accepts an actual isolated runtime bound to the declaration', () => {
    expect(inspectRuntime(`${runtimeImport}${isolatedMode}const runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId:'x'}); await runtime.wp(['option','update','owned','yes']);`)).toEqual([])
  })

  it('accepts only the fixed executor from a verifiable simulation factory', () => {
    expect(inspectRuntime(`${runtimeImport}${simulationImport}${isolatedMode}const simulation = await createWordPressRuntimeSimulation(); startIsolatedWordPress({...options, execute:simulation.execute});`)).toEqual([])
  })

  it('does not trust a caller executor merely because the runtime mode fields agree', () => {
    expect(inspectRuntime(`${runtimeImport}${isolatedMode}startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId:'x', execute:unknownExecutor});`))
      .toContain('executed runtime options do not prove the declared runtime mode')
  })

  it('keeps the actual simulated input observable for caller-mutation regression tests', () => {
    expect(inspectRuntime(`${runtimeImport}${simulationImport}${isolatedMode}const simulation = await createWordPressRuntimeSimulation(); let input; startIsolatedWordPress(input = {...options, execute:simulation.execute});`)).toEqual([])
  })

  it.each([
    ["import {createWordPressRuntimeSimulation} from '../unknown';", 'const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute}'],
    [simulationImport, 'const original = await createWordPressRuntimeSimulation(); const simulation = original;', '{...options, execute:simulation.execute}'],
    [simulationImport, 'const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute, ...extra}'],
    [simulationImport, 'const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute, execute:unknownExecutor}'],
    [simulationImport, 'const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute.bind(null)}'],
    [simulationImport, 'const simulation = unknownFactory();', '{...options, execute:simulation.execute}'],
    ["import {createWordPressRuntimeSimulation} from '../../helpers/wordpress-runtime-simulation';", 'const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute}'],
    [simulationImport, 'async function unsafe(createWordPressRuntimeSimulation) { const simulation = await createWordPressRuntimeSimulation(); } const simulation = await createWordPressRuntimeSimulation();', '{...options, execute:simulation.execute}'],
  ])('does not mistake an arbitrary executor for simulation: %s %s %s', (imported, setup, options) => {
    expect(inspectRuntime(`${runtimeImport}${imported}${isolatedMode}${setup}startIsolatedWordPress(${options});`))
      .toContain('executed runtime options do not prove the declared runtime mode')
  })

  it.each([
    "{dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true}",
    "{...WORDPRESS_RUNTIME_MODE, dataMode: 'shared-mutating', serialMutationAuthorized: true}",
    "{...WORDPRESS_RUNTIME_MODE, ...other}",
    "{...WORDPRESS_RUNTIME_MODE, hostHttp: process.env.HTTP === '1'}",
    "{dataMode: 'isolated', hostHttp: 'false'}",
    'options',
    "process.env.MODE ? WORDPRESS_RUNTIME_MODE : other",
    '',
  ])('binds executed helper options to the isolated declaration: %s', options => {
    const declaration = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const;"
    const call = `spawnSync('docker', [...wordpressComposeArgs(${options}), 'run', '--no-deps', 'wpcli', 'wp', 'option', 'update', 'unsafe', 'yes'])`
    expect(inspectRuntime(`${declaration}${call}`)).not.toEqual([])
  })

  it('rejects a canonical Compose target masked by an isolated declaration', () => {
    expect(inspectRuntime("export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false}; spawnSync('docker', ['compose', '--project-name', 'wordpress', 'run', '--no-deps', 'wpcli', 'wp', 'option', 'update', 'unsafe', 'yes'])")).not.toEqual([])
  })

  it('rejects the converse helper mismatch even under an opt-in gate', () => {
    expect(inspectRuntime("export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false}; describe.runIf(process.env.RUN === '1')('live', () => spawnSync('docker', [...wordpressComposeArgs({dataMode:'isolated', hostHttp:false}), 'run', '--no-deps', 'wpcli', 'wp', 'post', 'list']))")).not.toEqual([])
  })

  it.each([
    "const alias = WORDPRESS_RUNTIME_MODE; alias.dataMode = 'shared-mutating';",
    'mutate(WORDPRESS_RUNTIME_MODE);',
    "Object.assign(WORDPRESS_RUNTIME_MODE, {dataMode:'shared-mutating'});",
  ])('fails closed when declared authority escapes static proof: %s', escape => {
    const declaration = "export const WORDPRESS_RUNTIME_MODE = {dataMode:'isolated', hostHttp:false};"
    expect(inspectRuntime(`${declaration}${escape}spawnSync('docker', [...wordpressComposeArgs({...WORDPRESS_RUNTIME_MODE, runId:'x'}), 'run', '--no-deps', 'wpcli', 'wp', 'option', 'update', 'unsafe', 'yes'])`)).not.toEqual([])
  })

  const mutatingMode = "export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-mutating', hostHttp: false, serialMutationAuthorized: true} as const;"
  const lockImport = "import {registerSharedWordPressMutationLock} from '../helpers/wordpress-test-support';"
  const sharedCall = "execute('docker', ['compose', '--project-name', 'wordpress', 'run', '--no-deps', 'wpcli', 'wp', 'post', 'list'])"
  const gatedCall = `describe.runIf(process.env.RUN === '1')('live', () => {${sharedCall}})`

  it.each([
    ['', "describe.runIf(process.env.RUN === '1')('live', async () => {CALL})", 'shared mutation requires an active lock registration bound to its gate'],
    ['registerSharedWordPressMutationLock(true);', 'CALL', 'shared Docker execution is not dominated by an opt-in gate'],
  ])('requires the actual shared runtime to retain gate and lock consistency', (registration, wrapper, error) => {
    const call = "const runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId:'x'}); await runtime.wp(['option','update','owned','yes']);"
    expect(inspectRuntime(`${runtimeImport}${lockImport}${mutatingMode}${registration}${wrapper.replace('CALL', call)}`)).toContain(error)
  })

  it('accepts the authorized gated and locked shared runtime without lifecycle escalation', () => {
    expect(inspectRuntime(`${runtimeImport}${lockImport}${mutatingMode}registerSharedWordPressMutationLock(process.env.RUN === '1'); describe.runIf(process.env.RUN === '1')('live', async () => {const runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId:'x'}); await runtime.wp(['option','update','owned','yes']);});`)).toEqual([])
  })

  it('does not equate string authorization with a declared boolean', () => {
    const call = "execute('docker', [...wordpressComposeArgs({dataMode:'shared-mutating', hostHttp:false, serialMutationAuthorized:'true'}), 'run', '--no-deps', 'wpcli', 'wp', 'option', 'update', 'unsafe', 'yes'])"
    expect(inspectRuntime(`${lockImport}${mutatingMode}registerSharedWordPressMutationLock(true); describe.runIf(process.env.RUN === '1')('live', () => {${call}})`))
      .toContain('executed Compose options do not prove the declared runtime mode')
  })

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
    "call_user_func('update_option', 'unsafe', 'value');",
    "call_user_func_array('update_option', ['unsafe', 'value']);",
    "forward_static_call(['Unsafe', 'write'], 'value');",
    "RuntimeException::time();",
    "$operation='update_option'; $operation('unsafe', 'value');",
    "$path='update_option'; $path('unsafe', 'value');",
    "$path='update_option'; ($path)('unsafe', 'value');",
    "$targets=['update_option']; $targets[0]('unsafe', 'value');",
    "$path='set_method'; $request->$path('POST');",
    "$request='wpdb'; $response=new $request;",
    "$wpdb->get_results('ALTER TABLE wp_posts ADD unsafe INT');",
    "$method='update'; $wpdb->$method('wp_posts', []);",
    "$method='set_method'; $request->{$method}('POST');",
    "$wpdb->get_results('SEL' . 'ECT 1');",
    "$wpdb->get_results('SELECT 1;DELETE FROM wp_posts');",
    "$wpdb->get_results('/* claimed read-only */ SELECT 1');",
    "$wpdb->get_results($sql);",
    "$wpdb->get_results('SELECT 1');",
    "unknown_plugin_side_effect();",
  ])('fails closed for indirect PHP execution or any unused database capability: %s', php => {
    expect(inspectReadOnlyPreviewPhp('<?php ' + php)).toContain('reviewed preview helper contains mutation, SQL or dynamic execution input')
  })

  it('accepts the tracked read-only helper without granting extra PHP capabilities', () => {
    expect(inspectReadOnlyPreviewPhp(readFileSync('tests/infrastructure/php/site-a-editorial-phase1-preview.php', 'utf8'))).toEqual([])
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
    const failures = testFiles(root).flatMap(path => inspectRuntime(readFileSync(path, 'utf8'), undefined, path).map(error => `${relative(root, path)}: ${error}`))
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
