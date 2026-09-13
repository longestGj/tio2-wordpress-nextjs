import {spawnSync, execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {randomUUID, createHash} from 'node:crypto'
import {mkdirSync, readFileSync, writeFileSync, rmSync} from 'node:fs'
import {resolve} from 'node:path'
import {describe, expect, it} from 'vitest'
import {startIsolatedWordPress} from '../helpers/wordpress-runtime'
import {isolatedPhpArgs} from '../helpers/wordpress-test-support'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const
const execute = promisify(execFile)
type JsonValue = null | boolean | number | string | JsonValue[] | {[key:string]:JsonValue}
const canonical = (v: JsonValue): string => Array.isArray(v) ? `[${v.map(canonical).join(',')}]` : v && typeof v === 'object'
  ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}` : JSON.stringify(v)
const hash = (v: JsonValue) => createHash('sha256').update(canonical(v)).digest('hex')

describe('ordinary approved CMS writes against real WordPress and InnoDB', () => {
  it('rejects before mutation, commits exact approved content, rolls back failures and serializes competing processes', async () => {
    const runId = `content-guards-${randomUUID()}`
    const directory = resolve('.tmp', runId)
    const volume = `d16-test-${runId}`
    const evidenceDirectory=resolve('.local-evidence/content-write-guards',runId)
    mkdirSync(evidenceDirectory,{recursive:true})
    let commandNumber=0
    mkdirSync(directory, {recursive: true})
    const environmentPath = resolve(directory, 'wordpress.env')
    writeFileSync(environmentPath, ['WORDPRESS_DB_NAME=guards', 'WORDPRESS_DB_USER=guards', 'WORDPRESS_DB_PASSWORD=synthetic-only-db-password',
      'WORDPRESS_DB_ROOT_PASSWORD=synthetic-only-root-password', 'WORDPRESS_ADMIN_USER=guard-admin', 'WORDPRESS_ADMIN_PASSWORD=synthetic-only-admin-password',
      'WORDPRESS_ADMIN_EMAIL=guard@example.invalid', ...['A','B','MY'].flatMap(s => [`NEXTJS_REVALIDATION_URL_TIO2_${s}=http://127.0.0.1:1/disabled`,
        `NEXTJS_REVALIDATION_SECRET_TIO2_${s}=`, `NEXTJS_PREVIEW_URL_TIO2_${s}=http://127.0.0.1:1/disabled`, `NEXTJS_PREVIEW_SECRET_TIO2_${s}=`])].join('\n'))
    let runtime: Awaited<ReturnType<typeof startIsolatedWordPress>> | undefined
    const home = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json', 'utf8'))
    const app = JSON.parse(readFileSync('wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json', 'utf8'))
    const changed = structuredClone(home); changed.company.summaries.push({title: 'Synthetic fourth summary', description: 'Isolated test content.'})
    const changedApp = structuredClone(app); changedApp.evaluation.items.pop()
    const now = Math.floor(Date.now() / 1000)
    const proof = (id: string, operation = 'update-published', bulk = false) => ({schemaVersion:'d16-content-approval-v1', approvalId:id,
      sourceRef:'SYNTHETIC-TEST-ONLY', sourceSha256:createHash('sha256').update('SYNTHETIC-TEST-ONLY').digest('hex'), siteId:'tio2-my', environmentId:runId,
      validFrom:now-60, validUntil:now+1800, operation, records:[...(bulk ? [{pageId:'APP-000',locale:'en',beforeSha256:hash(app),afterSha256:hash(changedApp)}] : []),
        {pageId:'HOME-001',locale:'en',beforeSha256:hash(home),afterSha256:hash(changed)}]})
    const noopProof=(id:string,operation:string) => ({...proof(id,operation),records:[{pageId:'HOME-001',locale:'en',beforeSha256:hash(home),afterSha256:hash(home)}]})
    try {
      const base = isolatedPhpArgs(process.cwd())
      const proofArgs = [...base.slice(0,-3), '--user','0:0','--mount',`type=volume,source=${volume},target=/approvals`,...base.slice(-3),
        '/workspace/tests/infrastructure/php/content-write-guards.php','proofs']
      const setup = spawnSync('docker', [proofArgs[0],'-i',...proofArgs.slice(1)], {encoding:'utf8',input:JSON.stringify({proofs:[proof('synthetic-home'),proof('synthetic-draft','publish-draft'),proof('synthetic-bulk','update-published',true),noopProof('synthetic-noop-draft','publish-draft'),noopProof('synthetic-noop-update','update-published')],home,app,changed,changedApp})})
      expect(setup.status, setup.stderr).toBe(0)
      runtime = await startIsolatedWordPress({...WORDPRESS_RUNTIME_MODE, runId, environment:{...process.env,TIO2_TEST_WORDPRESS_ENV:environmentPath}})
      await runtime.wp(['core','install','--url=http://example.invalid','--title=Synthetic guard test','--admin_user=guard-admin',
        '--admin_password=synthetic-only-admin-password','--admin_email=guard@example.invalid','--skip-email'])
      await runtime.wpAsWebUser(['plugin','install','advanced-custom-fields','--activate'])
      await runtime.wp(['plugin','activate','tio2-site-model'])
      const run = async (mode: string) => {
        const sequence=++commandNumber
        const {stdout} = await execute('docker', [...runtime!.composeArgs,'run','--rm','-T','--volume',`${volume}:/approvals:ro`,'wpcli',
          'wp','eval-file','/workspace/tests/infrastructure/php/content-write-guards.php',mode,runId,'--user=guard-admin'], {windowsHide:true,maxBuffer:4*1024*1024})
        writeFileSync(resolve(evidenceDirectory,`${String(sequence).padStart(2,'0')}-${mode}.json`),stdout)
        return JSON.parse(stdout.slice(stdout.indexOf('{')))
      }
      expect(await run('seeds')).toEqual({homeDraft:true,noNewFooter:true,homeRejectedBeforeMutation:true,appDraft:true,appRejectedBeforeMutation:true})
      await run('setup')
      expect(await run('self-review')).toEqual({acfReferenceProtected:true,noopDraftPublished:true,noopMetaPreserved:true,noopUpdateNoEvent:true,cacheStateRestored:true})
      await run('setup')
      const rejected = await run('rejected')
      expect(rejected).toEqual({seedPublishedUnchanged:true,scalarUnchanged:true, shapeUnchanged:true, deleteUnchanged:true, duplicateUnchanged:true, noEvent:true, byIdBlocked:true, republishBlocked:true, draftValid:true, draftInvalidBlocked:true, abUnchanged:true, futureBlocked:true, legacyCronBlocked:true})
      await run('setup')
      const approved = await run('approved')
      expect(approved).toEqual({committed:true, changed:true, published:true, queueHeld:true, contextCleared:true, secondRejected:true})
      await run('setup')
      expect(await run('failures')).toEqual({persistentCacheRejected:true,denied:true, readbackRollback:true, lateCapabilityRejected:true, exceptionRollback:true, noEvents:true, contextCleared:true, duplicateRejected:true, outerTransactionRejected:true})
      expect(await run('boundaries')).toEqual({bulkRollback:true,bulkCommitted:true,nestedRejected:true,otherQueuePreserved:true,eventsPending:true})
      await run('setup')
      expect(await run('publish-draft')).toEqual({committed:true,published:true,changed:true})
      await run('setup')
      const [held, independent] = await Promise.all([run('hold-locks'),run('independent-writes')])
      expect(held.committed).toBe(true)
      expect(independent).toEqual({independentDuringHold:true,identityRacesBlocked:[true,true,true,true]})
      const lockEvidence=resolve('.local-evidence/content-write-guards'); mkdirSync(lockEvidence,{recursive:true})
      writeFileSync(resolve(lockEvidence,'lock-plans.json'),JSON.stringify({runId,...held},null,2))
      expect(held.lockPlans.every((q: {plan:Array<{key?:string;type:string}>}) => q.plan.every(row => row.key && row.type!=='ALL'))).toBe(true)
      await run('setup')
      const race = await Promise.all([run('race'),run('race')])
      expect(race.filter(r => r.committed)).toHaveLength(1)
      expect(race.filter(r => r.error === 'approval_content')).toHaveLength(1)
      await run('setup')
      await expect(run('cli-noactor')).rejects.toThrow('Choose an actual WordPress user')
      expect((await run('cli')).committed).toBe(true)
      await run('setup')
      const expiring={...proof('synthetic-expiring'),validUntil:Math.floor(Date.now()/1000)+10}
      const setupExpiry=spawnSync('docker',[proofArgs[0],'-i',...proofArgs.slice(1)],{encoding:'utf8',input:JSON.stringify({proofs:[expiring],home,app,changed,changedApp})})
      expect(setupExpiry.status,setupExpiry.stderr).toBe(0)
      expect(await run('expire-proof')).toEqual({reachedWrite:true,expired:true,unchanged:true})
    } finally {
      if (runtime) {
        await runtime.stop()
        for (const suffix of ['db_data','wp_data']) await execute('docker',['volume','rm',`${runtime.projectName}_${suffix}`])
      }
      await execute('docker',['volume','rm',volume])
      if (directory === resolve('.tmp',runId) && runId.startsWith('content-guards-')) rmSync(directory,{recursive:true})
    }
  }, 240000)
})
