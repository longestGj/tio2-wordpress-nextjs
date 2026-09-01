import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
import m510Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m510.json'

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

export function m510ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(
    m510Contract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM510ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m510ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m510Contract.positioning
  const applications = {
    ...m510Contract.applications,
    items: m510Contract.applications.items.map((item) => {
      if ('relatedTargets' in item) {
        const relatedTargets = item.relatedTargets!.filter((target) => readiness[target.targetPageId])
        const copy = {category: item.category, title: item.title, body: item.body}
        return relatedTargets.length ? {...copy, relatedTargets} : copy
      }
      const {targetPageId, href, ...copy} = item
      return readiness[targetPageId] ? {...copy, targetPageId, href} : copy
    }),
  }
  const {action, ...technical} = m510Contract.technical
  const marketItems = m510Contract.markets.items.filter((item) => readiness[item.targetPageId])
  const modules = {
    hero: {
      ...m510Contract.hero,
      actions: m510Contract.hero.actions.filter((item) => readiness[item.targetPageId]),
    },
    positioning: readiness[contextualLink.targetPageId]
      ? {...positioning, contextualLink}
      : positioning,
    applications,
    evaluation: m510Contract.evaluation,
    technical: readiness[action.targetPageId] ? {...technical, action} : technical,
    ...(readiness[m510Contract.documents.targetPageId] ? {documents: m510Contract.documents} : {}),
    ...(marketItems.length ? {markets: {...m510Contract.markets, items: marketItems}} : {}),
    ...(readiness[m510Contract.sample.targetPageId] ? {sample: m510Contract.sample} : {}),
  }
  return {
    id: 'product-detail-my-510-1',
    modifiedGmt: '2026-09-02T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-510'},
    publicProjection: {
      reviewId: m510Contract.reviewId,
      identity: m510Contract.identity,
      releaseControls: m510Contract.releaseControls,
      seo: m510Contract.seo,
      globalChromeRef: m510Contract.globalChromeRef,
      breadcrumb: m510Contract.breadcrumb,
      modules,
    },
  }
}
