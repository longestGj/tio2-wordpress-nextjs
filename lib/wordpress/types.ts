export interface ContentSeoDto {
  readonly title: string
  readonly description: string
}

export interface ContentPageDto {
  readonly id: string
  readonly siteId: string
  readonly path: string
  readonly title: string
  readonly excerpt: string
  readonly html: string
  readonly modified: string
  readonly status: string
  readonly seo: ContentSeoDto
  readonly relatedEntityIds: readonly string[]
}

export class InvalidContentPathError extends Error {
  readonly path: string

  constructor(path: string, message = `Invalid content path: ${path}`) {
    super(message)
    this.name = 'InvalidContentPathError'
    this.path = path
  }
}

export class CrossSiteContentError extends Error {
  readonly expectedSiteId: string
  readonly actualSiteIds: readonly string[]

  constructor(expectedSiteId: string, actualSiteIds: readonly string[]) {
    super(
      `Content belongs to ${actualSiteIds.join(', ') || 'no site'}, not ${expectedSiteId}`,
    )
    this.name = 'CrossSiteContentError'
    this.expectedSiteId = expectedSiteId
    this.actualSiteIds = actualSiteIds
  }
}
