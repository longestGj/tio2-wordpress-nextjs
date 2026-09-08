import {createHash} from 'node:crypto'
import {readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs'

const root = new URL('../', import.meta.url)
const readJson = (path) => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const runtime = readJson('runtime/runtime-contract.json')
const grades = readJson('runtime/grade-edge-inventory.json')
const responsive = readJson('runtime/responsive-state-matrix.json')
const shared = readJson('runtime/shared-instance-map.json')
const rfq = readJson('runtime/rfq-private-handoff.json')
const consumers = readJson('runtime/consumer-regression-matrix.json')

const checks = {
  implementationCommit: runtime.implementationCommit === '0144b303d0546dc5bb7012e4292df6339f851b78',
  buildId: runtime.buildId === 'cD6FOWG8iVMbgeRxyIqIS',
  htmlClean: runtime.publicSurfaceScan.html.status === 200 && runtime.publicSurfaceScan.html.matches.length === 0,
  rscClean: runtime.publicSurfaceScan.rsc.status === 200 && runtime.publicSurfaceScan.rsc.matches.length === 0,
  gradeCount: grades.total === 30 && grades.edges.length === 30,
  specialtyEdge: grades.edges.at(-1)?.edgeId === 'APP000-EDGE-SPEC-01',
  mobileCollapsed: responsive.states.find((item) => item.viewport.width === 390)?.defaultOpen.every((value) => value === false),
  mobilePointerKeyboard: responsive.states.find((item) => item.viewport.width === 390)?.firstTwoOpenAfterPointerAndKeyboard.every((value) => value === true),
  tabletDesktopOpen: responsive.states.filter((item) => item.viewport.width !== 390).every((item) => item.defaultOpen.every((value) => value === true)),
  categoryNames: shared.categoryAccessibleNames.join('|') === 'Coatings|Plastics|Masterbatch|Printing Inks|Paper|Specialty Materials',
  supportLinks: JSON.stringify(shared.supportActions) === JSON.stringify([
    {label: 'Explore Products', href: '/products/'},
    {label: 'Review Documents', href: '/documents/'},
    {label: 'Explore Markets', href: '/markets/'},
  ]),
  rfqPrivate: rfq.attributionStatus === 204 && rfq.cookie?.httpOnly === true && rfq.cookie?.opaque === true && rfq.publicApiInternalMarkerMatches.length === 0 && rfq.submittedPayload?.source_page_id === 'APP-000' && rfq.accessKeyExcluded === true,
  consumersReadOnly: consumers.authority === 'read-only' && consumers.consumers.length === 11,
}

function inventory(directory, prefix = '') {
  return readdirSync(directory, {withFileTypes: true}).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`
    const url = new URL(relative, root)
    if (entry.isDirectory()) return inventory(url, `${relative}/`)
    if (relative === 'evidence-validation.json') return []
    const payload = readFileSync(url)
    return [{path: relative, bytes: statSync(url).size, sha256: createHash('sha256').update(payload).digest('hex')}]
  })
}

const failed = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name)
const result = {checkedAt: new Date().toISOString(), status: failed.length ? 'FAILED' : 'PASSED', checks, failed, files: inventory(root)}
writeFileSync(new URL('evidence-validation.json', root), `${JSON.stringify(result, null, 2)}\n`)
process.stdout.write(JSON.stringify({status: result.status, checks: Object.keys(checks).length, files: result.files.length, failed}))
if (failed.length) process.exitCode = 1
