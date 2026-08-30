import {describe, expect, it} from 'vitest'

import {
  RESOURCE_LEARNING_PATHS,
  RESOURCE_PRESENTATION_BY_ID,
  resolveResourcePresentation,
} from '@/lib/resources/presentation'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'

describe('Site A Resource presentation registry', () => {
  it('covers every canonical identity with the approved mode', () => {
    expect(Object.keys(RESOURCE_PRESENTATION_BY_ID).sort()).toEqual(
      SITE_A_RESOURCE_IDENTITIES.map(([id]) => id).sort(),
    )
    expect(resolveResourcePresentation('resources-hub')?.mode).toBe('hub')
    for (const index of [1, 2, 3, 4, 5, 6]) {
      expect(resolveResourcePresentation(`article-0${index}`)?.mode).toBe(
        'technical-explainer',
      )
    }
    for (const id of ['article-07', 'article-08', 'article-09', 'article-10']) {
      expect(resolveResourcePresentation(id)?.mode).toBe('evaluation-guide')
    }
    expect(resolveResourcePresentation('article-99')).toBeNull()
  })

  it('uses the approved learning-path order and counts', () => {
    expect(
      RESOURCE_LEARNING_PATHS.map(({label, articleIds}) => [
        label,
        articleIds.length,
      ]),
    ).toEqual([
      ['TiO₂ Fundamentals', 3],
      ['Performance Interpretation', 3],
      ['Grade Replacement', 1],
      ['Application Testing', 3],
    ])
    expect(RESOURCE_LEARNING_PATHS.flatMap(({articleIds}) => articleIds)).toEqual(
      SITE_A_RESOURCE_IDENTITIES.slice(1).map(([id]) => id),
    )
  })
})
