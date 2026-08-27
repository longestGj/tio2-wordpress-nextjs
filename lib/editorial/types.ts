export type EditorialTarget =
  | {type: 'product'; id: string}
  | {type: 'application'; id: string}
  | {type: 'resource'; id: string}

export interface EditorialLink {
  type: EditorialTarget['type']
  id: string
  title: string
  path: string
  href: string | null
}

export type EditorialLinkResolver = (target: EditorialTarget) => EditorialLink | null
