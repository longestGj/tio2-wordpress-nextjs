import {spawn, type ChildProcess} from 'node:child_process'
import {randomBytes, randomUUID} from 'node:crypto'
import {existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync, writeFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {dirname, resolve} from 'node:path'
import {chromium, expect as browserExpect, type Browser, type Page} from '@playwright/test'
import {describe, expect, it} from 'vitest'
import {startIsolatedWordPress, type OwnedWordPressRuntime} from '../../helpers/wordpress-runtime'
import {cleanupHomeApplicationSteps, execute, ownedHttp, prepareHomeApplicationFixture, removeOwnedHomeApplicationRun,
  removeOwnedWordPressVolume, sha256, startHomeApplicationRelay, stopOwnedNext, prepareApprovalCompose, registerSyntheticApproval, type CallbackEvidence} from '../../helpers/home-application-runtime-fixture'
// @ts-expect-error -- Runtime leases are intentionally delivered as an MJS script.
import {attachLease, releaseLease, reserveLease} from '../../../scripts/runtime-ports/lease-core.mjs'

const repository = resolve(import.meta.dirname, '../../..')
const template = resolve(repository, 'tests/fixtures/home-application-runtime')
const nextBin = createRequire(resolve(repository, 'package.json')).resolve('next/dist/bin/next')
const runRoot = resolve(repository, '.tmp/cms-decoupling-w3-a1')
export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: true} as const
const sleep = (ms: number) => new Promise(done => setTimeout(done, ms))

describe('home/application owned cleanup', () => {
  it('attempts remaining cleanup after an earlier step fails', async () => {
    let lastStep = false
    const result = await cleanupHomeApplicationSteps([
      {name: 'failed service', run() {throw new Error('still running')}},
      {name: 'independent relay', run() {lastStep = true}},
    ])
    expect(lastStep).toBe(true)
    expect(result).toEqual([{name: 'failed service', passed: false, error: 'still running'}, {name: 'independent relay', passed: true}])
  })
  it('refuses an incorrect owner and removes only the public junction', () => {
    const runId = `home-application-${randomUUID()}`
    const directory = resolve(runRoot, runId)
    mkdirSync(resolve(directory, 'next'), {recursive: true})
    writeFileSync(resolve(directory, 'owner'), runId)
    const publicRoot = resolve(repository, 'public')
    const before = readdirSync(publicRoot)
    symlinkSync(publicRoot, resolve(directory, 'next/public'), 'junction')
    expect(() => removeOwnedHomeApplicationRun(runRoot, directory, `${runId}-wrong`, publicRoot)).toThrow('ownership')
    expect(existsSync(directory)).toBe(true)
    removeOwnedHomeApplicationRun(runRoot, directory, runId, publicRoot)
    expect(existsSync(directory)).toBe(false)
    expect(readdirSync(publicRoot)).toEqual(before)
  })
})

