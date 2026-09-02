import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
import m510Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m510.json'
import m895Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json'
import m896Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json'

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

export function m896ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(
    m896Contract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM896ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m896ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m896Contract.positioning
  const applications = {
    ...m896Contract.applications,
    items: m896Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m896Contract.technical
  const marketItems = m896Contract.markets.items.filter((item) => readiness[item.targetPageId])
  const modules = {
    hero: {
      ...m896Contract.hero,
      actions: m896Contract.hero.actions.filter((item) => readiness[item.targetPageId]),
    },
    positioning: readiness[contextualLink.targetPageId]
      ? {...positioning, contextualLink}
      : positioning,
    applications,
    evaluation: m896Contract.evaluation,
    technical: readiness[action.targetPageId] ? {...technical, action} : technical,
    ...(readiness[m896Contract.documents.targetPageId] ? {documents: m896Contract.documents} : {}),
    ...(marketItems.length ? {markets: {...m896Contract.markets, items: marketItems}} : {}),
    ...(readiness[m896Contract.sample.targetPageId] ? {sample: m896Contract.sample} : {}),
  }
  return {
    id: 'product-detail-my-896-1',
    modifiedGmt: '2026-09-02T02:03:04',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-896'},
    publicProjection: {
      reviewId: m896Contract.reviewId,
      identity: m896Contract.identity,
      releaseControls: m896Contract.releaseControls,
      seo: m896Contract.seo,
      globalChromeRef: m896Contract.globalChromeRef,
      breadcrumb: m896Contract.breadcrumb,
      modules,
    },
  }
}

export function m895ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(
    m895Contract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM895ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m895ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m895Contract.positioning
  const applications = {
    ...m895Contract.applications,
    items: m895Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m895Contract.technical
  const marketItems = m895Contract.markets.items.filter((item) => readiness[item.targetPageId])
  const modules = {
    hero: {
      ...m895Contract.hero,
      actions: m895Contract.hero.actions.filter((item) => readiness[item.targetPageId]),
    },
    positioning: readiness[contextualLink.targetPageId]
      ? {...positioning, contextualLink}
      : positioning,
    applications,
    evaluation: m895Contract.evaluation,
    technical: readiness[action.targetPageId] ? {...technical, action} : technical,
    ...(readiness[m895Contract.documents.targetPageId] ? {documents: m895Contract.documents} : {}),
    ...(marketItems.length ? {markets: {...m895Contract.markets, items: marketItems}} : {}),
    ...(readiness[m895Contract.sample.targetPageId] ? {sample: m895Contract.sample} : {}),
  }
  return {
    id: 'product-detail-my-895-1',
    modifiedGmt: '2026-09-02T03:04:05',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-895'},
    publicProjection: {
      reviewId: m895Contract.reviewId,
      identity: m895Contract.identity,
      releaseControls: m895Contract.releaseControls,
      seo: m895Contract.seo,
      globalChromeRef: m895Contract.globalChromeRef,
      breadcrumb: m895Contract.breadcrumb,
      modules,
    },
  }
}
