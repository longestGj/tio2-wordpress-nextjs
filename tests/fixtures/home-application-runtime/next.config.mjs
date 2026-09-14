import {isAbsolute} from 'node:path'

const root = process.env.HOME_APPLICATION_CANONICAL_WORKSPACE_ROOT
if (!root || !isAbsolute(root)) throw new Error('Installed dependency workspace root is required')
export default {distDir: '.next', skipTrailingSlashRedirect: true, turbopack: {root}}
