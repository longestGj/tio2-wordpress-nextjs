import {execFileSync} from 'node:child_process'
import {realpathSync} from 'node:fs'
import {resolve} from 'node:path'

/** One reservation domain per repository, shared by all linked worktrees. */
export function resolveLeaseRoot(worktree = process.cwd()) {
  const cwd = resolve(worktree)
  try {
    const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
      cwd, windowsHide: true, timeout: 5_000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    return resolve(realpathSync(common), 'd16-runtime/port-leases')
  } catch (error) {
    if (/not a git repository/iu.test(String(error.stderr ?? ''))) return resolve(cwd, '.runtime/port-leases')
    throw new Error('Cannot resolve the repository shared lease registry', {cause: error})
  }
}
