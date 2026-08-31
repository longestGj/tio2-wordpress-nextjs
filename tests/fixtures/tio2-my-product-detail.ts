import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'

import type {MalaysiaProductDetailSource} from '@/lib/wordpress/product-detail-v01-dto'

export function productDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(
    approvedContract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = productDetailReadiness(),
): MalaysiaProductDetailSource {
  const hero = {
    ...approvedContract.hero,
    actions: approvedContract.hero.actions.filter((action) => readiness[action.targetPageId]),
  }
  const marketItems = approvedContract.markets.items.filter((item) => readiness[item.targetPageId])
  const relatedItems = approvedContract.relatedGrades.items.filter((item) => readiness[item.targetPageId])
  const relatedActionReady = readiness[approvedContract.relatedGrades.allTargetPageId]
  const modules = {
    hero,
    positioning: approvedContract.positioning,
    applications: approvedContract.applications,
    evaluation: approvedContract.evaluation,
    technical: approvedContract.technical,
    ...(readiness[approvedContract.documents.targetPageId] ? {documents: approvedContract.documents} : {}),
    ...(marketItems.length ? {markets: {...approvedContract.markets, items: marketItems}} : {}),
    ...(relatedItems.length >= 2 ? {
      relatedGrades: {
        eyebrow: approvedContract.relatedGrades.eyebrow,
        heading: approvedContract.relatedGrades.heading,
        intro: approvedContract.relatedGrades.intro,
        items: relatedItems,
        note: approvedContract.relatedGrades.note,
        ...(relatedActionReady ? {
          allTargetPageId: approvedContract.relatedGrades.allTargetPageId,
          allLabel: approvedContract.relatedGrades.allLabel,
          allHref: approvedContract.relatedGrades.allHref,
        } : {}),
      },
    } : {}),
    ...(readiness[approvedContract.sample.targetPageId] ? {sample: approvedContract.sample} : {}),
  }
  return {
    id: 'product-detail-my-350-1',
    modifiedGmt: '2026-09-01T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-350'},
    publicProjection: {
      reviewId: approvedContract.reviewId,
      identity: approvedContract.identity,
      releaseControls: approvedContract.releaseControls,
      seo: approvedContract.seo,
      globalChromeRef: approvedContract.globalChromeRef,
      breadcrumb: approvedContract.breadcrumb,
      modules,
    },
  }
}
