import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json'
import m108Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m108.json'
import m200Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m200.json'
import m210Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m210.json'
import m2196Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m2196.json'
import m340Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m340.json'
import m510Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m510.json'
import m52Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m52.json'
import m886Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m886.json'
import m895Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json'
import m896Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json'
import m996Contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m996.json'

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

export function m996ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m996Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM996ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m996ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m996Contract.positioning
  const applications = {
    ...m996Contract.applications,
    items: m996Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m996Contract.technical
  const marketItems = m996Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-996-1',
    modifiedGmt: '2026-09-02T10:11:12',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-996'},
    publicProjection: {
      reviewId: m996Contract.reviewId,
      identity: m996Contract.identity,
      releaseControls: m996Contract.releaseControls,
      seo: m996Contract.seo,
      globalChromeRef: m996Contract.globalChromeRef,
      breadcrumb: m996Contract.breadcrumb,
      modules: {
        hero: {...m996Contract.hero, actions: m996Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m996Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m996Contract.documents.targetPageId] ? {documents: m996Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m996Contract.markets, items: marketItems}} : {}),
        ...(readiness[m996Contract.sample.targetPageId] ? {sample: m996Contract.sample} : {}),
      },
    },
  }
}

export function m2196ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m2196Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM2196ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m2196ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m2196Contract.positioning
  const applications = {
    ...m2196Contract.applications,
    items: m2196Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m2196Contract.technical
  const marketItems = m2196Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-2196-1',
    modifiedGmt: '2026-09-02T11:12:13',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-2196'},
    publicProjection: {
      reviewId: m2196Contract.reviewId,
      identity: m2196Contract.identity,
      releaseControls: m2196Contract.releaseControls,
      seo: m2196Contract.seo,
      globalChromeRef: m2196Contract.globalChromeRef,
      breadcrumb: m2196Contract.breadcrumb,
      modules: {
        hero: {...m2196Contract.hero, actions: m2196Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m2196Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m2196Contract.documents.targetPageId] ? {documents: m2196Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m2196Contract.markets, items: marketItems}} : {}),
        ...(readiness[m2196Contract.sample.targetPageId] ? {sample: m2196Contract.sample} : {}),
      },
    },
  }
}

export function m340ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(
    m340Contract.routeRegistry.map((route) => [route.targetPageId, ready]),
  )
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM340ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m340ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m340Contract.positioning
  const applications = {
    ...m340Contract.applications,
    items: m340Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m340Contract.technical
  const marketItems = m340Contract.markets.items.filter((item) => readiness[item.targetPageId])
  const modules = {
    hero: {
      ...m340Contract.hero,
      actions: m340Contract.hero.actions.filter((item) => readiness[item.targetPageId]),
    },
    positioning: readiness[contextualLink.targetPageId]
      ? {...positioning, contextualLink}
      : positioning,
    applications,
    evaluation: m340Contract.evaluation,
    technical: readiness[action.targetPageId] ? {...technical, action} : technical,
    ...(readiness[m340Contract.documents.targetPageId] ? {documents: m340Contract.documents} : {}),
    ...(marketItems.length ? {markets: {...m340Contract.markets, items: marketItems}} : {}),
    ...(readiness[m340Contract.sample.targetPageId] ? {sample: m340Contract.sample} : {}),
  }
  return {
    id: 'product-detail-my-340-1',
    modifiedGmt: '2026-09-02T04:05:06',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-340'},
    publicProjection: {
      reviewId: m340Contract.reviewId,
      identity: m340Contract.identity,
      releaseControls: m340Contract.releaseControls,
      seo: m340Contract.seo,
      globalChromeRef: m340Contract.globalChromeRef,
      breadcrumb: m340Contract.breadcrumb,
      modules,
    },
  }
}

export function m886ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m886Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM886ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m886ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m886Contract.positioning
  const applications = {
    ...m886Contract.applications,
    items: m886Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m886Contract.technical
  const marketItems = m886Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-886-1',
    modifiedGmt: '2026-09-02T05:06:07',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-886'},
    publicProjection: {
      reviewId: m886Contract.reviewId,
      identity: m886Contract.identity,
      releaseControls: m886Contract.releaseControls,
      seo: m886Contract.seo,
      globalChromeRef: m886Contract.globalChromeRef,
      breadcrumb: m886Contract.breadcrumb,
      modules: {
        hero: {...m886Contract.hero, actions: m886Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m886Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m886Contract.documents.targetPageId] ? {documents: m886Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m886Contract.markets, items: marketItems}} : {}),
        ...(readiness[m886Contract.sample.targetPageId] ? {sample: m886Contract.sample} : {}),
      },
    },
  }
}

