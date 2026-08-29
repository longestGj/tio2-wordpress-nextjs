import {readFileSync, writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'

export const APPROVED_APPLICATION_REVIEW_IDS = Object.freeze([
  'applications-hub',
  'coatings',
  'water-based-paint',
])

function assertManifestRoot(manifest, label) {
  if (
    !manifest ||
    typeof manifest !== 'object' ||
    manifest.version !== '0.1' ||
    manifest.siteId !== 'tio2-a' ||
    !Array.isArray(manifest.records)
  ) {
    throw new Error(`${label} must be a Site A v0.1 Application manifest.`)
  }
}

function recordId(record) {
  const id = record?.identity?.id
  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Every Application review record must have an identity.id.')
  }
  return id
}

function sortedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

export function mergeApprovedApplicationRepresentatives(
  canonicalManifest,
  representativeManifest,
  approvedIds = APPROVED_APPLICATION_REVIEW_IDS,
) {
  assertManifestRoot(canonicalManifest, 'Canonical manifest')
  assertManifestRoot(representativeManifest, 'Representative manifest')

  const approved = sortedUnique(approvedIds)
  const representativeIds = representativeManifest.records.map(recordId)
  if (
    representativeIds.length !== approved.length ||
    JSON.stringify(sortedUnique(representativeIds)) !== JSON.stringify(approved)
  ) {
    throw new Error('Representative manifest must contain the exact approved identity set.')
  }

  const canonicalIds = canonicalManifest.records.map(recordId)
  if (new Set(canonicalIds).size !== canonicalIds.length) {
    throw new Error('Canonical manifest contains duplicate Application identities.')
  }
  for (const id of approved) {
    if (!canonicalIds.includes(id)) {
      throw new Error(`Canonical manifest is missing approved Application ${id}.`)
    }
  }

  const replacements = new Map(
    representativeManifest.records.map((record) => [recordId(record), record]),
  )
  return {
    ...canonicalManifest,
    records: canonicalManifest.records.map(
      (record) => replacements.get(recordId(record)) ?? record,
    ),
  }
}

export function assertOnlyApprovedApplicationChanges(
  plan,
  approvedIds = APPROVED_APPLICATION_REVIEW_IDS,
) {
  if (!plan || typeof plan !== 'object' || !Array.isArray(plan.actions)) {
    throw new Error('Editorial Plan must contain an actions array.')
  }

  const approved = new Set(approvedIds)
  const changed = []
  for (const action of plan.actions) {
    if (!action || typeof action !== 'object') {
      throw new Error('Editorial Plan contains a malformed action.')
    }
    if (action.action === 'no-change') continue
    if (
      !['create', 'update'].includes(action.action) ||
      action.entityType !== 'application' ||
      !approved.has(action.id)
    ) {
      throw new Error(
        `Planned change ${String(action.entityType)}/${String(action.id)} is outside the three-page review scope.`,
      )
    }
    changed.push(action.id)
  }

  const uniqueChanged = sortedUnique(changed)
  if (uniqueChanged.length !== changed.length) {
    throw new Error('Editorial Plan contains duplicate changed Application actions.')
  }
  return uniqueChanged
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw new Error(`${label} could not be read as JSON: ${error.message}`)
  }
}

function runCli(argv) {
  const [canonicalPath, representativePath, outputPath] = argv
  if (!canonicalPath || !representativePath || !outputPath) {
    throw new Error(
      'Usage: node applications-review-manifest.mjs <canonical.json> <representatives.json> <output.json>',
    )
  }
  const merged = mergeApprovedApplicationRepresentatives(
    readJson(canonicalPath, 'Canonical manifest'),
    readJson(representativePath, 'Representative manifest'),
  )
  writeFileSync(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8')
  process.stdout.write(
    `${JSON.stringify({outputPath, records: merged.records.length, replacedIds: APPROVED_APPLICATION_REVIEW_IDS})}\n`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runCli(process.argv.slice(2))
  } catch (error) {
    process.stderr.write(`${error.message}\n`)
    process.exitCode = 1
  }
}
