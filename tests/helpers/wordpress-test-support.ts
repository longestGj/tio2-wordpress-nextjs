import {randomUUID} from 'node:crypto'
import {closeSync, copyFileSync, mkdirSync, openSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createRequire} from 'node:module'
import {dirname, join, resolve} from 'node:path'
import {afterAll, beforeAll} from 'vitest'

/** Controlled PHP harnesses supply their own in-memory WordPress stubs. */
export function isolatedPhpArgs(workspace: string) {
  return ['run', '--rm', '--network', 'none', '--mount',
    `type=bind,source=${resolve(workspace)},target=/workspace,readonly`,
    '--entrypoint', 'php', 'wordpress:cli-php8.3']
}

/** A fake-Docker wrapper must never depend on, create or borrow a real CMS .env. */
export function createWordPressWrapperFixture(directory: string, files: string[]) {
  const root = join(directory, 'workspace')
  mkdirSync(join(root, 'wordpress/seed'), {recursive: true})
  for (const file of ['wordpress/docker-compose.yml', 'scripts/assert-local-wordpress-env.ps1', ...files]) {
    mkdirSync(dirname(join(root, file)), {recursive: true})
    copyFileSync(resolve(file), join(root, file))
  }
  const secretNames = ['WORDPRESS_ADMIN_PASSWORD', 'NEXTJS_REVALIDATION_SECRET_TIO2_A', 'NEXTJS_REVALIDATION_SECRET_TIO2_B',
    'NEXTJS_REVALIDATION_SECRET_TIO2_MY', 'NEXTJS_PREVIEW_SECRET_TIO2_A', 'NEXTJS_PREVIEW_SECRET_TIO2_B', 'NEXTJS_PREVIEW_SECRET_TIO2_MY']
  writeFileSync(join(root, 'wordpress/.env'), ['WORDPRESS_ADMIN_USER=controlled-test-user',
    ...secretNames.map((name, index) => `${name}=${String(index + 1).repeat(64)}`),
    ...['A', 'B', 'MY'].flatMap(site => ['REVALIDATION', 'PREVIEW'].map(kind =>
      `NEXTJS_${kind}_URL_TIO2_${site}=http://127.0.0.1:1/controlled-callback`)),
  ].join('\n'))
  // Copied Node validators resolve the installed dependencies, without copying them.
  const dependencies = dirname(dirname(createRequire(import.meta.url).resolve('typescript/package.json')))
  symlinkSync(dependencies, join(root, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir')
  return root
}

/** Wrappers have fixed paths; reject redirects before either side can touch a CMS. */
export function assertSharedWordPressWrapperTarget(enabled: boolean, environment: Record<string, string | undefined>) {
  if (enabled && ['TIO2_TEST_WORDPRESS_ENV', 'TIO2_TEST_WORDPRESS_COMPOSE', 'TIO2_TEST_WORDPRESS_PROJECT']
    .some(key => environment[key] !== undefined)) {
    throw new Error('Shared WordPress wrapper does not support Compose test overrides')
  }
}

/** One machine-wide application lock per shared CMS, including other worktrees. */
export async function acquireSharedWordPressMutation(options: {
  projectName?: string
  lockDirectory?: string
  timeoutMs?: number
} = {}): Promise<() => void> {
  const projectName = options.projectName ?? 'wordpress'
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(projectName)) throw new Error('Invalid shared WordPress project name')
  const path = join(options.lockDirectory ?? tmpdir(), `d16-${projectName}-vitest-mutation.lock`)
  const owner = JSON.stringify({pid: process.pid, token: randomUUID()})
  const deadline = Date.now() + (options.timeoutMs ?? 1_800_000)
  for (;;) {
    let descriptor: number
    try { descriptor = openSync(path, 'wx') } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      if (Date.now() >= deadline) throw new Error(`Shared WordPress is already locked: ${path}; verify its owner before recovery`)
      await new Promise(done => setTimeout(done, 25))
      continue
    }
    try { writeFileSync(descriptor, owner) } finally { closeSync(descriptor) }
    break
  }
  let released = false
  return () => {
    if (released) return
    if (readFileSync(path, 'utf8') !== owner) throw new Error(`Shared WordPress lock owner changed: ${path}`)
    unlinkSync(path)
    released = true
  }
}

export function registerSharedWordPressMutationLock(enabled: boolean, projectName = 'wordpress') {
  let release: (() => void) | undefined
  beforeAll(async () => {
    if (enabled) release = await acquireSharedWordPressMutation({projectName})
  }, 1_810_000)
  // A file-level afterAll runs after nested suite fixture restoration, including failures.
  afterAll(() => { release?.() })
}
