import {spawnSync, execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {randomUUID, createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {startIsolatedWordPress, type OwnedWordPressRuntime} from '../helpers/wordpress-runtime'
import {isolatedPhpArgs} from '../helpers/wordpress-test-support'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const
const execute = promisify(execFile)
type Json = null | boolean | number | string | Json[] | {[key: string]: Json}
const canonical = (v: Json): string => Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : v && typeof v === 'object'
  ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}` : JSON.stringify(v)
const digest = (v: Json) => createHash('sha256').update(canonical(v)).digest('hex')

describe('committed approved-content notifications', () => {
  it('suppresses rollback/transaction HTTP, merges committed paths, persists failure and retries without writing', async () => {
    const runId = `content-events-${randomUUID()}`
    const directory = resolve('.tmp', runId)
    const volume = `d16-test-${runId}`
    mkdirSync(directory, {recursive: true})
    const environmentPath = resolve(directory, 'wordpress.env')
    writeFileSync(environmentPath, ['WORDPRESS_DB_NAME=events','WORDPRESS_DB_USER=events','WORDPRESS_DB_PASSWORD=synthetic-only-db-password',
      'WORDPRESS_DB_ROOT_PASSWORD=synthetic-only-root-password','WORDPRESS_ADMIN_USER=event-admin','WORDPRESS_ADMIN_PASSWORD=synthetic-only-admin-password',
      'WORDPRESS_ADMIN_EMAIL=events@example.invalid','NEXTJS_REVALIDATION_URL_TIO2_MY=http://127.0.0.1:3015/api/revalidate',
      'NEXTJS_REVALIDATION_SECRET_TIO2_MY=synthetic-events-secret'].join('\n'))
    let ownedRuntime: OwnedWordPressRuntime | undefined
    const home = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json','utf8'))
    const app = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json','utf8'))
    const changedHome = structuredClone(home); changedHome.company.summaries.push({title:'Synthetic fourth summary',description:'Isolated test content.'})
    const changedApp = structuredClone(app); changedApp.evaluation.items.pop()
    const now = Math.floor(Date.now()/1000)
    const proof = {schemaVersion:'d16-content-approval-v1',approvalId:'synthetic-events',sourceRef:'SYNTHETIC-TEST-ONLY',
      sourceSha256:createHash('sha256').update('SYNTHETIC-TEST-ONLY').digest('hex'),siteId:'tio2-my',environmentId:runId,
      validFrom:now-60,validUntil:now+1800,operation:'update-published',records:[
        {pageId:'APP-000',locale:'en',beforeSha256:digest(app),afterSha256:digest(changedApp)},
        {pageId:'HOME-001',locale:'en',beforeSha256:digest(home),afterSha256:digest(changedHome)}]}
    const mixedProof = {...proof,approvalId:'synthetic-mixed',records:[
      {pageId:'APP-000',locale:'en',beforeSha256:digest(app),afterSha256:digest(app)},
      {pageId:'HOME-001',locale:'en',beforeSha256:digest(home),afterSha256:digest(changedHome)}]}
    try {
      const base = isolatedPhpArgs(process.cwd())
      const proofArgs = [...base.slice(0,-3),'--user','0:0','--mount',`type=volume,source=${volume},target=/approvals`,...base.slice(-3),
        '/workspace/tests/infrastructure/php/content-write-events.php','proofs']
      const setup = spawnSync('docker',['run','-i',...proofArgs.slice(1)],{encoding:'utf8',input:JSON.stringify({proof,mixedProof,home,app,changedHome,changedApp})})
      expect(setup.status,setup.stderr).toBe(0)
      const runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE,runId: runId,environment:{...process.env,TIO2_TEST_WORDPRESS_ENV:environmentPath}})
      ownedRuntime = runtime
      await runtime.wp(['core','install','--url=http://example.invalid','--title=Synthetic events test','--admin_user=event-admin',
        '--admin_password=synthetic-only-admin-password','--admin_email=events@example.invalid','--skip-email'])
      await runtime.wpAsWebUser(['plugin','install','advanced-custom-fields','--activate'])
      await runtime.wp(['plugin','activate','tio2-site-model'])
      const run = async (mode: string, id?: string) => {
        const {stdout} = await execute('docker',[...runtime.composeArgs,'run','--rm','-T','--volume',`${volume}:/approvals:ro`,'wpcli','wp','eval-file',
          '/workspace/tests/infrastructure/php/content-write-events.php',mode,runId,...(id?[id]:[]),'--user=event-admin'],{windowsHide:true,maxBuffer:4*1024*1024})
        return JSON.parse(stdout.slice(stdout.indexOf('{')))
      }
      await run('setup')
      expect(await run('rollback')).toEqual({rejected:true,unchanged:true,calls:[]})
      expect(await run('storage-fail')).toEqual({error:'write_receipt',unchanged:true,calls:[],writeCount:2})
      const committed = await run('outcome-fail')
      expect(committed.receipt).toMatchObject({siteId:'tio2-my',approvalId:'synthetic-events',committed:true,notificationState:'failed',
        changedPages:['APP-000','HOME-001'],notificationPersistenceUncertain:true})
      expect(committed.receipt.receiptId).toMatch(/^[0-9a-f-]{36}$/)
      expect(committed).toMatchObject({duringQueueCount:1,otherQueuePreserved:true,writeCount:2,contentMatches:true,persistedState:'pending'})
      expect(committed.calls).toHaveLength(1)
      expect(committed.calls[0]).toMatchObject({url:'http://127.0.0.1:3015/api/revalidate',signed:true,
        payload:{siteIds:['tio2-my'],paths:['/','/applications']}})
      expect(await run('noactor',committed.receipt.receiptId)).toMatchObject({receipt:'event_permission',calls:[],contentUnchanged:true,writeCount:0,persistedState:'pending'})
      expect(await run('tamper',committed.receipt.receiptId)).toMatchObject({receipt:'event_receipt',calls:[],contentUnchanged:true,writeCount:0,persistedState:'pending'})
      const replay = await run('retry-fail',committed.receipt.receiptId)
      expect(replay.receipt).toMatchObject({receiptId:committed.receipt.receiptId,committed:true,notificationState:'failed'})
      expect(replay).toMatchObject({writeCount:0,contentUnchanged:true,persistedState:'failed'})
      expect(replay.calls).toHaveLength(1)
      expect(replay.calls[0].payload.eventId).toBe(committed.calls[0].payload.eventId)
      const wrongAck = await run('bad-ack',committed.receipt.receiptId)
      expect(wrongAck.receipt).toMatchObject({committed:true,notificationState:'failed'})
      expect(wrongAck).toMatchObject({writeCount:0,contentUnchanged:true,persistedState:'failed'})
      const [holder,contender] = await Promise.all([
        run('race-holder',committed.receipt.receiptId),run('race-contender',committed.receipt.receiptId),
      ])
      expect(holder).toMatchObject({writeCount:0,contentUnchanged:true,persistedState:'failed'})
      expect(holder.receipt).toMatchObject({receiptId:committed.receipt.receiptId,committed:true,notificationState:'failed'})
      expect(holder.calls).toHaveLength(1)
      expect(contender).toMatchObject({receipt:'event_busy',calls:[],writeCount:0,contentUnchanged:true,persistedState:'failed'})
      const stale = await run('stale',committed.receipt.receiptId)
      expect(stale.receipt).toMatchObject({receiptId:committed.receipt.receiptId,committed:true,notificationState:'sent',retryMayDuplicateInvalidation:true})
      expect(stale).toMatchObject({writeCount:0,contentUnchanged:true})
      expect(stale.calls).toHaveLength(1)
      expect(stale.calls[0].payload.eventId).not.toBe(committed.calls[0].payload.eventId)
      await run('setup')
      const mixed = await run('mixed')
      expect(mixed.receipt).toMatchObject({committed:true,notificationState:'failed',changedPages:['HOME-001'],
        beforeDigests:{'APP-000':digest(app),'HOME-001':digest(home)},
        afterDigests:{'APP-000':digest(app),'HOME-001':digest(changedHome)}})
      expect(Object.values(mixed.receipt.events)).toHaveLength(1)
      expect(mixed).toMatchObject({writeCount:1,contentMatches:true})
      expect(mixed.calls).toHaveLength(1)
      expect(mixed.calls[0].payload.paths).toEqual(['/'])
      const mixedRetry = await run('retry',mixed.receipt.receiptId)
      expect(mixedRetry.receipt).toMatchObject({committed:true,notificationState:'sent'})
      expect(mixedRetry).toMatchObject({writeCount:0,contentUnchanged:true})
      expect(mixedRetry.calls).toHaveLength(1)
    } finally {
      if (ownedRuntime) {
        await ownedRuntime.stop()
        for (const suffix of ['db_data','wp_data']) await execute('docker',['volume','rm',`${ownedRuntime.projectName}_${suffix}`])
      }
      await execute('docker',['volume','rm',volume])
      if (directory===resolve('.tmp',runId) && runId.startsWith('content-events-')) rmSync(directory,{recursive:true})
    }
  },180000)
})
