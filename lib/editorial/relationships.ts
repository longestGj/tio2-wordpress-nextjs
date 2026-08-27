import type {EditorialLink, EditorialLinkResolver, EditorialTarget} from './types'
import {containsForbiddenEditorialClaim, containsPrivateEditorialLocation, normalizeEditorialInternalPath} from './rich-text'

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
    const normalizedHref = link?.href === null ? null : link && normalizeEditorialInternalPath(link.href)
    const title = link?.title.trim()
    const values = link ? [link.path, link.href ?? '', title ?? ''] : []
    if (!link || link.type !== target.type || link.id !== target.id || !normalizedPath || (link.href !== null && !normalizedHref) || !title || values.some((value) => containsPrivateEditorialLocation(value) || containsForbiddenEditorialClaim(value))) {
      throw new EditorialRelationshipError(`${path}.${index}`)
    }
    return {...link, title, path: normalizedPath, href: normalizedHref}
  })
  return links.sort((left, right) => {
    const leftKey = `${left.id}\u0000${left.type}`
    const rightKey = `${right.id}\u0000${right.type}`
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0
  })
}