describe.runIf(process.env.HOME_APPLICATION_LOCAL_RUNTIME === '1')('real isolated HOME-001 and APP-000 CMS acceptance', () => {
  it('updates two rounds through real signed meta hooks without rebuilding and rejects invalid records', async () => {
    const runId = `home-application-${randomUUID()}`
    const directory = resolve(runRoot, runId)
    const evidence = resolve(repository, '.local-evidence/cms-decoupling-w3-a1', runId)
    if (dirname(directory) !== runRoot) throw new Error('Run path escaped task root')
    mkdirSync(directory, {recursive: true}); mkdirSync(evidence, {recursive: true})
    writeFileSync(resolve(directory, 'owner'), runId)
    const secrets: string[] = []
    const secret = () => {const value = randomBytes(32).toString('hex'); secrets.push(value); return value}
    const redact = (text: string) => secrets.reduce((result, value) => result.replaceAll(value, '[REDACTED]'), text)
    const save = (name: string, value: unknown) => writeFileSync(resolve(evidence, name), redact(typeof value === 'string' ? value : JSON.stringify(value, null, 2)))
    const callbackEvents: CallbackEvidence[] = []
    let stage = 'prepare'
    let wordpress: OwnedWordPressRuntime | undefined
    let startupAttempted = false
    let relay: Awaited<ReturnType<typeof startHomeApplicationRelay>> | undefined
    let next: ChildProcess | undefined
    let browser: Browser | undefined
    let nextLease: {leaseId: string; ports: number[]; processIds: number[]} | undefined
    let nextLogs = ''
    let nextStopped = false, wordpressStopped = false, leaseReleased = false, dbRemoved = false, wpRemoved = false, approvalsRemoved = false
    let failure: unknown
    let passed = false
    const diagnostics: string[] = []
    const blocked: string[] = []
    const progress = (value: string) => {stage = value; save('current-stage.json', {runId, stage, at: new Date().toISOString()})}
    try {
      const commit = (await execute('git', ['rev-parse', 'HEAD'], {cwd: repository, windowsHide: true})).stdout.trim()
      const diff = (await execute('git', ['diff', 'HEAD', '--', 'app', 'components', 'lib', 'wordpress', 'tests'], {cwd: repository, windowsHide: true, maxBuffer: 16*1024*1024})).stdout
      save('dirty-code.diff', diff)
      const extra = (await execute('git', ['ls-files', '--others', '--exclude-standard', '--', 'tests'], {cwd: repository, windowsHide: true})).stdout.trim().split(/\r?\n/u).filter(Boolean)
      extra.push('tests/fixtures/home-application-runtime/next-env.d.ts')
      const untracked = Object.fromEntries([...new Set(extra)].map(path => [path, readFileSync(resolve(repository,path),'utf8')]))
      save('dirty-untracked-code.json',untracked)
      const codeIdentity = {commit, dirtyDiffSha256: sha256(diff), untrackedSha256: sha256(JSON.stringify(untracked)), files: extra}
      save('code-identity.json', codeIdentity)
      const revalidationSecret = secret()
      relay = await startHomeApplicationRelay(runId, revalidationSecret, callbackEvents)
      const environmentPath = resolve(directory, 'wordpress.env')
      const adminPassword = secret()
      const rootPassword = secret()
      writeFileSync(environmentPath, [
        'WORDPRESS_DB_NAME=home_application_runtime', 'WORDPRESS_DB_USER=home_application_runtime',
        `WORDPRESS_DB_PASSWORD=${secret()}`, `WORDPRESS_DB_ROOT_PASSWORD=${rootPassword}`,
        'WORDPRESS_ADMIN_USER=owned-runtime-editor', `WORDPRESS_ADMIN_PASSWORD=${adminPassword}`,
        'WORDPRESS_ADMIN_EMAIL=runtime@example.invalid',
        ...['A','B','MY'].flatMap(site => [
          `NEXTJS_REVALIDATION_URL_TIO2_${site}=${relay!.url}`,
          `NEXTJS_REVALIDATION_SECRET_TIO2_${site}=${site==='MY'?revalidationSecret:secret()}`,
          `NEXTJS_PREVIEW_URL_TIO2_${site}=${relay!.url}`, `NEXTJS_PREVIEW_SECRET_TIO2_${site}=${secret()}`,
        ]),
      ].join('\n'))
      const fixture = prepareHomeApplicationFixture(template, directory, repository)
      const composePath = prepareApprovalCompose(repository,directory,runId)
      progress('wordpress-start'); startupAttempted = true
      wordpress = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId: runId, siteId:'tio2-my', worktree:repository, commit:commit,
        environment:{...process.env, TIO2_TEST_WORDPRESS_ENV:environmentPath,TIO2_TEST_WORDPRESS_COMPOSE:composePath}})
      save('cms-identity.json',{runId, projectName:wordpress.projectName, graphqlUrl:wordpress.graphqlUrl, composeArgs:wordpress.composeArgs, callback:relay.url})
      if (!wordpress.graphqlUrl) throw new Error('Owned GraphQL URL missing')
      progress('wordpress-install')
      await wordpress.wp(['core','install',`--url=${new URL('/',wordpress.graphqlUrl).origin}`,'--title=Owned Home Application Runtime','--admin_user=owned-runtime-editor','--admin_email=runtime@example.invalid','--skip-email',`--admin_password=${adminPassword}`])
      for (const plugin of ['wp-graphql','advanced-custom-fields','wpgraphql-acf']) {
        progress(`plugin-${plugin}`)
        save(`plugin-${plugin}.log`,await wordpress.wpAsWebUser(['plugin','install',plugin,'--activate']))
      }
      await wordpress.wp(['plugin','activate','tio2-site-model'])
      await wordpress.wp(['option','update','d16_home_application_run',runId])
      for (const seed of ['homepage','application-hub']) {
        progress(`seed-${seed}`)
        save(`seed-${seed}.json`,await wordpress.wp(['eval',`$args=['--initialize-draft']; require '/workspace/wordpress/seed/apply-tio2-my-${seed}.php';`,'--user=owned-runtime-editor']))
      }
      let operationSequence=0
      const mutate = async (mode: string, approvalId='') => {
        relay!.phase(mode)
        const raw = await wordpress!.wp(['eval-file','/workspace/tests/fixtures/home-application-runtime/apply-synthetic-home-application.php',mode,runId,approvalId,'--user=owned-runtime-editor'])
        save(`${++operationSequence}-${mode}-php.json`,raw)
        return JSON.parse(raw)
      }
      let proofSequence=0
      const approve = async (label:string, record:any, operation='update-published', changes:Record<string,unknown>={}) => {
        const approvalId=`synthetic-${++proofSequence}-${label}`
        const now=Math.floor(Date.now()/1000)
        const {pageId,locale,beforeSha256,afterSha256}=record
        const proof={schemaVersion:'d16-content-approval-v1',approvalId,siteId:'tio2-my',environmentId:runId,
          sourceRef:`SYNTHETIC-TEST-ONLY:${runId}:${label}`,sourceSha256:sha256(`SYNTHETIC-TEST-ONLY:${runId}:${label}`),
          validFrom:now-60,validUntil:now+3600,operation,records:[{pageId,locale,beforeSha256,afterSha256}],...changes}
        await registerSyntheticApproval(wordpress!.projectName,runId,proof)
        save(`${approvalId}-proof.json`,proof)
        return approvalId
      }
      await mutate('setup')
      for(const kind of ['home','app']) {
        const beforePublishEvents=callbackEvents.length
        const record=await mutate(`publish-${kind}`)
        expect(callbackEvents.length).toBe(beforePublishEvents)
        const proof=await approve(`publish-${kind}`,record,'publish-draft')
        expect(await mutate(`publish-${kind}`,proof)).toMatchObject({draftSaved:true,unapprovedPublishRejected:true,approvedPublish:true})
      }
      save('seed-m350-product-detail.json',await wordpress.wp(['eval-file','/workspace/wordpress/seed/apply-tio2-my-m350-product-detail.php','--user=owned-runtime-editor']))
      save('seed-market-hub.json',await wordpress.wp(['eval-file','/workspace/wordpress/seed/apply-tio2-my-market-hub.php','--user=owned-runtime-editor']))
      await wordpress.wp(['eval',"if(!term_exists('tio2-b','site_scope'))wp_insert_term('tio2-b','site_scope',['slug'=>'tio2-b']);$id=wp_insert_post(['post_type'=>'post','post_status'=>'draft','post_title'=>'Synthetic foreign scope sentinel']);wp_set_object_terms($id,['tio2-b'],'site_scope');update_post_meta($id,'synthetic-isolation','preserve');",'--user=owned-runtime-editor'])
      progress('synthetic-readiness-setup')
      await mutate('setup')
      progress('bulk-canonical-registry-probe')
      const registryProbe=await mutate('bulk-registry-probe')
      expect(registryProbe.filter((record:any)=>record.error)).toEqual([])
      expect(registryProbe).toEqual(expect.arrayContaining([
        expect.objectContaining({pageId:'HOME-001',slug:'tio2-my--homepage',error:null}),
        expect.objectContaining({pageId:'APP-000',slug:'tio2-my-applications',error:null}),
      ]))
      const queries = {home:readFileSync(resolve(repository,'lib/wordpress/homepage-v04-queries.graphql'),'utf8'),app:readFileSync(resolve(repository,'lib/wordpress/application-hub-v01-queries.graphql'),'utf8')}
      const graph = async (kind: 'home'|'app', label: string) => {
        const result = await ownedHttp(wordpress!.graphqlUrl!,JSON.stringify({query:queries[kind],variables:kind==='home'?{slug:'tio2-my--homepage'}:{}}))
        const json = JSON.parse(result.body); save(`${label}-graphql.json`,json); expect(result.status).toBe(200); return json
      }
      const contractFromGraph = (kind:'home'|'app', value: any) => {
        expect(value.errors).toBeUndefined()
        return kind==='home' ? JSON.parse(value.data.tio2Homepage.malaysiaHomepageContractJson)
          : JSON.parse(JSON.parse(value.data.malaysiaApplicationHubRecordJson).malaysiaApplicationHubContractJson)
      }
      progress('baseline-graphql')
      for (const kind of ['home','app'] as const) contractFromGraph(kind,await graph(kind,`baseline-${kind}`))
      progress('target-route-production-build')
      // Explicitly disable external integrations and public indexing in this disposable build.
      const buildEnv = {...process.env, SITE_ID:'tio2-my', WORDPRESS_GRAPHQL_URL:wordpress.graphqlUrl, REVALIDATION_SECRET:revalidationSecret,
        NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID:'', NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID:'', NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY:'',
        VERCEL_ENV:'preview', SEO_ALLOW_INDEXING_LOCAL_TEST:'false', NEXT_DIST_DIR:'.next', HOME_APPLICATION_CANONICAL_WORKSPACE_ROOT:resolve(repository,'../..')}
      try {
        const build = await execute(process.execPath,[nextBin,'build'],{cwd:fixture,env:buildEnv,windowsHide:true,timeout:600000,maxBuffer:16*1024*1024})
        save('target-route-build.log',`${build.stdout}\n${build.stderr}`)
      } catch(error) {
        const failed=error as Error & {stdout?:string;stderr?:string}
        save('target-route-build-failure.log',`${failed.message}\n${failed.stdout}\n${failed.stderr}`);throw error
      }
      const buildId = readFileSync(resolve(fixture,'.next/BUILD_ID'),'utf8').trim()
      nextLease = await reserveLease({runId,purpose:'test-next',siteId:'tio2-my',worktree:repository,commit})
      const base = `http://127.0.0.1:${nextLease!.ports[0]}`
      next = spawn(process.execPath,[nextBin,'start','--hostname','127.0.0.1','--port',String(nextLease!.ports[0])],{cwd:fixture,env:buildEnv,windowsHide:true,stdio:['ignore','pipe','pipe']})
      if (!next.pid) throw new Error('Owned Next PID missing')
      next.stdout?.on('data',chunk=>{nextLogs+=String(chunk)});next.stderr?.on('data',chunk=>{nextLogs+=String(chunk)})
      nextLease = await attachLease({leaseId:nextLease!.leaseId,processId:next.pid})
      const pid=next.pid
      progress('next-start')
      const deadline=Date.now()+60000
      let lastProbe='no response'
      for (;;) {
        if(next.exitCode!==null) throw new Error(`Next exited: ${nextLogs}`)
        try {const probe=await ownedHttp(base);lastProbe=String(probe.status);if(probe.status===200)break}
        catch(error){lastProbe=(error as Error).message}
        if(Date.now()>deadline) throw new Error(`Next startup failed: ${lastProbe}`)
        await sleep(250)
      }
      relay.forwardTo(base)
      const boundConfiguration=()=>sha256(JSON.stringify({runId,base,site:'tio2-my',graphqlUrl:wordpress!.graphqlUrl,
        nextConfig:readFileSync(resolve(fixture,'next.config.mjs'),'utf8'),environment:buildEnv}))
      const liveIdentity={frontendImageId:`owned-next-pid-${pid}`,buildId,configurationSha256:boundConfiguration(),
        cmsContractSha256:sha256(readFileSync(resolve(repository,'wordpress/plugins/tio2-site-model/config/tio2-my-home-application-read-contract.json'))),processId:pid}
      relay.identity(()=>{
        if(next!.exitCode!==null||next!.pid!==pid||readFileSync(resolve(fixture,'.next/BUILD_ID'),'utf8').trim()!==buildId||boundConfiguration()!==liveIdentity.configurationSha256)throw new Error('Owned live identity changed')
        return liveIdentity
      })
      save('runtime-evidence.json',{runId,branch:'codex/cms-responsibility-audit',...codeIdentity,buildId,processId:pid,base,
        wordpress:{projectName:wordpress.projectName,graphqlUrl:wordpress.graphqlUrl},callback:relay.url,
        scope:'HOME-001 + APP-000 real target routes, shared layout and real POST; one production build/process',
        syntheticState:'Only isolated M350 dependency has synthetic LIVE_APPROVED metadata; this is not business approval.'})
      browser=await chromium.launch()
      const page = await browser.newPage({viewport:{width:1440,height:1000}})
      const observePage = async (page:Page) => {
        page.on('pageerror',error=>diagnostics.push(`pageerror:${error.message}`))
        page.on('console',message=>{if(message.type()==='error')diagnostics.push(`console:${message.text()}`)})
        page.on('response',response=>{if(response.status()>=400)diagnostics.push(`response:${response.status()}:${response.url()}`)})
        page.on('requestfailed',request=>diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText}`))
        await page.route('**/*',async route=>{
          if(new URL(route.request().url()).origin===base) await route.continue()
          else {blocked.push(route.request().url());await route.abort('blockedbyclient')}
        })
      }
      await observePage(page)
      for(const kind of ['home','app'] as const) {
        const path=kind==='home'?'/':'/applications/'
        const prefix=kind==='home'?'Home':'Applications'
        for(const round of [1,2]) {
          const label=`${kind}-round-${round}`
          progress(label)
          const candidate=await mutate(`prepare-${label}`)
          const proof=await approve(label,candidate)
          if(round===1) {
            const beforeRejections=callbackEvents.length
            const raw=await mutate(`${label}-raw`)
            expect(raw).toMatchObject({rejected:true,unchanged:true})
            if(kind==='home')expect(raw).toMatchObject({oldSummaryCount:3,candidateSummaryCount:4})
            const absent=await mutate(label)
            expect(absent).toMatchObject({status:'rejected',unchanged:true})
            expect(await mutate(`${label}-tamper`,proof)).toMatchObject({status:'rejected',error:'approval_content',unchanged:true})
            expect(await mutate(`${label}-readback`,proof)).toMatchObject({status:'rejected',error:'write_readback',unchanged:true})
            for(const [name,changes] of [['site',{siteId:'tio2-b'}],['environment',{environmentId:`${runId}-wrong`}],['expired',{validFrom:1,validUntil:2}],
              ['page',{records:[{pageId:kind==='home'?'APP-000':'HOME-001',locale:'en',beforeSha256:candidate.beforeSha256,afterSha256:candidate.afterSha256}]}]] as const) {
              // Wrong environment is independently registered in this test root; the installed environment remains unchanged.
              const bad=await approve(`${label}-${name}`,candidate,'update-published',changes)
              expect(await mutate(label,bad)).toMatchObject({status:'rejected',unchanged:true})
            }
            const dangerous=await mutate(`prepare-${label}-dangerous`)
            const unsafeProof=await approve(`${label}-dangerous`,dangerous)
            expect(await mutate(`${label}-dangerous`,unsafeProof)).toMatchObject({status:'rejected',unchanged:true})
            expect(callbackEvents.length).toBe(beforeRejections)
          }
          const actualStarted=Date.now(), actualBeforeEvents=callbackEvents.length
          if(round===2)relay.fail(kind==='home'?'reject':'drop-ack')
          let mutation
          if(round===1&&kind==='app') {
            const races=await Promise.all([mutate(label,proof),mutate(label,proof)])
            expect(races.filter(value=>value.status==='passed')).toHaveLength(1)
            expect(races.filter(value=>value.error==='approval_content')).toHaveLength(1)
            save('ordinary-concurrent-same-before.json',races)
            mutation=races.find(value=>value.status==='passed')!
          } else mutation=await mutate(label,proof)
          if(round===2) {
            expect(mutation.receipt).toMatchObject({committed:true,notificationState:'failed'})
            expect(mutation.persistedNotificationState).toBe('failed')
            relay.fail()
            const retried=await mutate('retry',mutation.receipt.receiptId)
            expect(retried).toMatchObject({metaWrites:0,unchanged:true,persistedNotificationState:'sent',receipt:{committed:true,notificationState:'sent'}})
            mutation.receipt=retried.receipt
          }
          expect(mutation).toMatchObject({status:'passed',savePostCalls:0,postModifiedUnchanged:true})
          const contract=contractFromGraph(kind,await graph(kind,label))
          expect(contract.seo.title).toBe(`Runtime ${prefix} SEO ${round}`)
          expect(mutation.receipt).toMatchObject({committed:true,notificationState:'sent'})
          const allEvents=callbackEvents.slice(actualBeforeEvents)
          const events=allEvents.filter(event=>event.forwarded&&event.status===200)
          save(`${label}-callbacks.json`,events)
          save(`${label}-all-attempts.json`,allEvents)
          expect(events.length).toBeGreaterThan(0)
          let invalidations=0
          for(const event of events) {
            expect(event).toMatchObject({signatureValid:true,forwarded:true,status:200})
            expect(JSON.parse(event.body)).toMatchObject({siteIds:['tio2-my'],contentId:mutation.postId,entityIds:kind==='home'?[]:[mutation.postId]})
            expect(JSON.parse(event.body).paths).toContain(kind==='home'?'/':'/applications')
            const reply=JSON.parse(event.response)
            expect(reply).toMatchObject({ok:true,eventId:JSON.parse(event.body).eventId,contentRelease:JSON.parse(event.body).contentRelease})
            if(reply.revalidatedTags.length) {
              invalidations++
              expect(reply.revalidatedTags).toContain(kind==='home'?'content:tio2-my--homepage':'content:tio2-my--applications')
              expect(reply.revalidatedPaths).toContain(kind==='home'?'/':'/applications')
            } else {
              expect({kind,round}).toEqual({kind:'app',round:2})
              expect(event.body).toBe(events[0].body)
              expect(reply.revalidatedPaths).toEqual([])
            }
          }
          expect(invalidations).toBe(1)
          save(`${label}-event-boundaries.json`,{accepted:events.length,invalidationAcknowledgements:invalidations,replayAcknowledgements:events.length-invalidations})
          let observed=false, lastHeading='', status=0
          while(Date.now()-actualStarted<60000) {
            const response=await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded'})
            status=response?.status()??0
            lastHeading=await page.locator('h1').textContent()??''
            if(status===200 && lastHeading===`Runtime ${prefix} Round ${round}` && await page.title()===`Runtime ${prefix} SEO ${round}`) {observed=true;break}
            await sleep(300)
          }
          save(`${label}-observation.json`,{observed,elapsedMs:Date.now()-actualStarted,status,lastHeading,buildId,pid})
          expect(observed,`${label} did not become visible within 60 seconds`).toBe(true)
          await browserExpect(page.getByText(`Runtime ${prefix} body round ${round}.`,{exact:true})).toBeVisible()
          await browserExpect(page.locator('meta[name="description"]')).toHaveAttribute('content',`Runtime ${prefix} description round ${round}.`)
          // Next serializes an origin-only URL without '/', which URL parsing restores.
          expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).href).toBe(`https://tio2malaysia.com${path}`)
          await browserExpect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex, nofollow')
          const extraTitle=kind==='home'?'Runtime extra home summary':'Runtime extra evaluation'
          await browserExpect(page.getByText(extraTitle,{exact:true})).toHaveCount(round===1?1:0)
          const jsonld=await page.locator('script[type="application/ld+json"]').allTextContents()
          const graphNodes=jsonld.flatMap(text=>JSON.parse(text)['@graph']??[])
          expect(graphNodes.find(node=>node['@type']===(kind==='home'?'WebPage':'CollectionPage')).name).toBe(`Runtime ${prefix} Round ${round}`)
          if(kind==='app') expect(graphNodes.find(node=>node['@type']==='CollectionPage').description).toBe(`Runtime Applications description round ${round}.`)
          save(`${label}-page.html`,await page.content());save(`${label}-jsonld.json`,jsonld.map(text=>JSON.parse(text)))
          const readiness=await mutate('readiness');save(`${label}-readiness.json`,readiness)
          expect(readiness).toEqual({homeReady:true,requiredHomeReady:true,m350Ready:true,m510Ready:false})
          expect(readFileSync(resolve(fixture,'.next/BUILD_ID'),'utf8').trim()).toBe(buildId)
          expect(next.pid).toBe(pid);expect(next.exitCode).toBeNull()
          expect(await mutate(label,proof)).toMatchObject({status:'rejected',error:'approval_content',unchanged:true})
        }
      }
      progress('bulk-bridge-identity')
      const ids=(await execute('docker',['ps','-q','--filter',`label=com.docker.compose.project=${wordpress.projectName}`],{windowsHide:true})).stdout.trim().split(/\s+/u)
      const containers=JSON.parse((await execute('docker',['inspect',...ids],{windowsHide:true})).stdout)
      const db=containers.find((value:any)=>value.Config.Labels['com.docker.compose.service']==='db')
      const wp=containers.find((value:any)=>value.Config.Labels['com.docker.compose.service']==='wordpress')
      const setup=await mutate('setup')
      const content={'HOME-001':JSON.parse(setup.records.home.base),'APP-000':JSON.parse(setup.records.app.base),
        'MARKET-000':JSON.parse(readFileSync(resolve(repository,'wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'),'utf8'))}
      const bridgePath=resolve(directory,'bulk-bridge.json')
      writeFileSync(bridgePath,JSON.stringify({runId,project:wordpress.projectName,database:'home_application_runtime',
        db:{name:db.Name.slice(1),id:db.Id},wp:{name:wp.Name.slice(1),id:wp.Id},network:Object.keys(wp.NetworkSettings.Networks)[0],
        relay:relay.url,secret:revalidationSecret,rootPassword,identity:liveIdentity,evidence,queries,content,
        postIds:{'HOME-001':setup.records.home.id,'APP-000':setup.records.app.id}}))
      for(const round of [1,2]) {
        progress(`bulk-round-${round}`);relay.phase(`bulk-round-${round}`)
        try {
          const bulk=await execute('python',['tests/production-runtime/content_approval_rehearsal.py','--bridge',bridgePath,String(round)],{cwd:repository,windowsHide:true,timeout:480000,maxBuffer:8*1024*1024})
          save(`bulk-round-${round}-host.log`,bulk.stdout+'\n'+bulk.stderr)
        } catch(error) {const failed=error as Error&{stdout?:string;stderr?:string};save(`bulk-round-${round}-host-failure.log`,`${failed.message}\n${failed.stdout}\n${failed.stderr}`);throw error}
        for(const kind of ['home','app'] as const) {
          const path=kind==='home'?'/':'/applications/';const prefix=kind==='home'?'Home':'Applications'
          const actual=contractFromGraph(kind,await graph(kind,`bulk-${round}-${kind}`))
          expect(actual.seo.title).toBe(`Bulk ${prefix} SEO ${round}`)
          await page.goto(`${base}${path}`,{waitUntil:'domcontentloaded'})
          await browserExpect(page.locator('h1')).toHaveText(`Bulk ${prefix} Round ${round}`)
          await browserExpect(page).toHaveTitle(`Bulk ${prefix} SEO ${round}`)
          await browserExpect(page.locator('meta[name="description"]')).toHaveAttribute('content',`Bulk ${prefix} description round ${round}.`)
          await browserExpect(page.getByText(kind==='home'?'Bulk extra home summary':'Bulk extra evaluation',{exact:true})).toHaveCount(round===1?1:0)
          expect(readFileSync(resolve(fixture,'.next/BUILD_ID'),'utf8').trim()).toBe(buildId);expect(next.exitCode).toBeNull();expect(next.pid).toBe(pid)
        }
        expect(await mutate('readiness')).toEqual({homeReady:true,requiredHomeReady:true,m350Ready:true,m510Ready:false})
      }
      progress('browser-visual-and-interactions')
      // Stored-corruption cleanup must restore the latest approved SQL version,
      // not the earlier ordinary-write checkpoint retained by the fixture.
      await mutate('setup')
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:width===390?844:1000})
        for(const [kind,path] of [['home','/'],['app','/applications/']] as const) {
          await page.goto(`${base}${path}`,{waitUntil:'networkidle'})
          await page.evaluate(()=>document.fonts.ready)
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
          await page.screenshot({path:resolve(evidence,`${kind}-${width}-viewport.png`),animations:'disabled'})
          await page.screenshot({path:resolve(evidence,`${kind}-${width}-full.png`),fullPage:true,animations:'disabled'})
          if(kind==='app') {
            const details=page.locator('#application-coatings details')
            await browserExpect(details).toHaveJSProperty('open',width>560)
            if(width===390) await details.locator('summary').click()
            await browserExpect(details).toHaveJSProperty('open',true)
            await browserExpect(details.locator('a[href="/products/m-350/"]')).toBeVisible()
            await browserExpect(details.locator('a[href="/products/m-510/"]')).toHaveCount(0)
            await browserExpect(details.getByText('M-510',{exact:true})).toBeVisible()
            await browserExpect(page.locator('#application-coatings > div a[href="/applications/titanium-dioxide-for-coatings/"]')).toHaveCount(0)
            await details.scrollIntoViewIfNeeded()
            await page.screenshot({path:resolve(evidence,`app-${width}-expanded.png`),animations:'disabled'})
            await details.locator('summary').click()
            await browserExpect(details).toHaveJSProperty('open',false)
            await page.screenshot({path:resolve(evidence,`app-${width}-collapsed.png`),animations:'disabled'})
          }
        }
      }
      expect(diagnostics).toEqual([])
      expect(blocked).toEqual([])
      await page.close()
      for(const kind of ['home','app'] as const) for(const bad of ['dangerous','relation','scope','unpublished','duplicate']) {
        const mode=`${kind}-invalid-${bad}`;progress(mode)
        const preserved=contractFromGraph(kind,await graph(kind,`${mode}-before`))
        try {
          const result=await mutate(mode)
          expect(result.status).toBe('rejected')
          if(kind==='home')expect(result.homeReady).toBe(false)
          const rejected=await graph(kind,mode)
          if(kind==='home') expect(rejected.data?.tio2Homepage??null).toBeNull()
          else {expect(rejected.errors?.length).toBeGreaterThan(0);expect(rejected.data??null).toBeNull()}
        } finally {await mutate('restore')}
        expect(contractFromGraph(kind,await graph(kind,`${mode}-restored`))).toEqual(preserved)
      }
      save('acceptance.json',{passed:true,runId,buildId,pid,ordinaryPageRounds:4,bulkPageRounds:4,storedCorruptionCases:10,allObservedWithinMs:60000,
        visualEvidence:'Screenshots captured; human/model viewing is recorded separately in Task5 report.'})
      passed=true
    } catch(error) {
      failure=error;save('failure.json',{stage,message:(error as Error).message,stack:(error as Error).stack})
    } finally {
      const cleanup=await cleanupHomeApplicationSteps([
        {name:'browser close',run:async()=>{await browser?.close()}},
        {name:'evidence logs',run:()=>{save('next-runtime.log',nextLogs);save('browser-diagnostics.json',diagnostics);save('blocked-requests.json',blocked);save('callback-events.json',callbackEvents)}},
        {name:'Next stop',run:async()=>{if(next)await stopOwnedNext(next);nextStopped=true}},
        {name:'Next lease release',run:async()=>{if(!nextStopped)throw new Error('Owned Next remains');if(nextLease)await releaseLease({leaseId:nextLease.leaseId,expectedProcessIds:nextLease.processIds});leaseReleased=true}},
        {name:'callback relay stop',run:async()=>{await relay?.stop()}},
        {name:'WordPress stop',run:async()=>{if(startupAttempted&&!wordpress)throw new Error('Startup returned no owner handle; retain exact recovery identity');await wordpress?.stop();wordpressStopped=true}},
        {name:'WordPress owned database volume',run:async()=>{if(!wordpressStopped)throw new Error('WordPress may remain');if(wordpress)await removeOwnedWordPressVolume(wordpress.projectName,'db_data');dbRemoved=true}},
        {name:'WordPress owned files volume',run:async()=>{if(!wordpressStopped)throw new Error('WordPress may remain');if(wordpress)await removeOwnedWordPressVolume(wordpress.projectName,'wp_data');wpRemoved=true}},
        {name:'WordPress owned proof volume',run:async()=>{if(!wordpressStopped)throw new Error('WordPress may remain');if(wordpress)await removeOwnedWordPressVolume(wordpress.projectName,'approvals');approvalsRemoved=true}},
        {name:'owned fixture and temporary credentials',run:()=>{if(!nextStopped||!wordpressStopped||!leaseReleased||!dbRemoved||!wpRemoved||!approvalsRemoved)throw new Error('Resource identity still needed; owned directory retained');removeOwnedHomeApplicationRun(runRoot,directory,runId,resolve(repository,'public'))}},
      ])
      save('cleanup-evidence.json',{runId,passed,failedStage:failure?stage:null,steps:cleanup,runDirectoryRetained:existsSync(directory),
        startupAttempted,startupUncertain:startupAttempted&&!wordpress,
        startupFailure:startupAttempted&&!wordpress?{projectName:(failure as any)?.projectName,composeArgs:(failure as any)?.composeArgs,leaseId:(failure as any)?.leaseId}:null})
      console.info(`HOME_APPLICATION_EVIDENCE=${evidence}`)
      const errors=cleanup.filter(step=>!step.passed)
      if(failure||errors.length) throw new Error(redact(`Stage ${stage}: ${(failure as Error)?.message??''}; cleanup: ${JSON.stringify(errors)}; evidence: ${evidence}`))
    }
  },900000)
})
