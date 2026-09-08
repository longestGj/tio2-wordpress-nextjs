export interface EditorialContract {
  readonly identity: {readonly pageId:string; readonly siteScope:'tio2-my'; readonly locale:'en'; readonly path:string; readonly section:'resources'|'applications'|'markets'|'products'; readonly provisional:boolean; readonly schemaVersion:'editorial-v0.1'}
  readonly source: {readonly packageId:string; readonly packageSha256:string; readonly bodySha256:string; readonly visualSha256:string; readonly renderedBodySha256?:string}
  readonly seo: {readonly title:string; readonly metaDescription:string; readonly canonical:string|null; readonly schemaType?:'none'|'WebPage'|'TechArticle'|'CollectionPage'; readonly schemaItems?:ReadonlyArray<{readonly name:string; readonly href:string}>}
  readonly heading:string
  readonly breadcrumb:ReadonlyArray<{readonly label:string; readonly href:string}>
  readonly bodyHtml:string
  readonly mainClass:string
  readonly freshness:null|{readonly lastReviewed:string; readonly nextReviewDue:string; readonly status:'verified'|'unverified'|'withdrawn'; readonly evidenceDate:string|null}
}
export interface EditorialDto extends EditorialContract {
  readonly cms:{readonly id:string; readonly modified:string; readonly status:'publish'}
  readonly freshnessControl:unknown
  readonly availableGradePaths:readonly string[]
  readonly unavailableInternalPaths:readonly string[]
}
