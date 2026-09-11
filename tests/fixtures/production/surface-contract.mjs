import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

export const surface=JSON.parse(readFileSync(resolve('ops/production/release-surface.json'),'utf8'))

// The tio2-my proxy canonicalizes every non-root public page with one trailing slash.
export function canonical(path){return path==='/'?path:`${path.replace(/\/+$/,'')}/`}