export function m52ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m52Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM52ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m52ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m52Contract.positioning
  const applications = {
    ...m52Contract.applications,
    items: m52Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m52Contract.technical
  const marketItems = m52Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-52-1',
    modifiedGmt: '2026-09-02T06:07:08',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-52'},
    publicProjection: {
      reviewId: m52Contract.reviewId,
      identity: m52Contract.identity,
      releaseControls: m52Contract.releaseControls,
      seo: m52Contract.seo,
      globalChromeRef: m52Contract.globalChromeRef,
      breadcrumb: m52Contract.breadcrumb,
      modules: {
        hero: {...m52Contract.hero, actions: m52Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m52Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m52Contract.documents.targetPageId] ? {documents: m52Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m52Contract.markets, items: marketItems}} : {}),
        ...(readiness[m52Contract.sample.targetPageId] ? {sample: m52Contract.sample} : {}),
      },
    },
  }
}

export function m108ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m108Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM108ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m108ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m108Contract.positioning
  const applications = {
    ...m108Contract.applications,
    items: m108Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m108Contract.technical
  const marketItems = m108Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-108-1',
    modifiedGmt: '2026-09-02T07:08:09',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-108'},
    publicProjection: {
      reviewId: m108Contract.reviewId,
      identity: m108Contract.identity,
      releaseControls: m108Contract.releaseControls,
      seo: m108Contract.seo,
      globalChromeRef: m108Contract.globalChromeRef,
      breadcrumb: m108Contract.breadcrumb,
      modules: {
        hero: {...m108Contract.hero, actions: m108Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m108Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m108Contract.documents.targetPageId] ? {documents: m108Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m108Contract.markets, items: marketItems}} : {}),
        ...(readiness[m108Contract.sample.targetPageId] ? {sample: m108Contract.sample} : {}),
      },
    },
  }
}

export function m200ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m200Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM200ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m200ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m200Contract.positioning
  const applications = {
    ...m200Contract.applications,
    items: m200Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m200Contract.technical
  const marketItems = m200Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-200-1',
    modifiedGmt: '2026-09-02T09:10:11',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-200'},
    publicProjection: {
      reviewId: m200Contract.reviewId,
      identity: m200Contract.identity,
      releaseControls: m200Contract.releaseControls,
      seo: m200Contract.seo,
      globalChromeRef: m200Contract.globalChromeRef,
      breadcrumb: m200Contract.breadcrumb,
      modules: {
        hero: {...m200Contract.hero, actions: m200Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m200Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m200Contract.documents.targetPageId] ? {documents: m200Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m200Contract.markets, items: marketItems}} : {}),
        ...(readiness[m200Contract.sample.targetPageId] ? {sample: m200Contract.sample} : {}),
      },
    },
  }
}

export function m210ProductDetailReadiness(ready = false): Record<string, boolean> {
  const result = Object.fromEntries(m210Contract.routeRegistry.map((route) => [route.targetPageId, ready]))
  result['HOME-001'] = true
  result['PRODUCT-000'] = true
  return result
}

export function malaysiaM210ProductDetailSource(
  readiness: Readonly<Record<string, boolean>> = m210ProductDetailReadiness(),
): MalaysiaProductDetailSource {
  const {contextualLink, ...positioning} = m210Contract.positioning
  const applications = {
    ...m210Contract.applications,
    items: m210Contract.applications.items.map(({targetPageId, href, ...item}) =>
      readiness[targetPageId] ? {...item, targetPageId, href} : item),
  }
  const {action, ...technical} = m210Contract.technical
  const marketItems = m210Contract.markets.items.filter((item) => readiness[item.targetPageId])
  return {
    id: 'product-detail-my-210-1',
    modifiedGmt: '2026-09-02T08:09:10',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/products/m-210'},
    publicProjection: {
      reviewId: m210Contract.reviewId,
      identity: m210Contract.identity,
      releaseControls: m210Contract.releaseControls,
      seo: m210Contract.seo,
      globalChromeRef: m210Contract.globalChromeRef,
      breadcrumb: m210Contract.breadcrumb,
      modules: {
        hero: {...m210Contract.hero, actions: m210Contract.hero.actions.filter((item) => readiness[item.targetPageId])},
        positioning: readiness[contextualLink.targetPageId] ? {...positioning, contextualLink} : positioning,
        applications,
        evaluation: m210Contract.evaluation,
        technical: readiness[action.targetPageId] ? {...technical, action} : technical,
        ...(readiness[m210Contract.documents.targetPageId] ? {documents: m210Contract.documents} : {}),
        ...(marketItems.length ? {markets: {...m210Contract.markets, items: marketItems}} : {}),
        ...(readiness[m210Contract.sample.targetPageId] ? {sample: m210Contract.sample} : {}),
      },
    },
  }
}
