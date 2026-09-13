import {isAbsolute} from 'node:path'

const distDir = process.env.NEXT_DIST_DIR ?? '.next'
const canonicalWorkspaceRoot = process.env.LEGAL_READ_CANONICAL_WORKSPACE_ROOT

if (!canonicalWorkspaceRoot || !isAbsolute(canonicalWorkspaceRoot)) {
  throw new Error('LEGAL_READ_CANONICAL_WORKSPACE_ROOT must identify the installed dependency workspace')
}

if (distDir.includes('..') || /^[A-Za-z]:/u.test(distDir) || /^[\\/]/u.test(distDir)) {
  throw new Error('NEXT_DIST_DIR must stay inside the legal runtime fixture')
}

export default {
  distDir,
  skipTrailingSlashRedirect: true,
  turbopack: {root: canonicalWorkspaceRoot},
}
