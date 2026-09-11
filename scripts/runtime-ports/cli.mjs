import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {doctorRuntime} from './doctor.mjs'

import {
  attachLease,
  inspectLease,
  listLeases,
  releaseLease,
  reserveLease,
} from './lease-core.mjs'

const execFileAsync = promisify(execFile)

class UsageError extends Error {
  constructor(message) {
    super(message)
    this.code = 'INVALID_ARGUMENTS'
  }
}

const actionFlags = new Map([
  ['doctor', new Map([['lease-root', 'value'], ['json', 'switch']])],
  ['reserve', new Map([
    ['lease-root', 'value'],
    ['purpose', 'value'],
    ['run-id', 'value'],
    ['site-id', 'value'],
    ['worktree', 'value'],
    ['commit', 'value'],
    ['count', 'value'],
  ])],
  ['attach', new Map([
    ['lease-root', 'value'],
    ['lease-id', 'value'],
    ['process-id', 'value'],
    ['compose-project', 'value'],
  ])],
  ['release', new Map([
    ['lease-root', 'value'],
    ['lease-id', 'value'],
    ['process-id', 'value'],
    ['compose-project', 'value'],
  ])],
  ['status', new Map([
    ['lease-root', 'value'],
    ['json', 'switch'],
  ])],
])

function parseArgs(action, rawArgs) {
  const allowedFlags = actionFlags.get(action)
  if (!allowedFlags) throw new UsageError(`Unknown action: ${action ?? '(missing)'}`)

  const parsed = {}
  const seen = new Set()
  for (let index = 0; index < rawArgs.length; index += 1) {
    const token = rawArgs[index]
    if (!token.startsWith('--') || token.length === 2) {
      throw new UsageError(`Expected a named flag, received: ${token}`)
    }
    const name = token.slice(2)
    const kind = allowedFlags.get(name)
    if (!kind) throw new UsageError(`Unknown flag for ${action}: --${name}`)
    if (seen.has(name)) throw new UsageError(`Duplicate flag: --${name}`)
    seen.add(name)

    if (kind === 'switch') {
      parsed[name] = true
      continue
    }
    const value = rawArgs[index + 1]
    if (value === undefined || value.startsWith('--')) {
      throw new UsageError(`Flag --${name} requires a value`)
    }
    parsed[name] = value
    index += 1
  }
  return parsed
}

function requireFlag(args, name) {
  const value = args[name]
  if (typeof value !== 'string' || value.length === 0) {
    throw new UsageError(`Missing required flag: --${name}`)
  }
  return value
}

function optionalPositiveInteger(args, name) {
  const value = args[name]
  if (value === undefined) return undefined
  if (!/^[1-9][0-9]*$/u.test(value)) {
    throw new UsageError(`Flag --${name} must be a positive integer`)
  }
  return Number(value)
}

async function readGitValue(gitArgs, cwd) {
  try {
    const {stdout} = await execFileAsync('git', gitArgs, {cwd, windowsHide: true})
    const value = stdout.trim()
    if (value.length === 0) throw new Error('Git returned an empty value')
    return value
  } catch {
    const error = new Error('Unable to resolve the current Git worktree and commit')
    error.code = 'GIT_CONTEXT_ERROR'
    throw error
  }
}

async function reservationGitContext(args) {
  const worktree = args.worktree
    ?? await readGitValue(['rev-parse', '--show-toplevel'], process.cwd())
  const commit = args.commit
    ?? await readGitValue(['rev-parse', 'HEAD'], worktree)
  return {worktree, commit}
}

async function reserveCommand(args) {
  const purpose = requireFlag(args, 'purpose')
  const runId = requireFlag(args, 'run-id')
  const {worktree, commit} = await reservationGitContext(args)
  const count = optionalPositiveInteger(args, 'count')
  const lease = await reserveLease({
    ...(args['lease-root'] === undefined ? {} : {leaseRoot: args['lease-root']}),
    purpose,
    runId,
    siteId: args['site-id'] ?? null,
    worktree,
    commit,
    ...(count === undefined ? {} : {count}),
  })
  return {lease}
}

async function attachCommand(args) {
  const leaseId = requireFlag(args, 'lease-id')
  const processId = optionalPositiveInteger(args, 'process-id')
  const composeProject = args['compose-project']
  if (processId === undefined && composeProject === undefined) {
    throw new UsageError('Attach requires --process-id or --compose-project')
  }
  const lease = await attachLease({
    ...(args['lease-root'] === undefined ? {} : {leaseRoot: args['lease-root']}),
    leaseId,
    processId,
    composeProject,
  })
  return {lease}
}

async function releaseCommand(args) {
  const leaseId = requireFlag(args, 'lease-id')
  const processId = optionalPositiveInteger(args, 'process-id')
  return releaseLease({
    ...(args['lease-root'] === undefined ? {} : {leaseRoot: args['lease-root']}),
    leaseId,
    expectedProcessIds: processId === undefined ? [] : [processId],
    expectedComposeProject: args['compose-project'] ?? null,
  })
}

async function statusCommand(args) {
  const leaseOptions = args['lease-root'] === undefined
    ? {}
    : {leaseRoot: args['lease-root']}
  const records = await listLeases(leaseOptions)
  const leases = await Promise.all(records.map(record => inspectLease({
    ...leaseOptions,
    leaseId: record.leaseId,
  })))
  return {leases}
}

const actions = new Map([
  ['doctor', args => doctorRuntime(args['lease-root'] === undefined ? {} : {leaseRoot: args['lease-root']})],
  ['reserve', reserveCommand],
  ['attach', attachCommand],
  ['release', releaseCommand],
  ['status', statusCommand],
])

function writeResponse(response) {
  process.stdout.write(`${JSON.stringify(response)}\n`)
}

async function main() {
  const action = process.argv[2]
  try {
    const args = parseArgs(action, process.argv.slice(3))
    const response = await actions.get(action)(args)
    writeResponse({ok: true, action, ...response})
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'RUNTIME_PORT_ERROR'
    const message = error instanceof Error ? error.message : 'Runtime port command failed'
    writeResponse({ok: false, action: action ?? null, error: {code, message}})
    process.stderr.write(`${code}: ${message}\n`)
    process.exitCode = error instanceof UsageError ? 2 : 1
  }
}

await main()
