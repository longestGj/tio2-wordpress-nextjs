import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {join, resolve, sep} from 'node:path'
import {randomUUID} from 'node:crypto'
import {expect, it} from 'vitest'

it('private input failures keep values out of list JSON step errors and failure artifacts', async () => {
  mkdirSync('.tmp', {recursive: true})
  const root = mkdtempSync(resolve('.tmp/private-input-'))
  const sentinel = `PRIVATE_INPUT_${randomUUID().replaceAll('-', '')}`
  const helper = resolve('tests/e2e/support/private-input.ts').replaceAll('\\', '/')
  const playwright = resolve('node_modules/@playwright/test/index.mjs').replaceAll('\\', '/')
  writeFileSync(join(root, 'step-reporter.cjs'), `const fs=require('node:fs');module.exports=class{constructor(){this.steps=[]}onStepEnd(test,result,step){this.steps.push({title:step.title,error:step.error})}onEnd(){fs.writeFileSync(${JSON.stringify(join(root, 'steps.json'))},JSON.stringify(this.steps))}}`)
  writeFileSync(join(root, 'private.spec.ts'), `
import {test,expect} from ${JSON.stringify(playwright)};
import {fillPrivateInput} from ${JSON.stringify(helper)};
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1';
test.use({trace:'off',screenshot:'off',video:'off',serviceWorkers:'block'});
for(const mode of ['hidden','disabled','readonly','missing','invalid-selector','event-throw','positive']) {
 test(mode,async({page,context})=>{
  let requests=0;await context.route('**/*',route=>{requests++;return route.abort()});
  try {
   await page.setContent('<input id="field" '+(mode==='hidden'?'style="display:none"':mode==='disabled'?'disabled':mode==='readonly'?'readonly':'')+'>');
   await page.evaluate(({mode,marker})=>{const field=document.querySelector('input');window.observed={input:0,change:0};field.addEventListener('input',()=>{window.observed.input++;if(mode==='event-throw')throw new Error(marker)});field.addEventListener('change',()=>window.observed.change++)},{mode,marker:process.env.PRIVATE_INPUT_SENTINEL});
   await fillPrivateInput(page,mode==='missing'?'#absent':mode==='invalid-selector'?'[':'#field',process.env.PRIVATE_INPUT_SENTINEL!);
   expect(mode==='positive','failure mode must reject input').toBe(true);
   expect(await page.evaluate(value=>document.activeElement===document.querySelector('input')&&document.querySelector('input').value===value&&window.observed.input===1&&window.observed.change===1,process.env.PRIVATE_INPUT_SENTINEL)).toBe(true);
  } finally {await page.close();expect(requests,'actual outbound requests').toBe(0)}
 });
}
`)
  writeFileSync(join(root, 'playwright.config.ts'), `export default {testDir:${JSON.stringify(root)},testMatch:'private.spec.ts',workers:1,retries:0,timeout:10000,reporter:[['list'],['json',{outputFile:${JSON.stringify(join(root, 'report.json'))}}],[${JSON.stringify(join(root, 'step-reporter.cjs'))}]],outputDir:${JSON.stringify(join(root, 'artifacts'))}}`)
  try {
    let output = ''
    let exitCode: unknown = 0
    try {
      const result = await promisify(execFile)(process.execPath, [resolve('node_modules/playwright/cli.js'), 'test', '--config', join(root, 'playwright.config.ts')], {cwd: resolve('.'), env: {...process.env, PRIVATE_INPUT_SENTINEL: sentinel}, timeout: 45_000})
      output = result.stdout + result.stderr
    } catch (error) {
      const failure = error as {stdout?: string; stderr?: string; code?: unknown}
      exitCode = failure.code
      output = (failure.stdout ?? '') + (failure.stderr ?? '')
    }
    // Never include child diagnostics or sentinel in a failing parent assertion.
    expect(exitCode === 1, 'controlled failure exit').toBe(true)
    const files = readdirSync(root, {recursive: true}).map(String).filter(path => /report\.json$|steps\.json$|artifacts[/\\]/u.test(path))
    const artifacts = files.filter(path => /\.json$|\.md$|\.txt$/u.test(path)).map(path => readFileSync(join(root, path), 'utf8'))
    expect([output, ...artifacts].some(text => text.includes(sentinel)), 'private value appeared in child diagnostics').toBe(false)
    expect(output.includes('6 failed') && output.includes('1 passed'), 'six bounded failures and one event/focus success').toBe(true)
    expect(artifacts.some(text => text.includes('Private input failed:')), 'safe failure classification recorded').toBe(true)
    expect(files.some(path => /trace\.zip|\.png|\.webm$/u.test(path)), 'sensitive visual artifacts').toBe(false)
  } finally {
    if (!root.startsWith(resolve('.tmp') + sep)) throw new Error('Fixture cleanup escaped workspace')
    rmSync(root, {recursive: true, force: true})
  }
}, 50_000)
