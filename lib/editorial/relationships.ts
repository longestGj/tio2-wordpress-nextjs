import type {EditorialLink, EditorialLinkResolver, EditorialTarget} from './types'
import {normalizeEditorialInternalPath} from './rich-text'

export class EditorialRelationshipError extends Error {
  constructor(readonly path: string) {
    super(`Unresolved editorial relationship: ${path}`)
    this.name = 'EditorialRelationshipError'
  }
}

export function resolveEditorialTargets(
  targets: readonly EditorialTarget[],
  resolveTarget: EditorialLinkResolver,
  path: string,
): EditorialLink[] {
  const links = targets.map((target, index) => {
    const link = resolveTarget(target)
    const normalizedPath = link && normalizeEditorialInternalPath(link.path)
    if (!link || link.type !== target.type || link.id !== target.id || !normalizedPath) {
      throw new EditorialRelationshipError(`${path}.${index}`)
    }
    const normalizedHref = link.href === null ? null : normalizeEditorialInternalPath(link.href)
    if (link.href !== null && !normalizedHref) throw new EditorialRelationshipError(`${path}.${index}`)
    return {...link, path: normalizedPath, href: normalizedHref}
  })
  return links.sort((left, right) => {
    const leftKey = `${left.id}\u0000${left.type}`
    const rightKey = `${right.id}\u0000${right.type}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}
